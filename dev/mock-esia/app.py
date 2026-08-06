"""Мок ЕСИА для локальной разработки.

Имитирует OIDC authorization code flow ровно в той форме, которую ожидает
``EsiaOidcGateway`` бэкенда: страница /authorize с выбором «гражданина»,
обмен кода на токен в /token, атрибуты в /userinfo. Поддержаны механизмы
боевого потока (T12), чтобы локально проверялся тот же код, что и в проде:

* **PKCE (S256)** — ``code_challenge`` запоминается на /authorize и
  сверяется с ``code_verifier`` на /token; несовпадение → ``invalid_grant``;
* **nonce** — запоминается на /authorize и кладётся в ``id_token``;
* **подписанный id_token** — RS256 ключом, который генерируется при старте
  процесса; публичная часть отдаётся в /jwks (``ESIA_JWKS_URL`` бэкенда);
* **отказ пользователя** — ссылка «Отказаться» возвращает
  ``?error=access_denied`` (проверка ветки «Вход отменён» на фронте).

НЕ для прода: ключ живёт в памяти, гражданин выбирается кликом, никакой
реальной ЕСИА тут нет. В бою на это место встаёт сертифицированный
шлюз/интегратор.
"""

from __future__ import annotations

import base64
import hashlib
import os
import secrets
import time
from urllib.parse import parse_qs, urlencode

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="Mock ЕСИА (dev only)")

# ``iss`` в id_token. Значение должно совпадать с ESIA_ISSUER бэкенда, поэтому
# оно одно на все окружения мока (в docker/k8s задаётся переменной).
ISSUER = os.environ.get("MOCK_ESIA_ISSUER", "http://localhost:9000")
_ID_TOKEN_TTL_SECONDS = 300

# Ключ подписи id_token: генерируется при старте процесса (перезапуск мока —
# новый ключ; бэкенд перечитает JWKS, увидев незнакомый kid).
_KEY_ID = "mock-esia-key-1"
_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)

# СНИЛС с номером <= 001-001-998 не проверяются контрольной суммой (домен
# Snils), поэтому используем такие — валидны без вычисления чек-суммы.
# Ключи совпадают с username'ами из сид-данных бэкенда: вход по такому СНИЛС
# попадает в уже засеянный аккаунт (find-or-create находит по snils_hash).
CITIZENS: dict[str, dict[str, str]] = {
    "kalibr": {"oid": "1000000001", "snils": "00100150100", "first": "Артём", "last": "Калибров", "middle": "Сергеевич"},
    "mediana": {"oid": "1000000002", "snils": "00100150200", "first": "Мария", "last": "Медиана", "middle": "Игоревна"},
    "baseline": {"oid": "1000000003", "snils": "00100150300", "first": "Борис", "last": "Базлайнов", "middle": "Петрович"},
}

# Выданные authorization code → параметры потока (PKCE/nonce/клиент).
# In-memory: перезапуск мока обрывает начатые входы, для дева это нормально.
FLOWS: dict[str, dict[str, str]] = {}
_MAX_FLOWS = 200


def _b64u_uint(value: int) -> str:
    """Целое → base64url без выравнивания (формат чисел JWK)."""
    raw = value.to_bytes((value.bit_length() + 7) // 8 or 1, "big")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _s256(verifier: str) -> str:
    """PKCE-преобразование S256 (RFC 7636 §4.2)."""
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def _citizen_key(code: str) -> str:
    """Из выданного кода (``<ключ>.<случайный хвост>``) достаёт ключ гражданина."""
    return code.split(".", 1)[0]


def _citizen_for(code: str) -> dict[str, str]:
    key = _citizen_key(code)
    if key in CITIZENS:
        return CITIZENS[key]
    # «Новый гражданин»: ключ new-citizen → детерминированный свежий СНИЛС
    # (в пределах жизни процесса — тот же аккаунт при повторных входах).
    n = abs(hash(key)) % 800
    num = 1001000 + n  # 9-значный префикс <= 001-001-998
    snils = f"{num:09d}00"
    return {"oid": f"9{num}", "snils": snils, "first": "Новый", "last": "Гражданин", "middle": ""}


@app.get("/authorize", response_class=HTMLResponse)
async def authorize(request: Request) -> HTMLResponse:
    """Страница выбора учётной записи (вместо реального входа в Госуслуги).

    Здесь же запоминаются параметры потока (PKCE-challenge, nonce, client_id):
    какой из выданных кодов выберет пользователь, заранее неизвестно, поэтому
    регистрируем их все.
    """
    q = request.query_params
    redirect_uri = q.get("redirect_uri", "")
    state = q.get("state", "")
    flow = {
        "code_challenge": q.get("code_challenge", ""),
        "code_challenge_method": q.get("code_challenge_method", ""),
        "nonce": q.get("nonce", ""),
        "client_id": q.get("client_id", ""),
    }

    def link(citizen_key: str) -> str:
        # Уникальный код на каждый клик: параметры PKCE/nonce привязаны к нему.
        code = f"{citizen_key}.{secrets.token_urlsafe(8)}"
        # Неиспользованные коды копятся (на каждый показ страницы — по одному
        # на ссылку); держим карту небольшой, выбрасывая самые старые.
        while len(FLOWS) >= _MAX_FLOWS:
            FLOWS.pop(next(iter(FLOWS)))
        FLOWS[code] = dict(flow)
        return f"{redirect_uri}?{urlencode({'code': code, 'state': state})}"

    rows = "".join(
        f'<li><a href="{link(key)}"><b>{c["last"]} {c["first"]}</b>'
        f'<span>СНИЛС {c["snils"][:3]}-{c["snils"][3:6]}-{c["snils"][6:9]} {c["snils"][9:]}</span></a></li>'
        for key, c in CITIZENS.items()
    )
    new_link = link("new-citizen")
    deny_link = f"{redirect_uri}?{urlencode({'error': 'access_denied', 'error_description': 'Пользователь отказался предоставить данные', 'state': state})}"

    html = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Госуслуги (мок)</title>
<style>
  body{{font-family:system-ui,sans-serif;background:#0e1430;color:#fff;margin:0;
       min-height:100vh;display:flex;align-items:center;justify-content:center}}
  .card{{background:#161f45;border:1px solid rgba(255,255,255,.1);border-radius:20px;
         padding:32px;max-width:420px;width:90%}}
  h1{{font-size:18px;margin:0 0 4px}} p.sub{{color:#9aa3c0;margin:0 0 20px;font-size:14px}}
  ul{{list-style:none;padding:0;margin:0 0 16px}}
  li a{{display:flex;flex-direction:column;gap:2px;padding:14px 16px;margin-bottom:8px;
        border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#fff;
        text-decoration:none}}
  li a:hover{{border-color:#46e0c4;background:rgba(70,224,196,.08)}}
  li span{{color:#9aa3c0;font-size:12px}}
  .new{{display:block;text-align:center;padding:12px;border-radius:12px;
        background:#46e0c4;color:#091022;font-weight:700;text-decoration:none}}
  .deny{{display:block;text-align:center;padding:12px;margin-top:8px;color:#9aa3c0;
         font-size:13px;text-decoration:none}}
  .deny:hover{{color:#fff}}
  .tag{{display:inline-block;background:rgba(70,224,196,.12);color:#46e0c4;
        font-size:11px;padding:4px 8px;border-radius:999px;margin-bottom:16px}}
</style></head><body>
<div class="card">
  <span class="tag">МОК ЕСИА · только для разработки</span>
  <h1>Войти как</h1>
  <p class="sub">Выберите подтверждённую учётную запись</p>
  <ul>{rows}</ul>
  <a class="new" href="{new_link}">Новый гражданин (свежий аккаунт)</a>
  <a class="deny" href="{deny_link}">Отказаться (проверка отмены входа)</a>
</div></body></html>"""
    return HTMLResponse(html)


@app.post("/token")
async def token(request: Request) -> JSONResponse:
    """Обмен authorization code на маркеры. access_token = code (для /userinfo).

    Проверяет PKCE: ``code_verifier`` должен давать сохранённый на /authorize
    ``code_challenge`` по методу S256. Возвращает подписанный id_token с
    ``nonce`` того же потока.

    Тело читаем вручную (application/x-www-form-urlencoded), чтобы не тянуть
    python-multipart ради ``Form(...)``.
    """
    form = parse_qs((await request.body()).decode())
    code = (form.get("code") or [""])[0]
    verifier = (form.get("code_verifier") or [""])[0]

    flow = FLOWS.pop(code, None)
    if flow is None:
        return JSONResponse(
            {"error": "invalid_grant", "error_description": "Неизвестный или использованный код"},
            status_code=400,
        )
    challenge = flow.get("code_challenge", "")
    if challenge:
        if flow.get("code_challenge_method") != "S256":
            return JSONResponse(
                {"error": "invalid_request", "error_description": "Поддерживается только S256"},
                status_code=400,
            )
        if not verifier or _s256(verifier) != challenge:
            return JSONResponse(
                {"error": "invalid_grant", "error_description": "code_verifier не соответствует code_challenge"},
                status_code=400,
            )

    citizen = _citizen_for(code)
    now = int(time.time())
    client_id = (form.get("client_id") or [flow.get("client_id", "")])[0]
    id_token = jwt.encode(
        {
            "iss": ISSUER,
            "sub": citizen["oid"],
            "aud": client_id,
            "iat": now,
            "exp": now + _ID_TOKEN_TTL_SECONDS,
            "nonce": flow.get("nonce", ""),
        },
        _PRIVATE_KEY,
        algorithm="RS256",
        headers={"kid": _KEY_ID},
    )
    return JSONResponse(
        {"access_token": code or "anonymous", "id_token": id_token, "expires_in": 3600}
    )


@app.get("/jwks")
async def jwks() -> JSONResponse:
    """Публичные ключи подписи id_token (JWKS, ``ESIA_JWKS_URL`` бэкенда)."""
    numbers = _PRIVATE_KEY.public_key().public_numbers()
    return JSONResponse(
        {
            "keys": [
                {
                    "kty": "RSA",
                    "use": "sig",
                    "alg": "RS256",
                    "kid": _KEY_ID,
                    "n": _b64u_uint(numbers.n),
                    "e": _b64u_uint(numbers.e),
                }
            ]
        }
    )


@app.get("/userinfo")
async def userinfo(request: Request) -> JSONResponse:
    """Атрибуты гражданина по Bearer-токену (=code)."""
    auth = request.headers.get("authorization", "")
    code = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    c = _citizen_for(code)
    return JSONResponse(
        {
            "oid": c["oid"],
            "snils": c["snils"],
            "firstName": c["first"],
            "lastName": c["last"],
            "middleName": c["middle"],
            "trusted": True,  # подтверждённая учётная запись
        }
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
