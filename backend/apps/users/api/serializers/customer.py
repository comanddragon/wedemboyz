from rest_framework import serializers

from apps.users.api.serializers.profile import LoyaltyAccountSummarySerializer
from apps.users.models import CustomUser, UserProfile


class CustomerListSerializer(serializers.ModelSerializer):
    """GET /api/v1/users/customers/ — the customer directory row shape."""

    city = serializers.CharField(source="profile.city", read_only=True, default="")
    orders_count = serializers.IntegerField(read_only=True)
    lifetime_spend = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    loyalty_tier = serializers.CharField(source="loyalty_account.tier", read_only=True, default=None)
    credit_balance = serializers.SerializerMethodField()
    last_order_at = serializers.DateTimeField(read_only=True, allow_null=True)
    source = serializers.CharField(source="profile.source", read_only=True, default="ONLINE")
    is_blocked = serializers.BooleanField(source="profile.is_blocked", read_only=True, default=False)
    tags = serializers.JSONField(source="profile.tags", read_only=True, default=list)

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
            "last_order_at",
            "source",
            "is_blocked",
            "tags",
            "is_walk_in",
            "created_at",
        ]
        read_only_fields = fields

    def get_credit_balance(self, obj):
        account = getattr(obj, "credit_account", None)
        return account.balance if account else 0


class CustomerDetailSerializer(CustomerListSerializer):
    """GET /api/v1/users/customers/{id}/ — full fiche client: profile,
    loyalty, recent order history, and credit ledger."""

    address_line = serializers.CharField(source="profile.address_line", required=False, allow_blank=True, default="")
    loyalty = LoyaltyAccountSummarySerializer(source="loyalty_account", read_only=True)
    recent_orders = serializers.SerializerMethodField()
    recent_credit_transactions = serializers.SerializerMethodField()
    notes = serializers.CharField(source="profile.notes", required=False, allow_blank=True)
    source = serializers.ChoiceField(source="profile.source", choices=UserProfile._meta.get_field("source").choices, required=False)
    tags = serializers.ListField(source="profile.tags", child=serializers.CharField(max_length=40), required=False)
    is_blocked = serializers.BooleanField(source="profile.is_blocked", required=False)
    blocked_reason = serializers.CharField(source="profile.blocked_reason", required=False, allow_blank=True)
    marketing_opt_in = serializers.BooleanField(source="profile.marketing_opt_in", required=False)
    whatsapp_number = serializers.CharField(source="profile.whatsapp_number", required=False, allow_blank=True)
    secondary_phone = serializers.CharField(source="profile.secondary_phone", required=False, allow_blank=True)
    default_pickup_address = serializers.CharField(source="profile.default_pickup_address", required=False, allow_blank=True)

    class Meta(CustomerListSerializer.Meta):
        fields = CustomerListSerializer.Meta.fields + [
            "address_line",
            "loyalty",
            "recent_orders",
            "recent_credit_transactions",
            "notes",
            "blocked_reason",
            "marketing_opt_in",
            "whatsapp_number",
            "secondary_phone",
            "default_pickup_address",
        ]
        read_only_fields = [
            "id", "city", "orders_count", "lifetime_spend", "loyalty_tier",
            "credit_balance", "last_order_at", "created_at", "loyalty",
            "recent_orders", "recent_credit_transactions",
        ]

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        user = CustomUser(**validated_data)
        user.set_unusable_password()
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        instance = super().update(instance, validated_data)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()
        return instance

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
