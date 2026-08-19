"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { financeApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { ExpenseCategory } from "@/types";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "SUPPLIES", label: "Supplies" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SALARIES", label: "Salaries" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RENT", label: "Rent" },
  { value: "OTHER", label: "Other" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ExpenseCategory>("SUPPLIES");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

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
  const isValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0 && date.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) createMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="expense-category">
          <Select
            id="expense-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (XAF)" htmlFor="expense-amount">
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
        <Field label="Date" htmlFor="expense-date">
          <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="expense-notes">
        <Textarea
          id="expense-notes"
          placeholder="e.g. detergent restock from Casino"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {createMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(createMutation.error)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || createMutation.isPending}>
          {createMutation.isPending ? "Saving…" : "Save expense"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
