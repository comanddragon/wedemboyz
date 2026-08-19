from rest_framework import generics, permissions

from apps.finance.api.serializers import ExpenseSerializer
from apps.finance.models import Expense


class ExpenseListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/finance/expenses/"""

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Expense.objects.select_related("created_by")
        category = self.request.query_params.get("category")
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if category:
            qs = qs.filter(category=category)
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        return qs


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/finance/expenses/{id}/"""

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Expense.objects.select_related("created_by")
