from django.urls import path

from apps.finance.api.views import (
    CreditAccountChargeView,
    CreditAccountDetailView,
    CreditAccountListView,
    CreditAccountPayView,
    CreditTransactionListView,
    ExpenseDetailView,
    ExpenseListCreateView,
    ExpenseExportView,
    FinanceSummaryView,
    RevenueAnalyticsView,
    PayrollEntryDetailView,
    PayrollEntryListCreateView,
    PayrollGenerateView,
    PayrollExportView,
    CashRegisterListCreateView,
    CashRegisterCloseView,
)

urlpatterns = [
    path("expenses/", ExpenseListCreateView.as_view(), name="expense-list"),
    path("expenses/export/", ExpenseExportView.as_view(), name="expense-export"),
    path("expenses/<int:pk>/", ExpenseDetailView.as_view(), name="expense-detail"),
    path("payroll/", PayrollEntryListCreateView.as_view(), name="payroll-list"),
    path("payroll/<int:pk>/", PayrollEntryDetailView.as_view(), name="payroll-detail"),
    path("payroll/generate/", PayrollGenerateView.as_view(), name="payroll-generate"),
    path("payroll/export/", PayrollExportView.as_view(), name="payroll-export"),
    path("cash-register/", CashRegisterListCreateView.as_view(), name="cash-register-list"),
    path("cash-register/<int:pk>/close/", CashRegisterCloseView.as_view(), name="cash-register-close"),
    path("analytics/revenue/", RevenueAnalyticsView.as_view(), name="analytics-revenue"),
    path("analytics/summary/", FinanceSummaryView.as_view(), name="analytics-summary"),
    path("credit-accounts/", CreditAccountListView.as_view(), name="credit-account-list"),
    path("credit-accounts/<int:user_id>/", CreditAccountDetailView.as_view(), name="credit-account-detail"),
    path(
        "credit-accounts/<int:user_id>/transactions/",
        CreditTransactionListView.as_view(),
        name="credit-account-transactions",
    ),
    path("credit-accounts/<int:user_id>/charge/", CreditAccountChargeView.as_view(), name="credit-account-charge"),
    path("credit-accounts/<int:user_id>/pay/", CreditAccountPayView.as_view(), name="credit-account-pay"),
]
