from rest_framework import generics, permissions
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.api.serializers import (
    InventoryAdjustSerializer,
    InventoryItemSerializer,
    InventoryTransactionSerializer,
)
from apps.inventory.models import InventoryItem, InventoryTransaction


class InventoryItemListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/inventory/items/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = InventoryItem.objects.all()
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        if category:
            qs = qs.filter(category=category)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class InventoryItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/inventory/items/{id}/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = InventoryItem.objects.all()


class InventoryLowStockListView(generics.ListAPIView):
    """GET /api/v1/inventory/items/low-stock/"""

    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        from django.db.models import F

        return InventoryItem.objects.filter(quantity__lte=F("low_stock_threshold"))


class InventoryItemAdjustView(APIView):
    """POST /api/v1/inventory/items/{id}/adjust/ — restock, log usage, or
    correct a stocktake discrepancy. Always logged as an InventoryTransaction
    (never edits `quantity` directly) so there's a full audit trail."""

    permission_classes = [permissions.IsAdminUser]

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
            created_by=request.user,
        )
        item.refresh_from_db()
        return Response(InventoryItemSerializer(item).data)


class InventoryItemTransactionListView(generics.ListAPIView):
    """GET /api/v1/inventory/items/{id}/transactions/"""

    serializer_class = InventoryTransactionSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return InventoryTransaction.objects.filter(item_id=self.kwargs["pk"])
