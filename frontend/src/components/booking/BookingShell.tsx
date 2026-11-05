"use client";

import type { ReactNode } from "react";

import { WizardSteps } from "./WizardSteps";
import { useI18n } from "@/src/i18n/I18nProvider";

/** The content scrolls independently while the action row stays in the shell. */
export function BookingShell({
  step,
  subtitle,
  actions,
  children,
}: {
  step: number;
  subtitle: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="booking-root flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="booking-content min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1540px] shrink-0 px-5 pt-6 sm:px-8 lg:px-10 lg:pt-5">
          <h1 className="font-display mb-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] text-navy sm:text-[2rem] lg:text-[1.75rem]">
            {t("booking.title")}
          </h1>
          <p className="mb-3 text-sm text-ink-muted">{subtitle.startsWith("booking.") ? t(subtitle) : subtitle}</p>
          <WizardSteps current={step} />
        </div>

        <div className="mx-auto w-full max-w-[1540px] px-5 sm:px-8 lg:px-10 lg:pt-2">
          {children}
        </div>
      </div>

      <div className="booking-bar z-10 w-full shrink-0 border-t border-crease-soft bg-mist">
        <div className="mx-auto w-full max-w-[1540px] px-5 py-3.5 sm:px-8 lg:px-10">
          {actions}
        </div>
      </div>
    </div>
  );
}
