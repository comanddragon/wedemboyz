from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.users.models import CustomUser, LoyaltyAccount, UserProfile
from apps.staff.permissions import get_staff_permissions, get_staff_role


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
    # Where the shop reaches the customer. For guests (placeholder account
    # number) this is the only number SMS/WhatsApp updates go to.
    contact_phone = serializers.RegexField(
        r"^\+?[\d ]{9,18}$", source="profile.secondary_phone", required=False, allow_blank=True,
        error_messages={"invalid": "Enter a valid phone number."},
    )
    loyalty = LoyaltyAccountSummarySerializer(source="loyalty_account", read_only=True)
    staff_role = serializers.SerializerMethodField()
    staff_permissions = serializers.SerializerMethodField()
    staff_access_active = serializers.SerializerMethodField()
    is_ambassador = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "phone_number",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_superuser",
            "is_guest",
            "staff_role",
            "staff_permissions",
            "staff_access_active",
            "is_ambassador",
            "is_phone_verified",
            "avatar",
            "address_line",
            "city",
            "date_of_birth",
            "contact_phone",
            "loyalty",
        ]
        read_only_fields = [
            "id", "phone_number", "is_phone_verified", "is_staff",
            "is_superuser", "is_guest", "staff_role", "staff_permissions", "staff_access_active", "is_ambassador",
        ]

    def get_staff_role(self, obj):
        return get_staff_role(obj)

    def get_staff_permissions(self, obj):
        return get_staff_permissions(obj)

    def get_staff_access_active(self, obj):
        return get_staff_role(obj) is not None

    def get_is_ambassador(self, obj):
        return hasattr(obj, "ambassador_profile") and obj.ambassador_profile.is_active

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
