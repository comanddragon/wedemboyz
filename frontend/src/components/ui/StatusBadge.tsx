"use client";

import { useI18n } from "@/src/i18n/I18nProvider";

import type {
  ChatRoomStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  StaffInviteStatus,
  StaffRole,
  SubscriptionStatus,
} from "@/src/types";

export type StatusTone =
  | "pending"
  | "confirmed"
  | "progress"
  | "ready"
  | "delivery"
  | "complete"
  | "cancelled";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "bg-status-pending-bg text-status-pending-text",
  confirmed: "bg-status-confirmed-bg text-status-confirmed-text",
  progress: "bg-status-progress-bg text-status-progress-text",
  ready: "bg-status-ready-alt-bg text-status-ready-alt-text",
  delivery: "bg-status-delivery-bg text-status-delivery-text",
  complete: "bg-status-complete-bg text-status-complete-text",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-text",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  pending: "bg-status-pending-text",
  confirmed: "bg-status-confirmed-text",
  progress: "bg-gold",
  ready: "bg-status-ready-alt-text",
  delivery: "bg-status-delivery-text",
  complete: "bg-status-complete-text",
  cancelled: "bg-coral",
};

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  const { t } = useI18n();
  const statusKeys: Record<string, string> = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    IN_PROGRESS: "inProgress",
    READY: "ready",
    OUT_FOR_DELIVERY: "outForDelivery",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    SUCCEEDED: "paid",
    PAID: "paid",
    NO_CHARGE: "paid",
    FAILED: "unpaid",
    UNPAID: "unpaid",
    VOID: "unpaid",
    PARTIALLY_PAID: "unpaid",
    OVERPAID: "paid",
    WAIVED: "unpaid",
    REFUNDED: "refunded",
    PARTIALLY_REFUNDED: "partiallyRefunded",
    APPROVED: "approved",
    PROCESSED: "processed",
    REJECTED: "rejected",
    OPEN: "open",
    CLOSED: "closed",
    ACCEPTED: "accepted",
    REVOKED: "revoked",
    EXPIRED: "expired",
    ACTIVE: "active",
    PAUSED: "paused",
    MANAGER: "manager",
    ATTENDANT: "attendant",
    CASHIER: "cashier",
    DRIVER: "driver",
  };
  const translated = statusKeys[label.toUpperCase()]
    ? t(`common.statuses.${statusKeys[label.toUpperCase()]}`)
    : label.toLowerCase().replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONE_CLASSES[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`}
        aria-hidden="true"
      />
      {translated}
    </span>
  );
}

/** Mirrors services/order_flow.py's transition table, grouped by visual meaning. */
export function orderStatusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "CONFIRMED":
      return "confirmed";
    case "IN_PROGRESS":
      return "progress";
    case "READY":
      return "ready";
    case "OUT_FOR_DELIVERY":
      return "delivery";
    case "DELIVERED":
      return "complete";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

export function paymentStatusTone(status: PaymentStatus | OrderPaymentStatus): StatusTone {
  return status === "PAID" || status === "SUCCEEDED" ? "ready" : "pending";
}

export function refundStatusTone(status: RefundStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "APPROVED":
      return "progress";
    case "PROCESSED":
      return "ready";
    case "REJECTED":
      return "cancelled";
    default:
      return "pending";
  }
}

export function chatRoomStatusTone(status: ChatRoomStatus): StatusTone {
  return status === "OPEN" ? "ready" : "pending";
}

/** Purely visual grouping for assignable staff roles. */
export function staffRoleTone(role: StaffRole): StatusTone {
  switch (role) {
    case "MANAGER":
      return "progress";
    case "ATTENDANT":
      return "pending";
    case "CASHIER":
      return "ready";
    case "DRIVER":
      return "pending";
    default:
      return "pending";
  }
}

export function staffInviteStatusTone(status: StaffInviteStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "ACCEPTED":
      return "ready";
    case "REVOKED":
    case "EXPIRED":
      return "cancelled";
    default:
      return "pending";
  }
}

/** Mirrors apps.payments.models.Subscription.Status */
export function subscriptionStatusTone(status: SubscriptionStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "ACTIVE":
      return "ready";
    case "PAUSED":
      return "progress";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    default:
      return "pending";
  }
}
