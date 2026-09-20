"use client";

import { useEffect, useRef } from "react";
import { getStudentOfflinePrimeDataAction } from "@/lib/offline/offline-prime-actions";
import { checkRealConnectivity } from "@/lib/offline/offline-connectivity";

export interface StudentOfflinePrimerProps {
  userPublicId?: string;
  consultancyPublicId?: string;
  consultancySlug: string;
  role?: string;
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
 * - Safe throttle (15m per user + consultancy scope).
 */
export function StudentOfflinePrimer({
  userPublicId,
  consultancyPublicId,
  consultancySlug,
  role = "STUDENT",
}: StudentOfflinePrimerProps) {
  const isPrimingRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !userPublicId ||
      userPublicId === "student" ||
      !consultancyPublicId ||
      !consultancySlug ||
      (role || "STUDENT").trim().toUpperCase() !== "STUDENT"
    ) {
      return;
    }

    const uId = userPublicId.trim();
    const cId = consultancyPublicId.trim();
    const activeRole = "STUDENT";
    const throttleKey = getScopedThrottleKey(uId, cId, activeRole);

    let isDisposed = false;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;

    async function executePrime(force = false) {
      if (isPrimingRef.current || isDisposed) return;
      if (!force && isThrottled(throttleKey)) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      isPrimingRef.current = true;

      try {
        // Quick connectivity confirmation before fetching
        const isReachable = await checkRealConnectivity(3000);
        if (!isReachable || isDisposed) {
          isPrimingRef.current = false;
          return;
        }

        const result = await getStudentOfflinePrimeDataAction(consultancySlug);
        if (!result.ok || !result.domains || isDisposed) {
          isPrimingRef.current = false;
          return;
        }

        // Record successful throttle timestamp for this scope
        markThrottled(throttleKey);

        const { domains } = result;

        // 1. RECONCILE WORKOUT DOMAIN
        if (domains.workout.status === "FULFILLED") {
          const wData = domains.workout.data;
          const {
            saveWorkoutSnapshot,
            clearWorkoutSnapshotsForScope,
          } = await import("@/lib/offline/offline-workouts");

          if (wData.active && wData.workout && wData.assignmentPublicId) {
            await saveWorkoutSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              assignmentPublicId: wData.assignmentPublicId,
              workout: wData.workout,
              initialExecution: wData.initialExecution,
              initialHistory: wData.initialHistory,
            });
          } else if (wData.active === false) {
            // Reconcile stale: server confirmed no active workout prescription
            await clearWorkoutSnapshotsForScope(uId, cId, activeRole);
          }
        }

        // 2. RECONCILE NUTRITION DOMAIN
        if (domains.nutrition.status === "FULFILLED") {
          const nData = domains.nutrition.data;
          const {
            saveNutritionSnapshot,
            deleteNutritionSnapshot,
          } = await import("@/lib/offline/offline-nutrition");

          if (nData.active && nData.planPublicId && nData.data) {
            await saveNutritionSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              planPublicId: nData.planPublicId,
              planTitle: nData.planTitle || "Plano Alimentar",
              planSubtitle: nData.planSubtitle,
              data: nData.data,
            });
          } else if (nData.active === false) {
            // Reconcile stale: server confirmed no active nutrition plan
            await deleteNutritionSnapshot(uId, cId, activeRole);
          }
        }

        // 3. RECONCILE FORMS DOMAIN
        if (domains.forms.status === "FULFILLED") {
          const fData = domains.forms.data;
          const {
            saveFormSnapshot,
            listFormSnapshots,
            deleteFormSnapshot,
          } = await import("@/lib/offline/offline-forms");

          if (fData.active && Array.isArray(fData.templates)) {
            const activeTemplateIds = new Set<string>();

            for (const t of fData.templates) {
              if (t && t.publicId) {
                activeTemplateIds.add(t.publicId);
                await saveFormSnapshot({
                  userPublicId: uId,
                  consultancyPublicId: cId,
                  role: activeRole,
                  templatePublicId: t.publicId,
                  title: t.title,
                  description: t.description || null,
                  fields: t.fields || [],
                  isOnboardingRequired: t.isOnboardingRequired,
                });
              }
            }

            // Prune revoked/inactive form template snapshots
            const existingFormSnapshots = await listFormSnapshots(uId, cId, activeRole);
            for (const snap of existingFormSnapshots) {
              if (!activeTemplateIds.has(snap.templatePublicId)) {
                await deleteFormSnapshot(uId, cId, snap.templatePublicId, activeRole);
              }
            }
          }
        }

        // 4. RECONCILE EVOLUTION DOMAIN
        if (domains.evolution.status === "FULFILLED") {
          const eData = domains.evolution.data;
          const {
            saveEvolutionSnapshot,
            clearEvolutionSnapshot,
          } = await import("@/lib/offline/offline-evolution");

          if (eData.active && eData.evolution) {
            await saveEvolutionSnapshot({
              userPublicId: uId,
              consultancyPublicId: cId,
              role: activeRole,
              hubData: eData.evolution,
              comparisonData: null,
            });
          } else if (eData.active === false) {
            await clearEvolutionSnapshot(uId, cId, activeRole);
          }
        }
      } catch (err) {
        // Safe fail-silent: never break online application or spam user toasts
        if (process.env.NODE_ENV !== "production") {
          console.warn("[StudentOfflinePrimer] Prime skipped or failed gracefully:", err);
        }
      } finally {
        isPrimingRef.current = false;
      }
    }

    // First-run: execute shortly after mount (non-blocking)
    initialTimer = setTimeout(() => {
      executePrime(false);
    }, 250);

    // Event triggers: Reconnect & Visibility Change
    const handleOnline = () => {
      // Small debounce after reconnection before executing
      setTimeout(() => {
        executePrime(false);
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executePrime(false);
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      if (initialTimer) clearTimeout(initialTimer);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userPublicId, consultancyPublicId, consultancySlug, role]);

  return null;
}
