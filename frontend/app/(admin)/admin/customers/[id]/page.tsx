"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { TableContainer, TableEmptyRow, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { Card, StatusBadge, orderStatusTone } from "@/components/ui";
import { customersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
};

const CREDIT_TX_LABEL: Record<string, string> = {
  CHARGE: "Charge",
  PAYMENT: "Payment",
  ADJUSTMENT: "Adjustment",
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => customersApi.getCustomer(customerId),
  });

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !customer) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/admin/customers"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to customers
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const fullName = `${customer.first_name} ${customer.last_name}`.trim() || `Customer #${customer.id}`;
  const creditOwed = Number(customer.credit_balance) > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to customers
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{fullName}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Customer since {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        {!customer.is_active && <StatusBadge label="Inactive" tone="cancelled" />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">Contact</h2>
          <div className="space-y-2 text-sm text-ink-muted">
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {customer.phone_number}
            </p>
            {customer.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {customer.email}
              </p>
            )}
            {(customer.address_line || customer.city) && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {customer.address_line}
                  {customer.address_line && customer.city ? ", " : ""}
                  {customer.city}
                </span>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">At a glance</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-muted">Orders</dt>
            <dd className="text-right font-medium text-ink">{customer.orders_count}</dd>
            <dt className="text-ink-muted">Lifetime spend</dt>
            <dd className="text-right font-medium tabular-nums text-ink">
              {formatCurrency(customer.lifetime_spend)}
            </dd>
            <dt className="text-ink-muted">Loyalty tier</dt>
            <dd className="text-right">
              {customer.loyalty_tier ? (
                <StatusBadge label={TIER_LABEL[customer.loyalty_tier] ?? customer.loyalty_tier} tone="ready" />
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </dd>
            <dt className="text-ink-muted">Loyalty points</dt>
            <dd className="text-right font-medium tabular-nums text-ink">
              {customer.loyalty.points_balance}
            </dd>
            <dt className="text-ink-muted">Credit owed</dt>
            <dd className={`text-right font-medium tabular-nums ${creditOwed ? "text-status-cancelled-text" : "text-ink"}`}>
              {formatCurrency(customer.credit_balance)}
            </dd>
          </dl>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-sm font-medium text-ink">Recent orders</h2>
        <span className="text-xs text-ink-muted">Last 10</span>
      </div>
      <div className="mt-3">
        <TableContainer>
          <THead>
            <Th>Order</Th>
            <Th>Placed</Th>
            <Th align="right">Total</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {customer.recent_orders.length === 0 && <TableEmptyRow colSpan={4}>No orders yet.</TableEmptyRow>}
            {customer.recent_orders.map((order) => (
              <Tr key={order.id}>
                <Td className="font-medium">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                    #{order.id}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(order.created_at).toLocaleDateString()}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(order.total_amount)}
                </Td>
                <Td>
                  <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-sm font-medium text-ink">Credit ledger</h2>
        <span className="text-xs text-ink-muted">Last 10</span>
      </div>
      <div className="mt-3">
        <TableContainer>
          <THead>
            <Th>Type</Th>
            <Th align="right">Amount</Th>
            <Th>Note</Th>
            <Th align="right">When</Th>
          </THead>
          <TBody>
            {customer.recent_credit_transactions.length === 0 && (
              <TableEmptyRow colSpan={4}>No credit activity — this customer doesn&apos;t have a tab.</TableEmptyRow>
            )}
            {customer.recent_credit_transactions.map((tx) => (
              <Tr key={tx.id}>
                <Td>{CREDIT_TX_LABEL[tx.transaction_type] ?? tx.transaction_type}</Td>
                <Td align="right" className="tabular-nums">
                  {tx.transaction_type === "PAYMENT" ? "-" : ""}
                  {formatCurrency(tx.amount)}
                </Td>
                <Td className="text-ink-muted">{tx.note || "—"}</Td>
                <Td align="right" className="whitespace-nowrap text-ink-muted">
                  {new Date(tx.created_at).toLocaleString()}
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>
        {creditOwed && (
          <p className="mt-3 text-xs text-ink-muted">
            Full history and charge/pay actions live on{" "}
            <Link href="/admin/finance/credit" className="font-medium text-navy hover:underline">
              Clients à crédit
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
