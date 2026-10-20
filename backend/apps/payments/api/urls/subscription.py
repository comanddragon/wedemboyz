from django.urls import path

from apps.payments.api.views import (
    AdminSubscriptionActionView,
    AdminSubscriptionListView,
    SubscriptionActionView,
    SubscriptionCheckoutView,
    SubscriptionDetailView,
    SubscriptionListCreateView,
)

urlpatterns = [
    path("", SubscriptionListCreateView.as_view(), name="subscription-list"),
    path("admin/", AdminSubscriptionListView.as_view(), name="subscription-admin-list"),
    path("admin/<int:pk>/action/", AdminSubscriptionActionView.as_view(), name="subscription-admin-action"),
    path("<int:pk>/", SubscriptionDetailView.as_view(), name="subscription-detail"),
    path("<int:pk>/checkout/", SubscriptionCheckoutView.as_view(), name="subscription-checkout"),
    path("<int:pk>/pause/", SubscriptionActionView.as_view(), {"action": "pause"}, name="subscription-pause"),
    path("<int:pk>/resume/", SubscriptionActionView.as_view(), {"action": "resume"}, name="subscription-resume"),
    path("<int:pk>/cancel/", SubscriptionActionView.as_view(), {"action": "cancel"}, name="subscription-cancel"),
]
