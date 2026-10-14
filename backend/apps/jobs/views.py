import secrets

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import run_due_jobs


@require_GET
def healthz(_request):
    """Database-free liveness check."""
    return JsonResponse({"status": "ok"})


class RunJobsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        supplied = request.headers.get("X-Internal-Jobs-Secret", "")
        expected = settings.INTERNAL_JOBS_SECRET
        if not expected or not secrets.compare_digest(supplied, expected):
            return Response({"detail": "Not found."}, status=404)

        result = run_due_jobs(
            batch_size=settings.JOBS_BATCH_SIZE,
            time_budget_seconds=settings.JOBS_TIME_BUDGET_SECONDS,
        )
        return Response(result)
