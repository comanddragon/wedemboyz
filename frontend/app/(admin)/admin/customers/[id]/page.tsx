"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Coins, Mail, MapPin, Phone, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  TableContainer,
  TableEmptyRow,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { Button, Card, Field, Input, Select, StatusBadge, Textarea, orderStatusTone } from "@/src/components/ui";
import { customersApi, discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";

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
  const queryClient = useQueryClient();

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => customersApi.getCustomer(customerId),
  });

  const updateCustomer = useMutation({
    mutationFn: (input: Parameters<typeof customersApi.updateCustomer>[1]) => customersApi.updateCustomer(customerId, input),
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.customers.detail(customerId), updated),
  });
  const adjustPoints = useMutation({
    mutationFn: (input: { points: number; reason: string }) => discountsApi.adjustCustomerLoyalty(customerId, input.points, input.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) }),
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !customer) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href="/admin/customers"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to customers
        </Link>
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  const fullName =
    `${customer.first_name} ${customer.last_name}`.trim() ||
    `Customer #${customer.id}`;
  const creditOwed = Number(customer.credit_balance) > 0;

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to customers
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {fullName}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Customer since {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>
        {!customer.is_active && (
          <StatusBadge label="Inactive" tone="cancelled" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Contact
          </h2>
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
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
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
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            At a glance
          </h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-muted">Orders</dt>
            <dd className="text-right font-medium text-ink">
              {customer.orders_count}
            </dd>
            <dt className="text-ink-muted">Lifetime spend</dt>
            <dd className="text-right font-medium tabular-nums text-ink">
              {formatCurrency(customer.lifetime_spend)}
            </dd>
            <dt className="text-ink-muted">Loyalty tier</dt>
            <dd className="text-right">
              {customer.loyalty_tier ? (
                <StatusBadge
                  label={
                    TIER_LABEL[customer.loyalty_tier] ?? customer.loyalty_tier
                  }
                  tone="ready"
                />
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </dd>
            <dt className="text-ink-muted">Loyalty points</dt>
            <dd className="text-right font-medium tabular-nums text-ink">
              {customer.loyalty.points_balance}
            </dd>
            <dt className="text-ink-muted">Credit owed</dt>
            <dd
              className={`text-right font-medium tabular-nums ${creditOwed ? "text-status-cancelled-text" : "text-ink"}`}
            >
              {formatCurrency(customer.credit_balance)}
            </dd>
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-navy">Customer record</h2>
          <form key={`${customer.id}-${customer.notes}-${customer.tags.join("-")}`} className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault(); const data = new FormData(event.currentTarget);
            updateCustomer.mutate({
              first_name: String(data.get("first_name") ?? ""), last_name: String(data.get("last_name") ?? ""),
              email: String(data.get("email") ?? "") || null, secondary_phone: String(data.get("secondary_phone") ?? ""),
              whatsapp_number: String(data.get("whatsapp_number") ?? ""), source: String(data.get("source")) as typeof customer.source,
              default_pickup_address: String(data.get("default_pickup_address") ?? ""), notes: String(data.get("notes") ?? ""),
              tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
              marketing_opt_in: data.get("marketing_opt_in") === "on",
            });
          }}>
            <Field label="First name" htmlFor="customer-first"><Input id="customer-first" name="first_name" defaultValue={customer.first_name} /></Field>
            <Field label="Last name" htmlFor="customer-last"><Input id="customer-last" name="last_name" defaultValue={customer.last_name} /></Field>
            <Field label="Email" htmlFor="customer-email"><Input id="customer-email" name="email" type="email" defaultValue={customer.email ?? ""} /></Field>
            <Field label="Secondary phone" htmlFor="customer-secondary"><Input id="customer-secondary" name="secondary_phone" defaultValue={customer.secondary_phone} /></Field>
            <Field label="WhatsApp" htmlFor="customer-whatsapp"><Input id="customer-whatsapp" name="whatsapp_number" defaultValue={customer.whatsapp_number} /></Field>
            <Field label="Source" htmlFor="customer-source"><Select id="customer-source" name="source" defaultValue={customer.source}>{["ONLINE", "WALK_IN", "REFERRAL", "OTHER"].map((source) => <option key={source}>{source.replace(/_/g, " ")}</option>)}</Select></Field>
            <Field label="Default pickup address" htmlFor="customer-pickup"><Input id="customer-pickup" name="default_pickup_address" defaultValue={customer.default_pickup_address} /></Field>
            <Field label="Tags" htmlFor="customer-tags" hint="Comma-separated"><Input id="customer-tags" name="tags" defaultValue={customer.tags.join(", ")} /></Field>
            <div className="sm:col-span-2"><Field label="Staff notes" htmlFor="customer-notes"><Textarea id="customer-notes" name="notes" rows={2} defaultValue={customer.notes} /></Field></div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="marketing_opt_in" defaultChecked={customer.marketing_opt_in} /> Marketing opt-in</label>
            <div className="flex justify-end"><Button size="sm" type="submit" disabled={updateCustomer.isPending}><Save className="h-3.5 w-3.5" /> Save customer</Button></div>
          </form>
          {updateCustomer.error ? <p className="mt-2 text-xs text-status-cancelled-text">{getApiErrorMessage(updateCustomer.error)}</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-navy">Account controls</h2>
          <Button size="sm" variant={customer.is_blocked ? "secondary" : "danger"} onClick={() => {
            const reason = customer.is_blocked ? "" : window.prompt("Why is this customer being blocked?")?.trim();
            if (!customer.is_blocked && !reason) return;
            updateCustomer.mutate({ is_blocked: !customer.is_blocked, blocked_reason: reason ?? "" });
          }}>{customer.is_blocked ? "Unblock customer" : "Block customer"}</Button>
          {customer.is_blocked ? <p className="mt-2 text-xs text-status-cancelled-text">{customer.blocked_reason || "No reason recorded."}</p> : null}
          <form className="mt-5 border-t border-crease pt-4" onSubmit={(event) => {
            event.preventDefault(); const data = new FormData(event.currentTarget);
            adjustPoints.mutate({ points: Number(data.get("points")), reason: String(data.get("reason")) });
            event.currentTarget.reset();
          }}>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy"><Coins className="h-4 w-4" /> Adjust loyalty</p>
            <Field label="Points (+ or −)" htmlFor="loyalty-points"><Input id="loyalty-points" name="points" type="number" required /></Field>
            <Field label="Reason" htmlFor="loyalty-reason"><Input id="loyalty-reason" name="reason" required /></Field>
            <Button size="sm" type="submit" disabled={adjustPoints.isPending}>Apply adjustment</Button>
          </form>
          {adjustPoints.error ? <p className="mt-2 text-xs text-status-cancelled-text">{getApiErrorMessage(adjustPoints.error)}</p> : null}
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-sm font-medium text-ink">
          Recent orders
        </h2>
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
            {customer.recent_orders.length === 0 && (
              <TableEmptyRow colSpan={4}>No orders yet.</TableEmptyRow>
            )}
            {customer.recent_orders.map((order) => (
              <Tr key={order.id}>
                <Td className="font-medium">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="hover:underline"
                  >
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
                  <StatusBadge
                    label={order.status}
                    tone={orderStatusTone(order.status)}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-sm font-medium text-ink">
          Credit ledger
        </h2>
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
              <TableEmptyRow colSpan={4}>
                No credit activity — this customer doesn&apos;t have a tab.
              </TableEmptyRow>
            )}
            {customer.recent_credit_transactions.map((tx) => (
              <Tr key={tx.id}>
                <Td>
                  {CREDIT_TX_LABEL[tx.transaction_type] ?? tx.transaction_type}
                </Td>
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
            <Link
              href="/admin/finance/credit"
              className="font-medium text-navy hover:underline"
            >
              Clients à crédit
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
