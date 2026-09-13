/**
 * TREVO ONE — USDA FOODDATA CENTRAL IMPORT SCRIPT (NUTRITION V2)
 * Imports Foundation Foods and Survey Foods (FNDDS) into nutrition_v2_foods.
 *
 * Idempotent: keyed by source_uid ("USDA:FOUNDATION:${fdcId}" and "USDA:FNDDS:${fdcId}").
 * Preserves TACO and any existing foods without mutation or deletion.
 */

import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SOURCE_KEY_FOUNDATION = "USDA_FOUNDATION";
export const SOURCE_KEY_FNDDS = "USDA_FNDDS";
export const SOURCE_VERSION_FOUNDATION = "Foundation 2024-10-31";
export const SOURCE_VERSION_FNDDS = "FNDDS 2021-2023 (2024-10-31)";

export const PROD_DB_NAME = "u406031981_trevoone";
export const DEV_DB_NAME = "u406031981_trevoone_dev";
export const EXPECTED_HOST = "srv1595.hstgr.io";

export function normalizeSearchText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseArgs(argv) {
  let isApply = false;
  let isAllowProduction = false;
  let dataset = "all"; // 'all', 'foundation', 'fndds'

  for (const arg of argv) {
    if (arg === "--apply") {
      isApply = true;
    } else if (arg === "--dry-run") {
      isApply = false;
    } else if (arg === "--allow-production") {
      isAllowProduction = true;
    } else if (arg.startsWith("--dataset=")) {
      dataset = arg.split("=")[1].toLowerCase();
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'`);
      process.exit(1);
    }
  }

  return { isApply, isAllowProduction, dataset };
}

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
    throw new Error(`Configuração de banco de dados incompleta: ${missing.join(", ")}`);
  }

  const port = Number(portStr) || 3306;
  return { host, port, database, user, password };
}

export function validateTargetGuards({ dbName, dbHost, isAllowProduction }) {
  if (dbHost !== EXPECTED_HOST) {
    throw new Error(`ERRO DE SEGURANÇA: Host inesperado: '${dbHost}'. Esperado: '${EXPECTED_HOST}'.`);
  }

  if (dbName === PROD_DB_NAME) {
    if (!isAllowProduction) {
      throw new Error("PRODUÇÃO DETECTADA — EXECUÇÃO ABORTADA. Requer flag '--allow-production'.");
    }
  } else if (dbName === DEV_DB_NAME) {
    if (isAllowProduction) {
      throw new Error("ERRO: '--allow-production' não pode ser usada no banco DEV.");
    }
  } else {
    throw new Error(`ERRO DE SEGURANÇA: Banco de dados não autorizado: '${dbName}'.`);
  }
}

export function extractMacros(foodNutrients, isFoundation = false) {
  let calories = null;
  let protein = null;
  let carb = null;
  let fat = null;

  if (!foodNutrients || !Array.isArray(foodNutrients)) {
    return { calories, protein, carb, fat };
  }

  let atwaterSpecific = null;
  let atwaterGeneral = null;

  for (const fn of foodNutrients) {
    const num = String(fn.nutrient?.number);
    const amount = fn.amount != null && !isNaN(fn.amount) ? Number(fn.amount) : null;
    if (amount == null) continue;

    if (num === "208") {
      calories = amount;
    } else if (num === "958") {
      atwaterSpecific = amount;
    } else if (num === "957") {
      atwaterGeneral = amount;
    } else if (num === "203") {
      protein = amount;
    } else if (num === "205" || num === "205.2") {
      if (carb == null || num === "205") carb = amount;
    } else if (num === "204") {
      fat = amount;
    }
  }

  if (calories == null && isFoundation) {
    calories = atwaterSpecific != null ? atwaterSpecific : atwaterGeneral;
  }

  return {
    calories: calories != null ? Number(calories.toFixed(2)) : null,
    protein: protein != null ? Number(protein.toFixed(2)) : null,
    carb: carb != null ? Number(carb.toFixed(2)) : null,
    fat: fat != null ? Number(fat.toFixed(2)) : null,
  };
}

export function prepareFoodRecords(items, type) {
  const isFoundation = type === "FOUNDATION";
  const sourceKey = isFoundation ? SOURCE_KEY_FOUNDATION : SOURCE_KEY_FNDDS;
  const sourceVersion = isFoundation ? SOURCE_VERSION_FOUNDATION : SOURCE_VERSION_FNDDS;
  const prefix = isFoundation ? "USDA:FOUNDATION:" : "USDA:FNDDS:";

  const records = [];
  let withoutEssentialMacros = 0;

  for (const item of items) {
    const fdcId = item.fdcId;
    if (!fdcId || !item.description) continue;

    const name = item.description.trim();
    const normalizedName = normalizeSearchText(name);
    const category =
      item.foodCategory?.description?.trim() ||
      item.wweiaFoodCategory?.wweiaFoodCategoryDescription?.trim() ||
      null;

    const macros = extractMacros(item.foodNutrients, isFoundation);
    if (macros.calories == null && macros.protein == null && macros.carb == null && macros.fat == null) {
      withoutEssentialMacros++;
    }

    records.push({
      publicId: crypto.randomUUID(),
      scope: "GLOBAL",
      consultancyId: null,
      name,
      normalizedName,
      category,
      referenceAmount: 100.0,
      referenceUnitCode: "G",
      caloriesKcal: macros.calories,
      proteinG: macros.protein,
      carbohydrateG: macros.carb,
      fatG: macros.fat,
      status: "ACTIVE",
      sourceType: "EXTERNAL",
      sourceKey,
      sourceExternalCode: String(fdcId),
      sourceVersion,
      sourceReference: `USDA FoodData Central [FDC ID: ${fdcId}]`,
      sourceImportedAt: new Date().toISOString(),
      sourceUid: `${prefix}${fdcId}`,
    });
  }

  return { records, withoutEssentialMacros };
}

async function run() {
  const { isApply, isAllowProduction, dataset } = parseArgs(process.argv.slice(2));
  const fileEnv = loadFileEnv(".env.local");
  const dbConfig = resolveDatabaseConfig(process.env, fileEnv);

  validateTargetGuards({
    dbName: dbConfig.database,
    dbHost: dbConfig.host,
    isAllowProduction,
  });

  console.log("================================================================================");
  console.log("TREVO ONE — IMPORTADOR OFICIAL USDA FOODDATA CENTRAL (NUTRITION V2)");
  console.log("================================================================================");
  console.log("Banco de dados:", dbConfig.database);
  console.log("Ambiente:      ", dbConfig.database === PROD_DB_NAME ? "PRODUÇÃO" : "DEV");
  console.log("Modo:          ", isApply ? "APPLY (Gravação no banco)" : "DRY RUN (Simulação / Sem gravação)");
  console.log("Dataset:       ", dataset.toUpperCase());

  const scratchDir = path.resolve(__dirname, "../scratch");
  const foundationPath = path.join(scratchDir, "foundation_extracted/foundationDownload.json");
  const fnddsPath = path.join(scratchDir, "fndds_extracted/surveyDownload.json");

  let foundationItems = [];
  let fnddsItems = [];

  if (dataset === "all" || dataset === "foundation") {
    if (!fs.existsSync(foundationPath)) {
      throw new Error(`Arquivo não encontrado: ${foundationPath}. Execute o download antes.`);
    }
    const raw = fs.readFileSync(foundationPath, "utf8");
    foundationItems = JSON.parse(raw).FoundationFoods || [];
    console.log(`- Foundation Foods carregados do JSON: ${foundationItems.length}`);
  }

  if (dataset === "all" || dataset === "fndds") {
    if (!fs.existsSync(fnddsPath)) {
      throw new Error(`Arquivo não encontrado: ${fnddsPath}. Execute o download antes.`);
    }
    const raw = fs.readFileSync(fnddsPath, "utf8");
    fnddsItems = JSON.parse(raw).SurveyFoods || [];
    console.log(`- Survey Foods (FNDDS) carregados do JSON: ${fnddsItems.length}`);
  }

  const prepFoundation = prepareFoodRecords(foundationItems, "FOUNDATION");
  const prepFndds = prepareFoodRecords(fnddsItems, "FNDDS");

  console.log("\n--- ESTATÍSTICAS DE PREPARAÇÃO ---");
  console.log(`Foundation processados:        ${prepFoundation.records.length}`);
  console.log(`Foundation sem macros:         ${prepFoundation.withoutEssentialMacros}`);
  console.log(`FNDDS processados:             ${prepFndds.records.length}`);
  console.log(`FNDDS sem macros:              ${prepFndds.withoutEssentialMacros}`);

  const allPlanned = [...prepFoundation.records, ...prepFndds.records];
  console.log(`Total geral planejado:         ${allPlanned.length}`);

  const pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    // Check existing records in target DB by source_uid
    const [existingRows] = await pool.query(
      "SELECT source_uid FROM nutrition_v2_foods WHERE source_key IN (?, ?)",
      [SOURCE_KEY_FOUNDATION, SOURCE_KEY_FNDDS]
    );
    const existingUidSet = new Set(existingRows.map((r) => r.source_uid));
    console.log(`\nRegistros USDA já existentes no banco: ${existingUidSet.size}`);

    const newInserts = allPlanned.filter((r) => !existingUidSet.has(r.sourceUid));
    const ignoredExisting = allPlanned.length - newInserts.length;

    console.log(`Registros a inserir (inéditos):        ${newInserts.length}`);
    console.log(`Registros ignorados (já existentes):   ${ignoredExisting}`);

    if (!isApply) {
      console.log("\n================================================================================");
      console.log("DRY RUN CONCLUÍDO COM SUCESSO. NENHUMA ALTERAÇÃO REALIZADA NO BANCO.");
      console.log("Para gravar no banco de dados, execute com a flag '--apply'.");
      console.log("================================================================================");
      return;
    }

    if (newInserts.length === 0) {
      console.log("\nBase já se encontra 100% atualizada com estes datasets USDA.");
      return;
    }

    console.log(`\nIniciando inserção em lotes de 500 registros (${newInserts.length} total)...`);
    const BATCH_SIZE = 500;
    let insertedTotal = 0;

    const insertSql = `
      INSERT INTO nutrition_v2_foods (
        public_id,
        scope,
        consultancy_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit_code,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        source_uid,
        created_by_user_id,
        created_by_membership_id
      ) VALUES ?
    `;

    for (let i = 0; i < newInserts.length; i += BATCH_SIZE) {
      const chunk = newInserts.slice(i, i + BATCH_SIZE);
      const values = chunk.map((item) => [
        item.publicId,
        item.scope,
        item.consultancyId,
        item.name,
        item.normalizedName,
        item.category,
        item.referenceAmount,
        item.referenceUnitCode,
        item.caloriesKcal,
        item.proteinG,
        item.carbohydrateG,
        item.fatG,
        item.status,
        item.sourceType,
        item.sourceKey,
        item.sourceExternalCode,
        item.sourceVersion,
        item.sourceReference,
        item.sourceImportedAt,
        item.sourceUid,
        null,
        null,
      ]);

      await pool.query(insertSql, [values]);
      insertedTotal += chunk.length;
      process.stdout.write(`Progresso: ${insertedTotal}/${newInserts.length} (${Math.round((insertedTotal / newInserts.length) * 100)}%)\r`);
    }

    console.log(`\n\nSUCESSO: ${insertedTotal} alimentos USDA inseridos com sucesso em nutrition_v2_foods.`);

    // Verification summary
    const [finalCounts] = await pool.query(`
      SELECT
        source_key,
        COUNT(*) as total,
        COUNT(DISTINCT source_uid) as distinct_uids
      FROM nutrition_v2_foods
      WHERE deleted_at IS NULL
      GROUP BY source_key
    `);
    console.log("\n--- CONTAGEM FINAL POR FONTE EM NUTRITION V2 ---");
    console.table(finalCounts);

    const [totalActive] = await pool.query(
      "SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE deleted_at IS NULL"
    );
    console.log(`Total geral de alimentos ativos em nutrition_v2_foods: ${totalActive[0].total}`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error("ERRO CRÍTICO NO IMPORTADOR USDA:", err);
    process.exit(1);
  });
}
