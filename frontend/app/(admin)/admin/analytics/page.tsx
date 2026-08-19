"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { StatCard } from "@/components/dashboard/StatCard";
import { AddExpenseForm } from "@/components/finance/AddExpenseForm";
import { DateRangePicker, rangeForPreset, type DateRangePresetKey } from "@/components/finance/DateRangePicker";
import { RevenueChart } from "@/components/finance/RevenueChart";
import { Button, Card, Select } from "@/components/ui";
import { financeApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ExpenseCategory } from "@/types";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SUPPLIES: "Supplies",
  UTILITIES: "Utilities",
  SALARIES: "Salaries",
  MAINTENANCE: "Maintenance",
  RENT: "Rent",
  OTHER: "Other",
};

const CATEGORY_FILTER_OPTIONS: { value: ExpenseCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All categories" },
  ...(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([value, label]) => ({ value, label })),
];

export default function AdminAnalyticsPage() {
  const [preset, setPreset] = useState<DateRangePresetKey>("30d");
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [expensePage, setExpensePage] = useState(1);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | "ALL">("ALL");
  const [showAddExpense, setShowAddExpense] = useState(false);

  const range = useMemo(() => rangeForPreset(preset === "custom" ? "30d" : preset), [preset]);

  const summaryParams = { start: range.start, end: range.end };
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: queryKeys.finance.analytics.summary(summaryParams),
    queryFn: () => financeApi.getFinanceSummary(summaryParams),
  });

  const revenueParams = { period, start: range.start, end: range.end };
  const { data: revenue, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: queryKeys.finance.analytics.revenue(revenueParams),
    queryFn: () => financeApi.getRevenueAnalytics(revenueParams),
  });

  const expenseParams = {
    page: expensePage,
    category: expenseCategory === "ALL" ? undefined : expenseCategory,
    start: range.start,
    end: range.end,
  };
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: queryKeys.finance.expenses.list(expenseParams),
    queryFn: () => financeApi.listExpenses(expenseParams),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Analytics"
        description="Revenue, expenses, and profit over time."
        action={<DateRangePicker preset={preset} onPresetChange={setPreset} />}
      />

      {summaryError && <p className="mb-4 text-sm text-status-cancelled-text">{getApiErrorMessage(summaryError)}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={summaryLoading ? "—" : formatCurrency(summary?.revenue ?? 0)}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={summaryLoading ? "—" : formatCurrency(summary?.expenses ?? 0)}
        />
        <StatCard
          icon={Wallet}
          label="Profit"
          value={summaryLoading ? "—" : formatCurrency(summary?.profit ?? 0)}
          accent="gold"
        />
        <StatCard
          icon={Receipt}
          label="Avg. payment"
          value={summaryLoading ? "—" : formatCurrency(summary?.average_payment ?? 0)}
        />
      </div>
      {!summaryLoading && summary && (
        <p className="mt-2 text-xs text-ink-muted">
          {summary.payment_count} payment{summary.payment_count === 1 ? "" : "s"} between{" "}
          {new Date(summary.start).toLocaleDateString()} and {new Date(summary.end).toLocaleDateString()}.
        </p>
      )}

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-steam text-navy">
              <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <h2 className="font-display text-sm font-medium text-ink">Revenue</h2>
          </div>
          <div className="inline-flex rounded-md border border-crease bg-white p-0.5">
            {(["daily", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  period === p ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {revenueError && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(revenueError)}</p>}
        {revenueLoading && <div className="h-[220px] animate-pulse rounded-md bg-steam" />}
        {!revenueLoading && revenue && <RevenueChart points={revenue.results} period={revenue.period} />}
      </Card>

      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-sm font-medium text-ink">Expenses</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={expenseCategory}
            onChange={(e) => {
              setExpenseCategory(e.target.value as ExpenseCategory | "ALL");
              setExpensePage(1);
            }}
            className="w-44"
            aria-label="Filter expenses by category"
          >
            {CATEGORY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button variant="gold" onClick={() => setShowAddExpense((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add expense
          </Button>
        </div>
      </div>

      {showAddExpense && (
        <div className="mb-4">
          <AddExpenseForm onDone={() => setShowAddExpense(false)} />
        </div>
      )}

      {expensesError && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(expensesError)}</p>}

      <TableContainer>
        <THead>
          <Th>Date</Th>
          <Th>Category</Th>
          <Th>Notes</Th>
          <Th align="right">Amount</Th>
        </THead>
        <TBody>
          {expensesLoading && <TableSkeleton columns={4} />}
          {!expensesLoading && expenses && expenses.results.length === 0 && (
            <TableEmptyRow colSpan={4}>
              {expenseCategory === "ALL" ? "No expenses recorded in this range." : "No expenses match this filter."}
            </TableEmptyRow>
          )}
          {!expensesLoading &&
            expenses?.results.map((expense) => (
              <Tr key={expense.id}>
                <Td className="whitespace-nowrap text-ink-muted">{new Date(expense.date).toLocaleDateString()}</Td>
                <Td>{CATEGORY_LABELS[expense.category]}</Td>
                <Td className="text-ink-muted">{expense.notes || <span>—</span>}</Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(expense.amount)}
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {expenses && (
        <Pagination currentPage={expenses.current_page} numPages={expenses.num_pages} onPageChange={setExpensePage} />
      )}
    </main>
  );
}
