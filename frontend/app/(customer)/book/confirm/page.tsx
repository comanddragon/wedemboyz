"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleOff, CreditCard, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card } from "@/components/ui";
import { useBooking } from "@/hooks/useBooking";
import { ordersApi, paymentsApi, scheduleApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { PaymentGateway } from "@/types";

const GATEWAYS: { value: PaymentGateway; label: string; ready: boolean }[] = [
  { value: "CASH", label: "Cash on delivery/pickup", ready: true },
  { value: "MTN_MOMO", label: "MTN Mobile Money", ready: true },
  { value: "ORANGE_MONEY", label: "Orange Money", ready: true },
  { value: "STRIPE", label: "Card (Stripe) — not wired up yet", ready: false },
];

function gatewayLabel(gateway: PaymentGateway): string {
  return GATEWAYS.find((g) => g.value === gateway)?.label ?? gateway;
}

function SavedMethodsSkeleton() {
  return (
    <div className="mb-4 space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-crease px-3 py-2">
          <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-steam" />
          <span className="block h-3 w-1/3 animate-pulse rounded bg-steam" />
        </div>
      ))}
    </div>
  );
}

export default function BookConfirmPage() {
  const router = useRouter();
  const booking = useBooking();
  const [gateway, setGateway] = useState<PaymentGateway>("CASH");
  // undefined = no explicit choice made yet (fall back to the default saved
  // method, if any); null = customer explicitly chose a plain gateway below.
  const [selectedMethodId, setSelectedMethodId] = useState<number | null | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: savedMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: queryKeys.payments.methods,
    queryFn: () => paymentsApi.listPaymentMethods(),
  });

  // Pre-select the customer's default saved method, if any, so returning
  // customers don't have to re-pick a gateway every time they check out.
  const defaultMethod = savedMethods?.find((m) => m.is_default);
  const effectiveMethodId = selectedMethodId === undefined ? (defaultMethod?.id ?? null) : selectedMethodId;
  const effectiveMethod = savedMethods?.find((m) => m.id === effectiveMethodId);
  const effectiveGateway = effectiveMethod ? effectiveMethod.gateway : gateway;

  function selectSavedMethod(methodId: number) {
    setSelectedMethodId(methodId);
  }

  function selectGateway(value: PaymentGateway) {
    setSelectedMethodId(null);
    setGateway(value);
  }

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

      await paymentsApi.initiatePayment({
        order: order.id,
        gateway: effectiveGateway,
        method: effectiveMethodId ?? undefined,
      });

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

        {isLoadingMethods && <SavedMethodsSkeleton />}

        {!isLoadingMethods && savedMethods && savedMethods.length > 0 && (
          <fieldset className="mb-4 space-y-2">
            <legend className="mb-2 text-sm font-medium text-ink">Your saved payment methods</legend>
            {savedMethods.map((method) => (
              <label
                key={method.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border border-crease px-3 py-2 text-sm ${
                  effectiveMethodId === method.id ? "border-navy bg-steam" : ""
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={method.id}
                  checked={effectiveMethodId === method.id}
                  onChange={() => selectSavedMethod(method.id)}
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{method.display_label}</span>
                  <span className="block text-xs text-ink-muted">{gatewayLabel(method.gateway)}</span>
                </span>
                {method.is_default && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    Default
                  </span>
                )}
              </label>
            ))}
            <Link href="/settings/payments" className="inline-block text-xs font-medium text-navy hover:underline">
              Manage payment methods
            </Link>
          </fieldset>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-ink">
            {savedMethods && savedMethods.length > 0 ? "Or pay another way" : "Payment method"}
          </legend>
          {GATEWAYS.map((g) => (
            <label
              key={g.value}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                g.ready ? "cursor-pointer border-crease" : "cursor-not-allowed border-crease text-ink-muted"
              } ${effectiveMethodId == null && gateway === g.value ? "border-navy bg-steam" : ""}`}
            >
              <input
                type="radio"
                name="gateway"
                value={g.value}
                checked={effectiveMethodId == null && gateway === g.value}
                disabled={!g.ready}
                onChange={() => selectGateway(g.value)}
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
