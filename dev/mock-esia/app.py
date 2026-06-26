"""Мок ЕСИА для локальной разработки.

Имитирует OIDC authorization code flow ровно в той форме, которую ожидает
``EsiaOidcGateway`` бэкенда: страница /authorize с выбором «гражданина»,
обмен кода на токен в /token, атрибуты в /userinfo.

НЕ для прода: здесь нет криптографии, подписей и реальной ЕСИА. В бою на это
место встаёт сертифицированный шлюз/интегратор.
"""

from __future__ import annotations

from urllib.parse import parse_qs, urlencode

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="Mock ЕСИА (dev only)")

# СНИЛС с номером <= 001-001-998 не проверяются контрольной суммой (домен
# Snils), поэтому используем такие — валидны без вычисления чек-суммы.
# Ключи совпадают с username'ами из сид-данных бэкенда: вход по такому СНИЛС
# попадает в уже засеянный аккаунт (find-or-create находит по snils_hash).
CITIZENS: dict[str, dict[str, str]] = {
    "kalibr": {"oid": "1000000001", "snils": "00100150100", "first": "Артём", "last": "Калибров", "middle": "Сергеевич"},
    "mediana": {"oid": "1000000002", "snils": "00100150200", "first": "Мария", "last": "Медиана", "middle": "Игоревна"},
    "baseline": {"oid": "1000000003", "snils": "00100150300", "first": "Борис", "last": "Базлайнов", "middle": "Петрович"},
}


def _citizen_for(code: str) -> dict[str, str]:
    if code in CITIZENS:
        return CITIZENS[code]
    # «Новый гражданин»: code вида new-<n> → детерминированный свежий СНИЛС.
    n = abs(hash(code)) % 800
    num = 1001000 + n  # 9-значный префикс <= 001-001-998
    snils = f"{num:09d}00"
    return {"oid": f"9{num}", "snils": snils, "first": "Новый", "last": "Гражданин", "middle": ""}


@app.get("/authorize", response_class=HTMLResponse)
async def authorize(request: Request) -> HTMLResponse:
    """Страница выбора учётной записи (вместо реального входа в Госуслуги)."""
    redirect_uri = request.query_params.get("redirect_uri", "")
    state = request.query_params.get("state", "")

    def link(code: str) -> str:
        return f"{redirect_uri}?{urlencode({'code': code, 'state': state})}"

    rows = "".join(
        f'<li><a href="{link(key)}"><b>{c["last"]} {c["first"]}</b>'
        f'<span>СНИЛС {c["snils"][:3]}-{c["snils"][3:6]}-{c["snils"][6:9]} {c["snils"][9:]}</span></a></li>'
        for key, c in CITIZENS.items()
    )
    new_link = link("new-citizen")

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
  .tag{{display:inline-block;background:rgba(70,224,196,.12);color:#46e0c4;
        font-size:11px;padding:4px 8px;border-radius:999px;margin-bottom:16px}}
</style></head><body>
<div class="card">
  <span class="tag">МОК ЕСИА · только для разработки</span>
  <h1>Войти как</h1>
  <p class="sub">Выберите подтверждённую учётную запись</p>
  <ul>{rows}</ul>
  <a class="new" href="{new_link}">Новый гражданин (свежий аккаунт)</a>
</div></body></html>"""
    return HTMLResponse(html)


@app.post("/token")
async def token(request: Request) -> JSONResponse:
    """Обмен authorization code на маркеры. access_token = code (для /userinfo).

    Тело читаем вручную (application/x-www-form-urlencoded), чтобы не тянуть
    python-multipart ради ``Form(...)``.
    """
    raw = (await request.body()).decode()
    code = (parse_qs(raw).get("code") or [""])[0]
    return JSONResponse(
        {"access_token": code or "anonymous", "id_token": "mock-id-token", "expires_in": 3600}
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
