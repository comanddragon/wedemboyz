"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { ExpenseCategory } from "@/src/types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [category, setCategory] = useState<ExpenseCategory>("SUPPLIES");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  const categoryOptions: { value: ExpenseCategory; label: string }[] = [
    { value: "SUPPLIES", label: t("adminExpenses.categories.SUPPLIES") },
    { value: "UTILITIES", label: t("adminExpenses.categories.UTILITIES") },
    { value: "MAINTENANCE", label: t("adminExpenses.categories.MAINTENANCE") },
    { value: "RENT", label: t("adminExpenses.categories.RENT") },
    { value: "OTHER", label: t("adminExpenses.categories.OTHER") },
  ];

  const createMutation = useMutation({
    mutationFn: () =>
      financeApi.createExpense({
        category,
        amount: Number(amount),
        date,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
      setAmount("");
      setNotes("");
      onDone();
    },
  });

  const parsedAmount = Number(amount);
  const isValid =
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    date.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) createMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label={t("adminExpenses.category")} htmlFor="expense-category">
          <Select
            id="expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("adminExpenses.amount")} htmlFor="expense-amount">
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={t("adminExpenses.date")} htmlFor="expense-date">
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("adminExpenses.notesOptional")} htmlFor="expense-notes">
        <Textarea
          id="expense-notes"
          placeholder={t("adminExpenses.notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {createMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(createMutation.error)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || createMutation.isPending}
        >
          {createMutation.isPending
            ? t("adminExpenses.saving")
            : t("adminExpenses.saveExpense")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("adminExpenses.cancel")}
        </Button>
      </div>
    </form>
  );
}
