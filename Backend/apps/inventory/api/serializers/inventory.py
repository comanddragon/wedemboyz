from rest_framework import serializers

from apps.inventory.models import InventoryItem, InventoryTransaction


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

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
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "quantity", "is_low_stock", "created_at", "updated_at"]
        # `quantity` is intentionally read-only here — it can only change via
        # InventoryTransaction (see InventoryItemAdjustView), so every change
        # is auditable and (if it crosses the threshold) triggers an alert.


class InventoryTransactionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()

    class Meta:
        model = InventoryTransaction
        fields = ["id", "item", "change_type", "quantity_change", "reason", "created_by", "created_at"]
        read_only_fields = fields


class InventoryAdjustSerializer(serializers.Serializer):
    change_type = serializers.ChoiceField(choices=InventoryTransaction.ChangeType.choices)
    quantity_change = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["change_type"] == InventoryTransaction.ChangeType.RESTOCK and attrs["quantity_change"] <= 0:
            raise serializers.ValidationError({"quantity_change": "Restocks must be a positive amount."})
        if attrs["change_type"] == InventoryTransaction.ChangeType.USAGE and attrs["quantity_change"] >= 0:
            raise serializers.ValidationError({"quantity_change": "Usage must be a negative amount."})
        return attrs
