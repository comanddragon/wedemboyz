from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.api.serializers import RescheduleSerializer, ScheduleCreateSerializer, ScheduleSerializer
from apps.orders.models import PickupDeliverySchedule


class ScheduleCreateView(generics.CreateAPIView):
    """POST /api/v1/schedule/ — one-time creation of a pickup/delivery
    schedule for an order that doesn't have one yet."""

    serializer_class = ScheduleCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        if self.request.user.is_staff:
            return qs
        return qs.filter(order__user=self.request.user)


class ScheduleRescheduleView(APIView):
    """POST /api/v1/schedule/{order_id}/reschedule/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, order_id):
        schedule = get_object_or_404(
            PickupDeliverySchedule.objects.select_related("order"), order_id=order_id
        )
        if schedule.order.user_id != request.user.id and not request.user.is_staff:
            raise PermissionDenied("You do not own this order.")

        serializer = RescheduleSerializer(data=request.data, context={"schedule": schedule})
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        return Response(ScheduleSerializer(schedule).data)
