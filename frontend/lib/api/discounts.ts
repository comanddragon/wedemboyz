import { apiClient, unwrap } from "./client";
import type {
  DiscountCampaign,
  DiscountCampaignInput,
  ListDiscountCampaignsParams,
  ListPromoCodesParams,
  LoyaltyAccount,
  LoyaltyTransaction,
  Paginated,
  PromoCode,
  PromoCodeInput,
  PromoValidationResult,
  RedeemPointsInput,
  ValidatePromoInput,
} from "@/types";

// --- Promo codes (customer-redeemable, staff-managed) -----------------------------

/** GET /discounts/promo-codes/ — staff see every code; non-staff only see
 * active ones. Paginated only — no server-side filtering, filter client-side. */
export async function listPromoCodes(params: ListPromoCodesParams = {}): Promise<Paginated<PromoCode>> {
  const res = await apiClient.get("/discounts/promo-codes/", { params });
  return unwrap<Paginated<PromoCode>>(res);
}

/** GET /discounts/promo-codes/{id}/ */
export async function getPromoCode(promoCodeId: number): Promise<PromoCode> {
  const res = await apiClient.get(`/discounts/promo-codes/${promoCodeId}/`);
  return unwrap<PromoCode>(res);
}

/** POST /discounts/promo-codes/ */
export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const res = await apiClient.post("/discounts/promo-codes/", input);
  return unwrap<PromoCode>(res);
}

/** PATCH /discounts/promo-codes/{id}/ */
export async function updatePromoCode(promoCodeId: number, input: Partial<PromoCodeInput>): Promise<PromoCode> {
  const res = await apiClient.patch(`/discounts/promo-codes/${promoCodeId}/`, input);
  return unwrap<PromoCode>(res);
}

/** DELETE /discounts/promo-codes/{id}/ */
export async function deletePromoCode(promoCodeId: number): Promise<void> {
  await apiClient.delete(`/discounts/promo-codes/${promoCodeId}/`);
}

// --- Campaigns (staff-managed promo campaigns) ------------------------------------

/** GET /discounts/campaigns/ — staff see every campaign; non-staff only see
 * active ones. Paginated only — the view doesn't accept segment/active/search
 * query params, so filter client-side over the current page. */
export async function listDiscountCampaigns(
  params: ListDiscountCampaignsParams = {}
): Promise<Paginated<DiscountCampaign>> {
  const res = await apiClient.get("/discounts/campaigns/", { params });
  return unwrap<Paginated<DiscountCampaign>>(res);
}

/** GET /discounts/campaigns/{id}/ */
export async function getDiscountCampaign(campaignId: number): Promise<DiscountCampaign> {
  const res = await apiClient.get(`/discounts/campaigns/${campaignId}/`);
  return unwrap<DiscountCampaign>(res);
}

/** POST /discounts/campaigns/ */
export async function createDiscountCampaign(input: DiscountCampaignInput): Promise<DiscountCampaign> {
  const res = await apiClient.post("/discounts/campaigns/", input);
  return unwrap<DiscountCampaign>(res);
}

/** PATCH /discounts/campaigns/{id}/ */
export async function updateDiscountCampaign(
  campaignId: number,
  input: Partial<DiscountCampaignInput>
): Promise<DiscountCampaign> {
  const res = await apiClient.patch(`/discounts/campaigns/${campaignId}/`, input);
  return unwrap<DiscountCampaign>(res);
}

/** DELETE /discounts/campaigns/{id}/ */
export async function deleteDiscountCampaign(campaignId: number): Promise<void> {
  await apiClient.delete(`/discounts/campaigns/${campaignId}/`);
}

/** POST /discounts/validate/ — preview a promo's discount before checkout. */
export async function validatePromo(input: ValidatePromoInput): Promise<PromoValidationResult> {
  const res = await apiClient.post("/discounts/validate/", input);
  return unwrap<PromoValidationResult>(res);
}

/** GET /loyalty/ */
export async function getLoyaltyAccount(): Promise<LoyaltyAccount> {
  const res = await apiClient.get("/loyalty/");
  return unwrap<LoyaltyAccount>(res);
}

/** GET /loyalty/transactions/ */
export async function listLoyaltyTransactions(page = 1): Promise<Paginated<LoyaltyTransaction>> {
  const res = await apiClient.get("/loyalty/transactions/", { params: { page } });
  return unwrap<Paginated<LoyaltyTransaction>>(res);
}

/** POST /loyalty/redeem/ */
export async function redeemLoyaltyPoints(input: RedeemPointsInput): Promise<LoyaltyAccount> {
  const res = await apiClient.post("/loyalty/redeem/", input);
  return unwrap<LoyaltyAccount>(res);
}

/** POST /loyalty/stamp-card/redeem/ — redeems exactly one full stamp card
 * (one free wash) in a single tap; returns the resulting ledger entry. */
export async function redeemStampCard(): Promise<LoyaltyTransaction> {
  const res = await apiClient.post("/loyalty/stamp-card/redeem/");
  return unwrap<LoyaltyTransaction>(res);
}
