from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.orders.models import Order
from apps.payments.models import Payment, PaymentMethod
from core.constants import PaymentGateway, PaymentStatus
User = get_user_model()

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "gateway", "display_label", "provider_token", "is_default", "created_at"]
        extra_kwargs = {"provider_token": {"write_only": True}}
        read_only_fields = ["id", "created_at"]

class OrderCustomerSerializer(serializers.ModelSerializer):
    """Nested summary of who placed the order — mirrors
    types/order.ts::OrderCustomerSummary on the frontend. Kept intentionally
    small (no phone/email) since it renders in admin list/detail views."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number"]
        read_only_fields = fields

class PaymentSerializer(serializers.ModelSerializer):
    method = PaymentMethodSerializer(read_only=True)
    customer = serializers.SerializerMethodField()
    ussd_code = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "subscription",
            "method",
            "customer",
            "gateway",
            "gateway_reference",
            "amount",
            "currency",
            "status",
            "paid_at",
            "failure_reason",
            "ussd_code",
            "created_at",
        ]
        read_only_fields = fields

    def get_customer(self, payment):
        user = payment.order.user if payment.order_id else payment.subscription.user
        return OrderCustomerSerializer(user).data

    def get_ussd_code(self, payment):
        # Only set (transiently, not persisted) right after CamPay
        # initiation — see PaymentInitiateSerializer.create().
        return getattr(payment, "ussd_code", "")


class PaymentInitiateSerializer(serializers.ModelSerializer):
    """POST /api/v1/payments/ — creates a PENDING Payment row for an order.
    For STRIPE/PAYPAL, the actual charge/redirect happens client-side
    against the chosen gateway's SDK; the gateway's webhook (see
    api/views/webhooks.py) is what ultimately flips this to
    SUCCEEDED/FAILED. For MTN_MOMO/ORANGE_MONEY there's no client SDK — this
    calls CamPay server-side to push a USSD/PIN prompt to the customer's
    phone (see services.billing.campay_gateway), and CamPayWebhookView
    confirms success the same way.

    Subscriptions don't use this serializer — they have their own checkout
    flow (see apps.payments.api.views.subscription.SubscriptionCheckoutView)
    since recurring billing needs gateway-side setup (a Stripe Checkout
    Session / PayPal Billing Subscription) that a bare PENDING Payment row
    can't represent on its own.
    """

    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    method = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.all(), required=False, allow_null=True
    )
    # Only used for MTN_MOMO/ORANGE_MONEY — falls back to the user's account
    # phone_number if omitted. Ignored (but harmless) for other gateways.
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Payment
        fields = ["id", "order", "method", "gateway", "amount", "currency", "phone_number"]
        read_only_fields = ["id", "amount", "currency"]

    def validate_order(self, order):
        user = self.context["request"].user
        if order.user_id != user.id:
            raise serializers.ValidationError("You do not own this order.")
        if order.payments.filter(status=PaymentStatus.SUCCEEDED).exists():
            raise serializers.ValidationError("This order has already been paid.")
        return order

    def validate_method(self, method):
        if method is not None and method.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Invalid payment method.")
        return method

    def create(self, validated_data):
        order = validated_data["order"]
        gateway = validated_data["gateway"]
        phone_number = validated_data.pop("phone_number", "")

        gateway_reference = ""
        ussd_code = ""
        if gateway in (PaymentGateway.MTN_MOMO, PaymentGateway.ORANGE_MONEY):
            from services.billing import campay_gateway

            phone_number = phone_number or getattr(order.user, "phone_number", "")
            if not phone_number:
                raise serializers.ValidationError(
                    {"phone_number": "A phone number is required to request MTN/Orange Money payment."}
                )
            try:
                result = campay_gateway.initiate_collection(
                    amount=order.total_amount,
                    phone_number=phone_number,
                    description=f"WEDEMBOYZ Lavomatique — Order #{order.pk}",
                    external_reference=f"order-{order.pk}",
                )
            except campay_gateway.CamPayAPIError as exc:
                raise serializers.ValidationError({"gateway": str(exc)})
            gateway_reference = result["reference"]
            ussd_code = result.get("ussd_code", "")

        payment = Payment.objects.create(
            order=order,
            method=validated_data.get("method"),
            gateway=gateway,
            gateway_reference=gateway_reference,
            amount=order.total_amount,
            currency=order.currency,
            status=PaymentStatus.PENDING,
        )
        payment.ussd_code = ussd_code  # transient attr for the response only, not persisted
        return payment
