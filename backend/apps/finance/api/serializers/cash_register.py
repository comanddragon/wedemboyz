from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from apps.finance.models import CashRegisterDay
from apps.payments.models import Payment, Refund
from core.constants import PaymentStatus


class CashRegisterDaySerializer(serializers.ModelSerializer):
    received_by_method = serializers.SerializerMethodField()
    refunded_by_method = serializers.SerializerMethodField()
    expected_cash = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()

    class Meta:
        model = CashRegisterDay
        fields = [
            "id", "date", "opening_float", "cash_expenses", "counted_cash",
            "status", "notes", "opened_by", "closed_by", "closed_at",
            "received_by_method", "refunded_by_method", "expected_cash",
            "variance", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "opened_by", "closed_by", "closed_at",
            "received_by_method", "refunded_by_method", "expected_cash",
            "variance", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        for field in ("opening_float", "cash_expenses", "counted_cash"):
            value = attrs.get(field)
            if value is not None and value < 0:
                raise serializers.ValidationError({field: "Amount cannot be negative."})
        return attrs

    def _totals(self, obj, model, date_field, method_field):
        rows = model.objects.filter(
            **{f"{date_field}__date": obj.date},
        )
        if model is Payment:
            rows = rows.filter(status=PaymentStatus.SUCCEEDED, voided_at__isnull=True)
        else:
            rows = rows.filter(status="PROCESSED")
        return {
            row[method_field]: row["total"] or 0
            for row in rows.values(method_field).annotate(total=Sum("amount"))
        }

    def get_received_by_method(self, obj):
        return self._totals(obj, Payment, "received_at", "payment_method_type")

    def get_refunded_by_method(self, obj):
        return self._totals(obj, Refund, "processed_at", "payment__payment_method_type")

    def get_expected_cash(self, obj):
        received = Decimal(str(self.get_received_by_method(obj).get("CASH", 0)))
        refunded = Decimal(str(self.get_refunded_by_method(obj).get("CASH", 0)))
        return obj.opening_float + received - refunded - obj.cash_expenses

    def get_variance(self, obj):
        if obj.counted_cash is None:
            return None
        return obj.counted_cash - self.get_expected_cash(obj)

    def create(self, validated_data):
        validated_data["opened_by"] = self.context["request"].user
        return super().create(validated_data)


class CashRegisterCloseSerializer(serializers.Serializer):
    counted_cash = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=0)
    cash_expenses = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=0, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
