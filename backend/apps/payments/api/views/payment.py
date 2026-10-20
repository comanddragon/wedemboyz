from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.payments.api.serializers import (
    ManualPaymentSerializer,
    PaymentInitiateSerializer,
    PaymentMethodSerializer,
    PaymentSerializer,
)
from apps.payments.models import Payment, PaymentMethod
from apps.staff.models import log_activity
from apps.staff.permissions import HasStaffPermission, StaffPermission, has_staff_permission
from core.constants import PaymentGateway, PaymentStatus
from services.order_payments import recompute_payment_status


class PaymentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/payments/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related(
            "order", "order__user", "method", "subscription", "received_by"
        )
        method = self.request.query_params.get("method")
        order_id = self.request.query_params.get("order")
        staff_id = self.request.query_params.get("staff")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if method:
            qs = qs.filter(payment_method_type=method)
        if order_id and order_id.isdigit():
            qs = qs.filter(order_id=int(order_id))
        if staff_id and staff_id.isdigit():
            qs = qs.filter(received_by_id=int(staff_id))
        if date_from:
            qs = qs.filter(received_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(received_at__date__lte=date_to)
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
            return qs
        return qs.filter(Q(order__user=self.request.user) | Q(subscription__user=self.request.user))

    def get_serializer_class(self):
        return PaymentInitiateSerializer if self.request.method == "POST" else PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentDetailView(generics.RetrieveAPIView):
    """GET /api/v1/payments/{id}/"""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related(
            "order", "order__user", "method", "subscription", "received_by"
        )
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
            return qs
        return qs.filter(Q(order__user=self.request.user) | Q(subscription__user=self.request.user))


class OrderPaymentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_order(self, request, pk):
        order = get_object_or_404(Order.objects.select_related("user"), pk=pk)
        can_view = has_staff_permission(request.user, StaffPermission.PAYMENTS_VIEW)
        if not (can_view or order.user_id == request.user.id):
            raise PermissionDenied("You do not have access to this order's payments.")
        return order

    def get(self, request, pk):
        order = self.get_order(request, pk)
        payments = order.payments.select_related("received_by").order_by("-received_at")
        return Response(PaymentSerializer(payments, many=True).data)

    @transaction.atomic
    def post(self, request, pk):
        if not has_staff_permission(request.user, StaffPermission.PAYMENTS_RECORD):
            raise PermissionDenied("Your staff role cannot record payments.")
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        serializer = ManualPaymentSerializer(data=request.data, context={"order": order})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        amount = data["amount"]
        tendered = data.get("tendered_amount")
        payment = Payment.objects.create(
            order=order,
            gateway=PaymentGateway.CASH,
            amount=amount,
            currency=order.currency,
            status=PaymentStatus.SUCCEEDED,
            paid_at=data.get("received_at", timezone.now()),
            payment_method_type=data["payment_method_type"],
            reference=data.get("reference", ""),
            received_by=request.user,
            received_at=data.get("received_at", timezone.now()),
            payer_name=data.get("payer_name", ""),
            payer_phone=data.get("payer_phone", ""),
            notes=data.get("notes", ""),
            tendered_amount=tendered,
            change_given=max((tendered or amount) - amount, Decimal("0")),
        )
        recompute_payment_status(
            order, changed_by=request.user, reason=f"Recorded payment #{payment.pk}"
        )
        log_activity(
            request.user,
            "payment.recorded",
            f"Recorded {amount} {order.currency} for order #{order.pk}",
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class OrderMarkPaidView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.PAYMENTS_RECORD

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk)
        if order.balance_due <= 0:
            raise ValidationError("This order has no outstanding balance.")
        serializer = ManualPaymentSerializer(
            data={
                **request.data,
                "amount": order.balance_due,
            },
            context={"order": order},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        amount = data["amount"]
        tendered = data.get("tendered_amount")
        payment = Payment.objects.create(
            order=order,
            gateway=PaymentGateway.CASH,
            amount=amount,
            currency=order.currency,
            status=PaymentStatus.SUCCEEDED,
            paid_at=data.get("received_at", timezone.now()),
            payment_method_type=data["payment_method_type"],
            reference=data.get("reference", ""),
            received_by=request.user,
            received_at=data.get("received_at", timezone.now()),
            payer_name=data.get("payer_name", ""),
            payer_phone=data.get("payer_phone", ""),
            notes=data.get("notes", ""),
            tendered_amount=tendered,
            change_given=max((tendered or amount) - amount, Decimal("0")),
        )
        recompute_payment_status(
            order, changed_by=request.user, reason=f"Marked paid with payment #{payment.pk}"
        )
        log_activity(
            request.user,
            "payment.recorded",
            f"Marked order #{order.pk} fully paid",
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentVoidView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.REFUNDS_MANAGE

    @transaction.atomic
    def post(self, request, pk):
        payment = get_object_or_404(
            Payment.objects.select_for_update().select_related("order"), pk=pk
        )
        if payment.voided_at:
            raise ValidationError("This payment is already voided.")
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "A void reason is required."})
        payment.voided_at = timezone.now()
        payment.voided_by = request.user
        payment.void_reason = reason
        payment.save(update_fields=["voided_at", "voided_by", "void_reason", "updated_at"])
        if payment.order_id:
            recompute_payment_status(
                payment.order, changed_by=request.user, reason=f"Voided payment #{payment.pk}"
            )
        log_activity(request.user, "payment.voided", f"Voided payment #{payment.pk}: {reason}")
        return Response(PaymentSerializer(payment).data)


class PaymentMethodListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/payments/methods/"""

    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]
    # A user only ever has a handful of payment methods, and the frontend
    # (paymentsApi.listPaymentMethods) expects a bare array back — same
    # reasoning as SubscriptionListCreateView.
    pagination_class = None

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        method = serializer.save(user=self.request.user)
        if method.is_default:
            PaymentMethod.objects.filter(user=self.request.user).exclude(pk=method.pk).update(is_default=False)


class PaymentMethodDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/v1/payments/methods/{id}/"""

    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)


class SetDefaultPaymentMethodView(APIView):
    """POST /api/v1/payments/methods/{id}/set-default/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        method = get_object_or_404(PaymentMethod, pk=pk, user=request.user)
        PaymentMethod.objects.filter(user=request.user).update(is_default=False)
        method.is_default = True
        method.save(update_fields=["is_default"])
        return Response(PaymentMethodSerializer(method).data)
