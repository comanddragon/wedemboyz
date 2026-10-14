export type NotificationType = "ORDER_UPDATE" | "PAYMENT" | "PROMO" | "CHAT" | "SYSTEM";

/** Mirrors apps.notifications.api.serializers.notification.NotificationSerializer */
export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  related_order: number | null;
  created_at: string;
}

/** Mirrors apps.notifications.models.NotificationPreference + its serializer */
export interface NotificationPreference {
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  promo_opt_in: boolean;
}

export type UpdateNotificationPreferenceInput = Partial<NotificationPreference>;

export type DevicePlatform = "IOS" | "ANDROID" | "WEB";

/** Mirrors apps.notifications.api.serializers.device_token.DeviceTokenSerializer */
export interface DeviceToken {
  id: number;
  token: string;
  platform: DevicePlatform;
  is_active: boolean;
  created_at: string;
}

/** Payload for POST /notifications/device-tokens/ */
export interface RegisterDeviceTokenInput {
  token: string;
  platform: DevicePlatform;
}
