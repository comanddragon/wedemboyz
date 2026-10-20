import type {
  ChatRoomStatus,
  OrderStatus,
  OrderPaymentStatus,
  PaymentStatus,
  RefundStatus,
  StaffInviteStatus,
  StaffRole,
  SubscriptionStatus,
} from "@/src/types";

export type StatusTone = "pending" | "progress" | "ready" | "cancelled";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "bg-status-pending-bg text-status-pending-text",
  progress: "bg-status-progress-bg text-status-progress-text",
  ready: "bg-status-ready-bg text-status-ready-text",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-text",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  pending: "bg-status-pending-text",
  progress: "bg-gold",
  ready: "bg-clothesline",
  cancelled: "bg-coral",
};

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONE_CLASSES[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`}
        aria-hidden="true"
      />
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

export function paymentStatusTone(
  status: PaymentStatus | OrderPaymentStatus,
): StatusTone {
  switch (status) {
    case "PENDING":
      return "pending";
    case "SUCCEEDED":
    case "PAID":
    case "NO_CHARGE":
      return "ready";
    case "FAILED":
    case "UNPAID":
    case "VOID":
      return "cancelled";
    case "PARTIALLY_PAID":
    case "OVERPAID":
    case "WAIVED":
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
