"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { financeApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { CreditAccountDetail } from "@/types";

type Mode = "charge" | "pay";

const MODE_COPY: Record<Mode, { title: string; hint: string; cta: string; pending: string }> = {
  charge: {
    title: "Add a charge",
    hint: "Records goods/services taken on credit — increases what the customer owes.",
    cta: "Record charge",
    pending: "Recording…",
  },
  pay: {
    title: "Record a payment",
    hint: "Records a repayment against the balance — decreases what the customer owes.",
    cta: "Record payment",
    pending: "Recording…",
  },
};

export function CreditTransactionForm({
  userId,
  mode,
  onDone,
}: {
  userId: number;
  mode: Mode;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const copy = MODE_COPY[mode];

  const mutation = useMutation({
    mutationFn: () => {
      const input = { amount: Number(amount), note: note.trim() || undefined };
      return mode === "charge"
        ? financeApi.chargeCreditAccount(userId, input)
        : financeApi.payCreditAccount(userId, input);
    },
    onSuccess: (updated: CreditAccountDetail) => {
      queryClient.setQueryData(queryKeys.finance.creditAccounts.detail(userId), updated);
      queryClient.invalidateQueries({ queryKey: ["finance", "credit-accounts", "list"] });
      setAmount("");
      setNote("");
      onDone();
    },
  });

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) mutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-ink">{copy.title}</h3>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Amount (XAF)" htmlFor={`${mode}-amount`} hint={copy.hint}>
          <Input
            id={`${mode}-amount`}
            type="number"
            step="1"
            min="0.01"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </Field>
      </div>

      <Field label="Note (optional)" htmlFor={`${mode}-note`}>
        <Textarea
          id={`${mode}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === "charge" ? "e.g. walk-in order, no order on file" : "e.g. cash received at counter"}
        />
      </Field>

      {mutation.isError && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(mutation.error)}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || mutation.isPending}>
          {mutation.isPending ? copy.pending : copy.cta}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
