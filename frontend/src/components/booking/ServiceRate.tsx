"use client";

import { useI18n } from "@/src/i18n/I18nProvider";
import { KILO_RATES, PIECE_RATES, isKiloService } from "@/src/lib/booking-services";
import { formatCurrency } from "@/src/lib/constants";
import type { ServiceType } from "@/src/types";

export function ServiceRate({ service, isExpress = false }: { service: ServiceType; isExpress?: boolean }) {
  const { t } = useI18n();
  const perKg = isKiloService(service);
  const rate = perKg ? KILO_RATES[service] : PIECE_RATES[service];
  if (rate == null) return null;
  return <p className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm" aria-live="polite">
    <span className="text-ink-muted">{t("booking.serviceRate")}</span>
    <span className="font-semibold tabular-nums text-navy">{formatCurrency(rate * (isExpress ? 2 : 1))} {t(perKg ? "booking.perKg" : "booking.perPiece")}</span>
  </p>;
}
