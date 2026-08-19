"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card } from "@/components/ui";
import { useBooking } from "@/hooks/useBooking";
import { ordersApi, paymentsApi, scheduleApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { PaymentGateway } from "@/types";

const GATEWAYS: { value: PaymentGateway; label: string; ready: boolean }[] = [
  { value: "CASH", label: "Cash on delivery/pickup", ready: true },
  { value: "MTN_MOMO", label: "MTN Mobile Money", ready: true },
  { value: "ORANGE_MONEY", label: "Orange Money", ready: true },
  { value: "STRIPE", label: "Card (Stripe) — not wired up yet", ready: false },
];

export default function BookConfirmPage() {
  const router = useRouter();
  const booking = useBooking();
  const [gateway, setGateway] = useState<PaymentGateway>("CASH");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const order = await ordersApi.createOrder({
        pickup_address: booking.pickupAddress,
        delivery_address: booking.deliveryAddress,
        notes: booking.notes,
        items: booking.items.map(({ service_type, label, description, weight_kg, quantity }) => ({
          service_type,
          label,
          description,
          weight_kg,
          quantity,
        })),
        promo_code: booking.promoCode ?? undefined,
      });

      if (booking.scheduledPickupDate && booking.scheduledPickupSlot) {
        await scheduleApi.createSchedule({
          order: order.id,
          pickup_date: booking.scheduledPickupDate,
          pickup_time_slot: booking.scheduledPickupSlot as never,
          delivery_date: booking.scheduledPickupDate,
          delivery_time_slot: booking.scheduledPickupSlot as never,
        });
      }

      await paymentsApi.initiatePayment({ order: order.id, gateway });

      return order;
    },
    onSuccess: (order) => {
      booking.reset();
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display mb-1 text-xl font-semibold text-navy">Book a pickup</h1>
      <p className="mb-6 text-sm text-ink-muted">Step 4 — payment</p>
      <WizardSteps current={4} />

      <Card>
        <p className="mb-4 text-sm text-ink-muted">
          Total due: <span className="text-base font-semibold text-navy">{booking.total} XAF</span>
        </p>

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
                name="gateway"
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

        {errorMessage && <p className="mt-4 text-sm text-status-cancelled-text">{errorMessage}</p>}

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || booking.items.length === 0}
          className="mt-6 w-full"
        >
          {submitMutation.isPending ? "Placing order..." : "Place order"}
        </Button>
      </Card>

      <div className="mt-8">
        <Link href="/book/review">
          <Button variant="ghost">Back</Button>
        </Link>
      </div>
    </main>
  );
}
