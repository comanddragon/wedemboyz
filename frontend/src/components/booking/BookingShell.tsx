"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { WizardSteps } from "./WizardSteps";
import { useI18n } from "@/src/i18n/I18nProvider";

/**
 * Booking steps live inside the dashboard's own scroll area. The page flows
 * naturally and the Back/Next row is sticky at the bottom of that area, so the
 * primary action is always reachable without a second scroll region. The
 * row shares the page surface; a hairline appears only while content is
 * actually tucked beneath it.
 */
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
  const endRef = useRef<HTMLDivElement>(null);
  const [overlapping, setOverlapping] = useState(false);

  useEffect(() => {
    const end = endRef.current;
    if (!end || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOverlapping(!entry.isIntersecting),
      { threshold: 1 },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1540px] flex-1 flex-col">
        <div className="shrink-0 px-5 pt-6 sm:px-8 lg:px-10 lg:pt-5">
          <h1 className="font-display mb-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] text-navy sm:text-[2rem] lg:text-[1.75rem]">
            {t("booking.title")}
          </h1>
          <p className="mb-3 text-sm text-ink-muted">{subtitle.startsWith("booking.") ? t(subtitle) : subtitle}</p>
          <WizardSteps current={step} />
        </div>

        <div className="min-h-0 flex-1 px-5 sm:px-8 lg:px-10 lg:pt-2">
          {children}
        </div>
      </div>

      {/* Sentinel: when it is off-screen, content sits under the sticky row. */}
      <div ref={endRef} aria-hidden="true" className="h-px shrink-0" />

      {/* Full-bleed row: the surface runs edge to edge; buttons stay aligned
          with the content column. */}
      <div
        data-overlapping={overlapping}
        className="sticky bottom-0 z-10 w-full shrink-0 bg-mist shadow-[inset_0_1px_0_transparent] data-[overlapping=true]:shadow-[inset_0_1px_0_var(--color-crease-soft)] motion-safe:transition-shadow motion-safe:duration-150"
      >
        <div className="mx-auto w-full max-w-[1540px] px-5 py-3.5 sm:px-8 lg:px-10">
          {actions}
        </div>
      </div>
    </div>
  );
}
