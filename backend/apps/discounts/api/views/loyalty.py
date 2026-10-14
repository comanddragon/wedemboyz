from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.discounts.api.serializers import (
    LoyaltyAccountSerializer,
    LoyaltyTransactionSerializer,
    RedeemPointsSerializer,
    StampCardConfigSerializer,
)
from apps.discounts.models import LoyaltyTransaction, StampCardConfig
from apps.users.models import LoyaltyAccount
from services.loyalty import redeem_free_wash, redeem_points


class LoyaltyAccountView(generics.RetrieveAPIView):
    """GET /api/v1/loyalty/ — points balance, tier, and (if configured) the
    stamp-card view derived from the same points ledger."""

    serializer_class = LoyaltyAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        account, _ = LoyaltyAccount.objects.get_or_create(user=self.request.user)
        return account


class LoyaltyTransactionListView(generics.ListAPIView):
    """GET /api/v1/loyalty/transactions/"""

    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LoyaltyTransaction.objects.filter(loyalty_account__user=self.request.user).select_related("order")


class LoyaltyRedeemView(APIView):
    """POST /api/v1/loyalty/redeem/ — redeem an arbitrary points amount
    (e.g. for a checkout discount)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RedeemPointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        account, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        try:
            transaction = redeem_points(
                account, serializer.validated_data["points"], serializer.validated_data.get("note", "")
            )
        except ValueError as exc:
            raise ValidationError(str(exc))

        return Response(LoyaltyTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


class StampCardRedeemView(APIView):
    """POST /api/v1/loyalty/stamp-card/redeem/ — redeem exactly one full
    stamp card (one free wash) worth of points in a single tap, instead of
    the customer having to know/enter the point count themselves."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        account, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        try:
            transaction = redeem_free_wash(account)
        except ValueError as exc:
            raise ValidationError(str(exc))

        return Response(LoyaltyTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


class StampCardConfigListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/loyalty/admin/stamp-card-config/ — staff-only. The
    most recently created is_active=True row is the live configuration."""

    serializer_class = StampCardConfigSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = StampCardConfig.objects.all()


class StampCardConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/loyalty/admin/stamp-card-config/{id}/"""

    serializer_class = StampCardConfigSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = StampCardConfig.objects.all()
