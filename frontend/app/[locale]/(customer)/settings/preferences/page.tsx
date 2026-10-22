"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Droplets, Shirt, Sparkles, Wind } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useEffect, useState } from "react";

import { Button, Card } from "@/src/components/ui";
import { useI18n } from "@/src/i18n/I18nProvider";
import { profileApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { cn } from "@/src/lib/utils";
import type { UserPreferences } from "@/src/types";

type PreferenceKey = Exclude<keyof UserPreferences, "preferred_language">;
const GROUPS: Array<{ key: PreferenceKey; icon: typeof Droplets; labelKey: string; helpKey: string; options: Array<{ value: string; en: string; fr: string }> }> = [
  { key: "water_temperature", icon: Droplets, labelKey: "settingsDetails.water", helpKey: "settingsDetails.waterBody", options: [{ value: "COLD", en: "Cold", fr: "Froide" }, { value: "WARM", en: "Warm", fr: "Tiède" }, { value: "HOT", en: "Hot", fr: "Chaude" }] },
  { key: "spin_speed", icon: Wind, labelKey: "settingsDetails.spin", helpKey: "settingsDetails.spinBody", options: [{ value: "GENTLE", en: "Gentle", fr: "Doux" }, { value: "NORMAL", en: "Normal", fr: "Normal" }, { value: "HIGH", en: "High", fr: "Intense" }] },
  { key: "detergent_preference", icon: Sparkles, labelKey: "settingsDetails.detergent", helpKey: "settingsDetails.detergentBody", options: [{ value: "STANDARD", en: "Standard", fr: "Standard" }, { value: "HYPOALLERGENIC", en: "Hypoallergenic", fr: "Hypoallergénique" }, { value: "SCENT_FREE", en: "Scent-free", fr: "Sans parfum" }] },
  { key: "folding_style", icon: Shirt, labelKey: "settingsDetails.folding", helpKey: "settingsDetails.foldingBody", options: [{ value: "BY_GARMENT", en: "By garment", fr: "Par vêtement" }, { value: "BY_OUTFIT", en: "By outfit", fr: "Par tenue" }, { value: "HANGER_READY", en: "Hanger-ready", fr: "Prêt à suspendre" }] },
];

export default function LaundryPreferencesPage() {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: queryKeys.profile.preferences, queryFn: profileApi.getPreferences });
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  useEffect(() => { if (data) setDraft(data); }, [data]);
  const mutation = useMutation({
    mutationFn: (input: Partial<UserPreferences>) => profileApi.updatePreferences(input),
    onSuccess: (saved) => { setDraft(saved); queryClient.setQueryData(queryKeys.profile.preferences, saved); },
  });

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link href="/settings" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("settingsDetails.back")}</Link>
      <div className="mb-7 max-w-2xl"><h1 className="font-display text-[1.75rem] font-light tracking-[-0.03em] text-navy sm:text-[2rem]">{t("settings.laundry")}</h1><p className="mt-2 text-sm leading-6 text-ink-muted">{t("settingsDetails.preferencesLiveHelp")}</p></div>
      {isLoading ? <Card className="h-64 animate-pulse bg-steam" /> : error || !draft ? <Card><p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p></Card> : (
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(draft); }}>
          <div className="grid gap-4 md:grid-cols-2">
            {GROUPS.map(({ key, icon: Icon, labelKey, helpKey, options }) => (
              <Card key={key} className="p-5">
                <div className="mb-4 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy"><Icon className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="font-display text-sm font-semibold text-navy">{t(labelKey)}</h2><p className="mt-1 text-xs leading-5 text-ink-muted">{t(helpKey)}</p></div></div>
                <div className="grid grid-cols-3 gap-2">{options.map((option) => { const selected = draft[key] === option.value; return <button key={option.value} type="button" onClick={() => setDraft({ ...draft, [key]: option.value })} className={cn("relative min-h-11 rounded-xl border px-2 py-2 text-xs font-medium transition-colors", selected ? "border-navy bg-navy text-white" : "border-crease bg-white text-ink hover:border-navy/40 hover:bg-steam")} aria-pressed={selected}>{selected && <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-gold" aria-hidden="true" />}{locale === "fr" ? option.fr : option.en}</button>; })}</div>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("settings.saving") : t("settingsDetails.savePreferences")}</Button>{mutation.isSuccess && <p className="text-sm text-status-ready-text">{t("settingsDetails.preferencesSaved")}</p>}{mutation.error && <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(mutation.error)}</p>}</div>
        </form>
      )}
    </main>
  );
}
