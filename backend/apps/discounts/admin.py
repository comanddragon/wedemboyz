from django.contrib import admin

from .models import (
    DiscountCampaign,
    LoyaltyRule,
    LoyaltyTransaction,
    PromoCode,
    PromoUsage,
    StampCardConfig,
)


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_type", "value", "is_active", "valid_from", "valid_until"]
    list_filter = ["discount_type", "is_active"]
    search_fields = ["code"]


@admin.register(PromoUsage)
class PromoUsageAdmin(admin.ModelAdmin):
    list_display = ["promo_code", "user", "order", "discount_applied", "created_at"]
    search_fields = ["promo_code__code", "user__phone_number"]


@admin.register(LoyaltyRule)
class LoyaltyRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "points_per_currency_unit", "min_spend", "is_active"]


@admin.register(StampCardConfig)
class StampCardConfigAdmin(admin.ModelAdmin):
    list_display = ["points_per_stamp", "stamps_required", "is_active", "created_at"]
    list_filter = ["is_active"]


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ["loyalty_account", "transaction_type", "points", "order", "created_at"]
    list_filter = ["transaction_type"]


@admin.register(DiscountCampaign)
class DiscountCampaignAdmin(admin.ModelAdmin):
    list_display = ["name", "discount_type", "value", "target_segment", "is_active"]
    list_filter = ["discount_type", "target_segment", "is_active"]
