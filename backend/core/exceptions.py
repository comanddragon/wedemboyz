"""Custom DRF exception handler — wraps errors in a consistent envelope."""

from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    """
    Wrap DRF's default error response in a consistent shape:

    {
        "success": false,
        "error": {
            "detail": ...,
            "code": "..."
        }
    }
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    error_code = getattr(exc, "default_code", exc.__class__.__name__)

    response.data = {
        "success": False,
        "error": {
            "detail": response.data,
            "code": error_code,
        },
    }
    return response
