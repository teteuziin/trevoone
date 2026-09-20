import {
  OFFLINE_CONTEXT_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";

export { OFFLINE_CONTEXT_STORE };
export const ACTIVE_CONTEXT_ID = "active_context";
export const DEFAULT_OFFLINE_TTL_HOURS = 72; // 3 days

/**
 * Represents the offline active context on the client device.
 * NOTE: This is NOT an authentication token or security permission.
 * It merely indicates which user profile, consultancy, and role were last
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
  role: string;
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
  role?: string;
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
 * Validates whether an offline context is present, well-formed, matches scope requirements,
 * and has not expired past its validUntil TTL.
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
    !context.role ||
    !context.syncedAt ||
    !context.validUntil
  ) {
    return false;
  }

  // Reject legacy mock strings
  if (context.userPublicId === "student") {
    return false;
  }

  const expiryTimestamp = new Date(context.validUntil).getTime();
  if (isNaN(expiryTimestamp)) {
    return false;
  }

  return now.getTime() <= expiryTimestamp;
}

/**
 * Saves or updates the active offline context on the client device in trevo_offline_v3.
 */
export async function saveOfflineActiveContext(
  input: CreateOfflineActiveContextInput
): Promise<boolean> {
  if (
    !input ||
    !input.userPublicId ||
    !input.consultancyPublicId ||
    !input.consultancySlug
  ) {
    return false;
  }

  const now = new Date();
  const syncedAt = input.syncedAt || now.toISOString();
  const ttlHours = input.ttlHours && input.ttlHours > 0 ? input.ttlHours : DEFAULT_OFFLINE_TTL_HOURS;
  const validUntil = calculateOfflineValidUntil(new Date(syncedAt), ttlHours);

  const record: OfflineActiveContext = {
    id: ACTIVE_CONTEXT_ID,
    userPublicId: String(input.userPublicId).trim(),
    userName: String(input.userName || "").trim(),
    consultancyPublicId: String(input.consultancyPublicId).trim(),
    consultancyName: String(input.consultancyName || "").trim(),
    consultancySlug: String(input.consultancySlug).trim(),
    consultancyLogoUrl: input.consultancyLogoUrl ? String(input.consultancyLogoUrl) : null,
    role: String(input.role || "STUDENT").trim().toUpperCase(),
    syncedAt,
    validUntil,
  };

  const res = await withWriteStore(OFFLINE_CONTEXT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves the raw offline active context without TTL filtering from trevo_offline_v3.
 */
export async function getOfflineActiveContext(): Promise<OfflineActiveContext | null> {
  return await withReadStore(OFFLINE_CONTEXT_STORE, async (store) => {
    return new Promise<OfflineActiveContext | null>((resolve) => {
      const req = store.get(ACTIVE_CONTEXT_ID);
      req.onsuccess = () => resolve((req.result as OfflineActiveContext) || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Retrieves the active offline context ONLY if it exists, is structurally well-formed,
 * and has not expired past its validUntil TTL.
 */
export async function getValidOfflineActiveContext(
  now: Date = new Date()
): Promise<OfflineActiveContext | null> {
  const context = await getOfflineActiveContext();
  if (!context) return null;

  if (!isOfflineContextValid(context, now)) {
    return null;
  }

  return context;
}

/**
 * Clears the active offline context record from trevo_offline_v3.
 */
export async function clearOfflineActiveContext(): Promise<boolean> {
  const res = await withWriteStore(OFFLINE_CONTEXT_STORE, async (store) => {
    store.delete(ACTIVE_CONTEXT_ID);
    return true;
  });

  return Boolean(res);
}
