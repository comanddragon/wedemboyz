import { Banknote, Clock, Sparkles } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: Clock,
    title: "Same-day pickup in Bamenda",
    description: "Book before noon and we'll come by that afternoon.",
  },
  {
    icon: Banknote,
    title: "Pay by cash, MTN, or Orange Money",
    description: "Whatever's easiest for you — no card required.",
  },
  {
    icon: Sparkles,
    title: "Earn points toward your next order",
    description: "Every order builds up loyalty rewards automatically.",
  },
];

export function ValuePropsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl font-bold text-navy">Why book with us</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div key={title}>
            <Icon className="mb-3 h-6 w-6 text-gold" aria-hidden="true" />
            <p className="mb-1 text-sm font-medium text-ink">{title}</p>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
