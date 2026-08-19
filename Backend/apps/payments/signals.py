from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.constants import PaymentStatus
from core.tasks_utils import safe_delay

from .models import Invoice, Payment, Subscription


@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance, created, **kwargs):
    if instance.status != PaymentStatus.SUCCEEDED:
        return

    if instance.order_id:
        _reconcile_order_invoice(instance)
    elif instance.subscription_id and instance.subscription.status == Subscription.Status.PENDING:
        # First successful payment for a still-unpaid subscription — renewal
        # payments are created already-SUCCEEDED by
        # apps.payments.tasks.renew_subscription and handle their own period
        # extension there, so this only fires for the initial activation.
        from .tasks import activate_subscription

        safe_delay(activate_subscription, instance.pk)

    from .tasks import send_receipt_email

    safe_delay(send_receipt_email, instance.pk)


def _reconcile_order_invoice(payment):
    order = payment.order

    invoice, _ = Invoice.objects.get_or_create(
        order=order,
        defaults={
            "invoice_number": f"INV-{order.pk:06d}",
            "amount_due": order.total_amount,
        },
    )
    total_paid = (
        order.payments.filter(status=PaymentStatus.SUCCEEDED).aggregate(total=Sum("amount"))["total"]
        or 0
    )
    if invoice.amount_paid != total_paid:
        invoice.amount_paid = total_paid
        invoice.save(update_fields=["amount_paid"])
