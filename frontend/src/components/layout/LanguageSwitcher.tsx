"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type Locale, localizeHref, stripLocale } from "@/src/i18n/config";
import { useI18n } from "@/src/i18n/I18nProvider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const changeLocale = (next: Locale) => {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    const query = searchParams.toString();
    router.replace(`${localizeHref(stripLocale(pathname), next)}${query ? `?${query}` : ""}`);
  };

  return (
    <div className="inline-flex rounded-full border border-crease bg-white/90 p-0.5" role="group" aria-label={t("common.language")}>
      {(["fr", "en"] as const).map((item) => (
        <button key={item} type="button" onClick={() => changeLocale(item)} aria-pressed={locale === item} title={item === "fr" ? t("common.french") : t("common.english")} className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${locale === item ? "bg-navy text-white" : "text-ink-muted hover:text-navy"}`}>
          {compact ? item : item === "fr" ? "FR" : "EN"}
        </button>
      ))}
    </div>
  );
}
