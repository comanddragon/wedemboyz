from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.api.serializers import (
    ChangePasswordSerializer,
    PreferencesSerializer,
    ProfileSerializer,
)
from apps.users.models import UserProfile


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/users/me/"""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Ensure profile/loyalty_account exist even for users created before
        # the signal was introduced, or via createsuperuser.
        UserProfile.objects.get_or_create(user=self.request.user)
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/v1/users/me/change-password/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."}, status=status.HTTP_200_OK)


class PreferencesView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/users/me/preferences/"""

    serializer_class = PreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile
