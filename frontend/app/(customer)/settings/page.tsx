"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ChevronRight,
    CreditCard,
    Repeat,
    ShieldCheck,
    Sparkles,
    WashingMachine,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
    Button,
    Card,
    EyebrowLabel,
    Field,
    Input,
    Select,
} from "@/components/ui";
import { profileApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { PreferredLanguage, UserProfile } from "@/types";


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
                    : "text-ok-green"
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
        mutate: (data: {
            first_name: string;
            last_name: string;
            email: string;
            address_line: string;
            city: string;
        }) => void;
        isPending: boolean;
    };
}) {
    const [firstName, setFirstName] = useState(profile.first_name ?? "");
    const [lastName, setLastName] = useState(profile.last_name ?? "");
    const [email, setEmail] = useState(profile.email ?? "");
    const [addressLine, setAddressLine] = useState(
        profile.address_line ?? ""
    );
    const [city, setCity] = useState(profile.city ?? "");


    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();

                mutation.mutate({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    address_line: addressLine,
                    city,
                });
            }}
        >
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <Field label="First name">
                    <Input
                        value={firstName}
                        onChange={(e) =>
                            setFirstName(e.target.value)
                        }
                    />
                </Field>

                <Field label="Last name">
                    <Input
                        value={lastName}
                        onChange={(e) =>
                            setLastName(e.target.value)
                        }
                    />
                </Field>
            </div>


            <Field label="Email">
                <Input
                    type="email"
                    value={email}
                    onChange={(e) =>
                        setEmail(e.target.value)
                    }
                />
            </Field>


            <Field label="Address">
                <Input
                    value={addressLine}
                    onChange={(e) =>
                        setAddressLine(e.target.value)
                    }
                />
            </Field>


            <Field label="City">
                <Input
                    value={city}
                    onChange={(e) =>
                        setCity(e.target.value)
                    }
                />
            </Field>


            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save profile"}
            </Button>
        </form>
    );
}


export default function SettingsPage() {
    const queryClient = useQueryClient();


    const { data: profile, isLoading } = useQuery({
        queryKey: queryKeys.profile.me,
        queryFn: () => profileApi.getProfile(),
    });


    const [profileMessage, setProfileMessage] = useState<{
        text: string;
        tone: "ok" | "error";
    } | null>(null);


    const updateProfileMutation = useMutation({
        mutationFn: (data: {
            first_name: string;
            last_name: string;
            email: string;
            address_line: string;
            city: string;
        }) => profileApi.updateProfile(data),

        onSuccess: async () => {
            setProfileMessage({
                text: "Profile updated.",
                tone: "ok",
            });

            await queryClient.invalidateQueries({
                queryKey: queryKeys.profile.me,
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

        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.profile.preferences,
            }),
    });


    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-6">
                <EyebrowLabel words={["Your account"]} />

                <h1 className="font-display mt-1 text-xl font-semibold text-navy">
                    Settings
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
                                Laundry preferences
                            </p>

                            <p className="text-xs text-ink-muted">
                                Water, detergent, and folding
                            </p>
                        </div>

                        <ChevronRight
                            className="h-4 w-4 text-ink-muted"
                            aria-hidden="true"
                        />
                    </Card>
                </Link>


                <Link href="/settings/payments">
                    <Card className="flex items-center gap-3 transition-colors hover:bg-steam">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold">
                            <CreditCard
                                className="h-[18px] w-[18px]"
                                aria-hidden="true"
                            />
                        </span>

                        <div className="flex-1">
                            <p className="text-sm font-medium text-ink">
                                Payment methods
                            </p>

                            <p className="text-xs text-ink-muted">
                                Cards and mobile money
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
                            <Repeat
                                className="h-[18px] w-[18px]"
                                aria-hidden="true"
                            />
                        </span>

                        <div className="flex-1">
                            <p className="text-sm font-medium text-ink">
                                Subscription
                            </p>

                            <p className="text-xs text-ink-muted">
                                Plan, billing, and pickups
                            </p>
                        </div>

                        <ChevronRight
                            className="h-4 w-4 text-ink-muted"
                            aria-hidden="true"
                        />
                    </Card>
                </Link>
            </div>


            {/* Profile */}
            {isLoading ? (
                <div className="mb-8">
                    <SectionSkeleton />
                </div>
            ) : (
                <Card className="mb-8">
                    <h2 className="font-display mb-1 text-sm font-semibold text-navy">
                        Profile
                    </h2>


                    <p className="mb-4 text-xs text-ink-muted">
                        {profile?.phone_number}

                        <span className="ml-1.5 text-ink-muted/60">
                            — phone number can&apos;t be changed
                        </span>
                    </p>


                    {profile && (
                        <div className="mb-5 flex items-center gap-2 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold">
                            <Sparkles
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                            />

                            <span>
                                {profile.loyalty.points_balance} points ·{" "}
                                {profile.loyalty.tier.charAt(0)}
                                {profile.loyalty.tier
                                    .slice(1)
                                    .toLowerCase()}{" "}
                                tier
                            </span>


                            <Link
                                href="/loyalty"
                                className="ml-auto font-medium hover:underline"
                            >
                                View
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


            {/* Language */}
            <Card className="mb-8">
                <h2 className="font-display mb-1 text-sm font-semibold text-navy">
                    Language
                </h2>


                <p className="mb-4 text-xs text-ink-muted">
                    Choose the language used across the app.
                </p>


                <Select
                    value={
                        preferences?.preferred_language ?? "en"
                    }
                    onChange={(e) =>
                        updatePreferencesMutation.mutate(
                            e.target.value as PreferredLanguage
                        )
                    }
                    className="max-w-xs"
                >
                    <option value="en">
                        English
                    </option>

                    <option value="fr">
                        Français
                    </option>
                </Select>
            </Card>


            {/* Password */}
            <Card>
                <div className="mb-1 flex items-center gap-2">
                    <ShieldCheck
                        className="h-4 w-4 text-navy"
                        aria-hidden="true"
                    />

                    <h2 className="font-display text-sm font-semibold text-navy">
                        Change password
                    </h2>
                </div>


                <p className="mb-4 text-xs text-ink-muted">
                    Use at least 8 characters.
                </p>


                <form
                    onSubmit={(e) => {
                        e.preventDefault();

                        changePasswordMutation.mutate();
                    }}
                >
                    <Field label="Current password">
                        <Input
                            type="password"
                            value={oldPassword}
                            onChange={(e) =>
                                setOldPassword(e.target.value)
                            }
                        />
                    </Field>


                    <Field label="New password">
                        <Input
                            type="password"
                            minLength={8}
                            value={newPassword}
                            onChange={(e) =>
                                setNewPassword(e.target.value)
                            }
                        />
                    </Field>


                    <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                    >
                        {changePasswordMutation.isPending
                            ? "Updating..."
                            : "Change password"}
                    </Button>


                    {passwordMessage && (
                        <InlineMessage
                            message={passwordMessage.text}
                            tone={passwordMessage.tone}
                        />
                    )}
                </form>
            </Card>
        </main>
    );
}