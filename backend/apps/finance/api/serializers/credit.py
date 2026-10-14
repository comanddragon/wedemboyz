from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.finance.models import CreditAccount, CreditTransaction

User = get_user_model()


class CreditCustomerSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number"]
        read_only_fields = fields


class CreditTransactionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()

    class Meta:
        model = CreditTransaction
        fields = [
            "id",
            "transaction_type",
            "amount",
            "order",
            "note",
            "created_by",
            "created_at",
        ]
        read_only_fields = fields


class CreditAccountSerializer(serializers.ModelSerializer):
    """GET /api/v1/finance/credit-accounts/ — the 'clients à crédit' list."""

    user = CreditCustomerSummarySerializer(read_only=True)
    days_since_last_activity = serializers.SerializerMethodField()

    class Meta:
        model = CreditAccount
        fields = ["id", "user", "balance", "credit_limit", "days_since_last_activity", "updated_at"]
        read_only_fields = fields

    def get_days_since_last_activity(self, obj):
        from django.utils import timezone

        last = obj.transactions.first()
        if not last:
            return None
        return (timezone.now() - last.created_at).days


class CreditAccountDetailSerializer(CreditAccountSerializer):
    transactions = CreditTransactionSerializer(many=True, read_only=True)

    class Meta(CreditAccountSerializer.Meta):
        fields = CreditAccountSerializer.Meta.fields + ["transactions"]


class CreditTransactionInputSerializer(serializers.Serializer):
    """Shared shape for both the charge and pay endpoints."""

    amount = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=1)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    order_id = serializers.IntegerField(required=False, allow_null=True, default=None)
