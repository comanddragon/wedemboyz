"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CircleCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BookingShell } from "@/src/components/booking/BookingShell";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { Button, Card, Field, Input, Select } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { ensureSession } from "@/src/lib/guest-session";
import { useBooking } from "@/src/hooks/useBooking";
import { ordersApi, paymentsApi, profileApi, scheduleApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { formatCurrency } from "@/src/lib/constants";
import type { PaymentGateway, PaymentMethod } from "@/src/types";

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
  operator: MobileMoneyOperator,
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
  accountPhoneNumber: string | undefined,
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
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-crease px-3 py-2"
        >
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
  const { user, isAuthenticated, isGuest } = useAuth();
  // A visitor who hasn't signed in has no session yet (it is created on
  // submit), so they're treated as a guest here too.
  const needsContact = !isAuthenticated || isGuest;
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selection, setSelection] = useState<PaymentSelection | null>(null);
  const [operator, setOperator] = useState<MobileMoneyOperator>("MTN_MOMO");
  const [customNumber, setCustomNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: savedMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: queryKeys.payments.methods,
    queryFn: () => paymentsApi.listPaymentMethods(),
    enabled: isAuthenticated,
  });

  // Default to the customer's default saved method, if any, otherwise
  // Cash — computed lazily (not via an effect) so it doesn't fight the
  // customer's own choice once they've made one.
  const defaultMethod = savedMethods?.find((m) => m.is_default);
  const effectiveSelection: PaymentSelection =
    selection ??
    (defaultMethod
      ? { type: "method", methodId: defaultMethod.id }
      : { type: "CASH" });

  const selectedMethod =
    effectiveSelection.type === "method"
      ? savedMethods?.find((m) => m.id === effectiveSelection.methodId)
      : undefined;

  const effectiveGateway = resolveGateway(
    effectiveSelection,
    selectedMethod,
    operator,
  );
  const effectivePhoneNumber = resolvePhoneNumber(
    effectiveSelection,
    customNumber,
    // Guests have a placeholder account number; their contact number is the real one.
    needsContact ? contactPhone.trim() || undefined : user?.phone_number,
  );
  const needsCustomNumber =
    effectiveSelection.type === "custom" && customNumber.trim().length === 0;
  const contactPhoneValid = /^\+?[\d ]{9,18}$/.test(contactPhone.trim());
  const missingContact =
    needsContact && (contactName.trim().length === 0 || !contactPhoneValid);
  const accountNumberLabel = needsContact ? contactPhone.trim() : user?.phone_number;

  function isSelected(candidate: PaymentSelection): boolean {
    if (candidate.type !== effectiveSelection.type) return false;
    if (candidate.type === "method" && effectiveSelection.type === "method") {
      return candidate.methodId === effectiveSelection.methodId;
    }
    return true;
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Guests are signed in automatically; their name + contact number are
      // saved on the account so the shop can reach them about the order.
      await ensureSession();
      if (needsContact) {
        await profileApi.updateProfile({
          first_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
        });
      }

      const order = await ordersApi.createOrder({
        pickup_address: booking.pickupAddress,
        delivery_address: booking.deliveryAddress,
        notes: booking.notes,
        items: booking.items.map(
          ({ service_type, label, description, weight_kg, quantity, photo, photoPreviewUrl }) => ({
            service_type,
            label,
            description,
            weight_kg,
            quantity,
            photo,
            photoPreviewUrl,
          }),
        ),
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
        method:
          effectiveSelection.type === "method"
            ? effectiveSelection.methodId
            : undefined,
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
    <BookingShell
      step={4}
      subtitle="Step 4 — payment"
      actions={
        <div className="flex items-center justify-between">
        <Link href="/book/review">
          <Button variant="ghost">Back</Button>
        </Link>
        <Link
          href="/settings/payments"
          className="text-xs font-medium text-navy hover:underline"
        >
          Manage payment methods
        </Link>
        </div>
      }
    >
      <Card className="grid items-start gap-x-12 gap-y-6 lg:grid-cols-[1.2fr_1fr] lg:p-7">
        <div>
          <p className="mb-4 text-sm text-ink-muted">
            Total due:{" "}
            <span className="text-base font-semibold text-navy">
              {formatCurrency(booking.total)}
            </span>
          </p>

          {needsContact && (
            <div className="mb-6 space-y-1">
              <p className="text-sm font-medium text-ink">Your contact details</p>
              <p className="mb-2 text-xs text-ink-muted">
                No account needed — we&apos;ll keep this booking on this device
                and text you updates. You can create an account any time to
                keep it on every device.
              </p>
              <Field label="Your name">
                <Input
                  type="text"
                  autoComplete="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Ada Ngo"
                />
              </Field>
              <Field label="Phone number">
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 677300001"
                />
              </Field>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-ink">
              Payment method
            </legend>

            <label
              className={`flex cursor-pointer items-center gap-2 rounded-xl border border-crease px-3.5 py-2.5 text-sm transition-all duration-200 hover:border-navy/40 hover:bg-steam/60 ${
                isSelected({ type: "CASH" })
                  ? "border-navy bg-gold-50/70 ring-[3px] ring-gold/15"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="payment-selection"
                checked={isSelected({ type: "CASH" })}
                onChange={() => setSelection({ type: "CASH" })}
              />
              <PaymentMethodIcon method="CASH" />
              <span className="flex-1">{GATEWAY_LABELS.CASH}</span>
              {isSelected({ type: "CASH" }) ? <CircleCheck className="h-4 w-4 text-status-ready-text" aria-hidden="true" /> : null}
            </label>

            {isLoadingMethods && <SavedMethodsSkeleton />}

            {savedMethods?.map((method) => (
              <label
                key={method.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border border-crease px-3.5 py-2.5 text-sm transition-all duration-200 hover:border-navy/40 hover:bg-steam/60 ${
                  isSelected({ type: "method", methodId: method.id })
                    ? "border-navy bg-gold-50/70 ring-[3px] ring-gold/15"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="payment-selection"
                  checked={isSelected({ type: "method", methodId: method.id })}
                  onChange={() =>
                    setSelection({ type: "method", methodId: method.id })
                  }
                />
                <PaymentMethodIcon method={method.gateway} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {method.display_label}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {GATEWAY_LABELS[method.gateway]}
                  </span>
                </span>
                {method.is_default && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    Default
                  </span>
                )}
              </label>
            ))}

            {accountNumberLabel && (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border border-crease px-3.5 py-2.5 text-sm transition-all duration-200 hover:border-navy/40 hover:bg-steam/60 ${
                  isSelected({ type: "account" })
                    ? "border-navy bg-gold-50/70 ring-[3px] ring-gold/15"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="payment-selection"
                  checked={isSelected({ type: "account" })}
                  onChange={() => setSelection({ type: "account" })}
                />
                <PaymentMethodIcon method={operator} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {needsContact ? "My contact number" : "My account number"} (
                    {maskPhoneNumber(accountNumberLabel)})
                  </span>
                  <span className="block text-xs text-ink-muted">
                    Mobile Money
                  </span>
                </span>
              </label>
            )}

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border border-crease px-3.5 py-2.5 text-sm transition-all duration-200 hover:border-navy/40 hover:bg-steam/60 ${
                isSelected({ type: "custom" })
                  ? "border-navy bg-gold-50/70 ring-[3px] ring-gold/15"
                  : ""
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
                <span className="block font-medium text-ink">
                  Use a different number
                </span>
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

          </fieldset>
        </div>

        <div className="lg:border-l lg:border-crease lg:pl-12">
          {(effectiveSelection.type === "account" ||
            effectiveSelection.type === "custom") && (
            <div className="mt-3 max-w-xs">
              <PaymentMethodIcon method={operator} className="mb-2" />
              <Field
                label="Network"
                hint="CamPay auto-detects your operator — pick the closest match."
              >
                <Select
                  value={operator}
                  onChange={(e) =>
                    setOperator(e.target.value as MobileMoneyOperator)
                  }
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {errorMessage && (
            <p className="mt-4 text-sm text-status-cancelled-text">
              {errorMessage}
            </p>
          )}

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={
              submitMutation.isPending ||
              booking.items.length === 0 ||
              needsCustomNumber ||
              missingContact
            }
            className="mt-6 w-full"
          >
            {submitMutation.isPending ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </Card>

    </BookingShell>
  );
}
