import type { LucideIcon } from "lucide-react";

import { Card } from "@/src/components/ui";

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "navy",
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "navy" | "gold" | "coral" | "turquoise" | "green";
  className?: string;
}) {
  return (
    <Card
      className={`flex min-h-36 flex-col items-start justify-between gap-5 border-0 bg-white p-6 shadow-stat ${className}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          accent === "gold"
            ? "bg-gold-50 text-gold-600"
            : accent === "coral"
              ? "bg-coral-50 text-coral-600"
              : accent === "turquoise"
                ? "bg-turquoise-50 text-turquoise-600"
                : accent === "green"
                  ? "bg-clothesline-50 text-clothesline-600"
                  : "bg-navy-50 text-navy"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="w-full">
        <p className="font-display text-[1.7rem] font-bold leading-tight tracking-[-0.025em] text-ink">
          {value}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink-soft">{label}</p>
      </div>
    </Card>
  );
}
