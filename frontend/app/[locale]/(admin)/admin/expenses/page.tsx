"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, ReceiptText, Trash2 } from "lucide-react";
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
import { Button, Field, Input, Select } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { ExpenseCategory } from "@/src/types";

const CATEGORIES: ExpenseCategory[] = [
  "SUPPLIES",
  "UTILITIES",
  "MAINTENANCE",
  "RENT",
  "OTHER",
];
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [showForm, setShowForm] = useState(false);

  const categoryLabels: Record<ExpenseCategory, string> = {
    SUPPLIES: t("adminExpenses.categories.SUPPLIES"),
    UTILITIES: t("adminExpenses.categories.UTILITIES"),
    MAINTENANCE: t("adminExpenses.categories.MAINTENANCE"),
    RENT: t("adminExpenses.categories.RENT"),
    OTHER: t("adminExpenses.categories.OTHER"),
  };

  const expenses = useQuery({
    queryKey: queryKeys.finance.expenses.list({
      page,
      category: category || undefined,
    }),
    queryFn: () =>
      financeApi.listExpenses({ page, category: category || undefined }),
  });

  const pageTotal = useMemo(
    () =>
      expenses.data?.results.reduce(
        (sum, row) => sum + Number(row.amount),
        0,
      ) ?? 0,
    [expenses.data],
  );

  const createExpense = useMutation({
    mutationFn: (input: Parameters<typeof financeApi.createExpense>[0]) =>
      financeApi.createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
      setShowForm(false);
    },
  });

  const deleteExpense = useMutation({
    mutationFn: financeApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
    },
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminExpenses.title")}
        description={t("adminExpenses.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                financeApi.exportExpenses({ category: category || undefined })
              }
            >
              <Download className="h-4 w-4" /> {t("adminExpenses.export")}
            </Button>
            <Button
              variant="gold"
              onClick={() => setShowForm((value) => !value)}
            >
              <Plus className="h-4 w-4" /> {t("adminExpenses.addExpense")}
            </Button>
          </div>
        }
      />
      {showForm ? (
        <form
          className="mb-5 grid gap-3 rounded-xl border border-crease bg-white p-4 sm:grid-cols-2 lg:grid-cols-[180px_180px_160px_1fr_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            createExpense.mutate({
              category: String(data.get("category")) as ExpenseCategory,
              amount: Number(data.get("amount")),
              date: String(data.get("date")),
              notes: String(data.get("notes") ?? ""),
            });
          }}
        >
          <Field label={t("adminExpenses.category")} htmlFor="expense-category">
            <Select id="expense-category" name="category">
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("adminExpenses.amount")} htmlFor="expense-amount">
            <Input id="expense-amount" name="amount" type="number" min="1" required />
          </Field>
          <Field label={t("adminExpenses.date")} htmlFor="expense-date">
            <Input
              id="expense-date"
              name="date"
              type="date"
              defaultValue={today()}
              required
            />
          </Field>
          <Field label={t("adminExpenses.note")} htmlFor="expense-note">
            <Input
              id="expense-note"
              name="notes"
              placeholder={t("adminExpenses.supplierPlaceholder")}
            />
          </Field>
          <Button type="submit" size="sm" disabled={createExpense.isPending}>
            {createExpense.isPending
              ? t("adminExpenses.saving")
              : t("adminExpenses.save")}
          </Button>
          {createExpense.error ? (
            <p className="text-xs text-status-cancelled-text sm:col-span-full">
              {getApiErrorMessage(createExpense.error)}
            </p>
          ) : null}
        </form>
      ) : null}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <Field label={t("adminExpenses.category")} htmlFor="expense-filter">
          <Select
            id="expense-filter"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ExpenseCategory | "");
              setPage(1);
            }}
          >
            <option value="">{t("adminExpenses.allCategories")}</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-sm text-ink-muted">
          {t("adminExpenses.thisPage")}{" "}
          <strong className="text-navy">{formatCurrency(pageTotal)}</strong>
        </p>
      </div>
      {expenses.error ? (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(expenses.error)}
        </p>
      ) : null}
      <TableContainer>
        <THead>
          <Th>{t("adminExpenses.date")}</Th>
          <Th>{t("adminExpenses.category")}</Th>
          <Th>{t("adminExpenses.note")}</Th>
          <Th align="right">{t("adminExpenses.amount")}</Th>
          <Th />
        </THead>
        <TBody>
          {expenses.isLoading ? <TableSkeleton columns={5} /> : null}
          {!expenses.isLoading && !expenses.data?.results.length ? (
            <TableEmptyRow colSpan={5}>
              <span className="inline-flex items-center gap-2">
                <ReceiptText className="h-4 w-4" />{" "}
                {t("adminExpenses.noExpenses")}
              </span>
            </TableEmptyRow>
          ) : null}
          {expenses.data?.results.map((expense) => (
            <Tr key={expense.id}>
              <Td className="whitespace-nowrap">
                {new Date(`${expense.date}T00:00:00`).toLocaleDateString(
                  locale === "fr" ? "fr-FR" : "en-US",
                )}
              </Td>
              <Td>
                {categoryLabels[expense.category] ??
                  expense.category.replace(/_/g, " ")}
              </Td>
              <Td className="text-ink-muted">{expense.notes || "—"}</Td>
              <Td align="right" className="font-medium tabular-nums">
                {formatCurrency(expense.amount)}
              </Td>
              <Td align="right">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete expense from ${expense.date}`}
                  disabled={deleteExpense.isPending}
                  onClick={() => {
                    if (window.confirm(t("adminExpenses.deleteConfirm")))
                      deleteExpense.mutate(expense.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-status-cancelled-text" />
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableContainer>
      {expenses.data ? (
        <Pagination
          currentPage={expenses.data.current_page}
          numPages={expenses.data.num_pages}
          onPageChange={setPage}
        />
      ) : null}
    </main>
  );
}
