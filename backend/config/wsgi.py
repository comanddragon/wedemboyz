"""
WSGI config for the laundromat project.

Exposes the WSGI callable as a module-level variable named ``application``.
Retained for Django integrations that still require WSGI. The deployed server
is Granian and serves ``config.asgi:application`` so HTTP and WebSocket traffic
share one ASGI entrypoint.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_wsgi_application()
