from decimal import Decimal

import pytest

from apps.orders.models import Order, OrderItem
from core.constants import OrderStatus, ServiceType
from services.order_flow import validate_transition
from rest_framework.exceptions import ValidationError

pytestmark = pytest.mark.django_db


def test_owner_collection_workflow_is_visible_to_customer(api_client, create_user):
    customer = create_user(phone_number="237699040001")
    owner = create_user(phone_number="237699040002", is_staff=True, is_superuser=True)
    order = Order.objects.create(user=customer, pickup_address="Home", delivery_address="Home")
    api_client.force_authenticate(owner)
    for next_status in ["COLLECTED", "READY", "DELIVERED"]:
        response = api_client.post(f"/api/v1/orders/{order.pk}/status/", {"status": next_status}, format="json")
        assert response.status_code == 200, response.data
        order.refresh_from_db()
        assert order.status == next_status
        api_client.force_authenticate(customer)
        response = api_client.get(f"/api/v1/orders/{order.pk}/")
        assert response.data["status"] == next_status
        api_client.force_authenticate(owner)
    assert list(order.status_history.order_by("created_at").values_list("status", flat=True)) == ["PENDING", "COLLECTED", "READY", "DELIVERED"]
    assert order.ready_at is not None
    assert order.delivered_at is not None


def test_customer_cannot_change_status_and_cannot_skip_collection(api_client, create_user):
    customer = create_user()
    order = Order.objects.create(user=customer, pickup_address="Home", delivery_address="Home")
    api_client.force_authenticate(customer)
    assert api_client.post(f"/api/v1/orders/{order.pk}/status/", {"status": "COLLECTED"}).status_code == 403
    with pytest.raises(ValidationError):
        validate_transition(OrderStatus.PENDING, OrderStatus.READY)


def test_collecting_unweighed_order_keeps_payment_unpaid(api_client, create_user):
    customer = create_user(phone_number="237699040003")
    owner = create_user(phone_number="237699040004", is_staff=True, is_superuser=True)
    order = Order.objects.create(user=customer, pickup_address="Home", delivery_address="Home", delivery_fee=Decimal("500"))
    OrderItem.objects.create(order=order, service_type=ServiceType.LAVAGE_ESSORAGE, weight_kg=None, unit_price=Decimal("0"))
    order.recalculate_total()
    api_client.force_authenticate(owner)
    response = api_client.post(f"/api/v1/orders/{order.pk}/status/", {"status": "COLLECTED"}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["payment_status"] == "UNPAID"
    assert response.data["status"] == "COLLECTED"


def test_migration_normalizes_active_orders_without_erasing_history(create_user):
    import importlib
    from types import SimpleNamespace

    from django.apps import apps
    from django.db import connection

    customer = create_user()
    legacy = Order.objects.create(user=customer, status="IN_PROGRESS", pickup_address="Shop", delivery_address="Shop")
    dispatch = Order.objects.create(user=customer, status="OUT_FOR_DELIVERY", pickup_address="Shop", delivery_address="Shop")
    migration = importlib.import_module("apps.orders.migrations.0016_collected_order_workflow")
    migration.normalize_active_statuses(apps, SimpleNamespace(connection=connection))
    legacy.refresh_from_db()
    dispatch.refresh_from_db()
    assert legacy.status == "COLLECTED"
    assert dispatch.status == "READY"
    assert legacy.status_history.filter(status="IN_PROGRESS").exists()
    assert legacy.status_history.filter(status="COLLECTED", note__contains="Workflow migration").exists()
