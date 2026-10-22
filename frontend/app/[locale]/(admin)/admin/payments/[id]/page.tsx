"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { Card, StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { PaymentMethodType } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-crease py-3 text-sm last:border-b-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const { locale, t } = useI18n();
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

  const methodLabels: Record<PaymentMethodType, string> = {
    MTN_MOMO: t("adminFinance.methodLabels.MTN_MOMO"),
    ORANGE_MONEY: t("adminFinance.methodLabels.ORANGE_MONEY"),
    CASH: t("adminFinance.methodLabels.CASH"),
    BANK_TRANSFER: t("adminFinance.methodLabels.BANK_TRANSFER"),
    OTHER: t("adminFinance.methodLabels.OTHER"),
  };

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        {t("adminFinance.loading")}
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

  const payerDisplayName =
    payment.payer_name ||
    (payment.customer
      ? `${payment.customer.first_name} ${payment.customer.last_name}`.trim()
      : t("adminFinance.paymentHash").replace("{id}", String(payment.id)));

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/payments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminFinance.backToPayments")}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CustomerAvatar name={payerDisplayName} size="lg" />
          <div>
            <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
              {t("adminFinance.paymentHash").replace("{id}", String(payment.id))}
            </h1>
            {payment.order !== null ? (
              <Link
                href={`/admin/orders/${payment.order}`}
                className="mt-0.5 block text-xs text-ink-muted hover:underline"
              >
                {t("adminFinance.forOrder").replace("{id}", String(payment.order))}
              </Link>
            ) : (
              <p className="mt-0.5 text-xs text-ink-muted">
                {t("adminFinance.forSubscription").replace("{id}", String(payment.subscription))}
              </p>
            )}
          </div>
        </div>
        <StatusBadge
          label={payment.status}
          tone={paymentStatusTone(payment.status)}
        />
      </div>

      <Card>
        <Row label={t("adminFinance.amount")} value={formatCurrency(payment.amount)} />
        <Row label={t("adminFinance.currency")} value={payment.currency} />
        <Row
          label={t("adminFinance.method")}
          value={methodLabels[payment.payment_method_type] ?? payment.payment_method_type}
        />
        <Row label={t("adminFinance.reference")} value={payment.reference || "—"} />
        <Row
          label={t("adminFinance.receivedAt")}
          value={new Date(payment.received_at).toLocaleString(locale)}
        />
        <Row label={t("adminFinance.payer")} value={payment.payer_name || "—"} />
        <Row label={t("adminFinance.payerPhone")} value={payment.payer_phone || "—"} />
        <Row label={t("adminFinance.notes")} value={payment.notes || "—"} />
        {payment.failure_reason && (
          <Row
            label={t("adminFinance.failureReason")}
            value={
              <span className="text-status-cancelled-text">
                {payment.failure_reason}
              </span>
            }
          />
        )}
        <Row
          label={t("adminFinance.created")}
          value={new Date(payment.created_at).toLocaleString(locale)}
        />
      </Card>
    </main>
  );
}
