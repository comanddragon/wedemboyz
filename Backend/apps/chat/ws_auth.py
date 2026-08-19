"""
Channels middleware that authenticates WebSocket connections using the same
SimpleJWT access tokens issued by the REST API (rest_framework_simplejwt).

Django Channels' built-in AuthMiddlewareStack only understands Django
session cookies, so it can't authenticate the JWTs this project uses for
HTTP. This middleware reads the token from the `?token=` query string,
validates it with SimpleJWT, and resolves it to a user the same way
JWTAuthentication does for regular API requests.
"""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_from_token(token):
    try:
        validated_token = JWTAuthentication().get_validated_token(token)
        return JWTAuthentication().get_user(validated_token)
    except (InvalidToken, TokenError, AuthenticationFailed) as exc:
        logger.warning("WS auth rejected token: %s", exc)
        return AnonymousUser()
    except Exception:
        logger.exception("WS auth: unexpected error validating token")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]

        scope["user"] = (
            await _get_user_from_token(token) if token else AnonymousUser()
        )

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)