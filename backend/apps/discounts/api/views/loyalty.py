from datetime import date

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
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
        return LoyaltyTransaction.objects.filter(
            loyalty_account__user=self.request.user
        ).select_related("order")


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
                account,
                serializer.validated_data["points"],
                serializer.validated_data.get("note", ""),
            )
        except ValueError as exc:
            raise ValidationError(str(exc))

        return Response(
            LoyaltyTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED
        )


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

    @transaction.atomic
    def post(self, request, user_id):
        serializer = LoyaltyAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account, _ = LoyaltyAccount.objects.select_for_update().get_or_create(user_id=user_id)
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
        return Response(
            LoyaltyTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED
        )


class CustomerLoyaltyTransactionsView(generics.ListAPIView):
    serializer_class = LoyaltyTransactionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CUSTOMERS_VIEW

    def get_queryset(self):
        return LoyaltyTransaction.objects.filter(
            loyalty_account__user_id=self.kwargs["user_id"]
        ).select_related("order")


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
        return (
            AmbassadorCreateSerializer
            if self.request.method == "POST"
            else AmbassadorProfileSerializer
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(AmbassadorProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AmbassadorAdminDetailView(generics.UpdateAPIView):
    permission_classes = [IsStaffManager]
    serializer_class = AmbassadorProfileSerializer
    queryset = AmbassadorProfile.objects.select_for_update().all()

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        from apps.discounts.models import PromoCode

        profile = self.get_object()
        if "credit_balance" in request.data:
            try:
                profile.credit_balance = serializers.DecimalField(
                    max_digits=12, decimal_places=0, min_value=0
                ).run_validation(request.data["credit_balance"])
            except ValidationError as exc:
                raise ValidationError({"credit_balance": exc.detail}) from exc
        if "is_active" in request.data:
            value = request.data["is_active"]
            if not isinstance(value, bool):
                raise ValidationError({"is_active": "Use true or false."})
            profile.is_active = value
            profile.promo_code.is_active = value
        if "promo_code" in request.data:
            import re

            code = str(request.data["promo_code"]).strip().upper()
            if not re.fullmatch(r"[A-Z0-9_-]{2,30}", code):
                raise ValidationError(
                    {"promo_code": "Use 2–30 letters, digits, hyphens or underscores."}
                )
            if (
                PromoCode.objects.filter(code__iexact=code)
                .exclude(pk=profile.promo_code_id)
                .exists()
            ):
                raise ValidationError({"promo_code": "This code is already in use."})
            profile.promo_code.code = code
        profile.promo_code.save(update_fields=["code", "is_active", "updated_at"])
        profile.save(update_fields=["is_active", "credit_balance", "updated_at"])
        return Response(AmbassadorProfileSerializer(profile).data)


class AmbassadorLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        current = None
        if request.user.is_authenticated:
            current = AmbassadorProfile.objects.filter(user=request.user, is_active=True).first()

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
            credit_filter = {
                "credits__created_at__year": selected_year,
                "credits__created_at__month": selected_month,
            }
        elif period == "year":
            credit_filter = {"credits__created_at__year": selected_year}
            label = str(selected_year)
        elif period == "all":
            label = "All time"
        else:
            raise ValidationError({"period": "Use month, year, or all."})

        profiles = AmbassadorProfile.objects.filter(is_active=True).select_related(
            "user", "user__profile", "promo_code"
        )
        rows = []
        for profile in profiles:
            credits = AmbassadorCredit.objects.filter(
                ambassador=profile,
                **{key.replace("credits__", ""): value for key, value in credit_filter.items()},
            )
            rows.append(
                {
                    "ambassador": {
                        "id": profile.id,
                        "name": profile.user.get_full_name() or "Ambassador",
                        "promo_code": profile.promo_code.code,
                        "profile_photo": AmbassadorProfileSerializer(
                            profile, context={"request": request}
                        ).data["profile_photo"],
                    },
                    "period_credits": int(
                        credits.aggregate(total=Sum("credit_amount"))["total"] or 0
                    ),
                    "orders": credits.count(),
                    "referred_revenue": int(
                        credits.aggregate(total=Sum("order_amount"))["total"] or 0
                    ),
                }
            )
        rows.sort(
            key=lambda row: (-row["period_credits"], -row["orders"], row["ambassador"]["name"])
        )
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        return Response(
            {
                "period": period,
                "period_label": label,
                "current_ambassador_id": current.id if current else None,
                "results": rows,
            }
        )


class CreditOrderPaymentView(APIView):
    permission_classes = [IsRegisteredUser]

    @transaction.atomic
    def post(self, request):
        from rest_framework.generics import get_object_or_404

        from apps.orders.models import Order
        from apps.payments.api.serializers import PaymentSerializer
        from apps.payments.models import Payment
        from core.constants import PaymentGateway, PaymentStatus
        from services.order_payments import recompute_payment_status

        order_id = request.data.get("order_id")
        if not str(order_id).isdigit():
            raise ValidationError({"order_id": "Choose an order."})
        order = get_object_or_404(Order.objects.select_for_update(), pk=order_id, user=request.user)
        if order.status == "CANCELLED":
            raise ValidationError("A cancelled order cannot be paid.")
        order = recompute_payment_status(order)
        amount = order.balance_due
        if amount != int(amount):
            raise ValidationError("Credit payments require a whole XAF balance.")
        if amount <= 0:
            raise ValidationError("This order is already paid.")
        account, _ = LoyaltyAccount.objects.select_for_update().get_or_create(user=request.user)
        try:
            entry = redeem_points(account, int(amount), note=f"Payment for order #{order.pk}")
        except ValueError as exc:
            raise ValidationError(str(exc))
        entry.order = order
        entry.save(update_fields=["order"])
        payment = Payment.objects.create(
            order=order,
            gateway=PaymentGateway.CREDIT,
            payment_method_type="OTHER",
            amount=amount,
            currency=order.currency,
            status=PaymentStatus.SUCCEEDED,
            paid_at=timezone.now(),
            reference=f"CREDITS-{entry.pk}",
            notes="Paid with loyalty credits",
        )
        recompute_payment_status(order, changed_by=request.user, reason="Paid with loyalty credits")
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


def cashout_data(cashout):
    return {
        "id": cashout.pk,
        "ambassador": cashout.ambassador_id,
        "ambassador_name": cashout.ambassador.user.get_full_name()
        or cashout.ambassador.user.phone_number,
        "amount": str(cashout.amount),
        "status": "PAID" if cashout.paid_at else "PENDING",
        "created_at": cashout.created_at,
        "paid_at": cashout.paid_at,
        "reference": cashout.reference,
    }


class AmbassadorCashoutView(APIView):
    permission_classes = [IsRegisteredUser]

    def get(self, request):
        from apps.discounts.models import AmbassadorCashout

        rows = AmbassadorCashout.objects.filter(ambassador__user=request.user).select_related(
            "ambassador__user"
        )
        return Response([cashout_data(row) for row in rows])

    @transaction.atomic
    def post(self, request):
        from decimal import Decimal

        from rest_framework import serializers
        from rest_framework.generics import get_object_or_404

        from apps.discounts.models import AmbassadorCashout

        amount_field = serializers.DecimalField(
            max_digits=12, decimal_places=0, min_value=Decimal("1")
        )
        amount = amount_field.run_validation(request.data.get("amount"))
        profile = get_object_or_404(
            AmbassadorProfile.objects.select_for_update(), user=request.user, is_active=True
        )
        if amount > profile.credit_balance:
            raise ValidationError({"amount": "Insufficient ambassador credits."})
        profile.credit_balance -= amount
        profile.save(update_fields=["credit_balance", "updated_at"])
        row = AmbassadorCashout.objects.create(ambassador=profile, amount=amount)
        return Response(cashout_data(row), status=status.HTTP_201_CREATED)


class IsBusinessOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        from apps.staff.permissions import get_staff_role

        return get_staff_role(request.user) == "OWNER"


class AmbassadorCashoutAdminView(APIView):
    permission_classes = [IsBusinessOwner]

    def get(self, request):
        from apps.discounts.models import AmbassadorCashout

        return Response(
            [
                cashout_data(row)
                for row in AmbassadorCashout.objects.select_related("ambassador__user")
            ]
        )


class AmbassadorCashoutPayView(APIView):
    permission_classes = [IsBusinessOwner]

    @transaction.atomic
    def post(self, request, pk):
        from rest_framework.generics import get_object_or_404

        from apps.discounts.models import AmbassadorCashout

        row = get_object_or_404(
            AmbassadorCashout.objects.select_for_update().select_related("ambassador__user"), pk=pk
        )
        if row.paid_at:
            raise ValidationError("This cashout is already paid.")
        reference = str(request.data.get("reference", "")).strip()
        if not reference or len(reference) > 255:
            raise ValidationError(
                {"reference": "Provide a payment reference (maximum 255 characters)."}
            )
        row.paid_at = timezone.now()
        row.paid_by = request.user
        row.reference = reference
        row.save(update_fields=["paid_at", "paid_by", "reference", "updated_at"])
        return Response(cashout_data(row))
