import json

from django.db import transaction
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone

from apps.orders.api.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderItemSerializer,
    OrderItemWriteSerializer,
    OrderStatusHistorySerializer,
)
from apps.orders.models import Order, OrderItem
from core.constants import OrderStatus
from core.permissions import IsOwner
from apps.staff.permissions import HasStaffPermission, StaffPermission, has_staff_permission
from apps.staff.models import log_activity
from services.order_flow import cancel_order, validate_transition

CANCELLABLE_STATUSES = {OrderStatus.PENDING, OrderStatus.CONFIRMED}
EDITABLE_STATUSES = {OrderStatus.PENDING}


class OrderListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/orders/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # select_related("schedule") avoids an N+1 query for
        # OrderListSerializer.has_schedule, which does a plain hasattr()
        # check per order.
        qs = Order.objects.select_related(
            "user", "schedule", "assigned_to", "driver"
        ).prefetch_related("items")
        if not has_staff_permission(self.request.user, StaffPermission.ORDERS_VIEW):
            return qs.filter(user=self.request.user)

        status_filter = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        source = self.request.query_params.get("source")
        assigned_to = self.request.query_params.get("assigned_to")
        driver = self.request.query_params.get("driver")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        ordering = self.request.query_params.get("ordering")
        customer = self.request.query_params.get("customer")
        search = self.request.query_params.get("search", "").strip()
        overdue = self.request.query_params.get("overdue")
        if status_filter in OrderStatus.values:
            qs = qs.filter(status=status_filter)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if source in Order.Source.values:
            qs = qs.filter(source=source)
        if assigned_to and assigned_to.isdigit():
            qs = qs.filter(assigned_to_id=int(assigned_to))
        if driver and driver.isdigit():
            qs = qs.filter(driver_id=int(driver))
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if customer and customer.isdigit():
            qs = qs.filter(user_id=int(customer))
        if overdue == "true":
            from django.utils import timezone

            qs = qs.filter(payment_due_date__lt=timezone.localdate()).exclude(
                payment_status__in=["PAID", "NO_CHARGE", "WAIVED", "VOID"]
            )
        if search:
            query = (
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
            )
            if search.isdigit():
                query |= Q(pk=int(search))
            qs = qs.filter(query)
        if ordering in {
            "created_at", "-created_at", "total_amount", "-total_amount",
            "expected_ready_at", "-expected_ready_at", "priority", "-priority",
        }:
            qs = qs.order_by(ordering)
        return qs

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderListSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        payload = request.data
        uploaded_photos = {}
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            payload = request.data.dict()
            try:
                payload["items"] = json.loads(payload.get("items", "[]"))
            except (TypeError, ValueError):
                raise ValidationError({"items": "Items must be valid JSON."})

            image_field = serializers.ImageField(allow_empty_file=False)
            for index in range(len(payload["items"])):
                item_photos = [
                    photo for key, photo in request.FILES.items()
                    if key.startswith(f"item_photo_{index}_")
                ]
                legacy_photo = request.FILES.get(f"item_photo_{index}")
                if legacy_photo:
                    item_photos.append(legacy_photo)
                if len(item_photos) > 6:
                    raise ValidationError({f"item_photo_{index}": "Add no more than 6 photos per item."})
                for photo_index, photo in enumerate(item_photos):
                    field_name = f"item_photo_{index}_{photo_index}"
                    if photo.content_type not in {"image/jpeg", "image/png", "image/webp"}:
                        raise ValidationError({field_name: "Use a JPG, PNG, or WebP image."})
                    if photo.size > 5 * 1024 * 1024:
                        raise ValidationError({field_name: "Each photo must be 5 MB or smaller."})
                    uploaded_photos.setdefault(index, []).append(image_field.run_validation(photo))
                    photo.seek(0)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        if uploaded_photos:
            created_items = list(order.items.order_by("id"))
            from apps.orders.models import OrderItemPhoto

            for index, photos in uploaded_photos.items():
                for photo in photos:
                    OrderItemPhoto.objects.create(item=created_items[index], image=photo)
        order.refresh_from_db()
        output = OrderDetailSerializer(order, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/orders/{id}/ — PATCH is limited to addresses/notes
    and only while the order is still PENDING (see EDITABLE_STATUSES)."""

    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related(
            "user", "assigned_to", "driver", "created_by"
        ).prefetch_related("items__photos", "status_history")
        if has_staff_permission(self.request.user, StaffPermission.ORDERS_VIEW):
            return qs
        return qs.filter(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.status not in EDITABLE_STATUSES and not has_staff_permission(self.request.user, StaffPermission.ORDERS_MANAGE):
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

        order = cancel_order(
            order,
            changed_by=request.user,
            reason=str(request.data.get("reason", "")).strip(),
        )
        return Response(OrderDetailSerializer(order).data)


class OrderStatusUpdateView(APIView):
    """POST /api/v1/orders/{id}/status/ — staff/driver only. The status
    change itself is picked up by apps.orders.signals, which appends the
    OrderStatusHistory row and fires the SMS task; here we just attach the
    optional note/changed_by to that freshly-created row."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.ORDERS_MANAGE

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        new_status = request.data.get("status")
        note = request.data.get("note", "")

        if new_status not in OrderStatus.values:
            raise ValidationError({"status": f"Must be one of {list(OrderStatus.values)}."})

        previous_status = order.status
        if new_status == previous_status:
            return Response(OrderDetailSerializer(order).data)

        validate_transition(previous_status, new_status)

        if new_status == OrderStatus.CANCELLED:
            order = cancel_order(order, changed_by=request.user, reason=note)
            log_activity(request.user, "order.status_changed", f"Order #{order.pk}: {previous_status} → {new_status}")
            return Response(OrderDetailSerializer(order).data)

        order.status = new_status
        update_fields = ["status"]
        if new_status == OrderStatus.READY:
            order.ready_at = timezone.now()
            update_fields.append("ready_at")
        if new_status == OrderStatus.DELIVERED:
            if order.balance_due > 0 and not request.data.get("allow_unpaid_delivery"):
                raise ValidationError(
                    "This order still has a balance. A manager override is required to deliver it."
                )
            order.delivered_at = timezone.now()
            update_fields.append("delivered_at")
        order.save(update_fields=update_fields)

        if new_status == OrderStatus.IN_PROGRESS:
            from services.inventory_usage import consume_for_order

            consume_for_order(order, changed_by=request.user)

        latest_history = order.status_history.first()
        if latest_history is not None:
            latest_history.note = note
            latest_history.changed_by = request.user
            latest_history.save(update_fields=["note", "changed_by"])

        log_activity(request.user, "order.status_changed", f"Order #{order.pk}: {previous_status} → {new_status}")

        return Response(OrderDetailSerializer(order).data)


class OrderStatusHistoryListView(generics.ListAPIView):
    """GET /api/v1/orders/{id}/status-history/"""

    serializer_class = OrderStatusHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order = get_object_or_404(Order, pk=self.kwargs["pk"])
        if not (has_staff_permission(self.request.user, StaffPermission.ORDERS_VIEW) or order.user_id == self.request.user.id):
            raise PermissionDenied("You do not have access to this order.")
        return order.status_history.all()


class OrderWaivePaymentView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.REFUNDS_MANAGE

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A waiver reason is required."})
        if order.balance_due <= 0:
            raise ValidationError("This order has no balance to waive.")
        order.payment_waived_reason = reason
        order.payment_waived_by = request.user
        order.save(
            update_fields=["payment_waived_reason", "payment_waived_by", "updated_at"]
        )
        from apps.staff.models import log_activity
        from services.order_payments import recompute_payment_status

        order = recompute_payment_status(
            order, changed_by=request.user, reason=f"Balance waived: {reason}"
        )
        log_activity(request.user, "payment.waived", f"Waived order #{order.pk}: {reason}")
        return Response(OrderDetailSerializer(order).data)


class OrderItemListCreateView(generics.ListCreateAPIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.ORDERS_EDIT_ITEMS

    def get_order(self):
        return get_object_or_404(Order, pk=self.kwargs["pk"])

    def get_queryset(self):
        return self.get_order().items.all()

    def get_serializer_class(self):
        return OrderItemWriteSerializer if self.request.method == "POST" else OrderItemSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "order": self.get_order()}


class OrderItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.ORDERS_EDIT_ITEMS
    serializer_class = OrderItemWriteSerializer
    lookup_url_kwarg = "item_id"

    def get_queryset(self):
        return OrderItem.objects.filter(order_id=self.kwargs["pk"])

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        if item.order.items.count() <= 1:
            raise ValidationError("An order must keep at least one item.")
        order = item.order
        item.delete()
        return Response(OrderDetailSerializer(order).data)


class OrderAssignmentView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.ORDERS_MANAGE

    def post(self, request, pk):
        from apps.staff.models import StaffProfile

        order = get_object_or_404(Order, pk=pk)
        assigned_to_id = request.data.get("assigned_to")
        driver_id = request.data.get("driver")

        assigned_profile = None
        driver_profile = None
        if assigned_to_id is not None:
            assigned_profile = get_object_or_404(
                StaffProfile.objects.select_related("user"),
                user_id=assigned_to_id,
                is_active=True,
            )
        if driver_id is not None:
            driver_profile = get_object_or_404(
                StaffProfile.objects.select_related("user"),
                user_id=driver_id,
                role="DRIVER",
                is_active=True,
            )
        order.assigned_to = assigned_profile.user if assigned_profile else None
        order.driver = driver_profile.user if driver_profile else None
        order.save(update_fields=["assigned_to", "driver", "updated_at"])
        if hasattr(order, "schedule"):
            order.schedule.driver = order.driver
            order.schedule.save(update_fields=["driver", "updated_at"])
        from apps.staff.models import log_activity

        log_activity(request.user, "order.assigned", f"Updated assignment for order #{order.pk}")
        return Response(OrderDetailSerializer(order).data)
