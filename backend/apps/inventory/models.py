from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class InventoryCategory(models.TextChoices):
    DETERGENT = "DETERGENT", "Detergent"
    SOFTENER = "SOFTENER", "Fabric softener"
    PACKAGING = "PACKAGING", "Packaging (bags, hangers, tags)"
    EQUIPMENT = "EQUIPMENT", "Equipment/parts"
    OTHER = "OTHER", "Other"


class InventoryUnit(models.TextChoices):
    L = "L", "Liters"
    KG = "KG", "Kilograms"
    PCS = "PCS", "Pieces"
    ML = "ML", "Milliliters"


class InventoryItem(TimeStampedModel):
    name = models.CharField(max_length=150)
    category = models.CharField(
        max_length=20, choices=InventoryCategory.choices, default=InventoryCategory.OTHER
    )
    unit = models.CharField(max_length=5, choices=InventoryUnit.choices, default=InventoryUnit.PCS)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

    @property
    def is_low_stock(self):
        return self.quantity <= self.low_stock_threshold


class InventoryTransaction(TimeStampedModel):
    class ChangeType(models.TextChoices):
        RESTOCK = "RESTOCK", "Restock (delivery received)"
        USAGE = "USAGE", "Usage (consumed in operations)"
        ADJUSTMENT = "ADJUSTMENT", "Manual adjustment (stocktake correction)"

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name="transactions")
    change_type = models.CharField(max_length=10, choices=ChangeType.choices)
    quantity_change = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positive for restocks/upward adjustments, negative for usage/downward adjustments.",
    )
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_adjustments",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item} {self.quantity_change:+} ({self.change_type})"
