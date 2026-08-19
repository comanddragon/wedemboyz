import type { Subscription } from "@/types";

/** Picks the one subscription worth showing on the dashboard/settings: an
 * in-progress one (ACTIVE/PAUSED/PENDING) takes priority over old
 * CANCELLED/EXPIRED history. Used by both the dashboard's summary card and
 * the full subscription management page so they never disagree about which
 * plan is "current". */
export function currentSubscription(subscriptions: Subscription[] | undefined): Subscription | null {
  if (!subscriptions || subscriptions.length === 0) return null;
  const priority: Subscription["status"][] = ["ACTIVE", "PAUSED", "PENDING"];
  for (const status of priority) {
    const match = subscriptions.find((s) => s.status === status);
    if (match) return match;
  }
  return null;
}
