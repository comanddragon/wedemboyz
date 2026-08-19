"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Crown, Droplets, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, Card, EyebrowLabel, StatusBadge } from "@/components/ui";
import { subscriptionStatusTone } from "@/components/ui/StatusBadge";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { currentSubscription } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";
import { RECURRING_CAPABLE_GATEWAYS } from "@/types";
import type {
    PaymentGateway,
    Subscription,
    SubscriptionBillingCycle,
    SubscriptionGateway,
    SubscriptionPlan,
} from "@/types";

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
        features: ["10kg covered every month", "Any per-kilo service, drawn from your allowance"],
    },
    {
        id: "CONFORT",
        name: "Confort",
        price: 34000,
        kgPerMonth: "20kg / month",
        icon: Sparkles,
        features: ["20kg covered every month", "Best for a full household's rotation"],
    },
    {
        id: "FAMILLE",
        name: "Famille",
        price: 49000,
        kgPerMonth: "30kg / month",
        icon: Crown,
        features: ["30kg covered every month", "For big households and heavier loads"],
    },
];

const GATEWAY_LABELS: Record<SubscriptionGateway, string> = {
    STRIPE: "Card (Stripe)",
    PAYPAL: "PayPal",
    MTN_MOMO: "MTN Mobile Money",
    ORANGE_MONEY: "Orange Money",
};

const ALL_SUBSCRIPTION_GATEWAYS: SubscriptionGateway[] = ["STRIPE", "PAYPAL", "MTN_MOMO", "ORANGE_MONEY"];

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
    ESSENTIEL: "Essentiel",
    CONFORT: "Confort",
    FAMILLE: "Famille",
};

function isRedirectResult(result: unknown): result is { checkout_url: string } | { approval_url: string } {
    return typeof result === "object" && result !== null && ("checkout_url" in result || "approval_url" in result);
}

function redirectUrlFrom(result: { checkout_url: string } | { approval_url: string }): string {
    return "checkout_url" in result ? result.checkout_url : result.approval_url;
}

function PlanPicker({
    onSubscribe,
    isPending,
    errorMessage,
}: {
    onSubscribe: (plan: SubscriptionPlan, billingCycle: SubscriptionBillingCycle) => void;
    isPending: boolean;
    errorMessage: string | null;
}) {
    const [plan, setPlan] = useState<SubscriptionPlan>("ESSENTIEL");
    const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>("ONE_TIME");

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
                                selected ? "border-navy bg-navy-50" : "border-crease bg-white hover:border-navy/30"
                            )}
                        >
                            <span
                                className={cn(
                                    "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                                    selected ? "bg-navy text-white" : "bg-steam text-navy"
                                )}
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <p className="text-sm font-semibold text-navy">{p.name}</p>
                            <p className="mt-0.5 text-xs text-ink-muted">{p.kgPerMonth}</p>
                            <p className="mt-3 font-display text-xl font-bold text-navy">
                                {p.price.toLocaleString()}
                                <span className="ml-1 text-xs font-medium text-ink-muted">XAF</span>
                            </p>
                            <ul className="mt-3 space-y-1.5">
                                {p.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-1.5 text-xs text-ink-muted">
                                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-turquoise-600" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </button>
                    );
                })}
            </div>

            <div className="mb-6">
                <p className="mb-2 text-sm font-medium text-ink">Billing</p>
                <div className="inline-flex items-center gap-1 rounded-full border border-crease bg-white p-1 text-sm">
                    {([
                        { value: "ONE_TIME" as const, label: "Pay once (30 days)" },
                        { value: "MONTHLY" as const, label: "Auto-renew monthly" },
                    ]).map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setBillingCycle(opt.value)}
                            className={cn(
                                "rounded-full px-4 py-2 font-medium transition-colors",
                                billingCycle === opt.value ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {billingCycle === "MONTHLY" && (
                    <p className="mt-2 text-xs text-ink-muted">
                        Auto-renew is only available with a card (Stripe) or PayPal.
                    </p>
                )}
            </div>

            <Button onClick={() => onSubscribe(plan, billingCycle)} disabled={isPending}>
                {isPending ? "Setting up..." : `Continue with ${PLAN_LABELS[plan]}`}
            </Button>
            {errorMessage && <p className="mt-3 text-xs text-status-cancelled-text">{errorMessage}</p>}
        </div>
    );
}

function CheckoutGatewayPicker({
    subscription,
    onCheckout,
    isPending,
    errorMessage,
}: {
    subscription: Subscription;
    onCheckout: (gateway: SubscriptionGateway) => void;
    isPending: boolean;
    errorMessage: string | null;
}) {
    const isRecurring = subscription.billing_cycle === "MONTHLY";
    const available = isRecurring
        ? ALL_SUBSCRIPTION_GATEWAYS.filter((g) => (RECURRING_CAPABLE_GATEWAYS as string[]).includes(g))
        : ALL_SUBSCRIPTION_GATEWAYS;

    return (
        <Card>
            <h2 className="font-display mb-1 text-sm font-semibold text-navy">
                Finish payment — {PLAN_LABELS[subscription.plan]}
            </h2>
            <p className="mb-4 text-xs text-ink-muted">
                {isRecurring
                    ? "Choose how you'd like this billed every month."
                    : "Choose how you'd like to pay for this 30-day plan."}
            </p>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {available.map((gateway) => (
                    <Button
                        key={gateway}
                        variant="secondary"
                        onClick={() => onCheckout(gateway)}
                        disabled={isPending}
                        className="justify-center"
                    >
                        {GATEWAY_LABELS[gateway]}
                    </Button>
                ))}
            </div>
            {errorMessage && <p className="text-xs text-status-cancelled-text">{errorMessage}</p>}
        </Card>
    );
}

function ActiveSubscriptionCard({ subscription }: { subscription: Subscription }) {
    const queryClient = useQueryClient();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscriptions });

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
    const busy = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

    return (
        <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-lg font-semibold text-navy">
                        {PLAN_LABELS[subscription.plan]}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                        {isRecurring ? "Auto-renews monthly" : "One-time — 30 day period"}
                        {subscription.gateway && ` · ${GATEWAY_LABELS[subscription.gateway as SubscriptionGateway] ?? subscription.gateway}`}
                    </p>
                </div>
                <StatusBadge label={subscription.status} tone={subscriptionStatusTone(subscription.status)} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-xs text-ink-muted">Kilos remaining</p>
                    <p className="font-medium text-ink">{subscription.kg_remaining}kg</p>
                </div>
                <div>
                    <p className="text-xs text-ink-muted">{isRecurring ? "Next renewal" : "Ends"}</p>
                    <p className="font-medium text-ink">
                        {new Date(subscription.end_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {subscription.cancel_at_period_end && (
                <p className="mb-4 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold-600">
                    This plan won&apos;t renew again — you&apos;ll keep your pickups through the date above, then it
                    ends.
                </p>
            )}

            {subscription.status === "ACTIVE" && (
                <div className="flex flex-wrap gap-2">
                    {!isRecurring && (
                        <Button variant="secondary" onClick={() => pauseMutation.mutate()} disabled={busy}>
                            {pauseMutation.isPending ? "Pausing..." : "Pause"}
                        </Button>
                    )}
                    {!subscription.cancel_at_period_end && (
                        <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={busy}>
                            {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                        </Button>
                    )}
                </div>
            )}

            {subscription.status === "PAUSED" && (
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => resumeMutation.mutate()} disabled={busy}>
                        {resumeMutation.isPending ? "Resuming..." : "Resume"}
                    </Button>
                    <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={busy}>
                        {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
                    </Button>
                </div>
            )}

            {errorMessage && <p className="mt-3 text-xs text-status-cancelled-text">{errorMessage}</p>}
        </Card>
    );
}

export default function SubscriptionPage() {
    const queryClient = useQueryClient();
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [pendingInfo, setPendingInfo] = useState<PaymentGateway | null>(null);

    const { data: subscriptions, isLoading } = useQuery({
        queryKey: queryKeys.payments.subscriptions,
        queryFn: () => paymentsApi.listSubscriptions(),
    });

    const subscription = currentSubscription(subscriptions);

    const createMutation = useMutation({
        mutationFn: (input: { plan: SubscriptionPlan; billing_cycle: SubscriptionBillingCycle }) =>
            paymentsApi.createSubscription(input),
        onSuccess: () => {
            setCreateError(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscriptions });
        },
        onError: (error) => setCreateError(getApiErrorMessage(error)),
    });

    const checkoutMutation = useMutation({
        mutationFn: ({ id, gateway }: { id: number; gateway: SubscriptionGateway }) =>
            paymentsApi.startSubscriptionCheckout(id, { gateway }),
        onSuccess: (result, variables) => {
            setCheckoutError(null);
            if (isRedirectResult(result)) {
                window.location.href = redirectUrlFrom(result);
                return;
            }
            // MTN/Orange: a collection request was just triggered on the
            // customer's phone — nothing to redirect to, just let them know.
            setPendingInfo(variables.gateway);
            queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscriptions });
        },
        onError: (error) => setCheckoutError(getApiErrorMessage(error)),
    });

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <Link
                href="/settings"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to settings
            </Link>

            <EyebrowLabel words={["Your account"]} />
            <h1 className="font-display mb-6 mt-1 text-xl font-semibold text-navy">Subscription</h1>

            {isLoading && (
                <Card className="space-y-3">
                    <span className="block h-3 w-1/4 animate-pulse rounded bg-steam" />
                    <span className="block h-20 animate-pulse rounded bg-steam" />
                </Card>
            )}

            {!isLoading && !subscription && (
                <Card>
                    <h2 className="font-display mb-1 text-sm font-semibold text-navy">Choose a plan</h2>
                    <p className="mb-5 text-xs text-ink-muted">
                        Pick a plan and your pickups are covered automatically — no per-order payment needed while
                        it&apos;s active.
                    </p>
                    <PlanPicker
                        onSubscribe={(plan, billing_cycle) => createMutation.mutate({ plan, billing_cycle })}
                        isPending={createMutation.isPending}
                        errorMessage={createError}
                    />
                </Card>
            )}

            {!isLoading && subscription && subscription.status === "PENDING" && !pendingInfo && (
                <CheckoutGatewayPicker
                    subscription={subscription}
                    onCheckout={(gateway) => checkoutMutation.mutate({ id: subscription.id, gateway })}
                    isPending={checkoutMutation.isPending}
                    errorMessage={checkoutError}
                />
            )}

            {!isLoading && subscription && subscription.status === "PENDING" && pendingInfo && (
                <Card>
                    <h2 className="font-display mb-1 text-sm font-semibold text-navy">Approve the payment request</h2>
                    <p className="mb-4 text-xs text-ink-muted">
                        We&apos;ve sent a {GATEWAY_LABELS[pendingInfo as SubscriptionGateway] ?? pendingInfo} payment
                        request to your phone. Once you approve it, your plan activates automatically.
                    </p>
                    <Button
                        variant="secondary"
                        onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscriptions })}
                    >
                        I&apos;ve approved it — refresh status
                    </Button>
                </Card>
            )}

            {!isLoading && subscription && subscription.status !== "PENDING" && (
                <ActiveSubscriptionCard subscription={subscription} />
            )}
        </main>
    );
}
