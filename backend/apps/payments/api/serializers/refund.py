from django.db.models import Sum
from rest_framework import serializers

from apps.payments.models import Refund
from core.constants import PaymentStatus


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ["id", "payment", "amount", "reason", "status", "processed_at", "processed_by", "created_at"]
        read_only_fields = ["id", "status", "processed_at", "processed_by", "created_at"]


class RefundRequestSerializer(serializers.ModelSerializer):
    """POST /api/v1/refunds/ — a customer requesting a refund on their own
    successful payment. Staff then approve/reject/process it via the
    dedicated action endpoints."""

    class Meta:
        model = Refund
        fields = ["id", "payment", "amount", "reason"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        payment = attrs["payment"]
        user = self.context["request"].user

        if payment.order.user_id != user.id:
            raise serializers.ValidationError("You do not own this payment.")
        if payment.status != PaymentStatus.SUCCEEDED:
            raise serializers.ValidationError("Only successful payments can be refunded.")

        already_refunded = (
            payment.refunds.filter(status__in=[Refund.Status.APPROVED, Refund.Status.PROCESSED]).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )
        if attrs["amount"] > payment.amount - already_refunded:
            raise serializers.ValidationError({"amount": "Amount exceeds the refundable balance on this payment."})

        return attrs
