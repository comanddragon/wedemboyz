from django.contrib import admin

from .models import Invoice, Payment, PaymentMethod, Refund, Subscription


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["user", "gateway", "display_label", "is_default"]
    list_filter = ["gateway", "is_default"]
    search_fields = ["user__phone_number", "display_label"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "order", "subscription", "gateway", "amount", "currency", "status", "paid_at"]
    list_filter = ["gateway", "status", "currency"]
    search_fields = ["gateway_reference", "order__id", "subscription__id"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "order", "amount_due", "amount_paid", "issued_at"]
    search_fields = ["invoice_number", "order__id"]


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ["id", "payment", "amount", "status", "processed_at"]
    list_filter = ["status"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user", "plan", "billing_cycle", "status", "gateway",
        "kg_remaining", "cancel_at_period_end", "start_date", "end_date",
    ]
    list_filter = ["plan", "billing_cycle", "status", "gateway"]
    search_fields = ["user__phone_number", "external_subscription_id"]
