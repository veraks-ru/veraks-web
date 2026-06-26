# Локальный запуск кластера

Фронтенд (Next.js) + бэкенд (FastAPI) + воркер (ARQ) + Postgres + Redis + мок ЕСИА.

## Вариант A — всё в Docker (как поедет в k8s)

Требует доступа к Docker Hub и PyPI (CI, обычная машина, кластер):

```bash
docker compose --profile full up --build
```

Поднимает postgres, redis, backend (мигрирует и стартует), worker, mock-esia,
frontend. Открыть http://localhost:3000.

> В этой песочнице Docker Hub и PyPI недоступны (DNS/handshake блокируются),
> поэтому образы приложения здесь не собрать. Артефакты (Dockerfile'ы, compose)
> корректны и собираются там, где сеть открыта. Локально используйте вариант B.

## Вариант B — данные в Docker, приложение на хосте

```bash
# 1. Слой данных
docker compose up -d                      # postgres + redis (локальные образы)

# 2. Бэкенд + воркер + мок ЕСИА (из .venv бэкенда)
cd ../backend
python -m venv .venv && . .venv/bin/activate && pip install -e .   # один раз
set -a && . ./.env && set +a              # переменные окружения
alembic upgrade head                      # миграции (все, включая billing)
python seed.py                            # демо-данные + скоринг
uvicorn app.main:app --port 8000 --reload &
arq app.worker.WorkerSettings &           # фоновые задачи (скоринг, roll сезонов)

cd ../web/dev/mock-esia
../../../backend/.venv/bin/uvicorn app:app --port 9000 &

# 3. Фронтенд
cd ../../ && npm install && npm run dev    # http://localhost:3000
```

## Вход (мок ЕСИА)

«Войти через Госуслуги» → мок-страница выбора учётной записи
(http://localhost:9000/authorize). Засеянные граждане:

- **kalibr** → аккаунт @kalibr (роль editor, есть история);
- **mediana**, **baseline** → другие засеянные профили;
- «Новый гражданин» → свежий аккаунт.

Уникальность «1 человек = 1 аккаунт» — по хэшу СНИЛС.

## Что подключено к реальному API

Лента, экран прогноза (PUT), авторизация ЕСИА (cookie-сессия), `/auth/me`,
лидерборды (global/категории/сезон с резолвингом имён по `user_id`), профиль
(калибровка/ранг/категории/история), разрешённое событие, шеринг, сезоны.

Базовый URL бэкенда — `NEXT_PUBLIC_API_BASE` (`.env.local`, по умолчанию
`http://localhost:8000`).

## Заметки

- Сводку толпы бэкенд скрывает до закрытия приёма (строже, чем по-юзерно) —
  на открытых событиях консенсус показывается после закрытия.
- Сезонная лига пуста: демо-события не привязаны к сезону (можно привязать
  в `seed.py`).
