from datetime import date
import csv

from django.db import transaction
from django.http import HttpResponse
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.finance.api.serializers.payroll import PayrollEntrySerializer
from apps.finance.models import PayrollEntry
from apps.staff.models import StaffProfile
from apps.staff.permissions import IsStaffManager


def payroll_queryset(params):
    queryset = PayrollEntry.objects.select_related("employee", "employee__staff_profile", "created_by")
    period = params.get("period")
    status = params.get("status")
    if period:
        queryset = queryset.filter(pay_period__year=period[:4], pay_period__month=period[5:7])
    if status:
        queryset = queryset.filter(status=status)
    return queryset


class PayrollEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsStaffManager]

    def get_queryset(self):
        return payroll_queryset(self.request.query_params)


class PayrollEntryDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsStaffManager]
    queryset = PayrollEntry.objects.select_related("employee", "employee__staff_profile", "created_by")


class PayrollGenerateView(APIView):
    permission_classes = [IsStaffManager]

    @transaction.atomic
    def post(self, request):
        period_value = request.data.get("period")
        try:
            pay_period = date.fromisoformat(f"{period_value}-01")
        except (TypeError, ValueError) as exc:
            raise ValidationError({"period": "Use YYYY-MM format."}) from exc

        profiles = StaffProfile.objects.select_related("user").filter(
            is_active=True,
            employment_status=StaffProfile.EmploymentStatus.ACTIVE,
            base_salary__isnull=False,
            base_salary__gt=0,
        )
        created = []
        skipped = 0
        for profile in profiles:
            entry, was_created = PayrollEntry.objects.get_or_create(
                employee=profile.user,
                pay_period=pay_period,
                defaults={"amount": profile.base_salary, "created_by": request.user},
            )
            if was_created:
                created.append(entry)
            else:
                skipped += 1
        return Response({
            "created": PayrollEntrySerializer(created, many=True).data,
            "created_count": len(created),
            "skipped_count": skipped,
        })


class PayrollExportView(APIView):
    permission_classes = [IsStaffManager]

    def get(self, request):
        queryset = payroll_queryset(request.query_params)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="wedemboyz-payroll.csv"'
        writer = csv.writer(response)
        writer.writerow(["Period", "Staff", "Role", "Amount", "Currency", "Status", "Paid on", "Notes"])
        for entry in queryset:
            profile = getattr(entry.employee, "staff_profile", None)
            writer.writerow([
                entry.pay_period, entry.employee.get_full_name() or entry.employee.phone_number,
                getattr(profile, "role", ""), entry.amount, entry.currency,
                entry.status, entry.paid_on or "", entry.notes,
            ])
        return response
