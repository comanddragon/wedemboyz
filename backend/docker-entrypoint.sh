#!/bin/sh
set -eu

# Render supplies PORT at runtime. Keeping a fallback also makes the image
# convenient to run locally.
port="${PORT:-8080}"
workers="${WEB_CONCURRENCY:-1}"

python manage.py collectstatic --noinput

# Set RUN_MIGRATIONS=false when migrations are handled by a Render pre-deploy
# command or another release process.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    python manage.py migrate --noinput
fi

exec granian \
    --interface asgi \
    --host 0.0.0.0 \
    --port "$port" \
    --workers "$workers" \
    config.asgi:application
