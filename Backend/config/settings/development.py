from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = [
    "localhost", "127.0.0.1", "0.0.0.0", "192.168.1.182",
    # ngrok static domain — CamPay's webhook hits this directly, so it must
    # be allowed even in dev. Update if you ever reclaim a different domain.
    "fabulous-power-charcoal.ngrok-free.dev",
]

# Needed on top of ALLOWED_HOSTS: Django's CSRF middleware checks the
# Origin header against this list separately (session/cookie-authenticated
# requests only — plain JWT API calls via curl aren't affected). Without
# this, hitting /admin/ or the DRF browsable API through the ngrok tunnel
# 403s with "Origin checking failed".
CSRF_TRUSTED_ORIGINS = [
    "https://fabulous-power-charcoal.ngrok-free.dev",
]

INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa: F405

INTERNAL_IPS = ["127.0.0.1"]

# Relax JWT/permissions friction locally if desired; keep DRF defaults from base.

# Console-based email in dev — no real SMTP calls while iterating.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CORS_ALLOW_ALL_ORIGINS = True

# Verbose logging while developing.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "apps": {"handlers": ["console"], "level": "DEBUG", "propagate": False},
    },
}
