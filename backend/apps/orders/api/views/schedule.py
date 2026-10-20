from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.api.serializers import RescheduleSerializer, ScheduleCreateSerializer, ScheduleSerializer
from apps.orders.models import PickupDeliverySchedule
from apps.staff.permissions import StaffPermission, has_staff_permission


class ScheduleCreateView(generics.ListCreateAPIView):
    """POST /api/v1/schedule/ — one-time creation of a pickup/delivery
    schedule for an order that doesn't have one yet."""

    serializer_class = ScheduleCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ScheduleCreateSerializer if self.request.method == "POST" else ScheduleSerializer

    def get_queryset(self):
        qs = PickupDeliverySchedule.objects.select_related("order", "order__user", "driver")
        profile = getattr(self.request.user, "staff_profile", None)
        if profile and profile.role == "DRIVER" and profile.is_active:
            return qs.filter(driver=self.request.user)
        if not has_staff_permission(self.request.user, StaffPermission.SCHEDULE_MANAGE):
            return qs.filter(order__user=self.request.user)
        date = self.request.query_params.get("date")
        slot = self.request.query_params.get("slot")
        driver = self.request.query_params.get("driver")
        kind = self.request.query_params.get("kind", "pickup")
        if date:
            qs = qs.filter(**{f"{kind}_date": date})
        if slot:
            qs = qs.filter(**{f"{kind}_time_slot": slot})
        if driver and driver.isdigit():
            qs = qs.filter(driver_id=int(driver))
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        return Response(ScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)


class ScheduleDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/schedule/{order_id}/"""

    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "order_id"
    lookup_field = "order_id"

    def get_queryset(self):
        qs = PickupDeliverySchedule.objects.select_related("order")
        profile = getattr(self.request.user, "staff_profile", None)
        if profile and profile.role == "DRIVER" and profile.is_active:
            return qs.filter(driver=self.request.user)
        if has_staff_permission(self.request.user, StaffPermission.SCHEDULE_MANAGE):
            return qs
        return qs.filter(order__user=self.request.user)


class ScheduleRescheduleView(APIView):
    """POST /api/v1/schedule/{order_id}/reschedule/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        schedule = get_object_or_404(
            PickupDeliverySchedule.objects.select_related("order"), order_id=order_id
        )
        if schedule.order.user_id != request.user.id and not has_staff_permission(
            request.user, StaffPermission.SCHEDULE_MANAGE
        ):
            raise PermissionDenied("You do not own this order.")

        serializer = RescheduleSerializer(data=request.data, context={"schedule": schedule})
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        return Response(ScheduleSerializer(schedule).data)
