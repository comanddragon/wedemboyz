import { apiClient, unwrap } from "./client";
import type {
  AcceptStaffInviteInput,
  AcceptStaffInviteResult,
  CreateStaffInviteInput,
  Paginated,
  StaffActivityLogEntry,
  StaffInvite,
  StaffProfile,
  StaffAssignmentOption,
  BusinessSettings,
  PriceItem,
  SubscriptionPlanSetting,
  UpdateStaffProfileInput,
} from "@/src/types";

// --- Roster --------------------------------------------------------------------

/** GET /api/v1/staff/ — the roster. Any staff member can view it. */
export async function listStaff(): Promise<Paginated<StaffProfile>> {
  const res = await apiClient.get("/staff/");
  return unwrap<Paginated<StaffProfile>>(res);
}

export async function listChatAgents(): Promise<StaffProfile[]> {
  const res = await apiClient.get("/staff/chat-agents/");
  return unwrap<StaffProfile[]>(res);
}

export async function listOperationalStaff(
  role?: string,
): Promise<StaffAssignmentOption[]> {
  const res = await apiClient.get("/staff/operations/", { params: { role } });
  return unwrap<StaffAssignmentOption[]>(res);
}

/** GET /api/v1/staff/{id}/ */
export async function getStaffProfile(
  staffProfileId: number,
): Promise<StaffProfile> {
  const res = await apiClient.get(`/staff/${staffProfileId}/`);
  return unwrap<StaffProfile>(res);
}

/** PATCH /api/v1/staff/{id}/ — role/active-flag changes. Requires
 * Owner authority (Django superuser) is required. */
export async function updateStaffProfile(
  staffProfileId: number,
  input: UpdateStaffProfileInput,
): Promise<StaffProfile> {
  const res = await apiClient.patch(`/staff/${staffProfileId}/`, input);
  return unwrap<StaffProfile>(res);
}

/** GET /api/v1/staff/{id}/activity/ — per-staff activity log. */
export async function listStaffActivity(
  staffProfileId: number,
): Promise<Paginated<StaffActivityLogEntry>> {
  const res = await apiClient.get(`/staff/${staffProfileId}/activity/`);
  return unwrap<Paginated<StaffActivityLogEntry>>(res);
}

// --- Invites ---------------------------------------------------------------------

/** GET /api/v1/staff/invites/ — requires IsStaffManager. */
export async function listStaffInvites(): Promise<Paginated<StaffInvite>> {
  const res = await apiClient.get("/staff/invites/");
  return unwrap<Paginated<StaffInvite>>(res);
}

/** POST /api/v1/staff/invites/ — requires IsStaffManager. */
export async function createStaffInvite(
  input: CreateStaffInviteInput,
): Promise<StaffInvite> {
  const res = await apiClient.post("/staff/invites/", input);
  return unwrap<StaffInvite>(res);
}

/** POST /api/v1/staff/invites/{id}/revoke/ */
export async function revokeStaffInvite(
  inviteId: number,
): Promise<StaffInvite> {
  const res = await apiClient.post(`/staff/invites/${inviteId}/revoke/`);
  return unwrap<StaffInvite>(res);
}

export async function resendStaffInvite(
  inviteId: number,
): Promise<StaffInvite> {
  const res = await apiClient.post(`/staff/invites/${inviteId}/resend/`);
  return unwrap<StaffInvite>(res);
}

/** POST /api/v1/staff/invites/accept/ — public (AllowAny); the invite token
 * itself is the credential. Call this unauthenticated, e.g. from an
 * `/invite/accept?token=...` page, not through the authed `apiClient`
 * interceptor path (no access token is required or sent). */
export async function acceptStaffInvite(
  input: AcceptStaffInviteInput,
): Promise<AcceptStaffInviteResult> {
  const res = await apiClient.post("/staff/invites/accept/", input);
  return unwrap<AcceptStaffInviteResult>(res);
}

// --- Business configuration ---------------------------------------------------

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const res = await apiClient.get("/staff/settings/");
  return unwrap<BusinessSettings>(res);
}

export async function updateBusinessSettings(
  input: Partial<Omit<BusinessSettings, "id">>,
): Promise<BusinessSettings> {
  const res = await apiClient.patch("/staff/settings/", input);
  return unwrap<BusinessSettings>(res);
}

export async function listPriceItems(page = 1): Promise<Paginated<PriceItem>> {
  const res = await apiClient.get("/staff/settings/prices/", { params: { page } });
  return unwrap<Paginated<PriceItem>>(res);
}

export async function createPriceItem(
  input: Omit<PriceItem, "id" | "created_at" | "updated_at">,
): Promise<PriceItem> {
  const res = await apiClient.post("/staff/settings/prices/", input);
  return unwrap<PriceItem>(res);
}

export async function updatePriceItem(
  id: number,
  input: Partial<PriceItem>,
): Promise<PriceItem> {
  const res = await apiClient.patch(`/staff/settings/prices/${id}/`, input);
  return unwrap<PriceItem>(res);
}

export async function listSubscriptionPlanSettings(): Promise<SubscriptionPlanSetting[]> {
  const res = await apiClient.get("/staff/settings/plans/");
  return unwrap<SubscriptionPlanSetting[]>(res);
}

export async function createSubscriptionPlanSetting(
  input: Omit<SubscriptionPlanSetting, "id" | "created_at" | "updated_at">,
): Promise<SubscriptionPlanSetting> {
  const res = await apiClient.post("/staff/settings/plans/", input);
  return unwrap<SubscriptionPlanSetting>(res);
}

export async function updateSubscriptionPlanSetting(
  id: number,
  input: Partial<SubscriptionPlanSetting>,
): Promise<SubscriptionPlanSetting> {
  const res = await apiClient.patch(`/staff/settings/plans/${id}/`, input);
  return unwrap<SubscriptionPlanSetting>(res);
}

export async function listAuditLog(params: {
  page?: number;
  search?: string;
  action?: string;
} = {}): Promise<Paginated<StaffActivityLogEntry>> {
  const res = await apiClient.get("/staff/audit/", { params });
  return unwrap<Paginated<StaffActivityLogEntry>>(res);
}
