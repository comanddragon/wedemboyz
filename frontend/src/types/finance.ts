import type { Currency } from "./enums";

/** Mirrors apps.finance.models.ExpenseCategory */
export type ExpenseCategory = "SUPPLIES" | "UTILITIES" | "MAINTENANCE" | "RENT" | "OTHER";

export type PayrollStatus = "PENDING" | "PAID";

export interface PayrollEmployee {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: "MANAGER" | "ATTENDANT";
}

export interface PayrollEntry {
  id: number;
  employee: number;
  employee_detail: PayrollEmployee;
  pay_period: string;
  amount: string;
  currency: Currency;
  status: PayrollStatus;
  paid_on: string | null;
  notes: string;
  created_by: number | null;
  created_at: string;
}

export interface PayrollEntryInput {
  employee: number;
  pay_period: string;
  amount: number;
  status: PayrollStatus;
  paid_on?: string | null;
  notes?: string;
}

export interface PayrollGenerationResult {
  created: PayrollEntry[];
  created_count: number;
  skipped_count: number;
}

export type PaymentMethodTotals = Partial<Record<"CASH" | "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER" | "OTHER", string>>;

export interface CashRegisterDay {
  id: number;
  date: string;
  opening_float: string;
  cash_expenses: string;
  counted_cash: string | null;
  status: "OPEN" | "CLOSED";
  notes: string;
  opened_by: number | null;
  closed_by: number | null;
  closed_at: string | null;
  received_by_method: PaymentMethodTotals;
  refunded_by_method: PaymentMethodTotals;
  expected_cash: string;
  variance: string | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors apps.finance.api.serializers.expense.ExpenseSerializer */
export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: string; // DecimalField serializes as string
  currency: Currency;
  date: string; // ISO date
  notes: string;
  created_by: number | null;
  created_at: string;
}

/** Payload for POST /api/v1/finance/expenses/ and PATCH .../{id}/ */
export interface ExpenseInput {
  category: ExpenseCategory;
  amount: number;
  currency?: Currency;
  date: string; // ISO date
  notes?: string;
}

/** Query params for GET /api/v1/finance/expenses/ */
export interface ListExpensesParams {
  page?: number;
  category?: ExpenseCategory;
  start?: string; // ISO date
  end?: string; // ISO date
}

// --- Analytics ---------------------------------------------------------------

/** One bucket from RevenueAnalyticsView — day or month depending on `period`. */
export interface RevenueAnalyticsPoint {
  date: string; // ISO date (or year-month for monthly buckets)
  revenue: number;
  payment_count: number;
  order_count: number;
  cash_received: number;
}

/** GET /api/v1/finance/analytics/revenue/?period=daily|monthly&start=&end= */
export interface RevenueAnalyticsResult {
  period: "daily" | "monthly";
  start: string;
  end: string;
  results: RevenueAnalyticsPoint[];
}

export interface RevenueAnalyticsParams {
  period?: "daily" | "monthly";
  start?: string;
  end?: string;
}

/** GET /api/v1/finance/analytics/summary/?start=&end= */
export interface FinanceSummary {
  start: string;
  end: string;
  revenue: number;
  income_booked: number;
  cash_received: number;
  outstanding: number;
  expenses: number;
  profit: number;
  payment_count: number;
  average_payment: number;
  order_count: number;
  average_order: number;
}

export interface FinanceSummaryParams {
  start?: string;
  end?: string;
}

// --- Credit accounts ("clients à crédit") ------------------------------------

/** Mirrors apps.finance.api.serializers.credit.CreditCustomerSummarySerializer */
export interface CreditCustomerSummary {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
}

/** Mirrors apps.finance.models.CreditTransaction.TransactionType */
export type CreditTransactionType = "CHARGE" | "PAYMENT" | "ADJUSTMENT";

/** Mirrors apps.finance.api.serializers.credit.CreditTransactionSerializer */
export interface CreditTransaction {
  id: number;
  transaction_type: CreditTransactionType;
  amount: string;
  order: number | null;
  note: string;
  created_by: string | null; // StringRelatedField
  created_at: string;
}

/** Mirrors apps.finance.api.serializers.credit.CreditAccountSerializer
 * (GET /api/v1/finance/credit-accounts/) */
export interface CreditAccount {
  id: number;
  user: CreditCustomerSummary;
  balance: string;
  credit_limit: string;
  days_since_last_activity: number | null;
  updated_at: string;
}

/** Mirrors apps.finance.api.serializers.credit.CreditAccountDetailSerializer
 * (GET /api/v1/finance/credit-accounts/{user_id}/) */
export interface CreditAccountDetail extends CreditAccount {
  transactions: CreditTransaction[];
}

/** Query params for GET /api/v1/finance/credit-accounts/ */
export interface ListCreditAccountsParams {
  page?: number;
  search?: string;
  ordering?: "balance" | "-balance" | "updated_at" | "-updated_at";
  /** Defaults to true server-side — only customers who currently owe
   * something. Pass false to see every credit account, including settled ones. */
  outstanding_only?: boolean;
}

/** Payload for POST /api/v1/finance/credit-accounts/{user_id}/charge/ and .../pay/ */
export interface CreditTransactionInput {
  amount: number;
  note?: string;
  order_id?: number | null;
}
