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


@pytest.mark.parametrize("bulk", [False, True])
def test_archived_order_is_accessible_in_admin_and_can_be_permanently_deleted(bulk, create_user):
    from django.db.models.deletion import ProtectedError

    customer = create_user()
    order = Order.objects.create(user=customer, pickup_address="A", delivery_address="B")
    order.delete()
    assert not Order.objects.filter(pk=order.pk).exists()
    with pytest.raises(ProtectedError):
        customer.delete()

    model_admin = OrderAdmin(Order, AdminSite())
    request = RequestFactory().get(f"/admin/orders/order/{order.pk}/change/")
    archived = model_admin.get_object(request, str(order.pk))
    assert archived is not None
    assert model_admin.archived(archived)
    if bulk:
        model_admin.delete_queryset(request, model_admin.get_queryset(request).filter(pk=order.pk))
    else:
        model_admin.delete_model(request, archived)
    assert not Order.all_objects.filter(pk=order.pk).exists()
    customer.delete()
    assert not CustomUser.objects.filter(pk=customer.pk).exists()


def test_archived_order_change_page_opens(client, create_user):
    from django.urls import reverse

    owner = create_user(is_staff=True, is_superuser=True)
    order = Order.objects.create(user=owner, pickup_address="A", delivery_address="B")
    order.delete()
    client.force_login(owner)
    response = client.get(reverse("admin:orders_order_change", args=[order.pk]))
    assert response.status_code == 200
    assert response.context["original"].pk == order.pk
