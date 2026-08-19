"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreditTransactionInput,
  ExpenseInput,
  FinanceSummaryParams,
  ListCreditAccountsParams,
  ListExpensesParams,
  RevenueAnalyticsParams,
} from "@/types";

/** GET/POST/PATCH/DELETE /api/v1/finance/expenses/ */
export function useExpenses(params: ListExpensesParams = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.finance.expenses.list(params),
    queryFn: () => financeApi.listExpenses(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });

  const createMutation = useMutation({
    mutationFn: (input: ExpenseInput) => financeApi.createExpense(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ expenseId, input }: { expenseId: number; input: Partial<ExpenseInput> }) =>
      financeApi.updateExpense(expenseId, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: number) => financeApi.deleteExpense(expenseId),
    onSuccess: invalidate,
  });

  return {
    expenses: listQuery.data?.results ?? [],
    count: listQuery.data?.count ?? 0,
    hasNextPage: Boolean(listQuery.data?.next),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    createExpense: createMutation.mutate,
    createExpenseAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateExpense: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteExpense: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

/** GET /api/v1/finance/analytics/revenue/ and .../summary/ — the KPI row +
 * revenue chart for the Analytics page. */
export function useFinanceAnalytics(
  revenueParams: RevenueAnalyticsParams = {},
  summaryParams: FinanceSummaryParams = {}
) {
  const revenueQuery = useQuery({
    queryKey: queryKeys.finance.analytics.revenue(revenueParams),
    queryFn: () => financeApi.getRevenueAnalytics(revenueParams),
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.finance.analytics.summary(summaryParams),
    queryFn: () => financeApi.getFinanceSummary(summaryParams),
  });

  return {
    revenue: revenueQuery.data,
    summary: summaryQuery.data,
    isLoading: revenueQuery.isLoading || summaryQuery.isLoading,
    isError: revenueQuery.isError || summaryQuery.isError,
  };
}

/** "Clients à crédit" — GET /api/v1/finance/credit-accounts/ plus
 * charge/pay mutations. */
export function useCreditAccounts(params: ListCreditAccountsParams = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.finance.creditAccounts.list(params),
    queryFn: () => financeApi.listCreditAccounts(params),
  });

  const invalidateAccount = (userId: number) => {
    queryClient.invalidateQueries({ queryKey: ["finance", "credit-accounts"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.finance.creditAccounts.detail(userId) });
  };

  const chargeMutation = useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: CreditTransactionInput }) =>
      financeApi.chargeCreditAccount(userId, input),
    onSuccess: (_, { userId }) => invalidateAccount(userId),
  });

  const payMutation = useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: CreditTransactionInput }) =>
      financeApi.payCreditAccount(userId, input),
    onSuccess: (_, { userId }) => invalidateAccount(userId),
  });

  return {
    accounts: listQuery.data?.results ?? [],
    count: listQuery.data?.count ?? 0,
    hasNextPage: Boolean(listQuery.data?.next),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    chargeAccount: chargeMutation.mutate,
    chargeAccountAsync: chargeMutation.mutateAsync,
    isCharging: chargeMutation.isPending,
    payAccount: payMutation.mutate,
    payAccountAsync: payMutation.mutateAsync,
    isPaying: payMutation.isPending,
  };
}

/** GET /api/v1/finance/credit-accounts/{user_id}/ + its transaction history
 * — the credit-account detail drawer/page for one customer. */
export function useCreditAccount(userId: number | undefined) {
  const detailQuery = useQuery({
    queryKey: queryKeys.finance.creditAccounts.detail(userId as number),
    queryFn: () => financeApi.getCreditAccount(userId as number),
    enabled: typeof userId === "number",
  });

  return {
    account: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}
