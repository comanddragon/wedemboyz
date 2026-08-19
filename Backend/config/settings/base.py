"""
Base settings shared by every environment.
Environment-specific overrides live in development.py / production.py.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config

# backend/config/settings/base.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
SECRET_KEY = config("DJANGO_SECRET_KEY")
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "daphne",  # must be first, or at least before staticfiles
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "channels",
    "django_celery_beat",
    "django_celery_results",
    "storages",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.users",
    "apps.orders",
    "apps.payments",
    "apps.discounts",
    "apps.chat",
    "apps.notifications",
    "apps.staff",
    "apps.finance",
    "apps.inventory",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # DEV-ONLY: overwrites an order's total to a small fixed amount for the
    # duration of a payment-initiation request only, so CamPay's sandbox can
    # be exercised without moving real-sized money. Inert unless
    # settings.DEBUG is True — see apps/payments/middleware.py docstring.
    "apps.payments.middleware.DevTestPaymentAmountMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# DATABASES = {
#     "default": dj_database_url.parse(
#         config(
#             "DATABASE_URL",
#             default="postgres://postgres:postgres@localhost:5432/laundromat",
#         ),
#         conn_max_age=600,
#     )
# }

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="wedemboyz"),
        "USER": config("DB_USER", default="silkkeith"),
        "PASSWORD": config("DB_PASSWORD", default="85213"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "users.CustomUser"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# DRF / JWT / API schema
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": [
        "core.renderers.EnvelopeJSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Laundromat API",
    "DESCRIPTION": "API for laundry pickup, delivery, payments, and loyalty.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:3000", cast=Csv()
)
# django-cors-headers' default allowlist doesn't include this header.
# ngrok's free tier serves a "click to visit" interstitial to browser
# requests unless this header is present, so the frontend sends it on
# every call when running against an ngrok-tunneled backend.
from corsheaders.defaults import default_headers

CORS_ALLOW_HEADERS = list(default_headers) + ["ngrok-skip-browser-warning"]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Channels / Celery / Redis
# ---------------------------------------------------------------------------
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = "django-db"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Douala"
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True

# ---------------------------------------------------------------------------
# Payments / SMS / Email (third-party service credentials)
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
# Stripe requires a pre-created recurring Price object per plan for
# subscription-mode Checkout Sessions (unlike one-time charges, which can use
# ad-hoc price_data). Create these in the Stripe Dashboard/API once per plan
# and put the resulting price IDs here. One-time subscription checkouts don't
# need these — they use price_data built from services.pricing.PLAN_PRICE.
STRIPE_PRICE_ID_ESSENTIEL = config("STRIPE_PRICE_ID_ESSENTIEL", default="")
STRIPE_PRICE_ID_CONFORT = config("STRIPE_PRICE_ID_CONFORT", default="")
STRIPE_PRICE_ID_FAMILLE = config("STRIPE_PRICE_ID_FAMILLE", default="")

PAYPAL_CLIENT_ID = config("PAYPAL_CLIENT_ID", default="")
PAYPAL_CLIENT_SECRET = config("PAYPAL_CLIENT_SECRET", default="")
PAYPAL_WEBHOOK_ID = config("PAYPAL_WEBHOOK_ID", default="")
# https://api-m.sandbox.paypal.com for sandbox, https://api-m.paypal.com for live.
PAYPAL_API_BASE = config("PAYPAL_API_BASE", default="https://api-m.sandbox.paypal.com")
# PayPal's REST API does not support XAF (it's not in PayPal's ~25 supported
# transaction currencies, unlike Stripe which treats it as a valid
# zero-decimal currency). PayPal-billed amounts are converted to USD using
# this rate — swap this default for a live FX feed before going to
# production; a stale hardcoded peg will drift from the real market rate.
PAYPAL_XAF_TO_USD_RATE = config("PAYPAL_XAF_TO_USD_RATE", default="605", cast=float)
# Pre-created PayPal recurring billing plan IDs, one per subscription plan —
# create these once via the PayPal Billing Plans API/dashboard (a Product +
# a Plan priced in USD per SUBSCRIPTION_PERIOD_DAYS), same idea as Stripe's
# STRIPE_PRICE_ID_* above.
PAYPAL_PLAN_ID_ESSENTIEL = config("PAYPAL_PLAN_ID_ESSENTIEL", default="")
PAYPAL_PLAN_ID_CONFORT = config("PAYPAL_PLAN_ID_CONFORT", default="")
PAYPAL_PLAN_ID_FAMILLE = config("PAYPAL_PLAN_ID_FAMILLE", default="")

# Used to build Stripe/PayPal checkout success & cancel redirect URLs.
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# CamPay — collects MTN Mobile Money and Orange Money payments through a
# single API (see services/billing/campay_gateway.py). "environment" is
# "DEV" (https://demo.campay.net, no real money moves) or "PROD"
# (https://www.campay.net, live). Get app_username/app_password from your
# CamPay dashboard's registered application.
CAMPAY_APP_USERNAME = config("CAMPAY_APP_USERNAME", default="")
CAMPAY_APP_PASSWORD = config("CAMPAY_APP_PASSWORD", default="")
CAMPAY_ENVIRONMENT = config("CAMPAY_ENVIRONMENT", default="DEV")
# Optional: CamPay dashboard lets you set a "Webhook key" used to sign
# callback payloads. If set, CamPayWebhookView verifies it; if blank,
# verification is skipped (fine for DEV, not recommended for PROD).
CAMPAY_WEBHOOK_KEY = config("CAMPAY_WEBHOOK_KEY", default="")

SMS_PROVIDER = config("SMS_PROVIDER", default="africastalking")
AFRICASTALKING_API_KEY = config("AFRICASTALKING_API_KEY", default="")
AFRICASTALKING_USERNAME = config("AFRICASTALKING_USERNAME", default="")

# WhatsApp Business messaging — Twilio's WhatsApp API by default (widely
# available in Cameroon without a direct Meta Business verification).
WHATSAPP_PROVIDER = config("WHATSAPP_PROVIDER", default="twilio")
WHATSAPP_ACCOUNT_SID = config("WHATSAPP_ACCOUNT_SID", default="")
WHATSAPP_AUTH_TOKEN = config("WHATSAPP_AUTH_TOKEN", default="")
WHATSAPP_FROM_NUMBER = config("WHATSAPP_FROM_NUMBER", default="")  # e.g. "whatsapp:+14155238886"

# Push notifications — Firebase Cloud Messaging (legacy HTTP API).
FCM_SERVER_KEY = config("FCM_SERVER_KEY", default="")

EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = config("EMAIL_HOST", default="smtp.sendgrid.net")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("SENDGRID_API_KEY", default="apikey")
EMAIL_HOST_PASSWORD = config("SENDGRID_API_KEY", default="")

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Douala"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static / media
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"