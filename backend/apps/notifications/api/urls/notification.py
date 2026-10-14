from django.urls import path

from apps.notifications.api.views import (
    DeviceTokenDeleteView,
    DeviceTokenListCreateView,
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationPreferenceView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("preferences/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("device-tokens/", DeviceTokenListCreateView.as_view(), name="device-token-list"),
    path("device-tokens/<int:pk>/", DeviceTokenDeleteView.as_view(), name="device-token-delete"),
]
