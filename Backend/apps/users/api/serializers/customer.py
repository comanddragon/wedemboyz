from rest_framework import serializers

from apps.users.api.serializers.profile import LoyaltyAccountSummarySerializer
from apps.users.models import CustomUser


class CustomerListSerializer(serializers.ModelSerializer):
    """GET /api/v1/users/customers/ — the customer directory row shape."""

    city = serializers.CharField(source="profile.city", read_only=True, default="")
    orders_count = serializers.IntegerField(read_only=True)
    lifetime_spend = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    loyalty_tier = serializers.CharField(source="loyalty_account.tier", read_only=True, default=None)
    credit_balance = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone_number",
            "email",
            "city",
            "is_active",
            "orders_count",
            "lifetime_spend",
            "loyalty_tier",
            "credit_balance",
            "created_at",
        ]
        read_only_fields = fields

    def get_credit_balance(self, obj):
        account = getattr(obj, "credit_account", None)
        return account.balance if account else 0


class CustomerDetailSerializer(CustomerListSerializer):
    """GET /api/v1/users/customers/{id}/ — full fiche client: profile,
    loyalty, recent order history, and credit ledger."""

    address_line = serializers.CharField(source="profile.address_line", read_only=True, default="")
    loyalty = LoyaltyAccountSummarySerializer(source="loyalty_account", read_only=True)
    recent_orders = serializers.SerializerMethodField()
    recent_credit_transactions = serializers.SerializerMethodField()

    class Meta(CustomerListSerializer.Meta):
        fields = CustomerListSerializer.Meta.fields + [
            "address_line",
            "loyalty",
            "recent_orders",
            "recent_credit_transactions",
        ]

    def get_recent_orders(self, obj):
        from apps.orders.api.serializers import OrderListSerializer

        orders = obj.orders.all()[:10]
        return OrderListSerializer(orders, many=True).data

    def get_recent_credit_transactions(self, obj):
        from apps.finance.api.serializers import CreditTransactionSerializer

        account = getattr(obj, "credit_account", None)
        if not account:
            return []
        return CreditTransactionSerializer(account.transactions.all()[:10], many=True).data
