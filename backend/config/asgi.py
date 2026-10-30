"""
ASGI config for the laundromat project.

Exposes HTTP handling via Django and WebSocket handling via Channels.
It exposes the ASGI callable as a module-level variable named ``application``.
"""

import os

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# Django must be set up before importing anything that touches the app
# registry (e.g. consumers/routing that import models).
django.setup()

from apps.chat.routing import websocket_urlpatterns  # noqa: E402
from apps.chat.ws_auth import JWTAuthMiddlewareStack  # noqa: E402

_router = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)  # ws://host/ws/chat/<room_id>/
        ),
    }
)


async def application(scope, receive, send):
    """Top-level ASGI app.

    Channels' ``ProtocolTypeRouter`` raises for ``lifespan`` scopes, which
    makes granian log "ASGI Lifespan errored, continuing without Lifespan
    support". Answer the lifespan protocol here and delegate everything
    else (http / websocket) to the router.
    """
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return
    else:
        await _router(scope, receive, send)
