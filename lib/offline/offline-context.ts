export const OFFLINE_CONTEXT_STORE = "offline_context";
export const ACTIVE_CONTEXT_ID = "active_context";
export const DEFAULT_OFFLINE_TTL_HOURS = 72; // 3 days

/**
 * Represents the offline active context on the client device.
 * NOTE: This is NOT an authentication token or security permission.
 * It merely indicates which user profile and consultancy were last
 * successfully authorized and synchronized while online.
 */
export interface OfflineActiveContext {
  id: typeof ACTIVE_CONTEXT_ID;
  userPublicId: string;
  userName: string;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl: string | null;
  syncedAt: string; // ISO 8601 string
  validUntil: string; // ISO 8601 string
}

export type CreateOfflineActiveContextInput = {
  userPublicId: string;
  userName: string;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  syncedAt?: string; // Optional ISO 8601 string
  ttlHours?: number; // Optional, defaults to 72
};

/**
 * Calculates a validUntil ISO date string from a reference date and TTL in hours.
 */
export function calculateOfflineValidUntil(
  referenceDate: Date = new Date(),
  ttlHours: number = DEFAULT_OFFLINE_TTL_HOURS
): string {
  const expiryTime = referenceDate.getTime() + ttlHours * 60 * 60 * 1000;
  return new Date(expiryTime).toISOString();
}

/**
 * Validates whether an offline context is present, well-formed and within its validUntil TTL.
 */
export function isOfflineContextValid(
  context: OfflineActiveContext | null | undefined,
  now: Date = new Date()
): boolean {
  if (!context || typeof context !== "object") {
    return false;
  }

  if (
    !context.userPublicId ||
    !context.consultancyPublicId ||
    !context.consultancySlug ||
    !context.syncedAt ||
    !context.validUntil
  ) {
    return false;
  }

  const expiryTimestamp = new Date(context.validUntil).getTime();
  if (isNaN(expiryTimestamp)) {
    return false;
  }

  return now.getTime() <= expiryTimestamp;
}
