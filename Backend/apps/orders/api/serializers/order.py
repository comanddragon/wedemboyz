from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderStatusHistory
from core.constants import ServiceType
from services import pricing

User = get_user_model()


class OrderItemInputSerializer(serializers.Serializer):
    """Shape of a single line item on order creation. Pricing is computed
    server-side (services.pricing) — the client only sends what was ordered."""

    service_type = serializers.ChoiceField(choices=ServiceType.choices)
    label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    weight_kg = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal("0.1"))
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "service_type", "label", "description", "weight_kg", "quantity", "unit_price", "subtotal"]
        read_only_fields = fields


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.StringRelatedField()

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "note", "changed_by", "created_at"]
        read_only_fields = fields


class OrderCustomerSerializer(serializers.ModelSerializer):
    """Nested summary of who placed the order — mirrors
    types/order.ts::OrderCustomerSummary on the frontend. Kept intentionally
    small (no phone/email) since it renders in admin list/detail views."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number"]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight shape for GET /api/v1/orders/ — no nested items/history."""

    item_count = serializers.IntegerField(source="items.count", read_only=True)
    customer = OrderCustomerSerializer(source="user", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "currency",
            "item_count",
            "customer",
            "created_at",
        ]
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    has_schedule = serializers.SerializerMethodField()
    customer = OrderCustomerSerializer(source="user", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "customer",
            "status",
            "pickup_address",
            "delivery_address",
            "notes",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "currency",
            "items",
            "status_history",
            "has_schedule",
            "subscription",
            "created_at",
            "updated_at",
        ]
        # pickup_address / delivery_address / notes are the only fields a
        # customer can PATCH, and only while the order is still PENDING —
        # enforced in the view, not here.
        read_only_fields = [
            "id",
            "user",
            "customer",
            "status",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "currency",
            "items",
            "status_history",
            "has_schedule",
            "subscription",
            "created_at",
            "updated_at",
        ]

    def get_has_schedule(self, obj):
        return hasattr(obj, "schedule")


class OrderCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/orders/ — accepts raw items + an optional promo code and
    computes every monetary field server-side. If the customer has an
    active subscription with pickups remaining, this pickup is covered by
    it automatically (unless a promo_code is explicitly given, which takes
    precedence, or use_subscription=false is passed)."""

    items = OrderItemInputSerializer(many=True, write_only=True)
    promo_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    use_subscription = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "pickup_address",
            "delivery_address",
            "notes",
            "items",
            "promo_code",
            "use_subscription",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "currency",
            "subscription",
        ]
        read_only_fields = [
            "id", "subtotal", "discount_amount", "delivery_fee", "total_amount", "currency", "subscription",
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate_promo_code(self, value):
        if not value:
            return value

        from apps.discounts.models import PromoCode

        try:
            promo = PromoCode.objects.get(code=value.upper())
        except PromoCode.DoesNotExist:
            raise serializers.ValidationError("Invalid promo code.")

        if not promo.is_valid_now():
            raise serializers.ValidationError("This promo code is no longer valid.")

        self._promo = promo
        return value.upper()

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        validated_data.pop("promo_code", "")
        use_subscription = validated_data.pop("use_subscription", True)
        user = self.context["request"].user
        promo = getattr(self, "_promo", None)

        subtotal = pricing.price_order_items(items_data)
        delivery_fee = pricing.calculate_delivery_fee(subtotal)

        discount_amount = Decimal("0")
        subscription = None

        if promo:
            if promo.min_order_amount and subtotal < promo.min_order_amount:
                raise serializers.ValidationError(
                    {"promo_code": f"Order must be at least {promo.min_order_amount} to use this code."}
                )
            if promo.usages.filter(user=user).count() >= promo.max_uses_per_user:
                raise serializers.ValidationError({"promo_code": "You've already used this promo code."})
            discount_amount = pricing.apply_discount(subtotal, promo.discount_type, promo.value)
        elif use_subscription:
            # select_for_update() inside this atomic block prevents two
            # concurrent orders from both claiming the same kilos.
            from apps.payments.models import Subscription

            order_weight = pricing.total_weight_kg(items_data)
            subscription = Subscription.find_usable_for(user, required_kg=order_weight)
            if subscription:
                discount_amount = subtotal + delivery_fee  # pickup is fully covered by the plan

        order = Order.objects.create(
            user=user,
            pickup_address=validated_data["pickup_address"],
            delivery_address=validated_data["delivery_address"],
            notes=validated_data.get("notes", ""),
            subscription=subscription,
            subtotal=subtotal,
            discount_amount=discount_amount,
            delivery_fee=delivery_fee,
            total_amount=subtotal + delivery_fee - discount_amount,
        )

        for item in items_data:
            unit_price = pricing.price_for_item(item["service_type"], item["weight_kg"])
            OrderItem.objects.create(
                order=order,
                service_type=item["service_type"],
                label=item.get("label", ""),
                description=item.get("description", ""),
                weight_kg=item["weight_kg"],
                quantity=item.get("quantity", 1),
                unit_price=unit_price,
                # OrderItem.save() derives subtotal = unit_price * quantity.
            )

        if promo:
            from apps.discounts.models import PromoUsage

            PromoUsage.objects.create(
                promo_code=promo,
                user=user,
                order=order,
                discount_applied=discount_amount,
            )

        if subscription:
            subscription.kg_remaining = models.F("kg_remaining") - order_weight
            subscription.save(update_fields=["kg_remaining"])

        return order