"use client";

import { useEffect, useRef } from "react";
import { getStudentOfflinePrimeDataAction } from "@/lib/offline/offline-prime-actions";

export interface StudentOfflinePrimerProps {
  userPublicId?: string;
  userName?: string;
  consultancyPublicId?: string;
  consultancySlug: string;
  role?: string;
}

export type TrevoPrimeDiagnostics = {
  mounted: boolean;
  hasUserPublicId: boolean;
  hasConsultancyPublicId: boolean;
  roleIsStudent: boolean;
  connectivityConfirmed: boolean;
  throttled: boolean;
  actionStarted: boolean;
  actionSucceeded: boolean;
  workoutReceived: boolean;
  nutritionReceived: boolean;
  formsReceived: boolean;
  evolutionReceived: boolean;
  workoutSaved: boolean;
  nutritionSaved: boolean;
  formsSaved: number;
  evolutionSaved: boolean;
  contextSaved: boolean;
  lastFailureStage: string | null;
};

declare global {
  interface Window {
    __TREVO_PRIME_DIAGNOSTICS__?: TrevoPrimeDiagnostics;
  }
}

const PRIME_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes
const inMemoryThrottleMap = new Map<string, number>();

function getScopedThrottleKey(userPublicId: string, consultancyPublicId: string, role: string): string {
  return `trevo_prime_ts_${userPublicId.trim()}_${consultancyPublicId.trim()}_${role.trim().toUpperCase()}`;
}

function isThrottled(key: string): boolean {
  try {
    const stored = window.sessionStorage?.getItem(key);
    const ts = stored ? Number(stored) : (inMemoryThrottleMap.get(key) || 0);
    if (ts && Date.now() - ts < PRIME_THROTTLE_MS) {
      return true;
    }
  } catch {
    const ts = inMemoryThrottleMap.get(key) || 0;
    if (ts && Date.now() - ts < PRIME_THROTTLE_MS) {
      return true;
    }
  }
  return false;
}

function markThrottled(key: string): void {
  const now = Date.now();
  inMemoryThrottleMap.set(key, now);
  try {
    window.sessionStorage?.setItem(key, String(now));
  } catch {
    // Non-blocking
  }
}

/**
 * StudentOfflinePrimer
 *
 * Runs non-blocking background auto-prime for authenticated STUDENT sessions.
 * Guarantees:
 * - First run right after mount via short non-blocking timer (never blocking initial render).
 * - Partial success handling (Promise.allSettled on server, individual domain processing on client).
 * - Canonical scope isolation (strictly userPublicId + consultancyPublicId UUID + role STUDENT).
 * - Stale data reconciliation (clears inactive prescriptions while strictly preserving pending sync operations).
 * - Safe throttle: updated ONLY upon confirmed successful prime and persistence.
 * - Safe retry on transient network/action failure (up to 2 retries, 3s delay).
 * - Exposes window.__TREVO_PRIME_DIAGNOSTICS__ for internal QA verification.
 */
export function StudentOfflinePrimer({
  userPublicId,
  userName = "Aluno",
  consultancyPublicId,
  consultancySlug,
  role = "STUDENT",
}: StudentOfflinePrimerProps) {
  const isPrimingRef = useRef(false);

  useEffect(() => {
    const diag: TrevoPrimeDiagnostics = {
      mounted: true,
      hasUserPublicId: Boolean(userPublicId && userPublicId !== "student"),
      hasConsultancyPublicId: Boolean(consultancyPublicId),
      roleIsStudent: (role || "STUDENT").trim().toUpperCase() === "STUDENT",
      connectivityConfirmed: false,
      throttled: false,
      actionStarted: false,
      actionSucceeded: false,
      workoutReceived: false,
      nutritionReceived: false,
      formsReceived: false,
      evolutionReceived: false,
      workoutSaved: false,
      nutritionSaved: false,
      formsSaved: 0,
      evolutionSaved: false,
      contextSaved: false,
      lastFailureStage: null,
    };
    if (typeof window !== "undefined") {
      window.__TREVO_PRIME_DIAGNOSTICS__ = diag;
    }

    if (
      typeof window === "undefined" ||
      !userPublicId ||
      userPublicId === "student" ||
      !consultancyPublicId ||
      !consultancySlug ||
      (role || "STUDENT").trim().toUpperCase() !== "STUDENT"
    ) {
      if (!userPublicId || userPublicId === "student") {
        diag.lastFailureStage = "EARLY_RETURN_INVALID_USER_ID";
      } else if (!consultancyPublicId) {
        diag.lastFailureStage = "EARLY_RETURN_INVALID_CONSULTANCY_ID";
      } else if (!consultancySlug) {
        diag.lastFailureStage = "EARLY_RETURN_MISSING_SLUG";
      } else {
        diag.lastFailureStage = "EARLY_RETURN_ROLE_NOT_STUDENT";
      }
      return;
    }

    const uId = userPublicId.trim();
    const cId = consultancyPublicId.trim();
    const activeRole = "STUDENT";
    const throttleKey = getScopedThrottleKey(uId, cId, activeRole);

    let isDisposed = false;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function executePrime(force = false, retryCount = 0) {
      if (isPrimingRef.current || isDisposed) return;

      const throttledNow = isThrottled(throttleKey);
      diag.throttled = throttledNow;
      if (!force && throttledNow) {
        diag.lastFailureStage = "THROTTLED";
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        diag.lastFailureStage = "NAVIGATOR_OFFLINE";
        return;
      }

      isPrimingRef.current = true;
      diag.actionStarted = true;
      diag.lastFailureStage = null;

      try {
        const result = await getStudentOfflinePrimeDataAction(consultancySlug);
        if (isDisposed) {
          isPrimingRef.current = false;
          return;
        }

        if (!result.ok || !result.domains) {
          diag.actionSucceeded = false;
          diag.lastFailureStage = result.error || "PRIME_ACTION_RETURNED_NOT_OK";

          // Retry on failure if under retry limit
          if (retryCount < 2 && !isDisposed) {
            retryTimer = setTimeout(() => {
              executePrime(false, retryCount + 1);
            }, 3000);
          }
          isPrimingRef.current = false;
          return;
        }

        diag.actionSucceeded = true;
        diag.connectivityConfirmed = true;

        const { domains } = result;

        // 1. RECONCILE & PERSIST OFFLINE CONTEXT FIRST
        const { saveOfflineActiveContext } = await import("@/lib/offline/offline-context");
        const contextSaved = await saveOfflineActiveContext({
          userPublicId: uId,
          userName: userName || "Aluno",
          consultancyPublicId: cId,
          consultancySlug: result.scope?.consultancySlug || consultancySlug,
          consultancyName: result.scope?.consultancyName || "Trevo One",
          consultancyLogoUrl: result.scope?.consultancyLogoUrl || null,
          role: activeRole,
        });
        diag.contextSaved = contextSaved;

        // 2. RECONCILE WORKOUT DOMAIN
        if (domains.workout.status === "FULFILLED") {
          const wData = domains.workout.data;
          diag.workoutReceived = Boolean(wData.active && wData.workout);

          const {
            saveWorkoutSnapshot,
            clearWorkoutSnapshotsForScope,
          } = await import("@/lib/offline/offline-workouts");

          if (wData.active && wData.workout && wData.assignmentPublicId) {
            const saved = await saveWorkoutSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              assignmentPublicId: wData.assignmentPublicId,
              workout: wData.workout,
              initialExecution: wData.initialExecution,
              initialHistory: wData.initialHistory,
            });
            diag.workoutSaved = saved;
          } else if (wData.active === false) {
            await clearWorkoutSnapshotsForScope(uId, cId, activeRole);
            diag.workoutSaved = true;
          }
        } else {
          diag.workoutReceived = false;
        }

        // 3. RECONCILE NUTRITION DOMAIN
        if (domains.nutrition.status === "FULFILLED") {
          const nData = domains.nutrition.data;
          diag.nutritionReceived = Boolean(nData.active && nData.data);

          const {
            saveNutritionSnapshot,
            deleteNutritionSnapshot,
          } = await import("@/lib/offline/offline-nutrition");

          if (nData.active && nData.planPublicId && nData.data) {
            const saved = await saveNutritionSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              planPublicId: nData.planPublicId,
              planTitle: nData.planTitle || "Plano Alimentar",
              planSubtitle: nData.planSubtitle,
              data: nData.data,
            });
            diag.nutritionSaved = saved;
          } else if (nData.active === false) {
            await deleteNutritionSnapshot(uId, cId, activeRole);
            diag.nutritionSaved = true;
          }
        } else {
          diag.nutritionReceived = false;
        }

        // 4. RECONCILE FORMS DOMAIN
        if (domains.forms.status === "FULFILLED") {
          const fData = domains.forms.data;
          diag.formsReceived = Boolean(fData.active && Array.isArray(fData.templates) && fData.templates.length > 0);

          const {
            saveFormSnapshot,
            listFormSnapshots,
            deleteFormSnapshot,
          } = await import("@/lib/offline/offline-forms");

          let formsSavedCount = 0;
          if (fData.active && Array.isArray(fData.templates)) {
            const activeTemplateIds = new Set<string>();

            for (const t of fData.templates) {
              if (t && t.publicId) {
                activeTemplateIds.add(t.publicId);
                const s = await saveFormSnapshot({
                  userPublicId: uId,
                  consultancyPublicId: cId,
                  role: activeRole,
                  templatePublicId: t.publicId,
                  title: t.title,
                  description: t.description || null,
                  fields: t.fields || [],
                  isOnboardingRequired: t.isOnboardingRequired,
                });
                if (s) formsSavedCount++;
              }
            }

            const existingFormSnapshots = await listFormSnapshots(uId, cId, activeRole);
            for (const snap of existingFormSnapshots) {
              if (!activeTemplateIds.has(snap.templatePublicId)) {
                await deleteFormSnapshot(uId, cId, snap.templatePublicId, activeRole);
              }
            }
          }
          diag.formsSaved = formsSavedCount;
        } else {
          diag.formsReceived = false;
        }

        // 5. RECONCILE EVOLUTION DOMAIN
        if (domains.evolution.status === "FULFILLED") {
          const eData = domains.evolution.data;
          diag.evolutionReceived = Boolean(eData.active && eData.evolution);

          const {
            saveEvolutionSnapshot,
            clearEvolutionSnapshot,
          } = await import("@/lib/offline/offline-evolution");

          if (eData.active && eData.evolution) {
            const saved = await saveEvolutionSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              hubData: eData.evolution,
              comparisonData: null,
            });
            diag.evolutionSaved = saved;
          } else if (eData.active === false) {
            await clearEvolutionSnapshot(uId, cId, activeRole);
            diag.evolutionSaved = true;
          }
        } else {
          diag.evolutionReceived = false;
        }

        // CRITICAL: Throttle ONLY on confirmed success (offline_context valid)
        if (contextSaved) {
          markThrottled(throttleKey);
          diag.throttled = true;
          diag.lastFailureStage = null;
        } else {
          diag.lastFailureStage = "CONTEXT_SAVE_FAILED";
        }
      } catch (err) {
        diag.lastFailureStage = err instanceof Error ? err.message : String(err);
        if (retryCount < 2 && !isDisposed) {
          retryTimer = setTimeout(() => {
            executePrime(false, retryCount + 1);
          }, 3000);
        }
      } finally {
        isPrimingRef.current = false;
      }
    }

    // First-run: execute shortly after mount (non-blocking)
    initialTimer = setTimeout(() => {
      executePrime(false, 0);
    }, 250);

    // Event triggers: Reconnect & Visibility Change
    const handleOnline = () => {
      setTimeout(() => {
        executePrime(false, 0);
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executePrime(false, 0);
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      if (initialTimer) clearTimeout(initialTimer);
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userPublicId, userName, consultancyPublicId, consultancySlug, role]);

  return null;
}
