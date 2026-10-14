from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView as SimpleJWTTokenRefreshView

from apps.users.api.serializers import LoginSerializer, LogoutSerializer, RegisterSerializer


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


# Re-exported as-is — no customization needed beyond what SimpleJWT provides.
TokenRefreshView = SimpleJWTTokenRefreshView
