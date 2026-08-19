from rest_framework import serializers

from apps.discounts.models import DiscountCampaign, PromoCode


class PromoCodeSerializer(serializers.ModelSerializer):
    times_used = serializers.SerializerMethodField()
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "value",
            "min_order_amount",
            "max_uses",
            "max_uses_per_user",
            "valid_from",
            "valid_until",
            "is_active",
            "times_used",
            "is_valid_now",
            "created_at",
        ]
        read_only_fields = ["id", "times_used", "is_valid_now", "created_at"]

    def get_times_used(self, obj):
        return obj.times_used()

    def get_is_valid_now(self, obj):
        return obj.is_valid_now()

    def validate_code(self, value):
        return value.upper()


class PromoValidateSerializer(serializers.Serializer):
    """Used by PromoValidateView to preview a discount before checkout,
    without creating a PromoUsage row (that only happens on order creation)."""

    code = serializers.CharField()
    order_total = serializers.DecimalField(max_digits=10, decimal_places=0)

    def validate(self, attrs):
        try:
            promo = PromoCode.objects.get(code=attrs["code"].upper())
        except PromoCode.DoesNotExist:
            raise serializers.ValidationError({"code": "Invalid promo code."})

        if not promo.is_valid_now():
            raise serializers.ValidationError({"code": "This promo code is no longer valid."})

        if attrs["order_total"] < promo.min_order_amount:
            raise serializers.ValidationError(
                {"order_total": f"Order must be at least {promo.min_order_amount} to use this code."}
            )

        user = self.context["request"].user
        if promo.usages.filter(user=user).count() >= promo.max_uses_per_user:
            raise serializers.ValidationError({"code": "You've already used this promo code."})

        attrs["promo"] = promo
        return attrs


class DiscountCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCampaign
        fields = [
            "id",
            "name",
            "description",
            "discount_type",
            "value",
            "target_segment",
            "start_date",
            "end_date",
            "is_active",
        ]
        read_only_fields = ["id"]
