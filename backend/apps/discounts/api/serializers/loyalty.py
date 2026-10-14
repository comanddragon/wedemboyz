from rest_framework import serializers

from apps.discounts.models import LoyaltyTransaction, StampCardConfig
from apps.users.models import LoyaltyAccount
from services.loyalty import stamp_card_progress


class StampCardConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StampCardConfig
        fields = ["id", "points_per_stamp", "stamps_required", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    stamp_card = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyAccount
        fields = ["points_balance", "lifetime_points_earned", "tier", "stamp_card"]
        read_only_fields = fields

    def get_stamp_card(self, obj):
        return stamp_card_progress(obj)


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ["id", "points", "transaction_type", "order", "note", "created_at"]
        read_only_fields = fields


class RedeemPointsSerializer(serializers.Serializer):
    points = serializers.IntegerField(min_value=1)
    note = serializers.CharField(required=False, allow_blank=True)
