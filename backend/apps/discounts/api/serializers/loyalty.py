from rest_framework import serializers

from apps.discounts.models import (
    AmbassadorProfile,
    BadgeAccount,
    LoyaltyProgramSettings,
    LoyaltyReward,
    LoyaltyRewardGrant,
    LoyaltyRule,
    LoyaltyTierConfig,
    LoyaltyTransaction,
    PromoCode,
    StampCardConfig,
)
from apps.users.models import LoyaltyAccount
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import re
import secrets

User = get_user_model()


class StampCardConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = StampCardConfig
        fields = ["id", "points_per_stamp", "stamps_required", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    badge_program = serializers.SerializerMethodField()
    programmes = serializers.SerializerMethodField()
    rewards = serializers.SerializerMethodField()
    reward_grants = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyAccount
        fields = [
            "points_balance", "lifetime_points_earned", "tier", "badge_program",
            "programmes", "rewards", "reward_grants",
        ]
        read_only_fields = fields

    def get_badge_program(self, obj):
        badge, _ = BadgeAccount.objects.get_or_create(user=obj.user)
        return BadgeAccountSerializer(badge).data

    def get_programmes(self, obj):
        return LoyaltyProgramSettingsSerializer(LoyaltyProgramSettings.get_current()).data

    def get_rewards(self, obj):
        return LoyaltyRewardSerializer(
            LoyaltyReward.objects.filter(is_active=True), many=True
        ).data

    def get_reward_grants(self, obj):
        return LoyaltyRewardGrantSerializer(
            LoyaltyRewardGrant.objects.filter(user=obj.user).select_related("reward")[:20],
            many=True,
        ).data


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ["id", "points", "transaction_type", "order", "note", "created_at"]
        read_only_fields = fields


class RedeemPointsSerializer(serializers.Serializer):
    points = serializers.IntegerField(min_value=1)
    note = serializers.CharField(required=False, allow_blank=True)


class LoyaltyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyRule
        fields = ["id", "name", "points_per_currency_unit", "min_spend", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class LoyaltyTierConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTierConfig
        fields = ["id", "tier", "minimum_lifetime_points", "discount_percent", "bonus_points_percent", "priority_service", "is_active"]
        read_only_fields = ["id", "tier"]


class LoyaltyAdjustmentSerializer(serializers.Serializer):
    points = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)

    def validate_points(self, value):
        if value == 0:
            raise serializers.ValidationError("Adjustment cannot be zero.")
        return value


class LoyaltyProgramSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyProgramSettings
        fields = ["credit_points_enabled", "badge_tiers_enabled", "updated_at"]
        read_only_fields = ["updated_at"]


class LoyaltyRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyReward
        fields = ["id", "name", "description", "track", "points_cost", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        track = attrs.get("track", getattr(self.instance, "track", None))
        cost = attrs.get("points_cost", getattr(self.instance, "points_cost", 0))
        if track == LoyaltyReward.Track.CREDIT and cost <= 0:
            raise serializers.ValidationError({"points_cost": "Credit rewards need a positive points cost."})
        return attrs


class LoyaltyRewardGrantSerializer(serializers.ModelSerializer):
    reward = LoyaltyRewardSerializer(read_only=True)

    class Meta:
        model = LoyaltyRewardGrant
        fields = ["id", "reward", "order", "is_redeemed", "redeemed_at", "created_at"]
        read_only_fields = fields


class BadgeAccountSerializer(serializers.ModelSerializer):
    badges_required = serializers.IntegerField(default=10, read_only=True)

    class Meta:
        model = BadgeAccount
        fields = ["tier", "badges", "badges_required", "lifetime_badges", "completed_cards"]
        read_only_fields = fields


class RewardRedeemSerializer(serializers.Serializer):
    reward_id = serializers.IntegerField(min_value=1)


class AmbassadorProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    promo_code = serializers.CharField(source="promo_code.code", read_only=True)

    class Meta:
        model = AmbassadorProfile
        fields = [
            "id", "user_id", "name", "phone_number", "promo_code",
            "credit_balance", "lifetime_credits", "is_active", "created_at",
        ]
        read_only_fields = fields

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.phone_number


class AmbassadorCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)

    def validate_user_id(self, value):
        try:
            user = User.objects.get(pk=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("Choose an active customer account.")
        if AmbassadorProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("This account is already an ambassador.")
        self.user = user
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = self.user
        base = re.sub(r"[^A-Z0-9]", "", (user.first_name or "AMB").upper())[:10] or "AMB"
        while True:
            code = f"{base}-{secrets.token_hex(2).upper()}"
            if not PromoCode.objects.filter(code=code).exists():
                break
        now = timezone.now()
        promo = PromoCode.objects.create(
            code=code,
            description=f"Ambassador code for {user.get_full_name() or user.phone_number}",
            discount_type="FIXED",
            value=0,
            max_uses=None,
            max_uses_per_user=1,
            valid_from=now,
            valid_until=now + timedelta(days=3650),
            is_active=True,
        )
        return AmbassadorProfile.objects.create(user=user, promo_code=promo)
