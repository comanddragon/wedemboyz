from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import serializers

from apps.orders.models import (
    Order,
    OrderItem,
    OrderItemPhoto,
    OrderPaymentHistory,
    OrderStatusHistory,
)
from core.constants import ServiceType
from services import pricing

User = get_user_model()


class OrderItemInputSerializer(serializers.Serializer):
    """Shape of a single line item on order creation. Pricing is computed
    server-side (services.pricing) — the client only sends what was ordered."""

    service_type = serializers.ChoiceField(choices=ServiceType.choices)
    label = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    weight_kg = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal("0.1"), required=False, allow_null=True
    )
    quantity = serializers.IntegerField(min_value=1, default=1)

    def validate(self, attrs):
        if attrs["service_type"].startswith("LAVAGE_") and not attrs.get("weight_kg"):
            raise serializers.ValidationError({"weight_kg": "Weight is required for per-kilogram services."})
        return attrs


class OrderItemPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemPhoto
        fields = ["id", "image", "created_at"]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    photos = OrderItemPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "service_type", "label", "description", "status",
            "condition_notes", "stain_notes", "photo", "photos", "weight_kg", "quantity",
            "unit_price", "subtotal",
        ]
        read_only_fields = fields


class OrderItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "service_type", "label", "description", "status", "condition_notes",
            "stain_notes", "weight_kg", "quantity", "unit_price",
        ]

    def validate(self, attrs):
        service_type = attrs.get("service_type", getattr(self.instance, "service_type", ""))
        weight = attrs.get("weight_kg", getattr(self.instance, "weight_kg", None))
        if service_type.startswith("LAVAGE_") and not weight:
            raise serializers.ValidationError({"weight_kg": "Weight is required for this service."})
        return attrs

    def create(self, validated_data):
        order = self.context["order"]
        if "unit_price" not in validated_data:
            validated_data["unit_price"] = pricing.price_for_item(
                validated_data["service_type"], validated_data.get("weight_kg") or Decimal("1")
            )
        item = OrderItem.objects.create(order=order, **validated_data)
        order.recalculate_total()
        return item

    def update(self, instance, validated_data):
        item = super().update(instance, validated_data)
        item.order.recalculate_total()
        return item


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.StringRelatedField()

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "note", "changed_by", "created_at"]
        read_only_fields = fields


class OrderPaymentHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.StringRelatedField()

    class Meta:
        model = OrderPaymentHistory
        fields = [
            "id",
            "from_status",
            "to_status",
            "amount",
            "reason",
            "changed_by",
            "created_at",
        ]
        read_only_fields = fields


class OrderCustomerSerializer(serializers.ModelSerializer):
    """Nested summary of who placed the order — mirrors
    types/order.ts::OrderCustomerSummary on the frontend. Kept intentionally
    small (no phone/email) since it renders in admin list/detail views."""

    avatar = serializers.ImageField(source="profile.avatar", read_only=True, allow_null=True)
    use_profile_photo = serializers.BooleanField(source="profile.use_profile_photo", read_only=True, default=False)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number", "avatar", "use_profile_photo"]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight shape for GET /api/v1/orders/ — no nested items/history."""

    item_count = serializers.IntegerField(source="items.count", read_only=True)
    customer = OrderCustomerSerializer(source="user", read_only=True)
    has_schedule = serializers.SerializerMethodField()
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=0, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "source",
            "priority",
            "is_express",
            "ticket_number",
            "tag_number",
            "assigned_to",
            "driver",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "payment_status",
            "amount_paid",
            "balance_due",
            "payment_due_date",
            "currency",
            "item_count",
            "pieces_count",
            "weight_kg_total",
            "customer",
            "has_schedule",
            "created_at",
        ]
        read_only_fields = fields

    def get_has_schedule(self, obj):
        return hasattr(obj, "schedule")


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    has_schedule = serializers.SerializerMethodField()
    customer = OrderCustomerSerializer(source="user", read_only=True)
    balance_due = serializers.DecimalField(max_digits=10, decimal_places=0, read_only=True)
    payment_history = OrderPaymentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "customer",
            "status",
            "pickup_address",
            "delivery_address",
            "fulfillment_type",
            "payment_option",
            "notes",
            "internal_notes",
            "source",
            "created_by",
            "assigned_to",
            "driver",
            "cancelled_at",
            "cancelled_by",
            "cancel_reason",
            "ready_at",
            "delivered_at",
            "expected_ready_at",
            "ticket_number",
            "tag_number",
            "priority",
            "is_express",
            "pieces_count",
            "weight_kg_total",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "payment_status",
            "amount_paid",
            "balance_due",
            "paid_at",
            "payment_due_date",
            "payment_waived_reason",
            "currency",
            "items",
            "status_history",
            "payment_history",
            "has_schedule",
            "subscription",
            "discount_campaign",
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
            "source",
            "created_by",
            "subtotal",
            "discount_amount",
            "delivery_fee",
            "total_amount",
            "payment_status",
            "amount_paid",
            "balance_due",
            "paid_at",
            "payment_due_date",
            "payment_waived_reason",
            "cancelled_at",
            "cancelled_by",
            "ready_at",
            "delivered_at",
            "ticket_number",
            "pieces_count",
            "weight_kg_total",
            "currency",
            "items",
            "status_history",
            "payment_history",
            "has_schedule",
            "subscription",
            "discount_campaign",
            "created_at",
            "updated_at",
        ]

    def get_has_schedule(self, obj):
        return hasattr(obj, "schedule")

    def validate(self, attrs):
        request = self.context.get("request")
        if request:
            from apps.staff.permissions import StaffPermission, has_staff_permission

        if request and not has_staff_permission(request.user, StaffPermission.ORDERS_MANAGE):
            allowed = {"pickup_address", "delivery_address", "notes"}
            forbidden = set(attrs) - allowed
            if forbidden:
                raise serializers.ValidationError(
                    "Customers can only update addresses and order notes."
                )
        return attrs


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
            "fulfillment_type",
            "payment_option",
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
            "discount_campaign",
        ]
        read_only_fields = [
            "id", "subtotal", "discount_amount", "delivery_fee", "total_amount", "currency", "subscription", "discount_campaign",
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
        campaign = None

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

        if not promo and not subscription:
            from services.campaigns import active_campaign_for
            campaign = active_campaign_for(user)
            if campaign:
                discount_amount = pricing.apply_discount(subtotal, campaign.discount_type, campaign.value)

        order = Order.objects.create(
            user=user,
            pickup_address=validated_data["pickup_address"],
            delivery_address=validated_data["delivery_address"],
            fulfillment_type=validated_data.get("fulfillment_type", Order.FulfillmentType.PICKUP),
            payment_option=validated_data.get("payment_option", Order.PaymentOption.PAY_AT_PICKUP),
            notes=validated_data.get("notes", ""),
            source=Order.Source.ONLINE,
            subscription=subscription,
            discount_campaign=campaign,
            subtotal=subtotal,
            discount_amount=discount_amount,
            delivery_fee=delivery_fee,
            total_amount=subtotal + delivery_fee - discount_amount,
        )

        for item in items_data:
            unit_price = pricing.price_for_item(
                item["service_type"], item.get("weight_kg") or Decimal("1")
            )
            OrderItem.objects.create(
                order=order,
                service_type=item["service_type"],
                label=item.get("label", ""),
                description=item.get("description", ""),
                weight_kg=item.get("weight_kg"),
                quantity=item.get("quantity", 1),
                unit_price=unit_price,
                # OrderItem.save() derives subtotal = unit_price * quantity.
            )

        # Keep the denormalised load summary in sync with the line items just
        # created.  These values are rendered on the customer order detail and
        # were previously left at their model defaults (0 pieces / 0 kg).
        order.recalculate_total()

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
