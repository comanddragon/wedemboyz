import { Boxes, Droplets, Flame, Layers, Package, PackageCheck, Shirt, Sparkles, WashingMachine, Wind } from "lucide-react";

import type { ServiceType } from "@/types";

/**
 * Fabric-care iconography standing in for generic dashboard icons — the
 * other Fold Line signature element alongside CreaseDivider.
 *
 * VESTE..COUETTE_3P are the flat-rate per-piece pressing/garment-care items
 * from the "NOUVEAUX PRIX" flyer; LAVAGE_ESSORAGE..REPASSAGE_PLASTIF are
 * the per-kg self-service lavomatique lines from the "GRILLE DE PRIX"
 * flyer. See services/pricing.py for the source-of-truth prices.
 */
const SERVICE_ICONS: Record<ServiceType, typeof Droplets> = {
  VESTE: Layers,
  TSHIRT: Shirt,
  CHEMISE: Shirt,
  PANTALON: Package,
  PULL: Layers,
  ROBE: Sparkles,
  ENSEMBLE: Boxes,
  DRAPS_COMPLET: PackageCheck,
  COUETTE_1P: Package,
  COUETTE_2P: Package,
  COUETTE_3P: Package,
  LAVAGE_ESSORAGE: WashingMachine,
  LAVAGE_SECHAGE: Wind,
  REPASSAGE_PLASTIF: Flame,
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  VESTE: "Veste (Jacket)",
  TSHIRT: "T-Shirt",
  CHEMISE: "Chemise (Shirt)",
  PANTALON: "Pantalon (Trousers)",
  PULL: "Pull (Sweater)",
  ROBE: "Robe (Dress)",
  ENSEMBLE: "Ensemble",
  DRAPS_COMPLET: "Draps Complet (Bed Sheet Set)",
  COUETTE_1P: "Couette 1 Place",
  COUETTE_2P: "Couette 2 Places",
  COUETTE_3P: "Couette 3 Places",
  LAVAGE_ESSORAGE: "Lavage et Essorage (Wash & Spin)",
  LAVAGE_SECHAGE: "Lavage, Essorage et Séchage (Wash & Dry)",
  REPASSAGE_PLASTIF: "Repassage et Plastification (Press & Wrap)",
};

export function ServiceIcon({ type, className = "h-4 w-4" }: { type: ServiceType; className?: string }) {
  const Icon = SERVICE_ICONS[type];
  return <Icon className={className} aria-hidden="true" />;
}

export function serviceLabel(type: ServiceType): string {
  return SERVICE_LABELS[type];
}
