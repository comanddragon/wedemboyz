export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD";
export type PreferredLanguage = "en" | "fr";

/** Mirrors apps.users.api.serializers.profile.LoyaltyAccountSummarySerializer */
export interface LoyaltyAccountSummary {
  points_balance: number;
  lifetime_points_earned: number;
  tier: LoyaltyTier;
}

/** Mirrors apps.users.api.serializers.profile.ProfileSerializer (GET/PATCH /users/me/) */
export interface UserProfile {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_phone_verified: boolean;
  avatar: string | null;
  use_profile_photo: boolean;
  address_line: string;
  city: string;
  date_of_birth: string | null; // ISO date
  /** Number the shop contacts the customer on (the only one for guests). */
  contact_phone: string;
  /** True until a guest session is upgraded with a real phone + password. */
  is_guest: boolean;
  loyalty: LoyaltyAccountSummary;
  is_staff: boolean;
  is_superuser: boolean;
  staff_role: "OWNER" | "MANAGER" | "ATTENDANT" | null;
  staff_permissions: string[];
  staff_access_active: boolean;
  is_ambassador: boolean;
}

/** Fields the client may PATCH on /users/me/ — everything else is read-only. */
export type ProfileUpdateInput = Partial<
  Pick<
    UserProfile,
    | "first_name"
    | "last_name"
    | "email"
    | "address_line"
    | "city"
    | "date_of_birth"
    | "contact_phone"
    | "use_profile_photo"
  >
> & {
  avatar?: File | null;
};

/** Mirrors apps.users.api.serializers.profile.PreferencesSerializer */
export interface UserPreferences {
  preferred_language: PreferredLanguage;
  water_temperature: "COLD" | "WARM" | "HOT";
  spin_speed: "GENTLE" | "NORMAL" | "HIGH";
  detergent_preference: "STANDARD" | "HYPOALLERGENIC" | "SCENT_FREE";
  folding_style: "BY_GARMENT" | "BY_OUTFIT" | "HANGER_READY";
}

export interface RegisterInput {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password: string;
  password2: string;
}

export interface LoginInput {
  phone_number: string;
  password: string;
}

/** Response shape from RegisterView / LoginView (apps.users.api.views.auth) */
export interface AuthTokens {
  access: string;
  refresh: string;
  user: {
    id: number;
    phone_number: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_guest?: boolean;
    staff_role: "OWNER" | "MANAGER" | "ATTENDANT" | null;
    staff_permissions: string[];
    staff_access_active: boolean;
    is_ambassador: boolean;
    avatar: string | null;
    use_profile_photo: boolean;
  };
}

/** Body for POST /auth/guest/claim/ — same fields as registration. */
export type ClaimAccountInput = RegisterInput;

export interface ChangePasswordInput {
  old_password: string;
  new_password: string;
}
