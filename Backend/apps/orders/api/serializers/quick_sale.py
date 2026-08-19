from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.orders.models import Order, OrderItem
from core.constants import OrderStatus, PaymentGateway, PaymentStatus, ServiceType
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
        max_digits=5, decimal_places=2, min_value=Decimal("0.1"), required=False, default=Decimal("1.0")
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

    customer_phone = serializers.CharField(max_length=15)
    customer_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    items = QuickSaleItemInputSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=PaymentGateway.choices)
    paid_now = serializers.BooleanField(
        default=True, help_text="False (or payment_method=CREDIT) records the sale on the customer's credit tab."
    )
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=0, required=False, default=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate(self, attrs):
        if attrs["payment_method"] == PaymentGateway.CREDIT:
            attrs["paid_now"] = False
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        staff_user = self.context["request"].user
        phone = validated_data["customer_phone"]
        full_name = validated_data.get("customer_name", "").strip()
        first_name, _, last_name = full_name.partition(" ")

        customer, created = User.objects.get_or_create(
            phone_number=phone,
            defaults={"first_name": first_name or "Walk-in", "last_name": last_name},
        )
        if created:
            customer.set_unusable_password()
            customer.save(update_fields=["password"])

        order = Order.objects.create(
            user=customer,
            status=OrderStatus.CONFIRMED,
            pickup_address="In-store",
            delivery_address="In-store",
            notes=validated_data.get("notes", ""),
            delivery_fee=validated_data.get("delivery_fee", Decimal("0")),
        )

        for item in validated_data["items"]:
            unit_price = item.get("unit_price") or pricing.price_for_item(
                item["service_type"], item["weight_kg"]
            )
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

        payment_method = validated_data["payment_method"]
        paid_now = validated_data["paid_now"]

        if paid_now and payment_method != PaymentGateway.CREDIT:
            from apps.payments.models import Payment

            Payment.objects.create(
                order=order,
                gateway=payment_method,
                amount=order.total_amount,
                status=PaymentStatus.SUCCEEDED,
                paid_at=timezone.now(),
            )
        else:
            from apps.finance.models import CreditAccount, CreditTransaction

            account, _ = CreditAccount.objects.get_or_create(user=customer)
            CreditTransaction.objects.create(
                credit_account=account,
                transaction_type=CreditTransaction.TransactionType.CHARGE,
                amount=order.total_amount,
                order=order,
                note=f"Walk-in quick sale — Order #{order.pk}",
                created_by=staff_user,
            )

        return order
