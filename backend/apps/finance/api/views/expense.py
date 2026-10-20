import csv

from django.http import HttpResponse
from rest_framework import generics, permissions
from rest_framework.views import APIView

from apps.finance.api.serializers import ExpenseSerializer
from apps.finance.models import Expense
from apps.staff.permissions import HasStaffPermission, StaffPermission


def expense_queryset(params):
    queryset = Expense.objects.select_related("created_by")
    category = params.get("category")
    start = params.get("start")
    end = params.get("end")
    if category:
        queryset = queryset.filter(category=category)
    if start:
        queryset = queryset.filter(date__gte=start)
    if end:
        queryset = queryset.filter(date__lte=end)
    return queryset


class ExpenseListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/finance/expenses/"""

    serializer_class = ExpenseSerializer
    permission_classes = [HasStaffPermission]

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.FINANCE_VIEW if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.FINANCE_MANAGE
        )
        return super().get_permissions()

    def get_queryset(self):
        return expense_queryset(self.request.query_params)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/finance/expenses/{id}/"""

    serializer_class = ExpenseSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    queryset = Expense.objects.select_related("created_by")


class ExpenseExportView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.REPORTS_EXPORT

    def get(self, request):
        queryset = expense_queryset(request.query_params)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="wedemboyz-expenses.csv"'
        writer = csv.writer(response)
        writer.writerow(["Date", "Category", "Amount", "Currency", "Notes", "Recorded by"])
        for expense in queryset:
            writer.writerow([
                expense.date, expense.get_category_display(), expense.amount,
                expense.currency, expense.notes, str(expense.created_by or ""),
            ])
        return response
