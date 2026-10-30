"use client";

import Image from "next/image";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import type { ReactNode } from "react";

import { FoldStackIllustration } from "@/src/components/marketing";
import { CreaseDivider, EyebrowLabel } from "@/src/components/ui";
import { useI18n } from "@/src/i18n/I18nProvider";

interface AuthShellProps {
  eyebrow: string[];
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared shell for /login and /register. Splits into a navy brand panel
 * (reusing the homepage's FoldStackIllustration so the "Fold Line" motif
 * shows up here too, not just on marketing pages) and a paper form panel.
 * On mobile the brand panel collapses to a compact header strip so the
 * form is reachable without scrolling past a full illustration first.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col justify-between overflow-hidden bg-navy px-6 py-6 text-white lg:sticky lg:top-0 lg:h-screen lg:px-12 lg:py-10">
        <div className="absolute inset-0">
          <Image
            src="/images/auth-dryclean-conveyor.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover opacity-70"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-navy/95 via-navy/80 to-navy/95"
        />
        <div className="relative z-10 flex flex-1 flex-col justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-md text-sm font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <span aria-hidden="true">&larr;</span> {t("auth.back")}
          </Link>

          <div className="hidden flex-1 flex-col items-center justify-center gap-8 lg:flex">
            <div className="rounded-[2rem] bg-white/[0.06] p-8 ring-1 ring-white/10">
              <FoldStackIllustration />
            </div>
            <p className="max-w-xs text-center font-display text-xl font-medium leading-snug text-white">
              {t("auth.promise")}
            </p>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <Image src="/icon-mark.png" alt="" width={30} height={29} />
            </span>
            <p className="font-display text-base font-medium leading-snug text-white">
              {t("auth.promise")}
            </p>
          </div>

          <p className="hidden text-xs text-white/50 lg:block">
            {t("auth.location")}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <EyebrowLabel words={eyebrow.map((word) => word.startsWith("auth.") ? t(word) : word)} />
          <h1 className="mt-2 text-balance font-display text-3xl font-bold text-navy">
            {title.startsWith("auth.") ? t(title) : title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle.startsWith("auth.") ? t(subtitle) : subtitle}</p>
          <CreaseDivider />
          {children}
        </div>
      </div>
    </div>
  );
}
