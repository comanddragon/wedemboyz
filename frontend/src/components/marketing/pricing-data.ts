import type { ServiceType } from "@/src/types";

export type PlanId = "ESSENTIEL" | "CONFORT" | "FAMILLE";

export type Plan = {
  id: PlanId;
  name: string;
  kg: number;
  monthly: number;
  /** Price of the same kilos at the standard rate (from the flyer). */
  standard: number;
  tagline: string;
  popular?: boolean;
};

// Mirrors services.pricing.PLAN_PRICE / PLAN_KG_ALLOWANCE on the backend.
// Standard prices come from the "Abonnements mensuels" flyer. Keep ids,
// prices and kilos in sync with the backend if they change. The live plan
// picker (billing cycle, gateway) is at /subscription.
export const PLANS: Plan[] = [
  {
    id: "ESSENTIEL",
    name: "Essentiel",
    kg: 10,
    monthly: 17500,
    standard: 20000,
    tagline: "One or two people keeping up with the basics.",
  },
  {
    id: "CONFORT",
    name: "Confort",
    kg: 20,
    monthly: 34000,
    standard: 40000,
    tagline: "A full household's weekly rotation, handled.",
    popular: true,
  },
  {
    id: "FAMILLE",
    name: "Famille",
    kg: 30,
    monthly: 49000,
    standard: 60000,
    tagline: "Big households, guests and heavier loads.",
  },
];

export const INCLUDED_SERVICES = [
  "Washing",
  "Spinning",
  "Drying",
  "Ironing",
  "Plastic wrap",
] as const;

// Mirrors services.pricing.PRICE_PER_KG. Billed by weight with a 1,000 XAF
// minimum per line (services.pricing.MINIMUM_CHARGE_PER_KG_ITEM).
export const KG_SERVICES: {
  type: ServiceType;
  perKg: number;
  description: string;
}[] = [
  {
    type: "LAVAGE_ESSORAGE",
    perKg: 600,
    description: "Self-service wash and spin cycle.",
  },
  {
    type: "LAVAGE_SECHAGE",
    perKg: 1000,
    description: "Wash, spin and tumble dry.",
  },
  {
    type: "REPASSAGE_PLASTIF",
    perKg: 1000,
    description: "Storefront pressing with protective wrap.",
  },
];

// Mirrors services.pricing.PRICE_PER_PIECE. Flat price per piece, weight
// does not change it.
export const PIECE_SERVICES: { type: ServiceType; price: number }[] = [
  { type: "TSHIRT", price: 500 },
  { type: "CHEMISE", price: 600 },
  { type: "PANTALON", price: 500 },
  { type: "PULL", price: 1000 },
  { type: "VESTE", price: 2000 },
  { type: "ENSEMBLE", price: 2000 },
  { type: "ROBE", price: 2500 },
  { type: "DRAPS_COMPLET", price: 1500 },
  { type: "COUETTE_1P", price: 2000 },
  { type: "COUETTE_2P", price: 3000 },
  { type: "COUETTE_3P", price: 4000 },
];

export const MINIMUM_PER_KG_LINE = 1000;
export const PICKUP_DELIVERY_FEE = 1500;

/** 17500 -> "17 500". Explicit locale so server and client render the same. */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

export const pricePerKg = (plan: Plan) => Math.round(plan.monthly / plan.kg);
export const monthlySaving = (plan: Plan) => plan.standard - plan.monthly;

/*
  Placeholder hero video until the shop's own footage is filmed. Clip is from
  Mixkit (free licence, no attribution). To swap in yours, drop the file in
  public/videos/ and change src to "/videos/pricing-hero.mp4" (and poster to a
  frame exported as "/videos/pricing-hero.jpg"). Self-host rather than
  hotlinking for production.
*/
export const HERO_VIDEO = {
  src: "https://assets.mixkit.co/videos/22179/22179-360.mp4",
  poster: "https://assets.mixkit.co/videos/22179/22179-thumb-360-0.jpg",
  label: "Washing machines running in a laundromat",
};
