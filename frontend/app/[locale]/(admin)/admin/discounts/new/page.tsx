"use client";

import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useRouter } from "next/navigation";

import { DiscountCampaignForm } from "@/src/components/discounts/DiscountCampaignForm";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function AdminNewDiscountPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/discounts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminDiscounts.backToDiscounts")}
      </Link>
      <h1 className="font-display mb-6 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        {t("adminDiscounts.newCampaign")}
      </h1>
      <DiscountCampaignForm onDone={() => router.push("/admin/discounts")} />
    </main>
  );
}
