import type { Metadata, Viewport } from "next";

import { Providers } from "@/src/components/providers/Providers";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { isLocale, locales } from "@/src/i18n/config";
import { notFound } from "next/navigation";

import "../globals.css";

export const metadata: Metadata = {
  title: "Wedemboyz Lavomatique",
  description: "Collecte et livraison de linge à Yaoundé.",
  alternates: { languages: { fr: "/fr", en: "/en" } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className="bg-paper font-sans text-ink antialiased">
        <Providers><I18nProvider locale={locale}>{children}</I18nProvider></Providers>
      </body>
    </html>
  );
}
