from django.urls import path

from apps.inventory.api.views import (
    InventoryItemAdjustView,
    InventoryItemDetailView,
    InventoryItemListCreateView,
    InventoryItemTransactionListView,
    InventoryLowStockListView,
    InventoryTransactionListView,
    InventoryUsageCreateView,
    InventoryValuationView,
    MachineDetailView,
    MachineListCreateView,
    ServiceConsumptionDetailView,
    ServiceConsumptionListCreateView,
    SupplierDetailView,
    SupplierListCreateView,
)

urlpatterns = [
    path("items/", InventoryItemListCreateView.as_view(), name="inventory-item-list"),
    path("items/low-stock/", InventoryLowStockListView.as_view(), name="inventory-low-stock"),
    path("transactions/", InventoryTransactionListView.as_view(), name="inventory-transactions"),
    path("usage/", InventoryUsageCreateView.as_view(), name="inventory-usage"),
    path("valuation/", InventoryValuationView.as_view(), name="inventory-valuation"),
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list"),
    path("suppliers/<int:pk>/", SupplierDetailView.as_view(), name="supplier-detail"),
    path("consumption-standards/", ServiceConsumptionListCreateView.as_view(), name="consumption-standard-list"),
    path("consumption-standards/<int:pk>/", ServiceConsumptionDetailView.as_view(), name="consumption-standard-detail"),
    path("machines/", MachineListCreateView.as_view(), name="machine-list"),
    path("machines/<int:pk>/", MachineDetailView.as_view(), name="machine-detail"),
    path("items/<int:pk>/", InventoryItemDetailView.as_view(), name="inventory-item-detail"),
    path("items/<int:pk>/adjust/", InventoryItemAdjustView.as_view(), name="inventory-item-adjust"),
    path(
        "items/<int:pk>/transactions/",
        InventoryItemTransactionListView.as_view(),
        name="inventory-item-transactions",
    ),
]
