from django.urls import path

from apps.payments.api.views import RefundDecisionView, RefundDetailView, RefundListCreateView, RefundProcessView

urlpatterns = [
    path("", RefundListCreateView.as_view(), name="refund-list"),
    path("<int:pk>/", RefundDetailView.as_view(), name="refund-detail"),
    path("<int:pk>/approve/", RefundDecisionView.as_view(), {"decision": "approve"}, name="refund-approve"),
    path("<int:pk>/reject/", RefundDecisionView.as_view(), {"decision": "reject"}, name="refund-reject"),
    path("<int:pk>/process/", RefundProcessView.as_view(), name="refund-process"),
]
