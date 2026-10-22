import { ArrowLeft, Droplets, Shirt, Sparkles, Wind } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

import { Card, EyebrowLabel } from "@/src/components/ui";
import { useI18n } from "@/src/i18n/I18nProvider";

const PLANNED_PREFERENCES = [
  {
    icon: Droplets,
    title: "Water temperature",
    description: "Cold, warm, or hot as your default wash setting.",
  },
  {
    icon: Wind,
    title: "Spin speed",
    description: "How firmly your clothes get spun dry before folding.",
  },
  {
    icon: Sparkles,
    title: "Detergent",
    description: "Standard, hypoallergenic, or scent-free options.",
  },
  {
    icon: Shirt,
    title: "Folding style",
    description: "By outfit, by garment type, or hanger-ready.",
  },
];

export default function LaundryPreferencesPage() {
  const { t } = useI18n();
  const preferenceKeys = [
    ["settingsDetails.water", "settingsDetails.waterBody"],
    ["settingsDetails.spin", "settingsDetails.spinBody"],
    ["settingsDetails.detergent", "settingsDetails.detergentBody"],
    ["settingsDetails.folding", "settingsDetails.foldingBody"],
  ];
  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("settingsDetails.back")}
      </Link>

      <EyebrowLabel words={[t("settings.eyebrow")]} />
      <h1 className="font-display mt-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        {t("settings.laundry")}
      </h1>

      <Card className="mt-6">
        <p className="text-sm text-ink">
          {t("settingsDetails.preferencesIntro")}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {t("settingsDetails.preferencesHelp")}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-crease pt-6 sm:grid-cols-2">
          {PLANNED_PREFERENCES.map(({ icon: Icon, title }, index) => (
            <div key={title} className="flex gap-3 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steam text-ink-muted">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{t(preferenceKeys[index][0])}</p>
                <p className="text-xs text-ink-muted">{t(preferenceKeys[index][1])}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-gold">
          {t("settingsDetails.comingSoon")}
        </p>
      </Card>
    </main>
  );
}
"use client";

