"use client";

import { useI18n } from "@/src/i18n/I18nProvider";

import { Award, Crown } from "lucide-react";

import type { BadgeTier } from "@/src/types";

import { Card, LoyaltyBadge } from "@/src/components/ui";

const TIER_STYLES: Record<
  BadgeTier,
  { icon: string; bg: string; surface: string; label: string }
> = {
  BASIC: { icon: "text-ink-muted", bg: "bg-steam", surface: "from-steam via-white to-white", label: "Basic" },
  BRONZE: {
    icon: "text-bronze-600",
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
  tier: BadgeTier;
  pointsBalance: number;
}) {
  const { locale, t } = useI18n();
  const style = TIER_STYLES[tier];
  // Crown is reserved for Gold only — a deliberate echo of the logo's crown,
  // not a generic tier icon reused across every level.
  const Icon = tier === "GOLD" ? Crown : Award;

  return (
    <Card
      className={`flex min-h-24 items-center justify-between border-0 bg-gradient-to-br ${style.surface} p-4 shadow-card sm:min-h-32 sm:p-6`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${style.bg} ${style.icon}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <LoyaltyBadge tier={tier} />
          <p className="mt-1 text-xs font-medium text-ink-muted">
            {pointsBalance.toLocaleString(locale)} {t("customerDashboard.points")}
          </p>
        </div>
      </div>
    </Card>
  );
}
