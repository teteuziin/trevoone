/**
 * Training V2 Schema Resilience Helper
 *
 * Provides backwards-compatibility and resilience when database schemas are transitioning
 * or when optional columns from recent migrations (e.g. Migration 066: workout_block_id, is_skipped)
 * may not yet be present in every environment.
 *
 * This ensures that students and coaches experience ZERO crashes and continuous operation
 * both before and after database migrations are applied.
 */

export function isMissingColumnError(err: unknown, columnNames?: string[]): boolean {
  if (!err || typeof err !== "object") return false;

  const isBadField =
    ("code" in err && (err as { code?: unknown }).code === "ER_BAD_FIELD_ERROR") ||
    ("errno" in err && (err as { errno?: unknown }).errno === 1054) ||
    ("sqlState" in err && (err as { sqlState?: unknown }).sqlState === "42S22");

  if (!isBadField) return false;

  if (columnNames && columnNames.length > 0) {
    const msg =
      "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message.toLowerCase()
        : "";

    // If message is available, match specific column names
    if (msg) {
      return columnNames.some((col) => msg.includes(col.toLowerCase()));
    }
  }

  return true;
}

export function isMissingTableError(err: unknown, tableNames?: string[]): boolean {
  if (!err || typeof err !== "object") return false;

  const isBadTable =
    ("code" in err && (err as { code?: unknown }).code === "ER_NO_SUCH_TABLE") ||
    ("errno" in err && (err as { errno?: unknown }).errno === 1146) ||
    ("sqlState" in err && (err as { sqlState?: unknown }).sqlState === "42S02");

  if (!isBadTable) return false;

  if (tableNames && tableNames.length > 0) {
    const msg =
      "message" in err && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message.toLowerCase()
        : "";

    if (msg) {
      return tableNames.some((tbl) => msg.includes(tbl.toLowerCase()));
    }
  }

  return true;
}
