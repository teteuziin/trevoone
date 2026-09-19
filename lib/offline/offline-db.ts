/**
 * TREVO ONE — Centralized Offline Database Manager (IndexedDB)
 *
 * Core Principles:
 * - Versioned IndexedDB schema (OFFLINE_DB_VERSION).
 * - Multi-tenant, user-scoped keypaths and indices.
 * - Zero global or un-scoped authenticated data leakage.
 * - Graceful fallback in environments without IndexedDB (SSR, private windows).
 */

export const OFFLINE_DB_NAME = "trevo_offline_v3";
export const OFFLINE_DB_VERSION = 3;

// Object store names
export const WORKOUT_SNAPSHOT_STORE = "workout_snapshots";
export const WORKOUT_SESSION_STORE = "workout_sessions";
export const PENDING_OPERATIONS_STORE = "pending_operations";
export const NUTRITION_SNAPSHOT_STORE = "nutrition_snapshots";
export const FORM_SNAPSHOT_STORE = "form_snapshots";
export const FORM_DRAFT_STORE = "form_drafts";
export const OFFLINE_METADATA_STORE = "offline_metadata";
export const OFFLINE_CONTEXT_STORE = "offline_context";

export const ALL_OFFLINE_STORES = [
  WORKOUT_SNAPSHOT_STORE,
  WORKOUT_SESSION_STORE,
  PENDING_OPERATIONS_STORE,
  NUTRITION_SNAPSHOT_STORE,
  FORM_SNAPSHOT_STORE,
  FORM_DRAFT_STORE,
  OFFLINE_METADATA_STORE,
  OFFLINE_CONTEXT_STORE,
] as const;

export function isIndexedDBSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    window.indexedDB !== null
  );
}

/**
 * Opens the central Trevo One offline IndexedDB database.
 * Sets up stores and indices cleanly during upgrade.
 */
export function openOfflineDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBSupported()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. workout_snapshots: [userPublicId, consultancyPublicId, assignmentPublicId]
        if (!db.objectStoreNames.contains(WORKOUT_SNAPSHOT_STORE)) {
          const s = db.createObjectStore(WORKOUT_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "assignmentPublicId"],
          });
          s.createIndex("by_user_consultancy", ["userPublicId", "consultancyPublicId"], {
            unique: false,
          });
        }

        // 2. workout_sessions: clientExecutionId (UUID)
        if (!db.objectStoreNames.contains(WORKOUT_SESSION_STORE)) {
          const s = db.createObjectStore(WORKOUT_SESSION_STORE, {
            keyPath: "clientExecutionId",
          });
          s.createIndex("by_user_consultancy", ["userPublicId", "consultancyPublicId"], {
            unique: false,
          });
          s.createIndex("by_assignment", ["userPublicId", "consultancyPublicId", "assignmentPublicId"], {
            unique: false,
          });
          s.createIndex("by_status", "status", { unique: false });
        }

        // 3. pending_operations: operationId (UUID)
        if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
          const s = db.createObjectStore(PENDING_OPERATIONS_STORE, {
            keyPath: "operationId",
          });
          s.createIndex("by_user_consultancy", ["userPublicId", "consultancyPublicId"], {
            unique: false,
          });
          s.createIndex("by_status", "status", { unique: false });
        }

        // 4. nutrition_snapshots: [userPublicId, consultancyPublicId]
        if (!db.objectStoreNames.contains(NUTRITION_SNAPSHOT_STORE)) {
          const s = db.createObjectStore(NUTRITION_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId"],
          });
          s.createIndex("by_user", "userPublicId", { unique: false });
        }

        // 5. form_snapshots: [userPublicId, consultancyPublicId, templatePublicId]
        if (!db.objectStoreNames.contains(FORM_SNAPSHOT_STORE)) {
          const s = db.createObjectStore(FORM_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "templatePublicId"],
          });
          s.createIndex("by_user_consultancy", ["userPublicId", "consultancyPublicId"], {
            unique: false,
          });
        }

        // 6. form_drafts: [userPublicId, consultancyPublicId, requestPublicId]
        if (!db.objectStoreNames.contains(FORM_DRAFT_STORE)) {
          const s = db.createObjectStore(FORM_DRAFT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "requestPublicId"],
          });
          s.createIndex("by_user_consultancy", ["userPublicId", "consultancyPublicId"], {
            unique: false,
          });
        }

        // 7. offline_metadata: key
        if (!db.objectStoreNames.contains(OFFLINE_METADATA_STORE)) {
          db.createObjectStore(OFFLINE_METADATA_STORE, {
            keyPath: "key",
          });
        }

        // 8. offline_context: id
        if (!db.objectStoreNames.contains(OFFLINE_CONTEXT_STORE)) {
          db.createObjectStore(OFFLINE_CONTEXT_STORE, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        resolve(null);
      };

      request.onblocked = (event) => {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Executes a read-only transaction on a specific store.
 */
export async function withReadStore<R>(
  storeName: string,
  fn: (store: IDBObjectStore) => Promise<R>
): Promise<R | null> {
  const db = await openOfflineDatabase();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;

  try {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    return await fn(store);
  } catch {
    return null;
  }
}

/**
 * Executes a read-write transaction on a specific store.
 */
export async function withWriteStore<R>(
  storeName: string,
  fn: (store: IDBObjectStore) => Promise<R>
): Promise<R | null> {
  const db = await openOfflineDatabase();
  if (!db || !db.objectStoreNames.contains(storeName)) return null;

  try {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const result = await fn(store);
    return await new Promise<R | null>((resolve) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Purges all authenticated offline snapshot stores, pending operations, drafts,
 * and context records from all offline databases (v3 and legacy v1).
 * Preserves browser Cache Storage (static assets, brand icons, Service Worker).
 */
export async function clearAllAuthenticatedOfflineData(): Promise<boolean> {
  const db = await openOfflineDatabase();
  let success = true;

  if (db) {
    try {
      const stores = Array.from(db.objectStoreNames);
      if (stores.length > 0) {
        const tx = db.transaction(stores, "readwrite");
        for (const storeName of stores) {
          tx.objectStore(storeName).clear();
        }
        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        });
      }
    } catch {
      success = false;
    }
  }

  // Also clean legacy v1 database if present
  try {
    if (typeof window !== "undefined" && window.indexedDB) {
      window.indexedDB.deleteDatabase("trevo_offline_v1");
    }
  } catch {
    // Best-effort
  }

  return success;
}

/**
 * Clears offline data for a specific user across all stores in trevo_offline_v3.
 */
export async function clearOfflineDataForUser(userPublicId: string): Promise<boolean> {
  if (!userPublicId) return false;
  const db = await openOfflineDatabase();
  if (!db) return false;

  const candidateStores = [
    WORKOUT_SNAPSHOT_STORE,
    WORKOUT_SESSION_STORE,
    PENDING_OPERATIONS_STORE,
    NUTRITION_SNAPSHOT_STORE,
    FORM_SNAPSHOT_STORE,
    FORM_DRAFT_STORE,
  ];

  for (const storeName of candidateStores) {
    try {
      if (!db.objectStoreNames.contains(storeName)) continue;
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      const req = store.openCursor();
      await new Promise<void>((resolve) => {
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const val = cursor.value;
            if (val && val.userPublicId === userPublicId.trim()) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => resolve();
      });
    } catch {
      // Continue best-effort
    }
  }

  return true;
}

