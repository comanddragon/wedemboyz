from datetime import date, timedelta

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.finance.models import Expense
from apps.payments.models import Payment
from core.constants import PaymentStatus


def _parse_date_range(request, default_days=30):
    start = request.query_params.get("start")
    end = request.query_params.get("end")
    end_date = date.fromisoformat(end) if end else date.today()
    start_date = date.fromisoformat(start) if start else end_date - timedelta(days=default_days)
    return start_date, end_date


class RevenueAnalyticsView(APIView):
    """GET /api/v1/finance/analytics/revenue/?period=daily|monthly&start=&end=

    Time series of succeeded-payment revenue, bucketed by day or month —
    powers the Rapports/Analytics charts."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        period = request.query_params.get("period", "daily")
        start_date, end_date = _parse_date_range(request)

        qs = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            paid_at__date__gte=start_date,
            paid_at__date__lte=end_date,
        )

        trunc = TruncMonth("paid_at") if period == "monthly" else TruncDate("paid_at")
        rows = (
            qs.annotate(bucket=trunc)
            .values("bucket")
            .annotate(revenue=Sum("amount"), payment_count=Count("id"))
            .order_by("bucket")
        )

        return Response(
            {
                "period": period,
                "start": start_date,
                "end": end_date,
                "results": [
                    {
                        "date": row["bucket"].date() if hasattr(row["bucket"], "date") else row["bucket"],
                        "revenue": row["revenue"] or 0,
                        "payment_count": row["payment_count"],
                    }
                    for row in rows
                ],
            }
        )


class FinanceSummaryView(APIView):
    """GET /api/v1/finance/analytics/summary/?start=&end=

    Single aggregate: revenue, expenses, profit, order volume, avg order
    value — the KPI row at the top of the Analytics page."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        start_date, end_date = _parse_date_range(request)

        payments_qs = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            paid_at__date__gte=start_date,
            paid_at__date__lte=end_date,
        )
        revenue_agg = payments_qs.aggregate(total=Sum("amount"), count=Count("id"), avg=Avg("amount"))

        expenses_agg = Expense.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).aggregate(total=Sum("amount"))

        revenue = revenue_agg["total"] or 0
        expenses = expenses_agg["total"] or 0

        return Response(
            {
                "start": start_date,
                "end": end_date,
                "revenue": revenue,
                "expenses": expenses,
                "profit": revenue - expenses,
                "payment_count": revenue_agg["count"] or 0,
                "average_payment": revenue_agg["avg"] or 0,
            }
        )
