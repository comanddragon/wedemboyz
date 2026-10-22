from datetime import date

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.discounts.api.serializers import (
    AmbassadorCreateSerializer,
    AmbassadorProfileSerializer,
    LoyaltyAccountSerializer,
    LoyaltyAdjustmentSerializer,
    LoyaltyProgramSettingsSerializer,
    LoyaltyRewardGrantSerializer,
    LoyaltyRewardSerializer,
    LoyaltyRuleSerializer,
    LoyaltyTierConfigSerializer,
    LoyaltyTransactionSerializer,
    RedeemPointsSerializer,
    RewardRedeemSerializer,
    StampCardConfigSerializer,
)
from apps.discounts.models import (
    AmbassadorCredit,
    AmbassadorProfile,
    LoyaltyProgramSettings,
    LoyaltyReward,
    LoyaltyRewardGrant,
    LoyaltyRule,
    LoyaltyTierConfig,
    LoyaltyTransaction,
    StampCardConfig,
)
from apps.staff.permissions import HasStaffPermission, IsStaffManager, StaffPermission
from apps.users.models import LoyaltyAccount
from core.permissions import IsRegisteredUser
from services.loyalty import redeem_points


class LoyaltyAccountView(generics.RetrieveAPIView):
    """GET /api/v1/loyalty/ — points balance, tier, and (if configured) the
    stamp-card view derived from the same points ledger."""

    serializer_class = LoyaltyAccountSerializer
    permission_classes = [IsRegisteredUser]

    def get_object(self):
        account, _ = LoyaltyAccount.objects.get_or_create(user=self.request.user)
        return account


class LoyaltyTransactionListView(generics.ListAPIView):
    """GET /api/v1/loyalty/transactions/"""

    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [IsRegisteredUser]

    def get_queryset(self):
        return LoyaltyTransaction.objects.filter(loyalty_account__user=self.request.user).select_related("order")


class LoyaltyRedeemView(APIView):
    """POST /api/v1/loyalty/redeem/ — redeem an arbitrary points amount
    (e.g. for a checkout discount)."""

    permission_classes = [IsRegisteredUser]

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


class LoyaltyRewardRedeemView(APIView):
    permission_classes = [IsRegisteredUser]

    @transaction.atomic
    def post(self, request):
        serializer = RewardRedeemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reward = LoyaltyReward.objects.get(
                pk=serializer.validated_data["reward_id"],
                track=LoyaltyReward.Track.CREDIT,
                is_active=True,
            )
        except LoyaltyReward.DoesNotExist:
            raise ValidationError("This reward is not available.")
        settings = LoyaltyProgramSettings.get_current()
        if not settings.credit_points_enabled:
            raise ValidationError("Credit rewards are currently paused.")
        account, _ = LoyaltyAccount.objects.select_for_update().get_or_create(user=request.user)
        try:
            redeem_points(account, reward.points_cost, note=f"Redeemed: {reward.name}")
        except ValueError as exc:
            raise ValidationError(str(exc))
        grant = LoyaltyRewardGrant.objects.create(reward=reward, user=request.user)
        return Response(LoyaltyRewardGrantSerializer(grant).data, status=status.HTTP_201_CREATED)


class StampCardRedeemView(APIView):
    """Legacy endpoint retained for old clients. Badge-card rewards are now
    independent of credits and are granted automatically at ten badges."""

    permission_classes = [IsRegisteredUser]

    def post(self, request):
        raise ValidationError(
            "Badge rewards are granted automatically when ten badges are completed."
        )


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


class LoyaltyProgramSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = LoyaltyProgramSettingsSerializer
    permission_classes = [IsStaffManager]

    def get_object(self):
        return LoyaltyProgramSettings.get_current()


class LoyaltyRewardListCreateView(generics.ListCreateAPIView):
    serializer_class = LoyaltyRewardSerializer
    permission_classes = [IsStaffManager]
    queryset = LoyaltyReward.objects.all()
    pagination_class = None


class LoyaltyRewardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LoyaltyRewardSerializer
    permission_classes = [IsStaffManager]
    queryset = LoyaltyReward.objects.all()


class AmbassadorAdminListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsStaffManager]
    pagination_class = None
    queryset = AmbassadorProfile.objects.select_related("user", "promo_code")

    def get_serializer_class(self):
        return AmbassadorCreateSerializer if self.request.method == "POST" else AmbassadorProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(AmbassadorProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AmbassadorAdminDetailView(generics.UpdateAPIView):
    permission_classes = [IsStaffManager]
    serializer_class = AmbassadorProfileSerializer
    queryset = AmbassadorProfile.objects.all()

    def patch(self, request, *args, **kwargs):
        profile = self.get_object()
        if "is_active" not in request.data:
            raise ValidationError({"is_active": "This field is required."})
        profile.is_active = bool(request.data["is_active"])
        profile.promo_code.is_active = profile.is_active
        profile.promo_code.save(update_fields=["is_active", "updated_at"])
        profile.save(update_fields=["is_active", "updated_at"])
        return Response(AmbassadorProfileSerializer(profile).data)


class AmbassadorLeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current = AmbassadorProfile.objects.select_related("user", "user__profile", "promo_code").filter(
            user=request.user, is_active=True
        ).first()
        if current is None and not request.user.is_staff:
            return Response({"detail": "Ambassador access required."}, status=status.HTTP_403_FORBIDDEN)
        if current is not None:
            profile = getattr(current.user, "profile", None)
            if not profile or not profile.avatar:
                return Response(
                    {"detail": "Upload a profile photo before entering the ambassador leaderboard."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        period = request.query_params.get("period", "month")
        today = timezone.localdate()
        try:
            selected_year = int(request.query_params.get("year", today.year))
            selected_month = int(request.query_params.get("month", today.month))
        except (TypeError, ValueError):
            raise ValidationError({"period": "Year and month must be numbers."})
        if not 1 <= selected_month <= 12:
            raise ValidationError({"month": "Month must be between 1 and 12."})
        if not 2000 <= selected_year <= 2100:
            raise ValidationError({"year": "Year must be between 2000 and 2100."})
        credit_filter = {}
        label = date(selected_year, selected_month, 1).strftime("%B %Y")
        if period == "month":
            credit_filter = {"credits__created_at__year": selected_year, "credits__created_at__month": selected_month}
        elif period == "year":
            credit_filter = {"credits__created_at__year": selected_year}
            label = str(selected_year)
        elif period == "all":
            label = "All time"
        else:
            raise ValidationError({"period": "Use month, year, or all."})

        profiles = (
            AmbassadorProfile.objects.filter(is_active=True)
            .exclude(user__profile__avatar="")
            .filter(user__profile__avatar__isnull=False)
            .select_related("user", "user__profile", "promo_code")
        )
        rows = []
        for profile in profiles:
            credits = AmbassadorCredit.objects.filter(ambassador=profile, **{
                key.replace("credits__", ""): value for key, value in credit_filter.items()
            })
            rows.append({
                "ambassador": AmbassadorProfileSerializer(profile).data,
                "period_credits": int(credits.aggregate(total=Sum("credit_amount"))["total"] or 0),
                "orders": credits.count(),
                "referred_revenue": int(credits.aggregate(total=Sum("order_amount"))["total"] or 0),
            })
        rows.sort(key=lambda row: (-row["period_credits"], -row["orders"], row["ambassador"]["name"]))
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        return Response({
            "period": period,
            "period_label": label,
            "current_ambassador_id": current.id if current else None,
            "results": rows,
        })
