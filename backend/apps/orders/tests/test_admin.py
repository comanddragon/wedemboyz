import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from apps.discounts.api.serializers.loyalty import AmbassadorCreateSerializer
from apps.discounts.models import AmbassadorCredit
from apps.orders.admin import OrderAdmin
from apps.orders.models import Order
from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("bulk", [False, True])
def test_admin_deletes_orders_and_cascades_ambassador_credit(bulk):
    user = CustomUser.objects.create_user(phone_number="237677920001", password="test")
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    ambassador.credit_balance = 250
    ambassador.lifetime_credits = 250
    ambassador.save()
    order = Order.objects.create(user=user, pickup_address="A", delivery_address="B")
    credit = AmbassadorCredit.objects.create(
        ambassador=ambassador, order=order, order_amount=5000, credit_amount=250
    )
    model_admin = OrderAdmin(Order, AdminSite())
    request = RequestFactory().post("/admin/orders/order/")
    queryset = Order.objects.filter(pk=order.pk)
    objects, counts, permissions, protected = model_admin.get_deleted_objects(queryset, request)
    assert objects
    assert not permissions
    assert not protected

    if bulk:
        model_admin.delete_queryset(request, queryset)
    else:
        model_admin.delete_model(request, order)

    assert not Order.objects.filter(pk=order.pk).exists()
    assert not Order.all_objects.filter(pk=order.pk).exists()
    assert not AmbassadorCredit.objects.filter(pk=credit.pk).exists()
    assert type(ambassador).objects.filter(pk=ambassador.pk).exists()
