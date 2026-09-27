/**
 * TREVO ONE - SEED IBGE POF GLOBAL NUTRITION V2 (B2A.1 HARDENED)
 *
 * Imports official IBGE POF 2008-2009 (Tabelas de Composição Nutricional e Medidas Referidas)
 * into nutrition_v2_foods, nutrition_v2_food_nutrients, and nutrition_v2_food_portions
 * for Brazilian default library expansion (Phase B2).
 *
 * Safety & Quality Hardening:
 * - NO PROD DB WRITE allowed.
 * - Dry-run by default (requires explicit --apply for DEV DB).
 * - Per-food atomic transaction (food + nutrients + portions in single transaction).
 * - Deterministic idempotency for food and portions.
 * - Zero semantic fallbacks (no || 100 or || "G").
 * - Pure generic deduplication without hardcoded food exceptions.
 * - Explicit versioned source key: IBGE_POF_2008_2009.
 */

import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SOURCE_KEY = "IBGE_POF_2008_2009";
export const SOURCE_VERSION = "POF 2008-2009 (2011)";
export const EXPECTED_HISTORICAL_SHA256 = "e75487405593196fe551d58e934e415e840f33f78acd0af08ed61bedb957c7ac";
export const SOURCE_REFERENCE = `IBGE - Pesquisa de Orçamentos Familiares 2008-2009 [SHA-256: ${EXPECTED_HISTORICAL_SHA256}]`;

export const PROD_DB_NAME = "u406031981_trevoone";
export const DEV_DB_NAME = "u406031981_trevoone_dev";
export const EXPECTED_HOST = "srv1595.hstgr.io";

export const NUTR_MAP = {
  calcium_mg: { code: "CA", unit: "mg" },
  iron_mg: { code: "FE", unit: "mg" },
  magnesium_mg: { code: "MG", unit: "mg" },
  phosphorus_mg: { code: "P", unit: "mg" },
  potassium_mg: { code: "K", unit: "mg" },
  sodium_mg: { code: "NA", unit: "mg" },
  zinc_mg: { code: "ZN", unit: "mg" },
  vitamin_a_mcg: { code: "VIT_A", unit: "mcg" },
  vitamin_c_mg: { code: "VIT_C", unit: "mg" },
  vitamin_d_mcg: { code: "VIT_D", unit: "mcg" },
  vitamin_e_mg: { code: "VIT_E", unit: "mg" },
  vitamin_b1_mg: { code: "VIT_B1", unit: "mg" },
  vitamin_b2_mg: { code: "VIT_B2", unit: "mg" },
  vitamin_b3_mg: { code: "VIT_B3", unit: "mg" },
  vitamin_b6_mg: { code: "VIT_B6", unit: "mg" },
  folate_mcg: { code: "FOLATE", unit: "mcg" },
  vitamin_b12_mcg: { code: "VIT_B12", unit: "mcg" }
};

export function normalizeSearchText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function generateDeterministicUuid(namespace, seed) {
  const hash = crypto.createHash("sha256").update(`${namespace}:${seed}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function parseArgs(argv) {
  let isApply = false;
  for (const arg of argv) {
    if (arg === "--apply") {
      isApply = true;
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'`);
      process.exit(1);
    }
  }
  return { isApply };
}

export function loadFileEnv(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) {
    return {};
  }
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

export function getNonEmpty(val) {
  if (typeof val === "string" && val.trim() !== "") {
    return val.trim();
  }
  return undefined;
}

export function resolveDatabaseConfig(procEnv = process.env, fileEnv = {}) {
  const host = getNonEmpty(procEnv.DB_HOST) ?? getNonEmpty(fileEnv.DB_HOST);
  const portStr = getNonEmpty(procEnv.DB_PORT) ?? getNonEmpty(fileEnv.DB_PORT);
  const database = getNonEmpty(procEnv.DB_NAME) ?? getNonEmpty(fileEnv.DB_NAME);
  const user = getNonEmpty(procEnv.DB_USER) ?? getNonEmpty(fileEnv.DB_USER);
  const password = getNonEmpty(procEnv.DB_PASSWORD) ?? getNonEmpty(fileEnv.DB_PASSWORD);

  const missing = [];
  if (!host) missing.push("DB_HOST");
  if (!database) missing.push("DB_NAME");
  if (!user) missing.push("DB_USER");
  if (password === undefined) missing.push("DB_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Configuração de banco de dados incompleta. Variáveis ausentes: ${missing.join(", ")}`);
  }

  const port = Number(portStr) || 3306;

  return {
    host,
    port,
    database,
    user,
    password,
  };
}

export function classifyDatabase(dbName) {
  if (dbName === PROD_DB_NAME) {
    return { isProd: true, isDev: false, isValid: true };
  }
  if (dbName === DEV_DB_NAME) {
    return { isProd: false, isDev: true, isValid: true };
  }
  return { isProd: false, isDev: false, isValid: false };
}

export function validateTargetGuards({ dbName, dbHost }) {
  if (dbHost !== EXPECTED_HOST) {
    throw new Error(`ERRO DE SEGURANÇA: Host inesperado: '${dbHost}'. Esperado: '${EXPECTED_HOST}'.`);
  }

  const { isProd, isValid } = classifyDatabase(dbName);
  if (!isValid) {
    throw new Error(`ERRO DE SEGURANÇA: Banco de dados não autorizado: '${dbName}'.`);
  }

  // ABSOLUTE GUARD: NO PROD DB WRITE
  if (isProd) {
    throw new Error(
      "PRODUÇÃO DETECTADA - EXECUÇÃO BLOQUEADA POR REGRA DE SEGURANÇA B2A.\n" +
      `O banco configurado é PRODUÇÃO (${PROD_DB_NAME}). Operação abortada para prevenir escrita acidental.`
    );
  }

  return { isProd };
}

/**
 * Validates mandatory food properties without any arbitrary defaults.
 * Throws SOURCE_ERROR if invalid.
 */
export function validateFoodSourceRecord(food) {
  if (!food.food_code || typeof food.food_code !== "string" || !food.food_code.trim()) {
    throw new Error(`SOURCE_ERROR: Missing mandatory food_code: '${food.food_code}'`);
  }
  if (!food.prep_code || typeof food.prep_code !== "string" || !food.prep_code.trim()) {
    throw new Error(`SOURCE_ERROR: Missing mandatory prep_code: '${food.prep_code}'`);
  }
  if (!food.name || typeof food.name !== "string" || !food.name.trim()) {
    throw new Error(`SOURCE_ERROR: Missing mandatory food name for code ${food.food_code}`);
  }

  // Strict referenceAmount validation: NO FAKE 100 DEFAULT
  if (food.reference_amount == null || typeof food.reference_amount !== "number" || Number.isNaN(food.reference_amount) || food.reference_amount <= 0) {
    throw new Error(`SOURCE_ERROR: Missing or invalid reference_amount for food ${food.name}: ${food.reference_amount}`);
  }

  // Strict referenceUnitCode validation: NO FAKE 'G' DEFAULT
  if (!food.reference_unit_code || typeof food.reference_unit_code !== "string" || !food.reference_unit_code.trim()) {
    throw new Error(`SOURCE_ERROR: Missing or invalid reference_unit_code for food ${food.name}: ${food.reference_unit_code}`);
  }

  // Strict macro validation: no negative values allowed
  const checkMacro = (val, name) => {
    if (val !== null && val !== undefined) {
      if (typeof val !== "number" || Number.isNaN(val) || val < 0) {
        throw new Error(`SOURCE_ERROR: Negative or invalid macro ${name} for ${food.name}: ${val}`);
      }
    }
  };
  checkMacro(food.calories_kcal, "calories_kcal");
  checkMacro(food.protein_g, "protein_g");
  checkMacro(food.carbohydrate_g, "carbohydrate_g");
  checkMacro(food.fat_g, "fat_g");
  checkMacro(food.fiber_g, "fiber_g");
}

/**
 * Imports single food atomically inside a managed transaction.
 * Rolls back completely on ANY failure (food + portions + nutrients).
 */
export async function importSingleFoodAtomic(conn, food, measuresList, options = {}) {
  validateFoodSourceRecord(food);

  await conn.beginTransaction();
  try {
    const normName = normalizeSearchText(food.name);
    const normDisplayName = normalizeSearchText(food.display_name_pt_br || food.name);
    const sourceUid = food.source_uid || `${SOURCE_KEY}:${food.food_code}:${food.prep_code}`;

    // 1. Check existing food by source_uid
    const [existing] = await conn.query(
      "SELECT id FROM nutrition_v2_foods WHERE source_uid = ? FOR UPDATE",
      [sourceUid]
    );

    let foodId;
    if (existing.length > 0) {
      foodId = existing[0].id;
      await conn.query(
        `UPDATE nutrition_v2_foods SET
          name = ?,
          display_name_pt_br = ?,
          normalized_name = ?,
          normalized_display_name_pt_br = ?,
          category = ?,
          reference_amount = ?,
          reference_unit_code = ?,
          calories_kcal = ?,
          protein_g = ?,
          carbohydrate_g = ?,
          fat_g = ?,
          fiber_g = ?,
          data_quality = 'SURVEY_RECIPE',
          source_key = ?,
          source_external_code = ?,
          source_version = ?,
          source_reference = ?
        WHERE id = ?`,
        [
          food.name.trim(),
          (food.display_name_pt_br || food.name).trim(),
          normName,
          normDisplayName,
          food.category ? food.category.trim() : null,
          food.reference_amount,
          food.reference_unit_code.trim(),
          food.calories_kcal,
          food.protein_g,
          food.carbohydrate_g,
          food.fat_g,
          food.fiber_g,
          SOURCE_KEY,
          String(food.source_external_code),
          food.source_version || SOURCE_VERSION,
          food.source_reference || SOURCE_REFERENCE,
          foodId
        ]
      );
    } else {
      const publicId = generateDeterministicUuid("food", sourceUid);
      const [insertRes] = await conn.query(
        `INSERT INTO nutrition_v2_foods (
          public_id, scope, consultancy_id, name, display_name_pt_br,
          normalized_name, normalized_display_name_pt_br, category,
          reference_amount, reference_unit_code, calories_kcal,
          protein_g, carbohydrate_g, fat_g, fiber_g, status,
          source_type, data_quality, source_key, source_external_code,
          source_version, source_reference, source_uid
        ) VALUES (?, 'GLOBAL', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'EXTERNAL', 'SURVEY_RECIPE', ?, ?, ?, ?, ?)`,
        [
          publicId,
          food.name.trim(),
          (food.display_name_pt_br || food.name).trim(),
          normName,
          normDisplayName,
          food.category ? food.category.trim() : null,
          food.reference_amount,
          food.reference_unit_code.trim(),
          food.calories_kcal,
          food.protein_g,
          food.carbohydrate_g,
          food.fat_g,
          food.fiber_g,
          SOURCE_KEY,
          String(food.source_external_code),
          food.source_version || SOURCE_VERSION,
          food.source_reference || SOURCE_REFERENCE,
          sourceUid
        ]
      );
      foodId = insertRes.insertId;
    }

    // 2. Insert micronutrients (exact zero semantics: only KNOWN_ZERO if officially zero)
    let expectedNutrients = 0;
    if (food.micronutrients) {
      for (const [key, mapping] of Object.entries(NUTR_MAP)) {
        const val = food.micronutrients[key];
        if (val !== null && val !== undefined) {
          const num = Number(val);
          const status = num > 0 ? "KNOWN" : "KNOWN_ZERO";
          await conn.query(
            `INSERT INTO nutrition_v2_food_nutrients (food_id, nutrient_code, amount_per_reference, unit_code, status)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE amount_per_reference = VALUES(amount_per_reference), status = VALUES(status)`,
            [foodId, mapping.code, num, mapping.unit, status]
          );
          expectedNutrients++;
        }
      }
    }

    // 3. Upsert household measures with deterministic per-portion identity & label matching
    const [existingPortions] = await conn.query(
      "SELECT id, public_id, label FROM nutrition_v2_food_portions WHERE food_id = ?",
      [foodId]
    );
    const existingPortionMap = new Map();
    existingPortions.forEach(p => existingPortionMap.set(p.label, p));

    const portions = measuresList || [];
    for (let idx = 0; idx < portions.length; idx++) {
      const p = portions[idx];
      const pLabel = p.label.slice(0, 100);
      const existingMatch = existingPortionMap.get(pLabel);

      const portionPublicId = existingMatch
        ? existingMatch.public_id
        : generateDeterministicUuid("portion", `${sourceUid}:${p.measure_code || p.measure_name || idx}`);

      if (existingMatch) {
        await conn.query(
          `UPDATE nutrition_v2_food_portions SET
            equivalent_reference_amount = ?,
            sort_order = ?,
            status = 'ACTIVE'
          WHERE id = ?`,
          [p.grams, idx + 1, existingMatch.id]
        );
      } else {
        await conn.query(
          `INSERT INTO nutrition_v2_food_portions (public_id, food_id, label, equivalent_reference_amount, sort_order, status)
           VALUES (?, ?, ?, ?, ?, 'ACTIVE')
           ON DUPLICATE KEY UPDATE equivalent_reference_amount = VALUES(equivalent_reference_amount), sort_order = VALUES(sort_order), status = 'ACTIVE'`,
          [portionPublicId, foodId, pLabel, p.grams, idx + 1]
        );
      }
    }

    // 4. Invariant check inside transaction
    const [nCheck] = await conn.query("SELECT COUNT(*) as c FROM nutrition_v2_food_nutrients WHERE food_id = ?", [foodId]);
    const [pCheck] = await conn.query("SELECT COUNT(*) as c FROM nutrition_v2_food_portions WHERE food_id = ? AND deleted_at IS NULL", [foodId]);
    if (nCheck[0].c < expectedNutrients || pCheck[0].c < portions.length) {
      throw new Error(`INTEGRITY_CHECK_FAILED: child rows count mismatch for foodId ${foodId}`);
    }

    // Hook for automated rollback simulation tests
    if (options.simulateErrorDuringTransaction) {
      throw new Error("SIMULATED_TEST_ERROR_FOR_ROLLBACK");
    }

    await conn.commit();
    return { foodId, nutrientCount: nCheck[0].c, portionCount: pCheck[0].c };
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}

async function run() {
  const { isApply } = parseArgs(process.argv.slice(2));
  const fileEnv = loadFileEnv(".env.local");
  const dbConfig = resolveDatabaseConfig(process.env, fileEnv);

  validateTargetGuards({
    dbName: dbConfig.database,
    dbHost: dbConfig.host,
  });

  const datasetPath = path.resolve(__dirname, "../data/nutrition/ibge-pof-2008-2009.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`ERRO: Arquivo do dataset IBGE POF não encontrado: ${datasetPath}`);
    process.exit(1);
  }

  const measuresPath = path.resolve(__dirname, "../data/nutrition/ibge-household-measures.json");
  let measuresData = { measures: {} };
  if (fs.existsSync(measuresPath)) {
    measuresData = JSON.parse(fs.readFileSync(measuresPath, "utf8"));
  }

  const rawBytes = fs.readFileSync(datasetPath);
  const dataset = JSON.parse(rawBytes.toString("utf8"));
  const { foods } = dataset;

  console.log("=== TREVO ONE - SEED IBGE POF GLOBAL NUTRITION V2 (B2A.1 HARDENED) ===");
  console.log("Fonte de dados:", `Dataset oficial IBGE POF (${foods.length} alimentos brutos)`);
  console.log("Banco de dados alvo:", dbConfig.database);
  console.log("Ambiente:", dbConfig.database === PROD_DB_NAME ? "PRODUÇÃO" : "DEV");
  console.log("Modo de execução:", isApply ? "APPLY (Escrita no banco DEV)" : "DRY RUN (Simulação / Sem escrita)");
  console.log("Versão e Fonte:", SOURCE_KEY);

  const pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    waitForConnections: true,
    connectionLimit: 4,
  });

  try {
    // 1. Check existing IBGE foods by source_key
    const [existingIbge] = await pool.query(
      "SELECT id, source_uid, source_external_code FROM nutrition_v2_foods WHERE source_key = ?",
      [SOURCE_KEY]
    );
    const existingUidSet = new Set(existingIbge.map((r) => r.source_uid));
    console.log(`Alimentos já existentes com chave '${SOURCE_KEY}': ${existingUidSet.size}`);

    // 2. Load TACO foods for pure generic deduplication
    const [tacoFoods] = await pool.query(
      "SELECT normalized_name FROM nutrition_v2_foods WHERE source_key = 'TACO'"
    );
    const tacoNormSet = new Set(tacoFoods.map((r) => r.normalized_name));
    console.log(`Alimentos TACO existentes para deduplicação: ${tacoNormSet.size}`);

    // 3. Prepare planned inserts
    const plannedFoods = [];
    let skippedTacoDerived = 0;
    let skippedExactTacoDuplicate = 0;

    for (const food of foods) {
      // Deduplication Rule 1: Skip foods where IBGE explicitly cites TACO (Ref 2)
      if (food.ibge_meta?.is_taco_derived) {
        skippedTacoDerived++;
        continue;
      }

      const normName = normalizeSearchText(food.name);

      // Deduplication Rule 2: Pure generic deduplication against TACO without hardcoded food exceptions
      if (tacoNormSet.has(normName)) {
        skippedExactTacoDuplicate++;
        continue;
      }

      plannedFoods.push(food);
    }

    console.log(`Deduplicação: ${skippedTacoDerived} alimentos ignorados por serem derivados de TACO na origem.`);
    console.log(`Deduplicação: ${skippedExactTacoDuplicate} alimentos ignorados por match genérico exato em TACO.`);
    console.log(`Total de alimentos IBGE válidos para catálogo: ${plannedFoods.length}`);

    if (!isApply) {
      console.log("\nSimulação (DRY RUN) concluída com sucesso.");
      console.log("Nenhuma alteração foi realizada no banco.");
      console.log("Para efetivar a importação no banco DEV, execute com o parâmetro --apply.");
      return;
    }

    // Atomic per-food import execution
    console.log(`\nIniciando importação atômica por alimento (${plannedFoods.length} alimentos)...`);
    const conn = await pool.getConnection();
    let imported = 0;
    try {
      for (const food of plannedFoods) {
        const portions = measuresData.measures[food.source_external_code] || [];
        await importSingleFoodAtomic(conn, food, portions);
        imported++;
        if (imported % 100 === 0 || imported === plannedFoods.length) {
          process.stdout.write(`  Progresso atômico: ${imported}/${plannedFoods.length} (${Math.round((imported / plannedFoods.length) * 100)}%)\r`);
        }
      }
      console.log(`\n✓ Importação atômica concluída com sucesso: ${imported} alimentos processados!`);
    } finally {
      conn.release();
    }

  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error("ERRO FATAL:", err);
    process.exit(1);
  });
}

