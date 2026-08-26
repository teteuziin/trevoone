"use client";

import { useEffect, useRef } from "react";
import type { NutritionPlanDto } from "@/lib/consultancies/nutrition";
import {
  saveNutritionSnapshot,
  deleteNutritionSnapshot,
  saveOfflineActiveContext,
  type NutritionOfflineSnapshot,
} from "@/lib/offline/offline-storage";

export interface NutritionOfflineSyncProps {
  userPublicId: string;
  userName: string;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  plan: NutritionPlanDto | null;
}

/**
 * Normalizes a NutritionPlanDto for safe, resilient offline rendering
 * while preserving complete compatibility with both the offline shell and server DTO.
 */
function prepareOfflineNutritionData(plan: NutritionPlanDto): NutritionPlanDto {
  const normalizedMeals = (plan.meals || []).map((meal, mIdx) => {
    const flattenedFoods = (meal.options || []).flatMap((option) =>
      (option.sections || []).flatMap((section) =>
        (section.choiceGroups || []).flatMap((group) =>
          (group.items || []).map((item) => ({
            foodName: item.foodNameSnapshot || "Alimento",
            portion:
              item.portionLabelSnapshot ||
              `${item.prescribedQuantity || ""} ${item.prescribedUnitLabel || ""}`.trim() ||
              "1 porção",
            amount: item.prescribedQuantity,
            unit: item.prescribedUnitLabel,
            notes: item.notes || null,
            substitutions: [] as string[],
          }))
        )
      )
    );

    return {
      ...meal,
      name: meal.title || `Refeição ${mIdx + 1}`,
      time: meal.scheduledTime || null,
      timeFormatted: meal.scheduledTime || null,
      notes: meal.notes || null,
      foods: flattenedFoods,
    };
  });

  return {
    ...plan,
    // Aliases to ensure instant compatibility with public/offline.js
    ...({
      name: plan.title || "Plano Alimentar",
      targetCalories: plan.subtitle || null,
      meals: normalizedMeals,
    } as Record<string, unknown>),
  };
}

/**
 * NutritionOfflineSync — Silent client-side bridge for nutrition auto-sync.
 *
 * Responsibilities:
 * 1. If activePlan exists: persists normalized NutritionOfflineSnapshot to IndexedDB,
 *    then updates the 72h OfflineActiveContext.
 * 2. If activePlan is null (server confirmed no active plan): purges any stale nutrition snapshot
 *    without touching the offline context or deleting unrelated training snapshots.
 * 3. Idempotent, silent, non-blocking: never degrades online UX or throws errors.
 */
export function NutritionOfflineSync({
  userPublicId,
  userName,
  consultancyPublicId,
  consultancyName,
  consultancySlug,
  consultancyLogoUrl = null,
  plan,
}: NutritionOfflineSyncProps) {
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
          // Server confirmed no active plan -> remove stale nutrition snapshot
          await deleteNutritionSnapshot(userPublicId, consultancyPublicId);
          return;
        }

        // 1. Prepare normalized snapshot payload
        const activatedAtStr = plan.activatedAt
          ? (plan.activatedAt instanceof Date
              ? plan.activatedAt.toISOString()
              : String(plan.activatedAt))
          : null;

        const syncedAt = new Date().toISOString();
        const normalizedData = prepareOfflineNutritionData(plan);

        const snapshot: NutritionOfflineSnapshot = {
          userPublicId: userPublicId.trim(),
          consultancyPublicId: consultancyPublicId.trim(),
          planPublicId: String(plan.publicId).trim(),
          activatedAt: activatedAtStr,
          syncedAt,
          data: normalizedData,
        };

        // 2. Persist nutrition snapshot first
        const snapshotSaved = await saveNutritionSnapshot(snapshot);
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
