/**
 * TREVO ONE — Offline Forms Engine
 *
 * Provides client-side storage for form templates and auto-saves student
 * response drafts in IndexedDB, preventing data loss during offline usage.
 */

import {
  FORM_SNAPSHOT_STORE,
  FORM_DRAFT_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type { FormOfflineSnapshot, FormOfflineDraft } from "./offline-types";

/**
 * Saves a form template snapshot locally.
 */
export async function saveFormSnapshot(input: {
  userPublicId: string;
  consultancyPublicId: string;
  role?: string;
  templatePublicId: string;
  title: string;
  description: string | null;
  fields: unknown[];
  isOnboardingRequired?: boolean;
}): Promise<boolean> {
  if (!input.userPublicId || !input.consultancyPublicId || !input.templatePublicId || input.userPublicId === "student") {
    return false;
  }

  const nowIso = new Date().toISOString();
  const role = String(input.role || "STUDENT").trim().toUpperCase();

  const record: FormOfflineSnapshot = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    role,
    templatePublicId: input.templatePublicId.trim(),
    title: input.title,
    description: input.description || null,
    fields: input.fields || [],
    isOnboardingRequired: Boolean(input.isOnboardingRequired),
    syncedAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await withWriteStore(FORM_SNAPSHOT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves a cached form template snapshot by compound key.
 */
export async function getFormSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  templatePublicId: string,
  role: string = "STUDENT"
): Promise<FormOfflineSnapshot | null> {
  if (!userPublicId || !consultancyPublicId || !templatePublicId || userPublicId === "student") return null;

  return await withReadStore(FORM_SNAPSHOT_STORE, async (store) => {
    return new Promise<FormOfflineSnapshot | null>((resolve) => {
      const req = store.get([
        userPublicId.trim(),
        consultancyPublicId.trim(),
        role.trim().toUpperCase(),
        templatePublicId.trim(),
      ]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Lists all cached form template snapshots for a scope.
 */
export async function listFormSnapshots(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<FormOfflineSnapshot[]> {
  if (!userPublicId || !consultancyPublicId || userPublicId === "student") return [];

  return (
    (await withReadStore(FORM_SNAPSHOT_STORE, async (store) => {
      return new Promise<FormOfflineSnapshot[]>((resolve) => {
        try {
          const index = store.index("by_scope");
          const req = index.getAll(
            IDBKeyRange.only([userPublicId.trim(), consultancyPublicId.trim(), role.trim().toUpperCase()])
          );
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
 * Auto-saves a draft of the student's in-progress responses.
 */
export async function saveFormDraft(input: {
  userPublicId: string;
  consultancyPublicId: string;
  role?: string;
  requestPublicId: string;
  templatePublicId: string;
  responses: Record<string, unknown>;
  isSubmittedOffline?: boolean;
}): Promise<boolean> {
  if (!input.userPublicId || !input.consultancyPublicId || !input.requestPublicId || input.userPublicId === "student") {
    return false;
  }

  const role = String(input.role || "STUDENT").trim().toUpperCase();
  const record: FormOfflineDraft = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    role,
    requestPublicId: input.requestPublicId.trim(),
    templatePublicId: input.templatePublicId.trim(),
    responses: input.responses,
    isSubmittedOffline: Boolean(input.isSubmittedOffline),
    updatedAt: new Date().toISOString(),
  };

  const res = await withWriteStore(FORM_DRAFT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves the saved draft for a form request.
 */
export async function getFormDraft(
  userPublicId: string,
  consultancyPublicId: string,
  requestPublicId: string,
  role: string = "STUDENT"
): Promise<FormOfflineDraft | null> {
  if (!userPublicId || !consultancyPublicId || !requestPublicId || userPublicId === "student") return null;

  return await withReadStore(FORM_DRAFT_STORE, async (store) => {
    return new Promise<FormOfflineDraft | null>((resolve) => {
      const req = store.get([
        userPublicId.trim(),
        consultancyPublicId.trim(),
        role.trim().toUpperCase(),
        requestPublicId.trim(),
      ]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Clears a form draft after successful synchronization / submission.
 */
export async function clearFormDraft(
  userPublicId: string,
  consultancyPublicId: string,
  requestPublicId: string,
  role: string = "STUDENT"
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId || !requestPublicId) return false;

  const res = await withWriteStore(FORM_DRAFT_STORE, async (store) => {
    store.delete([
      userPublicId.trim(),
      consultancyPublicId.trim(),
      role.trim().toUpperCase(),
      requestPublicId.trim(),
    ]);
    return true;
  });

  return Boolean(res);
}
