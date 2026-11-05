"use client";

import { useI18n } from "@/src/i18n/I18nProvider";

export const LOYALTY_COLORS = {
  BASIC: "border-crease bg-steam text-ink-muted",
  BRONZE: "border-bronze/35 bg-bronze-50 text-bronze-600",
  SILVER: "border-silver bg-silver-50 text-silver-600",
  GOLD: "border-gold/40 bg-gold-50 text-gold-600",
};

export function LoyaltyBadge({ tier }: { tier: string }) {
  const { t } = useI18n();
  const level = tier.toUpperCase() as keyof typeof LOYALTY_COLORS;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${LOYALTY_COLORS[level] ?? LOYALTY_COLORS.BASIC}`}>
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
    {t(`loyalty.${level.toLowerCase()}`)}
  </span>;
}
