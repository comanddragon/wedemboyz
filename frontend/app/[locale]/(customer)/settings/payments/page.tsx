"use client";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useI18n } from "@/src/i18n/I18nProvider";
import { collectionMethods } from "@/src/lib/payment-options";
import { Card, buttonStyles } from "@/src/components/ui";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";

export default function PaymentOptionsPage() {
  const { locale, t } = useI18n();
  return (
    <main className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href="/settings"
        className={buttonStyles({ variant: "ghost", className: "mb-5" })}
      >
        {t("settingsDetails.back")}
      </Link>
      <h1 className="mb-3 font-display text-3xl font-semibold text-navy">
        {t("paymentOptions.title")}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">{t("paymentOptions.body")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {collectionMethods(locale).map((method) => (
          <Card key={method.value} className="flex items-center gap-4">
            <PaymentMethodIcon method={method.value} />
            <h2 className="font-semibold text-navy">{method.label}</h2>
          </Card>
        ))}
      </div>
      <Link
        href="/book"
        className={buttonStyles({ variant: "gold", className: "mt-6" })}
      >
        {t("orders.book")}
      </Link>
    </main>
  );
}
