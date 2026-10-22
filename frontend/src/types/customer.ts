import type { CreditTransaction } from "./finance";
import type { OrderListItem } from "./order";
import type { LoyaltyAccountSummary, LoyaltyTier } from "./user";

/** Mirrors apps.users.api.serializers.customer.CustomerListSerializer
 * (GET /api/v1/users/customers/) */
export interface CustomerListItem {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  city: string;
  is_active: boolean;
  orders_count: number;
  /** Excludes cancelled orders. */
  lifetime_spend: string;
  loyalty_tier: LoyaltyTier | null;
  credit_balance: string;
  last_order_at: string | null;
  source: "ONLINE" | "WALK_IN" | "REFERRAL" | "OTHER";
  is_blocked: boolean;
  tags: string[];
  avatar: string | null;
  use_profile_photo: boolean;
  is_walk_in: boolean;
  created_at: string;
}

/** Mirrors apps.users.api.serializers.customer.CustomerDetailSerializer
 * (GET /api/v1/users/customers/{id}/) — the full "fiche client". */
export interface CustomerDetail extends CustomerListItem {
  address_line: string;
  loyalty: LoyaltyAccountSummary;
  /** Last 10 orders. */
  recent_orders: OrderListItem[];
  /** Last 10 credit ledger entries. */
  recent_credit_transactions: CreditTransaction[];
  notes: string;
  blocked_reason: string;
  marketing_opt_in: boolean;
  whatsapp_number: string;
  secondary_phone: string;
  default_pickup_address: string;
}

export type CustomerInput = Partial<Pick<CustomerDetail,
  "first_name" | "last_name" | "phone_number" | "email" | "is_active" |
  "address_line" | "notes" | "source" | "tags" | "is_blocked" |
  "blocked_reason" | "marketing_opt_in" | "whatsapp_number" |
  "secondary_phone" | "default_pickup_address" | "is_walk_in"
>>;

/** Query params for GET /api/v1/users/customers/ */
export interface ListCustomersParams {
  page?: number;
  /** Matches name/phone/email. */
  search?: string;
  tier?: LoyaltyTier;
  has_credit?: boolean;
  active?: boolean;
  source?: CustomerListItem["source"];
  last_order_before?: string;
  ordering?:
    | "created_at"
    | "-created_at"
    | "lifetime_spend"
    | "-lifetime_spend"
    | "orders_count"
    | "-orders_count"
    | "first_name"
    | "-first_name";
}
