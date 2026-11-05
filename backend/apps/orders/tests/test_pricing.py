from decimal import Decimal
from unittest.mock import patch

import pytest

from apps.orders.api.serializers.order import OrderItemInputSerializer
from apps.orders.api.serializers.quick_sale import QuickSaleItemInputSerializer
from services.pricing import price_order_items


@pytest.mark.parametrize("weight", [None, Decimal("0.5"), Decimal("3")])
def test_petite_robe_is_charged_per_piece(weight):
    with patch("services.pricing._configured_price", return_value=None):
        assert price_order_items([
            {"service_type": "PETITE_ROBE", "weight_kg": weight, "quantity": 3},
            {"service_type": "ROBE", "quantity": 1},
        ]) == Decimal("5500")


@pytest.mark.parametrize("serializer_class", [OrderItemInputSerializer, QuickSaleItemInputSerializer])
def test_petite_robe_is_accepted_for_booking_and_counter_sales(serializer_class):
    serializer = serializer_class(data={"service_type": "PETITE_ROBE", "quantity": 2})
    assert serializer.is_valid(), serializer.errors
