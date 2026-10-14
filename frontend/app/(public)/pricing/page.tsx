import type { Metadata } from "next";

import {
  PricingComparison,
  PricingContact,
  PricingFaq,
  PricingIncluded,
  PricingPayAsYouGo,
  PricingPlans,
} from "@/src/components/marketing";

export const metadata: Metadata = {
  title: "Pricing | WEDEMBOYZ Lavomatique",
  description:
    "Monthly laundry plans from 17 500 FCFA, or pay as you go by the kilo or by the piece.",
};

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
