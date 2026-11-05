import type { ServiceType } from "@/src/types";

/** Shared service choices for customer bookings and owner-entered orders. */
export const PIECE_SERVICES: ServiceType[] = [
  "VESTE", "TSHIRT", "CHEMISE", "PANTALON", "PULL", "PETITE_ROBE",
  "ROBE", "ENSEMBLE", "DRAPS_COMPLET", "COUETTE_1P", "COUETTE_2P", "COUETTE_3P",
];
export const KILO_RATES = {
  LAVAGE_ESSORAGE: 600,
  LAVAGE_SECHAGE: 1000,
  REPASSAGE_PLASTIF: 2000,
} as const;
export const KILO_SERVICES = Object.keys(KILO_RATES) as ServiceType[];
export function isKiloService(type: ServiceType): type is keyof typeof KILO_RATES {
  return type in KILO_RATES;
}
