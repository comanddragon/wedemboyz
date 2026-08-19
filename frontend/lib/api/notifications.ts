import { apiClient, unwrap } from "./client";
import type {
    DeviceToken,
    Notification,
    NotificationPreference,
    Paginated,
    RegisterDeviceTokenInput,
    UpdateNotificationPreferenceInput,
} from "@/types";

/** GET /notifications/ */
export async function listNotifications(page = 1): Promise<Paginated<Notification>> {
    const res = await apiClient.get("/notifications/", { params: { page } });
    return unwrap<Paginated<Notification>>(res);
}

/** POST /notifications/{id}/read/ */
export async function markNotificationRead(notificationId: number): Promise<Notification> {
    const res = await apiClient.post(`/notifications/${notificationId}/read/`);
    return unwrap<Notification>(res);
}

/** POST /notifications/read-all/ */
export async function markAllNotificationsRead(): Promise<void> {
    await apiClient.post("/notifications/read-all/");
}

/** GET /notifications/preferences/ */
export async function getNotificationPreferences(): Promise<NotificationPreference> {
    const res = await apiClient.get("/notifications/preferences/");
    return unwrap<NotificationPreference>(res);
}

/** PATCH /notifications/preferences/ */
export async function updateNotificationPreferences(
    input: UpdateNotificationPreferenceInput
): Promise<NotificationPreference> {
    const res = await apiClient.patch("/notifications/preferences/", input);
    return unwrap<NotificationPreference>(res);
}

/** POST /notifications/device-tokens/ — register this device/browser for
 * push. Safe to call repeatedly (e.g. on every login) — re-registering an
 * existing token just refreshes it rather than erroring. */
export async function registerDeviceToken(input: RegisterDeviceTokenInput): Promise<DeviceToken> {
    const res = await apiClient.post("/notifications/device-tokens/", input);
    return unwrap<DeviceToken>(res);
}

/** DELETE /notifications/device-tokens/{id}/ — call on logout so a shared/
 * reset device stops receiving this user's pushes. */
export async function deleteDeviceToken(deviceTokenId: number): Promise<void> {
    await apiClient.delete(`/notifications/device-tokens/${deviceTokenId}/`);
}
