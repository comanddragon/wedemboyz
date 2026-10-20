#!/bin/sh
set -eu

python manage.py collectstatic --noinput

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    python manage.py migrate --noinput
fi

exec granian \
    --interface asgi \
    --host 0.0.0.0 \
    --port "${PORT:-8080}" \
    --workers 1 \
    config.asgi:application
