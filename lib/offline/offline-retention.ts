/**
 * TREVO ONE — Offline Storage Quota & Retention Engine
 *
 * Enforces safe local storage retention rules:
 * - Keeps at most 5 workout snapshots per scope (LRU by syncedAt)
 * - Retains active nutrition and scalar evolution snapshots
 * - NEVER deletes PENDING, SYNCING, FAILED, or CONFLICT operations
 * - Requests persistent storage when appropriate
 */

import {
  WORKOUT_SNAPSHOT_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type { WorkoutOfflineSnapshot } from "./offline-types";

export interface StorageEstimateResult {
  quotaBytes?: number;
  usageBytes?: number;
  percentageUsed?: number;
  isPersistent?: boolean;
}

/**
 * Checks current browser storage estimate and persistence status.
 */
export async function getStorageEstimate(): Promise<StorageEstimateResult> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return {};
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;
    const percentageUsed = quota > 0 ? (usage / quota) * 100 : 0;

    let isPersistent = false;
    if (navigator.storage.persisted) {
      isPersistent = await navigator.storage.persisted();
    }

    return {
      quotaBytes: quota,
      usageBytes: usage,
      percentageUsed: Math.round(percentageUsed * 10) / 10,
      isPersistent,
    };
  } catch {
    return {};
  }
}

/**
 * Requests storage persistence if not already granted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      return await navigator.storage.persist();
    }
    return true;
  } catch {
    return false;
  }
}

const MAX_WORKOUT_SNAPSHOTS_PER_SCOPE = 5;

/**
 * Applies retention policy on workout snapshots for a specific scope.
 * Retains only the most recent MAX_WORKOUT_SNAPSHOTS_PER_SCOPE records.
 * NEVER touches pending, syncing, failed, or conflict operations.
 */
export async function pruneWorkoutSnapshots(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<number> {
  if (!userPublicId || !consultancyPublicId || userPublicId === "student") {
    return 0;
  }

  const uId = userPublicId.trim();
  const cId = consultancyPublicId.trim();
  const r = role.trim().toUpperCase();

  // 1. Fetch all snapshots for scope
  const allSnapshots = await withReadStore(WORKOUT_SNAPSHOT_STORE, async (store) => {
    return new Promise<WorkoutOfflineSnapshot[]>((resolve) => {
      try {
        const index = store.index("by_scope");
        const req = index.getAll(IDBKeyRange.only([uId, cId, r]));
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  });

  if (!allSnapshots || allSnapshots.length <= MAX_WORKOUT_SNAPSHOTS_PER_SCOPE) {
    return 0;
  }

  // Sort descending by updatedAt
  allSnapshots.sort((a, b) => {
    const ta = new Date(a.updatedAt || 0).getTime();
    const tb = new Date(b.updatedAt || 0).getTime();
    return tb - ta;
  });

  const toRemove = allSnapshots.slice(MAX_WORKOUT_SNAPSHOTS_PER_SCOPE);
  let deletedCount = 0;

  await withWriteStore(WORKOUT_SNAPSHOT_STORE, async (store) => {
    for (const snap of toRemove) {
      store.delete([
        snap.userPublicId,
        snap.consultancyPublicId,
        snap.role,
        snap.assignmentPublicId,
      ]);
      deletedCount++;
    }
  });

  return deletedCount;
}

/**
 * Runs overall storage maintenance (persists + retention eviction).
 */
export async function runStorageMaintenance(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await requestPersistentStorage();
    await pruneWorkoutSnapshots(userPublicId, consultancyPublicId, role);
  } catch {
    // Non-blocking maintenance
  }
}
