"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MinusCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { TableContainer, TableEmptyRow, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { CreditTransactionForm } from "@/components/finance/CreditTransactionForm";
import { Button, Card, StatusBadge } from "@/components/ui";
import { financeApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

const CREDIT_TX_LABEL: Record<string, string> = {
  CHARGE: "Charge",
  PAYMENT: "Payment",
  ADJUSTMENT: "Adjustment",
};

export default function AdminCreditAccountDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const [activeForm, setActiveForm] = useState<"charge" | "pay" | null>(null);

  const { data: account, isLoading, error } = useQuery({
    queryKey: queryKeys.finance.creditAccounts.detail(userId),
    queryFn: () => financeApi.getCreditAccount(userId),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !account) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin/finance/credit" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Clients à crédit
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const fullName = `${account.user.first_name} ${account.user.last_name}`.trim() || `Customer #${account.user.id}`;
  const balance = Number(account.balance);
  const nearLimit = balance > 0 && balance >= Number(account.credit_limit) * 0.9;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin/finance/credit" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Clients à crédit
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{fullName}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">{account.user.phone_number}</p>
        </div>
        <Link href={`/admin/customers/${account.user.id}`} className="text-xs text-navy hover:underline">
          View fiche client
        </Link>
      </div>

      <Card className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-muted">Balance owed</p>
            <p className={`text-2xl font-semibold tabular-nums ${balance > 0 ? "text-status-cancelled-text" : "text-navy"}`}>
              {formatCurrency(account.balance)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              of {formatCurrency(account.credit_limit)} limit
              {nearLimit && (
                <span className="ml-2">
                  <StatusBadge label="Near limit" tone="cancelled" />
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setActiveForm(activeForm === "pay" ? null : "pay")}>
              <MinusCircle className="h-4 w-4" aria-hidden="true" />
              Record payment
            </Button>
            <Button variant="secondary" onClick={() => setActiveForm(activeForm === "charge" ? null : "charge")}>
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Add charge
            </Button>
          </div>
        </div>
        <p className="mt-3 border-t border-crease pt-3 text-xs text-ink-muted">
          {account.days_since_last_activity === null
            ? "No activity recorded yet."
            : account.days_since_last_activity === 0
              ? "Last activity today."
              : `Last activity ${account.days_since_last_activity} day${account.days_since_last_activity === 1 ? "" : "s"} ago.`}
        </p>
      </Card>

      {activeForm && (
        <div className="mb-6">
          <CreditTransactionForm userId={userId} mode={activeForm} onDone={() => setActiveForm(null)} />
        </div>
      )}

      <h2 className="font-display mb-3 text-sm font-medium text-ink">Transaction history</h2>
      <TableContainer>
        <THead>
          <Th>Type</Th>
          <Th align="right">Amount</Th>
          <Th>Note</Th>
          <Th>Order</Th>
          <Th>By</Th>
          <Th align="right">When</Th>
        </THead>
        <TBody>
          {account.transactions.length === 0 && (
            <TableEmptyRow colSpan={6}>No credit activity yet.</TableEmptyRow>
          )}
          {account.transactions.map((tx) => (
            <Tr key={tx.id}>
              <Td>{CREDIT_TX_LABEL[tx.transaction_type] ?? tx.transaction_type}</Td>
              <Td
                align="right"
                className={`tabular-nums ${tx.transaction_type === "PAYMENT" ? "text-status-ready-text" : "text-ink"}`}
              >
                {tx.transaction_type === "PAYMENT" ? "-" : ""}
                {formatCurrency(tx.amount)}
              </Td>
              <Td className="text-ink-muted">{tx.note || "—"}</Td>
              <Td className="text-ink-muted">
                {tx.order ? (
                  <Link href={`/admin/orders/${tx.order}`} className="text-navy hover:underline">
                    #{tx.order}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="text-ink-muted">{tx.created_by || "—"}</Td>
              <Td align="right" className="whitespace-nowrap text-ink-muted">
                {new Date(tx.created_at).toLocaleString()}
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableContainer>
    </main>
  );
}
