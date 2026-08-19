from django.urls import path

from apps.payments.api.views import (
    PaymentDetailView,
    PaymentListCreateView,
    PaymentMethodDetailView,
    PaymentMethodListCreateView,
    SetDefaultPaymentMethodView,
)

urlpatterns = [
    path("", PaymentListCreateView.as_view(), name="payment-list"),
    path("<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),
    path("methods/", PaymentMethodListCreateView.as_view(), name="payment-method-list"),
    path("methods/<int:pk>/", PaymentMethodDetailView.as_view(), name="payment-method-detail"),
    path("methods/<int:pk>/set-default/", SetDefaultPaymentMethodView.as_view(), name="payment-method-set-default"),
]
