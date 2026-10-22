"use client";

import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useRouter } from "next/navigation";

import { PromoCodeForm } from "@/src/components/discounts/PromoCodeForm";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function AdminNewPromoCodePage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/discounts/codes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminDiscounts.backToCodes")}
      </Link>
      <h1 className="font-display mb-6 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        {t("adminDiscounts.newCode")}
      </h1>
      <PromoCodeForm onDone={() => router.push("/admin/discounts/codes")} />
    </main>
  );
}
