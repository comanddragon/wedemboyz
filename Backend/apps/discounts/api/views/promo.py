from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.discounts.api.serializers import (
    DiscountCampaignSerializer,
    PromoCodeSerializer,
    PromoValidateSerializer,
)
from apps.discounts.models import DiscountCampaign, PromoCode
from core.permissions import IsStaffOrReadOnly
from services import pricing


class PromoValidateView(APIView):
    """POST /api/v1/discounts/validate/ — preview a promo's discount amount
    for a given order total, without consuming a use."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PromoValidateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        promo = serializer.validated_data["promo"]
        order_total = serializer.validated_data["order_total"]

        discount_amount = pricing.apply_discount(order_total, promo.discount_type, promo.value)
        return Response(
            {
                "code": promo.code,
                "discount_amount": discount_amount,
                "total_after_discount": order_total - discount_amount,
            }
        )


class PromoCodeListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/discounts/promo-codes/ — staff manage; any
    authenticated user can browse currently active codes."""

    serializer_class = PromoCodeSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = PromoCode.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/discounts/promo-codes/{id}/"""

    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    permission_classes = [IsStaffOrReadOnly]


class DiscountCampaignListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/discounts/campaigns/"""

    serializer_class = DiscountCampaignSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = DiscountCampaign.objects.all()
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs


class DiscountCampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/discounts/campaigns/{id}/"""

    queryset = DiscountCampaign.objects.all()
    serializer_class = DiscountCampaignSerializer
    permission_classes = [IsStaffOrReadOnly]
