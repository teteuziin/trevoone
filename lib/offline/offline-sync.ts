/**
 * TREVO ONE — Offline Synchronization Engine
 *
 * Coordinates offline operation queuing, conflict detection,
 * idempotent server syncing, retry logic with backoff, and reactive event notification.
 */

import {
  PENDING_OPERATIONS_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type {
  PendingOperation,
  OfflineOperationStatus,
} from "./offline-types";

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Simple in-memory listener set for reactive UI updates
type SyncListener = (status: {
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  errorCount: number;
}) => void;

const syncListeners = new Set<SyncListener>();
let isSyncingActive = false;
let lastSyncTimestamp: string | null = null;

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  // Emit current state immediately
  Promise.all([getPendingOperationsCount(), getConflictOperationsCount()]).then(([pCount, cCount]) => {
    listener({
      isSyncing: isSyncingActive,
      pendingCount: pCount,
      conflictCount: cCount,
      lastSyncAt: lastSyncTimestamp,
      errorCount: 0,
    });
  });

  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncListeners(errorCount = 0) {
  Promise.all([getPendingOperationsCount(), getConflictOperationsCount()]).then(([pendingCount, conflictCount]) => {
    syncListeners.forEach((fn) => {
      try {
        fn({
          isSyncing: isSyncingActive,
          pendingCount,
          conflictCount,
          lastSyncAt: lastSyncTimestamp,
          errorCount,
        });
      } catch {
        // Safe emission
      }
    });
  });
}

/**
 * Adds an operation to the pending queue with a unique idempotent operationId and clientOperationId.
 */
export async function queuePendingOperation<TPayload = Record<string, unknown>>(
  input: Omit<PendingOperation<TPayload>, "operationId" | "clientOperationId" | "createdAt" | "retryCount" | "status"> & {
    clientOperationId?: string;
    role?: string;
  }
): Promise<PendingOperation<TPayload> | null> {
  if (input.userPublicId === "student") {
    return null;
  }

  const opId = input.clientOperationId || generateUuidV4();
  const role = String(input.role || "STUDENT").trim().toUpperCase();

  const op: PendingOperation<TPayload> = {
    operationId: opId,
    clientOperationId: opId,
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    consultancySlug: input.consultancySlug.trim(),
    role,
    entityType: input.entityType,
    entityId: input.entityId.trim(),
    operationType: input.operationType,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    baseVersion: input.baseVersion || null,
    retryCount: 0,
    status: "PENDING",
    lastAttemptAt: null,
    errorMessage: null,
    conflictDetails: null,
  };

  const res = await withWriteStore(PENDING_OPERATIONS_STORE, async (store) => {
    store.put(op);
    return op;
  });

  notifySyncListeners();
  return res || null;
}

/**
 * Retrieves all pending operations for a student in a consultancy (or all if omitted).
 */
export async function getPendingOperations(
  userPublicId?: string,
  consultancyPublicId?: string,
  role?: string
): Promise<PendingOperation[]> {
  return (
    (await withReadStore(PENDING_OPERATIONS_STORE, async (store) => {
      return new Promise<PendingOperation[]>((resolve) => {
        try {
          if (userPublicId && consultancyPublicId && role) {
            const index = store.index("by_scope");
            const req = index.getAll(
              IDBKeyRange.only([userPublicId.trim(), consultancyPublicId.trim(), role.trim().toUpperCase()])
            );
            req.onsuccess = () => resolve((req.result as PendingOperation[]) || []);
            req.onerror = () => resolve([]);
          } else {
            const req = store.getAll();
            req.onsuccess = () => resolve((req.result as PendingOperation[]) || []);
            req.onerror = () => resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    })) || []
  );
}

/**
 * Returns total count of operations currently pending synchronization.
 */
export async function getPendingOperationsCount(): Promise<number> {
  return (
    (await withReadStore(PENDING_OPERATIONS_STORE, async (store) => {
      return new Promise<number>((resolve) => {
        try {
          const index = store.index("by_status");
          const req = index.count(IDBKeyRange.only("PENDING"));
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    })) || 0
  );
}

/**
 * Returns total count of operations currently marked as CONFLICT.
 */
export async function getConflictOperationsCount(): Promise<number> {
  return (
    (await withReadStore(PENDING_OPERATIONS_STORE, async (store) => {
      return new Promise<number>((resolve) => {
        try {
          const index = store.index("by_status");
          const req = index.count(IDBKeyRange.only("CONFLICT"));
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    })) || 0
  );
}

/**
 * Recovers any operations left in SYNCING state back to PENDING.
 */
export async function recoverOrphanSyncingOperations(): Promise<number> {
  const res = await withWriteStore(PENDING_OPERATIONS_STORE, async (store) => {
    return new Promise<number>((resolve) => {
      let recovered = 0;
      const index = store.index("by_status");
      const req = index.openCursor(IDBKeyRange.only("SYNCING"));

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const op = cursor.value as PendingOperation;
          op.status = "PENDING";
          cursor.update(op);
          recovered++;
          cursor.continue();
        } else {
          resolve(recovered);
        }
      };
      req.onerror = () => resolve(0);
    });
  });

  if (res && res > 0) {
    notifySyncListeners();
  }
  return res || 0;
}

/**
 * Updates status of a queued operation.
 */
export async function updateOperationStatus(
  operationId: string,
  status: OfflineOperationStatus,
  error?: string | null,
  conflictDetails?: PendingOperation["conflictDetails"]
): Promise<boolean> {
  const res = await withWriteStore(PENDING_OPERATIONS_STORE, async (store) => {
    return new Promise<boolean>((resolve) => {
      const getReq = store.get(operationId);
      getReq.onsuccess = () => {
        const op = getReq.result as PendingOperation | undefined;
        if (!op) {
          resolve(false);
          return;
        }

        op.status = status;
        op.lastAttemptAt = new Date().toISOString();
        if (error !== undefined) {
          op.errorMessage = error;
        }
        if (conflictDetails !== undefined) {
          op.conflictDetails = conflictDetails;
        }
        if (status === "FAILED") {
          op.retryCount = (op.retryCount || 0) + 1;
        }

        store.put(op);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  });

  notifySyncListeners();
  return Boolean(res);
}

/**
 * Removes a synced operation from the queue.
 */
export async function removePendingOperation(operationId: string): Promise<boolean> {
  const res = await withWriteStore(PENDING_OPERATIONS_STORE, async (store) => {
    store.delete(operationId);
    return true;
  });

  notifySyncListeners();
  return Boolean(res);
}

/**
 * Purges all pending operations and offline snapshots across all consultancies.
 */
export async function clearAllPendingOperations(): Promise<boolean> {
  const res = await withWriteStore(PENDING_OPERATIONS_STORE, async (store) => {
    store.clear();
    return true;
  });

  notifySyncListeners();
  return Boolean(res);
}

/**
 * Main synchronization runner.
 * Dispatches all pending operations using their corresponding server actions.
 */
export async function runOfflineSync(consultancySlug: string): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  if (isSyncingActive) {
    return { synced: 0, failed: 0, conflicts: 0 };
  }

  isSyncingActive = true;
  notifySyncListeners();

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  try {
    // 1. Recover any prior orphan syncing items first
    await recoverOrphanSyncingOperations();

    const operations = await getPendingOperations();
    // Exclude CONFLICT operations from automatic retry loop
    const activeOps = operations.filter((op) => op.status === "PENDING" || op.status === "FAILED");

    // Dynamic imports of server actions to avoid SSR bundle issues
    const { syncOfflineWorkoutExecutionAction } = await import("@/app/consultoria/[slug]/treinos/actions");
    const { submitFormResponsesAction } = await import("@/app/consultoria/[slug]/formularios/actions");

    for (const op of activeOps) {
      // Mark as SYNCING
      await updateOperationStatus(op.operationId, "SYNCING");

      try {
        if (op.entityType === "WORKOUT_EXECUTION" && op.operationType === "COMPLETE_WORKOUT") {
          const payload = op.payload as {
            clientExecutionId: string;
            assignmentPublicId: string;
            startedAt: string;
            completedAt?: string | null;
            sets: Array<{
              setPublicId: string;
              actualReps: number;
              actualLoadKg: number | null;
              completedAt?: string | null;
            }>;
          };

          const res = await syncOfflineWorkoutExecutionAction(
            op.consultancySlug || consultancySlug,
            {
              operationId: op.operationId,
              clientExecutionId: payload.clientExecutionId,
              assignmentPublicId: payload.assignmentPublicId,
              startedAt: payload.startedAt,
              completedAt: payload.completedAt || new Date().toISOString(),
              sets: payload.sets,
            }
          );

          if (res.success) {
            await removePendingOperation(op.operationId);
            synced++;
          } else {
            await updateOperationStatus(op.operationId, "FAILED", res.error || "Erro ao sincronizar treino.");
            failed++;
          }
        } else if (op.entityType === "FORM_SUBMISSION" && op.operationType === "SUBMIT_FORM") {
          const payload = op.payload as {
            requestPublicId: string;
            responses: Record<string, unknown>;
          };

          const res = await submitFormResponsesAction(
            op.consultancySlug || consultancySlug,
            payload.requestPublicId,
            { responses: payload.responses }
          );

          if (res.success) {
            await removePendingOperation(op.operationId);
            synced++;
          } else if ((res as { conflict?: boolean }).conflict) {
            await updateOperationStatus(op.operationId, "CONFLICT", res.error, {
              serverStatus: (res as { serverStatus?: string }).serverStatus,
              reason: res.error,
              serverTimestamp: new Date().toISOString(),
            });
            conflicts++;
          } else {
            await updateOperationStatus(op.operationId, "FAILED", res.error || "Erro ao sincronizar formulário.");
            failed++;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro inesperado na sincronização.";
        await updateOperationStatus(op.operationId, "FAILED", msg);
        failed++;
      }
    }

    lastSyncTimestamp = new Date().toISOString();
  } finally {
    isSyncingActive = false;
    notifySyncListeners(failed + conflicts);
  }

  return { synced, failed, conflicts };
}
