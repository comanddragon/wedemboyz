import { LocalizedLink as Link } from "@/src/i18n/navigation";
import {
  ChevronDown,
  Clock,
  Droplets,
  Flame,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  WashingMachine,
  Wind,
} from "lucide-react";

import { ServiceIcon, buttonStyles, serviceLabel } from "@/src/components/ui";
import { BUSINESS } from "@/src/lib/constants";
import { cn } from "@/src/lib/utils";

import {
  INCLUDED_SERVICES,
  KG_SERVICES,
  MINIMUM_PER_KG_LINE,
  PICKUP_DELIVERY_FEE,
  PIECE_SERVICES,
  PLANS,
  formatAmount,
  monthlySaving,
  pricePerKg,
} from "./pricing-data";

const SERVICE_ICONS = [WashingMachine, Droplets, Wind, Flame, PackageCheck];

const FAQ = [
  {
    q: "Do unused kilos carry over to the next month?",
    a: "No. Kilos you do not use are not carried over, so pick the plan that matches a normal month.",
  },
  {
    q: "What happens if I go over my kilos?",
    a: "The extra kilos are billed at the current rate grid. You are never blocked from using the service.",
  },
  {
    q: "Is there a commitment?",
    a: "No. Plans have no commitment and you can cancel anytime.",
  },
  {
    q: "How do I pay?",
    a: "By cash, PayPal, MTN Mobile Money or Orange Money. Auto-renew is available with PayPal.",
  },
  {
    q: "Do you deliver?",
    a: `Yes. Home delivery is available. Pickup and delivery is a flat ${formatAmount(PICKUP_DELIVERY_FEE)} FCFA per order.`,
  },
];

/** The five services every plan covers, as one quiet row under the cards. */
export function PricingIncluded() {
  return (
    <section aria-labelledby="included-heading" className="px-6 pt-20">
      <div className="mx-auto max-w-6xl">
        <h2
          id="included-heading"
          className="font-display text-xl font-semibold text-navy"
        >
          Every plan includes
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {INCLUDED_SERVICES.map((label, i) => {
            const Icon = SERVICE_ICONS[i];
            return (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-crease bg-white px-4 py-3 text-sm font-medium text-ink"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-gold">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function PricingComparison() {
  const rows: { label: string; cell: (i: number) => React.ReactNode }[] = [
    { label: "Kilos per month", cell: (i) => `${PLANS[i].kg} kg` },
    {
      label: "Monthly price",
      cell: (i) => (
        <span className="font-display text-base font-semibold text-navy">
          {formatAmount(PLANS[i].monthly)} FCFA
        </span>
      ),
    },
    {
      label: "Standard price",
      cell: (i) => <s>{formatAmount(PLANS[i].standard)} FCFA</s>,
    },
    {
      label: "You save",
      cell: (i) => (
        <span className="font-semibold text-gold-600">
          {formatAmount(monthlySaving(PLANS[i]))} FCFA
        </span>
      ),
    },
    {
      label: "Price per kg",
      cell: (i) => `${formatAmount(pricePerKg(PLANS[i]))} FCFA`,
    },
    { label: "Services included", cell: () => "All five" },
    { label: "Unused kilos", cell: () => "Not carried over" },
    { label: "Extra kilos", cell: () => "Billed at the current rate grid" },
  ];

  return (
    <section aria-labelledby="compare-heading" className="px-6 pt-20">
      <div className="mx-auto max-w-6xl">
        <h2
          id="compare-heading"
          className="font-display text-2xl font-semibold text-navy md:text-3xl"
        >
          Compare the plans
        </h2>
        <div className="mt-6 overflow-x-auto rounded-card border border-crease bg-white shadow-card-sm">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm tabular-nums">
            <caption className="sr-only">
              Monthly plans compared by kilos, price and savings
            </caption>
            <thead>
              <tr className="border-b border-crease">
                <td className="w-1/4 px-5 py-4" />
                {PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "px-5 py-4 font-display text-base font-semibold text-navy",
                      plan.popular && "bg-gold-50",
                    )}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-crease-soft last:border-b-0"
                >
                  <th
                    scope="row"
                    className="px-5 py-3.5 font-medium text-ink-muted"
                  >
                    {row.label}
                  </th>
                  {PLANS.map((plan, i) => (
                    <td
                      key={plan.id}
                      className={cn(
                        "px-5 py-3.5 text-ink",
                        plan.popular && "bg-gold-50",
                      )}
                    >
                      {row.cell(i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Ledger({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
      <ul className="mt-3 divide-y divide-crease-soft">{children}</ul>
    </div>
  );
}

function LedgerRow({
  type,
  price,
  description,
}: {
  type: Parameters<typeof serviceLabel>[0];
  price: string;
  description?: string;
}) {
  return (
    <li className="py-3">
      <div className="flex items-baseline gap-3">
        <ServiceIcon
          type={type}
          className="h-4 w-4 shrink-0 self-center text-navy"
        />
        <span className="text-sm font-medium text-ink">
          {serviceLabel(type)}
        </span>
        <span
          aria-hidden="true"
          className="min-w-4 flex-1 border-b border-dotted border-crease-strong"
        />
        <span className="whitespace-nowrap font-display text-base font-semibold tabular-nums text-navy">
          {price}
        </span>
      </div>
      {description && (
        <p className="mt-1 pl-7 text-xs text-ink-muted">{description}</p>
      )}
    </li>
  );
}

export function PricingPayAsYouGo() {
  return (
    <section
      aria-labelledby="payg-heading"
      className="mt-20 border-y border-crease bg-white px-6 py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.8fr]">
        <div>
          <h2
            id="payg-heading"
            className="font-display text-2xl font-semibold text-navy md:text-3xl"
          >
            Prefer to pay as you go?
          </h2>
          <p className="mt-3 max-w-md text-ink-muted">
            No plan needed. You pay for what you bring, at the same rate every
            time.
          </p>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-ink">
                {formatAmount(MINIMUM_PER_KG_LINE)} FCFA minimum per kilo line
              </dt>
              <dd className="mt-0.5 text-ink-muted">
                If a per-kilo line comes to less, we charge the minimum.
                Per-piece items are flat-priced.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">
                {formatAmount(PICKUP_DELIVERY_FEE)} FCFA pickup and delivery
              </dt>
              <dd className="mt-0.5 text-ink-muted">
                One flat fee per order, shown before you confirm.
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-10 md:grid-cols-[1.15fr_1fr]">
          <Ledger title="By the kilo" note="Billed by weight.">
            {KG_SERVICES.map((s) => (
              <LedgerRow
                key={s.type}
                type={s.type}
                price={`${formatAmount(s.perKg)} / kg`}
                description={s.description}
              />
            ))}
          </Ledger>
          <Ledger title="By the piece" note="Flat price per item, any weight.">
            {PIECE_SERVICES.map((s) => (
              <LedgerRow
                key={s.type}
                type={s.type}
                price={formatAmount(s.price)}
              />
            ))}
          </Ledger>
        </div>
      </div>
    </section>
  );
}

export function PricingFaq() {
  return (
    <section aria-labelledby="faq-heading" className="px-6 pt-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.6fr]">
        <h2
          id="faq-heading"
          className="font-display text-2xl font-semibold text-navy md:text-3xl"
        >
          Questions about plans
        </h2>
        <div className="border-t border-crease">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group border-b border-crease py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md font-display text-base font-medium text-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 max-w-prose text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingContact() {
  return (
    <section aria-labelledby="cta-heading" className="px-6 py-20">
      <div className="hero-navy mx-auto grid max-w-6xl gap-10 rounded-card p-8 text-white md:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2
            id="cta-heading"
            className="font-display text-3xl font-semibold md:text-4xl"
          >
            Start with the plan that fits your month
          </h2>
          <p className="mt-3 max-w-md text-white/75">
            Not sure how many kilos you wash? Message us and we will help you
            pick.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#plans" className={buttonStyles({ variant: "gold" })}>
              Choose a plan
            </Link>
            <a
              href={BUSINESS.whatsappHref}
              className={buttonStyles({ variant: "secondary" })}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Ask on WhatsApp
            </a>
          </div>
        </div>

        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <Phone
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <a href={BUSINESS.telHref} className="hover:underline">
              {BUSINESS.phoneDisplay}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <a href={BUSINESS.mapsUrl} className="hover:underline">
              {BUSINESS.address}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            {BUSINESS.hours}
          </li>
        </ul>
      </div>
    </section>
  );
}
