"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { Button, Card, StatusBadge } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";

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

  const {
    data: invoice,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.payments.invoice(invoiceId),
    queryFn: () => paymentsApi.getInvoice(invoiceId),
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !invoice) {
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
        href="/admin/payments/invoices"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to invoices
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {invoice.invoice_number || `Invoice #${invoice.id}`}
          </h1>
          <Link
            href={`/admin/orders/${invoice.order}`}
            className="mt-0.5 block text-xs text-ink-muted hover:underline"
          >
            For order #{invoice.order}
          </Link>
        </div>
        <StatusBadge
          label={invoice.is_settled ? "Settled" : "Outstanding"}
          tone={invoice.is_settled ? "ready" : "pending"}
        />
      </div>

      <Card>
        <Row label="Amount due" value={formatCurrency(invoice.amount_due)} />
        <Row label="Amount paid" value={formatCurrency(invoice.amount_paid)} />
        <Row
          label="Issued"
          value={new Date(invoice.issued_at).toLocaleString()}
        />
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print invoice
        </Button>
      {invoice.pdf_file && (
        <a
          href={invoice.pdf_file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Button variant="secondary">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
        </a>
      )}
      </div>
    </main>
  );
}
