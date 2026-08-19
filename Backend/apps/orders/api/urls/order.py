from django.urls import path

from apps.orders.api.views import (
    OrderCancelView,
    OrderDetailView,
    OrderListCreateView,
    OrderStatusHistoryListView,
    OrderStatusUpdateView,
    StaffQuickSaleView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list"),
    path("quick-sale/", StaffQuickSaleView.as_view(), name="order-quick-sale"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("<int:pk>/status/", OrderStatusUpdateView.as_view(), name="order-status-update"),
    path("<int:pk>/status-history/", OrderStatusHistoryListView.as_view(), name="order-status-history"),
]
