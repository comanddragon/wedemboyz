"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleOff, CreditCard, Smartphone, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useBooking } from "@/hooks/useBooking";
import { ordersApi, paymentsApi, scheduleApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { PaymentGateway, PaymentMethod } from "@/types";

type MobileMoneyOperator = Extract<PaymentGateway, "MTN_MOMO" | "ORANGE_MONEY">;

// Who/what to charge. "method"/"account"/"custom" all end up requesting a
// CamPay MTN/Orange collection, just against a different phone number —
// see resolvePhoneNumber below for exactly which number each maps to.
type PaymentSelection =
  | { type: "CASH" }
  | { type: "STRIPE" }
  | { type: "method"; methodId: number }
  | { type: "account" }
  | { type: "custom" };

const OPERATORS: { value: MobileMoneyOperator; label: string }[] = [
  { value: "MTN_MOMO", label: "MTN" },
  { value: "ORANGE_MONEY", label: "Orange" },
];

const GATEWAY_LABELS: Record<PaymentGateway, string> = {
  CASH: "Cash on delivery/pickup",
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  STRIPE: "Card (Stripe)",
  PAYPAL: "PayPal",
  CREDIT: "Store credit",
};

function maskPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length <= 3 ? digits : `••• ${digits.slice(-3)}`;
}

function resolveGateway(
  selection: PaymentSelection,
  selectedMethod: PaymentMethod | undefined,
  operator: MobileMoneyOperator
): PaymentGateway {
  switch (selection.type) {
    case "method":
      // Falls back to CASH only in the unreachable edge case where the
      // selected method disappeared from the list mid-session.
      return selectedMethod?.gateway ?? "CASH";
    case "account":
    case "custom":
      return operator;
    case "CASH":
    case "STRIPE":
      return selection.type;
  }
}

function resolvePhoneNumber(
  selection: PaymentSelection,
  customNumber: string,
  accountPhoneNumber: string | undefined
): string | undefined {
  switch (selection.type) {
    case "custom":
      return customNumber || undefined;
    case "account":
      return accountPhoneNumber;
    default:
      // "method": the backend resolves the number from the saved method
      // itself — no need to send one explicitly.
      return undefined;
  }
}

function SavedMethodsSkeleton() {
  return (
    <div className="space-y-2">
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
  const { user } = useAuth();
  const [selection, setSelection] = useState<PaymentSelection | null>(null);
  const [operator, setOperator] = useState<MobileMoneyOperator>("MTN_MOMO");
  const [customNumber, setCustomNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: savedMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: queryKeys.payments.methods,
    queryFn: () => paymentsApi.listPaymentMethods(),
  });

  // Default to the customer's default saved method, if any, otherwise
  // Cash — computed lazily (not via an effect) so it doesn't fight the
  // customer's own choice once they've made one.
  const defaultMethod = savedMethods?.find((m) => m.is_default);
  const effectiveSelection: PaymentSelection =
    selection ?? (defaultMethod ? { type: "method", methodId: defaultMethod.id } : { type: "CASH" });

  const selectedMethod =
    effectiveSelection.type === "method"
      ? savedMethods?.find((m) => m.id === effectiveSelection.methodId)
      : undefined;

  const effectiveGateway = resolveGateway(effectiveSelection, selectedMethod, operator);
  const effectivePhoneNumber = resolvePhoneNumber(effectiveSelection, customNumber, user?.phone_number);
  const needsCustomNumber = effectiveSelection.type === "custom" && customNumber.trim().length === 0;

  function isSelected(candidate: PaymentSelection): boolean {
    if (candidate.type !== effectiveSelection.type) return false;
    if (candidate.type === "method" && effectiveSelection.type === "method") {
      return candidate.methodId === effectiveSelection.methodId;
    }
    return true;
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
        method: effectiveSelection.type === "method" ? effectiveSelection.methodId : undefined,
        phone_number: effectivePhoneNumber,
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

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-ink">Payment method</legend>

          <label
            className={`flex cursor-pointer items-center gap-2 rounded-md border border-crease px-3 py-2 text-sm ${
              isSelected({ type: "CASH" }) ? "border-navy bg-steam" : ""
            }`}
          >
            <input
              type="radio"
              name="payment-selection"
              checked={isSelected({ type: "CASH" })}
              onChange={() => setSelection({ type: "CASH" })}
            />
            <CircleCheck className="h-4 w-4 text-status-ready-text" aria-hidden="true" />
            {GATEWAY_LABELS.CASH}
          </label>

          {isLoadingMethods && <SavedMethodsSkeleton />}

          {savedMethods?.map((method) => (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border border-crease px-3 py-2 text-sm ${
                isSelected({ type: "method", methodId: method.id }) ? "border-navy bg-steam" : ""
              }`}
            >
              <input
                type="radio"
                name="payment-selection"
                checked={isSelected({ type: "method", methodId: method.id })}
                onChange={() => setSelection({ type: "method", methodId: method.id })}
              />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{method.display_label}</span>
                <span className="block text-xs text-ink-muted">{GATEWAY_LABELS[method.gateway]}</span>
              </span>
              {method.is_default && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  Default
                </span>
              )}
            </label>
          ))}

          {user?.phone_number && (
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-md border border-crease px-3 py-2 text-sm ${
                isSelected({ type: "account" }) ? "border-navy bg-steam" : ""
              }`}
            >
              <input
                type="radio"
                name="payment-selection"
                checked={isSelected({ type: "account" })}
                onChange={() => setSelection({ type: "account" })}
              />
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  My account number ({maskPhoneNumber(user.phone_number)})
                </span>
                <span className="block text-xs text-ink-muted">Mobile Money</span>
              </span>
            </label>
          )}

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border border-crease px-3 py-2 text-sm ${
              isSelected({ type: "custom" }) ? "border-navy bg-steam" : ""
            }`}
          >
            <input
              type="radio"
              name="payment-selection"
              className="mt-2.5"
              checked={isSelected({ type: "custom" })}
              onChange={() => setSelection({ type: "custom" })}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">Use a different number</span>
              {isSelected({ type: "custom" }) && (
                <Input
                  type="tel"
                  autoFocus
                  value={customNumber}
                  onChange={(e) => setCustomNumber(e.target.value)}
                  placeholder="e.g. 677300001"
                  className="mt-2"
                />
              )}
            </span>
          </label>

          <label className="flex cursor-not-allowed items-center gap-2 rounded-md border border-crease px-3 py-2 text-sm text-ink-muted">
            <input type="radio" name="payment-selection" disabled />
            <CircleOff className="h-4 w-4" aria-hidden="true" />
            {GATEWAY_LABELS.STRIPE} — not wired up yet
          </label>
        </fieldset>

        {(effectiveSelection.type === "account" || effectiveSelection.type === "custom") && (
          <div className="mt-3 max-w-[10rem]">
            <Field label="Network" hint="CamPay auto-detects your operator — pick the closest match.">
              <Select value={operator} onChange={(e) => setOperator(e.target.value as MobileMoneyOperator)}>
                {OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {errorMessage && <p className="mt-4 text-sm text-status-cancelled-text">{errorMessage}</p>}

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || booking.items.length === 0 || needsCustomNumber}
          className="mt-6 w-full"
        >
          {submitMutation.isPending ? "Placing order..." : "Place order"}
        </Button>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Link href="/book/review">
          <Button variant="ghost">Back</Button>
        </Link>
        <Link href="/settings/payments" className="text-xs font-medium text-navy hover:underline">
          Manage payment methods
        </Link>
      </div>
    </main>
  );
}
