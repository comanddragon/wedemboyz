/** Mirrors apps.staff.models.StaffRole */
export type StaffRole = "OWNER" | "MANAGER" | "ATTENDANT";

/** Mirrors apps.staff.models.StaffInvite.Status */
export type StaffInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

/** Mirrors apps.staff.api.serializers.staff.StaffUserSummarySerializer */
export interface StaffUserSummary {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
}

/** Mirrors apps.staff.api.serializers.staff.StaffProfileSerializer
 * (GET /api/v1/staff/ and /api/v1/staff/{id}/) */
export interface StaffProfile {
  id: number;
  user: StaffUserSummary;
  role: StaffRole;
  is_active: boolean;
  invited_by: StaffUserSummary | null;
  joined_at: string;
}

/** Payload for PATCH /api/v1/staff/{id}/ — requires IsStaffManager
 * (superuser or a StaffProfile with role=OWNER). */
export interface UpdateStaffProfileInput {
  role?: StaffRole;
  is_active?: boolean;
}

/** Mirrors apps.staff.api.serializers.staff.StaffInviteSerializer */
export interface StaffInvite {
  id: number;
  phone_number: string;
  full_name: string;
  role: StaffRole;
  token: string;
  status: StaffInviteStatus;
  invited_by: StaffUserSummary | null;
  expires_at: string;
  is_valid_now: boolean;
  created_at: string;
}

/** Payload for POST /api/v1/staff/invites/ */
export interface CreateStaffInviteInput {
  phone_number: string;
  full_name?: string;
  role: StaffRole;
}

/** Payload for POST /api/v1/staff/invites/accept/ — public, AllowAny. The
 * invite token itself is the credential. */
export interface AcceptStaffInviteInput {
  token: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

/** Response shape from StaffInviteAcceptView. */
export interface AcceptStaffInviteResult {
  detail: string;
  phone_number: string;
}

/** Mirrors apps.staff.api.serializers.staff.StaffActivityLogSerializer */
export interface StaffActivityLogEntry {
  id: number;
  action: string;
  description: string;
  created_at: string;
}
