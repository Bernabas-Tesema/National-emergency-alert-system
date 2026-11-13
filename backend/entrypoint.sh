#!/bin/sh
set -eu

echo "Running migrations…"
python manage.py migrate --noinput

if [ "${DEV_MODE:-false}" != "true" ] && [ -z "${REDIS_URL:-}" ]; then
  echo "Ensuring DB cache table…"
  python manage.py createcachetable || true
fi

echo "Collecting static files…"
python manage.py collectstatic --noinput

WORKERS="${WEB_CONCURRENCY:-3}"
PORT="${PORT:-8081}"
TIMEOUT="${GUNICORN_TIMEOUT:-90}"

echo "Starting Gunicorn on 0.0.0.0:${PORT} (workers=${WORKERS})"
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT}" \
  --workers "${WORKERS}" \
  --timeout "${TIMEOUT}" \
  --access-logfile "-" \
  --error-logfile "-" \
  --capture-output
