"use client";

import { ensureSession } from "@/src/lib/guest-session";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import { BookingShell } from "@/src/components/booking/BookingShell";
import {
  Button,
  Card,
  CreaseDivider,
  Field,
  Input,
  ServiceIcon,
  serviceLabel,
} from "@/src/components/ui";
import { useBooking } from "@/src/hooks/useBooking";
import { formatCurrency } from "@/src/lib/constants";

export default function BookReviewPage() {
  const {
    items,
    orderType,
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
    <BookingShell
      step={3}
      subtitle="Step 3 — review your order"
      actions={
        <div className="flex items-center justify-between">
          <Link href="/book/schedule">
            <Button variant="ghost">Back</Button>
          </Link>
          <Link href="/book/confirm">
            <Button>Next: Payment</Button>
          </Link>
        </div>
      }
    >
      <Card className="grid gap-x-12 gap-y-6 lg:grid-cols-[1.3fr_1fr] lg:p-7">
        <div>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Items
          </h2>
          <ul className="mb-4 space-y-2">
            {items.map((item) => (
              <li
                key={item.clientId}
                className="flex items-center gap-2 text-sm"
              >
                {item.photoPreviewUrls?.[0] ? (
                  <Image
                    src={item.photoPreviewUrls[0]}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-navy">
                    <ServiceIcon type={item.service_type} />
                  </span>
                )}
                <span>
                  {item.label || serviceLabel(item.service_type)} —{" "}
                  {item.weight_kg}kg x{item.quantity ?? 1}
                </span>
              </li>
            ))}
          </ul>

          <CreaseDivider className="my-4" />

          <p className="text-sm text-ink-muted">
            Order type: {orderType === "pickup" ? "Pick up" : "Drop off"}
          </p>
          {orderType === "pickup" ? (
            <p className="text-sm text-ink-muted">
              Pick-up address: {pickupAddress || "(not set)"}
            </p>
          ) : null}
          <p className="text-sm text-ink-muted">
            Delivery: {deliveryAddress || "(not set)"}
          </p>
          <p className="mb-4 text-sm text-ink-muted">
            Scheduled: {scheduledPickupDate || "(not set)"} —{" "}
            {scheduledPickupSlot || "(not set)"}
          </p>

          <Field label="Promo code">
            <Input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onBlur={() => {
                if (!promoInput) return setPromoCode(null);
                // Promo checks are per-customer, so visitors need a session first.
                void ensureSession().then(() => setPromoCode(promoInput));
              }}
              placeholder="e.g. WELCOME10"
            />
          </Field>
          {isValidatingPromo && (
            <p className="text-xs text-ink-muted">Checking promo code...</p>
          )}
          {promoCode && isPromoValid && (
            <p className="text-xs text-status-ready-text">Promo applied.</p>
          )}
          {promoCode && promoError && (
            <p className="text-xs text-status-cancelled-text">{promoError}</p>
          )}
        </div>

        <div className="lg:border-l lg:border-crease lg:pl-12">
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Summary
          </h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal (estimate)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Delivery fee (estimate)</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>Total (estimate)</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Final pricing is always computed server-side when the order is
            created.
          </p>
        </div>
      </Card>
    </BookingShell>
  );
}
