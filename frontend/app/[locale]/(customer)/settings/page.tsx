"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Camera,
  ChevronRight,
  Gift,
  ReceiptText,
  Repeat,
  ShieldCheck,
  Sparkles,
  WashingMachine,
} from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Button,
  Card,
  EyebrowLabel,
  Field,
  Input,
  Select,
} from "@/src/components/ui";
import { profileApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { PreferredLanguage, UserProfile } from "@/src/types";
import type { ProfileUpdateInput } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";
import { localizeHref, stripLocale } from "@/src/i18n/config";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { useAuthStore } from "@/src/lib/stores/auth.store";

function SectionSkeleton() {
  return (
    <Card className="space-y-3">
      <span className="block h-3 w-1/4 animate-pulse rounded bg-steam" />
      <span className="block h-9 animate-pulse rounded bg-steam" />
      <span className="block h-9 animate-pulse rounded bg-steam" />
    </Card>
  );
}

function InlineMessage({
  message,
  tone = "ok",
}: {
  message: string;
  tone?: "ok" | "error";
}) {
  return (
    <p
      className={`mt-3 text-xs ${
        tone === "error"
          ? "text-status-cancelled-text"
          : "text-status-ready-text"
      }`}
    >
      {message}
    </p>
  );
}

function ProfileForm({
  profile,
  mutation,
}: {
  profile: UserProfile;
  mutation: {
    mutate: (data: ProfileUpdateInput) => void;
    isPending: boolean;
  };
}) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [addressLine, setAddressLine] = useState(profile.address_line ?? "");
  const [city, setCity] = useState(profile.city || "Yaoundé");
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [useProfilePhoto, setUseProfilePhoto] = useState(profile.use_profile_photo);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(
    () => (avatar ? URL.createObjectURL(avatar) : profile.avatar),
    [avatar, profile.avatar],
  );

  useEffect(() => {
    if (!avatar) return;
    const url = previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [avatar, previewUrl]);

  const displayName = `${firstName} ${lastName}`.trim() || profile.phone_number;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (profile.is_ambassador && !profile.avatar && !avatar) {
          setPhotoError(t("settings.ambassadorPhotoRequired"));
          return;
        }

        mutation.mutate({
          first_name: firstName,
          last_name: lastName,
          email,
          address_line: addressLine,
          city,
          date_of_birth: dateOfBirth || null,
          avatar: avatar ?? undefined,
          use_profile_photo: useProfilePhoto,
        });
      }}
    >
      {profile.is_ambassador && !profile.avatar && !avatar ? (
        <div className="mb-5 rounded-2xl border border-gold/60 bg-gold-50/90 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-gold-700 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-900">
                {t("settings.ambassadorRequiredTitle")}
              </p>
              <p className="mt-1 text-xs text-navy/80 leading-relaxed">
                {t("settings.ambassadorRequiredBody")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={`mb-6 rounded-2xl p-4 sm:p-5 transition-all ${
          profile.is_ambassador && !profile.avatar && !avatar
            ? "border-2 border-gold bg-gold-50/30 ring-4 ring-gold/15"
            : "bg-steam/55"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <CustomerAvatar name={displayName} size="lg" imageUrl={previewUrl} useProfilePhoto={useProfilePhoto} className="h-20 w-20 ring-2 ring-white" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-base font-semibold text-navy">{t("settings.profilePicture")}</p>
              {profile.is_ambassador ? (
                <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-navy">
                  {t("settings.requiredForAmbassadors")}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{t("settings.profilePictureBody")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  setPhotoError(t("settings.profilePictureTooLarge"));
                  return;
                }
                setPhotoError("");
                setAvatar(file);
                setUseProfilePhoto(true);
              }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-navy ring-1 ring-crease transition-colors hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {profile.avatar || avatar ? t("settings.changePicture") : t("settings.uploadPicture")}
            </button>
            {photoError ? <p className="mt-2 text-xs text-status-cancelled-text" role="alert">{photoError}</p> : null}
          </div>
        </div>
        <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">{t("settings.avatarDisplay")}</legend>
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${!useProfilePhoto ? "border-navy bg-white" : "border-crease bg-white/60"}`}>
            <input type="radio" name="avatar-display" checked={!useProfilePhoto} onChange={() => setUseProfilePhoto(false)} className="accent-navy" />
            <CustomerAvatar name={displayName} size="sm" />
            <span><span className="block text-xs font-semibold text-navy">{t("settings.illustratedAvatar")}</span><span className="block text-[11px] text-ink-muted">{t("settings.illustratedAvatarBody")}</span></span>
          </label>
          <label className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${useProfilePhoto ? "border-navy bg-white" : "border-crease bg-white/60"} ${!previewUrl ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}>
            <input type="radio" name="avatar-display" checked={useProfilePhoto} disabled={!previewUrl} onChange={() => setUseProfilePhoto(true)} className="accent-navy" />
            <CustomerAvatar name={displayName} size="sm" imageUrl={previewUrl} forceProfilePhoto />
            <span><span className="block text-xs font-semibold text-navy">{t("settings.profilePhoto")}</span><span className="block text-[11px] text-ink-muted">{previewUrl ? t("settings.profilePhotoBody") : t("settings.uploadFirst")}</span></span>
          </label>
        </fieldset>
        {profile.is_ambassador ? <p className="mt-3 text-xs font-medium text-gold-600">{t("settings.ambassadorPhotoNotice")}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label={t("settings.firstName")}>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>

        <Field label={t("settings.lastName")}>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("settings.email")}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label={t("settings.address")}>
        <Input
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </Field>

      <Field label={t("settings.city")}>
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>

      <Field label={t("settings.dateOfBirth")}>
        <Input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </Field>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? t("settings.saving") : t("settings.save")}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const setAuthUser = useAuthStore((state) => state.setUser);

  const { data: profile, isLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => profileApi.getProfile(),
  });

  const [profileMessage, setProfileMessage] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdateInput) => profileApi.updateProfile(data),

    onSuccess: async (updated) => {
      setAuthUser({
        first_name: updated.first_name,
        last_name: updated.last_name,
        avatar: updated.avatar,
        use_profile_photo: updated.use_profile_photo,
        is_ambassador: updated.is_ambassador,
      });
      setProfileMessage({
        text: t("settings.updated"),
        tone: "ok",
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.profile.me,
      });
      await queryClient.invalidateQueries({
        queryKey: ["ambassadors"],
      });
    },

    onError: (error) => {
      setProfileMessage({
        text: getApiErrorMessage(error),
        tone: "error",
      });
    },
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [passwordMessage, setPasswordMessage] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      profileApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }),

    onSuccess: (res) => {
      setPasswordMessage({
        text: res.detail,
        tone: "ok",
      });

      setOldPassword("");
      setNewPassword("");
    },

    onError: (error) => {
      setPasswordMessage({
        text: getApiErrorMessage(error),
        tone: "error",
      });
    },
  });

  const { data: preferences } = useQuery({
    queryKey: queryKeys.profile.preferences,
    queryFn: () => profileApi.getPreferences(),
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (language: PreferredLanguage) =>
      profileApi.updatePreferences({
        preferred_language: language,
      }),

    onSuccess: (_, language) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.preferences,
      });
      document.cookie = `NEXT_LOCALE=${language}; path=/; max-age=31536000; samesite=lax`;
      router.replace(localizeHref(stripLocale(pathname), language));
    },
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6">
        <EyebrowLabel words={[t("settings.eyebrow")]} />

        <h1 className="font-display mt-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
          {t("settings.title")}
        </h1>
      </div>

      {/* Quick links */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/preferences">
          <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
              <WashingMachine
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              />
            </span>

            <div className="flex-1">
              <p className="text-sm font-medium text-ink">
                {t("settings.laundry")}
              </p>

              <p className="text-xs text-ink-muted">
                {t("settings.laundryBody")}
              </p>
            </div>

            <ChevronRight
              className="h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
          </Card>
        </Link>

        <Link href="/subscription">
          <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-turquoise-50 text-turquoise-600">
              <Repeat className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>

            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{t("settings.subscription")}</p>

              <p className="text-xs text-ink-muted">
                {t("settings.subscriptionBody")}
              </p>
            </div>

            <ChevronRight
              className="h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
          </Card>
        </Link>

        <Link href="/notifications">
          <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy"><Bell className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="flex-1"><p className="text-sm font-medium text-ink">{t("settings.notifications")}</p><p className="text-xs text-ink-muted">{t("settings.notificationsBody")}</p></div>
            <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          </Card>
        </Link>

        <Link href="/loyalty">
          <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600"><Gift className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="flex-1"><p className="text-sm font-medium text-ink">{t("settings.rewards")}</p><p className="text-xs text-ink-muted">{t("settings.rewardsBody")}</p></div>
            <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          </Card>
        </Link>

        <Link href="/payments">
          <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steam text-navy"><ReceiptText className="h-[18px] w-[18px]" aria-hidden="true" /></span>
            <div className="flex-1"><p className="text-sm font-medium text-ink">{t("settings.paymentHistory")}</p><p className="text-xs text-ink-muted">{t("settings.paymentHistoryBody")}</p></div>
            <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          </Card>
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2 xl:gap-10">
        {/* Profile */}
        {isLoading ? (
          <div>
            <SectionSkeleton />
          </div>
        ) : profileError ? (
          <Card>
            <h2 className="font-display text-sm font-semibold text-navy">{t("settings.profileUnavailable")}</h2>
            <p className="mt-1 text-xs text-ink-muted">{getApiErrorMessage(profileError)}</p>
            <Button className="mt-4" variant="secondary" onClick={() => refetchProfile()}>{t("settings.retry")}</Button>
          </Card>
        ) : (
          <Card>
            <h2 className="font-display mb-1 text-sm font-semibold text-navy">
              {t("settings.profile")}
            </h2>

            <p className="mb-4 text-xs text-ink-muted">
              {profile?.phone_number}

              <span className="ml-1.5 text-ink-muted/60">
                — {t("settings.phoneLocked")}
              </span>
            </p>

            {profile && (
              <div className="mb-5 flex items-center gap-2 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />

                <span>
                  {profile.loyalty.points_balance} {t("settings.points")} ·{" "}
                  {profile.loyalty.tier.charAt(0)}
                  {profile.loyalty.tier.slice(1).toLowerCase()} {t("settings.tier")}
                </span>

                <Link
                  href="/loyalty"
                  className="ml-auto font-medium hover:underline"
                >
                  {t("settings.view")}
                </Link>
              </div>
            )}

            {profile && (
              <>
                <ProfileForm
                  key={profile.id}
                  profile={profile}
                  mutation={updateProfileMutation}
                />

                {profileMessage && (
                  <InlineMessage
                    message={profileMessage.text}
                    tone={profileMessage.tone}
                  />
                )}
              </>
            )}
          </Card>
        )}

        <div className="space-y-6">
          {/* Language */}
          <Card>
            <h2 className="font-display mb-1 text-sm font-semibold text-navy">
              {t("settings.language")}
            </h2>

            <p className="mb-4 text-xs text-ink-muted">
              {t("settings.languageBody")}
            </p>

            <Select
              value={preferences?.preferred_language ?? "en"}
              onChange={(e) =>
                updatePreferencesMutation.mutate(
                  e.target.value as PreferredLanguage,
                )
              }
              className="max-w-xs"
            >
              <option value="en">{t("settings.english")}</option>

              <option value="fr">{t("settings.french")}</option>
            </Select>
          </Card>

          {/* Password */}
          <Card>
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-navy" aria-hidden="true" />

              <h2 className="font-display text-sm font-semibold text-navy">
                {t("settings.changePassword")}
              </h2>
            </div>

            <p className="mb-4 text-xs text-ink-muted">
              {t("settings.passwordHint")}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();

                changePasswordMutation.mutate();
              }}
            >
              <Field label={t("settings.currentPassword")}>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </Field>

              <Field label={t("settings.newPassword")}>
                <Input
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>

              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending
                  ? t("settings.updating")
                  : t("settings.changePassword")}
              </Button>

              {passwordMessage && (
                <InlineMessage
                  message={passwordMessage.text}
                  tone={passwordMessage.tone}
                />
              )}
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
