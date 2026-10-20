from django.urls import path

from apps.payments.api.views.payment import OrderMarkPaidView, OrderPaymentListCreateView

from apps.orders.api.views import (
    OrderCancelView,
    OrderDetailView,
    OrderListCreateView,
    OrderStatusHistoryListView,
    OrderStatusUpdateView,
    OrderWaivePaymentView,
    OrderAssignmentView,
    OrderItemDetailView,
    OrderItemListCreateView,
    StaffQuickSaleView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list"),
    path("quick-sale/", StaffQuickSaleView.as_view(), name="order-quick-sale"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("<int:pk>/status/", OrderStatusUpdateView.as_view(), name="order-status-update"),
    path("<int:pk>/status-history/", OrderStatusHistoryListView.as_view(), name="order-status-history"),
    path("<int:pk>/payments/", OrderPaymentListCreateView.as_view(), name="order-payments"),
    path("<int:pk>/mark-paid/", OrderMarkPaidView.as_view(), name="order-mark-paid"),
    path("<int:pk>/waive/", OrderWaivePaymentView.as_view(), name="order-waive"),
    path("<int:pk>/assign/", OrderAssignmentView.as_view(), name="order-assign"),
    path("<int:pk>/items/", OrderItemListCreateView.as_view(), name="order-item-list"),
    path("<int:pk>/items/<int:item_id>/", OrderItemDetailView.as_view(), name="order-item-detail"),
]
