from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView as SimpleJWTTokenRefreshView

from apps.users.api.serializers import (
    ClaimAccountSerializer,
    GuestAwareTokenRefreshSerializer,
    GuestSessionSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    auth_payload,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — creates the user; profile+loyalty account
    are created by apps.users.signals, not here (keeps this view thin)."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": {
                    "id": user.pk,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — {"phone_number": ..., "password": ...}"""

    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — {"refresh": "..."} blacklists the refresh token."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": str(exc)})

        return Response(status=status.HTTP_205_RESET_CONTENT)


class GuestSessionThrottle(AnonRateThrottle):
    scope = "guest_session"
    rate = "30/hour"


class GuestSessionView(APIView):
    """POST /api/v1/auth/guest/ — creates a guest account and returns tokens,
    so someone can book without registering. The client keeps the tokens
    (like a normal login) and the guest's orders stay attached to that
    account; POST /auth/guest/claim/ later adds a phone + password to it."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes = [GuestSessionThrottle]

    def post(self, request):
        serializer = GuestSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class ClaimGuestAccountView(APIView):
    """POST /api/v1/auth/guest/claim/ — the signed-in guest picks a real phone
    number and password. Same user row, so every order/payment/chat the guest
    made carries over."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_guest:
            raise ValidationError("This account is already registered.")
        serializer = ClaimAccountSerializer(instance=request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_payload(user))


class TokenRefreshView(SimpleJWTTokenRefreshView):
    serializer_class = GuestAwareTokenRefreshSerializer
