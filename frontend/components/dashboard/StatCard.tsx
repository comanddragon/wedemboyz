import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui";

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
    accent?: "navy" | "gold";
    className?: string;
}) {
    return (
        <Card className={`flex items-center gap-3 ${className}`}>
      <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              accent === "gold" ? "bg-gold-50 text-gold" : "bg-steam text-navy"
          }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
            <div>
                <p className="text-lg font-semibold leading-tight text-navy">{value}</p>
                <p className="text-xs text-ink-muted">{label}</p>
            </div>
        </Card>
    );
}