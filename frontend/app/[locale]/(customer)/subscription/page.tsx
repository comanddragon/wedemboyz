"use client";
import { collectionMethods } from "@/src/lib/payment-options";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Crown, Droplets, Sparkles } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useState } from "react";

import { Button, Card, EyebrowLabel, StatusBadge } from "@/src/components/ui";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { subscriptionStatusTone } from "@/src/components/ui/StatusBadge";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { currentSubscription } from "@/src/lib/subscriptions";
import { cn } from "@/src/lib/utils";
import { useI18n } from "@/src/i18n/I18nProvider";
import { RECURRING_CAPABLE_GATEWAYS } from "@/src/types";
import type {
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionPlan,
} from "@/src/types";

/** Mirrors services.pricing.PLAN_PRICE / PLAN_KG_ALLOWANCE on the backend
 * — keep in sync if those change. */
const PLANS: {
  id: SubscriptionPlan;
  name: string;
  price: number;
  kgPerMonth: string;
  icon: typeof Droplets;
  features: string[];
}[] = [
  {
    id: "ESSENTIEL",
    name: "Essentiel",
    price: 17500,
    kgPerMonth: "10kg / month",
    icon: Droplets,
    features: [
      "10kg covered every month",
      "Any per-kilo service, drawn from your allowance",
    ],
  },
  {
    id: "CONFORT",
    name: "Confort",
    price: 34000,
    kgPerMonth: "20kg / month",
    icon: Sparkles,
    features: [
      "20kg covered every month",
      "Best for a full household's rotation",
    ],
  },
  {
    id: "FAMILLE",
    name: "Famille",
    price: 49000,
    kgPerMonth: "30kg / month",
    icon: Crown,
    features: [
      "30kg covered every month",
      "For big households and heavier loads",
    ],
  },
];

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  ESSENTIEL: "Essentiel",
  CONFORT: "Confort",
  FAMILLE: "Famille",
};

function PlanPicker({
  onSubscribe,
  isPending,
  errorMessage,
}: {
  onSubscribe: (
    plan: SubscriptionPlan,
    billingCycle: SubscriptionBillingCycle,
  ) => void;
  isPending: boolean;
  errorMessage: string | null;
}) {
  const { locale, t } = useI18n();
  const [plan, setPlan] = useState<SubscriptionPlan>("ESSENTIEL");
  const [billingCycle, setBillingCycle] =
    useState<SubscriptionBillingCycle>("ONE_TIME");

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const selected = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={cn(
                "flex flex-col rounded-card border p-4 text-left transition-colors",
                selected
                  ? "border-navy bg-navy-50"
                  : "border-crease bg-white hover:border-navy/30",
              )}
            >
              <span
                className={cn(
                  "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                  selected ? "bg-navy text-white" : "bg-steam text-navy",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-navy">{p.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{p.kgPerMonth.replace("month", t("subscription.month"))}</p>
              <p className="mt-3 font-display text-xl font-bold text-navy">
                {p.price.toLocaleString(locale)}
                <span className="ml-1 text-xs font-medium text-ink-muted">
                  XAF
                </span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-1.5 text-xs text-ink-muted"
                  >
                    <Check
                      className="mt-0.5 h-3 w-3 shrink-0 text-turquoise-600"
                      aria-hidden="true"
                    />
                    {feature.includes("covered") ? `${feature.split("kg")[0]}kg ${t("subscription.covered")}` : feature.includes("per-kilo") ? t("subscription.anyService") : feature.includes("household") ? t("subscription.household") : t("subscription.family")}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-ink">{t("subscription.billing")}</p>
        <div className="inline-flex items-center gap-1 rounded-full border border-crease bg-white p-1 text-sm">
          {[
            { value: "ONE_TIME" as const, label: t("subscription.payOnce") },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBillingCycle(opt.value)}
              className={cn(
                "rounded-full px-4 py-2 font-medium transition-colors",
                billingCycle === opt.value
                  ? "bg-navy text-white"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {billingCycle === "MONTHLY" && (
          <p className="mt-2 text-xs text-ink-muted">
            {t("subscription.paypalOnly")}
          </p>
        )}
      </div>

      <Button
        onClick={() => onSubscribe(plan, billingCycle)}
        disabled={isPending}
      >
        {isPending ? t("subscription.settingUp") : `${t("subscription.continueWith")} ${PLAN_LABELS[plan]}`}
      </Button>
      {errorMessage && (
        <p className="mt-3 text-xs text-status-cancelled-text">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function CheckoutGatewayPicker({ subscription, onCheckout, isPending, errorMessage }: {
  subscription: Subscription;
  onCheckout: (option: "PAY_AT_PICKUP" | "PAY_AFTER_DELIVERY") => void;
  isPending: boolean;
  errorMessage: string | null;
}) {
  const { locale, t } = useI18n();
  return <Card>
    <h2 className="mb-2 font-display text-lg font-semibold text-navy">{PLAN_LABELS[subscription.plan]} — {t("paymentOptions.title")}</h2>
    <p className="mb-5 text-sm text-ink-muted">{locale === "fr" ? "Votre forfait sera activé par l’équipe après réception du paiement." : "The team will activate your plan after receiving payment."}</p>
    <div className="grid gap-3 sm:grid-cols-2">{collectionMethods(locale).map((method) => <Button key={method.value} variant={subscription.payment_option === method.value ? "primary" : "secondary"} aria-pressed={subscription.payment_option === method.value} disabled={isPending} onClick={() => onCheckout(method.value as "PAY_AT_PICKUP" | "PAY_AFTER_DELIVERY")}><PaymentMethodIcon method={method.value} />{method.label}</Button>)}</div>
    {errorMessage ? <p role="alert" className="mt-3 text-sm text-status-cancelled-text">{errorMessage}</p> : null}
  </Card>;
}

function ActiveSubscriptionCard({
  subscription,
}: {
  subscription: Subscription;
}) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.payments.subscriptions,
    });

  const pauseMutation = useMutation({
    mutationFn: () => paymentsApi.pauseSubscription(subscription.id),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });
  const resumeMutation = useMutation({
    mutationFn: () => paymentsApi.resumeSubscription(subscription.id),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });
  const cancelMutation = useMutation({
    mutationFn: () => paymentsApi.cancelSubscription(subscription.id),
    onSuccess: invalidate,
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const isRecurring = subscription.billing_cycle === "MONTHLY";
  const busy =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy">
            {PLAN_LABELS[subscription.plan]}
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {isRecurring ? t("subscription.autoRenew") : t("subscription.payOnce")}
            {` · ${collectionMethods(locale).find((method) => method.value === subscription.payment_option)?.label ?? ""}`}
          </p>
        </div>
        <StatusBadge
          label={subscription.status}
          tone={subscriptionStatusTone(subscription.status)}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-ink-muted">{t("subscription.kilosRemaining")}</p>
          <p className="font-medium text-ink">{subscription.kg_remaining}kg</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">
            {isRecurring ? t("subscription.renewal") : t("subscription.ends")}
          </p>
          <p className="font-medium text-ink">
            {new Date(subscription.end_date).toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {subscription.cancel_at_period_end && (
        <p className="mb-4 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold-600">
          {t("subscription.noRenewal")}
        </p>
      )}

      {subscription.status === "ACTIVE" && (
        <div className="flex flex-wrap gap-2">
          {!isRecurring && (
            <Button
              variant="secondary"
              onClick={() => pauseMutation.mutate()}
              disabled={busy}
            >
              {pauseMutation.isPending ? t("subscription.pausing") : t("subscription.pause")}
            </Button>
          )}
          {!subscription.cancel_at_period_end && (
            <Button
              variant="danger"
              onClick={() => cancelMutation.mutate()}
              disabled={busy}
            >
              {cancelMutation.isPending ? t("subscription.cancelling") : t("subscription.cancel")}
            </Button>
          )}
        </div>
      )}

      {subscription.status === "PAUSED" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => resumeMutation.mutate()} disabled={busy}>
            {resumeMutation.isPending ? t("subscription.resuming") : t("subscription.resume")}
          </Button>
          <Button
            variant="danger"
            onClick={() => cancelMutation.mutate()}
            disabled={busy}
          >
            {cancelMutation.isPending ? t("subscription.cancelling") : t("subscription.cancel")}
          </Button>
        </div>
      )}

      {errorMessage && (
        <p className="mt-3 text-xs text-status-cancelled-text">
          {errorMessage}
        </p>
      )}
    </Card>
  );
}

export default function SubscriptionPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: queryKeys.payments.subscriptions,
    queryFn: () => paymentsApi.listSubscriptions(),
  });

  const subscription = currentSubscription(subscriptions);

  const createMutation = useMutation({
    mutationFn: (input: {
      plan: SubscriptionPlan;
      billing_cycle: SubscriptionBillingCycle;
    }) => paymentsApi.createSubscription(input),
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.subscriptions,
      });
    },
    onError: (error) => setCreateError(getApiErrorMessage(error)),
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ id, payment_option }: { id: number; payment_option: "PAY_AT_PICKUP" | "PAY_AFTER_DELIVERY" }) => paymentsApi.startSubscriptionCheckout(id, { payment_option }),
    onSuccess: () => {
      setCheckoutError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscriptions });
    },
    onError: (error) => setCheckoutError(getApiErrorMessage(error)),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("settingsDetails.back")}
      </Link>

      <EyebrowLabel words={[t("settings.eyebrow")]} />
      <h1 className="font-display mb-6 mt-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        {t("subscription.title")}
      </h1>

      {isLoading && (
        <Card className="space-y-3">
          <span className="block h-3 w-1/4 animate-pulse rounded bg-steam" />
          <span className="block h-20 animate-pulse rounded bg-steam" />
        </Card>
      )}

      {!isLoading && !subscription && (
        <Card>
          <h2 className="font-display mb-1 text-sm font-semibold text-navy">
            {t("subscription.choose")}
          </h2>
          <p className="mb-5 text-xs text-ink-muted">
            {t("subscription.chooseBody")}
          </p>
          <PlanPicker
            onSubscribe={(plan, billing_cycle) =>
              createMutation.mutate({ plan, billing_cycle })
            }
            isPending={createMutation.isPending}
            errorMessage={createError}
          />
        </Card>
      )}

      {!isLoading &&
        subscription &&
        subscription.status === "PENDING" &&
        (
          <CheckoutGatewayPicker
            subscription={subscription}
            onCheckout={(payment_option) =>
              checkoutMutation.mutate({ id: subscription.id, payment_option })
            }
            isPending={checkoutMutation.isPending}
            errorMessage={checkoutError}
          />
        )}

      {!isLoading && subscription && subscription.status !== "PENDING" && (
        <ActiveSubscriptionCard subscription={subscription} />
      )}
    </main>
  );
}
