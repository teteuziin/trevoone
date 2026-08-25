"use client";

import { useEffect, useRef } from "react";
import type { TrainingPlanDto } from "@/lib/consultancies/training";
import {
  saveTrainingSnapshot,
  deleteTrainingSnapshot,
  saveOfflineActiveContext,
  type TrainingOfflineSnapshot,
} from "@/lib/offline/offline-storage";

export interface TrainingOfflineSyncProps {
  userPublicId: string;
  userName: string;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  plan: TrainingPlanDto | null;
}

/**
 * Normalizes a TrainingPlanDto for safe, resilient offline rendering
 * while preserving complete compatibility with both the offline shell and server DTO.
 */
function prepareOfflineTrainingData(plan: TrainingPlanDto): TrainingPlanDto {
  const normalizedWorkouts = (plan.workouts || []).map((w, wIdx) => {
    const flattenedExercises = (w.sections || []).flatMap((s) =>
      (s.blocks || []).flatMap((b) =>
        (b.exercises || []).map((e) => ({
          exerciseName: e.exerciseName || "Exercício",
          sets: e.sets ?? null,
          reps: e.repetitionsText ?? null,
          restSeconds: e.restSeconds ?? null,
          notes: e.notes || e.technique || e.loadGuidance || null,
        }))
      )
    );

    return {
      ...w,
      name: w.title || `Rotina ${String.fromCharCode(65 + wIdx)}`,
      notes: w.notes || null,
      exercises: flattenedExercises,
    };
  });

  return {
    ...plan,
    // Aliases to ensure instant compatibility with public/offline.js
    ...({
      name: plan.title || "Plano de Treino",
      goal: plan.subtitle || null,
      routines: normalizedWorkouts,
    } as Record<string, unknown>),
  };
}

/**
 * TrainingOfflineSync — Silent client-side bridge for training auto-sync.
 *
 * Responsibilities:
 * 1. If activePlan exists: persists normalized TrainingOfflineSnapshot to IndexedDB,
 *    then updates the 72h OfflineActiveContext.
 * 2. If activePlan is null (server confirmed no active plan): purges any stale training snapshot
 *    without touching the offline context or deleting unrelated snapshots.
 * 3. Idempotent, silent, non-blocking: never degrades online UX or throws errors.
 */
export function TrainingOfflineSync({
  userPublicId,
  userName,
  consultancyPublicId,
  consultancyName,
  consultancySlug,
  consultancyLogoUrl = null,
  plan,
}: TrainingOfflineSyncProps) {
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    async function executeSync() {
      if (!userPublicId || !consultancyPublicId) {
        return;
      }

      try {
        if (!plan) {
          // Server confirmed no active plan -> remove stale training snapshot
          await deleteTrainingSnapshot(userPublicId, consultancyPublicId);
          return;
        }

        // 1. Prepare normalized snapshot payload
        const activatedAtStr = plan.activatedAt
          ? (plan.activatedAt instanceof Date
              ? plan.activatedAt.toISOString()
              : String(plan.activatedAt))
          : null;

        const syncedAt = new Date().toISOString();
        const normalizedData = prepareOfflineTrainingData(plan);

        const snapshot: TrainingOfflineSnapshot = {
          userPublicId: userPublicId.trim(),
          consultancyPublicId: consultancyPublicId.trim(),
          planPublicId: String(plan.publicId).trim(),
          activatedAt: activatedAtStr,
          syncedAt,
          data: normalizedData,
        };

        // 2. Persist training snapshot first
        const snapshotSaved = await saveTrainingSnapshot(snapshot);
        if (!snapshotSaved) {
          // If snapshot storage failed, do not refresh the offline active context
          return;
        }

        // 3. Update OfflineActiveContext with 72h TTL
        await saveOfflineActiveContext({
          userPublicId: userPublicId.trim(),
          userName: userName ? userName.trim() : "",
          consultancyPublicId: consultancyPublicId.trim(),
          consultancyName: consultancyName ? consultancyName.trim() : "Trevo One",
          consultancySlug: consultancySlug.trim(),
          consultancyLogoUrl: consultancyLogoUrl || null,
          syncedAt,
        });
      } catch {
        // Silent error handling: offline storage failure must never impact online UI
      }
    }

    executeSync();
  }, [
    userPublicId,
    userName,
    consultancyPublicId,
    consultancyName,
    consultancySlug,
    consultancyLogoUrl,
    plan,
  ]);

  return null;
}
