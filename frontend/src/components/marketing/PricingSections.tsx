"use client";

import { useId, useState } from "react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Award, Check } from "lucide-react";

import { buttonStyles } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";

import {
  HERO_VIDEO,
  PLANS,
  formatAmount,
  monthlySaving,
  pricePerKg,
  type Plan,
  type PlanId,
} from "./pricing-data";

type Billing = "ONE_TIME" | "MONTHLY";

/*
  Tier colours follow the flyer: Essentiel is gold, Confort is silver,
  Famille is navy. The header band carries the tier, the rest stays neutral.
*/
const TIER: Record<
  PlanId,
  { header: string; badge: string; cta: "secondary" | "gold" | "primary" }
> = {
  ESSENTIEL: {
    header: "bg-gold text-navy",
    badge: "bg-navy text-gold",
    cta: "secondary",
  },
  CONFORT: {
    header: "bg-silver text-navy",
    badge: "bg-navy text-gold",
    cta: "gold",
  },
  FAMILLE: {
    header: "bg-navy text-white",
    badge: "bg-gold text-navy",
    cta: "primary",
  },
};

function BillingToggle({
  value,
  onChange,
}: {
  value: Billing;
  onChange: (v: Billing) => void;
}) {
  const layoutId = useId();
  const options: { id: Billing; label: string }[] = [
    { id: "ONE_TIME", label: "Pay once" },
    { id: "MONTHLY", label: "Auto-renew" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Billing"
      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 text-sm"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "relative rounded-full px-4 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40",
              active ? "text-navy" : "text-white/80 hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId={`billing-thumb-${layoutId}`}
                className="absolute inset-0 rounded-full bg-gold"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const tier = TIER[plan.id];
  const headingId = `plan-${plan.id.toLowerCase()}`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-card border border-crease bg-white shadow-card",
        plan.popular && "ring-2 ring-gold shadow-lift",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-6 py-4",
          tier.header,
        )}
      >
        <h2 id={headingId} className="font-display text-xl font-semibold">
          {plan.name}
        </h2>
        {plan.popular ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              tier.badge,
            )}
          >
            Most popular
          </span>
        ) : (
          <Award className="h-6 w-6" aria-hidden="true" />
        )}
      </header>

      <div className="flex flex-1 flex-col p-6">
        <p className="font-display text-4xl font-semibold tabular-nums text-navy">
          {plan.kg} kg
          <span className="ml-1.5 text-base font-normal text-ink-muted">
            per month
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>

        <div className="mt-6 rounded-xl border border-crease-soft bg-mist p-4">
          <p className="text-sm text-ink-faint">
            <span className="sr-only">Standard price </span>
            <s>{formatAmount(plan.standard)} FCFA</s>
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-navy">
            <span className="font-display text-3xl font-semibold tabular-nums">
              {formatAmount(plan.monthly)}
            </span>
            <span className="text-sm font-medium">FCFA / month</span>
          </p>
          <p className="mt-2 inline-flex rounded-full bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-600">
            You save {formatAmount(monthlySaving(plan))} FCFA every month
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            {formatAmount(pricePerKg(plan))} FCFA per kg
          </p>
        </div>

        <ul className="mt-6 flex-1 space-y-3 text-sm text-ink">
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
              aria-hidden="true"
            />
            {plan.kg} kg of laundry covered every month
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
              aria-hidden="true"
            />
            Washing, spinning, drying, ironing and plastic wrap
          </li>
          <li className="flex items-start gap-2.5">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
              aria-hidden="true"
            />
            No commitment, cancel anytime
          </li>
        </ul>

        {billing === "MONTHLY" && (
          <p className="mt-5 text-xs text-ink-muted">
            Billed automatically every 30 days by PayPal.
          </p>
        )}

        <Link
          href="/subscription"
          className={buttonStyles({
            variant: tier.cta,
            className: "mt-6 w-full",
          })}
        >
          Choose {plan.name}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/** Full-bleed, decorative background video. The poster shows when motion is reduced. */
function HeroVideo() {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={HERO_VIDEO.src}
        poster={HERO_VIDEO.poster}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy via-navy/75 to-navy/30"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy/80 to-transparent"
        aria-hidden="true"
      />
    </>
  );
}

/** Navy hero with the three plan cards pulled up over its lower edge. */
export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("ONE_TIME");
  const reduceMotion = useReducedMotion();

  return (
    <section id="plans" className="scroll-mt-20">
      <div className="hero-navy relative overflow-hidden text-white">
        <HeroVideo />
        <div className="relative px-6 pb-40 pt-16 md:pt-28">
          <div className="mx-auto max-w-6xl">
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] md:text-6xl">
                Your laundry, covered every month
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/75 md:text-lg">
                Choose the kilos you need. Washing, spinning, drying, ironing
                and plastic wrap are all included, and every plan costs less
                than paying as you go.
              </p>
              <div className="mt-8">
                <BillingToggle value={billing} onChange={setBilling} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-28 px-6">
        <motion.div
          className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3"
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              className={cn(plan.popular && "md:-translate-y-3")}
              variants={{
                hidden: { opacity: 0, y: 24 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              <PlanCard plan={plan} billing={billing} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
