/**
 * TREVO ONE — READ-ONLY AUDIT: LEGACY SUBSTITUTIONS
 * 
 * Audits the database for duplicate substitutions and self-substitutions.
 * STRICTLY READ-ONLY (SELECT only). NEVER alters or deletes data.
 */

import { createRequire } from "module";

async function getMysql() {
  try {
    const mod = await import("mysql2/promise");
    return mod.default || mod;
  } catch {
    const require = createRequire(import.meta.url);
    try {
      return require("/home/u406031981/runner_deps/node_modules/mysql2/promise");
    } catch {
      return require("mysql2/promise");
    }
  }
}

async function runAudit() {
  const mysql = await getMysql();
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined) {
    console.log(JSON.stringify({
      status: "DB_NOT_CONFIGURED",
      duplicateSubstitutionsCount: 0,
      selfSubstitutionsCount: 0,
      totalAffectedMealItems: 0,
      details: "Database credentials not provided in environment.",
    }, null, 2));
    return;
  }

  const port = Number(DB_PORT) || 3306;

  const pool = mysql.createPool({
    host: DB_HOST,
    port,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 2,
    connectTimeout: 5000,
  });

  try {
    // 1. Audit duplicate substitutions on the same meal_item_id with identical canonical food_id
    const [dupRows] = await pool.query(`
      SELECT 
        meal_item_id,
        food_id,
        COUNT(*) AS occurrence_count
      FROM nutrition_v2_item_substitutions
      WHERE deleted_at IS NULL AND food_id IS NOT NULL
      GROUP BY meal_item_id, food_id
      HAVING COUNT(*) > 1
    `);

    // 2. Audit self-substitutions (where substitute food_id equals base meal_item food_id)
    const [selfRows] = await pool.query(`
      SELECT 
        s.id AS substitution_id,
        s.meal_item_id,
        s.food_id,
        mi.food_id AS base_food_id
      FROM nutrition_v2_item_substitutions s
      INNER JOIN nutrition_v2_meal_items mi ON mi.id = s.meal_item_id
      WHERE s.deleted_at IS NULL
        AND mi.deleted_at IS NULL
        AND s.food_id IS NOT NULL
        AND s.food_id = mi.food_id
    `);

    // 3. Audit NULL-ID duplicates (same meal_item_id with food_id IS NULL and identical food_name)
    const [nullIdRows] = await pool.query(`
      SELECT 
        meal_item_id,
        LOWER(TRIM(food_name_snapshot)) AS norm_name,
        COUNT(*) AS occurrence_count
      FROM nutrition_v2_item_substitutions
      WHERE deleted_at IS NULL AND food_id IS NULL
      GROUP BY meal_item_id, LOWER(TRIM(food_name_snapshot))
      HAVING COUNT(*) > 1
    `);

    // 4. Audit same name but different food_id on the same meal_item_id
    const [diffIdRows] = await pool.query(`
      SELECT 
        s1.id AS sub_id_1,
        s2.id AS sub_id_2,
        s1.meal_item_id,
        s1.food_name_snapshot,
        s1.food_id AS food_id_1,
        s2.food_id AS food_id_2
      FROM nutrition_v2_item_substitutions s1
      INNER JOIN nutrition_v2_item_substitutions s2 
        ON s1.meal_item_id = s2.meal_item_id 
        AND s1.id < s2.id
        AND LOWER(TRIM(s1.food_name_snapshot)) = LOWER(TRIM(s2.food_name_snapshot))
        AND ((s1.food_id IS NULL AND s2.food_id IS NOT NULL) 
             OR (s1.food_id IS NOT NULL AND s2.food_id IS NULL) 
             OR (s1.food_id != s2.food_id))
      WHERE s1.deleted_at IS NULL AND s2.deleted_at IS NULL
    `);

    const dupCount = Array.isArray(dupRows) ? dupRows.reduce((acc, row) => acc + (Number(row.occurrence_count) - 1), 0) : 0;
    const selfCount = Array.isArray(selfRows) ? selfRows.length : 0;
    const nullIdCount = Array.isArray(nullIdRows) ? nullIdRows.reduce((acc, row) => acc + (Number(row.occurrence_count) - 1), 0) : 0;
    const diffIdCount = Array.isArray(diffIdRows) ? diffIdRows.length : 0;

    console.log(JSON.stringify({
      status: "AUDIT_COMPLETE",
      legacyDuplicateSameCanonicalId: dupCount,
      legacySelfSubstitutions: selfCount,
      legacyNullIdDuplicates: nullIdCount,
      sameNameDifferentFoodId: diffIdCount,
      duplicateGroups: dupRows,
      selfSubstitutions: selfRows,
      nullIdDuplicates: nullIdRows,
      sameNameDifferentFoodIdList: diffIdRows,
    }, null, 2));
  } catch (err) {
    console.log(JSON.stringify({
      status: "AUDIT_ERROR",
      error: err instanceof Error ? err.message : "DATABASE_QUERY_ERROR",
      legacyDuplicateSameCanonicalId: 0,
      legacySelfSubstitutions: 0,
      legacyNullIdDuplicates: 0,
      sameNameDifferentFoodId: 0,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

runAudit();
