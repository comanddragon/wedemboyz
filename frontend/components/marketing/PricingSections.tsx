"use client";

import { useId, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowRight,
    Check,
    Crown,
    Droplets,
    MessageCircleMore,
    Package,
    Percent,
    Sparkles,
    Truck,
    Zap,
} from "lucide-react";

import { Button, EyebrowLabel, ServiceIcon, serviceLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/types";

import { PressedCrease, Reveal, SPRING, StaggerGroup, StaggerItem } from "./PricingReveal";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Accent = "turquoise" | "sun" | "coral" | "clothesline";

// Mirrors services.pricing.PRICE_PER_PIECE — flat price per piece
// ("NOUVEAUX PRIX" flyer). weight_kg is still recorded per item for
// logistics but does NOT affect these prices.
const PIECE_SERVICES: { type: ServiceType; price: number; description: string; accent: Accent }[] = [
    { type: "VESTE", price: 2000, description: "Jackets, cleaned and pressed.", accent: "turquoise" },
    { type: "TSHIRT", price: 500, description: "Everyday t-shirts, washed and folded.", accent: "sun" },
    { type: "CHEMISE", price: 600, description: "Shirts, washed and crisply pressed.", accent: "coral" },
    { type: "PANTALON", price: 500, description: "Trousers, washed and pressed.", accent: "clothesline" },
    { type: "PULL", price: 1000, description: "Sweaters, gently washed and shaped.", accent: "turquoise" },
    { type: "ROBE", price: 2500, description: "Dresses and evening wear, handled with care.", accent: "sun" },
    { type: "ENSEMBLE", price: 2000, description: "Matching sets, cleaned as one.", accent: "coral" },
    { type: "DRAPS_COMPLET", price: 1500, description: "Full bed sheet sets.", accent: "clothesline" },
    { type: "COUETTE_1P", price: 2000, description: "Single-size duvet.", accent: "turquoise" },
    { type: "COUETTE_2P", price: 3000, description: "Double-size duvet.", accent: "sun" },
    { type: "COUETTE_3P", price: 4000, description: "King-size duvet.", accent: "coral" },
];

// Mirrors services.pricing.PRICE_PER_KG — the self-service lavomatique
// lines from the "GRILLE DE PRIX" flyer, billed by weight with a 1,000 XAF
// minimum per line (services.pricing.MINIMUM_CHARGE_PER_KG_ITEM).
const KG_SERVICES: { type: ServiceType; perKg: number; description: string; accent: Accent }[] = [
    { type: "LAVAGE_ESSORAGE", perKg: 600, description: "Self-service wash and spin cycle.", accent: "turquoise" },
    { type: "LAVAGE_SECHAGE", perKg: 1000, description: "Wash, spin, and tumble dry.", accent: "sun" },
    { type: "REPASSAGE_PLASTIF", perKg: 1000, description: "Storefront pressing with protective wrap.", accent: "coral" },
];

const ACCENT_SHADOW: Record<Accent, string> = {
    turquoise: "rgba(29, 143, 140, 0.28)",
    sun: "rgba(232, 163, 36, 0.30)",
    coral: "rgba(225, 90, 59, 0.28)",
    clothesline: "rgba(76, 154, 99, 0.28)",
};

const ACCENT_VAR: Record<Accent, string> = {
    turquoise: "var(--color-turquoise)",
    sun: "var(--color-sun)",
    coral: "var(--color-coral)",
    clothesline: "var(--color-clothesline)",
};

const ACCENT_CHIP: Record<Accent, string> = {
    turquoise: "bg-turquoise-50 text-turquoise-600",
    sun: "bg-sun-50 text-sun-600",
    coral: "bg-coral-50 text-coral-600",
    clothesline: "bg-clothesline-50 text-clothesline-600",
};

const RULES = [
    {
        icon: Package,
        title: "1,000 XAF minimum on per-kilo lines",
        description:
            "For the self-service wash/dry/press lines billed by weight, if the per-kilo price would come out under 1,000 XAF, we still charge 1,000 XAF for that line. Per-piece items (shirts, trousers, jackets...) are always flat-priced, no minimum to worry about.",
    },
    {
        icon: Truck,
        title: "1,500 XAF pickup & delivery, every order",
        description:
            "One flat fee covers pickup and drop-off at your door, shown before you confirm — no free-delivery threshold, no surprises at checkout.",
    },
];

type Plan = {
    id: "ESSENTIEL" | "CONFORT" | "FAMILLE";
    name: string;
    tagline: string;
    monthly: number;
    kg: number;
    accent: Accent | "navy";
    icon: typeof Droplets;
    popular?: boolean;
    features: string[];
    cta: string;
};

// Mirrors services.pricing.PLAN_PRICE / PLAN_KG_ALLOWANCE on the backend
// — keep the ids, prices, and kg allowances in sync if those change. The
// actual plan picker (with live billing-cycle and gateway choices) lives
// at /subscription; this section is a preview that hands off to it.
const PLANS: Plan[] = [
    {
        id: "ESSENTIEL",
        name: "Essentiel",
        tagline: "For one or two people keeping up with the basics.",
        monthly: 17500,
        kg: 10,
        accent: "turquoise",
        icon: Droplets,
        features: [
            "10kg covered every month",
            "Any per-kilo service, drawn from your monthly allowance",
            "Cash, card, PayPal, MTN, or Orange Money",
            "Pause or cancel anytime",
        ],
        cta: "Start with Essentiel",
    },
    {
        id: "CONFORT",
        name: "Confort",
        tagline: "Our most popular plan — a full household's rotation, handled.",
        monthly: 34000,
        kg: 20,
        accent: "navy",
        icon: Crown,
        popular: true,
        features: [
            "20kg covered every month",
            "Priority pickup windows, booked first",
            "Delivery always included, no extra fee",
            "Pause or cancel anytime",
        ],
        cta: "Choose Confort",
    },
    {
        id: "FAMILLE",
        name: "Famille",
        tagline: "For big households, guests, and heavier loads.",
        monthly: 49000,
        kg: 30,
        accent: "coral",
        icon: Sparkles,
        features: [
            "30kg covered every month",
            "Priority pickup + same-day rush option",
            "Delivery always included, no extra fee",
            "Pause or cancel anytime",
        ],
        cta: "Choose Famille",
    },
];

/* ------------------------------------------------------------------ */
/*  Hero                                                                */
/* ------------------------------------------------------------------ */

export function PricingHeader() {
    return (
        <section className="relative overflow-hidden px-6 pb-12 pt-16 md:pt-24">
            <div className="pf-blob-field" aria-hidden="true">
                <div
                    className="pf-blob pf-blob-a h-72 w-72 -translate-x-1/3"
                    style={{ background: "var(--color-navy)", left: "5%", top: "-40px" }}
                />
                <div
                    className="pf-blob pf-blob-b h-80 w-80"
                    style={{ background: "var(--color-gold)", right: "0%", top: "-60px" }}
                />
                <div
                    className="pf-blob pf-blob-c h-56 w-56"
                    style={{ background: "var(--color-navy-600)", left: "38%", top: "120px" }}
                />
                {[10, 26, 44, 62, 78].map((left, i) => (
                    <span
                        key={left}
                        className="pf-bubble"
                        style={{
                            left: `${left}%`,
                            width: `${10 + (i % 3) * 6}px`,
                            height: `${10 + (i % 3) * 6}px`,
                            animationDelay: `${i * 1.4}s`,
                        }}
                    />
                ))}
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
                <div>
                    <Reveal>
                        <EyebrowLabel words={["SIMPLE", "TRANSPARENT", "PER KILO"]} />
                    </Reveal>
                    <Reveal delay={0.08}>
                        <h1 className="mt-3 max-w-2xl text-balance font-display text-4xl font-bold leading-tight text-navy md:text-5xl">
                            One price per kilo. No packages, no surprises.
                        </h1>
                    </Reveal>
                    <Reveal delay={0.16}>
                        <p className="mt-4 max-w-md text-base text-ink-muted">
                            Weigh it, wash it, done. Here&apos;s exactly what each service costs — the same rate
                            whether you bring one shirt or a full week&apos;s laundry.
                        </p>
                    </Reveal>
                    <Reveal delay={0.24}>
                        <div className="mt-7 flex flex-wrap gap-2 text-sm">
                            <a
                                href="#per-kilo"
                                className="rounded-full border border-crease bg-white px-4 py-2 font-medium text-ink transition-colors hover:border-navy/30 hover:bg-navy-50"
                            >
                                Per-kilo pricing
                            </a>
                            <a
                                href="#membership"
                                className="rounded-full border border-gold/40 bg-gold-50 px-4 py-2 font-medium text-navy transition-colors hover:border-gold hover:bg-gold-50/80"
                            >
                                Monthly membership
                            </a>
                        </div>
                    </Reveal>
                </div>

                <Reveal delay={0.2}>
                    <div className="relative mx-auto w-full max-w-sm rounded-card border border-crease bg-white p-2 shadow-[0_20px_45px_-24px_rgba(25,38,69,0.35)]">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-card)-4px)]">
                            <Image
                                src="/images/pricing-laundromat-interior.jpg"
                                alt="Rows of washers at the WEDEMBOYZ facility, weighed and billed per kilo"
                                fill
                                sizes="(max-width: 1024px) 60vw, 340px"
                                className="object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-3 -right-3 rounded-full border border-gold/40 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-navy shadow-sm">
                            No hidden fees
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Per-kilo grid                                                      */
/* ------------------------------------------------------------------ */

function ServiceCard({ type, price, description, accent }: { type: ServiceType; price: string; description: string; accent: Accent }) {
    return (
        <StaggerItem>
            <div
                className="pf-service-card group flex h-full flex-col rounded-card border border-crease bg-white p-5"
                style={
                    {
                        "--pf-accent": ACCENT_VAR[accent],
                        "--pf-accent-shadow": ACCENT_SHADOW[accent],
                    } as CSSProperties
                }
            >
                <span
                    className={cn(
                        "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
                        ACCENT_CHIP[accent],
                    )}
                >
                    <ServiceIcon type={type} className="h-5 w-5" />
                </span>
                <h2 className="text-sm font-medium text-ink">{serviceLabel(type)}</h2>
                <p className="mt-1 font-display text-2xl font-bold text-navy">{price}</p>
                <p className="mt-3 text-sm text-ink-muted">{description}</p>
            </div>
        </StaggerItem>
    );
}

export function PricingGrid() {
    return (
        <section id="per-kilo" className="scroll-mt-20 px-6 py-8">
            <div className="mx-auto max-w-5xl">
                <h2 className="mb-1 font-display text-lg font-bold text-navy">Per-piece pressing</h2>
                <p className="mb-6 text-sm text-ink-muted">Flat price per item, regardless of weight.</p>
                <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {PIECE_SERVICES.map((service) => (
                        <ServiceCard
                            key={service.type}
                            type={service.type}
                            price={`${service.price.toLocaleString()} XAF`}
                            description={service.description}
                            accent={service.accent}
                        />
                    ))}
                </StaggerGroup>

                <h2 className="mb-1 mt-12 font-display text-lg font-bold text-navy">Self-service lavomatique (per kg)</h2>
                <p className="mb-6 text-sm text-ink-muted">Billed by weight — 1,000 XAF minimum per line.</p>
                <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {KG_SERVICES.map((service) => (
                        <ServiceCard
                            key={service.type}
                            type={service.type}
                            price={`${service.perKg.toLocaleString()} XAF/kg`}
                            description={service.description}
                            accent={service.accent}
                        />
                    ))}
                </StaggerGroup>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Membership / subscription plans                                    */
/* ------------------------------------------------------------------ */

function BillingToggle({
                           value,
                           onChange,
                       }: {
    value: "ONE_TIME" | "MONTHLY";
    onChange: (v: "ONE_TIME" | "MONTHLY") => void;
}) {
    const layoutId = useId();
    return (
        <div className="inline-flex items-center gap-1 rounded-full border border-crease bg-white p-1 text-sm">
            {(["ONE_TIME", "MONTHLY"] as const).map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={cn(
                        "relative rounded-full px-4 py-2 font-medium transition-colors",
                        value === opt ? "text-white" : "text-ink-muted hover:text-ink",
                    )}
                >
                    {value === opt && (
                        <motion.span
                            layoutId={`billing-thumb-${layoutId}`}
                            className="absolute inset-0 rounded-full bg-navy"
                            transition={SPRING}
                        />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
            {opt === "ONE_TIME" ? "Pay once" : "Auto-renew"}
                        {opt === "MONTHLY" && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    value === "MONTHLY" ? "bg-white/20 text-white" : "bg-gold-50 text-gold-600",
                                )}
                            >
                <Percent className="h-2.5 w-2.5" aria-hidden="true" />
                Card/PayPal only
              </span>
                        )}
          </span>
                </button>
            ))}
        </div>
    );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: "ONE_TIME" | "MONTHLY" }) {
    const price = plan.monthly;
    const Icon = plan.icon;
    const isDark = plan.accent === "navy";

    return (
        <motion.div
            whileHover={{ y: plan.popular ? -10 : -6 }}
            transition={SPRING}
            className={cn(
                "relative flex h-full flex-col rounded-card p-6",
                isDark
                    ? "bg-navy text-white shadow-[0_30px_60px_-25px_rgba(25,38,69,0.55)]"
                    : "border border-crease bg-white",
                plan.popular && "sm:scale-[1.04] sm:py-8",
            )}
        >
            {plan.popular && (
                <>
                    <div
                        className="pf-glow pointer-events-none absolute -inset-3 -z-10 rounded-[22px] blur-xl"
                        style={{ background: "radial-gradient(circle, rgba(200,146,47,0.35), transparent 70%)" }}
                        aria-hidden="true"
                    />
                    <span className="pf-shimmer absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-xs font-semibold text-navy shadow-sm">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            Most Popular
          </span>
                </>
            )}

            <span
                className={cn(
                    "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 hover:-rotate-6 hover:scale-110",
                    isDark ? "bg-white/10 text-gold" : ACCENT_CHIP[plan.accent as Accent],
                )}
            >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

            <h3 className={cn("font-display text-xl font-bold", isDark ? "text-white" : "text-navy")}>
                {plan.name}
            </h3>
            <p className={cn("mt-1 text-sm", isDark ? "text-white/70" : "text-ink-muted")}>
                {plan.tagline}
            </p>

            <div className="mt-5 flex items-baseline gap-1">
        <span className={cn("font-display text-3xl font-bold", isDark ? "text-white" : "text-navy")}>
          {price.toLocaleString()}
        </span>
                <span className={cn("text-sm font-medium", isDark ? "text-white/60" : "text-ink-muted")}>
          XAF / 30 days
        </span>
            </div>
            <p className={cn("mt-1 text-xs font-medium", isDark ? "text-white/60" : "text-ink-muted")}>
                {plan.kg}kg covered per period
            </p>
            {billing === "MONTHLY" && (
                <p className={cn("mt-1 text-xs", isDark ? "text-white/50" : "text-ink-muted")}>
                    Billed automatically every 30 days by card or PayPal — cancel anytime
                </p>
            )}

            <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check
                            className={cn("mt-0.5 h-4 w-4 shrink-0", isDark ? "text-gold" : "text-turquoise-600")}
                            aria-hidden="true"
                        />
                        <span className={isDark ? "text-white/85" : "text-ink"}>{feature}</span>
                    </li>
                ))}
            </ul>

            <Link href="/subscription" className="mt-7 block">
                <Button
                    variant={isDark ? "gold" : "secondary"}
                    className={cn("w-full justify-center active:scale-[0.98]", !isDark && "hover:border-navy/30")}
                >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </Link>
        </motion.div>
    );
}

export function PricingMembership() {
    const [billing, setBilling] = useState<"ONE_TIME" | "MONTHLY">("ONE_TIME");

    return (
        <section id="membership" className="relative scroll-mt-20 overflow-hidden px-6 py-16">
            <div className="pf-blob-field" aria-hidden="true">
                <div
                    className="pf-blob pf-blob-b h-80 w-80"
                    style={{ background: "var(--color-navy)", left: "-5%", bottom: "-60px" }}
                />
                <div
                    className="pf-blob pf-blob-c h-72 w-72"
                    style={{ background: "var(--color-gold)", right: "-5%", top: "10%" }}
                />
            </div>

            <div className="mx-auto max-w-5xl">
                <Reveal>
                    <EyebrowLabel words={["NEW", "MEMBERSHIP"]} />
                </Reveal>
                <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Reveal delay={0.05}>
                            <h2 className="max-w-lg text-balance font-display text-3xl font-bold leading-tight text-navy md:text-4xl">
                                Prefer it on autopilot?
                            </h2>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <p className="mt-3 max-w-md text-sm text-ink-muted">
                                Pick a plan and pickups just happen every week — same trusted team, same fair
                                pricing, one predictable bill. Pause or cancel anytime.
                            </p>
                        </Reveal>
                    </div>
                    <Reveal delay={0.15}>
                        <BillingToggle value={billing} onChange={setBilling} />
                    </Reveal>
                </div>

                <StaggerGroup className="mt-10 grid grid-cols-1 items-center gap-6 sm:grid-cols-3 sm:gap-5">
                    {PLANS.map((plan) => (
                        <StaggerItem key={plan.id} className="h-full">
                            <PlanCard plan={plan} billing={billing} />
                        </StaggerItem>
                    ))}
                </StaggerGroup>

                <Reveal delay={0.1} className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
                    <Zap className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    <span>Go over your monthly kilos and the rest is billed at standard per-kilo rates — never blocked, never a scramble.</span>
                </Reveal>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Details                                                             */
/* ------------------------------------------------------------------ */

export function PricingDetails() {
    return (
        <section className="px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <Reveal>
                    <h2 className="font-display text-2xl font-bold text-navy">How the numbers work</h2>
                </Reveal>
                <StaggerGroup className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                    {RULES.map(({ icon: Icon, title, description }) => (
                        <StaggerItem key={title}>
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
                            <p className="mb-1 text-sm font-medium text-ink">{title}</p>
                            <p className="text-sm text-ink-muted">{description}</p>
                        </StaggerItem>
                    ))}
                </StaggerGroup>

                <div className="mt-10">
                    <PressedCrease />
                </div>

                <Reveal delay={0.1}>
                    <div className="mt-8 rounded-card border border-crease bg-navy-50 p-6">
                        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                            A typical order
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
                            A 5&nbsp;kg bag of everyday clothes on Lavage&nbsp;et&nbsp;Essorage comes to about{" "}
                            <span className="font-semibold text-navy">3,000 XAF</span>, plus the flat{" "}
                            <span className="font-semibold text-navy">1,500 XAF</span> pickup &amp; delivery fee —
                            every order, no threshold to hit. Or skip the math entirely with the{" "}
                            <a href="#membership" className="font-medium text-navy underline decoration-gold/50 underline-offset-2 hover:decoration-gold">
                                Confort plan
                            </a>
                            .
                        </p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                 */
/* ------------------------------------------------------------------ */

export function PricingCTA() {
    return (
        <section className="relative overflow-hidden px-6 py-16 text-center">
            <div className="pf-blob-field" aria-hidden="true">
                <div
                    className="pf-blob pf-blob-a h-64 w-64"
                    style={{ background: "var(--color-gold)", left: "12%", top: "0px" }}
                />
                <div
                    className="pf-blob pf-blob-c h-64 w-64"
                    style={{ background: "var(--color-navy)", right: "12%", top: "20px" }}
                />
            </div>
            <div className="mx-auto max-w-5xl">
                <Reveal>
                    <h2 className="font-display text-2xl font-bold text-navy">Ready when you are</h2>
                </Reveal>
                <Reveal delay={0.06}>
                    <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                        Book a pickup, weigh in, and pay by cash, MTN, or Orange Money — no account fees, no
                        fine print.
                    </p>
                </Reveal>
                <Reveal delay={0.12}>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link href="/register">
                            <Button className="active:scale-[0.98]">Book your first pickup</Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="secondary" className="group">
                                <MessageCircleMore className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
                                Have a question?
                            </Button>
                        </Link>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}