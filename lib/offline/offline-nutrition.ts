/**
 * TREVO ONE — Offline Nutrition Storage Engine
 *
 * Provides client-side storage and offline read-only consultation
 * for a student's active meal plan within the scoped user & consultancy namespace.
 */

import {
  NUTRITION_SNAPSHOT_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type { NutritionOfflineSnapshot } from "./offline-types";

/**
 * Saves or updates a student's active meal plan snapshot for a consultancy.
 */
export async function saveNutritionSnapshot(input: {
  userPublicId: string;
  consultancyPublicId: string;
  role?: string;
  planPublicId: string;
  planTitle: string;
  planSubtitle?: string | null;
  data: unknown;
}): Promise<boolean> {
  if (
    !input.userPublicId ||
    !input.consultancyPublicId ||
    !input.planPublicId ||
    !input.data
  ) {
    return false;
  }

  // Reject legacy mock strings
  if (input.userPublicId === "student") {
    return false;
  }

  const nowIso = new Date().toISOString();
  const role = String(input.role || "STUDENT").trim().toUpperCase();

  const record: NutritionOfflineSnapshot = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    role,
    planPublicId: input.planPublicId.trim(),
    planTitle: String(input.planTitle || "Plano Alimentar").trim(),
    planSubtitle: input.planSubtitle ? String(input.planSubtitle).trim() : null,
    data: input.data,
    syncedAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await withWriteStore(NUTRITION_SNAPSHOT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves the cached meal plan snapshot for a student in a consultancy.
 */
export async function getNutritionSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<NutritionOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId || userPublicId === "student") return null;

  return await withReadStore(NUTRITION_SNAPSHOT_STORE, async (store) => {
    return new Promise<NutritionOfflineSnapshot | null>((resolve) => {
      const req = store.get([userPublicId.trim(), consultancyPublicId.trim(), role.trim().toUpperCase()]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Safely removes a nutrition snapshot when authoritative server confirms no active plan exists.
 */
export async function deleteNutritionSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId || userPublicId === "student") return false;

  const res = await withWriteStore(NUTRITION_SNAPSHOT_STORE, async (store) => {
    store.delete([userPublicId.trim(), consultancyPublicId.trim(), role.trim().toUpperCase()]);
    return true;
  });

  return Boolean(res);
}
