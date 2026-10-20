from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db import transaction

from core.constants import ServiceType
from core.models import SoftDeleteModel, TimeStampedModel


class InventoryCategory(models.TextChoices):
    DETERGENT = "DETERGENT", "Detergent"
    SOFTENER = "SOFTENER", "Fabric softener"
    PACKAGING = "PACKAGING", "Packaging (bags, hangers, tags)"
    EQUIPMENT = "EQUIPMENT", "Equipment/parts"
    STAIN_REMOVER = "STAIN_REMOVER", "Stain remover"
    BLEACH = "BLEACH", "Bleach"
    HANGERS = "HANGERS", "Hangers"
    BAGS = "BAGS", "Bags"
    MACHINE_PARTS = "MACHINE_PARTS", "Machine parts"
    CLEANING = "CLEANING", "Cleaning supplies"
    OTHER = "OTHER", "Other"


class InventoryUnit(models.TextChoices):
    L = "L", "Liters"
    KG = "KG", "Kilograms"
    PCS = "PCS", "Pieces"
    ML = "ML", "Milliliters"
    G = "G", "Grams"
    PACK = "PACK", "Packs"
    BOX = "BOX", "Boxes"
    ROLL = "ROLL", "Rolls"


class Supplier(TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=150, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    payment_terms = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InventoryItem(TimeStampedModel, SoftDeleteModel):
    name = models.CharField(max_length=150)
    category = models.CharField(
        max_length=20, choices=InventoryCategory.choices, default=InventoryCategory.OTHER
    )
    unit = models.CharField(max_length=5, choices=InventoryUnit.choices, default=InventoryUnit.PCS)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    low_stock_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=0, default=0, validators=[MinValueValidator(0)]
    )
    last_purchase_cost = models.DecimalField(
        max_digits=10, decimal_places=0, default=0, validators=[MinValueValidator(0)]
    )
    average_cost = models.DecimalField(
        max_digits=10, decimal_places=0, default=0, validators=[MinValueValidator(0)]
    )
    sku = models.CharField(max_length=50, unique=True, null=True, blank=True)
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="items"
    )
    brand = models.CharField(max_length=100, blank=True)
    pack_size = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    pack_unit = models.CharField(max_length=5, choices=InventoryUnit.choices, blank=True)
    reorder_quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )
    storage_location = models.CharField(max_length=150, blank=True)
    expiry_tracking = models.BooleanField(default=False)
    expires_on = models.DateField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    image = models.ImageField(upload_to="inventory/%Y/%m/", null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

    @property
    def is_low_stock(self):
        return self.quantity <= self.low_stock_threshold

    @property
    def stock_value(self):
        return self.quantity * self.average_cost


class Machine(TimeStampedModel, SoftDeleteModel):
    class MachineType(models.TextChoices):
        WASHER = "WASHER", "Washer"
        DRYER = "DRYER", "Dryer"
        PRESS = "PRESS", "Press"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        IN_USE = "IN_USE", "In use"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of service"

    name = models.CharField(max_length=100, unique=True)
    machine_type = models.CharField(max_length=20, choices=MachineType.choices)
    capacity_kg = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)]
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    installed_on = models.DateField(null=True, blank=True)
    last_service_on = models.DateField(null=True, blank=True)
    next_service_due = models.DateField(null=True, blank=True, db_index=True)
    usage_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InventoryTransaction(TimeStampedModel):
    class ChangeType(models.TextChoices):
        RESTOCK = "RESTOCK", "Restock (delivery received)"
        USAGE = "USAGE", "Usage (consumed in operations)"
        ADJUSTMENT = "ADJUSTMENT", "Manual adjustment (stocktake correction)"
        WASTE = "WASTE", "Waste or expired stock"
        DAMAGED = "DAMAGED", "Damaged stock"
        RETURN_TO_SUPPLIER = "RETURN_TO_SUPPLIER", "Returned to supplier"
        TRANSFER = "TRANSFER", "Transferred"
        OPENING_STOCK = "OPENING_STOCK", "Opening stock"

    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="transactions")
    change_type = models.CharField(max_length=24, choices=ChangeType.choices)
    quantity_change = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positive for restocks/upward adjustments, negative for usage/downward adjustments.",
    )
    reason = models.CharField(max_length=255, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    reference = models.CharField(max_length=100, blank=True, db_index=True)
    quantity_before = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_after = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_usage"
    )
    machine = models.ForeignKey(
        Machine, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    batch = models.CharField(max_length=100, blank=True)
    expense = models.ForeignKey(
        "finance.Expense", on_delete=models.SET_NULL, null=True, blank=True, related_name="inventory_transactions"
    )
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

    def save(self, *args, **kwargs):
        if self.pk:
            return super().save(*args, **kwargs)
        with transaction.atomic():
            item = InventoryItem.all_objects.select_for_update().get(pk=self.item_id)
            after = item.quantity + self.quantity_change
            if after < 0:
                raise ValidationError(
                    f"Insufficient {item.name} stock: {item.quantity} {item.unit} available."
                )
            self.quantity_before = item.quantity
            self.quantity_after = after
            self.total_cost = abs(self.quantity_change) * (self.unit_cost or item.average_cost)
            super().save(*args, **kwargs)

            if self.change_type == self.ChangeType.RESTOCK and self.unit_cost is not None:
                existing_value = item.quantity * item.average_cost
                received_value = self.quantity_change * self.unit_cost
                item.average_cost = (
                    (existing_value + received_value) / after if after else self.unit_cost
                )
                item.last_purchase_cost = self.unit_cost
                if item.unit_cost == 0:
                    item.unit_cost = self.unit_cost
            item.quantity = after
            item.save(
                update_fields=[
                    "quantity",
                    "unit_cost",
                    "last_purchase_cost",
                    "average_cost",
                    "updated_at",
                ]
            )


class ServiceConsumption(TimeStampedModel):
    item = models.ForeignKey(
        InventoryItem, on_delete=models.PROTECT, related_name="consumption_standards"
    )
    service_type = models.CharField(max_length=24, choices=ServiceType.choices)
    quantity_per_kg = models.DecimalField(
        max_digits=10, decimal_places=4, default=0, validators=[MinValueValidator(0)]
    )
    quantity_per_load = models.DecimalField(
        max_digits=10, decimal_places=4, default=0, validators=[MinValueValidator(0)]
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service_type", "item__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["service_type", "item"], name="unique_service_inventory_standard"
            )
        ]
