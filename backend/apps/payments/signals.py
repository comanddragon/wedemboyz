from django.conf import settings
from django.db.models import Sum
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.constants import PaymentStatus
from core.tasks_utils import safe_delay

from .models import Invoice, Payment, Refund, Subscription


@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    previous = getattr(instance, "_email_previous", {})
    changed = created or previous.get("status") != instance.status
    if changed and instance.status == PaymentStatus.FAILED:
        from services.email_events import payment_email

        payment_email(instance, failed=True)
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

    if changed and not getattr(settings, "SEED_DATA_ACTIVE", False):
        from services.email_events import payment_email

        from .tasks import send_receipt_sms

        payment_email(instance)
        safe_delay(send_receipt_sms, instance.pk)


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
        order.payments.filter(status=PaymentStatus.SUCCEEDED).aggregate(total=Sum("amount"))[
            "total"
        ]
        or 0
    )
    if invoice.amount_paid != total_paid:
        invoice.amount_paid = total_paid
        invoice.save(update_fields=["amount_paid"])


@receiver(pre_save, sender=Payment)
@receiver(pre_save, sender=Subscription)
@receiver(pre_save, sender=Refund)
def stash_email_state(sender, instance, raw=False, **kwargs):
    if raw:
        return
    fields = ["status"]
    if sender is Subscription:
        fields += ["end_date", "cancel_at_period_end"]
    instance._email_previous = (
        (sender.objects.filter(pk=instance.pk).values(*fields).first() or {}) if instance.pk else {}
    )


@receiver(post_save, sender=Subscription)
def on_subscription_email(sender, instance, created, raw=False, **kwargs):
    if raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    from services.email_events import subscription_email

    previous = getattr(instance, "_email_previous", {})
    event = None
    if created or previous.get("status") != instance.status:
        event = {
            "ACTIVE": "subscription_active",
            "CANCELLED": "subscription_cancelled",
            "EXPIRED": "subscription_expired",
        }.get(instance.status)
    elif (
        instance.status == Subscription.Status.ACTIVE
        and previous.get("end_date") != instance.end_date
    ):
        event = "subscription_renewed"
    elif instance.cancel_at_period_end and not previous.get("cancel_at_period_end"):
        event = "subscription_cancelling"
    if event:
        subscription_email(instance, event)


@receiver(post_save, sender=Refund)
def on_refund_email(sender, instance, created, raw=False, **kwargs):
    if raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    if created or getattr(instance, "_email_previous", {}).get("status") != instance.status:
        from services.email_events import refund_email

        refund_email(instance)
