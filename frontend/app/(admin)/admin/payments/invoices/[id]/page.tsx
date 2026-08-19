"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button, Card, StatusBadge } from "@/components/ui";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-crease py-3 text-sm last:border-b-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: queryKeys.payments.invoice(invoiceId),
    queryFn: () => paymentsApi.getInvoice(invoiceId),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !invoice) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/payments/invoices"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to invoices
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{invoice.invoice_number || `Invoice #${invoice.id}`}</h1>
          <Link href={`/admin/orders/${invoice.order}`} className="mt-0.5 block text-xs text-ink-muted hover:underline">
            For order #{invoice.order}
          </Link>
        </div>
        <StatusBadge label={invoice.is_settled ? "Settled" : "Outstanding"} tone={invoice.is_settled ? "ready" : "pending"} />
      </div>

      <Card>
        <Row label="Amount due" value={formatCurrency(invoice.amount_due)} />
        <Row label="Amount paid" value={formatCurrency(invoice.amount_paid)} />
        <Row label="Issued" value={new Date(invoice.issued_at).toLocaleString()} />
      </Card>

      {invoice.pdf_file && (
        <a href={invoice.pdf_file} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
          <Button variant="secondary">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
        </a>
      )}
    </main>
  );
}
