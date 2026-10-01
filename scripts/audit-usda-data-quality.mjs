/**
 * TREVO ONE — USDA DATA QUALITY & INTEGRITY AUDITOR (DEV & PROD)
 *
 * Audits:
 * 1. Raw vs Imported statistics (Foundation & FNDDS)
 * 2. Total active Food Library count
 * 3. Physical & structural data validity:
 *    - negative calories (< 0)
 *    - negative macros (< 0)
 *    - invalid reference amounts (<= 0 or NULL)
 *    - missing provenance (source_version, source_reference, source_imported_at)
 *    - missing or duplicate source_uid
 *    - orphan nutrient records (fn.food_id not in foods)
 *    - UNKNOWN vs KNOWN_ZERO correctness (UNKNOWN != ZERO)
 */

import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadFileEnv(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

export async function runDataQualityAudit(pool, envLabel = "DEV") {
  console.log(`\n================================================================================`);
  console.log(`TREVO ONE — AUDITORIA DE QUALIDADE DE DADOS [${envLabel}]`);
  console.log(`================================================================================`);

  const [dbNameRow] = await pool.query("SELECT DATABASE() as db");
  const activeDb = dbNameRow[0]?.db;
  console.log(`Banco conectado: ${activeDb}`);

  // 1. Raw vs Imported counts
  const [countsBySource] = await pool.query(`
    SELECT source_key, source_version, status, COUNT(*) as cnt, COUNT(DISTINCT source_uid) as distinct_uids
    FROM nutrition_v2_foods
    WHERE deleted_at IS NULL
    GROUP BY source_key, source_version, status
    ORDER BY source_key, status
  `);
  console.log("\n--- CONTAGEM DE ALIMENTOS POR FONTE E STATUS ---");
  console.table(countsBySource);

  const [totalActiveRows] = await pool.query(
    "SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE deleted_at IS NULL AND status = 'ACTIVE'"
  );
  const totalActive = totalActiveRows[0]?.total || 0;
  console.log(`TOTAL ACTIVE FOOD LIBRARY: ${totalActive}`);

  const [cols] = await pool.query("SHOW COLUMNS FROM nutrition_v2_foods");
  const colNames = new Set(cols.map((c) => c.Field));
  const hasFiber = colNames.has("fiber_g");

  // 2. Data Quality Checks
  // A) Negative calories
  const [negCalRows] = await pool.query(
    "SELECT COUNT(*) as cnt FROM nutrition_v2_foods WHERE calories_kcal < 0"
  );
  const negCalories = negCalRows[0]?.cnt || 0;

  // B) Negative macros
  const macroCondition = hasFiber
    ? "protein_g < 0 OR carbohydrate_g < 0 OR fat_g < 0 OR fiber_g < 0"
    : "protein_g < 0 OR carbohydrate_g < 0 OR fat_g < 0";
  const [negMacroRows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM nutrition_v2_foods
    WHERE ${macroCondition}
  `);
  const negMacros = negMacroRows[0]?.cnt || 0;

  // C) reference_amount <= 0 or null
  const [invalidRefRows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM nutrition_v2_foods
    WHERE reference_amount <= 0 OR reference_amount IS NULL OR reference_unit_code IS NULL OR TRIM(reference_unit_code) = ''
  `);
  const invalidRef = invalidRefRows[0]?.cnt || 0;

  // D) missing provenance in external/USDA foods
  const [missingProvRows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM nutrition_v2_foods
    WHERE source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')
      AND (source_version IS NULL OR source_reference IS NULL OR source_imported_at IS NULL)
  `);
  const missingProvenance = missingProvRows[0]?.cnt || 0;

  // E) missing source_uid in external/USDA foods
  const [missingUidRows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM nutrition_v2_foods
    WHERE source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')
      AND (source_uid IS NULL OR TRIM(source_uid) = '')
  `);
  const missingSourceUid = missingUidRows[0]?.cnt || 0;

  // F) duplicate source_uid
  const [dupUidRows] = await pool.query(`
    SELECT source_uid, COUNT(*) as cnt
    FROM nutrition_v2_foods
    WHERE deleted_at IS NULL AND source_uid IS NOT NULL
    GROUP BY source_uid
    HAVING COUNT(*) > 1
  `);
  const duplicateSourceUids = dupUidRows.length;

  // G) orphan nutrients
  const [orphanRows] = await pool.query(`
    SELECT COUNT(*) as cnt
    FROM nutrition_v2_food_nutrients fn
    LEFT JOIN nutrition_v2_foods f ON f.id = fn.food_id
    WHERE f.id IS NULL
  `);
  const orphanNutrients = orphanRows[0]?.cnt || 0;

  // H) negative amounts in nutrients catalog
  const [negNutrientRows] = await pool.query(`
    SELECT COUNT(*) as cnt FROM nutrition_v2_food_nutrients WHERE amount_per_reference < 0
  `);
  const negNutrientValues = negNutrientRows[0]?.cnt || 0;

  // I) UNKNOWN converted incorrectly to zero
  // In our schema: status = 'UNKNOWN' must have amount_per_reference = NULL
  // status = 'KNOWN_ZERO' must have amount_per_reference = 0
  const [unknownViolations] = await pool.query(`
    SELECT COUNT(*) as cnt
    FROM nutrition_v2_food_nutrients
    WHERE (status = 'UNKNOWN' AND amount_per_reference IS NOT NULL)
       OR (status = 'KNOWN_ZERO' AND amount_per_reference != 0)
  `);
  const unknownViolationsCount = unknownViolations[0]?.cnt || 0;

  // J) Status distribution in nutrients
  const [nutrientStatusRows] = await pool.query(`
    SELECT status, COUNT(*) as cnt
    FROM nutrition_v2_food_nutrients
    GROUP BY status
    ORDER BY cnt DESC
  `);
  console.log("\n--- DISTRIBUIÇÃO DE STATUS EM NUTRITION_V2_FOOD_NUTRIENTS ---");
  console.table(nutrientStatusRows);

  console.log("\n--- RESULTADOS DA AUDITORIA DE INTEGRIDADE ---");
  console.log(`Invalid negative calories:               ${negCalories} (esperado: 0)`);
  console.log(`Invalid negative macros:                 ${negMacros} (esperado: 0)`);
  console.log(`Invalid reference amount (<= 0 or NULL): ${invalidRef} (esperado: 0)`);
  console.log(`Missing provenance (USDA):               ${missingProvenance} (esperado: 0)`);
  console.log(`Missing source_uid (USDA):               ${missingSourceUid} (esperado: 0)`);
  console.log(`Duplicate source_uid:                    ${duplicateSourceUids} (esperado: 0)`);
  console.log(`Orphan nutrient records:                 ${orphanNutrients} (esperado: 0)`);
  console.log(`Invalid negative nutrient values:        ${negNutrientValues} (esperado: 0)`);
  console.log(`UNKNOWN != ZERO violations:              ${unknownViolationsCount} (esperado: 0)`);

  const allPassed =
    negCalories === 0 &&
    negMacros === 0 &&
    invalidRef === 0 &&
    missingProvenance === 0 &&
    missingSourceUid === 0 &&
    duplicateSourceUids === 0 &&
    orphanNutrients === 0 &&
    negNutrientValues === 0 &&
    unknownViolationsCount === 0;

  console.log(`\nSTATUS GERAL DA AUDITORIA [${envLabel}]: ${allPassed ? "PASS" : "FAIL"}`);

  return {
    envLabel,
    activeDb,
    totalActive,
    negCalories,
    negMacros,
    invalidRef,
    missingProvenance,
    missingSourceUid,
    duplicateSourceUids,
    orphanNutrients,
    negNutrientValues,
    unknownViolationsCount,
    allPassed,
  };
}

async function main() {
  const fileEnv = loadFileEnv(".env.local");
  const host = process.env.DB_HOST || fileEnv.DB_HOST;
  const port = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;
  const user = process.env.DB_USER || fileEnv.DB_USER;
  const password = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD;
  const database = process.env.DB_NAME || fileEnv.DB_NAME;

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    await runDataQualityAudit(pool, "DEV");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("ERRO NA AUDITORIA:", err);
    process.exit(1);
  });
}
