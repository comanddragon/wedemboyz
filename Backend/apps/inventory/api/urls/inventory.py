from django.urls import path

from apps.inventory.api.views import (
    InventoryItemAdjustView,
    InventoryItemDetailView,
    InventoryItemListCreateView,
    InventoryItemTransactionListView,
    InventoryLowStockListView,
)

urlpatterns = [
    path("items/", InventoryItemListCreateView.as_view(), name="inventory-item-list"),
    path("items/low-stock/", InventoryLowStockListView.as_view(), name="inventory-low-stock"),
    path("items/<int:pk>/", InventoryItemDetailView.as_view(), name="inventory-item-detail"),
    path("items/<int:pk>/adjust/", InventoryItemAdjustView.as_view(), name="inventory-item-adjust"),
    path(
        "items/<int:pk>/transactions/",
        InventoryItemTransactionListView.as_view(),
        name="inventory-item-transactions",
    ),
]
