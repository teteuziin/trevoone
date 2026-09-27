/**
 * TREVO ONE - SEED IBGE POF GLOBAL NUTRITION V2
 *
 * Imports official IBGE POF 2008-2009 (Tabelas de Composição Nutricional e Medidas Referidas)
 * into nutrition_v2_foods, nutrition_v2_food_nutrients, and nutrition_v2_food_portions
 * for Brazilian default library expansion (Phase B2).
 *
 * Safety Guards:
 * - NO PROD DB WRITE allowed.
 * - Dry-run by default (requires explicit --apply for DEV DB).
 * - Deduplication against TACO: skips TACO-derived entries (ref_code 2)
 *   and existing items by source_uid.
 */

import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SOURCE_KEY = "IBGE";
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

export function parseArgs(argv) {
  let isApply = false;
  let isAllowProduction = false;
  for (const arg of argv) {
    if (arg === "--apply") {
      isApply = true;
    } else if (arg === "--allow-production") {
      isAllowProduction = true;
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'`);
      process.exit(1);
    }
  }
  return { isApply, isAllowProduction };
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

  const { isProd, isDev, isValid } = classifyDatabase(dbName);
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

  return { isProd, isDev };
}

async function run() {
  const { isApply, isAllowProduction } = parseArgs(process.argv.slice(2));
  const fileEnv = loadFileEnv(".env.local");
  const dbConfig = resolveDatabaseConfig(process.env, fileEnv);

  try {
    validateTargetGuards({
      dbName: dbConfig.database,
      dbHost: dbConfig.host,
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

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
  let dataset;
  try {
    dataset = JSON.parse(rawBytes.toString("utf8"));
  } catch (err) {
    console.error(`ERRO: Falha ao interpretar JSON do dataset: ${err.message}`);
    process.exit(1);
  }

  const { metadata, foods } = dataset;
  if (!metadata || !Array.isArray(foods) || foods.length === 0) {
    console.error(`ERRO: Dataset inválido. Esperados alimentos válidos, encontrados: ${foods?.length}`);
    process.exit(1);
  }

  console.log("=== TREVO ONE - SEED IBGE POF GLOBAL NUTRITION V2 ===");
  console.log("Fonte de dados:", `Dataset oficial IBGE POF (${foods.length} alimentos brutos)`);
  console.log("Banco de dados alvo:", dbConfig.database);
  console.log("Ambiente:", dbConfig.database === PROD_DB_NAME ? "PRODUÇÃO" : "DEV");
  console.log("Modo de execução:", isApply ? "APPLY (Escrita no banco DEV)" : "DRY RUN (Simulação / Sem escrita)");
  console.log("Versão IBGE:", metadata.source_version || SOURCE_VERSION);

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
    // 1. Check existing IBGE foods by source_uid
    const [existingIbge] = await pool.query(
      "SELECT id, source_uid, source_external_code FROM nutrition_v2_foods WHERE source_key = ?",
      [SOURCE_KEY]
    );
    const existingUidSet = new Set(existingIbge.map((r) => r.source_uid));
    const existingMap = new Map();
    existingIbge.forEach((r) => existingMap.set(r.source_external_code, r.id));
    console.log(`Alimentos IBGE já existentes em Nutrition V2: ${existingUidSet.size}`);

    // 2. Load TACO foods to prevent redundant duplicates where TACO is already the primary authority
    const [tacoFoods] = await pool.query(
      "SELECT normalized_name FROM nutrition_v2_foods WHERE source_key = 'TACO'"
    );
    const tacoNormSet = new Set(tacoFoods.map((r) => r.normalized_name));
    console.log(`Alimentos TACO existentes para deduplicação: ${tacoNormSet.size}`);

    // 3. Prepare planned inserts
    const plannedInserts = [];
    let skippedTacoDerived = 0;
    let skippedExactTacoDuplicate = 0;

    for (const food of foods) {
      const sourceUid = food.source_uid;
      if (existingUidSet.has(sourceUid)) {
        continue;
      }

      // Deduplication Rule 1: Skip foods where IBGE explicitly cites TACO (Ref 2)
      if (food.ibge_meta?.is_taco_derived) {
        skippedTacoDerived++;
        continue;
      }

      const normName = normalizeSearchText(food.name);
      const normDisplayName = normalizeSearchText(food.display_name_pt_br || food.name);

      // Deduplication Rule 2: If food has exact normalized match in TACO and is not a specific staple gap
      const isSpecificStaple = food.food_code === "7400101" || food.food_code === "8400101"; // Tilápia e Azeite
      if (!isSpecificStaple && tacoNormSet.has(normName)) {
        skippedExactTacoDuplicate++;
        continue;
      }

      plannedInserts.push({
        publicId: crypto.randomUUID(),
        scope: "GLOBAL",
        consultancyId: null,
        name: food.name.trim(),
        displayNamePtBr: (food.display_name_pt_br || food.name).trim(),
        normalizedName: normName,
        normalizedDisplayNamePtBr: normDisplayName,
        category: food.category ? food.category.trim() : null,
        referenceAmount: Number(food.reference_amount) || 100.0,
        referenceUnitCode: food.reference_unit_code ? food.reference_unit_code.trim() : "G",
        caloriesKcal: food.calories_kcal != null ? Number(food.calories_kcal) : null,
        proteinG: food.protein_g != null ? Number(food.protein_g) : null,
        carbohydrateG: food.carbohydrate_g != null ? Number(food.carbohydrate_g) : null,
        fatG: food.fat_g != null ? Number(food.fat_g) : null,
        fiberG: food.fiber_g != null ? Number(food.fiber_g) : null,
        status: "ACTIVE",
        sourceType: "EXTERNAL",
        dataQuality: "SURVEY_RECIPE",
        sourceKey: SOURCE_KEY,
        sourceExternalCode: String(food.source_external_code),
        sourceVersion: metadata.source_version || SOURCE_VERSION,
        sourceReference: metadata.source_reference || SOURCE_REFERENCE,
        sourceImportedAt: metadata.source_imported_at || new Date().toISOString(),
        sourceUid,
        foodObj: food,
      });
    }

    console.log(`Deduplicação: ${skippedTacoDerived} alimentos ignorados por serem derivados de TACO na origem.`);
    console.log(`Deduplicação: ${skippedExactTacoDuplicate} alimentos ignorados por já existirem em TACO.`);
    console.log(`Novos alimentos IBGE a inserir: ${plannedInserts.length}`);

    if (!isApply) {
      console.log("\nSimulação (DRY RUN) concluída com sucesso.");
      console.log("Nenhuma alteração foi realizada no banco.");
      console.log("Para efetivar a importação no banco DEV, execute com o parâmetro --apply.");
      return;
    }

    if (plannedInserts.length > 0) {
      console.log(`\nIniciando inserção em lote de ${plannedInserts.length} alimentos no banco DEV...`);
      const batchSize = 100;
      let inserted = 0;

      for (let i = 0; i < plannedInserts.length; i += batchSize) {
        const batch = plannedInserts.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];

        for (const item of batch) {
          placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
          values.push(
            item.publicId,
            item.scope,
            item.consultancyId,
            item.name,
            item.displayNamePtBr,
            item.normalizedDisplayNamePtBr,
            item.normalizedName,
            item.category,
            item.referenceAmount,
            item.referenceUnitCode,
            item.caloriesKcal,
            item.proteinG,
            item.carbohydrateG,
            item.fatG,
            item.fiberG,
            item.status,
            item.sourceType,
            item.dataQuality,
            item.sourceKey,
            item.sourceExternalCode,
            item.sourceVersion,
            item.sourceReference,
            item.sourceUid
          );
        }

        const sql = `
          INSERT INTO nutrition_v2_foods (
            public_id,
            scope,
            consultancy_id,
            name,
            display_name_pt_br,
            normalized_display_name_pt_br,
            normalized_name,
            category,
            reference_amount,
            reference_unit_code,
            calories_kcal,
            protein_g,
            carbohydrate_g,
            fat_g,
            fiber_g,
            status,
            source_type,
            data_quality,
            source_key,
            source_external_code,
            source_version,
            source_reference,
            source_uid
          ) VALUES ${placeholders.join(", ")}
        `;

        await pool.query(sql, values);
        inserted += batch.length;
        process.stdout.write(`  Progresso: ${inserted}/${plannedInserts.length} (${Math.round((inserted / plannedInserts.length) * 100)}%)\r`);
      }
      console.log(`\n✓ Inserção concluída: ${inserted} alimentos IBGE importados com sucesso no banco DEV!`);
    }

    // Refresh existingMap with IDs
    const [allIbge] = await pool.query(
      "SELECT id, source_external_code FROM nutrition_v2_foods WHERE source_key = ?",
      [SOURCE_KEY]
    );
    const idMap = new Map();
    allIbge.forEach((r) => idMap.set(r.source_external_code, r.id));

    // Nutrients and Portions enrichment
    const nutrientRows = [];
    const portionRows = [];

    for (const food of foods) {
      const foodId = idMap.get(food.source_external_code);
      if (!foodId) continue;

      if (food.micronutrients) {
        for (const [key, mapping] of Object.entries(NUTR_MAP)) {
          const val = food.micronutrients[key];
          if (val !== null && val !== undefined) {
            const num = Number(val);
            const status = num > 0 ? "KNOWN" : "KNOWN_ZERO";
            nutrientRows.push([foodId, mapping.code, num, mapping.unit, status]);
          }
        }
      }

      const portions = measuresData.measures[food.source_external_code];
      if (portions && portions.length > 0) {
        portions.forEach((p, idx) => {
          portionRows.push([
            crypto.randomUUID(),
            foodId,
            p.label.slice(0, 100),
            p.grams,
            idx + 1,
            "ACTIVE"
          ]);
        });
      }
    }

    if (nutrientRows.length > 0) {
      console.log(`\nInserindo/Atualizando ${nutrientRows.length} nutrientes...`);
      const batchSize = 500;
      for (let i = 0; i < nutrientRows.length; i += batchSize) {
        const chunk = nutrientRows.slice(i, i + batchSize);
        const placeholders = chunk.map(() => "(?, ?, ?, ?, ?)").join(", ");
        await pool.query(
          `INSERT INTO nutrition_v2_food_nutrients (food_id, nutrient_code, amount_per_reference, unit_code, status)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE amount_per_reference = VALUES(amount_per_reference), status = VALUES(status)`,
          chunk.flat()
        );
      }
      console.log(`✓ ${nutrientRows.length} nutrientes processados com sucesso.`);
    }

    // Check if portions already exist
    const [existingPortions] = await pool.query(
      "SELECT COUNT(*) as count FROM nutrition_v2_food_portions fp JOIN nutrition_v2_foods f ON f.id = fp.food_id WHERE f.source_key = ?",
      [SOURCE_KEY]
    );
    if (existingPortions[0].count === 0 && portionRows.length > 0) {
      console.log(`\nInserindo ${portionRows.length} porções de medidas caseiras...`);
      const batchSize = 500;
      for (let i = 0; i < portionRows.length; i += batchSize) {
        const chunk = portionRows.slice(i, i + batchSize);
        const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
        await pool.query(
          `INSERT INTO nutrition_v2_food_portions (public_id, food_id, label, equivalent_reference_amount, sort_order, status)
           VALUES ${placeholders}`,
          chunk.flat()
        );
      }
      console.log(`✓ ${portionRows.length} porções inseridas.`);
    }

    console.log("\n=== IMPORTAÇÃO E ENRIQUECIMENTO CONCLUÍDOS COM SUCESSO ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exit(1);
});
