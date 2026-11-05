from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from apps.orders.api.serializers.order import OrderCreateSerializer, OrderItemWriteSerializer


@pytest.mark.django_db
def test_bulk_booking_is_priced_after_staff_weigh_laundry(create_user):
    customer = create_user()
    booking = OrderCreateSerializer(data={
        "pickup_address": "A", "delivery_address": "B", "use_subscription": False,
        "items": [{"service_type": "LAVAGE_SECHAGE", "weight_kg": None}],
    }, context={"request": SimpleNamespace(user=customer)})
    assert booking.is_valid(), booking.errors
    with patch("services.email_events.order_email"), patch("services.pricing._configured_price", return_value=None), patch("services.pricing._business_settings", return_value=None):
        order = booking.save()
        item = order.items.get()
        assert item.weight_kg is None
        assert item.quantity == 1
        assert item.subtotal == 0
        intake = OrderItemWriteSerializer(item, data={"weight_kg": "4.5"}, partial=True)
        assert intake.is_valid(), intake.errors
        intake.save()
        order.refresh_from_db()
        assert order.subtotal == Decimal("4500")
        assert order.total_amount == Decimal("6000")
