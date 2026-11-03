"""Rate-limited recovery using Django's single-use, expiring password token."""

from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.users.models import CustomUser
from core.utils import format_phone_number
from services.account_email import password_changed, request_password_reset


class PasswordRecoveryThrottle(AnonRateThrottle):
    scope = "password_recovery"
    rate = "5/hour"


class ResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    phone_number = serializers.RegexField(r"^\+?\d{9,15}$")


class ResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordRecoveryThrottle]

    @transaction.atomic
    def post(self, request):
        serializer = ResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = CustomUser.objects.filter(
            email__iexact=data["email"],
            phone_number=format_phone_number(data["phone_number"]),
            is_active=True,
            is_guest=False,
        ).first()
        if user is not None and user.has_usable_password():
            request_password_reset(user)
        # Same response for missing/inactive/guest accounts; do not expose registration.
        return Response(
            {"detail": "If these details match an account, a reset link will be emailed."}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordRecoveryThrottle]

    @transaction.atomic
    def post(self, request):
        serializer = ResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = None
        try:
            user_id = int(force_str(urlsafe_base64_decode(data["uid"])))
            if not 0 < user_id < 2**63:
                raise ValueError("Invalid user ID")
            user = (
                CustomUser.objects.select_for_update()
                .filter(
                    pk=user_id,
                    is_active=True,
                    is_guest=False,
                )
                .first()
            )
        except (ValueError, TypeError, OverflowError, UnicodeDecodeError):
            pass
        if user is None or not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError(
                {"detail": "This reset link is invalid or expired. Request a new one."}
            )
        try:
            password_validation.validate_password(data["password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        user.set_password(data["password"])
        user.save(update_fields=["password"])
        password_changed(user)
        return Response({"detail": "Password updated. Sign in with your new password."})
