"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";

import {
  Button,
  Card,
  EyebrowLabel,
  Field,
  Input,
  Select,
} from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { PaymentGateway } from "@/src/types";

const GATEWAYS: { value: PaymentGateway; label: string }[] = [
  { value: "MTN_MOMO", label: "MTN Mobile Money" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
];

function gatewayLabel(gateway: PaymentGateway): string {
  return GATEWAYS.find((g) => g.value === gateway)?.label ?? gateway;
}

function MethodsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1].map((i) => (
        <Card key={i} className="flex items-center gap-3">
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-steam" />
          <span className="block h-3 w-1/3 animate-pulse rounded bg-steam" />
        </Card>
      ))}
    </div>
  );
}

export default function SettingsPaymentsPage() {
  const queryClient = useQueryClient();
  const [gateway, setGateway] = useState<PaymentGateway>("MTN_MOMO");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiresPhoneNumber =
    gateway === "MTN_MOMO" || gateway === "ORANGE_MONEY";

  const {
    data: methods,
    isLoading,
    isError,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.payments.methods,
    queryFn: () => paymentsApi.listPaymentMethods(),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      paymentsApi.addPaymentMethod({
        gateway,
        phone_number: requiresPhoneNumber ? phoneNumber : undefined,
      }),
    onSuccess: () => {
      setPhoneNumber("");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.methods });
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.removePaymentMethod(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.methods }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => paymentsApi.setDefaultPaymentMethod(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.methods }),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to settings
      </Link>

      <EyebrowLabel words={["Your account"]} />
      <h1 className="font-display mb-6 mt-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        Payment methods
      </h1>

      <Card className="mb-6">
        <h2 className="font-display mb-1 text-sm font-semibold text-navy">
          Add a payment method
        </h2>
        <p className="mb-4 text-xs text-ink-muted">
          Add a mobile money account or card to use when paying for orders.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div className="flex items-end gap-2">
              <PaymentMethodIcon method={gateway} className="mb-4" />
            <Field label="Gateway">
              <Select
                value={gateway}
                onChange={(e) => {
                  const value = e.target.value as PaymentGateway;
                  setGateway(value);
                  if (value !== "MTN_MOMO" && value !== "ORANGE_MONEY")
                    setPhoneNumber("");
                }}
              >
                {GATEWAYS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
            </div>
            {requiresPhoneNumber && (
              <Field label="Phone number">
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 677300001"
                  required
                />
              </Field>
            )}
          </div>
          <Button
            type="submit"
            disabled={
              addMutation.isPending ||
              (requiresPhoneNumber && !phoneNumber.trim())
            }
          >
            {addMutation.isPending ? "Adding..." : "Add payment method"}
          </Button>
          {errorMessage && (
            <p className="mt-3 text-xs text-status-cancelled-text">
              {errorMessage}
            </p>
          )}
        </form>
      </Card>

      {isLoading && <MethodsSkeleton />}

      {isError && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <CreditCard
            className="h-6 w-6 text-status-cancelled-text"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-ink">
            Couldn't load your payment methods
          </p>
          <p className="max-w-xs text-xs text-ink-muted">
            {getApiErrorMessage(listError)}
          </p>
          <Button
            variant="secondary"
            className="mt-2"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </Card>
      )}

      {!isLoading && !isError && methods && methods.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <CreditCard className="h-6 w-6 text-ink-muted" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">No payment methods yet</p>
          <p className="max-w-xs text-xs text-ink-muted">
            Add MTN Mobile Money, Orange Money, or a card above to pay for
            orders faster.
          </p>
        </Card>
      )}

      {!isLoading && !isError && methods && methods.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {methods.map((method) => (
            <li key={method.id}>
              <Card className="flex items-center gap-3">
                <PaymentMethodIcon method={method.gateway} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {method.display_label}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {gatewayLabel(method.gateway)}
                  </p>
                </div>
                {method.is_default ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => setDefaultMutation.mutate(method.id)}
                    disabled={setDefaultMutation.isPending}
                    className="shrink-0 text-xs font-medium text-navy hover:underline disabled:opacity-50"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => removeMutation.mutate(method.id)}
                  disabled={removeMutation.isPending}
                  aria-label={`Remove ${method.display_label}`}
                  className="shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-status-cancelled-bg hover:text-status-cancelled-text disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
