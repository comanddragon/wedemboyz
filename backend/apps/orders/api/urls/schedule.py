from django.urls import path

from apps.orders.api.views import ScheduleCreateView, ScheduleDetailView, ScheduleRescheduleView

urlpatterns = [
    path("", ScheduleCreateView.as_view(), name="schedule-create"),
    path("<int:order_id>/", ScheduleDetailView.as_view(), name="schedule-detail"),
    path("<int:order_id>/reschedule/", ScheduleRescheduleView.as_view(), name="schedule-reschedule"),
]
