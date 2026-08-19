import { ServiceIcon, serviceLabel } from "@/components/ui";
import type { ServiceType } from "@/types";

const SERVICES: { type: ServiceType; description: string }[] = [
  { type: "TSHIRT", description: "Everyday t-shirts, washed and folded." },
  { type: "CHEMISE", description: "Shirts, washed and crisply pressed." },
  { type: "PANTALON", description: "Trousers, washed and pressed." },
  { type: "VESTE", description: "Jackets, cleaned and pressed." },
  { type: "ROBE", description: "Dresses and evening wear, handled with care." },
  { type: "DRAPS_COMPLET", description: "Full bed sheet sets." },
  { type: "LAVAGE_ESSORAGE", description: "Self-service wash and spin cycle at the storefront." },
  { type: "REPASSAGE_PLASTIF", description: "Storefront pressing with protective wrap." },
];

export function ServicesSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl font-bold text-navy">What we clean</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {SERVICES.map((service) => (
          <div key={service.type} className="rounded-card border border-crease bg-white p-5">
            <span className="mb-3 inline-flex text-navy">
              <ServiceIcon type={service.type} className="h-6 w-6" />
            </span>
            <p className="mb-1 text-sm font-medium text-ink">{serviceLabel(service.type)}</p>
            <p className="text-sm text-ink-muted">{service.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
