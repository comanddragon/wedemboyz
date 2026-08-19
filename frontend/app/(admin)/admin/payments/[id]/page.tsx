"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Card, StatusBadge, paymentStatusTone } from "@/components/ui";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { PaymentGateway } from "@/types";

const GATEWAY_LABELS: Record<PaymentGateway, string> = {
    STRIPE: "Card",
    PAYPAL: "PayPal",
    MTN_MOMO: "MTN Mobile Money",
    ORANGE_MONEY: "Orange Money",
    CASH: "Cash",
    CREDIT: "Credit (pay later)",
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

    const { data: payment, isLoading, error } = useQuery({
        queryKey: queryKeys.payments.detail(paymentId),
        queryFn: () => paymentsApi.getPayment(paymentId),
    });

    if (isLoading) {
        return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
    }

    if (error || !payment) {
        return (
            <main className="mx-auto max-w-2xl px-6 py-10">
                <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <Link
                href="/admin/payments"
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to payments
            </Link>

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="font-display text-xl font-semibold text-navy">Payment #{payment.id}</h1>
                    {payment.order !== null ? (
                        <Link href={`/admin/orders/${payment.order}`} className="mt-0.5 block text-xs text-ink-muted hover:underline">
                            For order #{payment.order}
                        </Link>
                    ) : (
                        <p className="mt-0.5 text-xs text-ink-muted">For subscription #{payment.subscription}</p>
                    )}
                </div>
                <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
            </div>

            <Card>
                <Row label="Amount" value={formatCurrency(payment.amount)} />
                <Row label="Currency" value={payment.currency} />
                <Row label="Gateway" value={GATEWAY_LABELS[payment.gateway]} />
                <Row label="Gateway reference" value={payment.gateway_reference || "—"} />
                <Row label="Method on file" value={payment.method?.display_label ?? "—"} />
                <Row label="Paid at" value={payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"} />
                {payment.failure_reason && (
                    <Row label="Failure reason" value={<span className="text-status-cancelled-text">{payment.failure_reason}</span>} />
                )}
                <Row label="Created" value={new Date(payment.created_at).toLocaleString()} />
            </Card>
        </main>
    );
}