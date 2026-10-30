from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.orders.models import Order
from apps.payments.models import Payment, PaymentMethod
from core.constants import PaymentMethodType, PaymentStatus

User = get_user_model()


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            "id",
            "gateway",
            "display_label",
            "phone_number",
            "provider_token",
            "is_default",
            "created_at",
        ]
        # phone_number never needs to round-trip back to the client — the
        # frontend only needs id/gateway/display_label to render the
        # picker; the actual number is resolved server-side at payment
        # time (see PaymentInitiateSerializer.create). display_label is
        # computed (see generate_display_label) from gateway + phone_number
        # so it can never say something other than what's actually stored.
        extra_kwargs = {
            "provider_token": {"write_only": True},
            "phone_number": {"write_only": True},
        }
        read_only_fields = ["id", "display_label", "created_at"]

    def validate(self, attrs):
        raise serializers.ValidationError(
            "Choose pay on pickup or pay on delivery when placing your order."
        )


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
            "payment_method_type",
            "reference",
            "received_by",
            "received_at",
            "payer_name",
            "payer_phone",
            "notes",
            "tendered_amount",
            "change_given",
            "voided_at",
            "voided_by",
            "void_reason",
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


class ManualPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=1)
    payment_method_type = serializers.ChoiceField(
        choices=[PaymentMethodType.PAY_AT_PICKUP, PaymentMethodType.PAY_AFTER_DELIVERY]
    )
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    received_at = serializers.DateTimeField(required=False)
    payer_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    payer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    tendered_amount = serializers.DecimalField(
        max_digits=10, decimal_places=0, min_value=0, required=False, allow_null=True
    )
    allow_overpayment = serializers.BooleanField(default=False, write_only=True)

    def validate(self, attrs):
        order = self.context["order"]
        if order.status == "CANCELLED" or order.balance_due <= 0:
            raise serializers.ValidationError("This order does not accept payments.")
        if attrs["amount"] > order.balance_due and not attrs["allow_overpayment"]:
            raise serializers.ValidationError(
                {"amount": "Amount exceeds the balance due. Allow overpayment to continue."}
            )
        tendered = attrs.get("tendered_amount")
        if attrs["payment_method_type"] in {
            PaymentMethodType.PAY_AT_PICKUP,
            PaymentMethodType.PAY_AFTER_DELIVERY,
        }:
            if tendered is not None and tendered < attrs["amount"]:
                raise serializers.ValidationError(
                    {"tendered_amount": "Tendered cash cannot be less than the payment."}
                )
        elif tendered is not None:
            raise serializers.ValidationError(
                {"tendered_amount": "Tendered amount is only used for cash payments."}
            )
        return attrs


class PaymentInitiateSerializer(serializers.ModelSerializer):
    """Reject legacy online checkout; orders are paid on pickup or delivery."""

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

    def validate(self, attrs):
        raise serializers.ValidationError(
            "Online payments are unavailable. Pay on pickup or pay on delivery."
        )

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
