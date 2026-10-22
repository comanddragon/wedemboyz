"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import {
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { StatCard } from "@/src/components/dashboard/StatCard";
import { AddExpenseForm } from "@/src/components/finance/AddExpenseForm";
import {
  DateRangePicker,
  rangeForPreset,
  type DateRangePresetKey,
} from "@/src/components/finance/DateRangePicker";
import { RevenueChart } from "@/src/components/finance/RevenueChart";
import { Button, Card, Select } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { ExpenseCategory } from "@/src/types";

export default function AdminAnalyticsPage() {
  const { locale, t } = useI18n();
  const [preset, setPreset] = useState<DateRangePresetKey>("30d");
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [expensePage, setExpensePage] = useState(1);
  const [expenseCategory, setExpenseCategory] = useState<
    ExpenseCategory | "ALL"
  >("ALL");
  const [showAddExpense, setShowAddExpense] = useState(false);

  const categoryLabels: Record<ExpenseCategory, string> = {
    SUPPLIES: t("adminExpenses.categories.SUPPLIES"),
    UTILITIES: t("adminExpenses.categories.UTILITIES"),
    MAINTENANCE: t("adminExpenses.categories.MAINTENANCE"),
    RENT: t("adminExpenses.categories.RENT"),
    OTHER: t("adminExpenses.categories.OTHER"),
  };

  const categoryFilterOptions: {
    value: ExpenseCategory | "ALL";
    label: string;
  }[] = [
    { value: "ALL", label: t("adminAnalytics.allCategories") },
    ...(Object.entries(categoryLabels) as [ExpenseCategory, string][]).map(
      ([value, label]) => ({ value, label }),
    ),
  ];

  const range = useMemo(
    () => rangeForPreset(preset === "custom" ? "30d" : preset),
    [preset],
  );

  const summaryParams = { start: range.start, end: range.end };
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: queryKeys.finance.analytics.summary(summaryParams),
    queryFn: () => financeApi.getFinanceSummary(summaryParams),
  });

  const revenueParams = { period, start: range.start, end: range.end };
  const {
    data: revenue,
    isLoading: revenueLoading,
    error: revenueError,
  } = useQuery({
    queryKey: queryKeys.finance.analytics.revenue(revenueParams),
    queryFn: () => financeApi.getRevenueAnalytics(revenueParams),
  });

  const expenseParams = {
    page: expensePage,
    category: expenseCategory === "ALL" ? undefined : expenseCategory,
    start: range.start,
    end: range.end,
  };
  const {
    data: expenses,
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: queryKeys.finance.expenses.list(expenseParams),
    queryFn: () => financeApi.listExpenses(expenseParams),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminAnalytics.title")}
        description={t("adminAnalytics.subtitle")}
        action={<DateRangePicker preset={preset} onPresetChange={setPreset} />}
      />

      {summaryError && (
        <p className="mb-4 text-sm text-status-cancelled-text">
          {getApiErrorMessage(summaryError)}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          compact
          icon={TrendingUp}
          label={t("adminAnalytics.incomeBooked")}
          value={summaryLoading ? "—" : formatCurrency(summary?.income_booked ?? 0)}
        />
        <StatCard
          compact
          icon={TrendingDown}
          label={t("adminAnalytics.cashReceived")}
          value={summaryLoading ? "—" : formatCurrency(summary?.cash_received ?? 0)}
        />
        <StatCard
          compact
          icon={Wallet}
          label={t("adminAnalytics.outstanding")}
          value={summaryLoading ? "—" : formatCurrency(summary?.outstanding ?? 0)}
          accent="gold"
        />
        <StatCard
          compact
          icon={Receipt}
          label={t("adminAnalytics.operatingProfit")}
          value={summaryLoading ? "—" : formatCurrency(summary?.profit ?? 0)}
        />
      </div>
      {!summaryLoading && summary && (
        <p className="mt-2 text-xs text-ink-muted">
          {summary.order_count === 1
            ? t("adminAnalytics.ordersSummary")
                .replace("{count}", "1")
                .replace(
                  "{start}",
                  new Date(summary.start).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  ),
                )
                .replace(
                  "{end}",
                  new Date(summary.end).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  ),
                )
            : t("adminAnalytics.ordersSummaryPlural")
                .replace("{count}", String(summary.order_count))
                .replace(
                  "{start}",
                  new Date(summary.start).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  ),
                )
                .replace(
                  "{end}",
                  new Date(summary.end).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  ),
                )}
        </p>
      )}

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-crease bg-revenue-green-soft/55 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-revenue-green text-white shadow-card-sm">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-navy">
                {t("adminAnalytics.trendTitle")}
              </h2>
              <p className="text-xs text-revenue-green-dark">
                {t("adminAnalytics.trendSubtitle")}
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-md border border-crease bg-white p-0.5">
            {(["daily", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  period === p
                    ? "bg-revenue-green-dark text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {p === "daily"
                  ? t("adminAnalytics.daily")
                  : t("adminAnalytics.monthly")}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          {revenueError && (
            <p className="mb-3 text-sm text-status-cancelled-text">
              {getApiErrorMessage(revenueError)}
            </p>
          )}
          {revenueLoading && (
            <div className="h-[260px] animate-pulse rounded-md bg-steam" />
          )}
          {!revenueLoading && revenue && (
            <RevenueChart points={revenue.results} period={revenue.period} />
          )}
        </div>
      </Card>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-sm font-medium text-ink">
          {t("adminExpenses.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={expenseCategory}
            onChange={(e) => {
              setExpenseCategory(e.target.value as ExpenseCategory | "ALL");
              setExpensePage(1);
            }}
            className="w-44"
            aria-label={t("adminAnalytics.filterExpensesCategory")}
          >
            {categoryFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button variant="gold" onClick={() => setShowAddExpense((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("adminAnalytics.addExpense")}
          </Button>
        </div>
      </div>

      {showAddExpense && (
        <div className="mb-4">
          <AddExpenseForm onDone={() => setShowAddExpense(false)} />
        </div>
      )}

      {expensesError && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(expensesError)}
        </p>
      )}

      <TableContainer>
        <THead>
          <Th>{t("adminAnalytics.colDate")}</Th>
          <Th>{t("adminAnalytics.colCategory")}</Th>
          <Th>{t("adminAnalytics.colNotes")}</Th>
          <Th align="right">{t("adminAnalytics.colAmount")}</Th>
        </THead>
        <TBody>
          {expensesLoading && <TableSkeleton columns={4} />}
          {!expensesLoading && expenses && expenses.results.length === 0 && (
            <TableEmptyRow colSpan={4}>
              {expenseCategory === "ALL"
                ? t("adminAnalytics.noExpensesRange")
                : t("adminAnalytics.noExpensesFilter")}
            </TableEmptyRow>
          )}
          {!expensesLoading &&
            expenses?.results.map((expense) => (
              <Tr key={expense.id}>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(expense.date).toLocaleDateString(
                    locale === "fr" ? "fr-FR" : "en-US",
                  )}
                </Td>
                <Td>
                  {categoryLabels[expense.category] ?? expense.category}
                </Td>
                <Td className="text-ink-muted">
                  {expense.notes || <span>—</span>}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(expense.amount)}
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {expenses && (
        <Pagination
          currentPage={expenses.current_page}
          numPages={expenses.num_pages}
          onPageChange={setExpensePage}
        />
      )}
    </main>
  );
}
