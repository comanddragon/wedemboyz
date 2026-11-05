from django.db.models import Count, F, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, permissions, status
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
        qs = PromoCode.objects.select_related("ambassador_profile")
        if not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        if self.request.query_params.get("available") == "true":
            now = timezone.now()
            return qs.filter(is_active=True, valid_from__lte=now, valid_until__gte=now).annotate(
                usage_count=Count("usages"),
                customer_usage_count=Count("usages", filter=Q(usages__user=self.request.user)),
            ).filter(
                Q(max_uses__isnull=True) | Q(usage_count__lt=F("max_uses")),
                customer_usage_count__lt=F("max_uses_per_user"),
            ).order_by("code")
        return qs


class PromoCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/discounts/promo-codes/{id}/"""

    queryset = PromoCode.objects.select_related("ambassador_profile")
    serializer_class = PromoCodeSerializer
    permission_classes = [IsStaffOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"detail": "This promo code is linked to an ambassador account and cannot be deleted. Pause the code to stop new uses while preserving ambassador balances and history."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


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
