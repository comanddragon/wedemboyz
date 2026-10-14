# Backend dependency groups

The backend uses separate dependency files for each execution environment.

## Inclusion graph

- `runtime.txt` contains dependencies required by a deployed application.
- `development.txt` includes `runtime.txt` and adds local development tools.
- `test.txt` includes `runtime.txt` and adds test, coverage, and verification tools.

The backend root intentionally has no monolithic `requirements.txt`.

## Installation

```bash
# Local development
python -m pip install -r requirements/development.txt

# Automated tests and CI
python -m pip install -r requirements/test.txt

# Production/runtime image
python -m pip install -r requirements/runtime.txt
```

Run these commands from the `backend/` directory.

## Application server

Granian is the sole deployed HTTP/WebSocket server. It loads the Django
Channels ASGI application:

```bash
granian --interface asgi --host 0.0.0.0 --port 8000 config.asgi:application
```

On platforms that provide a `PORT` environment variable, use the checked-in
`Procfile` command.

## Background jobs

Background work uses the Postgres-backed `apps.jobs.Job` outbox. No Celery
worker or Redis job broker is required; Redis remains dedicated to Django
Channels.

A scheduler should call the runner every ten minutes:

```bash
curl -X POST https://api.example.com/internal/jobs/run \
  -H "X-Internal-Jobs-Secret: $INTERNAL_JOBS_SECRET"
```

Set a strong, environment-specific `INTERNAL_JOBS_SECRET` in both Django and
the scheduler. Concurrent calls are safe: due rows are claimed with
`select_for_update(skip_locked=True)`, execution is bounded by batch size and
time budget, and failed jobs retry with exponential backoff. `GET /healthz`
is a separate database-free liveness endpoint.

## Update policy

Keep direct dependencies in the file that owns them and avoid duplicating a
package across files. Version floors may be raised deliberately after the test
suite passes. Production deployments should resolve and record exact versions
in the build artifact or deployment lock produced by CI.

## Environment mapping

| Environment | Requirements | Django settings |
| --- | --- | --- |
| Local development | `development.txt` | `config.settings.local` |
| Test/CI | `test.txt` | `config.settings.test` |
| Production | `runtime.txt` | `config.settings.production` |
