from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.orders.models import OrderPaymentHistory
from apps.payments.models import Invoice, Refund
from core.constants import OrderPaymentStatus, PaymentStatus


@transaction.atomic
def recompute_payment_status(order, *, changed_by=None, reason=""):
    order = type(order).objects.select_for_update().get(pk=order.pk)
    received = order.payments.filter(
        voided_at__isnull=True, status=PaymentStatus.SUCCEEDED
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    refunded = Refund.objects.filter(
        payment__order=order,
        status=Refund.Status.PROCESSED,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    net_paid = max(received - refunded, Decimal("0"))
    previous = order.payment_status

    # Refunds and partial collections affect the balance, not the public state set.
    new_status = (
        OrderPaymentStatus.PAID if net_paid >= order.total_amount else OrderPaymentStatus.UNPAID
    )

    order.amount_paid = net_paid
    order.payment_status = new_status
    if new_status == OrderPaymentStatus.PAID:
        order.paid_at = order.paid_at or timezone.now()
    else:
        order.paid_at = None
    order.save(update_fields=["amount_paid", "payment_status", "paid_at", "updated_at"])

    invoice, _ = Invoice.objects.get_or_create(
        order=order,
        defaults={
            "invoice_number": f"INV-{order.pk:06d}",
            "amount_due": order.total_amount,
        },
    )
    invoice.amount_due = order.total_amount
    invoice.amount_paid = net_paid
    invoice.save(update_fields=["amount_due", "amount_paid", "updated_at"])

    if previous != new_status:
        OrderPaymentHistory.objects.create(
            order=order,
            from_status=previous,
            to_status=new_status,
            amount=net_paid,
            reason=reason,
            changed_by=changed_by,
        )
    return order
