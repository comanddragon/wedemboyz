from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import generics, permissions
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.finance.api.serializers import (
    CreditAccountDetailSerializer,
    CreditAccountSerializer,
    CreditTransactionInputSerializer,
    CreditTransactionSerializer,
)
from apps.finance.models import CreditAccount, CreditTransaction

User = get_user_model()


class CreditAccountListView(generics.ListAPIView):
    """GET /api/v1/finance/credit-accounts/?search=&ordering=&outstanding_only=

    Defaults to only customers who currently owe something — the
    "clients à crédit" view. Pass outstanding_only=false to see everyone
    with a credit account, including settled ones."""

    serializer_class = CreditAccountSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = CreditAccount.objects.select_related("user").prefetch_related("transactions")

        if self.request.query_params.get("outstanding_only", "true").lower() != "false":
            qs = qs.filter(balance__gt=0)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                models.Q(user__first_name__icontains=search)
                | models.Q(user__last_name__icontains=search)
                | models.Q(user__phone_number__icontains=search)
            )

        ordering = self.request.query_params.get("ordering")
        if ordering in {"balance", "-balance", "updated_at", "-updated_at"}:
            qs = qs.order_by(ordering)

        return qs


class CreditAccountDetailView(generics.RetrieveAPIView):
    """GET /api/v1/finance/credit-accounts/{user_id}/"""

    serializer_class = CreditAccountDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = CreditAccount.objects.select_related("user").prefetch_related("transactions")
    lookup_field = "user_id"
    lookup_url_kwarg = "user_id"


class CreditAccountChargeView(APIView):
    """POST /api/v1/finance/credit-accounts/{user_id}/charge/
    Staff records that a customer took goods/services on credit."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        account, _ = CreditAccount.objects.get_or_create(user=user)

        serializer = CreditTransactionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        CreditTransaction.objects.create(
            credit_account=account,
            transaction_type=CreditTransaction.TransactionType.CHARGE,
            amount=data["amount"],
            order_id=data["order_id"],
            note=data["note"],
            created_by=request.user,
        )
        account.refresh_from_db()
        return Response(CreditAccountDetailSerializer(account).data)


class CreditAccountPayView(APIView):
    """POST /api/v1/finance/credit-accounts/{user_id}/pay/
    Staff records a repayment against the customer's balance."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        account = get_object_or_404(CreditAccount, user=user)

        serializer = CreditTransactionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        CreditTransaction.objects.create(
            credit_account=account,
            transaction_type=CreditTransaction.TransactionType.PAYMENT,
            amount=data["amount"],
            order_id=data["order_id"],
            note=data["note"],
            created_by=request.user,
        )
        account.refresh_from_db()
        return Response(CreditAccountDetailSerializer(account).data)


class CreditTransactionListView(generics.ListAPIView):
    """GET /api/v1/finance/credit-accounts/{user_id}/transactions/"""

    serializer_class = CreditTransactionSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        account = get_object_or_404(CreditAccount, user_id=self.kwargs["user_id"])
        return account.transactions.all()
