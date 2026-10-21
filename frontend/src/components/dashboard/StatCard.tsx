import type { LucideIcon } from "lucide-react";

import { Card } from "@/src/components/ui";

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = "navy",
  compact = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "navy" | "gold" | "coral" | "turquoise" | "green";
  compact?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={`flex border-0 bg-white shadow-stat ${compact ? "min-h-0 flex-row items-center gap-3 p-3.5" : "min-h-36 flex-col items-start justify-between gap-5 p-6"} ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl ${compact ? "h-9 w-9" : "h-11 w-11"} ${
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
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </span>
      <div className="w-full">
        <p className={`font-display font-bold leading-tight tracking-[-0.025em] text-ink ${compact ? "text-lg" : "text-[1.7rem]"}`}>
          {value}
        </p>
        <p className={`${compact ? "mt-0.5 text-xs" : "mt-1.5 text-sm"} font-semibold text-ink-soft`}>{label}</p>
      </div>
    </Card>
  );
}
