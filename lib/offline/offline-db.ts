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
export const OFFLINE_DB_VERSION = 4;

// Object store names
export const WORKOUT_SNAPSHOT_STORE = "workout_snapshots";
export const WORKOUT_SESSION_STORE = "workout_sessions";
export const PENDING_OPERATIONS_STORE = "pending_operations";
export const NUTRITION_SNAPSHOT_STORE = "nutrition_snapshots";
export const FORM_SNAPSHOT_STORE = "form_snapshots";
export const FORM_DRAFT_STORE = "form_drafts";
export const EVOLUTION_SNAPSHOT_STORE = "evolution_snapshots";
export const OFFLINE_METADATA_STORE = "offline_metadata";
export const OFFLINE_CONTEXT_STORE = "offline_context";

export const ALL_OFFLINE_STORES = [
  WORKOUT_SNAPSHOT_STORE,
  WORKOUT_SESSION_STORE,
  PENDING_OPERATIONS_STORE,
  NUTRITION_SNAPSHOT_STORE,
  FORM_SNAPSHOT_STORE,
  FORM_DRAFT_STORE,
  EVOLUTION_SNAPSHOT_STORE,
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
 * Recovers any operations left in SYNCING state (e.g. if the tab was closed or crashed).
 * Resets them to PENDING so they are never permanently orphaned.
 */
async function recoverOrphanSyncing(db: IDBDatabase): Promise<void> {
  if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) return;
  try {
    const tx = db.transaction(PENDING_OPERATIONS_STORE, "readwrite");
    const store = tx.objectStore(PENDING_OPERATIONS_STORE);
    const req = store.openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const val = cursor.value;
        if (val && val.status === "SYNCING") {
          val.status = "PENDING";
          cursor.update(val);
        }
        cursor.continue();
      }
    };
  } catch {
    // Best-effort
  }
}

/**
 * Removes any legacy records that were saved with insecure mock strings like "student".
 */
async function purgeLegacyMockRecords(db: IDBDatabase): Promise<void> {
  const candidateStores = [WORKOUT_SESSION_STORE, PENDING_OPERATIONS_STORE];
  for (const storeName of candidateStores) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const val = cursor.value;
          if (val && (val.userPublicId === "student" || val.consultancyPublicId === "consultancy")) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch {
      // Best-effort
    }
  }
}

/**
 * Opens the central Trevo One offline IndexedDB database.
 * Sets up stores and role-scoped indices cleanly during upgrade.
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
        const tx = (event.target as IDBOpenDBRequest).transaction;

        // 1. workout_snapshots: [userPublicId, consultancyPublicId, role, assignmentPublicId]
        if (db.objectStoreNames.contains(WORKOUT_SNAPSHOT_STORE)) {
          if (event.oldVersion < 4) {
            const oldStore = tx!.objectStore(WORKOUT_SNAPSHOT_STORE);
            const getReq = oldStore.getAll();
            getReq.onsuccess = () => {
              try {
                db.deleteObjectStore(WORKOUT_SNAPSHOT_STORE);
                const sWs = db.createObjectStore(WORKOUT_SNAPSHOT_STORE, {
                  keyPath: ["userPublicId", "consultancyPublicId", "role", "assignmentPublicId"],
                });
                sWs.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
                  unique: false,
                });
                for (const rec of (getReq.result || [])) {
                  if (rec && rec.userPublicId && rec.userPublicId !== "student" && rec.consultancyPublicId && rec.assignmentPublicId) {
                    rec.role = rec.role || "STUDENT";
                    sWs.put(rec);
                  }
                }
              } catch {
                // Safeguard against browser-specific versionchange state issues
              }
            };
          }
        } else {
          const sWs = db.createObjectStore(WORKOUT_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "role", "assignmentPublicId"],
          });
          sWs.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }

        // 2. workout_sessions: clientExecutionId (UUID)
        let sSess: IDBObjectStore;
        if (!db.objectStoreNames.contains(WORKOUT_SESSION_STORE)) {
          sSess = db.createObjectStore(WORKOUT_SESSION_STORE, {
            keyPath: "clientExecutionId",
          });
        } else {
          sSess = tx!.objectStore(WORKOUT_SESSION_STORE);
        }
        if (!sSess.indexNames.contains("by_scope")) {
          sSess.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }
        if (!sSess.indexNames.contains("by_assignment")) {
          sSess.createIndex("by_assignment", ["userPublicId", "consultancyPublicId", "role", "assignmentPublicId"], {
            unique: false,
          });
        }
        if (!sSess.indexNames.contains("by_status")) {
          sSess.createIndex("by_status", "status", { unique: false });
        }

        // 3. pending_operations: operationId (UUID)
        let sOps: IDBObjectStore;
        if (!db.objectStoreNames.contains(PENDING_OPERATIONS_STORE)) {
          sOps = db.createObjectStore(PENDING_OPERATIONS_STORE, {
            keyPath: "operationId",
          });
        } else {
          sOps = tx!.objectStore(PENDING_OPERATIONS_STORE);
        }
        if (!sOps.indexNames.contains("by_scope")) {
          sOps.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }
        if (!sOps.indexNames.contains("by_status")) {
          sOps.createIndex("by_status", "status", { unique: false });
        }
        if (!sOps.indexNames.contains("by_client_op_id")) {
          sOps.createIndex("by_client_op_id", "clientOperationId", { unique: false });
        }

        // 4. nutrition_snapshots: [userPublicId, consultancyPublicId, role]
        if (db.objectStoreNames.contains(NUTRITION_SNAPSHOT_STORE)) {
          if (event.oldVersion < 4) {
            const oldStore = tx!.objectStore(NUTRITION_SNAPSHOT_STORE);
            const getReq = oldStore.getAll();
            getReq.onsuccess = () => {
              try {
                db.deleteObjectStore(NUTRITION_SNAPSHOT_STORE);
                const sNut = db.createObjectStore(NUTRITION_SNAPSHOT_STORE, {
                  keyPath: ["userPublicId", "consultancyPublicId", "role"],
                });
                sNut.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
                  unique: false,
                });
                sNut.createIndex("by_user", "userPublicId", { unique: false });
                for (const rec of (getReq.result || [])) {
                  if (rec && rec.userPublicId && rec.userPublicId !== "student" && rec.consultancyPublicId) {
                    rec.role = rec.role || "STUDENT";
                    sNut.put(rec);
                  }
                }
              } catch {
                // Safeguard
              }
            };
          }
        } else {
          const sNut = db.createObjectStore(NUTRITION_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "role"],
          });
          sNut.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
          sNut.createIndex("by_user", "userPublicId", { unique: false });
        }

        // 5. form_snapshots: [userPublicId, consultancyPublicId, role, templatePublicId]
        if (db.objectStoreNames.contains(FORM_SNAPSHOT_STORE)) {
          if (event.oldVersion < 4) {
            const oldStore = tx!.objectStore(FORM_SNAPSHOT_STORE);
            const getReq = oldStore.getAll();
            getReq.onsuccess = () => {
              try {
                db.deleteObjectStore(FORM_SNAPSHOT_STORE);
                const sForm = db.createObjectStore(FORM_SNAPSHOT_STORE, {
                  keyPath: ["userPublicId", "consultancyPublicId", "role", "templatePublicId"],
                });
                sForm.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
                  unique: false,
                });
                for (const rec of (getReq.result || [])) {
                  if (rec && rec.userPublicId && rec.userPublicId !== "student" && rec.consultancyPublicId && rec.templatePublicId) {
                    rec.role = rec.role || "STUDENT";
                    sForm.put(rec);
                  }
                }
              } catch {
                // Safeguard
              }
            };
          }
        } else {
          const sForm = db.createObjectStore(FORM_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "role", "templatePublicId"],
          });
          sForm.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }

        // 6. form_drafts: [userPublicId, consultancyPublicId, role, requestPublicId]
        if (db.objectStoreNames.contains(FORM_DRAFT_STORE)) {
          if (event.oldVersion < 4) {
            const oldStore = tx!.objectStore(FORM_DRAFT_STORE);
            const getReq = oldStore.getAll();
            getReq.onsuccess = () => {
              try {
                db.deleteObjectStore(FORM_DRAFT_STORE);
                const sDraft = db.createObjectStore(FORM_DRAFT_STORE, {
                  keyPath: ["userPublicId", "consultancyPublicId", "role", "requestPublicId"],
                });
                sDraft.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
                  unique: false,
                });
                for (const rec of (getReq.result || [])) {
                  if (rec && rec.userPublicId && rec.userPublicId !== "student" && rec.consultancyPublicId && rec.requestPublicId) {
                    rec.role = rec.role || "STUDENT";
                    sDraft.put(rec);
                  }
                }
              } catch {
                // Safeguard
              }
            };
          }
        } else {
          const sDraft = db.createObjectStore(FORM_DRAFT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "role", "requestPublicId"],
          });
          sDraft.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }

        // 7. evolution_snapshots: [userPublicId, consultancyPublicId, role]
        if (!db.objectStoreNames.contains(EVOLUTION_SNAPSHOT_STORE)) {
          const sEv = db.createObjectStore(EVOLUTION_SNAPSHOT_STORE, {
            keyPath: ["userPublicId", "consultancyPublicId", "role"],
          });
          sEv.createIndex("by_scope", ["userPublicId", "consultancyPublicId", "role"], {
            unique: false,
          });
        }

        // 8. offline_metadata: key
        if (!db.objectStoreNames.contains(OFFLINE_METADATA_STORE)) {
          db.createObjectStore(OFFLINE_METADATA_STORE, {
            keyPath: "key",
          });
        }

        // 9. offline_context: id
        if (!db.objectStoreNames.contains(OFFLINE_CONTEXT_STORE)) {
          db.createObjectStore(OFFLINE_CONTEXT_STORE, {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        // Execute background orphan recovery & hygiene
        recoverOrphanSyncing(db);
        purgeLegacyMockRecords(db);

        // Safe removal of legacy database v1
        try {
          if (typeof window !== "undefined" && window.indexedDB) {
            window.indexedDB.deleteDatabase("trevo_offline_v1");
          }
        } catch {
          // Best-effort
        }

        resolve(db);
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
 * Clears offline data for a specific scope (userPublicId + consultancyPublicId + role).
 */
export async function clearOfflineDataForScope(
  userPublicId: string,
  consultancyPublicId: string,
  role: string
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId || !role) return false;
  const db = await openOfflineDatabase();
  if (!db) return false;

  const candidateStores = [
    WORKOUT_SNAPSHOT_STORE,
    WORKOUT_SESSION_STORE,
    PENDING_OPERATIONS_STORE,
    NUTRITION_SNAPSHOT_STORE,
    FORM_SNAPSHOT_STORE,
    FORM_DRAFT_STORE,
    EVOLUTION_SNAPSHOT_STORE,
  ];

  const uId = userPublicId.trim();
  const cId = consultancyPublicId.trim();
  const rCode = role.trim().toUpperCase();

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
            if (
              val &&
              val.userPublicId === uId &&
              val.consultancyPublicId === cId &&
              val.role === rCode
            ) {
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
    EVOLUTION_SNAPSHOT_STORE,
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
