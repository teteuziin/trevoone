import type { TrainingOfflineSnapshot, NutritionOfflineSnapshot } from "./offline-storage";
import { type OfflineActiveContext, isOfflineContextValid } from "./offline-context";

/**
 * Validates if a stored snapshot matches the currently active offline context
 * and ensures that the active context is still within its authorization TTL.
 */
export function isSnapshotAccessibleInContext(
  snapshot: TrainingOfflineSnapshot | NutritionOfflineSnapshot | null | undefined,
  context: OfflineActiveContext | null | undefined,
  now: Date = new Date()
): boolean {
  if (!snapshot || !context) {
    return false;
  }

  // 1. Validate that the context is structurally valid and unexpired
  if (!isOfflineContextValid(context, now)) {
    return false;
  }

  // 2. Strict match on userPublicId
  if (snapshot.userPublicId.trim() !== context.userPublicId.trim()) {
    return false;
  }

  // 3. Strict match on consultancyPublicId
  if (snapshot.consultancyPublicId.trim() !== context.consultancyPublicId.trim()) {
    return false;
  }

  return true;
}

/**
 * Formats an ISO date string to a user-friendly Brazilian date/time format.
 * Example: "25/08/2026 às 18:45"
 */
export function formatOfflineDateTimeBr(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const pad = (n: number) => String(n).padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return "";
  }
}
