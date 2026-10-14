from django.contrib import admin

from .models import InventoryItem, InventoryTransaction


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "quantity", "unit", "low_stock_threshold", "is_low_stock"]
    list_filter = ["category", "unit"]
    search_fields = ["name"]


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ["item", "change_type", "quantity_change", "created_by", "created_at"]
    list_filter = ["change_type"]
