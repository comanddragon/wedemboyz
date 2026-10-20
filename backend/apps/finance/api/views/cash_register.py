from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.finance.api.serializers.cash_register import CashRegisterCloseSerializer, CashRegisterDaySerializer
from apps.finance.models import CashRegisterDay
from apps.staff.permissions import HasStaffPermission, StaffPermission


class CashRegisterListCreateView(generics.ListCreateAPIView):
    serializer_class = CashRegisterDaySerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE
    queryset = CashRegisterDay.objects.select_related("opened_by", "closed_by")


class CashRegisterCloseView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE

    def post(self, request, pk):
        register = generics.get_object_or_404(CashRegisterDay, pk=pk)
        if register.status == CashRegisterDay.Status.CLOSED:
            raise ValidationError("This cash register day is already closed.")
        serializer = CashRegisterCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        register.counted_cash = serializer.validated_data["counted_cash"]
        register.cash_expenses = serializer.validated_data.get("cash_expenses", register.cash_expenses)
        register.notes = serializer.validated_data.get("notes", register.notes)
        register.status = CashRegisterDay.Status.CLOSED
        register.closed_by = request.user
        register.closed_at = timezone.now()
        register.save()
        return Response(CashRegisterDaySerializer(register).data)
