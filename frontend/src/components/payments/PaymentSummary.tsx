import { AlertCircle, CheckCircle2, CircleDollarSign } from "lucide-react";

import { StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { formatCurrency } from "@/src/lib/constants";
import type { OrderPaymentStatus } from "@/src/types";

const STATUS_COPY: Record<OrderPaymentStatus, string> = {
  UNPAID: "No payment has been recorded.",
  PARTIALLY_PAID: "A remaining balance still needs to be collected.",
  PAID: "The order is fully paid.",
  OVERPAID: "More was received than was due. Review the excess.",
  PARTIALLY_REFUNDED: "Part of the received amount has been refunded.",
  REFUNDED: "The received amount has been refunded.",
  WAIVED: "The remaining balance was written off.",
  NO_CHARGE: "No payment is required for this order.",
  VOID: "The order was cancelled and no balance is collectible.",
};

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
  const paidNumber = Number(paid);
  const totalNumber = Number(total);
  const percentage = totalNumber > 0 ? Math.min((paidNumber / totalNumber) * 100, 100) : 100;
  const Icon = status === "PAID" || status === "NO_CHARGE"
    ? CheckCircle2
    : status === "UNPAID" || status === "VOID"
      ? AlertCircle
      : CircleDollarSign;

  return (
    <section aria-labelledby="payment-summary-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
          <div>
            <h2 id="payment-summary-title" className="text-sm font-semibold text-navy">
              Payment
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">{STATUS_COPY[status]}</p>
          </div>
        </div>
        <StatusBadge label={status} tone={paymentStatusTone(status)} />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-steam" aria-hidden="true">
        <div className="h-full rounded-full bg-gold" style={{ width: `${percentage}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-ink-muted">Total</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">{formatCurrency(total)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Received</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">{formatCurrency(paid)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Balance</dt>
          <dd className="mt-1 font-semibold tabular-nums text-ink">{formatCurrency(balance)}</dd>
        </div>
      </dl>
    </section>
  );
}
