from django.db.models import Count, Q, Sum
from rest_framework import generics, permissions

from apps.users.api.serializers.customer import CustomerDetailSerializer, CustomerListSerializer
from apps.users.models import CustomUser
from core.constants import OrderStatus

ALLOWED_ORDERINGS = {
    "created_at",
    "-created_at",
    "lifetime_spend",
    "-lifetime_spend",
    "orders_count",
    "-orders_count",
    "first_name",
    "-first_name",
}

# Orders that were actually fulfilled/billed — cancelled orders shouldn't
# count toward a customer's lifetime spend.
BILLABLE_STATUSES = [s for s in OrderStatus.values if s != OrderStatus.CANCELLED]


class CustomerListView(generics.ListAPIView):
    """GET /api/v1/users/customers/?search=&ordering= — staff-only customer
    directory ("fiche client" list): order count, lifetime spend, loyalty
    tier, and outstanding credit balance per customer."""

    serializer_class = CustomerListSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = (
            CustomUser.objects.filter(is_staff=False)
            .select_related("profile", "loyalty_account", "credit_account")
            .annotate(
                orders_count=Count("orders", distinct=True),
                lifetime_spend=Sum(
                    "orders__total_amount", filter=Q(orders__status__in=BILLABLE_STATUSES)
                ),
            )
        )

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(email__icontains=search)
            )

        ordering = self.request.query_params.get("ordering")
        if ordering in ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)

        return qs


class CustomerDetailView(generics.RetrieveAPIView):
    """GET /api/v1/users/customers/{id}/ — full fiche client."""

    serializer_class = CustomerDetailSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return (
            CustomUser.objects.filter(is_staff=False)
            .select_related("profile", "loyalty_account", "credit_account")
            .annotate(
                orders_count=Count("orders", distinct=True),
                lifetime_spend=Sum(
                    "orders__total_amount", filter=Q(orders__status__in=BILLABLE_STATUSES)
                ),
            )
        )
