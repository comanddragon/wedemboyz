"use client";

import Link from "next/link";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card, CreaseDivider, Field, Input, ServiceIcon, serviceLabel } from "@/components/ui";
import { useBooking } from "@/hooks/useBooking";

export default function BookReviewPage() {
  const {
    items,
    pickupAddress,
    deliveryAddress,
    scheduledPickupDate,
    scheduledPickupSlot,
    promoCode,
    setPromoCode,
    subtotal,
    deliveryFee,
    discount,
    total,
    isPromoValid,
    promoError,
    isValidatingPromo,
  } = useBooking();

  const [promoInput, setPromoInput] = useState(promoCode ?? "");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display mb-1 text-xl font-semibold text-navy">Book a pickup</h1>
      <p className="mb-6 text-sm text-ink-muted">Step 3 — review your order</p>
      <WizardSteps current={3} />

      <Card>
        <h2 className="font-display mb-3 text-sm font-medium text-ink">Items</h2>
        <ul className="mb-4 space-y-2">
          {items.map((item) => (
            <li key={item.clientId} className="flex items-center gap-2 text-sm">
              <span className="text-navy">
                <ServiceIcon type={item.service_type} />
              </span>
              <span>
                {item.label || serviceLabel(item.service_type)} — {item.weight_kg}kg x{item.quantity ?? 1}
              </span>
            </li>
          ))}
        </ul>

        <CreaseDivider className="my-4" />

        <p className="text-sm text-ink-muted">Pickup: {pickupAddress || "(not set)"}</p>
        <p className="text-sm text-ink-muted">Delivery: {deliveryAddress || "(not set)"}</p>
        <p className="mb-4 text-sm text-ink-muted">
          Scheduled: {scheduledPickupDate || "(not set)"} — {scheduledPickupSlot || "(not set)"}
        </p>

        <Field label="Promo code">
          <Input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            onBlur={() => setPromoCode(promoInput || null)}
            placeholder="e.g. WELCOME10"
          />
        </Field>
        {isValidatingPromo && <p className="text-xs text-ink-muted">Checking promo code...</p>}
        {promoCode && isPromoValid && <p className="text-xs text-status-ready-text">Promo applied.</p>}
        {promoCode && promoError && <p className="text-xs text-status-cancelled-text">{promoError}</p>}

        <CreaseDivider className="my-4" />

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal (estimate)</span>
            <span>{subtotal} XAF</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Delivery fee (estimate)</span>
            <span>{deliveryFee} XAF</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Discount</span>
            <span>-{discount} XAF</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold text-navy">
            <span>Total (estimate)</span>
            <span>{total} XAF</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Final pricing is always computed server-side when the order is created.
        </p>
      </Card>

      <div className="mt-8 flex justify-between">
        <Link href="/book/schedule">
          <Button variant="ghost">Back</Button>
        </Link>
        <Link href="/book/confirm">
          <Button>Next: Payment</Button>
        </Link>
      </div>
    </main>
  );
}
