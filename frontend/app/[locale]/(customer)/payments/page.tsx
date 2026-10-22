"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useState } from "react";

import {
  Card,
  EyebrowLabel,
  StatusBadge,
  paymentStatusTone,
} from "@/src/components/ui";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { useAuth } from "@/src/hooks/useAuth";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { Payment, PaymentGateway } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

const GATEWAY_LABELS: Record<PaymentGateway, string> = {
  STRIPE: "Card",
  PAYPAL: "PayPal",
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  CASH: "Cash",
  CREDIT: "Credit (pay later)",
};

function PaymentsSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-steam" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-1/3 animate-pulse rounded bg-steam" />
              <span className="block h-2.5 w-1/4 animate-pulse rounded bg-steam" />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const { locale, t } = useI18n();
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5">
        <PaymentMethodIcon method={payment.payment_method_type} gateway={payment.gateway} className="h-10 w-12" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {payment.order !== null
              ? `${t("payments.order")} #${payment.order}`
              : `${t("payments.subscription")} #${payment.subscription}`}
          </p>
          <p className="text-xs text-ink-muted">
            {payment.gateway === "STRIPE" ? t("payments.card") : payment.gateway === "CASH" ? t("payments.cash") : payment.gateway === "CREDIT" ? t("payments.credit") : GATEWAY_LABELS[payment.gateway]} ·{" "}
            {new Date(payment.created_at).toLocaleDateString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          {payment.failure_reason && (
            <p className="mt-0.5 text-xs text-status-cancelled-text">
              {payment.failure_reason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <p className="text-sm font-semibold text-ink">
            {formatCurrency(payment.amount)}
          </p>
          <StatusBadge
            label={payment.status}
            tone={paymentStatusTone(payment.status)}
          />
        </div>
    </li>
  );
}

export default function PaymentHistoryPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.payments.list(page),
    queryFn: () => paymentsApi.listPayments(page),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex items-center gap-3">
        <CustomerAvatar name={user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.phone_number : "Customer"} size="lg" imageUrl={user?.avatar} useProfilePhoto={user?.use_profile_photo} />
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {t("payments.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("payments.subtitle")}</p>
        </div>
      </div>

      {isLoading && <PaymentsSkeleton />}

      {isError && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Receipt
            className="h-6 w-6 text-status-cancelled-text"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-ink">
            {t("payments.loadError")}
          </p>
          <p className="max-w-xs text-xs text-ink-muted">
            {getApiErrorMessage(error)}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded-md border border-crease bg-white px-4 py-2 text-sm text-ink hover:bg-steam"
          >
            {t("payments.retry")}
          </button>
        </Card>
      )}

      {!isLoading && !isError && data && data.results.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Receipt className="h-6 w-6 text-ink-muted" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">{t("payments.empty")}</p>
          <p className="max-w-xs text-xs text-ink-muted">
            {t("payments.emptyBody")}
          </p>
        </Card>
      )}

      {!isLoading && !isError && data && data.results.length > 0 && (
        <>
          <div className="overflow-hidden rounded-2xl border border-crease bg-white"><div className="flex items-center justify-between border-b border-crease bg-steam/35 px-5 py-3"><p className="text-xs font-medium text-ink-muted">{t("payments.history")}</p><Receipt className="h-4 w-4 text-gold-600" /></div><ul className="divide-y divide-crease">
            {data.results.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </ul></div>

          {data.num_pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t("payments.previous")}
              </button>

              <p className="text-xs text-ink-muted">
                {t("payments.page")} {data.current_page} {t("payments.of")} {data.num_pages}
              </p>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-40"
              >
                {t("payments.next")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-center text-xs text-ink-muted">
        {t("payments.managePrefix")} {" "}
        <Link
          href="/settings/payments"
          className="font-medium text-navy hover:underline"
        >
          {t("payments.methods")}
        </Link>
        .
      </p>
    </main>
  );
}
