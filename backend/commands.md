# Production commands

Set `DB_URL` to your Neon connection string (Neon dashboard → Connect; use the
pooled `-pooler` host) in your production environment, along with the rest of
`env.production`. Copy the example to the ignored `.env.production`
for local verification, or import the same variables into the hosting provider.

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production
export DB_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require"
```

## Migrate

Run migrations over Neon's **direct** (non-pooled) host if you hit PgBouncer
or advisory-lock issues: remove `-pooler` from the host for this one command.

```bash
python manage.py migrate
```

## Run the server

```bash
granian --interface asgi --host 0.0.0.0 --port 8000 config.asgi:application
```

## Trigger background jobs

```bash
curl -X POST http://localhost:8000/internal/jobs/run \
  -H "X-Internal-Jobs-Secret: $INTERNAL_JOBS_SECRET"
```
