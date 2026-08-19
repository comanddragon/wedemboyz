import { apiClient, unwrap } from "./client";
import type {
  CreditAccount,
  CreditAccountDetail,
  CreditTransaction,
  CreditTransactionInput,
  Expense,
  ExpenseInput,
  FinanceSummary,
  FinanceSummaryParams,
  ListCreditAccountsParams,
  ListExpensesParams,
  Paginated,
  RevenueAnalyticsParams,
  RevenueAnalyticsResult,
} from "@/types";

// --- Expenses --------------------------------------------------------------------

/** GET /api/v1/finance/expenses/?category=&start=&end= */
export async function listExpenses(params: ListExpensesParams = {}): Promise<Paginated<Expense>> {
  const res = await apiClient.get("/finance/expenses/", { params });
  return unwrap<Paginated<Expense>>(res);
}

/** POST /api/v1/finance/expenses/ */
export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const res = await apiClient.post("/finance/expenses/", input);
  return unwrap<Expense>(res);
}

/** GET /api/v1/finance/expenses/{id}/ */
export async function getExpense(expenseId: number): Promise<Expense> {
  const res = await apiClient.get(`/finance/expenses/${expenseId}/`);
  return unwrap<Expense>(res);
}

/** PATCH /api/v1/finance/expenses/{id}/ */
export async function updateExpense(expenseId: number, input: Partial<ExpenseInput>): Promise<Expense> {
  const res = await apiClient.patch(`/finance/expenses/${expenseId}/`, input);
  return unwrap<Expense>(res);
}

/** DELETE /api/v1/finance/expenses/{id}/ */
export async function deleteExpense(expenseId: number): Promise<void> {
  await apiClient.delete(`/finance/expenses/${expenseId}/`);
}

// --- Analytics -------------------------------------------------------------------

/** GET /api/v1/finance/analytics/revenue/?period=daily|monthly&start=&end=
 * Time series of succeeded-payment revenue — powers the Analytics charts. */
export async function getRevenueAnalytics(params: RevenueAnalyticsParams = {}): Promise<RevenueAnalyticsResult> {
  const res = await apiClient.get("/finance/analytics/revenue/", { params });
  return unwrap<RevenueAnalyticsResult>(res);
}

/** GET /api/v1/finance/analytics/summary/?start=&end=
 * Single KPI aggregate: revenue, expenses, profit, order volume, avg order value. */
export async function getFinanceSummary(params: FinanceSummaryParams = {}): Promise<FinanceSummary> {
  const res = await apiClient.get("/finance/analytics/summary/", { params });
  return unwrap<FinanceSummary>(res);
}

// --- Credit accounts ("clients à crédit") -----------------------------------------

/** GET /api/v1/finance/credit-accounts/?search=&ordering=&outstanding_only=
 * Defaults to only customers who currently owe something. Pass
 * `outstanding_only: false` to see every credit account, including settled ones. */
export async function listCreditAccounts(
  params: ListCreditAccountsParams = {}
): Promise<Paginated<CreditAccount>> {
  const res = await apiClient.get("/finance/credit-accounts/", { params });
  return unwrap<Paginated<CreditAccount>>(res);
}

/** GET /api/v1/finance/credit-accounts/{user_id}/ */
export async function getCreditAccount(userId: number): Promise<CreditAccountDetail> {
  const res = await apiClient.get(`/finance/credit-accounts/${userId}/`);
  return unwrap<CreditAccountDetail>(res);
}

/** GET /api/v1/finance/credit-accounts/{user_id}/transactions/ */
export async function listCreditTransactions(userId: number): Promise<Paginated<CreditTransaction>> {
  const res = await apiClient.get(`/finance/credit-accounts/${userId}/transactions/`);
  return unwrap<Paginated<CreditTransaction>>(res);
}

/** POST /api/v1/finance/credit-accounts/{user_id}/charge/ — records that a
 * customer took goods/services on credit. */
export async function chargeCreditAccount(
  userId: number,
  input: CreditTransactionInput
): Promise<CreditAccountDetail> {
  const res = await apiClient.post(`/finance/credit-accounts/${userId}/charge/`, input);
  return unwrap<CreditAccountDetail>(res);
}

/** POST /api/v1/finance/credit-accounts/{user_id}/pay/ — records a repayment
 * against the customer's balance. */
export async function payCreditAccount(
  userId: number,
  input: CreditTransactionInput
): Promise<CreditAccountDetail> {
  const res = await apiClient.post(`/finance/credit-accounts/${userId}/pay/`, input);
  return unwrap<CreditAccountDetail>(res);
}
