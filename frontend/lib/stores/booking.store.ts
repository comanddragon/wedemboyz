import { create } from "zustand";

import type { OrderItemInput, ServiceType } from "@/types";

interface DraftItem extends OrderItemInput {
  /** Client-only id for list rendering/removal — never sent to the API. */
  clientId: string;
}
export type OrderType = "drop-off" | "pickup" | "delivery";

interface BookingState {
  // Step 1 — services
  items: DraftItem[];

  // Step 2 — schedule
  orderType: OrderType;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledPickupDate: string | null;
  scheduledPickupSlot: string | null;
  notes: string;

  // Step 3 — review/promo/loyalty
  promoCode: string | null;
  usePoints: boolean;
  pointsToRedeem: number;

  setOrderType: (type: OrderType) => void;
  setAddresses: (input: { pickupAddress?: string; deliveryAddress?: string }) => void;
  setSchedule: (input: { date: string; slot: string }) => void;
  setNotes: (notes: string) => void;
  setPromoCode: (code: string | null) => void;
  setPointsRedemption: (input: { usePoints: boolean; pointsToRedeem?: number }) => void;
  addItem: (item: OrderItemInput) => void;
  updateItem: (clientId: string, patch: Partial<OrderItemInput>) => void;
  removeItem: (clientId: string) => void;
  reset: () => void;
}

const initialState = {
  items: [] as DraftItem[],
  orderType: "pickup" as OrderType,
  pickupAddress: "",
  deliveryAddress: "",
  scheduledPickupDate: null as string | null,
  scheduledPickupSlot: null as string | null,
  notes: "",
  promoCode: null as string | null,
  usePoints: false,
  pointsToRedeem: 0,
};

export const useBookingStore = create<BookingState>()((set) => ({
  ...initialState,

  setOrderType: (orderType) => set({ orderType }),

  setAddresses: ({ pickupAddress, deliveryAddress }) =>
    set((state) => ({
      pickupAddress: pickupAddress ?? state.pickupAddress,
      deliveryAddress: deliveryAddress ?? state.deliveryAddress,
    })),

  setSchedule: ({ date, slot }) => set({ scheduledPickupDate: date, scheduledPickupSlot: slot }),

  setNotes: (notes) => set({ notes }),

  setPromoCode: (code) => set({ promoCode: code }),

  // NOTE: redeeming points at checkout has no backend endpoint yet — POST
  // /loyalty/redeem/ exists but CreateOrderInput has no field to apply a
  // redemption as an order-time discount. This just captures wizard intent
  // until that's designed (see updated frontend-flows.md, Section 6).
  setPointsRedemption: ({ usePoints, pointsToRedeem }) =>
    set((state) => ({
      usePoints,
      pointsToRedeem: pointsToRedeem ?? state.pointsToRedeem,
    })),

  addItem: (item) =>
    set((state) => ({
      items: [...state.items, { ...item, clientId: crypto.randomUUID() }],
    })),

  updateItem: (clientId, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)),
    })),

  removeItem: (clientId) =>
    set((state) => ({
      items: state.items.filter((item) => item.clientId !== clientId),
    })),

  reset: () => set(initialState),
}));

/**
 * Rough client-side estimate for display only — mirrors services/pricing.py's
 * PRICE_PER_PIECE, PRICE_PER_KG, MINIMUM_CHARGE_PER_KG_ITEM, and
 * DELIVERY_FEE_FLAT. The server recomputes and is always authoritative;
 * this exists purely so the booking wizard isn't blank while typing.
 */
const ESTIMATED_PRICE_PER_PIECE: Partial<Record<ServiceType, number>> = {
  VESTE: 2000,
  TSHIRT: 500,
  CHEMISE: 600,
  PANTALON: 500,
  PULL: 1000,
  ROBE: 2500,
  ENSEMBLE: 2000,
  DRAPS_COMPLET: 1500,
  COUETTE_1P: 2000,
  COUETTE_2P: 3000,
  COUETTE_3P: 4000,
};
const ESTIMATED_PRICE_PER_KG: Partial<Record<ServiceType, number>> = {
  LAVAGE_ESSORAGE: 600,
  LAVAGE_SECHAGE: 1000,
  REPASSAGE_PLASTIF: 1000,
};
// Only applies to the per-kg lines above — per-piece items are already
// flat-priced and never hit this floor.
const ESTIMATED_MINIMUM_CHARGE_PER_KG_ITEM = 1000;
// Flat pickup + delivery fee, charged on every order — no free-delivery
// threshold exists on the backend.
const ESTIMATED_DELIVERY_FEE = 1500;

function estimateItemUnitPrice(item: DraftItem): number {
  const flat = ESTIMATED_PRICE_PER_PIECE[item.service_type];
  if (flat !== undefined) return flat;

  const perKg = ESTIMATED_PRICE_PER_KG[item.service_type];
  if (perKg !== undefined) {
    return Math.max(perKg * item.weight_kg, ESTIMATED_MINIMUM_CHARGE_PER_KG_ITEM);
  }

  return 0;
}

export function estimateBookingSubtotal(items: DraftItem[]): number {
  return items.reduce((sum, item) => sum + estimateItemUnitPrice(item) * (item.quantity ?? 1), 0);
}

export function estimateDeliveryFee(_subtotal: number): number {
  return ESTIMATED_DELIVERY_FEE;
}
