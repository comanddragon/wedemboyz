from django.db.models import Count, Max, Q, Sum
from rest_framework import generics, permissions
from rest_framework import status
from rest_framework.response import Response

from apps.users.api.serializers.customer import CustomerDetailSerializer, CustomerListSerializer
from apps.users.models import CustomUser
from core.constants import OrderStatus
from apps.staff.permissions import HasStaffPermission, StaffPermission

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


class CustomerListView(generics.ListCreateAPIView):
    """GET /api/v1/users/customers/?search=&ordering= — staff-only customer
    directory ("fiche client" list): order count, lifetime spend, loyalty
    tier, and outstanding credit balance per customer."""

    serializer_class = CustomerListSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CUSTOMERS_VIEW

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.CUSTOMERS_VIEW
            if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.CUSTOMERS_MANAGE
        )
        return super().get_permissions()

    def get_serializer_class(self):
        return CustomerListSerializer if self.request.method == "GET" else CustomerDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        customer = self.get_queryset().get(pk=customer.pk)
        return Response(CustomerDetailSerializer(customer).data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = (
            CustomUser.objects.filter(is_staff=False)
            .select_related("profile", "loyalty_account", "credit_account")
            .annotate(
                orders_count=Count("orders", distinct=True),
                lifetime_spend=Sum(
                    "orders__total_amount", filter=Q(orders__status__in=BILLABLE_STATUSES)
                ),
                last_order_at=Max("orders__created_at"),
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
            qs = qs.order_by(ordering, "-id")
        else:
            # Pagination needs deterministic ordering. Aggregation can cause
            # Django to treat the model's Meta ordering as absent, so make the
            # default explicit and use the primary key to break timestamp ties.
            qs = qs.order_by("-created_at", "-id")

        tier = self.request.query_params.get("tier")
        if tier:
            qs = qs.filter(loyalty_account__tier=tier)
        active = self.request.query_params.get("active")
        if active in {"true", "false"}:
            qs = qs.filter(is_active=active == "true")
        has_credit = self.request.query_params.get("has_credit")
        if has_credit == "true":
            qs = qs.filter(credit_account__balance__gt=0)
        elif has_credit == "false":
            qs = qs.filter(Q(credit_account__isnull=True) | Q(credit_account__balance=0))
        source = self.request.query_params.get("source")
        if source:
            qs = qs.filter(profile__source=source)
        last_order_before = self.request.query_params.get("last_order_before")
        if last_order_before:
            qs = qs.filter(Q(last_order_at__date__lte=last_order_before) | Q(last_order_at__isnull=True))

        return qs


class CustomerDetailView(generics.RetrieveUpdateAPIView):
    """GET /api/v1/users/customers/{id}/ — full fiche client."""

    serializer_class = CustomerDetailSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CUSTOMERS_VIEW

    def get_permissions(self):
        self.required_staff_permission = (
            StaffPermission.CUSTOMERS_VIEW
            if self.request.method in permissions.SAFE_METHODS
            else StaffPermission.CUSTOMERS_MANAGE
        )
        return super().get_permissions()

    def get_queryset(self):
        return (
            CustomUser.objects.filter(is_staff=False)
            .select_related("profile", "loyalty_account", "credit_account")
            .annotate(
                orders_count=Count("orders", distinct=True),
                lifetime_spend=Sum(
                    "orders__total_amount", filter=Q(orders__status__in=BILLABLE_STATUSES)
                ),
                last_order_at=Max("orders__created_at"),
            )
        )
