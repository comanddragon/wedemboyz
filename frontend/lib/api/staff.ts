import { apiClient, unwrap } from "./client";
import type {
  AcceptStaffInviteInput,
  AcceptStaffInviteResult,
  CreateStaffInviteInput,
  Paginated,
  StaffActivityLogEntry,
  StaffInvite,
  StaffProfile,
  UpdateStaffProfileInput,
} from "@/types";

// --- Roster --------------------------------------------------------------------

/** GET /api/v1/staff/ — the roster. Any staff member can view it. */
export async function listStaff(): Promise<Paginated<StaffProfile>> {
  const res = await apiClient.get("/staff/");
  return unwrap<Paginated<StaffProfile>>(res);
}

/** GET /api/v1/staff/{id}/ */
export async function getStaffProfile(staffProfileId: number): Promise<StaffProfile> {
  const res = await apiClient.get(`/staff/${staffProfileId}/`);
  return unwrap<StaffProfile>(res);
}

/** PATCH /api/v1/staff/{id}/ — role/active-flag changes. Requires
 * IsStaffManager (superuser, or a StaffProfile with role=OWNER). */
export async function updateStaffProfile(
  staffProfileId: number,
  input: UpdateStaffProfileInput
): Promise<StaffProfile> {
  const res = await apiClient.patch(`/staff/${staffProfileId}/`, input);
  return unwrap<StaffProfile>(res);
}

/** GET /api/v1/staff/{id}/activity/ — per-staff activity log. */
export async function listStaffActivity(staffProfileId: number): Promise<Paginated<StaffActivityLogEntry>> {
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
export async function createStaffInvite(input: CreateStaffInviteInput): Promise<StaffInvite> {
  const res = await apiClient.post("/staff/invites/", input);
  return unwrap<StaffInvite>(res);
}

/** POST /api/v1/staff/invites/{id}/revoke/ */
export async function revokeStaffInvite(inviteId: number): Promise<StaffInvite> {
  const res = await apiClient.post(`/staff/invites/${inviteId}/revoke/`);
  return unwrap<StaffInvite>(res);
}

/** POST /api/v1/staff/invites/accept/ — public (AllowAny); the invite token
 * itself is the credential. Call this unauthenticated, e.g. from an
 * `/invite/accept?token=...` page, not through the authed `apiClient`
 * interceptor path (no access token is required or sent). */
export async function acceptStaffInvite(input: AcceptStaffInviteInput): Promise<AcceptStaffInviteResult> {
  const res = await apiClient.post("/staff/invites/accept/", input);
  return unwrap<AcceptStaffInviteResult>(res);
}
