/** Mirrors apps.staff.models.StaffRole */
export type StaffRole = "MANAGER" | "ATTENDANT" | "CASHIER" | "DRIVER";
export type EmploymentStatus =
  "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";

/** Mirrors apps.staff.models.StaffInvite.Status */
export type StaffInviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

/** Mirrors apps.staff.api.serializers.staff.StaffUserSummarySerializer */
export interface StaffUserSummary {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  last_login: string | null;
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
  hire_date: string | null;
  employment_status: EmploymentStatus;
  base_salary: string | null;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  is_available_for_chat: boolean;
  can_receive_chats: boolean;
  open_chat_count: number;
}

export interface StaffAssignmentOption {
  id: number;
  user: StaffUserSummary;
  role: StaffRole;
  employment_status: EmploymentStatus;
  is_active: boolean;
}

/** Payload for PATCH /api/v1/staff/{id}/ — owner/superuser only. */
export interface UpdateStaffProfileInput {
  role?: StaffRole;
  is_active?: boolean;
  hire_date?: string | null;
  employment_status?: EmploymentStatus;
  base_salary?: string | null;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  is_available_for_chat?: boolean;
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
  staff: number;
  staff_name: string;
  staff_phone: string;
  action: string;
  description: string;
  created_at: string;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  address: string;
  phone: string;
  tax_number: string;
  receipt_footer: string;
  delivery_fee_flat: string;
  free_delivery_threshold: string | null;
  tax_rate_percent: string;
  subscription_period_days: number;
  operating_hours: Record<string, string>;
  closed_days: string[];
  slot_capacities: Record<string, number>;
  notification_channels: Record<string, boolean>;
  notification_templates: Record<string, string>;
}

export interface PriceItem {
  id: number;
  service_type: string;
  label: string;
  unit_mode: "PIECE" | "KILOGRAM";
  price: string;
  minimum_charge: string;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanSetting {
  id: number;
  plan: string;
  label: string;
  price: string;
  kilos: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
