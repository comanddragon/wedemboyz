from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.serializers import RefundRequestSerializer, RefundSerializer
from apps.payments.models import Refund
from core.constants import PaymentStatus


class RefundListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/refunds/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Refund.objects.select_related("payment", "payment__order")
        if self.request.user.is_staff:
            return qs
        return qs.filter(payment__order__user=self.request.user)

    def get_serializer_class(self):
        return RefundRequestSerializer if self.request.method == "POST" else RefundSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = serializer.save()
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)


class RefundDetailView(generics.RetrieveAPIView):
    """GET /api/v1/refunds/{id}/"""

    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Refund.objects.select_related("payment", "payment__order")
        if self.request.user.is_staff:
            return qs
        return qs.filter(payment__order__user=self.request.user)


class RefundDecisionView(APIView):
    """POST /api/v1/refunds/{id}/approve/ or /reject/ — staff only."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk, decision):
        refund = get_object_or_404(Refund, pk=pk)
        if refund.status != Refund.Status.PENDING:
            raise ValidationError("Only pending refunds can be approved or rejected.")

        refund.status = Refund.Status.APPROVED if decision == "approve" else Refund.Status.REJECTED
        refund.processed_by = request.user
        refund.processed_at = timezone.now()
        refund.save(update_fields=["status", "processed_by", "processed_at"])
        return Response(RefundSerializer(refund).data)


class RefundProcessView(APIView):
    """POST /api/v1/refunds/{id}/process/ — staff only. Marks an approved
    refund PROCESSED once the money has actually moved through the gateway
    (a manual confirmation step for MoMo/cash refunds)."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        refund = get_object_or_404(Refund, pk=pk)
        if refund.status != Refund.Status.APPROVED:
            raise ValidationError("Only approved refunds can be processed.")

        refund.status = Refund.Status.PROCESSED
        refund.save(update_fields=["status"])

        payment = refund.payment
        payment.status = (
            PaymentStatus.PARTIALLY_REFUNDED if refund.amount < payment.amount else PaymentStatus.REFUNDED
        )
        payment.save(update_fields=["status"])

        return Response(RefundSerializer(refund).data)
