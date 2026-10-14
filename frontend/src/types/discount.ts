import type { LoyaltyTier } from "./user";

export type DiscountType = "PERCENTAGE" | "FIXED";

/** Mirrors apps.discounts.api.serializers.promo.PromoCodeSerializer */
export interface PromoCode {
  id: number;
  code: string;
  description: string;
  discount_type: DiscountType;
  value: string;
  min_order_amount: string;
  max_uses: number | null;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  times_used: number;
  is_valid_now: boolean;
  created_at: string;
}

/** Mirrors apps.discounts.api.serializers.promo.PromoValidateSerializer response
 * (used to preview a discount at checkout before the order is created). */
export interface PromoValidationResult {
  code: string;
  discount_amount: number;
  total_after_discount: number;
}

export interface ValidatePromoInput {
  code: string;
  order_total: number;
}

/** Payload for POST /discounts/promo-codes/ and PATCH .../{id}/ */
export interface PromoCodeInput {
  code: string;
  description?: string;
  discount_type: DiscountType;
  value: number;
  min_order_amount?: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  valid_from: string; // YYYY-MM-DD
  valid_until: string; // YYYY-MM-DD
  is_active?: boolean;
}

/** Query params for GET /discounts/promo-codes/ — pagination only; the view
 * doesn't filter server-side (see PromoCodeListCreateView.get_queryset). */
export interface ListPromoCodesParams {
  page?: number;
}

export type DiscountCampaignSegment = "ALL" | "NEW_CUSTOMERS" | "LAPSED" | "LOYALTY_GOLD";

/** Mirrors apps.discounts.api.serializers.promo.DiscountCampaignSerializer */
export interface DiscountCampaign {
  id: number;
  name: string;
  description: string;
  discount_type: DiscountType;
  value: string;
  target_segment: DiscountCampaignSegment;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

/** Payload for POST /discounts/campaigns/ and PATCH .../{id}/ */
export interface DiscountCampaignInput {
  name: string;
  description?: string;
  discount_type: DiscountType;
  value: number;
  target_segment: DiscountCampaignSegment;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_active?: boolean;
}

/** Query params for GET /discounts/campaigns/ — the view only paginates;
 * it doesn't filter by segment/active/search server-side, so those are
 * applied client-side over the current page instead (see the admin list page). */
export interface ListDiscountCampaignsParams {
  page?: number;
}

export type LoyaltyTransactionType = "EARN" | "REDEEM" | "EXPIRE" | "ADJUST";

/** Mirrors apps.discounts.models.LoyaltyTransaction + its serializer */
export interface LoyaltyTransaction {
  id: number;
  points: number;
  transaction_type: LoyaltyTransactionType;
  order: number | null;
  note: string;
  created_at: string;
}

/** Mirrors services.loyalty.stamp_card_progress — nested in LoyaltyAccount.
 * When no stamp card is configured yet (`configured: false`), the numeric
 * fields other than the two counts are null. */
export interface StampCardProgress {
  configured: boolean;
  points_per_stamp: number | null;
  stamps_required: number | null;
  stamps_on_current_card: number;
  points_to_next_stamp: number | null;
  free_washes_available: number;
}

/** GET /loyalty/ — mirrors apps.discounts.api.views.loyalty.LoyaltyAccountView */
export interface LoyaltyAccount {
  points_balance: number;
  lifetime_points_earned: number;
  tier: LoyaltyTier;
  stamp_card: StampCardProgress;
}

export interface RedeemPointsInput {
  points: number;
  note?: string;
}
