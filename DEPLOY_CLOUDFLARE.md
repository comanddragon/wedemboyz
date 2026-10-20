# Deploy Wedemboyz Lavomatique to Cloudflare

The frontend is deployed as a Cloudflare Worker through OpenNext. The Django
API is deployed as a Cloudflare Container routed by a Worker. PostgreSQL,
Redis, and uploaded media remain external services because container files are
ephemeral.

## Prerequisites

- A Cloudflare account on the Workers Paid plan with Containers enabled
- Bun 1.4 or newer
- Docker with the Buildx plugin (Wrangler builds the Django container locally)
- A publicly reachable PostgreSQL database with TLS
- A publicly reachable Redis service with TLS for Channels/WebSockets
- An R2 bucket, R2 S3 API credentials, and an enabled public/custom domain

Authenticate Wrangler once from either project:

```bash
bunx wrangler login
```

On Ubuntu installations that use the `docker.io` package, install Buildx once:

```bash
sudo apt-get install -y docker-buildx
docker buildx version
```

## 1. Backend container

Install the Wrangler dependency:

```bash
cd backend
bun install
```

Configure these as Worker variables or secrets in the Cloudflare dashboard for
`wedemboyz-api`. Secrets can also be added from the CLI:

```bash
bunx wrangler secret put DJANGO_SECRET_KEY
bunx wrangler secret put INTERNAL_JOBS_SECRET
bunx wrangler secret put DB_PASSWORD
bunx wrangler secret put REDIS_URL
bunx wrangler secret put AWS_ACCESS_KEY_ID
bunx wrangler secret put AWS_SECRET_ACCESS_KEY
```

Add the remaining production values in **Workers & Pages → wedemboyz-api →
Settings → Variables and Secrets**:

```text
DJANGO_ALLOWED_HOSTS=api.wedemboyz.ntsemancho.online,wedemboyz-api.<account-subdomain>.workers.dev
CORS_ALLOWED_ORIGINS=https://wedemboyz.ntsemancho.online,https://wedemboyz-lavomatique.<account-subdomain>.workers.dev
CSRF_TRUSTED_ORIGINS=https://wedemboyz.ntsemancho.online,https://wedemboyz-lavomatique.<account-subdomain>.workers.dev
FRONTEND_URL=https://wedemboyz.ntsemancho.online
DB_NAME=wedemboyz
DB_USER=<database-user>
DB_HOST=<database-host>
DB_PORT=5432
DB_SSLMODE=require
REDIS_URL=rediss://<user>:<password>@<redis-host>:<port>/0
AWS_STORAGE_BUCKET_NAME=wedemboyz-media
AWS_S3_REGION_NAME=auto
AWS_S3_ENDPOINT_URL=https://<cloudflare-account-id>.r2.cloudflarestorage.com
AWS_S3_CUSTOM_DOMAIN=media.example.com
```

Add payment, email, SMS, WhatsApp, Sentry, and Firebase credentials from the
existing backend environment when those integrations are enabled. Every string
variable or secret attached to the Worker is passed into Django.

Deploy the API:

```bash
bun run deploy:cloudflare
```

The first container start runs `collectstatic` and database migrations before
starting Granian on port 8080. After the first successful production migration,
set `RUN_MIGRATIONS` to `false` in `backend/wrangler.jsonc` if migrations will be
managed by a separate release process.

The Worker configuration provisions `api.wedemboyz.ntsemancho.online` as its custom
domain. After deployment, confirm:

```text
https://api.wedemboyz.ntsemancho.online/healthz
```

## 2. Frontend OpenNext Worker

Set the production API URL before building. `NEXT_PUBLIC_*` values are compiled
into the browser bundle, so changing it requires another build and deployment:

```bash
cd frontend
cp cloudflare.env.example .env.production
# Set NEXT_PUBLIC_API_BASE_URL=https://api.wedemboyz.ntsemancho.online/api/v1
# Set NEXT_PUBLIC_WS_BASE_URL=wss://api.wedemboyz.ntsemancho.online
bun install
bun run deploy:cloudflare
```

The frontend Worker configuration provisions `wedemboyz.ntsemancho.online`.
Update the backend's `DJANGO_ALLOWED_HOSTS`,
`CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and `FRONTEND_URL` whenever
either custom domain changes.

## Local Cloudflare previews

Frontend:

```bash
cd frontend
bun run preview:cloudflare
```

Backend container (copy the example environment first):

```bash
cd backend
cp .dev.vars.example .dev.vars
bun run dev:cloudflare
```
