from .order import (
    OrderCancelView,
    OrderDetailView,
    OrderListCreateView,
    OrderStatusHistoryListView,
    OrderStatusUpdateView,
)
from .quick_sale import StaffQuickSaleView
from .schedule import ScheduleCreateView, ScheduleDetailView, ScheduleRescheduleView

__all__ = [
    "OrderListCreateView",
    "OrderDetailView",
    "OrderCancelView",
    "OrderStatusUpdateView",
    "OrderStatusHistoryListView",
    "ScheduleCreateView",
    "ScheduleDetailView",
    "ScheduleRescheduleView",
    "StaffQuickSaleView",
]
