from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order, OrderItem
from apps.users.models import phone_validator
from core.constants import (
    OrderStatus,
    PaymentGateway,
    PaymentMethodType,
    PaymentStatus,
    ServiceType,
)
from services import pricing

User = get_user_model()


class QuickSaleItemInputSerializer(serializers.Serializer):
    """A walk-in sale line item. Unlike the online booking flow, weight is
    optional and staff can override the computed price directly — useful
    for flat-rate items or negotiated in-store pricing."""

    service_type = serializers.ChoiceField(choices=ServiceType.choices)
    label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    weight_kg = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("0.1"),
        required=False,
        default=Decimal("1.0"),
    )
    quantity = serializers.IntegerField(min_value=1, default=1)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=0,
        required=False,
        allow_null=True,
        default=None,
        help_text="Override the computed per-kg price. Leave blank to price automatically.",
    )


class StaffQuickSaleSerializer(serializers.Serializer):
    """POST /api/v1/orders/quick-sale/ — staff-side walk-in sale: name,
    phone, items, price, payment method, paid-now/on-credit, in one form."""

    customer = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_staff=False), required=False)
    customer_phone = serializers.CharField(max_length=15, validators=[phone_validator], required=False)
    customer_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    items = QuickSaleItemInputSerializer(many=True)
    payment_method = serializers.ChoiceField(
        choices=[PaymentMethodType.PAY_AT_PICKUP, PaymentMethodType.PAY_AFTER_DELIVERY]
    )
    is_express = serializers.BooleanField(default=False)
    paid_now = serializers.BooleanField(default=True, help_text="False leaves the order unpaid.")
    delivery_fee = serializers.DecimalField(
        max_digits=10, decimal_places=0, required=False, default=Decimal("0")
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("customer") and not attrs.get("customer_phone"):
            raise serializers.ValidationError({"customer_phone": "Select a client or enter a phone number."})
        if attrs.get("delivery_fee", 0) < 0:
            raise serializers.ValidationError({"delivery_fee": "Delivery fee cannot be negative."})
        return attrs

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        staff_user = self.context["request"].user
        selected_customer = validated_data.get("customer")
        phone = selected_customer.phone_number if selected_customer else validated_data["customer_phone"]
        full_name = validated_data.get("customer_name", "").strip()
        first_name, _, last_name = full_name.partition(" ")

        customer, created = User.objects.get_or_create(
            phone_number=phone,
            defaults={
                "first_name": first_name or "Walk-in",
                "last_name": last_name,
                "is_walk_in": True,
            },
        )
        if created:
            customer.set_unusable_password()
            customer.save(update_fields=["password"])
            profile = customer.profile
            profile.source = "WALK_IN"
            profile.save(update_fields=["source"])

        if getattr(customer.profile, "is_blocked", False):
            raise serializers.ValidationError(
                {"customer_phone": "This customer account is blocked."}
            )

        order = Order.objects.create(
            user=customer,
            status=OrderStatus.COLLECTED,
            pickup_address="In-store",
            delivery_address="In-store",
            notes=validated_data.get("notes", ""),
            source=Order.Source.WALK_IN,
            fulfillment_type=Order.FulfillmentType.DROP_OFF,
            payment_option=validated_data["payment_method"],
            created_by=staff_user,
            is_express=validated_data["is_express"],
            priority=Order.Priority.EXPRESS if validated_data["is_express"] else Order.Priority.NORMAL,
            delivery_fee=validated_data.get("delivery_fee", Decimal("0")),
        )

        for item in validated_data["items"]:
            unit_price = item.get("unit_price")
            if unit_price is None:
                unit_price = pricing.price_for_item(item["service_type"], item["weight_kg"])
            if order.is_express:
                unit_price *= 2
            OrderItem.objects.create(
                order=order,
                service_type=item["service_type"],
                label=item.get("label", ""),
                description=item.get("description", ""),
                weight_kg=item.get("weight_kg", Decimal("1.0")),
                quantity=item.get("quantity", 1),
                unit_price=unit_price,
            )

        order.recalculate_total()
        from services.loyalty import award_badge_for_order, award_points_for_order

        award_points_for_order(order)
        award_badge_for_order(order)

        payment_method = validated_data["payment_method"]
        paid_now = validated_data["paid_now"]

        if paid_now:
            from apps.payments.models import Payment
            from services.order_payments import recompute_payment_status

            payment = Payment.objects.create(
                order=order,
                gateway=PaymentGateway.CASH,
                payment_method_type=payment_method,
                amount=order.total_amount,
                status=PaymentStatus.SUCCEEDED,
                paid_at=timezone.now(),
                received_at=timezone.now(),
                received_by=staff_user,
            )
            recompute_payment_status(
                order,
                changed_by=staff_user,
                reason=f"Quick-sale payment #{payment.pk}",
            )

        order.refresh_from_db()

        from services.email_events import order_email

        order_email(order, received=True)
        return order
