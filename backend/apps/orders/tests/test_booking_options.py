from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.discounts.api.views.promo import PromoCodeListCreateView
from apps.discounts.models import PromoCode
from apps.orders.api.serializers.order import OrderCreateSerializer, OrderDetailSerializer, OrderItemWriteSerializer
from services.pricing import price_order_items


@pytest.mark.parametrize("service,rate", [("LAVAGE_ESSORAGE", 600), ("LAVAGE_SECHAGE", 1000), ("REPASSAGE_PLASTIF", 2000)])
def test_kilo_rates_charge_actual_weight(service, rate):
    with patch("services.pricing._configured_price", return_value=None):
        assert price_order_items([{"service_type": service, "weight_kg": Decimal("0.5")}]) == Decimal(rate) / 2


@pytest.mark.django_db
def test_express_doubles_laundry_but_not_delivery(create_user):
    user = create_user()
    serializer = OrderCreateSerializer(data={
        "pickup_address": "A", "delivery_address": "B", "is_express": True,
        "items": [{"service_type": "LAVAGE_ESSORAGE", "weight_kg": "5"}],
        "use_subscription": False,
    }, context={"request": SimpleNamespace(user=user)})
    assert serializer.is_valid(), serializer.errors
    with patch("services.email_events.order_email"), patch("services.pricing._configured_price", return_value=None), patch("services.pricing._business_settings", return_value=None):
        order = serializer.save()
        assert order.is_express
        assert order.subtotal == 6000
        assert order.delivery_fee == 1500
        assert order.total_amount == 7500
        item = order.items.get()
        update = OrderItemWriteSerializer(item, data={"weight_kg": "6"}, partial=True)
        assert update.is_valid(), update.errors
        update.save()
        order.refresh_from_db()
        assert order.subtotal == 7200
        assert order.total_amount == 8700
        change_speed = OrderDetailSerializer(order, data={"is_express": False}, partial=True)
        assert change_speed.is_valid(), change_speed.errors
        order = change_speed.save()
        assert order.subtotal == 3600
        assert order.delivery_fee == 1500
        assert order.total_amount == 5100


@pytest.mark.django_db
def test_available_promos_hide_expired_and_exhausted(create_user):
    from datetime import timedelta
    user = create_user()
    now = timezone.now()
    for code, expiry in [("AVAILABLE", now + timedelta(days=1)), ("EXPIRED", now - timedelta(days=1))]:
        PromoCode.objects.create(code=code, discount_type="PERCENTAGE", value=5, valid_from=now-timedelta(days=2), valid_until=expiry)
    request = APIRequestFactory().get("/discounts/promo-codes/?available=true")
    force_authenticate(request, user=user)
    response = PromoCodeListCreateView.as_view()(request)
    assert response.status_code == 200
    assert [row["code"] for row in response.data["results"]] == ["AVAILABLE"]


@pytest.mark.django_db
def test_counter_express_doubles_service_rates_and_manual_prices_only(create_user):
    from apps.orders.api.serializers.quick_sale import StaffQuickSaleSerializer
    staff = create_user(is_staff=True)
    serializer = StaffQuickSaleSerializer(data={
        "customer_phone": "237699999912", "is_express": True,
        "payment_method": "PAY_AT_PICKUP", "paid_now": False, "delivery_fee": 1500,
        "items": [
            {"service_type": "REPASSAGE_PLASTIF", "weight_kg": "2"},
            {"service_type": "TSHIRT", "unit_price": "300", "quantity": 2},
            {"service_type": "PANTALON", "unit_price": "0"},
        ],
    }, context={"request": SimpleNamespace(user=staff)})
    assert serializer.is_valid(), serializer.errors
    with patch("services.pricing._configured_price", return_value=None):
        order = serializer.save()
    assert order.is_express
    assert order.subtotal == 9200
    assert order.delivery_fee == 1500
    assert order.total_amount == 10700
