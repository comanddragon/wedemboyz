"""
WSGI config for the laundromat project.

Exposes the WSGI callable as a module-level variable named ``application``.
Used by traditional HTTP servers (gunicorn) — no WebSocket support here,
use asgi.py for that.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_wsgi_application()
