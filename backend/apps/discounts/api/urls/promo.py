from django.urls import path

from apps.discounts.api.views import (
    DiscountCampaignDetailView,
    DiscountCampaignListCreateView,
    PromoCodeDetailView,
    PromoCodeListCreateView,
    PromoValidateView,
)

urlpatterns = [
    path("validate/", PromoValidateView.as_view(), name="promo-validate"),
    path("promo-codes/", PromoCodeListCreateView.as_view(), name="promo-code-list"),
    path("promo-codes/<int:pk>/", PromoCodeDetailView.as_view(), name="promo-code-detail"),
    path("campaigns/", DiscountCampaignListCreateView.as_view(), name="campaign-list"),
    path("campaigns/<int:pk>/", DiscountCampaignDetailView.as_view(), name="campaign-detail"),
]
