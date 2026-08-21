from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.api.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusHistorySerializer,
)
from apps.orders.models import Order
from core.constants import OrderStatus
from core.permissions import IsOwner

CANCELLABLE_STATUSES = {OrderStatus.PENDING, OrderStatus.CONFIRMED}
EDITABLE_STATUSES = {OrderStatus.PENDING}


class OrderListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/orders/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # select_related("schedule") avoids an N+1 query for
        # OrderListSerializer.has_schedule, which does a plain hasattr()
        # check per order.
        qs = Order.objects.select_related("user", "schedule").prefetch_related("items")
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        output = OrderDetailSerializer(order, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/orders/{id}/ — PATCH is limited to addresses/notes
    and only while the order is still PENDING (see EDITABLE_STATUSES)."""

    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, (permissions.IsAdminUser | IsOwner)]

    def get_queryset(self):
        qs = Order.objects.select_related("user").prefetch_related("items", "status_history")
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status not in EDITABLE_STATUSES and not self.request.user.is_staff:
            raise ValidationError("This order can no longer be edited once processing has started.")
        serializer.save()


class OrderCancelView(APIView):
    """POST /api/v1/orders/{id}/cancel/ — customer-initiated cancellation,
    only while the order hasn't started processing yet."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        self.check_object_permissions(request, order)

        if order.status not in CANCELLABLE_STATUSES:
            raise ValidationError(f"An order in status '{order.status}' can no longer be cancelled.")

        order.status = OrderStatus.CANCELLED
        order.save(update_fields=["status"])
        return Response(OrderDetailSerializer(order).data)


class OrderStatusUpdateView(APIView):
    """POST /api/v1/orders/{id}/status/ — staff/driver only. The status
    change itself is picked up by apps.orders.signals, which appends the
    OrderStatusHistory row and fires the SMS task; here we just attach the
    optional note/changed_by to that freshly-created row."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        new_status = request.data.get("status")
        note = request.data.get("note", "")

        if new_status not in OrderStatus.values:
            raise ValidationError({"status": f"Must be one of {list(OrderStatus.values)}."})

        previous_status = order.status
        if new_status == previous_status:
            return Response(OrderDetailSerializer(order).data)

        order.status = new_status
        order.save(update_fields=["status"])

        latest_history = order.status_history.first()
        if latest_history is not None:
            latest_history.note = note
            latest_history.changed_by = request.user
            latest_history.save(update_fields=["note", "changed_by"])

        return Response(OrderDetailSerializer(order).data)


class OrderStatusHistoryListView(generics.ListAPIView):
    """GET /api/v1/orders/{id}/status-history/"""

    serializer_class = OrderStatusHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order = get_object_or_404(Order, pk=self.kwargs["pk"])
        if not (self.request.user.is_staff or order.user_id == self.request.user.id):
            raise PermissionDenied("You do not have access to this order.")
        return order.status_history.all()
