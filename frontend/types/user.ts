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
  address_line: string;
  city: string;
  date_of_birth: string | null; // ISO date
  loyalty: LoyaltyAccountSummary;
  /** NOT currently sent by the backend — see AdminGuard.tsx. Add it to
   * ProfileSerializer server-side, then this starts working with no
   * further frontend changes. */
  is_staff?: boolean;
}

/** Fields the client may PATCH on /users/me/ — everything else is read-only. */
export type ProfileUpdateInput = Partial<
  Pick<UserProfile, "first_name" | "last_name" | "email" | "address_line" | "city" | "date_of_birth">
> & {
  avatar?: File | null;
};

/** Mirrors apps.users.api.serializers.profile.PreferencesSerializer */
export interface UserPreferences {
  preferred_language: PreferredLanguage;
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
  };
}

export interface ChangePasswordInput {
  old_password: string;
  new_password: string;
}
