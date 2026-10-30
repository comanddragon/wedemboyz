"""Tiny site-level views: API root and favicon.

Browsers, uptime pings and Render's port scan hit ``/`` and
``/favicon.ico``. Without handlers those produce a ``django.request``
"Not Found" warning on every visit.
"""

from django.http import HttpResponse, JsonResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET, require_safe


@require_safe
def root(_request):
    """Friendly landing response for ``/``."""
    return JsonResponse(
        {
            "service": "wedemboyz-lavomatique",
            "status": "ok",
            "docs": "/api/v1/schema/swagger-ui/",
            "health": "/health",
        }
    )


@require_GET
@cache_control(max_age=60 * 60 * 24, public=True)
def favicon(_request):
    """The API has no icon; answer 204 so browsers stop retrying noisily."""
    return HttpResponse(status=204)
