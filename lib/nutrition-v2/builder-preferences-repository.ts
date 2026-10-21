/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * BUILDER WORKSPACE VIEW PREFERENCES REPOSITORY
 * Individual view customization per nutritionist with strict tenancy and user isolation.
 */

import type { RowDataPacket, PoolConnection } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import {
  type NutritionAccessContext,
  NutritionAuthorizationError,
} from "./access";
import {
  type NutritionBuilderPreferences,
  DEFAULT_NUTRITION_BUILDER_PREFERENCES,
} from "./builder-preferences-types";

export * from "./builder-preferences-types";

let isTableInitialized = false;

/**
 * Ensures table existence idempotently.
 * Safe to call concurrently; short-circuits after successful run.
 */
export async function ensureNutritionBuilderPreferencesTable(connection?: PoolConnection): Promise<void> {
  if (isTableInitialized) return;

  const sql = `
    CREATE TABLE IF NOT EXISTS \`nutrition_v2_builder_preferences\` (
      \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
      \`user_id\` BIGINT UNSIGNED NOT NULL,
      \`show_student_preview\` TINYINT(1) NOT NULL DEFAULT 1,
      \`show_version_history\` TINYINT(1) NOT NULL DEFAULT 1,
      \`show_template_actions\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_nutrition_builder_pref_user_consultancy\` (\`consultancy_id\`, \`user_id\`),
      INDEX \`idx_nutrition_builder_pref_user\` (\`user_id\`),
      CONSTRAINT \`fk_nutrition_builder_pref_consultancy\`
        FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`)
        ON DELETE CASCADE,
      CONSTRAINT \`fk_nutrition_builder_pref_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  if (connection) {
    await connection.execute(sql);
  } else {
    const pool = getDbPool();
    await pool.query(sql);
  }

  isTableInitialized = true;
}

/**
 * Fetches the individual view preferences for the authenticated nutritionist in this consultancy.
 * Falls back to DEFAULT_NUTRITION_BUILDER_PREFERENCES (COMPLETO) if no custom preference is set.
 */
export async function getNutritionBuilderPreferences(
  ctx: NutritionAccessContext
): Promise<NutritionBuilderPreferences> {
  if (!ctx.consultancyId || !ctx.userId) {
    return { ...DEFAULT_NUTRITION_BUILDER_PREFERENCES };
  }

  await ensureNutritionBuilderPreferencesTable();

  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT show_student_preview, show_version_history, show_template_actions
       FROM nutrition_v2_builder_preferences
       WHERE consultancy_id = ? AND user_id = ?
       LIMIT 1;`,
      [ctx.consultancyId, ctx.userId]
    );

    if (!rows || rows.length === 0) {
      return { ...DEFAULT_NUTRITION_BUILDER_PREFERENCES };
    }

    const row = rows[0];
    return {
      showStudentPreview: Boolean(row.show_student_preview),
      showVersionHistory: Boolean(row.show_version_history),
      showTemplateActions: Boolean(row.show_template_actions),
    };
  } finally {
    conn.release();
  }
}

/**
 * Saves (UPSERT) individual view preferences for the authenticated nutritionist in this consultancy.
 * Strict tenancy and user isolation enforced server-side.
 */
export async function saveNutritionBuilderPreferences(
  ctx: NutritionAccessContext,
  prefs: NutritionBuilderPreferences
): Promise<NutritionBuilderPreferences> {
  if (!ctx.consultancyId || !ctx.userId) {
    throw new NutritionAuthorizationError("Acesso não autorizado: sessão inválida.", "UNAUTHORIZED", 401);
  }

  if (
    typeof prefs.showStudentPreview !== "boolean" ||
    typeof prefs.showVersionHistory !== "boolean" ||
    typeof prefs.showTemplateActions !== "boolean"
  ) {
    throw new NutritionAuthorizationError("Valores de preferência inválidos.", "BAD_REQUEST", 400);
  }

  await ensureNutritionBuilderPreferencesTable();

  const conn = await getDbConnection();
  try {
    await conn.execute(
      `INSERT INTO nutrition_v2_builder_preferences (
        consultancy_id,
        user_id,
        show_student_preview,
        show_version_history,
        show_template_actions
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        show_student_preview = VALUES(show_student_preview),
        show_version_history = VALUES(show_version_history),
        show_template_actions = VALUES(show_template_actions),
        updated_at = NOW(3);`,
      [
        ctx.consultancyId,
        ctx.userId,
        prefs.showStudentPreview ? 1 : 0,
        prefs.showVersionHistory ? 1 : 0,
        prefs.showTemplateActions ? 1 : 0,
      ]
    );

    return {
      showStudentPreview: prefs.showStudentPreview,
      showVersionHistory: prefs.showVersionHistory,
      showTemplateActions: prefs.showTemplateActions,
    };
  } finally {
    conn.release();
  }
}
