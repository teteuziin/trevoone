"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  primerMounted?: boolean;
  hasUserPublicId: boolean;
  hasConsultancyPublicId: boolean;
  roleIsStudent: boolean;
  connectivityConfirmed: boolean;
  throttled: boolean;
  actionStarted: boolean;
  actionSucceeded: boolean;
  actionSuccess?: boolean;
  workoutReceived: boolean;
  nutritionReceived: boolean;
  formsReceived: boolean;
  evolutionReceived: boolean;
  workoutSaved: boolean;
  nutritionSaved: boolean;
  formsSaved: number;
  formsSavedCount: number;
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

function createInitialDiag(userPublicId?: string, consultancyPublicId?: string, role?: string): TrevoPrimeDiagnostics {
  return {
    mounted: true,
    primerMounted: true,
    hasUserPublicId: Boolean(userPublicId && userPublicId !== "student"),
    hasConsultancyPublicId: Boolean(consultancyPublicId),
    roleIsStudent: (role || "STUDENT").trim().toUpperCase() === "STUDENT",
    connectivityConfirmed: false,
    throttled: false,
    actionStarted: false,
    actionSucceeded: false,
    actionSuccess: false,
    workoutReceived: false,
    nutritionReceived: false,
    formsReceived: false,
    evolutionReceived: false,
    workoutSaved: false,
    nutritionSaved: false,
    formsSaved: 0,
    formsSavedCount: 0,
    evolutionSaved: false,
    contextSaved: false,
    lastFailureStage: null,
  };
}

const emptySubscribe = () => () => {};

export function StudentOfflinePrimer({
  userPublicId,
  userName = "Aluno",
  consultancyPublicId,
  consultancySlug,
  role = "STUDENT",
}: StudentOfflinePrimerProps) {
  const isPrimingRef = useRef(false);
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [diagState, setDiagState] = useState<TrevoPrimeDiagnostics>(() =>
    createInitialDiag(userPublicId, consultancyPublicId, role)
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const diag = createInitialDiag(userPublicId, consultancyPublicId, role);
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
          diag.formsSavedCount = formsSavedCount;
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
        if (!isDisposed) {
          setDiagState({ ...diag });
        }
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

  if (!isClient) return null;

  return (
    <aside aria-label="Diagnóstico de sincronização" className="fixed bottom-3 left-3 z-[9999] font-mono text-[11px] select-none print:hidden">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-700/50 shadow-md backdrop-blur-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-tight">QA Prime</span>
          <span className="text-[9px] opacity-70">
            {diagState?.actionSuccess || diagState?.actionSucceeded ? "OK" : diagState?.actionStarted ? "RUNNING" : "READY"}
          </span>
        </button>
      ) : (
        <div className="w-72 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1">
            <span className="font-bold text-[10px] tracking-wider text-slate-500 uppercase">QA Primer Online</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
            >
              Fechar
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">PRIMER MOUNTED:</span>
            <span className="font-bold text-emerald-600">YES</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ACTION STARTED:</span>
            <span className={`font-bold ${diagState?.actionStarted ? "text-emerald-600" : "text-amber-500"}`}>
              {diagState?.actionStarted ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ACTION SUCCESS:</span>
            <span className={`font-bold ${diagState?.actionSuccess || diagState?.actionSucceeded ? "text-emerald-600" : "text-red-500"}`}>
              {diagState?.actionSuccess || diagState?.actionSucceeded ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">CONTEXT SAVED:</span>
            <span className={`font-bold ${diagState?.contextSaved ? "text-emerald-600" : "text-red-500"}`}>
              {diagState?.contextSaved ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">WORKOUT SAVED:</span>
            <span className={`font-bold ${diagState?.workoutSaved ? "text-emerald-600" : "text-slate-400"}`}>
              {diagState?.workoutSaved ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">NUTRITION SAVED:</span>
            <span className={`font-bold ${diagState?.nutritionSaved ? "text-emerald-600" : "text-slate-400"}`}>
              {diagState?.nutritionSaved ? "YES" : "NO"}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 mt-0.5">
            <span className="text-slate-500">LAST FAILURE:</span>
            <span className="font-bold text-red-500 truncate max-w-[140px]">
              {diagState?.lastFailureStage || "NONE"}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
