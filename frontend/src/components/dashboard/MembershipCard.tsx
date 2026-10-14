import { Award, Crown } from "lucide-react";

import type { LoyaltyTier } from "@/src/types";

import { Card } from "@/src/components/ui";

const TIER_STYLES: Record<
  LoyaltyTier,
  { icon: string; bg: string; surface: string; label: string }
> = {
  BRONZE: {
    icon: "text-bronze",
    bg: "bg-bronze/15",
    surface: "from-bronze-50 via-white to-white",
    label: "Bronze",
  },
  SILVER: {
    icon: "text-silver-600",
    bg: "bg-silver/25",
    surface: "from-silver-50 via-white to-white",
    label: "Silver",
  },
  GOLD: {
    icon: "text-gold-600",
    bg: "bg-gold/20",
    surface: "from-gold-50 via-white to-white",
    label: "Gold",
  },
};

export function MembershipCard({
  tier,
  pointsBalance,
}: {
  tier: LoyaltyTier;
  pointsBalance: number;
}) {
  const style = TIER_STYLES[tier];
  // Crown is reserved for Gold only — a deliberate echo of the logo's crown,
  // not a generic tier icon reused across every level.
  const Icon = tier === "GOLD" ? Crown : Award;

  return (
    <Card
      className={`flex min-h-32 items-center justify-between border-0 bg-gradient-to-br ${style.surface} p-6 shadow-card`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.bg} ${style.icon}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            {style.label} member
          </p>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            {pointsBalance} points balance
          </p>
        </div>
      </div>
    </Card>
  );
}
