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
  lastSyncAt: string | null;
  errorCount: number;
}) => void;

const syncListeners = new Set<SyncListener>();
let isSyncingActive = false;
let lastSyncTimestamp: string | null = null;

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  // Emit current state immediately
  getPendingOperationsCount().then((count) => {
    listener({
      isSyncing: isSyncingActive,
      pendingCount: count,
      lastSyncAt: lastSyncTimestamp,
      errorCount: 0,
    });
  });

  return () => {
    syncListeners.delete(listener);
  };
}

function notifySyncListeners(errorCount = 0) {
  getPendingOperationsCount().then((pendingCount) => {
    syncListeners.forEach((fn) => {
      try {
        fn({
          isSyncing: isSyncingActive,
          pendingCount,
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
 * Adds an operation to the pending queue with a unique idempotent operationId.
 */
export async function queuePendingOperation<TPayload = Record<string, unknown>>(
  input: Omit<PendingOperation<TPayload>, "operationId" | "createdAt" | "retryCount" | "status">
): Promise<PendingOperation<TPayload> | null> {
  const op: PendingOperation<TPayload> = {
    operationId: generateUuidV4(),
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    consultancySlug: input.consultancySlug.trim(),
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
  consultancyPublicId?: string
): Promise<PendingOperation[]> {
  return (
    (await withReadStore(PENDING_OPERATIONS_STORE, async (store) => {
      return new Promise<PendingOperation[]>((resolve) => {
        try {
          if (userPublicId && consultancyPublicId) {
            const index = store.index("by_user_consultancy");
            const req = index.getAll(IDBKeyRange.only([userPublicId.trim(), consultancyPublicId.trim()]));
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
          const req = store.count();
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
 * Updates status of a queued operation.
 */
export async function updateOperationStatus(
  operationId: string,
  status: OfflineOperationStatus,
  error?: string | null
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
 * Purges all pending operations and offline snapshots for a user across all consultancies.
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
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  if (isSyncingActive) {
    return { synced: 0, failed: 0 };
  }

  isSyncingActive = true;
  notifySyncListeners();

  let synced = 0;
  let failed = 0;

  try {
    const operations = await getPendingOperations();
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
    notifySyncListeners(failed);
  }

  return { synced, failed };
}
