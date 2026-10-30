"use client";

import { useI18n } from "@/src/i18n/I18nProvider";
import { paymentState } from "@/src/lib/payment-options";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/constants";
import type { OrderPaymentStatus } from "@/src/types";

export function PaymentSummary({
  status,
  total,
  paid,
  balance,
}: {
  status: OrderPaymentStatus;
  total: string;
  paid: string;
  balance: string;
}) {
  const { locale } = useI18n();
  const fr = locale === "fr";
  const state = paymentState(status);
  const paidNumber = Number(paid);
  const totalNumber = Number(total);
  const percentage =
    totalNumber > 0 ? Math.min((paidNumber / totalNumber) * 100, 100) : 100;
  const Icon = state === "PAID" ? CheckCircle2 : AlertCircle;

  return (
    <section aria-labelledby="payment-summary-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0 text-navy"
            aria-hidden="true"
          />
          <div>
            <h2
              id="payment-summary-title"
              className="text-sm font-semibold text-navy"
            >
              {fr ? "Paiement" : "Payment"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {state === "PAID"
                ? fr
                  ? "La commande est réglée."
                  : "The order is fully paid."
                : fr
                  ? "Un solde reste à régler."
                  : "A balance remains to be collected."}
            </p>
          </div>
        </div>
        <StatusBadge label={state} tone={paymentStatusTone(state)} />
      </div>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-steam"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-gold"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-ink-muted">{fr ? "Total" : "Total"}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">
            {formatCurrency(total)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr ? "Reçu" : "Received"}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">
            {formatCurrency(paid)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{fr ? "Solde" : "Balance"}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">
            {formatCurrency(balance)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
