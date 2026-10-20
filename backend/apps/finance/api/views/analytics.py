from datetime import date, timedelta

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.finance.models import Expense, PayrollEntry
from apps.orders.models import Order
from apps.payments.models import Payment
from core.constants import OrderStatus, PaymentStatus
from apps.staff.permissions import HasStaffPermission, StaffPermission


def _parse_date_range(request, default_days=30):
    start = request.query_params.get("start")
    end = request.query_params.get("end")
    try:
        end_date = date.fromisoformat(end) if end else date.today()
        start_date = date.fromisoformat(start) if start else end_date - timedelta(days=default_days)
    except ValueError as exc:
        raise ValidationError("Dates must use YYYY-MM-DD format.") from exc
    if start_date > end_date:
        raise ValidationError("Start date must be on or before end date.")
    return start_date, end_date


class RevenueAnalyticsView(APIView):
    """GET /api/v1/finance/analytics/revenue/?period=daily|monthly&start=&end=

    Time series of succeeded-payment revenue, bucketed by day or month —
    powers the Rapports/Analytics charts."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_VIEW

    def get(self, request):
        period = request.query_params.get("period", "daily")
        start_date, end_date = _parse_date_range(request)

        orders = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).exclude(status=OrderStatus.CANCELLED)
        payments = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            voided_at__isnull=True,
            received_at__date__gte=start_date,
            received_at__date__lte=end_date,
        )

        order_trunc = TruncMonth("created_at") if period == "monthly" else TruncDate("created_at")
        payment_trunc = TruncMonth("received_at") if period == "monthly" else TruncDate("received_at")
        rows = list(
            orders.annotate(bucket=order_trunc)
            .values("bucket")
            .annotate(revenue=Sum("total_amount"), order_count=Count("id"))
            .order_by("bucket")
        )
        cash_rows = {
            row["bucket"]: row
            for row in payments.annotate(bucket=payment_trunc)
            .values("bucket")
            .annotate(cash_received=Sum("amount"), payment_count=Count("id"))
        }

        return Response(
            {
                "period": period,
                "start": start_date,
                "end": end_date,
                "results": [
                    {
                        "date": row["bucket"].date() if hasattr(row["bucket"], "date") else row["bucket"],
                        "revenue": row["revenue"] or 0,
                        "order_count": row["order_count"],
                        "cash_received": cash_rows.get(row["bucket"], {}).get("cash_received", 0),
                        "payment_count": cash_rows.get(row["bucket"], {}).get("payment_count", 0),
                    }
                    for row in rows
                ],
            }
        )


class FinanceSummaryView(APIView):
    """GET /api/v1/finance/analytics/summary/?start=&end=

    Single aggregate: revenue, expenses, profit, order volume, avg order
    value — the KPI row at the top of the Analytics page."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_VIEW

    def get(self, request):
        start_date, end_date = _parse_date_range(request)

        orders_qs = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).exclude(status=OrderStatus.CANCELLED)
        payments_qs = Payment.objects.filter(
            status=PaymentStatus.SUCCEEDED,
            voided_at__isnull=True,
            received_at__date__gte=start_date,
            received_at__date__lte=end_date,
        )
        income_agg = orders_qs.aggregate(
            total=Sum("total_amount"), count=Count("id"), avg=Avg("total_amount")
        )
        cash_agg = payments_qs.aggregate(total=Sum("amount"), count=Count("id"))

        expenses_agg = Expense.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).aggregate(total=Sum("amount"))

        payroll_agg = PayrollEntry.objects.filter(
            status=PayrollEntry.Status.PAID,
            paid_on__gte=start_date,
            paid_on__lte=end_date,
        ).aggregate(total=Sum("amount"))

        income = income_agg["total"] or 0
        cash_received = cash_agg["total"] or 0
        expenses = (expenses_agg["total"] or 0) + (payroll_agg["total"] or 0)

        return Response(
            {
                "start": start_date,
                "end": end_date,
                "revenue": income,
                "income_booked": income,
                "cash_received": cash_received,
                "outstanding": max(income - cash_received, 0),
                "expenses": expenses,
                "profit": income - expenses,
                "order_count": income_agg["count"] or 0,
                "average_order": income_agg["avg"] or 0,
                "payment_count": cash_agg["count"] or 0,
                "average_payment": (
                    cash_received / cash_agg["count"] if cash_agg["count"] else 0
                ),
            }
        )
