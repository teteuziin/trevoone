/**
 * TREVO ONE — Offline Evolution Storage Engine
 *
 * Provides client-side storage for scalar evolution metrics (weight, body measurements,
 * and chart series data) within the strict user + consultancy + role scope.
 *
 * SECURITY INVARIANT:
 * Zero body photos, evaluation thumbnails, private image URLs or blobs are EVER
 * accepted, persisted, or stored in IndexedDB.
 */

import {
  EVOLUTION_SNAPSHOT_STORE,
  withReadStore,
  withWriteStore,
} from "./offline-db";
import type { EvolutionOfflineSnapshot } from "./offline-types";
import type {
  EvolutionHubDataDto,
  EvolutionComparisonDataDto,
} from "@/types/evolution";

export type SaveEvolutionSnapshotInput = {
  userPublicId: string;
  consultancyPublicId: string;
  role?: string;
  hubData?: EvolutionHubDataDto;
  comparisonData?: EvolutionComparisonDataDto | null;
  metrics?: {
    latestWeightKg: number | null;
    weightGoalKg: number | null;
    weightHistory: Array<{ date: string; weightKg: number }>;
    bodyMeasurements: Array<{
      date: string;
      chestCm?: number | null;
      waistCm?: number | null;
      hipCm?: number | null;
      armsCm?: number | null;
      thighsCm?: number | null;
      calvesCm?: number | null;
    }>;
    chartPoints: Array<{ date: string; value: number; label: string }>;
    lastEvaluationMetadata: {
      evaluationPublicId: string;
      evaluatedAt: string;
      evaluatorName: string | null;
    } | null;
  };
};

/**
 * Saves or updates a student's scalar evolution metrics in trevo_offline_v3.
 */
export async function saveEvolutionSnapshot(
  input: SaveEvolutionSnapshotInput
): Promise<boolean> {
  if (!input.userPublicId || !input.consultancyPublicId) {
    return false;
  }

  // Sanitize: reject legacy mock strings
  if (input.userPublicId === "student") {
    return false;
  }

  const nowIso = new Date().toISOString();
  const role = String(input.role || "STUDENT").trim().toUpperCase();

  // Strict sanitization: ensure metrics contain only scalar fields, zero media
  let sanitizedMetrics: EvolutionOfflineSnapshot["metrics"];

  if (input.metrics) {
    sanitizedMetrics = {
      latestWeightKg:
        typeof input.metrics.latestWeightKg === "number"
          ? input.metrics.latestWeightKg
          : null,
      weightGoalKg:
        typeof input.metrics.weightGoalKg === "number"
          ? input.metrics.weightGoalKg
          : null,
      weightHistory: Array.isArray(input.metrics.weightHistory)
        ? input.metrics.weightHistory.map((w) => ({
            date: String(w.date || ""),
            weightKg: Number(w.weightKg) || 0,
          }))
        : [],
      bodyMeasurements: Array.isArray(input.metrics.bodyMeasurements)
        ? input.metrics.bodyMeasurements.map((m) => ({
            date: String(m.date || ""),
            chestCm: typeof m.chestCm === "number" ? m.chestCm : null,
            waistCm: typeof m.waistCm === "number" ? m.waistCm : null,
            hipCm: typeof m.hipCm === "number" ? m.hipCm : null,
            armsCm: typeof m.armsCm === "number" ? m.armsCm : null,
            thighsCm: typeof m.thighsCm === "number" ? m.thighsCm : null,
            calvesCm: typeof m.calvesCm === "number" ? m.calvesCm : null,
          }))
        : [],
      chartPoints: Array.isArray(input.metrics.chartPoints)
        ? input.metrics.chartPoints.map((cp) => ({
            date: String(cp.date || ""),
            value: Number(cp.value) || 0,
            label: String(cp.label || ""),
          }))
        : [],
      lastEvaluationMetadata: input.metrics.lastEvaluationMetadata
        ? {
            evaluationPublicId: String(
              input.metrics.lastEvaluationMetadata.evaluationPublicId || ""
            ),
            evaluatedAt: String(
              input.metrics.lastEvaluationMetadata.evaluatedAt || ""
            ),
            evaluatorName: input.metrics.lastEvaluationMetadata.evaluatorName
              ? String(input.metrics.lastEvaluationMetadata.evaluatorName)
              : null,
          }
        : null,
    };
  } else if (input.hubData) {
    const hub = input.hubData;
    const latestWeight = hub.summary?.currentWeightKg ?? null;
    const weightHistory = (hub.chartSeries?.weightSeries || []).map((pt) => ({
      date: pt.date,
      weightKg: pt.value,
    }));
    const bodyMeasurements = (hub.milestones || [])
      .filter((m) => m.measurement != null)
      .map((m) => ({
        date: m.date,
        chestCm: null,
        waistCm: m.measurement?.waistCm ?? null,
        hipCm: m.measurement?.hipCm ?? null,
        armsCm: m.measurement?.armCm ?? null,
        thighsCm: m.measurement?.thighCm ?? null,
        calvesCm: null,
      }));
    const chartPoints = (hub.chartSeries?.weightSeries || []).map((pt) => ({
      date: pt.date,
      value: pt.value,
      label: pt.formattedValue,
    }));
    const lastMilestoneWithPhotos = [...(hub.milestones || [])]
      .reverse()
      .find((m) => m.photos != null);

    sanitizedMetrics = {
      latestWeightKg: latestWeight,
      weightGoalKg: null,
      weightHistory,
      bodyMeasurements,
      chartPoints,
      lastEvaluationMetadata: lastMilestoneWithPhotos?.photos
        ? {
            evaluationPublicId: lastMilestoneWithPhotos.photos.publicId,
            evaluatedAt:
              lastMilestoneWithPhotos.photos.reviewedAt ||
              lastMilestoneWithPhotos.photos.submittedAt ||
              lastMilestoneWithPhotos.date,
            evaluatorName: null,
          }
        : null,
    };
  } else {
    return false;
  }

  const record: EvolutionOfflineSnapshot = {
    userPublicId: input.userPublicId.trim(),
    consultancyPublicId: input.consultancyPublicId.trim(),
    role,
    metrics: sanitizedMetrics,
    syncedAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await withWriteStore(EVOLUTION_SNAPSHOT_STORE, async (store) => {
    store.put(record);
    return true;
  });

  return Boolean(res);
}

/**
 * Retrieves the cached scalar evolution snapshot for a specific scope.
 */
export async function getEvolutionSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<EvolutionOfflineSnapshot | null> {
  if (
    !userPublicId ||
    !consultancyPublicId ||
    userPublicId === "student"
  ) {
    return null;
  }

  return await withReadStore(EVOLUTION_SNAPSHOT_STORE, async (store) => {
    return new Promise<EvolutionOfflineSnapshot | null>((resolve) => {
      const req = store.get([
        userPublicId.trim(),
        consultancyPublicId.trim(),
        role.trim().toUpperCase(),
      ]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

/**
 * Purges the evolution snapshot for a specific scope.
 */
export async function clearEvolutionSnapshot(
  userPublicId: string,
  consultancyPublicId: string,
  role: string = "STUDENT"
): Promise<boolean> {
  if (!userPublicId || !consultancyPublicId) return false;

  const res = await withWriteStore(EVOLUTION_SNAPSHOT_STORE, async (store) => {
    store.delete([
      userPublicId.trim(),
      consultancyPublicId.trim(),
      role.trim().toUpperCase(),
    ]);
    return true;
  });

  return Boolean(res);
}
