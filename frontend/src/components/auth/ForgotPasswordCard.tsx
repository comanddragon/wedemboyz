"use client";

import { Clock, Phone } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

import { BUSINESS } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

/**
 * There's no /auth/password/reset/ endpoint yet (see the backend note this
 * replaces). Rather than ship a form that pretends to send a reset code,
 * this routes people to a real person — same "real people, real reliable"
 * promise the rest of the site makes. Swap for the real flow once the
 * endpoint exists.
 *
 * The number now points at BUSINESS.phoneDisplay/telHref (lib/constants) —
 * the real storefront number — as a live tel: link.
 */
export function ForgotPasswordCard() {
  const { t } = useI18n();
  return (
    <div>
      <div className="rounded-card border border-crease bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold">
            <Phone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{t("auth.call")}</p>
            <a
              href={BUSINESS.telHref}
              className="mt-0.5 block text-base font-semibold text-navy hover:underline"
            >
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{t("auth.available")}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{BUSINESS.hours}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        {t("auth.resetHelp")}
      </p>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.remembered")} {" "}
        <Link
          href="/login"
          className="font-medium text-navy underline-offset-2 hover:underline"
        >
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
