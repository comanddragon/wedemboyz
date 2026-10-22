"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Textarea } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { CreditAccountDetail } from "@/src/types";

type Mode = "charge" | "pay";

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
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const modeCopy: Record<
    Mode,
    { title: string; hint: string; cta: string; pending: string; placeholder: string }
  > = {
    charge: {
      title: t("adminCredit.chargeTitle"),
      hint: t("adminCredit.chargeHint"),
      cta: t("adminCredit.chargeCta"),
      pending: t("adminCredit.chargePending"),
      placeholder: t("adminCredit.chargePlaceholder"),
    },
    pay: {
      title: t("adminCredit.payTitle"),
      hint: t("adminCredit.payHint"),
      cta: t("adminCredit.payCta"),
      pending: t("adminCredit.payPending"),
      placeholder: t("adminCredit.payPlaceholder"),
    },
  };

  const copy = modeCopy[mode];

  const mutation = useMutation({
    mutationFn: () => {
      const input = { amount: Number(amount), note: note.trim() || undefined };
      return mode === "charge"
        ? financeApi.chargeCreditAccount(userId, input)
        : financeApi.payCreditAccount(userId, input);
    },
    onSuccess: (updated: CreditAccountDetail) => {
      queryClient.setQueryData(
        queryKeys.finance.creditAccounts.detail(userId),
        updated,
      );
      queryClient.invalidateQueries({
        queryKey: ["finance", "credit-accounts", "list"],
      });
      setAmount("");
      setNote("");
      onDone();
    },
  });

  const parsedAmount = Number(amount);
  const isValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) mutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <h3 className="mb-3 text-sm font-medium text-ink">{copy.title}</h3>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field
          label={t("adminCredit.amountLabel")}
          htmlFor={`${mode}-amount`}
          hint={copy.hint}
        >
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

      <Field label={t("adminCredit.noteOptional")} htmlFor={`${mode}-note`}>
        <Textarea
          id={`${mode}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={copy.placeholder}
        />
      </Field>

      {mutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(mutation.error)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || mutation.isPending}
        >
          {mutation.isPending ? copy.pending : copy.cta}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("adminCredit.cancel")}
        </Button>
      </div>
    </form>
  );
}
