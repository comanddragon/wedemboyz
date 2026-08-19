export const APP_NAME = "WEDEMBOYZ Lavomatique";

/** Real contact/location info, taken from the storefront signboard. Single
 * source of truth — every component that shows the phone number, WhatsApp
 * link, or map should read from here rather than hardcoding it, so this
 * only ever needs to change in one place. */
export const BUSINESS = {
  phoneDisplay: "+237 695 344 912",
  /** E.164, no spaces — for tel:/wa.me links. */
  phoneE164: "+237695344912",
  telHref: "tel:+237695344912",
  whatsappHref: "https://wa.me/237695344912",
  address: "Entrée Simbock, Pharmacie A3, Yaoundé",
  /** Short link from the signboard — kept as the canonical "get directions" href. */
  mapsUrl: "https://maps.app.goo.gl/GDNwfkoTVtm7kWdC7",
  /** Pinned coordinates the short link resolves to, for the embedded map. */
  mapEmbedSrc: "https://www.google.com/maps?q=3.8273034,11.4701155&z=16&output=embed",
  hours: "Mon–Sat, 8am–7pm",
} as const;

export const CURRENCY = "XAF";

/** Mirrors services/pricing.py — for display/formatting only, never for
 * computing real charges (the server is always authoritative on price). */
export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Mirrors apps.chat.constants — kept in sync with the backend so invalid
 * files get caught client-side before an upload round-trip. */
export const CHAT_ATTACHMENT_MAX_COUNT = 5;
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const CHAT_ATTACHMENT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  book: "/book",
  bookSchedule: "/book/schedule",
  bookReview: "/book/review",
  bookConfirm: "/book/confirm",
  orders: "/orders",
  orderDetail: (id: number | string) => `/orders/${id}`,
  chat: "/chat",
  chatRoom: (id: number | string) => `/chat/${id}`,
  loyalty: "/loyalty",
  notifications: "/notifications",
  settings: "/settings",
  settingsPreferences: "/settings/preferences",
  settingsPayments: "/settings/payments",
  admin: "/admin",
} as const;
