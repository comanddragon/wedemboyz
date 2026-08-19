from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.api.serializers import (
    StaffActivityLogSerializer,
    StaffInviteAcceptSerializer,
    StaffInviteSerializer,
    StaffProfileSerializer,
    StaffProfileUpdateSerializer,
)
from apps.staff.models import StaffActivityLog, StaffInvite, StaffProfile
from apps.staff.permissions import IsStaffManager


class StaffListView(generics.ListAPIView):
    """GET /api/v1/staff/ — the roster. Any staff member can view it."""

    serializer_class = StaffProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = StaffProfile.objects.select_related("user", "invited_by")


class StaffDetailUpdateView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/staff/{id}/ — role/active changes require IsStaffManager."""

    queryset = StaffProfile.objects.select_related("user", "invited_by")

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAdminUser()]
        return [IsStaffManager()]

    def get_serializer_class(self):
        return StaffProfileUpdateSerializer if self.request.method == "PATCH" else StaffProfileSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StaffProfileSerializer(instance).data)


class StaffInviteListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/staff/invites/ — invite management (IsStaffManager)."""

    serializer_class = StaffInviteSerializer
    permission_classes = [IsStaffManager]
    queryset = StaffInvite.objects.select_related("invited_by", "accepted_by")


class StaffInviteRevokeView(APIView):
    """POST /api/v1/staff/invites/{id}/revoke/"""

    permission_classes = [IsStaffManager]

    def post(self, request, pk):
        invite = get_object_or_404(StaffInvite, pk=pk)
        if invite.status != StaffInvite.Status.PENDING:
            raise ValidationError(f"Invite is already {invite.status}.")
        invite.status = StaffInvite.Status.REVOKED
        invite.save(update_fields=["status"])
        return Response(StaffInviteSerializer(invite).data)


class StaffInviteAcceptView(APIView):
    """POST /api/v1/staff/invites/accept/ — public; the invite token is the credential."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = StaffInviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"detail": "Invite accepted. You can now log in.", "phone_number": user.phone_number},
            status=status.HTTP_201_CREATED,
        )


class StaffActivityLogListView(generics.ListAPIView):
    """GET /api/v1/staff/{id}/activity/"""

    serializer_class = StaffActivityLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        profile = get_object_or_404(StaffProfile, pk=self.kwargs["pk"])
        return StaffActivityLog.objects.filter(staff=profile.user)
