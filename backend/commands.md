# Database selection (local and production)

Both local and production settings use **`DB_URL`**. The separate `DB_NAME`,
`DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` variables are no longer read.
The URL already in `backend/.env` is preserved; no database operations are
performed when updating this configuration.

For everyday local work, set this in `backend/.env` (substitute your credentials):

```dotenv
DB_URL=postgresql://USER:PASSWORD@localhost:5432/wedemboyz
```

To point the local backend at production, replace that value with the Neon
connection string from `backend/.env.production` or the Neon dashboard, keeping
`?sslmode=require` and any `channel_binding` options. Restart the backend after
changing `.env`. The settings module can stay `config.settings.local`; it controls
application behavior, while `DB_URL` selects the database.

For a single command, set `DB_URL` in the shell environment. It takes precedence
over `.env`; `.env.production` is not loaded automatically. To avoid putting a
connection string in shell history, read it silently:

```bash
cd backend
read -r -s -p "Database URL: " selected_db_url
DB_URL="$selected_db_url" python manage.py dbshell --settings=config.settings.local
unset selected_db_url
```

Use the same `DB_URL="$selected_db_url"` prefix with the management command you
intend to run. Credentials containing `@`, `#`, `/`, or other URL-special
characters must be URL-encoded. Query options are preserved. Neon connections
default to TLS in local settings too; pooled (`-pooler`) hosts automatically
have server-side cursors disabled. Production settings also default to TLS.

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

## Render custom domain returns 400 while the Render URL works

The production app reads `DJANGO_ALLOWED_HOSTS` from its running environment.
Updating the local `.env.production` file does not update Render automatically.
In the Wedemboyz backend service’s **Environment** page, set:

```dotenv
DJANGO_ALLOWED_HOSTS=api.wedemboyz-lavomatique.com,wedemboyz-lavomatique.onrender.com
CORS_ALLOWED_ORIGINS=https://wedemboyz-lavomatique.com
CSRF_TRUSTED_ORIGINS=https://wedemboyz-lavomatique.com
FRONTEND_URL=https://wedemboyz-lavomatique.com
```

Allowed hosts contain hostnames only, without `https://` or paths. Keep any other
legitimate backend hostnames already in the deployed list. Save the environment
changes and restart/redeploy the service, then check the custom domain’s `/`
response. Django logs normally identify the rejection as `DisallowedHost`.

CORS and CSRF have separate roles; they do not fix a host-validation 400. Keep
`DEBUG=False` and explicit allowed hosts rather than using a wildcard.
