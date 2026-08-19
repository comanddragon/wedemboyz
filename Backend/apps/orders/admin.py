from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory, PickupDeliverySchedule


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["status", "note", "changed_by", "created_at"]
    can_delete = False


class PickupDeliveryScheduleInline(admin.StackedInline):
    model = PickupDeliverySchedule
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "status", "total_amount", "currency", "created_at"]
    list_filter = ["status", "currency"]
    search_fields = ["id", "user__phone_number", "pickup_address", "delivery_address"]
    inlines = [OrderItemInline, PickupDeliveryScheduleInline, OrderStatusHistoryInline]
    list_select_related = ["user"]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["order", "label", "service_type", "weight_kg", "quantity", "subtotal"]
    list_filter = ["service_type"]
    search_fields = ["label"]


@admin.register(PickupDeliverySchedule)
class PickupDeliveryScheduleAdmin(admin.ModelAdmin):
    list_display = ["order", "pickup_date", "pickup_time_slot", "delivery_date", "delivery_time_slot"]
    list_filter = ["pickup_time_slot", "delivery_time_slot"]
