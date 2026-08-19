from django.contrib import admin

from .models import CreditAccount, CreditTransaction, Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["category", "amount", "currency", "date", "created_by"]
    list_filter = ["category", "currency"]
    search_fields = ["notes"]


@admin.register(CreditAccount)
class CreditAccountAdmin(admin.ModelAdmin):
    list_display = ["user", "balance", "credit_limit"]
    search_fields = ["user__phone_number", "user__first_name", "user__last_name"]


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ["credit_account", "transaction_type", "amount", "order", "created_at"]
    list_filter = ["transaction_type"]
