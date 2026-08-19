from rest_framework import generics, permissions

from apps.payments.api.serializers import InvoiceSerializer
from apps.payments.models import Invoice


class InvoiceListView(generics.ListAPIView):
    """GET /api/v1/invoices/"""

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related("order")
        if self.request.user.is_staff:
            return qs
        return qs.filter(order__user=self.request.user)


class InvoiceDetailView(generics.RetrieveAPIView):
    """GET /api/v1/invoices/{id}/"""

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related("order")
        if self.request.user.is_staff:
            return qs
        return qs.filter(order__user=self.request.user)
