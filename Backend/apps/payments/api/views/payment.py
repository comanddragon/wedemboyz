from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.serializers import PaymentInitiateSerializer, PaymentMethodSerializer, PaymentSerializer
from apps.payments.models import Payment, PaymentMethod


class PaymentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/payments/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related("order", "method", "subscription")
        if self.request.user.is_staff:
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
        qs = Payment.objects.select_related("order", "method", "subscription")
        if self.request.user.is_staff:
            return qs
        return qs.filter(Q(order__user=self.request.user) | Q(subscription__user=self.request.user))


class PaymentMethodListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/payments/methods/"""

    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

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
