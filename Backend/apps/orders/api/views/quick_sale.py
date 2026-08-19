from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.api.serializers import OrderDetailSerializer, StaffQuickSaleSerializer


class StaffQuickSaleView(APIView):
    """POST /api/v1/orders/quick-sale/ — staff-only walk-in sale, bypassing
    the full customer `/book` flow. Returns the created order plus whether
    it was paid immediately or added to the customer's credit tab."""

    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = StaffQuickSaleSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        return Response(
            {
                "order": OrderDetailSerializer(order).data,
                "on_credit": not serializer.validated_data["paid_now"],
            },
            status=status.HTTP_201_CREATED,
        )
