"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Card, EyebrowLabel, StatusBadge, paymentStatusTone } from "@/components/ui";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { Payment, PaymentGateway } from "@/types";

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
        <ul className="space-y-2">
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
    return (
        <li>
            <Card className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                        {payment.order !== null ? `Order #${payment.order}` : `Subscription #${payment.subscription}`}
                    </p>
                    <p className="text-xs text-ink-muted">
                        {GATEWAY_LABELS[payment.gateway]} ·{" "}
                        {new Date(payment.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                    {payment.failure_reason && (
                        <p className="mt-0.5 text-xs text-status-cancelled-text">{payment.failure_reason}</p>
                    )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-ink">
                        {formatCurrency(payment.amount)}
                    </p>
                    <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
                </div>
            </Card>
        </li>
    );
}

export default function PaymentHistoryPage() {
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.payments.list(page),
        queryFn: () => paymentsApi.listPayments(page),
    });

    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy">
                    <Receipt className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <EyebrowLabel words={["Your account"]} />
                    <h1 className="font-display text-2xl font-semibold text-navy">Payment history</h1>
                </div>
            </div>

            {isLoading && <PaymentsSkeleton />}

            {isError && (
                <Card className="flex flex-col items-center gap-2 py-10 text-center">
                    <Receipt className="h-6 w-6 text-status-cancelled-text" aria-hidden="true" />
                    <p className="text-sm font-medium text-ink">Couldn't load your payment history</p>
                    <p className="max-w-xs text-xs text-ink-muted">{getApiErrorMessage(error)}</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-2 rounded-md border border-crease bg-white px-4 py-2 text-sm text-ink hover:bg-steam"
                    >
                        Try again
                    </button>
                </Card>
            )}

            {!isLoading && !isError && data && data.results.length === 0 && (
                <Card className="flex flex-col items-center gap-2 py-10 text-center">
                    <Receipt className="h-6 w-6 text-ink-muted" aria-hidden="true" />
                    <p className="text-sm font-medium text-ink">No payments yet</p>
                    <p className="max-w-xs text-xs text-ink-muted">
                        Payments you make for orders and subscriptions will show up here.
                    </p>
                </Card>
            )}

            {!isLoading && !isError && data && data.results.length > 0 && (
                <>
                    <ul className="space-y-2">
                        {data.results.map((payment) => (
                            <PaymentRow key={payment.id} payment={payment} />
                        ))}
                    </ul>

                    {data.num_pages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={!data.previous}
                                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                Previous
                            </button>

                            <p className="text-xs text-ink-muted">
                                Page {data.current_page} of {data.num_pages}
                            </p>

                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!data.next}
                                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-40"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </>
            )}

            <p className="mt-6 text-center text-xs text-ink-muted">
                Manage saved cards and mobile money accounts in{" "}
                <Link href="/settings/payments" className="font-medium text-navy hover:underline">
                    payment methods
                </Link>
                .
            </p>
        </main>
    );
}
