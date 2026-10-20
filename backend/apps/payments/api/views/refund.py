from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.serializers import RefundRequestSerializer, RefundSerializer
from apps.payments.models import Refund
from apps.staff.models import log_activity
from apps.staff.permissions import HasStaffPermission, StaffPermission, has_staff_permission


class RefundListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/refunds/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Refund.objects.select_related("payment", "payment__order")
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
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
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
            return qs
        return qs.filter(payment__order__user=self.request.user)


class RefundDecisionView(APIView):
    """POST /api/v1/refunds/{id}/approve/ or /reject/ — staff only."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.REFUNDS_MANAGE

    def post(self, request, pk, decision):
        refund = get_object_or_404(Refund, pk=pk)
        if refund.status != Refund.Status.PENDING:
            raise ValidationError("Only pending refunds can be approved or rejected.")

        refund.status = Refund.Status.APPROVED if decision == "approve" else Refund.Status.REJECTED
        refund.processed_by = request.user
        refund.processed_at = timezone.now()
        refund.save(update_fields=["status", "processed_by", "processed_at"])
        log_activity(
            request.user,
            f"refund.{decision}d",
            f"{decision.title()}d refund #{refund.pk}",
        )
        return Response(RefundSerializer(refund).data)


class RefundProcessView(APIView):
    """POST /api/v1/refunds/{id}/process/ — staff only. Marks an approved
    refund PROCESSED once the money has actually moved through the gateway
    (a manual confirmation step for MoMo/cash refunds)."""

    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.REFUNDS_MANAGE

    def post(self, request, pk):
        refund = get_object_or_404(
            Refund.objects.select_related("payment", "payment__order"), pk=pk
        )
        if refund.status != Refund.Status.APPROVED:
            raise ValidationError("Only approved refunds can be processed.")

        refund.status = Refund.Status.PROCESSED
        refund.processed_by = request.user
        refund.processed_at = timezone.now()
        refund.save(update_fields=["status", "processed_by", "processed_at"])

        payment = refund.payment

        if payment.order_id:
            from services.order_payments import recompute_payment_status

            recompute_payment_status(
                payment.order,
                changed_by=request.user,
                reason=f"Processed refund #{refund.pk}",
            )
        log_activity(
            request.user,
            "refund.processed",
            f"Processed refund #{refund.pk} for payment #{payment.pk}",
        )

        return Response(RefundSerializer(refund).data)
