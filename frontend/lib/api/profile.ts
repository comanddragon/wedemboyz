import { apiClient, unwrap } from "./client";
import type { ChangePasswordInput, ProfileUpdateInput, UserPreferences, UserProfile } from "@/types";

/** GET /users/me/ */
export async function getProfile(): Promise<UserProfile> {
  const res = await apiClient.get("/users/me/");
  return unwrap<UserProfile>(res);
}

/** PATCH /users/me/ — avatar upload goes through multipart/form-data if present. */
export async function updateProfile(input: ProfileUpdateInput): Promise<UserProfile> {
  const hasFile = input.avatar instanceof File;

  if (hasFile) {
    const formData = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string | Blob);
      }
    });
    const res = await apiClient.patch("/users/me/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<UserProfile>(res);
  }

  const res = await apiClient.patch("/users/me/", input);
  return unwrap<UserProfile>(res);
}

/** POST /users/me/change-password/ */
export async function changePassword(input: ChangePasswordInput): Promise<{ detail: string }> {
  const res = await apiClient.post("/users/me/change-password/", input);
  return unwrap<{ detail: string }>(res);
}

/** GET /users/me/preferences/ */
export async function getPreferences(): Promise<UserPreferences> {
  const res = await apiClient.get("/users/me/preferences/");
  return unwrap<UserPreferences>(res);
}

/** PATCH /users/me/preferences/ */
export async function updatePreferences(input: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await apiClient.patch("/users/me/preferences/", input);
  return unwrap<UserPreferences>(res);
}
