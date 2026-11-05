"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

export function LoyaltyCashouts({ admin = false, balance }: { admin?: boolean; balance?: number }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const amountId = useId();
  const cashouts = useQuery({
    queryKey: ["ambassadors", "cashouts", admin],
    queryFn: () => discountsApi.listAmbassadorCashouts(admin),
  });
  const request = useMutation({
    mutationFn: () => discountsApi.requestAmbassadorCashout(Number(amount)),
    onSuccess: () => {
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["ambassadors"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });
  const pay = useMutation({
    mutationFn: ({ id, reference }: { id: number; reference: string }) => discountsApi.payAmbassadorCashout(id, reference),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ambassadors"] }),
  });
  const error = cashouts.error || request.error || pay.error;
  return (
    <section className="my-6 rounded-2xl border border-crease bg-white p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold text-navy">{t("cashouts.title")}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t(admin ? "cashouts.adminBody" : "cashouts.body")}</p>
      {balance !== undefined ? <p className="mt-3 text-sm font-semibold text-navy">{t("adminPrograms.availableCredits")}: {formatCurrency(balance)}</p> : null}
      {error ? <p className="mt-3 text-sm text-status-cancelled-text" role="alert">{getApiErrorMessage(error)}</p> : null}
      {!admin ? (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (Number(amount) > 0) request.mutate(); }}>
          <Field label={t("cashouts.amount")} htmlFor={amountId}><Input id={amountId} type="number" min="1" max={balance} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Button type="submit" disabled={request.isPending || Number(amount) <= 0 || (balance !== undefined && Number(amount) > balance)}>{t("cashouts.request")}</Button>
        </form>
      ) : null}
      {cashouts.isLoading ? <p className="mt-4 text-sm text-ink-muted">{t("cashouts.loading")}</p> : null}
      {cashouts.data?.length === 0 ? <p className="mt-4 text-sm text-ink-muted">{t("cashouts.empty")}</p> : null}
      <ul className="mt-4 divide-y divide-crease">
        {cashouts.data?.map((cashout) => (
          <li key={cashout.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="text-sm font-semibold text-navy">{admin ? `${cashout.ambassador_name} · ` : ""}{formatCurrency(Number(cashout.amount))}</p><p className="text-xs text-ink-muted">{t(cashout.status === "PAID" ? "cashouts.paid" : "cashouts.pending")}{cashout.reference ? ` · ${cashout.reference}` : ""}</p></div>
            {admin && cashout.status === "PENDING" ? (
              <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); const reference = new FormData(event.currentTarget).get("reference"); if (typeof reference === "string" && reference.trim()) pay.mutate({ id: cashout.id, reference: reference.trim() }); }}>
                <Input name="reference" aria-label={t("cashouts.reference")} placeholder={t("cashouts.reference")} required maxLength={120} />
                <Button type="submit" disabled={pay.isPending}>{t("cashouts.markPaid")}</Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
