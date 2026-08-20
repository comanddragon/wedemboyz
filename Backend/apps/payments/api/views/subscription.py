from django.conf import settings
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.serializers import (
    SubscriptionCheckoutSerializer,
    SubscriptionCreateSerializer,
    SubscriptionSerializer,
)
from apps.payments.models import Payment, Subscription
from core.constants import PaymentGateway, PaymentStatus
from services.pricing import price_for_subscription_plan


class SubscriptionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/subscriptions/

    Unpaginated by design: a customer realistically has a handful of
    subscriptions ever, and the frontend (types/payment.ts, MembershipCard/
    dashboard/subscription page) expects a bare Subscription[] here, not
    the project's standard {count, results, ...} envelope.
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return SubscriptionCreateSerializer if self.request.method == "POST" else SubscriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()
        return Response(SubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)


class SubscriptionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/subscriptions/{id}/"""

    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)


class SubscriptionCheckoutView(APIView):
    """POST /api/v1/subscriptions/{id}/checkout/  body: {"gateway": "STRIPE"|"PAYPAL"|"MTN_MOMO"|"ORANGE_MONEY"}

    Starts payment for a PENDING subscription. Stripe/PayPal redirect flows
    return a URL to send the user to; MTN/Orange return the created Payment
    so the existing mobile-money collection-request flow (same as order
    payments) can take over from there. The subscription only becomes
    ACTIVE once the gateway confirms payment — see webhooks.py and
    apps.payments.tasks.activate_subscription / renew_subscription.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk, user=request.user)
        if subscription.status != Subscription.Status.PENDING:
            raise ValidationError("Only a pending (unpaid) subscription can start checkout.")

        serializer = SubscriptionCheckoutSerializer(
            data=request.data, context={"subscription": subscription}
        )
        serializer.is_valid(raise_exception=True)
        gateway = serializer.validated_data["gateway"]
        self._checkout_data = serializer.validated_data

        if gateway == PaymentGateway.STRIPE:
            return self._checkout_stripe(subscription)
        if gateway == PaymentGateway.PAYPAL:
            return self._checkout_paypal(subscription)
        return self._checkout_mobile_money(subscription, gateway)

    def _checkout_stripe(self, subscription):
        from services.billing import stripe_gateway

        # The Stripe API call happens outside any DB transaction — it's a
        # slow network round-trip and shouldn't hold a row/connection lock.
        session = stripe_gateway.create_checkout_session(
            subscription,
            success_url=f"{settings.FRONTEND_URL}/dashboard?checkout=success&subscription={subscription.pk}",
            cancel_url=f"{settings.FRONTEND_URL}/dashboard?checkout=cancelled&subscription={subscription.pk}",
        )
        with transaction.atomic():
            Payment.objects.create(
                subscription=subscription,
                gateway=PaymentGateway.STRIPE,
                gateway_reference=session.id,
                amount=price_for_subscription_plan(subscription.plan),
                status=PaymentStatus.PENDING,
            )
            subscription.gateway = PaymentGateway.STRIPE
            subscription.save(update_fields=["gateway"])
        return Response({"checkout_url": session.url}, status=status.HTTP_201_CREATED)

    def _checkout_paypal(self, subscription):
        from services.billing import paypal_gateway

        return_url = f"{settings.FRONTEND_URL}/dashboard?checkout=success&subscription={subscription.pk}"
        cancel_url = f"{settings.FRONTEND_URL}/dashboard?checkout=cancelled&subscription={subscription.pk}"

        # Same reasoning as Stripe above — call PayPal first, write second.
        if subscription.is_recurring:
            result = paypal_gateway.create_subscription(subscription, return_url, cancel_url)
            gateway_reference = result["id"]
        else:
            result = paypal_gateway.create_order(subscription, return_url, cancel_url)
            gateway_reference = result["id"]

        with transaction.atomic():
            Payment.objects.create(
                subscription=subscription,
                gateway=PaymentGateway.PAYPAL,
                gateway_reference=gateway_reference,
                amount=price_for_subscription_plan(subscription.plan),
                status=PaymentStatus.PENDING,
            )
            subscription.gateway = PaymentGateway.PAYPAL
            if subscription.is_recurring:
                subscription.external_subscription_id = result["id"]
            subscription.save(update_fields=["gateway", "external_subscription_id"])
        return Response({"approval_url": result["approve_url"]}, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def _checkout_mobile_money(self, subscription, gateway):
        # Mirrors the Stripe/PayPal pattern above: call the gateway first
        # (slow network round-trip, shouldn't hold a row/connection lock),
        # then write the Payment with the reference CamPay gave us. The
        # actual confirmation (customer enters their MoMo/OM PIN) happens
        # after this request returns — CamPayWebhookView flips the Payment
        # to SUCCEEDED/FAILED once that happens.
        from services.billing import campay_gateway

        phone_number = self._checkout_data.get("phone_number") or getattr(
            subscription.user, "phone_number", ""
        )
        if not phone_number:
            raise ValidationError(
                {"phone_number": "A phone number is required to request MTN/Orange Money payment."}
            )

        amount = price_for_subscription_plan(subscription.plan)
        try:
            result = campay_gateway.initiate_collection(
                amount=amount,
                phone_number=phone_number,
                description=f"WEDEMBOYZ Lavomatique — {subscription.get_plan_display()}",
                external_reference=f"subscription-{subscription.pk}",
                user=subscription.user,
            )
        except campay_gateway.CamPayAPIError as exc:
            raise ValidationError({"gateway": str(exc)})

        payment = Payment.objects.create(
            subscription=subscription,
            gateway=gateway,
            gateway_reference=result["reference"],
            amount=amount,
            status=PaymentStatus.PENDING,
        )
        subscription.gateway = gateway
        subscription.save(update_fields=["gateway"])
        from apps.payments.api.serializers import PaymentSerializer

        return Response(
            {**PaymentSerializer(payment).data, "ussd_code": result.get("ussd_code", "")},
            status=status.HTTP_201_CREATED,
        )


class SubscriptionActionView(APIView):
    """POST /api/v1/subscriptions/{id}/pause|resume|cancel/"""

    permission_classes = [permissions.IsAuthenticated]

    # action -> (required current status or None, new status)
    TRANSITIONS = {
        "pause": (Subscription.Status.ACTIVE, Subscription.Status.PAUSED),
        "resume": (Subscription.Status.PAUSED, Subscription.Status.ACTIVE),
        "cancel": (None, Subscription.Status.CANCELLED),
    }

    def post(self, request, pk, action):
        subscription = get_object_or_404(Subscription, pk=pk, user=request.user)

        if action in ("pause", "resume") and subscription.is_recurring:
            raise ValidationError(
                "Monthly auto-billing subscriptions can't be paused/resumed here — cancel instead."
            )

        if action == "cancel":
            return self._cancel(subscription)

        required_status, new_status = self.TRANSITIONS[action]
        if subscription.status == new_status:
            raise ValidationError(f"Subscription is already {new_status}.")
        if required_status and subscription.status != required_status:
            raise ValidationError(f"Subscription must be {required_status} to {action}.")

        subscription.status = new_status
        subscription.save(update_fields=["status"])
        return Response(SubscriptionSerializer(subscription).data)

    def _cancel(self, subscription):
        if subscription.status == Subscription.Status.CANCELLED:
            raise ValidationError("Subscription is already CANCELLED.")

        if subscription.is_recurring and subscription.status == Subscription.Status.ACTIVE:
            if subscription.external_subscription_id:
                self._cancel_on_gateway(subscription)
            # Stop future renewals but let the customer keep what they
            # already paid for through end_date; a webhook or the daily
            # expire_subscriptions sweep flips this to CANCELLED/EXPIRED
            # once that date passes.
            subscription.cancel_at_period_end = True
            subscription.save(update_fields=["cancel_at_period_end"])
            return Response(SubscriptionSerializer(subscription).data)

        subscription.status = Subscription.Status.CANCELLED
        subscription.save(update_fields=["status"])
        return Response(SubscriptionSerializer(subscription).data)

    def _cancel_on_gateway(self, subscription):
        try:
            if subscription.gateway == PaymentGateway.STRIPE:
                from services.billing import stripe_gateway

                stripe_gateway.cancel_subscription(subscription.external_subscription_id, at_period_end=True)
            elif subscription.gateway == PaymentGateway.PAYPAL:
                from services.billing import paypal_gateway

                paypal_gateway.cancel_subscription(subscription.external_subscription_id)
        except Exception:
            # Don't block the customer's cancel request on a flaky gateway
            # call — cancel_at_period_end still stops us from treating it as
            # renewed, and this is logged for ops to reconcile manually.
            import logging

            logging.getLogger(__name__).exception(
                "Failed to cancel gateway-side subscription %s (%s)",
                subscription.external_subscription_id,
                subscription.gateway,
            )
