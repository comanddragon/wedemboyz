import { Award, Crown } from "lucide-react";

import type { LoyaltyTier } from "@/types";

import { Card } from "@/components/ui";

const TIER_STYLES: Record<LoyaltyTier, { border: string; icon: string; bg: string; label: string }> = {
  BRONZE: { border: "border-l-[#A9673A]", icon: "text-[#A9673A]", bg: "bg-[#A9673A]/10", label: "Bronze" },
  SILVER: { border: "border-l-[#8B96A5]", icon: "text-[#8B96A5]", bg: "bg-[#8B96A5]/10", label: "Silver" },
  GOLD: { border: "border-l-gold", icon: "text-gold", bg: "bg-gold-50", label: "Gold" },
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
    <Card className={`flex items-center justify-between border-l-4 ${style.border}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${style.bg} ${style.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">{style.label} member</p>
          <p className="text-xs text-ink-muted">{pointsBalance} points balance</p>
        </div>
      </div>
    </Card>
  );
}
