"""
ASGI config for the laundromat project.

Exposes HTTP handling via Django and WebSocket handling via Channels.
It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Django must be set up before importing anything that touches the app
# registry (e.g. consumers/routing that import models).
django.setup()

from apps.chat.routing import websocket_urlpatterns  # noqa: E402
from apps.chat.ws_auth import JWTAuthMiddlewareStack  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)  # ws://host/ws/chat/<room_id>/
        ),
    }
)