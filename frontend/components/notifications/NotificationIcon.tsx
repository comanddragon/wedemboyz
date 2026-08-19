import { Bell, CreditCard, MessageCircle, Package, Sparkles } from "lucide-react";

import type { NotificationType } from "@/types";

/**
 * Icon + tone per notification type, following the same mapping pattern as
 * ServiceIcon and StatusBadge elsewhere in the UI kit.
 */
const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  ORDER_UPDATE: Package,
  PAYMENT: CreditCard,
  PROMO: Sparkles,
  CHAT: MessageCircle,
  SYSTEM: Bell,
};

const NOTIFICATION_TONE_CLASSES: Record<NotificationType, string> = {
  ORDER_UPDATE: "bg-status-progress-bg text-status-progress-text",
  PAYMENT: "bg-status-ready-bg text-status-ready-text",
  PROMO: "bg-gold-50 text-gold",
  CHAT: "bg-navy-50 text-navy",
  SYSTEM: "bg-steam text-ink-muted",
};

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = NOTIFICATION_ICONS[type];
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${NOTIFICATION_TONE_CLASSES[type]}`}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
  );
}
