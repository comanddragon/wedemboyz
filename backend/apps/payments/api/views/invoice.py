from rest_framework import generics, permissions

from apps.payments.api.serializers import InvoiceSerializer
from apps.payments.models import Invoice
from apps.staff.permissions import StaffPermission, has_staff_permission


class InvoiceListView(generics.ListAPIView):
    """GET /api/v1/invoices/"""

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related("order")
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
            return qs
        return qs.filter(order__user=self.request.user)


class InvoiceDetailView(generics.RetrieveAPIView):
    """GET /api/v1/invoices/{id}/"""

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.select_related("order")
        if has_staff_permission(self.request.user, StaffPermission.PAYMENTS_VIEW):
            return qs
        return qs.filter(order__user=self.request.user)
