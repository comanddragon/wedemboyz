from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.staff.permissions import get_staff_permissions, get_staff_role
from apps.users.models import CustomUser
from core.utils import format_phone_number


def _avatar_payload(user):
    profile = getattr(user, "profile", None)
    return {
        "avatar": profile.avatar.url if profile and profile.avatar else None,
        "use_profile_photo": bool(profile and profile.use_profile_photo),
    }


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8, label="Confirm password")

    class Meta:
        model = CustomUser
        fields = ["phone_number", "first_name", "last_name", "email", "password", "password2"]

    def validate_phone_number(self, value):
        normalised = format_phone_number(value)
        if CustomUser.objects.filter(phone_number=normalised).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return normalised

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        password_validation.validate_password(attrs["password"])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        phone_number = format_phone_number(validated_data["phone_number"])

        # A visitor may register from a different tab/device after placing an
        # order as a guest.  Reconnect the account by the contact number saved
        # during checkout so those database-backed orders continue with the
        # same customer instead of creating an unrelated account.
        guest = (
            CustomUser.objects.select_for_update(of=("self",))
            .select_related("profile", "staff_profile", "ambassador_profile")
            .filter(is_guest=True, profile__secondary_phone=phone_number)
            .order_by("-updated_at")
            .first()
        )
        if guest:
            guest.phone_number = phone_number
            guest.first_name = validated_data.get("first_name", "") or guest.first_name
            guest.last_name = validated_data.get("last_name", "") or guest.last_name
            guest.email = validated_data.get("email") or guest.email
            guest.is_guest = False
            guest.set_password(password)
            guest.save()
            return guest

        validated_data["phone_number"] = phone_number
        return CustomUser.objects.create_user(password=password, **validated_data)


class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user: CustomUser):
        token = super().get_token(user)
        token["phone_number"] = user.phone_number
        return token

    def validate(self, attrs):
        phone_field = self.username_field

        if phone_field in attrs:
            from core.utils import format_phone_number

            attrs[phone_field] = format_phone_number(attrs[phone_field])

        data = super().validate(attrs)
        data: dict[str, Any] = data
        data["user"] = {
            "id": self.user.pk,
            "phone_number": self.user.phone_number,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "is_staff": self.user.is_staff,
            "is_superuser": self.user.is_superuser,
            "is_guest": self.user.is_guest,
            "staff_role": get_staff_role(self.user),
            "staff_permissions": get_staff_permissions(self.user),
            "staff_access_active": get_staff_role(self.user) is not None,
            "is_ambassador": hasattr(self.user, "ambassador_profile") and self.user.ambassador_profile.is_active,
            **_avatar_payload(self.user),
        }

        return data

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


def auth_payload(user) -> dict[str, Any]:
    """Same shape as the login response, so the frontend can treat a guest
    session, a fresh registration and a login identically."""
    refresh = RefreshToken.for_user(user)
    if user.is_guest:
        refresh["guest"] = True
        refresh.set_exp(lifetime=timedelta(days=settings.GUEST_REFRESH_TOKEN_LIFETIME_DAYS))
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.pk,
            "phone_number": user.phone_number,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "is_guest": user.is_guest,
            "staff_role": get_staff_role(user),
            "staff_permissions": get_staff_permissions(user),
            "staff_access_active": get_staff_role(user) is not None,
            "is_ambassador": hasattr(user, "ambassador_profile") and user.ambassador_profile.is_active,
            **_avatar_payload(user),
        },
    }


class GuestSessionSerializer(serializers.Serializer):
    """Optional details a guest can leave so the shop can reach them."""

    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contact_phone = serializers.RegexField(
        r"^\+?[\d ]{9,18}$", required=False, allow_blank=True,
        error_messages={"invalid": "Enter a valid phone number."},
    )

    def create(self, validated_data):
        from core.utils import format_phone_number, make_guest_phone

        user = CustomUser(
            phone_number=make_guest_phone(),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_guest=True,
        )
        user.set_unusable_password()
        user.save()  # signals create profile + loyalty account

        contact = validated_data.get("contact_phone", "")
        if contact:
            profile = user.profile
            profile.secondary_phone = format_phone_number(contact)
            profile.save(update_fields=["secondary_phone", "updated_at"])
        return user


class ClaimAccountSerializer(RegisterSerializer):
    """Turns the calling guest into a normal account, in place."""

    def validate_phone_number(self, value):
        # The field-level unique check compares the raw input; accounts are
        # stored in normalised form ("677…" -> "237677…"), so check that too.
        normalised = format_phone_number(value)
        if CustomUser.objects.filter(phone_number=normalised).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def create(self, validated_data):
        raise NotImplementedError

    def update(self, instance, validated_data):
        instance.phone_number = format_phone_number(validated_data["phone_number"])
        instance.first_name = validated_data.get("first_name") or instance.first_name
        instance.last_name = validated_data.get("last_name") or instance.last_name
        instance.email = validated_data.get("email") or instance.email
        instance.set_password(validated_data["password"])
        instance.is_guest = False
        instance.save()
        return instance


class GuestAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Keeps a guest's refresh token long-lived across rotation (SimpleJWT
    resets the expiry to the normal 7 days on every rotation)."""

    def validate(self, attrs):
        was_guest = False
        try:
            was_guest = bool(RefreshToken(attrs["refresh"]).get("guest"))
        except Exception:
            pass  # super().validate() reports the real error
        data = super().validate(attrs)
        if was_guest and "refresh" in data:
            token = RefreshToken(data["refresh"])
            token["guest"] = True
            token.set_exp(lifetime=timedelta(days=settings.GUEST_REFRESH_TOKEN_LIFETIME_DAYS))
            data["refresh"] = str(token)
        return data
