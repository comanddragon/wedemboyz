import type {
  ChatRoomStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  StaffInviteStatus,
  StaffRole,
  SubscriptionStatus,
} from "@/types";

export type StatusTone = "pending" | "progress" | "ready" | "cancelled";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "bg-status-pending-bg text-status-pending-text",
  progress: "bg-status-progress-bg text-status-progress-text",
  ready: "bg-status-ready-bg text-status-ready-text",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-text",
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}
    >
      {label.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

/** Mirrors services/order_flow.py's transition table, grouped by visual meaning. */
export function orderStatusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return "pending";
    case "IN_PROGRESS":
      return "progress";
    case "READY":
    case "OUT_FOR_DELIVERY":
    case "DELIVERED":
      return "ready";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

export function paymentStatusTone(status: PaymentStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "SUCCEEDED":
      return "ready";
    case "FAILED":
      return "cancelled";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "progress";
    default:
      return "pending";
  }
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

/** Purely visual grouping — OWNER/MANAGER carry more weight than ATTENDANT. */
export function staffRoleTone(role: StaffRole): StatusTone {
  switch (role) {
    case "OWNER":
      return "ready";
    case "MANAGER":
      return "progress";
    case "ATTENDANT":
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
