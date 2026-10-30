from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.constants import Currency, OrderPaymentStatus, OrderStatus, ServiceType
from core.models import SoftDeleteModel, TimeStampedModel


class Order(TimeStampedModel, SoftDeleteModel):
    class FulfillmentType(models.TextChoices):
        PICKUP = "PICKUP", "Pick up"
        DROP_OFF = "DROP_OFF", "Drop off"

    class PaymentOption(models.TextChoices):
        PAY_AT_PICKUP = "PAY_AT_PICKUP", "Pay on pickup"
        PAY_AFTER_DELIVERY = "PAY_AFTER_DELIVERY", "Pay on delivery"

    class Source(models.TextChoices):
        ONLINE = "ONLINE", "Online"
        WALK_IN = "WALK_IN", "Walk-in"
        PHONE = "PHONE", "Phone"
        STAFF = "STAFF", "Staff created"

    class Priority(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        EXPRESS = "EXPRESS", "Express"
        URGENT = "URGENT", "Urgent"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING
    )

    pickup_address = models.CharField(max_length=255)
    delivery_address = models.CharField(max_length=255)
    fulfillment_type = models.CharField(
        max_length=12, choices=FulfillmentType.choices, default=FulfillmentType.PICKUP
    )
    payment_option = models.CharField(
        max_length=24, choices=PaymentOption.choices, default=PaymentOption.PAY_AT_PICKUP
    )
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.ONLINE, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders_created_for_customers",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders_assigned",
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders_to_drive",
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders_cancelled",
    )
    cancel_reason = models.CharField(max_length=255, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    expected_ready_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ticket_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    tag_number = models.CharField(max_length=50, blank=True, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    is_express = models.BooleanField(default=False)
    pieces_count = models.PositiveIntegerField(default=0)
    weight_kg_total = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Set when this pickup was covered by an active subscription plan
    # (see apps.orders.api.serializers.order.OrderCreateSerializer.create).
    # String FK avoids a hard import dependency from orders -> payments.
    subscription = models.ForeignKey(
        "payments.Subscription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_used",
    )
    discount_campaign = models.ForeignKey(
        "discounts.DiscountCampaign", on_delete=models.SET_NULL, null=True,
        blank=True, related_name="orders",
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    payment_status = models.CharField(
        max_length=24,
        choices=OrderPaymentStatus.choices,
        default=OrderPaymentStatus.UNPAID,
        db_index=True,
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_due_date = models.DateField(null=True, blank=True, db_index=True)
    payment_waived_reason = models.TextField(blank=True)
    payment_waived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_payment_waived",
    )
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.XAF
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"Order #{self.pk} — {self.user} ({self.status})"

    @property
    def applied_promo(self):
        """The PromoCode used on this order, if any — via PromoUsage (avoids a
        circular FK dependency between the orders and discounts apps)."""
        usage = self.promo_usages.select_related("promo_code").first()
        return usage.promo_code if usage else None

    def recalculate_total(self, save=True):
        """Sum line items + delivery fee, minus discount. Call after items change."""
        self.subtotal = sum(
            (item.subtotal for item in self.items.all()), start=0
        )
        self.total_amount = max(self.subtotal + self.delivery_fee - self.discount_amount, 0)
        self.pieces_count = sum(item.quantity for item in self.items.all())
        self.weight_kg_total = sum(
            ((item.weight_kg or 0) * item.quantity for item in self.items.all()), start=0
        )
        if save:
            self.save(update_fields=["subtotal", "total_amount", "pieces_count", "weight_kg_total"])
            from services.order_payments import recompute_payment_status

            recompute_payment_status(self, reason="Order total recalculated")

    @property
    def balance_due(self):
        return max(self.total_amount - self.amount_paid, 0)


class OrderItem(TimeStampedModel):
    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        WASHED = "WASHED", "Washed"
        PRESSED = "PRESSED", "Pressed"
        PACKED = "PACKED", "Packed"
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
    label = models.CharField(
        max_length=100,
        blank=True,
        help_text="Short name for this item, e.g. 'Blue jeans' or 'Winter jacket'.",
    )
    description = models.TextField(
        blank=True,
        help_text="Optional notes about this item — stains, special handling, etc.",
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RECEIVED)
    condition_notes = models.TextField(blank=True)
    stain_notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to="orders/intake/%Y/%m/", null=True, blank=True)
    weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal("0.1"))], null=True, blank=True
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=0)

    def __str__(self):
        base = self.label or self.get_service_type_display()
        return f"{base} — {self.weight_kg}kg x{self.quantity}"

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        order = self.order
        super().delete(*args, **kwargs)
        order.recalculate_total()


class OrderItemPhoto(TimeStampedModel):
    item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="orders/intake/%Y/%m/")

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Photo for order item #{self.item_id}"


class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_history"
    )
    status = models.CharField(max_length=20, choices=OrderStatus.choices)
    note = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_status_changes",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "order status histories"

    def __str__(self):
        return f"Order #{self.order_id} → {self.status}"


class OrderPaymentHistory(TimeStampedModel):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="payment_history"
    )
    from_status = models.CharField(max_length=24, blank=True)
    to_status = models.CharField(max_length=24, choices=OrderPaymentStatus.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    reason = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_payment_changes",
    )

    class Meta:
        ordering = ["-created_at"]
