from rest_framework import generics

from apps.finance.api.serializers.payroll import PayrollEntrySerializer
from apps.finance.models import PayrollEntry
from apps.staff.permissions import IsStaffManager


class PayrollEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsStaffManager]

    def get_queryset(self):
        queryset = PayrollEntry.objects.select_related("employee", "employee__staff_profile", "created_by")
        period = self.request.query_params.get("period")
        status = self.request.query_params.get("status")
        if period:
            queryset = queryset.filter(pay_period__year=period[:4], pay_period__month=period[5:7])
        if status:
            queryset = queryset.filter(status=status)
        return queryset


class PayrollEntryDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsStaffManager]
    queryset = PayrollEntry.objects.select_related("employee", "employee__staff_profile", "created_by")
