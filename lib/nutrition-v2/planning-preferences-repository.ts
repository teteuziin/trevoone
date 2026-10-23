/**
 * TREVO ONE — NUTRITION V2 PLANNING FIELD PREFERENCES REPOSITORY
 * Multi-tenant, per-professional field display preferences for patient planning.
 */

import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  type PlanningFieldPreferences,
  DEFAULT_PLANNING_FIELD_PREFERENCES,
} from "./clinical-measurements-catalog";

export { type PlanningFieldPreferences, DEFAULT_PLANNING_FIELD_PREFERENCES };

export async function getPlanningFieldPreferences(
  consultancyId: number,
  userId: number
): Promise<PlanningFieldPreferences> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT visible_fields_json FROM nutrition_v2_planning_field_preferences
       WHERE consultancy_id = ? AND user_id = ? LIMIT 1;`,
      [consultancyId, userId]
    );

    if (Array.isArray(rows) && rows.length > 0 && rows[0].visible_fields_json) {
      try {
        const parsed = typeof rows[0].visible_fields_json === "string"
          ? JSON.parse(rows[0].visible_fields_json)
          : rows[0].visible_fields_json;

        return {
          ...DEFAULT_PLANNING_FIELD_PREFERENCES,
          ...parsed,
          visiblePerimeters: Array.isArray(parsed.visiblePerimeters)
            ? parsed.visiblePerimeters
            : DEFAULT_PLANNING_FIELD_PREFERENCES.visiblePerimeters,
          visibleDiameters: Array.isArray(parsed.visibleDiameters)
            ? parsed.visibleDiameters
            : DEFAULT_PLANNING_FIELD_PREFERENCES.visibleDiameters,
        };
      } catch {
        return DEFAULT_PLANNING_FIELD_PREFERENCES;
      }
    }

    return DEFAULT_PLANNING_FIELD_PREFERENCES;
  } catch {
    // Schema fallback if table 065 not yet executed on host
    return DEFAULT_PLANNING_FIELD_PREFERENCES;
  } finally {
    connection.release();
  }
}

export async function savePlanningFieldPreferences(
  consultancyId: number,
  userId: number,
  preferences: Partial<PlanningFieldPreferences>
): Promise<PlanningFieldPreferences> {
  const current = await getPlanningFieldPreferences(consultancyId, userId);
  const updated: PlanningFieldPreferences = {
    ...current,
    ...preferences,
  };

  const connection = await getDbConnection();
  try {
    const payloadJson = JSON.stringify(updated);
    await connection.execute(
      `INSERT INTO nutrition_v2_planning_field_preferences (
        consultancy_id, user_id, visible_fields_json
      ) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        visible_fields_json = VALUES(visible_fields_json),
        updated_at = CURRENT_TIMESTAMP(3);`,
      [consultancyId, userId, payloadJson]
    );
    return updated;
  } catch {
    // If table doesn't exist yet, return in-memory preferences without crashing
    return updated;
  } finally {
    connection.release();
  }
}
