from datetime import timedelta

from rest_framework import serializers

from apps.payments.models import Subscription
from core.constants import PaymentGateway
from services.pricing import SUBSCRIPTION_PERIOD_DAYS, price_for_subscription_plan

ONE_TIME_GATEWAYS = {
    PaymentGateway.STRIPE,
    PaymentGateway.PAYPAL,
    PaymentGateway.MTN_MOMO,
    PaymentGateway.ORANGE_MONEY,
}


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            "id", "plan", "billing_cycle", "status", "kg_remaining",
            "gateway", "cancel_at_period_end", "start_date", "end_date", "created_at",
        ]
        read_only_fields = fields


class AdminSubscriptionSerializer(SubscriptionSerializer):
    customer_name = serializers.CharField(source="user.get_full_name", read_only=True)
    customer_phone = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta(SubscriptionSerializer.Meta):
        fields = SubscriptionSerializer.Meta.fields + ["user", "customer_name", "customer_phone"]
        read_only_fields = fields


class SubscriptionAdminActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["activate", "renew", "pause", "resume", "cancel", "adjust_kilos"])
    kilos = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=0, required=False)

    def validate(self, attrs):
        if attrs["action"] == "adjust_kilos" and "kilos" not in attrs:
            raise serializers.ValidationError({"kilos": "Kilos are required for this action."})
        return attrs


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/subscriptions/ — creates a PENDING subscription with no
    pickups granted yet and no gateway attached. It only becomes ACTIVE (and
    gets its kg_remaining allowance) once checkout is completed via
    POST /api/v1/subscriptions/{id}/checkout/ and the gateway confirms
    payment — see apps.payments.api.views.subscription.SubscriptionCheckoutView
    and apps.payments.tasks.activate_subscription."""

    class Meta:
        model = Subscription
        fields = ["id", "plan", "billing_cycle", "status", "start_date", "end_date", "created_at"]
        read_only_fields = ["id", "status", "end_date", "created_at"]
        extra_kwargs = {"start_date": {"required": False}}

    def validate(self, attrs):
        if not attrs.get("start_date"):
            from django.utils import timezone

            attrs["start_date"] = timezone.localdate()
        attrs["end_date"] = attrs["start_date"] + timedelta(days=SUBSCRIPTION_PERIOD_DAYS)
        return attrs

    def validate_plan(self, plan):
        # Raises ValueError -> 500 if the plan isn't priced; fail clearly
        # instead, since an unpriced plan is a config bug, not bad input.
        price_for_subscription_plan(plan)
        return plan

    def create(self, validated_data):
        return Subscription.objects.create(
            user=self.context["request"].user,
            plan=validated_data["plan"],
            billing_cycle=validated_data.get("billing_cycle", Subscription.BillingCycle.ONE_TIME),
            status=Subscription.Status.PENDING,
            kg_remaining=0,
            start_date=validated_data["start_date"],
            end_date=validated_data["end_date"],
        )


class SubscriptionCheckoutSerializer(serializers.Serializer):
    """POST /api/v1/subscriptions/{id}/checkout/ — starts payment for a
    PENDING subscription against the chosen gateway. Recurring
    (billing_cycle=MONTHLY) subscriptions can only be billed through
    gateways that support an auto-renewing mandate (Stripe/PayPal); MTN and
    Orange Mobile Money are one-time-only here."""

    gateway = serializers.ChoiceField(choices=PaymentGateway.choices)
    # Required for MTN_MOMO/ORANGE_MONEY (CamPay pushes the USSD/PIN prompt
    # to this number); ignored for Stripe/PayPal. Falls back to the user's
    # account phone_number if omitted.
    phone_number = serializers.CharField(required=False, allow_blank=True)

    def validate_gateway(self, gateway):
        subscription = self.context["subscription"]
        if subscription.is_recurring and gateway not in Subscription.RECURRING_CAPABLE_GATEWAYS:
            raise serializers.ValidationError(
                "Monthly auto-billing is only available with Stripe or PayPal. "
                "Choose one of those, or create a one-time subscription instead."
            )
        if gateway not in ONE_TIME_GATEWAYS:
            raise serializers.ValidationError("Unsupported gateway for subscription checkout.")
        return gateway
