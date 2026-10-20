from django.db.models import Count, Q
from django.utils import timezone
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
    StaffAssignmentSerializer,
    StaffProfileUpdateSerializer,
    BusinessSettingsSerializer,
    PriceItemSerializer,
    SubscriptionPlanSettingSerializer,
)
from apps.staff.models import (
    StaffActivityLog,
    StaffInvite,
    StaffProfile,
    generate_invite_token,
    log_activity,
    BusinessSettings,
    PriceItem,
    SubscriptionPlanSetting,
)
from apps.staff.permissions import HasStaffPermission, IsStaffManager, StaffPermission


class StaffListView(generics.ListAPIView):
    """GET /api/v1/staff/ — owner-only roster."""

    serializer_class = StaffProfileSerializer
    permission_classes = [IsStaffManager]
    queryset = StaffProfile.objects.select_related("user", "invited_by").annotate(
        open_chat_count=Count("user__chat_rooms_as_agent", filter=Q(user__chat_rooms_as_agent__status="OPEN"))
    )

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        active = self.request.query_params.get("active")
        chat_available = self.request.query_params.get("chat_available")
        search = self.request.query_params.get("search", "").strip()
        if role:
            queryset = queryset.filter(role=role)
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        if chat_available == "true":
            queryset = queryset.filter(
                is_active=True,
                employment_status=StaffProfile.EmploymentStatus.ACTIVE,
                is_available_for_chat=True,
                user__is_active=True,
            )
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
            )
        return queryset


class ChatAssignableStaffListView(generics.ListAPIView):
    """Active staff who may receive chats, visible to chat operators."""

    serializer_class = StaffProfileSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CHAT_MANAGE
    pagination_class = None
    queryset = StaffProfile.objects.select_related("user", "invited_by").filter(
        is_active=True,
        employment_status=StaffProfile.EmploymentStatus.ACTIVE,
        is_available_for_chat=True,
        user__is_active=True,
    ).annotate(
        open_chat_count=Count("user__chat_rooms_as_agent", filter=Q(user__chat_rooms_as_agent__status="OPEN"))
    )


class OperationalStaffListView(generics.ListAPIView):
    serializer_class = StaffAssignmentSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.ORDERS_MANAGE
    pagination_class = None

    def get_queryset(self):
        queryset = StaffProfile.objects.select_related("user").filter(
            is_active=True,
            employment_status=StaffProfile.EmploymentStatus.ACTIVE,
            user__is_active=True,
        )
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        return queryset.order_by("user__first_name", "user__last_name")


class StaffDetailUpdateView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/staff/{id}/ — role/active changes require IsStaffManager."""

    queryset = StaffProfile.objects.select_related("user", "invited_by").annotate(
        open_chat_count=Count("user__chat_rooms_as_agent", filter=Q(user__chat_rooms_as_agent__status="OPEN"))
    )

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsStaffManager()]
        return [IsStaffManager()]

    def get_serializer_class(self):
        return StaffProfileUpdateSerializer if self.request.method == "PATCH" else StaffProfileSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_activity(
            request.user,
            "staff.updated",
            f"Updated staff profile #{instance.pk}: {', '.join(serializer.validated_data.keys())}",
        )
        return Response(StaffProfileSerializer(instance).data)


class StaffInviteListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/staff/invites/ — invite management (IsStaffManager)."""

    serializer_class = StaffInviteSerializer
    permission_classes = [IsStaffManager]
    queryset = StaffInvite.objects.select_related("invited_by", "accepted_by")

    def get_queryset(self):
        StaffInvite.objects.filter(
            status=StaffInvite.Status.PENDING,
            expires_at__lte=timezone.now(),
        ).update(status=StaffInvite.Status.EXPIRED)
        return super().get_queryset()


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


class StaffInviteResendView(APIView):
    """Refresh a pending/expired invite with a new token and seven-day window."""

    permission_classes = [IsStaffManager]

    def post(self, request, pk):
        invite = get_object_or_404(StaffInvite, pk=pk)
        if invite.status == StaffInvite.Status.ACCEPTED:
            raise ValidationError("An accepted invite cannot be resent.")
        invite.status = StaffInvite.Status.PENDING
        invite.token = generate_invite_token()
        invite.expires_at = timezone.now() + timezone.timedelta(days=7)
        invite.invited_by = request.user
        invite.save(update_fields=["status", "token", "expires_at", "invited_by", "updated_at"])
        log_activity(request.user, "staff.invite_resent", f"Resent invite #{invite.pk}")
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
    permission_classes = [IsStaffManager]

    def get_queryset(self):
        profile = get_object_or_404(StaffProfile, pk=self.kwargs["pk"])
        return StaffActivityLog.objects.filter(staff=profile.user)


class GlobalAuditLogView(generics.ListAPIView):
    serializer_class = StaffActivityLogSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.AUDIT_VIEW

    def get_queryset(self):
        queryset = StaffActivityLog.objects.select_related("staff")
        action = self.request.query_params.get("action")
        search = self.request.query_params.get("search", "").strip()
        if action:
            queryset = queryset.filter(action__icontains=action)
        if search:
            queryset = queryset.filter(Q(description__icontains=search) | Q(staff__first_name__icontains=search) | Q(staff__last_name__icontains=search))
        return queryset


class BusinessSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = BusinessSettingsSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE

    def get_object(self):
        return BusinessSettings.load()

    def perform_update(self, serializer):
        serializer.save()
        log_activity(self.request.user, "settings.updated", "Updated business settings")


class PriceItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PriceItemSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    queryset = PriceItem.objects.all()

    def perform_create(self, serializer):
        item = serializer.save()
        log_activity(self.request.user, "price.created", f"Created price for {item.service_type}")


class PriceItemDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PriceItemSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    queryset = PriceItem.objects.all()

    def perform_update(self, serializer):
        item = serializer.save()
        log_activity(self.request.user, "price.updated", f"Updated price for {item.service_type}")


class SubscriptionPlanSettingListCreateView(generics.ListCreateAPIView):
    serializer_class = SubscriptionPlanSettingSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    pagination_class = None
    queryset = SubscriptionPlanSetting.objects.all()

    def perform_create(self, serializer):
        plan = serializer.save()
        log_activity(self.request.user, "subscription_plan.created", f"Created plan {plan.plan}")


class SubscriptionPlanSettingDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SubscriptionPlanSettingSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    queryset = SubscriptionPlanSetting.objects.all()

    def perform_update(self, serializer):
        plan = serializer.save()
        log_activity(self.request.user, "subscription_plan.updated", f"Updated plan {plan.plan}")
