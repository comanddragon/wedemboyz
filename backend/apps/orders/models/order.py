from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.constants import Currency, OrderStatus, ServiceType
from core.models import SoftDeleteModel, TimeStampedModel


class Order(TimeStampedModel, SoftDeleteModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING
    )

    pickup_address = models.CharField(max_length=255)
    delivery_address = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

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

    subtotal = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
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
        self.total_amount = (
            self.subtotal + self.delivery_fee - self.discount_amount
        )
        if save:
            self.save(update_fields=["subtotal", "total_amount"])


class OrderItem(TimeStampedModel):
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
    weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0.1)]
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
