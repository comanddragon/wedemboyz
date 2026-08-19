from django.urls import path

from apps.discounts.api.views import (
    LoyaltyAccountView,
    LoyaltyRedeemView,
    LoyaltyTransactionListView,
    StampCardConfigDetailView,
    StampCardConfigListCreateView,
    StampCardRedeemView,
)

urlpatterns = [
    path("", LoyaltyAccountView.as_view(), name="loyalty-account"),
    path("transactions/", LoyaltyTransactionListView.as_view(), name="loyalty-transactions"),
    path("redeem/", LoyaltyRedeemView.as_view(), name="loyalty-redeem"),
    path("stamp-card/redeem/", StampCardRedeemView.as_view(), name="loyalty-stamp-card-redeem"),
    path(
        "admin/stamp-card-config/",
        StampCardConfigListCreateView.as_view(),
        name="stamp-card-config-list",
    ),
    path(
        "admin/stamp-card-config/<int:pk>/",
        StampCardConfigDetailView.as_view(),
        name="stamp-card-config-detail",
    ),
]
