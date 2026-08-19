import Link from "next/link";

import { Button, ServiceIcon, serviceLabel } from "@/components/ui";
import type { ServiceType } from "@/types";

const PRICES: { type: ServiceType; label: string }[] = [
  { type: "TSHIRT", label: "500 XAF" },
  { type: "CHEMISE", label: "600 XAF" },
  { type: "LAVAGE_ESSORAGE", label: "600 XAF/kg" },
  { type: "REPASSAGE_PLASTIF", label: "1,000 XAF/kg" },
];

export function PricingTeaser() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-2 font-display text-2xl font-bold text-navy">Simple, transparent pricing</h2>
      <p className="mb-8 text-sm text-ink-muted">
        Flat price per piece for pressing, or by the kilo for self-service — 1,000 XAF minimum on
        per-kilo lines. Plus a flat 1,500 XAF pickup &amp; delivery fee, every order.
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {PRICES.map((price) => (
          <div key={price.type} className="rounded-card border border-crease bg-white p-5">
            <span className="mb-2 inline-flex text-navy">
              <ServiceIcon type={price.type} className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-ink">{serviceLabel(price.type)}</p>
            <p className="text-lg font-semibold text-navy">{price.label}</p>
          </div>
        ))}
      </div>
      <Link href="/pricing" className="mt-6 inline-block">
        <Button variant="secondary">Full pricing details</Button>
      </Link>
    </section>
  );
}
