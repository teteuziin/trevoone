export type NotificationPriority = "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationDeliveryChannel = "PUSH" | "EMAIL";

export type NotificationDeliveryStatus = "ACCEPTED" | "FAILED" | "GONE";

export interface UserNotificationRecord {
  id: number;
  public_id: string;
  user_id: number;
  consultancy_id: number | null;
  priority: NotificationPriority;
  event_type: string;
  title: string;
  body: string;
  deep_link: string | null;
  dedupe_key: string | null;
  source_type: string | null;
  source_public_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

export interface UserNotificationDTO {
  publicId: string;
  priority: NotificationPriority;
  eventType: string;
  title: string;
  body: string;
  deepLink: string | null;
  sourceType: string | null;
  sourcePublicId: string | null;
  readAt: string | null;
  createdAt: string;
  consultancyName?: string | null;
}

export interface WebPushSubscriptionRecord {
  id: number;
  public_id: string;
  user_id: number;
  endpoint: string;
  endpoint_fingerprint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  user_agent: string | null;
  revoked_at: Date | null;
  revocation_reason: string | null;
  last_seen_at: Date;
  created_at: Date;
}

export interface NotificationDeliveryAttemptRecord {
  id: number;
  public_id: string;
  notification_id: number;
  channel: NotificationDeliveryChannel;
  subscription_id: number | null;
  target_fingerprint: string;
  status: NotificationDeliveryStatus;
  status_code: number | null;
  error_message: string | null;
  attempted_at: Date;
}

export interface CreateNotificationInput {
  userId: number;
  consultancyId?: number | null;
  priority?: NotificationPriority;
  eventType: string;
  title: string;
  body: string;
  deepLink?: string | null;
  dedupeKey?: string | null;
  sourceType?: string | null;
  sourcePublicId?: string | null;
}

export interface RegisterPushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime?: number | null;
  userAgent?: string | null;
}
