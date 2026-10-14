from django.contrib import admin

from .models import CreditAccount, CreditTransaction, Expense, PayrollEntry


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["category", "amount", "currency", "date", "created_by"]
    list_filter = ["category", "currency"]
    search_fields = ["notes"]


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ["employee", "pay_period", "amount", "status", "paid_on"]
    list_filter = ["status", "pay_period"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__phone_number"]


@admin.register(CreditAccount)
class CreditAccountAdmin(admin.ModelAdmin):
    list_display = ["user", "balance", "credit_limit"]
    search_fields = ["user__phone_number", "user__first_name", "user__last_name"]


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ["credit_account", "transaction_type", "amount", "order", "created_at"]
    list_filter = ["transaction_type"]
