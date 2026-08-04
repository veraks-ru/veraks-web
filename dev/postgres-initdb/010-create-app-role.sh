#!/bin/bash
# T9: локальная непривилегированная роль приложения orakul_app «из коробки».
#
# Выполняется Postgres'ом ТОЛЬКО при первой инициализации пустого тома
# (механизм docker-entrypoint-initdb.d) — на уже существующем pgdata сама не
# появится, тогда накатить вручную: backend/scripts/create_app_role.py
# (тот же скрипт, что использует бэкенд-репозиторий и Helm-чарт).
#
# Локальный DATABASE_URL приложения (x-backend-env в docker-compose.yml)
# НЕ переключаем на эту роль — владельцем удобнее для дева; роль здесь
# только чтобы она была под рукой (ручная проверка REVOKE append-only,
# e2e-тест tests/e2e/test_db_role.py — он бутстрапит свою тестовую роль сам,
# но эта, «из коробки», удобна для ручной проверки: psql под orakul_app).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_role="${APP_DB_ROLE:-orakul_app}" \
  -v app_password="${APP_DB_PASSWORD:?APP_DB_PASSWORD не задан}" \
  -f /opt/orakul/create_app_role.sql
