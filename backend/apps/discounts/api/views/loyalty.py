from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.discounts.api.serializers import (
    LoyaltyAccountSerializer,
    LoyaltyTransactionSerializer,
    RedeemPointsSerializer,
    StampCardConfigSerializer,
    LoyaltyAdjustmentSerializer,
    LoyaltyRuleSerializer,
    LoyaltyTierConfigSerializer,
)
from apps.discounts.models import LoyaltyRule, LoyaltyTierConfig, LoyaltyTransaction, StampCardConfig
from apps.users.models import LoyaltyAccount
from apps.staff.permissions import HasStaffPermission, StaffPermission
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
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    queryset = StampCardConfig.objects.all()


class StampCardConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/loyalty/admin/stamp-card-config/{id}/"""

    serializer_class = StampCardConfigSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    queryset = StampCardConfig.objects.all()


class LoyaltyRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = LoyaltyRuleSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    queryset = LoyaltyRule.objects.all()


class LoyaltyRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LoyaltyRuleSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    queryset = LoyaltyRule.objects.all()


class LoyaltyTierConfigListView(generics.ListAPIView):
    serializer_class = LoyaltyTierConfigSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    pagination_class = None
    queryset = LoyaltyTierConfig.objects.all()


class LoyaltyTierConfigDetailView(generics.UpdateAPIView):
    serializer_class = LoyaltyTierConfigSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE
    queryset = LoyaltyTierConfig.objects.all()


class CustomerLoyaltyAdjustmentView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.LOYALTY_MANAGE

    def post(self, request, user_id):
        serializer = LoyaltyAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account, _ = LoyaltyAccount.objects.get_or_create(user_id=user_id)
        points = serializer.validated_data["points"]
        if account.points_balance + points < 0:
            raise ValidationError("This adjustment would make the balance negative.")
        account.points_balance += points
        if points > 0:
            account.lifetime_points_earned += points
        from services.loyalty import _tier_for_lifetime_points
        account.tier = _tier_for_lifetime_points(account.lifetime_points_earned)
        account.save(update_fields=["points_balance", "lifetime_points_earned", "tier"])
        transaction = LoyaltyTransaction.objects.create(
            loyalty_account=account,
            points=points,
            transaction_type=LoyaltyTransaction.TransactionType.ADJUST,
            note=serializer.validated_data["reason"],
        )
        return Response(LoyaltyTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


class CustomerLoyaltyTransactionsView(generics.ListAPIView):
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CUSTOMERS_VIEW

    def get_queryset(self):
        return LoyaltyTransaction.objects.filter(loyalty_account__user_id=self.kwargs["user_id"]).select_related("order")
