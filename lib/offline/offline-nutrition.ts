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

  const nowIso = new Date().toISOString();
  const record: NutritionOfflineSnapshot = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
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
  consultancyPublicId: string
): Promise<NutritionOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId) return null;

  return await withReadStore(NUTRITION_SNAPSHOT_STORE, async (store) => {
    return new Promise<NutritionOfflineSnapshot | null>((resolve) => {
      const req = store.get([userPublicId.trim(), consultancyPublicId.trim()]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}
