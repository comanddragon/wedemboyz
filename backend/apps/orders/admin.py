from django.contrib import admin

from .models import Order, OrderItem, OrderItemPhoto, OrderStatusHistory, PickupDeliverySchedule


class OrderItemPhotoInline(admin.TabularInline):
    model = OrderItemPhoto
    extra = 0


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
    list_display = ["id", "user", "status", "total_amount", "currency", "created_at", "archived"]
    list_filter = ["status", "currency", ("deleted_at", admin.EmptyFieldListFilter)]
    search_fields = ["id", "user__phone_number", "pickup_address", "delivery_address"]
    inlines = [OrderItemInline, PickupDeliveryScheduleInline, OrderStatusHistoryInline]
    list_select_related = ["user"]

    readonly_fields = ["deleted_at"]

    def get_queryset(self, request):
        # Protected user-deletion links can refer to archived orders too.
        # Only the admin bypasses the default active-orders manager.
        queryset = Order.all_objects.get_queryset()
        ordering = self.get_ordering(request)
        if ordering:
            queryset = queryset.order_by(*ordering)
        return queryset

    @admin.display(boolean=True, description="Archived")
    def archived(self, obj):
        return obj.deleted_at is not None

    def delete_model(self, request, obj):
        # Match admin bulk deletion: permanently remove the order and cascades.
        obj.hard_delete()


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["order", "label", "service_type", "weight_kg", "quantity", "subtotal"]
    list_filter = ["service_type"]
    search_fields = ["label"]
    inlines = [OrderItemPhotoInline]


@admin.register(PickupDeliverySchedule)
class PickupDeliveryScheduleAdmin(admin.ModelAdmin):
    list_display = ["order", "pickup_date", "pickup_time_slot", "delivery_date", "delivery_time_slot"]
    list_filter = ["pickup_time_slot", "delivery_time_slot"]
