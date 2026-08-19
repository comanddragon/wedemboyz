"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleOff, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuickSaleItems, type QuickSaleLineItem } from "@/components/quick-sale/QuickSaleItems";
import { Button, Card, CreaseDivider, Field, Input, Textarea } from "@/components/ui";
import { ordersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import type { PaymentGateway, QuickSaleResult } from "@/types";

const GATEWAYS: { value: PaymentGateway; label: string; ready: boolean }[] = [
  { value: "CASH", label: "Cash", ready: true },
  { value: "MTN_MOMO", label: "MTN Mobile Money", ready: true },
  { value: "ORANGE_MONEY", label: "Orange Money", ready: true },
  { value: "STRIPE", label: "Card (Stripe) — not wired up yet", ready: false },
  { value: "CREDIT", label: "Pay later (add to customer's credit tab)", ready: true },
];

function emptyLineItemsTotal(items: QuickSaleLineItem[]): number | null {
  // Only meaningful as an estimate when every item has a manual price — real
  // pricing (including auto-priced items) is always computed server-side.
  if (items.length === 0) return null;
  if (items.some((i) => i.unit_price == null)) return null;
  return items.reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);
}

export default function AdminQuickSalePage() {
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<QuickSaleLineItem[]>([]);
  const [gateway, setGateway] = useState<PaymentGateway>("CASH");
  const [paidNow, setPaidNow] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<QuickSaleResult | null>(null);

  const effectivePaidNow = gateway === "CREDIT" ? false : paidNow;
  const estimatedTotal = useMemo(() => emptyLineItemsTotal(items), [items]);

  const submitMutation = useMutation({
    mutationFn: () =>
      ordersApi.createQuickSale({
        customer_phone: customerPhone.trim(),
        customer_name: customerName.trim() || undefined,
        items: items.map(({ clientId: _clientId, ...item }) => item),
        payment_method: gateway,
        paid_now: effectivePaidNow,
        delivery_fee: deliveryFee.trim() === "" ? undefined : Number(deliveryFee),
        notes: notes.trim() || undefined,
      }),
    onSuccess: (res) => setResult(res),
  });

  function resetForm() {
    setCustomerPhone("");
    setCustomerName("");
    setItems([]);
    setGateway("CASH");
    setPaidNow(true);
    setDeliveryFee("");
    setNotes("");
    setResult(null);
    submitMutation.reset();
  }

  const isValid = customerPhone.trim() !== "" && items.length > 0;

  if (result) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-ready-bg text-status-ready-text">
            <CircleCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold text-navy">Sale recorded</p>
            <p className="mt-1 text-sm text-ink-muted">
              Order <span className="font-medium text-ink">#{result.order.id}</span> —{" "}
              {formatCurrency(result.order.total_amount)}
              {result.on_credit && " (on the customer's credit tab)"}
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href={`/admin/orders/${result.order.id}`}>
              <Button variant="secondary">View order</Button>
            </Link>
            <Button variant="gold" onClick={resetForm}>
              Start another sale
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Quick sale"
        description="Record a walk-in sale without the online booking flow. The customer is found or created by phone number."
      />

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-steam text-navy">
            <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <h2 className="font-display text-sm font-medium text-ink">Customer</h2>
        </div>

        <Field label="Phone number" htmlFor="qs-phone" hint="Existing customers are matched by this number.">
          <Input
            id="qs-phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </Field>
        <Field label="Name (only used if this is a new customer)" htmlFor="qs-name">
          <Input
            id="qs-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Aïcha Ngo"
          />
        </Field>
      </Card>

      <CreaseDivider />

      <h2 className="font-display mb-3 text-sm font-medium text-ink">Items</h2>
      <QuickSaleItems
        items={items}
        onAdd={(item) => setItems((prev) => [...prev, item])}
        onRemove={(clientId) => setItems((prev) => prev.filter((i) => i.clientId !== clientId))}
      />

      <CreaseDivider />

      <Card>
        <h2 className="font-display mb-3 text-sm font-medium text-ink">Payment</h2>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-ink">Payment method</legend>
          {GATEWAYS.map((g) => (
            <label
              key={g.value}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                g.ready ? "cursor-pointer border-crease" : "cursor-not-allowed border-crease text-ink-muted"
              } ${gateway === g.value ? "border-navy bg-steam" : ""}`}
            >
              <input
                type="radio"
                name="qs-gateway"
                value={g.value}
                checked={gateway === g.value}
                disabled={!g.ready}
                onChange={() => setGateway(g.value)}
              />
              {g.ready ? (
                <CircleCheck className="h-4 w-4 text-status-ready-text" aria-hidden="true" />
              ) : (
                <CircleOff className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              )}
              {g.label}
            </label>
          ))}
        </fieldset>

        {gateway !== "CREDIT" && (
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
            Customer has paid now
          </label>
        )}
        {gateway === "CREDIT" && (
          <p className="mt-4 text-xs text-ink-muted">
            This sale will be added to the customer&apos;s credit balance instead of recording an immediate payment.
          </p>
        )}

        <div className="mt-4">
          <Field label="Delivery fee (optional, XAF)" htmlFor="qs-delivery">
            <Input
              id="qs-delivery"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes (optional)" htmlFor="qs-notes">
          <Textarea id="qs-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {estimatedTotal != null && (
          <p className="mb-2 text-sm text-ink-muted">
            Estimated total (manual prices only):{" "}
            <span className="font-medium text-ink">{formatCurrency(estimatedTotal)}</span>
          </p>
        )}
        {items.some((i) => i.unit_price == null) && (
          <p className="mb-2 text-xs text-ink-muted">
            Some items will be auto-priced — the exact total is confirmed after submitting.
          </p>
        )}

        {submitMutation.isError && (
          <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(submitMutation.error)}</p>
        )}

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!isValid || submitMutation.isPending}
          className="w-full"
        >
          {submitMutation.isPending ? "Recording sale..." : "Record sale"}
        </Button>
      </Card>
    </main>
  );
}
