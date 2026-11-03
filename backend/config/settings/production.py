from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = False
INTERNAL_JOBS_SECRET = config("INTERNAL_JOBS_SECRET")

# Production must never silently fall back to the local development Redis
# instance from base.py. Channels and WebSockets depend on this service.
REDIS_URL = config("REDIS_URL")
CHANNEL_LAYERS["default"]["CONFIG"]["hosts"] = [REDIS_URL]  # noqa: F405

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7  # 1 week, ramp up once confirmed stable
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

CORS_ALLOW_ALL_ORIGINS = False

# ---------------------------------------------------------------------------
# Email (Resend API, with idempotency and explicit delivery failures)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "services.email_backend.EmailBackend"
DEFAULT_FROM_EMAIL = config("RESEND_FROM", default="Wedemboyz Lavomatique <hello@wedemboyz-lavomatique.com>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# ---------------------------------------------------------------------------
# Static & media via S3
# ---------------------------------------------------------------------------
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="auto")
# Cloudflare R2 exposes an S3-compatible API at
# https://<account-id>.r2.cloudflarestorage.com. Media should be served from
# the bucket's public/custom domain instead of the authenticated API endpoint.
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default=None)
AWS_S3_CUSTOM_DOMAIN = config("AWS_S3_CUSTOM_DOMAIN")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/wedemboyz-media/"

# ---------------------------------------------------------------------------
# Database — base.py parses DB_URL for every environment.
# ---------------------------------------------------------------------------
# Production defaults to TLS while preserving stricter URL options such as
# sslmode=verify-full. Local PostgreSQL does not require TLS unless requested.
DATABASES["default"]["OPTIONS"].setdefault("sslmode", "require")  # noqa: F405

# Whitenoise serves Django's own static files without needing S3/CDN for those.
MIDDLEWARE.insert(1, "core.middleware.AsgiSafeWhiteNoiseMiddleware")  # noqa: F405

# ---------------------------------------------------------------------------
# Error tracking
# ---------------------------------------------------------------------------
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
