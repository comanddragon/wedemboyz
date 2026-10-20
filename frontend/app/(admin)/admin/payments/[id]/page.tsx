"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Card, StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { PaymentMethodType } from "@/src/types";

const METHOD_LABELS: Record<PaymentMethodType, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-crease py-3 text-sm last:border-b-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = Number(params.id);

  const {
    data: payment,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.payments.detail(paymentId),
    queryFn: () => paymentsApi.getPayment(paymentId),
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !payment) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/payments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to payments
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            Payment #{payment.id}
          </h1>
          {payment.order !== null ? (
            <Link
              href={`/admin/orders/${payment.order}`}
              className="mt-0.5 block text-xs text-ink-muted hover:underline"
            >
              For order #{payment.order}
            </Link>
          ) : (
            <p className="mt-0.5 text-xs text-ink-muted">
              For subscription #{payment.subscription}
            </p>
          )}
        </div>
        <StatusBadge
          label={payment.status}
          tone={paymentStatusTone(payment.status)}
        />
      </div>

      <Card>
        <Row label="Amount" value={formatCurrency(payment.amount)} />
        <Row label="Currency" value={payment.currency} />
        <Row label="Method" value={METHOD_LABELS[payment.payment_method_type]} />
        <Row label="Reference" value={payment.reference || "—"} />
        <Row
          label="Received at"
          value={new Date(payment.received_at).toLocaleString()}
        />
        <Row label="Payer" value={payment.payer_name || "—"} />
        <Row label="Payer phone" value={payment.payer_phone || "—"} />
        <Row label="Notes" value={payment.notes || "—"} />
        {payment.failure_reason && (
          <Row
            label="Failure reason"
            value={
              <span className="text-status-cancelled-text">
                {payment.failure_reason}
              </span>
            }
          />
        )}
        <Row
          label="Created"
          value={new Date(payment.created_at).toLocaleString()}
        />
      </Card>
    </main>
  );
}
