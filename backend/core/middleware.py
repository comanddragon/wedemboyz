"""Custom middleware."""

from django.http import HttpResponse
from whitenoise.middleware import WhiteNoiseMiddleware


class AsgiSafeWhiteNoiseMiddleware(WhiteNoiseMiddleware):
    """WhiteNoise that does not trigger Django's ASGI streaming warning.

    Stock WhiteNoise returns a ``FileResponse`` (a ``StreamingHttpResponse``
    over a *sync* file iterator). Under ASGI (granian) Django logs
    "StreamingHttpResponse must consume synchronous iterators in order to
    serve them asynchronously" on every static file. Static assets are
    small, so read the (already range/conditional-resolved) body into a
    plain ``HttpResponse`` instead.
    """

    @staticmethod
    def serve(static_file, request):
        response = static_file.get_response(request.method, request.META)
        body = b""
        if response.file is not None:
            try:
                body = response.file.read()
            finally:
                response.file.close()
        http_response = HttpResponse(body, status=int(response.status))
        # Drop Django's default content-type; WhiteNoise sets its own.
        del http_response["content-type"]
        for key, value in response.headers:
            http_response[key] = value
        return http_response
