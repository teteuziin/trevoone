/**
 * DEV Migration: Standardize Clean Professional Food Display Names
 *
 * Updates:
 * - nutrition_v2_foods.display_name_pt_br
 * - nutrition_v2_foods.normalized_display_name_pt_br
 *
 * For all TACO (548) and IBGE_POF_2008_2009 (1,820) rows in DEV database.
 *
 * Rules:
 * 1. Zero destructive source editing: `name` is NEVER modified.
 * 2. Zero commas in display_name_pt_br.
 * 3. Zero alias lists concatenated.
 * 4. Only DEV database (u406031981_trevoone_dev).
 */

import fs from "node:fs";
import mysql from "mysql2/promise";
import { cleanFoodDisplayName } from "../lib/nutrition-v2/food-query-builder.ts";
import { normalizeSearchText } from "../lib/nutrition-v2/food-query-builder.ts";

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  const parts = l.trim().split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && v) env[k.trim()] = v.trim();
});

const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}

async function main() {
  console.log("=== DEV MIGRATION: CLEAN PROFESSIONAL FOOD DISPLAY NAMES ===");
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    const [db] = await pool.query("SELECT DATABASE() as db");
    console.log("Target Database:", db[0].db);
    if (db[0].db !== DEV_DB_NAME) {
      throw new Error("Target is NOT DEV database!");
    }

    // 1. Fetch all TACO and IBGE foods
    const [rows] = await pool.query(`
      SELECT id, name, display_name_pt_br, source_key
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
    `);

    console.log(`Fetched ${rows.length} Brazilian food rows to standardize.`);

    let updatedTaco = 0;
    let updatedIbge = 0;
    let commasRemaining = 0;

    for (const row of rows) {
      const cleanDisplay = cleanFoodDisplayName(row.name, row.source_key);
      const normDisplay = normalizeSearchText(cleanDisplay);

      if (cleanDisplay.includes(",")) {
        commasRemaining++;
        console.warn(`WARNING: Comma found in cleaned name for food ${row.id}: "${cleanDisplay}" (orig: "${row.name}")`);
      }

      await pool.execute(
        `UPDATE nutrition_v2_foods
         SET display_name_pt_br = ?, normalized_display_name_pt_br = ?, updated_at = NOW(3)
         WHERE id = ?`,
        [cleanDisplay, normDisplay, row.id]
      );

      if (row.source_key === "TACO") updatedTaco++;
      else updatedIbge++;
    }

    console.log(`Updated ${updatedTaco} TACO rows and ${updatedIbge} IBGE rows.`);
    console.log(`Commas in generated display names: ${commasRemaining}`);

    // 2. Post-migration verification
    const [commaCheck] = await pool.query(`
      SELECT COUNT(*) as count
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND display_name_pt_br LIKE '%,%'
    `);
    console.log(`Post-migration rows with comma in display_name_pt_br: ${commaCheck[0].count} (expected: 0)`);
    if (commaCheck[0].count !== 0) {
      throw new Error(`FAIL: ${commaCheck[0].count} display names still contain commas!`);
    }

    const [nullCheck] = await pool.query(`
      SELECT COUNT(*) as count
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND display_name_pt_br IS NULL
    `);
    console.log(`Post-migration rows with NULL display_name_pt_br: ${nullCheck[0].count} (expected: 0)`);
    if (nullCheck[0].count !== 0) {
      throw new Error(`FAIL: ${nullCheck[0].count} display names are NULL!`);
    }

    // 3. Sample verification
    console.log("\nSample Standardized Display Names:");
    const [samples] = await pool.query(`
      SELECT source_key, name, display_name_pt_br
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND (name LIKE '%francês%' OR name LIKE '%sal%' OR name LIKE '%mandioca%' OR name LIKE '%mexerica%' OR name LIKE '%mozarela%' OR name LIKE '%abadejo%' OR name LIKE '%peito%')
      LIMIT 12
    `);
    for (const s of samples) {
      console.log(` [${s.source_key}] "${s.name}" -> "${s.display_name_pt_br}"`);
    }

    console.log("\n[SUCCESS] Migration completed with 100% compliance.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

