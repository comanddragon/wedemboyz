from django.db import transaction
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.api.serializers import (
    InventoryAdjustSerializer,
    InventoryItemSerializer,
    InventoryTransactionSerializer,
    InventoryUsageSerializer,
    MachineSerializer,
    ServiceConsumptionSerializer,
    SupplierSerializer,
)
from apps.inventory.models import (
    InventoryItem,
    InventoryTransaction,
    Machine,
    ServiceConsumption,
    Supplier,
)
from apps.orders.models import Order
from apps.staff.models import log_activity
from apps.staff.permissions import HasStaffPermission, StaffPermission


class InventoryItemListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/inventory/items/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [HasStaffPermission]

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.INVENTORY_VIEW if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.INVENTORY_MANAGE
        )
        return super().get_permissions()

    def get_queryset(self):
        qs = InventoryItem.objects.select_related("supplier")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        low_stock = self.request.query_params.get("low_stock")
        supplier = self.request.query_params.get("supplier")
        active = self.request.query_params.get("is_active")
        ordering = self.request.query_params.get("ordering")
        expiring_before = self.request.query_params.get("expiring_before")
        if category:
            qs = qs.filter(category=category)
        if search:
            from django.db.models import Q

            qs = qs.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(barcode__icontains=search)
                | Q(brand__icontains=search)
            )
        if low_stock == "true":
            qs = qs.filter(quantity__lte=F("low_stock_threshold"))
        if supplier and supplier.isdigit():
            qs = qs.filter(supplier_id=int(supplier))
        if active in {"true", "false"}:
            qs = qs.filter(is_active=active == "true")
        if expiring_before:
            qs = qs.filter(expires_on__lte=expiring_before)
        if ordering in {"name", "-name", "quantity", "-quantity", "average_cost", "-average_cost", "updated_at", "-updated_at"}:
            qs = qs.order_by(ordering)
        return qs


class InventoryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/inventory/items/{id}/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [HasStaffPermission]

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.INVENTORY_VIEW if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.INVENTORY_MANAGE
        )
        return super().get_permissions()
    queryset = InventoryItem.objects.select_related("supplier")


class InventoryLowStockListView(generics.ListAPIView):
    """GET /api/v1/inventory/items/low-stock/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_VIEW

    def get_queryset(self):
        from django.db.models import F

        return InventoryItem.objects.select_related("supplier").filter(
            quantity__lte=F("low_stock_threshold"), is_active=True
        )


class InventoryItemAdjustView(APIView):
    """POST /api/v1/inventory/items/{id}/adjust/ — restock, log usage, or
    correct a stocktake discrepancy. Always logged as an InventoryTransaction
    (never edits `quantity` directly) so there's a full audit trail."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_MANAGE

    def post(self, request, pk):
        item = get_object_or_404(InventoryItem, pk=pk)
        serializer = InventoryAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        InventoryTransaction.objects.create(
            item=item,
            change_type=data["change_type"],
            quantity_change=data["quantity_change"],
            reason=data["reason"],
            unit_cost=data.get("unit_cost"),
            supplier=data.get("supplier"),
            reference=data.get("reference", ""),
            created_by=request.user,
        )
        log_activity(request.user, "inventory.adjusted", f"Adjusted {item.name} stock")
        item.refresh_from_db()
        return Response(InventoryItemSerializer(item).data)


class InventoryItemTransactionListView(generics.ListAPIView):
    """GET /api/v1/inventory/items/{id}/transactions/"""

    serializer_class = InventoryTransactionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_VIEW

    def get_queryset(self):
        return InventoryTransaction.objects.filter(item_id=self.kwargs["pk"])


class InventoryTransactionListView(generics.ListAPIView):
    serializer_class = InventoryTransactionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_VIEW

    def get_queryset(self):
        qs = InventoryTransaction.objects.select_related(
            "item", "supplier", "created_by", "order", "machine"
        )
        change_type = self.request.query_params.get("type")
        staff = self.request.query_params.get("staff")
        order = self.request.query_params.get("order")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if change_type:
            qs = qs.filter(change_type=change_type)
        if staff and staff.isdigit():
            qs = qs.filter(created_by_id=int(staff))
        if order and order.isdigit():
            qs = qs.filter(order_id=int(order))
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


class InventoryUsageCreateView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_LOG_USAGE

    @transaction.atomic
    def post(self, request):
        serializer = InventoryUsageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = None
        if data.get("order") is not None:
            order = get_object_or_404(Order, pk=data["order"])
        transactions = [
            InventoryTransaction.objects.create(
                item=line["item"],
                change_type=InventoryTransaction.ChangeType.USAGE,
                quantity_change=-line["quantity"],
                order=order,
                machine=data.get("machine"),
                batch=data.get("batch", ""),
                reason=data.get("reason", ""),
                created_by=request.user,
            )
            for line in data["lines"]
        ]
        if data.get("machine"):
            Machine.objects.filter(pk=data["machine"].pk).update(
                usage_count=F("usage_count") + 1
            )
        log_activity(
            request.user,
            "inventory.usage_logged",
            f"Logged {len(transactions)} supply movements",
        )
        return Response(
            InventoryTransactionSerializer(transactions, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class InventoryValuationView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_VIEW

    def get(self, request):
        value = ExpressionWrapper(
            F("quantity") * F("average_cost"),
            output_field=DecimalField(max_digits=16, decimal_places=2),
        )
        rows = list(
            InventoryItem.objects.filter(is_active=True)
            .values("category")
            .annotate(value=Sum(value), item_count=Count("id"))
            .order_by("category")
        )
        total = sum((row["value"] or 0 for row in rows), 0)
        return Response({"total_value": total, "categories": rows, "as_of": timezone.now()})


class SupplierListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierSerializer
    permission_classes = [HasStaffPermission]

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.INVENTORY_VIEW
            if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.SUPPLIERS_MANAGE
        )
        return super().get_permissions()

    queryset = Supplier.objects.all()


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SupplierSerializer
    permission_classes = [HasStaffPermission]

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.INVENTORY_VIEW
            if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.SUPPLIERS_MANAGE
        )
        return super().get_permissions()

    queryset = Supplier.objects.all()


class ServiceConsumptionListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceConsumptionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_MANAGE
    queryset = ServiceConsumption.objects.select_related("item")


class ServiceConsumptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceConsumptionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_MANAGE
    queryset = ServiceConsumption.objects.select_related("item")


class MachineListCreateView(generics.ListCreateAPIView):
    serializer_class = MachineSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_MANAGE
    queryset = Machine.objects.all()


class MachineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MachineSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.INVENTORY_MANAGE
    queryset = Machine.objects.all()
