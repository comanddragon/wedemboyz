import type { Metadata } from "next";

import {
  PricingComparison,
  PricingContact,
  PricingFaq,
  PricingIncluded,
  PricingPayAsYouGo,
  PricingPlans,
} from "@/src/components/marketing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "fr"
        ? "Tarifs | Wedemboyz Lavomatique"
        : "Pricing | Wedemboyz Lavomatique",
    description:
      locale === "fr"
        ? "Forfaits mensuels de blanchisserie à partir de 17 500 FCFA, ou paiement à l'usage au kilo ou à la pièce."
        : "Monthly laundry plans from 17 500 FCFA, or pay as you go by the kilo or by the piece.",
  };
}

export default function PricingPage() {
  return (
    <>
      <PricingPlans />
      <PricingIncluded />
      <PricingComparison />
      <PricingPayAsYouGo />
      <PricingFaq />
      <PricingContact />
    </>
  );
}
