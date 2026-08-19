import stripe
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.tasks import mark_subscription_cancelled, process_webhook, renew_subscription
from core.tasks_utils import safe_delay


def _map_stripe_event_to_status(event_type: str) -> str:
    from core.constants import PaymentStatus

    return {
        "payment_intent.succeeded": PaymentStatus.SUCCEEDED,
        "payment_intent.payment_failed": PaymentStatus.FAILED,
        "checkout.session.completed": PaymentStatus.SUCCEEDED,
    }.get(event_type, "")


class StripeWebhookView(APIView):
    """POST /api/v1/webhooks/stripe/ — no JWT; identity is established via
    the Stripe-Signature header instead."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(request.body, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        data_object = event["data"]["object"]

        if event_type in ("payment_intent.succeeded", "payment_intent.payment_failed"):
            new_status = _map_stripe_event_to_status(event_type)
            # Always return 200 to Stripe once the signature checks out — if
            # the broker is down, Stripe will otherwise retry this same event
            # for hours; safe_delay logs and drops rather than raising, since
            # a lost enqueue here would otherwise surface as a webhook 500 the
            # gateway just retries.
            safe_delay(process_webhook, "STRIPE", {"reference": data_object.get("id"), "status": new_status})

        elif event_type == "checkout.session.completed":
            # The success signal for both one-time and subscription-mode
            # Checkout Sessions — data_object.id is the session id we stored
            # as gateway_reference at checkout time.
            payload = {"reference": data_object.get("id"), "status": _map_stripe_event_to_status(event_type)}
            if data_object.get("mode") == "subscription" and data_object.get("subscription"):
                payload["subscription_external_id"] = data_object["subscription"]
            safe_delay(process_webhook, "STRIPE", payload)

        elif event_type == "invoice.paid":
            # A recurring renewal charge, billed by Stripe on its own
            # schedule — not tied to a Payment row we already created.
            subscription_id = data_object.get("subscription")
            if subscription_id:
                safe_delay(renew_subscription, "STRIPE", subscription_id, data_object.get("id"))

        elif event_type == "customer.subscription.deleted":
            subscription_id = data_object.get("id")
            if subscription_id:
                safe_delay(mark_subscription_cancelled, "STRIPE", subscription_id)

        # invoice.payment_failed is intentionally not actioned here — Stripe
        # retries the charge per its own Smart Retries schedule and only
        # fires customer.subscription.deleted once it gives up, which we do
        # handle above. Dunning emails on the failed attempt are a possible
        # follow-up, not required for the subscription to keep working.

        return Response(status=status.HTTP_200_OK)


class PayPalWebhookView(APIView):
    """POST /api/v1/webhooks/paypal/ — verified via PayPal's
    verify-webhook-signature API (no shared-secret header scheme like
    Stripe's)."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from services.billing import paypal_gateway

        event = request.data
        verified = paypal_gateway.verify_webhook_signature(request.headers, request.body, event)
        if not verified:
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get("event_type", "")
        resource = event.get("resource", {})

        if event_type == "CHECKOUT.ORDER.APPROVED":
            # One-time (ONE_TIME) order — capture it now that the buyer approved.
            order_id = resource.get("id")
            if order_id:
                captured = paypal_gateway.capture_order(order_id)
                if captured.get("status") == "COMPLETED":
                    safe_delay(process_webhook, "PAYPAL", {"reference": order_id, "status": "SUCCEEDED"})

        elif event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
            # First activation of a MONTHLY plan.
            subscription_id = resource.get("id")
            if subscription_id:
                safe_delay(process_webhook, "PAYPAL", {"reference": subscription_id, "status": "SUCCEEDED"})

        elif event_type == "PAYMENT.SALE.COMPLETED":
            # A recurring renewal charge against an existing PayPal subscription.
            subscription_id = resource.get("billing_agreement_id")
            sale_id = resource.get("id")
            if subscription_id and sale_id:
                safe_delay(renew_subscription, "PAYPAL", subscription_id, sale_id)

        elif event_type in ("BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.EXPIRED"):
            subscription_id = resource.get("id")
            if subscription_id:
                safe_delay(
                    mark_subscription_cancelled,
                    "PAYPAL",
                    subscription_id,
                    expired=event_type.endswith("EXPIRED"),
                )

        # BILLING.SUBSCRIPTION.PAYMENT.FAILED: same reasoning as Stripe's
        # invoice.payment_failed above — PayPal retries on its own schedule
        # and eventually fires SUSPENDED/CANCELLED, which isn't separately
        # handled here but would need the same treatment as CANCELLED above
        # if/when PayPal's dunning flow is wired up.

        return Response(status=status.HTTP_200_OK)


class CamPayWebhookView(APIView):
    """GET or POST /api/v1/webhooks/campay/ — CamPay's single notification
    URL (configured once in your CamPay dashboard) for both MTN Mobile
    Money and Orange Money collections. Verified via CAMPAY_WEBHOOK_KEY if
    configured (see services.billing.campay_gateway.verify_webhook_signature).

    CamPay delivers this as a GET with the payload appended as query
    params on some apps/environments (observed in DEV sandbox testing)
    rather than a POST with a JSON body — both are handled identically
    here since the field names are the same either way.

    CamPay's payload doesn't tell us which of our two gateway choices
    (MTN_MOMO/ORANGE_MONEY) a reference belongs to by field name alone — we
    look the Payment up by gateway_reference across both, since a CamPay
    `reference` is globally unique regardless of operator.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _handle(self, request):
        from services.billing import campay_gateway

        # request.data is empty for a plain GET — fall back to query params
        # so both delivery styles land in the same dict-like payload.
        payload = request.data if request.data else request.query_params
        signature = request.META.get("HTTP_X_SIGNATURE", "") or payload.get("signature", "")

        if not campay_gateway.verify_webhook_signature(payload, signature):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        reference = payload.get("reference")
        if not reference:
            return Response(status=status.HTTP_200_OK)

        new_status = campay_gateway.parse_webhook_status(payload)
        gateway = campay_gateway.gateway_for_operator(payload.get("operator", ""))

        from apps.payments.models import Payment

        payment = Payment.objects.filter(
            gateway__in=["MTN_MOMO", "ORANGE_MONEY"], gateway_reference=reference
        ).first()
        resolved_gateway = payment.gateway if payment else (gateway or "MTN_MOMO")

        safe_delay(process_webhook, resolved_gateway, {"reference": reference, "status": new_status})

        return Response(status=status.HTTP_200_OK)

    def get(self, request):
        return self._handle(request)

    def post(self, request):
        return self._handle(request)


class MoMoWebhookView(APIView):
    """GET/POST /api/v1/webhooks/mtn-momo/ — deprecated alias for
    CamPayWebhookView, kept only in case it's still configured somewhere as
    a notification URL. Point new setups at /api/v1/webhooks/campay/."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return CamPayWebhookView()._handle(request)

    def post(self, request):
        return CamPayWebhookView()._handle(request)


class OrangeMoneyWebhookView(APIView):
    """GET/POST /api/v1/webhooks/orange-money/ — deprecated alias, see
    MoMoWebhookView."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return CamPayWebhookView()._handle(request)

    def post(self, request):
        return CamPayWebhookView()._handle(request)
