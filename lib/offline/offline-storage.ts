import type { TrainingPlanDto } from "../consultancies/training";
import type { NutritionPlanDto } from "../consultancies/nutrition";
import {
  type OfflineActiveContext,
  type CreateOfflineActiveContextInput,
  OFFLINE_CONTEXT_STORE,
  ACTIVE_CONTEXT_ID,
  DEFAULT_OFFLINE_TTL_HOURS,
  calculateOfflineValidUntil,
  isOfflineContextValid,
} from "./offline-context";

export const OFFLINE_DB_NAME = "trevo_offline_v1";
export const OFFLINE_DB_VERSION = 2;

export const TRAINING_SNAPSHOT_STORE = "training_snapshots";
export const NUTRITION_SNAPSHOT_STORE = "nutrition_snapshots";

export interface TrainingOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  planPublicId: string;
  activatedAt: string | null;
  syncedAt: string; // ISO 8601 string
  data: TrainingPlanDto;
}

export interface NutritionOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  planPublicId: string;
  activatedAt: string | null;
  syncedAt: string; // ISO 8601 string
  data: NutritionPlanDto;
}

/**
 * Checks if the runtime environment supports IndexedDB.
 */
function isIndexedDBSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    window.indexedDB !== null
  );
}

/**
 * Opens or upgrades the Trevo One Offline IndexedDB database.
 * Returns null gracefully if unavailable or blocked.
 */
function openOfflineDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBSupported()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Training Snapshots store: primary key [userPublicId, consultancyPublicId]
        if (!db.objectStoreNames.contains(TRAINING_SNAPSHOT_STORE)) {
          const trainingStore = db.createObjectStore(TRAINING_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId"],
          });
          trainingStore.createIndex("by_user", "userPublicId", { unique: false });
        }

        // Nutrition Snapshots store: primary key [userPublicId, consultancyPublicId]
        if (!db.objectStoreNames.contains(NUTRITION_SNAPSHOT_STORE)) {
          const nutritionStore = db.createObjectStore(NUTRITION_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId"],
          });
          nutritionStore.createIndex("by_user", "userPublicId", { unique: false });
        }

        // Offline Active Context store (DB v2): single active context record with keyPath "id"
        if (!db.objectStoreNames.contains(OFFLINE_CONTEXT_STORE)) {
          db.createObjectStore(OFFLINE_CONTEXT_STORE, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

// ============================================================================
// OFFLINE ACTIVE CONTEXT API
// ============================================================================

/**
 * Saves or updates the active offline context on the client device.
 * Represents the last successfully authorized user/tenant profile while online.
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

  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OFFLINE_CONTEXT_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_CONTEXT_STORE);

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
        syncedAt,
        validUntil,
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves the raw offline active context without TTL filtering.
 */
export async function getOfflineActiveContext(): Promise<OfflineActiveContext | null> {
  const db = await openOfflineDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OFFLINE_CONTEXT_STORE, "readonly");
      const store = tx.objectStore(OFFLINE_CONTEXT_STORE);
      const getRequest = store.get(ACTIVE_CONTEXT_ID);

      getRequest.onsuccess = () => {
        const result = getRequest.result as OfflineActiveContext | undefined;
        resolve(result || null);
      };

      getRequest.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
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
 * Clears the active offline context record.
 */
export async function clearOfflineActiveContext(): Promise<boolean> {
  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OFFLINE_CONTEXT_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_CONTEXT_STORE);
      const delRequest = store.delete(ACTIVE_CONTEXT_ID);

      delRequest.onsuccess = () => resolve(true);
      delRequest.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// TRAINING SNAPSHOTS API
// ============================================================================

/**
 * Saves or updates a student's active training plan snapshot for a specific consultancy.
 */
export async function saveTrainingSnapshot(
  snapshot: TrainingOfflineSnapshot
): Promise<boolean> {
  if (
    !snapshot ||
    !snapshot.userPublicId ||
    !snapshot.consultancyPublicId ||
    !snapshot.planPublicId ||
    !snapshot.data
  ) {
    return false;
  }

  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TRAINING_SNAPSHOT_STORE, "readwrite");
      const store = tx.objectStore(TRAINING_SNAPSHOT_STORE);

      const record: TrainingOfflineSnapshot = {
        userPublicId: String(snapshot.userPublicId).trim(),
        consultancyPublicId: String(snapshot.consultancyPublicId).trim(),
        planPublicId: String(snapshot.planPublicId).trim(),
        activatedAt: snapshot.activatedAt ? String(snapshot.activatedAt) : null,
        syncedAt: snapshot.syncedAt || new Date().toISOString(),
        data: snapshot.data,
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        resolve(false);
      };

      tx.onabort = () => {
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves the training snapshot for a given user in a specific consultancy.
 * Returns null if not found or if storage is unavailable.
 */
export async function getTrainingSnapshot(
  userPublicId: string,
  consultancyPublicId: string
): Promise<TrainingOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId) {
    return null;
  }

  const db = await openOfflineDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TRAINING_SNAPSHOT_STORE, "readonly");
      const store = tx.objectStore(TRAINING_SNAPSHOT_STORE);
      const getRequest = store.get([userPublicId.trim(), consultancyPublicId.trim()]);

      getRequest.onsuccess = () => {
        const result = getRequest.result as TrainingOfflineSnapshot | undefined;
        resolve(result || null);
      };

      getRequest.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Deletes a specific training snapshot.
 */
export async function deleteTrainingSnapshot(
  userPublicId: string,
  consultancyPublicId: string
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId) {
    return false;
  }

  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TRAINING_SNAPSHOT_STORE, "readwrite");
      const store = tx.objectStore(TRAINING_SNAPSHOT_STORE);
      const delRequest = store.delete([userPublicId.trim(), consultancyPublicId.trim()]);

      delRequest.onsuccess = () => resolve(true);
      delRequest.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// NUTRITION SNAPSHOTS API
// ============================================================================

/**
 * Saves or updates a student's active nutrition plan snapshot for a specific consultancy.
 */
export async function saveNutritionSnapshot(
  snapshot: NutritionOfflineSnapshot
): Promise<boolean> {
  if (
    !snapshot ||
    !snapshot.userPublicId ||
    !snapshot.consultancyPublicId ||
    !snapshot.planPublicId ||
    !snapshot.data
  ) {
    return false;
  }

  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(NUTRITION_SNAPSHOT_STORE, "readwrite");
      const store = tx.objectStore(NUTRITION_SNAPSHOT_STORE);

      const record: NutritionOfflineSnapshot = {
        userPublicId: String(snapshot.userPublicId).trim(),
        consultancyPublicId: String(snapshot.consultancyPublicId).trim(),
        planPublicId: String(snapshot.planPublicId).trim(),
        activatedAt: snapshot.activatedAt ? String(snapshot.activatedAt) : null,
        syncedAt: snapshot.syncedAt || new Date().toISOString(),
        data: snapshot.data,
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        resolve(false);
      };

      tx.onabort = () => {
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves the nutrition snapshot for a given user in a specific consultancy.
 * Returns null if not found or if storage is unavailable.
 */
export async function getNutritionSnapshot(
  userPublicId: string,
  consultancyPublicId: string
): Promise<NutritionOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId) {
    return null;
  }

  const db = await openOfflineDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(NUTRITION_SNAPSHOT_STORE, "readonly");
      const store = tx.objectStore(NUTRITION_SNAPSHOT_STORE);
      const getRequest = store.get([userPublicId.trim(), consultancyPublicId.trim()]);

      getRequest.onsuccess = () => {
        const result = getRequest.result as NutritionOfflineSnapshot | undefined;
        resolve(result || null);
      };

      getRequest.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Deletes a specific nutrition snapshot.
 */
export async function deleteNutritionSnapshot(
  userPublicId: string,
  consultancyPublicId: string
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId) {
    return false;
  }

  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(NUTRITION_SNAPSHOT_STORE, "readwrite");
      const store = tx.objectStore(NUTRITION_SNAPSHOT_STORE);
      const delRequest = store.delete([userPublicId.trim(), consultancyPublicId.trim()]);

      delRequest.onsuccess = () => resolve(true);
      delRequest.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ============================================================================
// PURGE & LOGOUT CLEANUP
// ============================================================================

/**
 * Clears all authenticated offline snapshots for a specific user across all consultancies
 * and clears the active context if it belonged to this user.
 */
export async function clearOfflineDataForUser(userPublicId: string): Promise<boolean> {
  if (!userPublicId) return false;

  const db = await openOfflineDatabase();
  if (!db) return false;

  const stores = [TRAINING_SNAPSHOT_STORE, NUTRITION_SNAPSHOT_STORE];
  let allSuccess = true;

  for (const storeName of stores) {
    try {
      const success = await new Promise<boolean>((resolve) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const index = store.index("by_user");
        const request = index.openCursor(IDBKeyRange.only(userPublicId.trim()));

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve(true);
          }
        };

        request.onerror = () => resolve(false);
      });

      if (!success) allSuccess = false;
    } catch {
      allSuccess = false;
    }
  }

  // Also check if the active context belongs to this user
  try {
    const activeCtx = await getOfflineActiveContext();
    if (activeCtx && activeCtx.userPublicId.trim() === userPublicId.trim()) {
      await clearOfflineActiveContext();
    }
  } catch {
    // Best-effort
  }

  return allSuccess;
}

/**
 * Clears all authenticated offline snapshot stores and active context completely (used during logout).
 * Preserves browser Cache Storage (static assets, brand icons, Service Worker).
 */
export async function clearAllAuthenticatedOfflineData(): Promise<boolean> {
  const db = await openOfflineDatabase();
  if (!db) return false;

  const stores = [TRAINING_SNAPSHOT_STORE, NUTRITION_SNAPSHOT_STORE, OFFLINE_CONTEXT_STORE];

  try {
    const tx = db.transaction(stores, "readwrite");

    for (const storeName of stores) {
      tx.objectStore(storeName).clear();
    }

    return await new Promise<boolean>((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}
