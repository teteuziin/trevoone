/**
 * TREVO ONE — Offline Workouts Engine
 *
 * Provides client-side storage, offline workout execution tracking,
 * and set completion within the scoped user & consultancy namespace.
 */

import {
  WORKOUT_SNAPSHOT_STORE,
  WORKOUT_SESSION_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type {
  WorkoutOfflineSnapshot,
  WorkoutOfflineSession,
} from "./offline-types";
import type { StudentWorkoutViewContract, WorkoutExecutionSessionDto, WorkoutExecutionHistorySessionDto } from "@/lib/training-v2/types";

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

/**
 * Saves or refreshes an active workout snapshot for a student in a consultancy.
 */
export async function saveWorkoutSnapshot(input: {
  userPublicId: string;
  consultancyPublicId: string;
  assignmentPublicId: string;
  workout: StudentWorkoutViewContract;
  initialExecution?: WorkoutExecutionSessionDto | null;
  initialHistory?: WorkoutExecutionHistorySessionDto[];
  sourceVersion?: string | number | null;
}): Promise<boolean> {
  if (!input.userPublicId || !input.consultancyPublicId || !input.assignmentPublicId || !input.workout) {
    return false;
  }

  const record: WorkoutOfflineSnapshot = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    assignmentPublicId: input.assignmentPublicId.trim(),
    workout: input.workout,
    initialExecution: input.initialExecution || null,
    initialHistory: input.initialHistory || [],
    updatedAt: new Date().toISOString(),
    sourceVersion: input.sourceVersion || null,
  };

  const res = await withWriteStore(WORKOUT_SNAPSHOT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves a cached workout snapshot by compound key.
 */
export async function getWorkoutSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  assignmentPublicId: string
): Promise<WorkoutOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId || !assignmentPublicId) return null;

  return await withReadStore(WORKOUT_SNAPSHOT_STORE, async (store) => {
    return new Promise<WorkoutOfflineSnapshot | null>((resolve) => {
      const req = store.get([userPublicId.trim(), consultancyPublicId.trim(), assignmentPublicId.trim()]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Lists all cached workout snapshots for a student in a consultancy.
 */
export async function listWorkoutSnapshots(
  userPublicId: string,
  consultancyPublicId: string
): Promise<WorkoutOfflineSnapshot[]> {
  if (!userPublicId || !consultancyPublicId) return [];

  return (
    (await withReadStore(WORKOUT_SNAPSHOT_STORE, async (store) => {
      return new Promise<WorkoutOfflineSnapshot[]>((resolve) => {
        try {
          const index = store.index("by_user_consultancy");
          const req = index.getAll(IDBKeyRange.only([userPublicId.trim(), consultancyPublicId.trim()]));
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
    })) || []
  );
}

/**
 * Finds an existing IN_PROGRESS offline session or creates a new one.
 */
export async function startOrResumeOfflineWorkoutSession(input: {
  userPublicId: string;
  consultancyPublicId: string;
  assignmentPublicId: string;
  workout: StudentWorkoutViewContract;
  existingServerSession?: WorkoutExecutionSessionDto | null;
}): Promise<WorkoutOfflineSession | null> {
  const { userPublicId, consultancyPublicId, assignmentPublicId, workout, existingServerSession } = input;
  if (!userPublicId || !consultancyPublicId || !assignmentPublicId || !workout) {
    return null;
  }

  // 1. Check if there's already an IN_PROGRESS session stored for this assignment
  const existing = await getActiveOfflineWorkoutSession(userPublicId, consultancyPublicId, assignmentPublicId);
  if (existing) {
    return existing;
  }

  // 2. If the server already had an IN_PROGRESS session, initialize from it
  if (existingServerSession && existingServerSession.status === "IN_PROGRESS") {
    const sessionRecord: WorkoutOfflineSession = {
      clientExecutionId: existingServerSession.publicId || generateUuidV4(),
      sessionPublicId: existingServerSession.publicId,
      userPublicId: userPublicId.trim(),
      consultancyPublicId: consultancyPublicId.trim(),
      assignmentPublicId: assignmentPublicId.trim(),
      status: "IN_PROGRESS",
      startedAt: existingServerSession.startedAt
        ? new Date(existingServerSession.startedAt).toISOString()
        : new Date().toISOString(),
      completedAt: null,
      sets: existingServerSession.sets.map((s) => ({
        setPublicId: s.publicId,
        blockItemPublicId: s.blockItemPublicId || "",
        setNumber: s.setNumber,
        setType: s.setType,
        prescribedReps: s.prescribedReps,
        prescribedRepsMax: s.prescribedRepsMax,
        prescribedLoadKg: s.prescribedLoadKg,
        prescribedRestSeconds: s.prescribedRestSeconds,
        actualReps: s.actualReps,
        actualLoadKg: s.actualLoadKg,
        completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
      })),
      updatedAt: new Date().toISOString(),
    };

    await withWriteStore(WORKOUT_SESSION_STORE, async (store) => {
      store.put(sessionRecord);
      return true;
    });

    return sessionRecord;
  }

  // 3. Create a brand-new offline session initialized from prescribed workout blocks
  const newClientExecutionId = generateUuidV4();
  const flattenedSets: WorkoutOfflineSession["sets"] = [];
  let setCounter = 1;

  for (const block of workout.blocks) {
    for (const item of block.items) {
      for (const set of item.sets) {
        flattenedSets.push({
          setPublicId: generateUuidV4(),
          blockItemPublicId: item.publicId,
          setNumber: setCounter++,
          setType: set.setType || "NORMAL",
          prescribedReps: set.targetReps ?? null,
          prescribedRepsMax: set.targetRepsMax ?? null,
          prescribedLoadKg: set.targetLoadKg ?? null,
          prescribedRestSeconds: set.targetRestSeconds ?? null,
          actualReps: null,
          actualLoadKg: null,
          completedAt: null,
        });
      }
    }
  }

  const newSession: WorkoutOfflineSession = {
    clientExecutionId: newClientExecutionId,
    sessionPublicId: undefined, // Not registered on server yet
    userPublicId: userPublicId.trim(),
    consultancyPublicId: consultancyPublicId.trim(),
    assignmentPublicId: assignmentPublicId.trim(),
    status: "IN_PROGRESS",
    startedAt: new Date().toISOString(),
    completedAt: null,
    sets: flattenedSets,
    updatedAt: new Date().toISOString(),
  };

  await withWriteStore(WORKOUT_SESSION_STORE, async (store) => {
    store.put(newSession);
    return true;
  });

  return newSession;
}

/**
 * Gets the current active IN_PROGRESS session for a specific assignment.
 */
export async function getActiveOfflineWorkoutSession(
  userPublicId: string,
  consultancyPublicId: string,
  assignmentPublicId: string
): Promise<WorkoutOfflineSession | null> {
  return await withReadStore(WORKOUT_SESSION_STORE, async (store) => {
    return new Promise<WorkoutOfflineSession | null>((resolve) => {
      try {
        const index = store.index("by_assignment");
        const range = IDBKeyRange.only([userPublicId.trim(), consultancyPublicId.trim(), assignmentPublicId.trim()]);
        const req = index.openCursor(range);

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const val = cursor.value as WorkoutOfflineSession;
            if (val.status === "IN_PROGRESS") {
              resolve(val);
              return;
            }
            cursor.continue();
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Records completed reps and weight for a specific set in an offline session.
 */
export async function completeOfflineSet(
  clientExecutionId: string,
  setPublicId: string,
  input: { actualReps: number; actualLoadKg: number | null }
): Promise<WorkoutOfflineSession | null> {
  return await withWriteStore(WORKOUT_SESSION_STORE, async (store) => {
    return new Promise<WorkoutOfflineSession | null>((resolve) => {
      const getReq = store.get(clientExecutionId);
      getReq.onsuccess = () => {
        const session = getReq.result as WorkoutOfflineSession | undefined;
        if (!session || session.status !== "IN_PROGRESS") {
          resolve(null);
          return;
        }

        const nowIso = new Date().toISOString();
        let found = false;

        session.sets = session.sets.map((s) => {
          if (s.setPublicId === setPublicId) {
            found = true;
            return {
              ...s,
              actualReps: input.actualReps,
              actualLoadKg: input.actualLoadKg,
              completedAt: nowIso,
            };
          }
          return s;
        });

        if (!found) {
          resolve(null);
          return;
        }

        session.updatedAt = nowIso;
        store.put(session);
        resolve(session);
      };
      getReq.onerror = () => resolve(null);
    });
  });
}

/**
 * Marks an offline workout session as completed locally and flags it as PENDING_SYNC.
 */
export async function completeOfflineWorkout(
  clientExecutionId: string
): Promise<WorkoutOfflineSession | null> {
  return await withWriteStore(WORKOUT_SESSION_STORE, async (store) => {
    return new Promise<WorkoutOfflineSession | null>((resolve) => {
      const getReq = store.get(clientExecutionId);
      getReq.onsuccess = () => {
        const session = getReq.result as WorkoutOfflineSession | undefined;
        if (!session || session.status !== "IN_PROGRESS") {
          resolve(null);
          return;
        }

        const nowIso = new Date().toISOString();
        session.status = "PENDING_SYNC";
        session.completedAt = nowIso;
        session.updatedAt = nowIso;

        store.put(session);
        resolve(session);
      };
      getReq.onerror = () => resolve(null);
    });
  });
}
