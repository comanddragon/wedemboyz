from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.users.models import CustomUser, LoyaltyAccount, UserProfile


class LoyaltyAccountSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyAccount
        fields = ["points_balance", "lifetime_points_earned", "tier"]
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    """Combines CustomUser + its nested UserProfile/LoyaltyAccount into one
    read/write shape for GET/PATCH /api/v1/users/me/."""

    avatar = serializers.ImageField(source="profile.avatar", required=False, allow_null=True)
    address_line = serializers.CharField(source="profile.address_line", required=False, allow_blank=True)
    city = serializers.CharField(source="profile.city", required=False)
    date_of_birth = serializers.DateField(source="profile.date_of_birth", required=False, allow_null=True)
    loyalty = LoyaltyAccountSummarySerializer(source="loyalty_account", read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone_number",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_phone_verified",
            "avatar",
            "address_line",
            "city",
            "date_of_birth",
            "loyalty",
        ]
        read_only_fields = ["id", "phone_number", "is_phone_verified"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class PreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["preferred_language"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, user=self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
