from decimal import Decimal

from rest_framework import serializers

from apps.inventory.models import (
    InventoryItem,
    InventoryTransaction,
    Machine,
    ServiceConsumption,
    Supplier,
)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id", "name", "phone", "email", "address", "payment_terms",
            "notes", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InventoryStaffSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.get_full_name() or obj.phone_number


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    stock_value = serializers.DecimalField(max_digits=14, decimal_places=0, read_only=True)
    supplier_detail = SupplierSerializer(source="supplier", read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "category",
            "unit",
            "quantity",
            "low_stock_threshold",
            "notes",
            "unit_cost",
            "last_purchase_cost",
            "average_cost",
            "stock_value",
            "sku",
            "barcode",
            "supplier",
            "supplier_detail",
            "brand",
            "pack_size",
            "pack_unit",
            "reorder_quantity",
            "storage_location",
            "expiry_tracking",
            "expires_on",
            "is_active",
            "image",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "quantity", "last_purchase_cost", "average_cost", "stock_value",
            "is_low_stock", "created_at", "updated_at",
        ]
        # `quantity` is intentionally read-only here — it can only change via
        # InventoryTransaction (see InventoryItemAdjustView), so every change
        # is auditable and (if it crosses the threshold) triggers an alert.


class InventoryTransactionSerializer(serializers.ModelSerializer):
    created_by = InventoryStaffSerializer(read_only=True)
    item_name = serializers.CharField(source="item.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id", "item", "item_name", "change_type", "quantity_change", "reason",
            "unit_cost", "total_cost", "supplier", "supplier_name", "reference",
            "quantity_before", "quantity_after", "order", "machine", "batch",
            "expense", "created_by", "created_at",
        ]
        read_only_fields = fields


class InventoryAdjustSerializer(serializers.Serializer):
    change_type = serializers.ChoiceField(choices=InventoryTransaction.ChangeType.choices)
    quantity_change = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True, default="")
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=0, min_value=Decimal("0"), required=False)
    supplier = serializers.PrimaryKeyRelatedField(queryset=Supplier.objects.all(), required=False, allow_null=True)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["change_type"] == InventoryTransaction.ChangeType.RESTOCK and attrs["quantity_change"] <= 0:
            raise serializers.ValidationError({"quantity_change": "Restocks must be a positive amount."})
        if attrs["change_type"] == InventoryTransaction.ChangeType.USAGE and attrs["quantity_change"] >= 0:
            raise serializers.ValidationError({"quantity_change": "Usage must be a negative amount."})
        if attrs["change_type"] in {
            InventoryTransaction.ChangeType.WASTE,
            InventoryTransaction.ChangeType.DAMAGED,
            InventoryTransaction.ChangeType.RETURN_TO_SUPPLIER,
        } and attrs["quantity_change"] >= 0:
            raise serializers.ValidationError({"quantity_change": "This movement must reduce stock."})
        return attrs


class InventoryUsageLineSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=InventoryItem.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))


class InventoryUsageSerializer(serializers.Serializer):
    lines = InventoryUsageLineSerializer(many=True)
    order = serializers.IntegerField(required=False, allow_null=True)
    machine = serializers.PrimaryKeyRelatedField(queryset=Machine.objects.all(), required=False, allow_null=True)
    batch = serializers.CharField(max_length=100, required=False, allow_blank=True)
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_lines(self, lines):
        if not lines:
            raise serializers.ValidationError("Add at least one supply item.")
        return lines


class ServiceConsumptionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = ServiceConsumption
        fields = [
            "id", "service_type", "item", "item_name", "quantity_per_kg",
            "quantity_per_load", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = [
            "id", "name", "machine_type", "capacity_kg", "status", "installed_on",
            "last_service_on", "next_service_due", "usage_count", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "usage_count", "created_at", "updated_at"]
