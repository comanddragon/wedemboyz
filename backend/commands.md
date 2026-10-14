python manage.py migrate
granian --interface asgi --host 0.0.0.0 --port 8000 config.asgi:application
curl -X POST http://localhost:8000/internal/jobs/run \
  -H "X-Internal-Jobs-Secret: $INTERNAL_JOBS_SECRET"
