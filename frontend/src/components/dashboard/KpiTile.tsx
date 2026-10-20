import type { LucideIcon } from "lucide-react";

export type KpiAccent = "blue" | "gold" | "turquoise" | "coral" | "green";

/*
  One accent per tile, drawn from the existing brand palette. Each accent is a
  low-saturation tint (chip + corner glow) with the full-strength hue reserved
  for the icon and the small detail dot — so four tiles read as one family
  rather than four competing colours.
*/
const ACCENTS: Record<
  KpiAccent,
  { chip: string; glow: string; dot: string; bar: string }
> = {
  blue: {
    chip: "bg-dashboard-blue-50 text-dashboard-blue",
    glow: "from-dashboard-blue/15",
    dot: "bg-dashboard-blue",
    bar: "bg-dashboard-blue",
  },
  gold: {
    chip: "bg-gold-50 text-gold-600",
    glow: "from-gold/20",
    dot: "bg-gold",
    bar: "bg-gold",
  },
  turquoise: {
    chip: "bg-turquoise-50 text-turquoise-600",
    glow: "from-turquoise/15",
    dot: "bg-turquoise",
    bar: "bg-turquoise",
  },
  coral: {
    chip: "bg-coral-50 text-coral-600",
    glow: "from-coral/15",
    dot: "bg-coral",
    bar: "bg-coral",
  },
  green: {
    chip: "bg-clothesline-50 text-clothesline-600",
    glow: "from-clothesline/15",
    dot: "bg-clothesline",
    bar: "bg-clothesline",
  },
};

export function KpiTile({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
  accent: KpiAccent;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white bg-white p-3 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:rounded-2xl sm:p-5">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${a.glow} to-transparent`}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-3 top-0 h-0.5 rounded-b-full sm:inset-x-5 sm:h-[3px] ${a.bar} opacity-80`}
      />
      <div className="relative flex items-center gap-2 sm:gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${a.chip}`}
        >
          <Icon
            className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
            aria-hidden="true"
          />
        </span>
        <p className="font-display text-[0.72rem] font-medium leading-tight text-ink-soft sm:text-[0.8125rem]">
          {label}
        </p>
      </div>
      <p className="relative mt-3 font-display text-2xl font-light leading-none tracking-[-0.03em] text-navy sm:mt-5 sm:text-[2rem]">
        {value}
      </p>
      {detail && (
        <p className="relative mt-2.5 hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
          <span
            className={`h-1.5 w-1.5 rounded-full ${a.dot}`}
            aria-hidden="true"
          />
          {detail}
        </p>
      )}
    </div>
  );
}
