from datetime import timedelta

from config.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_webhook(self, gateway: str, payload: dict):
    """
    Idempotent webhook processor — safe to run twice for the same event
    (webhook retries/duplicate deliveries are a fact of life). Handles the
    "this Payment we already created just succeeded/failed" case for both
    order payments and the *first* payment on a subscription. Recurring
    renewal charges (which have no pre-existing Payment row) go through
    renew_subscription instead — see webhooks.py.
    """
    from apps.payments.models import Payment
    from core.constants import PaymentStatus

    try:
        reference = payload.get("reference") or payload.get("id")
        if not reference:
            return

        payment = Payment.objects.filter(
            gateway=gateway.upper(), gateway_reference=reference
        ).first()
        if payment is None:
            return

        new_status = payload.get("status")
        if new_status and payment.status != new_status:
            payment.status = new_status
            update_fields = ["status"]
            if new_status == PaymentStatus.SUCCEEDED:
                from django.utils import timezone

                payment.paid_at = timezone.now()
                update_fields.append("paid_at")
            payment.save(update_fields=update_fields)

        # Stripe only learns the "sub_..." id once checkout completes, for
        # subscription-mode Checkout Sessions — stash it on our row now.
        external_subscription_id = payload.get("subscription_external_id")
        if external_subscription_id and payment.subscription_id and not payment.subscription.external_subscription_id:
            payment.subscription.external_subscription_id = external_subscription_id
            payment.subscription.save(update_fields=["external_subscription_id"])
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def activate_subscription(self, payment_id: int):
    """First activation of a subscription after its initial payment
    succeeds (one-time plan, or the first period of a recurring plan)."""
    from django.utils import timezone

    from apps.payments.models import Payment, Subscription
    from services.pricing import SUBSCRIPTION_PERIOD_DAYS, kg_allowance_for_plan

    try:
        payment = Payment.objects.select_related("subscription").get(pk=payment_id)
        subscription = payment.subscription
        if subscription is None or subscription.status != Subscription.Status.PENDING:
            return  # already activated, or not a subscription payment — nothing to do

        today = timezone.localdate()
        subscription.status = Subscription.Status.ACTIVE
        subscription.start_date = today
        subscription.end_date = today + timedelta(days=SUBSCRIPTION_PERIOD_DAYS)
        subscription.kg_remaining = kg_allowance_for_plan(subscription.plan)
        subscription.save(update_fields=["status", "start_date", "end_date", "kg_remaining"])
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def renew_subscription(self, gateway: str, external_subscription_id: str, gateway_reference: str):
    """A recurring subscription's periodic charge succeeded gateway-side
    (Stripe invoice.paid / PayPal PAYMENT.SALE.COMPLETED). There's no
    pre-existing Payment row for this charge — the gateway initiated it on
    its own schedule — so this both records it and extends the period."""
    from django.db import transaction
    from django.utils import timezone

    from apps.payments.models import Payment, Subscription
    from core.constants import PaymentStatus
    from services.pricing import SUBSCRIPTION_PERIOD_DAYS, kg_allowance_for_plan, price_for_subscription_plan

    try:
        with transaction.atomic():
            subscription = Subscription.objects.select_for_update().filter(
                gateway=gateway.upper(), external_subscription_id=external_subscription_id
            ).first()
            if subscription is None:
                return

            if subscription.cancel_at_period_end:
                # We already told the gateway to stop renewing; a stray renewal
                # event landing after that is a reconciliation issue for ops,
                # not something we should silently extend access for.
                import logging

                logging.getLogger(__name__).warning(
                    "Renewal event for subscription %s ignored: cancel_at_period_end is set.",
                    subscription.pk,
                )
                return

            if Payment.objects.filter(gateway=gateway.upper(), gateway_reference=gateway_reference).exists():
                return  # duplicate webhook delivery for a renewal we already recorded

            today = timezone.localdate()
            Payment.objects.create(
                subscription=subscription,
                gateway=gateway.upper(),
                gateway_reference=gateway_reference,
                amount=price_for_subscription_plan(subscription.plan),
                status=PaymentStatus.SUCCEEDED,
                paid_at=timezone.now(),
            )

            subscription.status = Subscription.Status.ACTIVE
            subscription.end_date = max(subscription.end_date, today) + timedelta(days=SUBSCRIPTION_PERIOD_DAYS)
            subscription.kg_remaining = kg_allowance_for_plan(subscription.plan)
            subscription.save(update_fields=["status", "end_date", "kg_remaining"])
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def mark_subscription_cancelled(self, gateway: str, external_subscription_id: str, *, expired: bool = False):
    """Gateway told us the recurring mandate is gone (Stripe
    customer.subscription.deleted / PayPal BILLING.SUBSCRIPTION.CANCELLED or
    .EXPIRED) — reflect that here if we haven't already."""
    from apps.payments.models import Subscription

    try:
        subscription = Subscription.objects.filter(
            gateway=gateway.upper(), external_subscription_id=external_subscription_id
        ).first()
        if subscription is None or subscription.status in (
            Subscription.Status.CANCELLED,
            Subscription.Status.EXPIRED,
        ):
            return

        subscription.status = Subscription.Status.EXPIRED if expired else Subscription.Status.CANCELLED
        subscription.save(update_fields=["status"])
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task
def expire_subscriptions():
    """Daily sweep (see apps.payments.management.commands.setup_subscription_schedule):
    flips ACTIVE subscriptions whose end_date has passed to EXPIRED. This is
    the only path to EXPIRED for ONE_TIME plans (nothing else watches their
    end_date); for MONTHLY plans it's a safety net for the case where a
    cancel_at_period_end subscription's final period lapses without the
    gateway sending an explicit cancellation event."""
    from django.utils import timezone

    from apps.payments.models import Subscription

    Subscription.objects.filter(
        status=Subscription.Status.ACTIVE, end_date__lt=timezone.localdate()
    ).update(status=Subscription.Status.EXPIRED)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_receipt_email(self, payment_id: int):
    from django.core.mail import send_mail

    from apps.payments.models import Payment
    from services import sms

    try:
        payment = Payment.objects.select_related("order__user", "subscription__user").get(pk=payment_id)
        user = payment.order.user if payment.order_id else payment.subscription.user
        label = f"Order #{payment.order_id}" if payment.order_id else f"Subscription #{payment.subscription_id}"

        sms.send_sms(user.phone_number, sms.payment_received_message(payment))

        if user.email:
            send_mail(
                subject=f"Receipt — {label}",
                message=(
                    f"Thanks for your payment of {payment.amount} {payment.currency} for {label}."
                ),
                from_email=None,
                recipient_list=[user.email],
                fail_silently=True,
            )
    except Exception as exc:
        raise self.retry(exc=exc)
