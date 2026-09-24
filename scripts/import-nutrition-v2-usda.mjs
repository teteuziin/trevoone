/**
 * TREVO ONE — USDA FOODDATA CENTRAL IMPORT SCRIPT (NUTRITION V2)
 * Imports Foundation Foods and Survey Foods (FNDDS) into nutrition_v2_foods.
 *
 * Upgrade-Safe & Idempotent:
 * - Keyed by source_uid ("USDA:FOUNDATION:${fdcId}" and "USDA:FNDDS:${fdcId}").
 * - Same source_uid + same version + same data -> UNCHANGED
 * - Same source_uid + new version or changed data -> UPDATE controlled fields
 * - New source_uid -> INSERT
 * - Preserves TACO and any existing foods without mutation or deletion.
 */

import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { translateUsdaFoodName } from "./translate-nutrition-v2-usda.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SOURCE_KEY_FOUNDATION = "USDA_FOUNDATION";
export const SOURCE_KEY_FNDDS = "USDA_FNDDS";
export const SOURCE_VERSION_FOUNDATION = "Foundation 04/2026";
export const SOURCE_VERSION_FNDDS = "FNDDS 2021-2023 (2024-10-31)";

export const PROD_DB_NAME = "u406031981_trevoone";
export const DEV_DB_NAME = "u406031981_trevoone_dev";
export const EXPECTED_HOST = "srv1595.hstgr.io";
export const ALLOWED_PROD_HOSTS = Object.freeze([
  "127.0.0.1",
  "localhost",
  "srv1595.hstgr.io",
]);
export const ALLOWED_DEV_HOSTS = Object.freeze([
  "127.0.0.1",
  "localhost",
  "srv1595.hstgr.io",
]);

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
  let mode = "foods"; // 'foods', 'micronutrients-only'

  for (const arg of argv) {
    if (arg === "--apply") {
      isApply = true;
    } else if (arg === "--dry-run") {
      isApply = false;
    } else if (arg === "--allow-production") {
      isAllowProduction = true;
    } else if (arg.startsWith("--dataset=")) {
      dataset = arg.split("=")[1].toLowerCase();
    } else if (arg === "--micronutrients-only" || arg === "--mode=micronutrients-only") {
      mode = "micronutrients-only";
    } else if (arg === "--mode=foods") {
      mode = "foods";
    } else {
      console.error(`ERRO: Argumento desconhecido ou inválido: '${arg}'`);
      process.exit(1);
    }
  }

  return { isApply, isAllowProduction, dataset, mode };
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
  if (dbName === PROD_DB_NAME) {
    if (!isAllowProduction) {
      throw new Error("PRODUÇÃO DETECTADA — EXECUÇÃO ABORTADA. Requer flag '--allow-production'.");
    }
    if (!ALLOWED_PROD_HOSTS.includes(dbHost)) {
      throw new Error(
        `ERRO DE SEGURANÇA: Host de produção não autorizado: '${dbHost}'. Esperado um de: ${ALLOWED_PROD_HOSTS.join(", ")}.`
      );
    }
  } else if (dbName === DEV_DB_NAME) {
    if (isAllowProduction) {
      throw new Error("ERRO: '--allow-production' não pode ser usada no banco DEV.");
    }
    if (!ALLOWED_DEV_HOSTS.includes(dbHost)) {
      throw new Error(
        `ERRO DE SEGURANÇA: Host DEV não autorizado: '${dbHost}'. Esperado um de: ${ALLOWED_DEV_HOSTS.join(", ")}.`
      );
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
  let fiber = null;

  if (!foodNutrients || !Array.isArray(foodNutrients)) {
    return { calories, protein, carb, fat, fiber };
  }

  let atwaterSpecific = null;
  let atwaterGeneral = null;

  for (const fn of foodNutrients) {
    const num = String(fn.nutrient?.number);
    let amount = fn.amount != null && !isNaN(fn.amount) ? Number(fn.amount) : null;
    if (amount == null) continue;
    if (amount < 0) amount = 0;

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
    } else if (num === "291") {
      fiber = amount;
    }
  }

  if (calories == null && isFoundation) {
    calories = atwaterSpecific != null ? atwaterSpecific : atwaterGeneral;
  }

  if (calories != null && calories < 0) calories = 0;
  if (protein != null && protein < 0) protein = 0;
  if (carb != null && carb < 0) carb = 0;
  if (fat != null && fat < 0) fat = 0;
  if (fiber != null && fiber < 0) fiber = 0;

  return {
    calories: calories != null ? Number(calories.toFixed(2)) : null,
    protein: protein != null ? Number(protein.toFixed(2)) : null,
    carb: carb != null ? Number(carb.toFixed(2)) : null,
    fat: fat != null ? Number(fat.toFixed(2)) : null,
    fiber: fiber != null ? Number(fiber.toFixed(2)) : null,
  };
}

/**
 * Release E Canonical Micronutrients Mapping based on USDA Nutrient Numbers.
 * Strict mapping without ambiguous fallbacks (no 318 for Vit A, no 324 for Vit D, no 435 for Folate).
 */
export const CANONICAL_NUTRIENT_MAP = Object.freeze({
  "291": { code: "FIBER", unit: "g" },
  "301": { code: "CA", unit: "mg" },
  "303": { code: "FE", unit: "mg" },
  "304": { code: "MG", unit: "mg" },
  "305": { code: "P", unit: "mg" },
  "306": { code: "K", unit: "mg" },
  "307": { code: "NA", unit: "mg" },
  "309": { code: "ZN", unit: "mg" },
  "312": { code: "CU", unit: "mg" },
  "315": { code: "MN", unit: "mg" },
  "317": { code: "SE", unit: "mcg" },
  "320": { code: "VIT_A", unit: "mcg" },
  "401": { code: "VIT_C", unit: "mg" },
  "328": { code: "VIT_D", unit: "mcg" },
  "323": { code: "VIT_E", unit: "mg" },
  "430": { code: "VIT_K", unit: "mcg" },
  "404": { code: "VIT_B1", unit: "mg" },
  "405": { code: "VIT_B2", unit: "mg" },
  "406": { code: "VIT_B3", unit: "mg" },
  "410": { code: "VIT_B5", unit: "mg" },
  "415": { code: "VIT_B6", unit: "mg" },
  "417": { code: "FOLATE", unit: "mcg" },
  "418": { code: "VIT_B12", unit: "mcg" },
});

/**
 * Authoritative, pure extraction of 23 canonical micronutrients from USDA foodNutrients array.
 * Values > 0 are marked KNOWN.
 * Values === 0 are marked KNOWN_ZERO.
 * Audited USDA datasets do not contain explicit trace representation (no synthetic trace produced).
 * Missing/unreported nutrients are not included in the map (resolving to UNKNOWN).
 */
export function extractMicronutrients(foodNutrients) {
  const result = new Map(); // nutrientCode -> { code, amount, unit, status }

  if (!Array.isArray(foodNutrients)) {
    return result;
  }

  for (const fn of foodNutrients) {
    if (!fn || !fn.nutrient) continue;
    const num = String(fn.nutrient.number);
    const defn = CANONICAL_NUTRIENT_MAP[num];
    if (!defn) continue;

    if (fn.amount != null && !isNaN(fn.amount)) {
      const rawNum = Number(fn.amount);
      if (rawNum > 0) {
        result.set(defn.code, {
          code: defn.code,
          amount: Number(rawNum.toFixed(4)),
          unit: defn.unit,
          status: "KNOWN",
        });
      } else if (rawNum === 0) {
        result.set(defn.code, {
          code: defn.code,
          amount: 0,
          unit: defn.unit,
          status: "KNOWN_ZERO",
        });
      }
    }
  }

  return result;
}

export function prepareFoodRecords(items, type) {
  const isFoundation = String(type).toUpperCase() === "FOUNDATION";
  const sourceKey = isFoundation ? SOURCE_KEY_FOUNDATION : SOURCE_KEY_FNDDS;
  const sourceVersion = isFoundation ? SOURCE_VERSION_FOUNDATION : SOURCE_VERSION_FNDDS;
  const prefix = isFoundation ? "USDA:FOUNDATION:" : "USDA:FNDDS:";
  const dataQuality = isFoundation ? "ANALYTICAL_GOLD" : "SURVEY_RECIPE";

  const records = [];
  let withoutEssentialMacros = 0;
  let invalidItems = 0;

  for (const item of items) {
    if (!item || !item.fdcId || !item.description) {
      invalidItems++;
      continue;
    }

    const fdcId = item.fdcId;
    const name = item.description.trim();
    const normalizedName = normalizeSearchText(name);
    const displayNamePtBr = translateUsdaFoodName(name);
    const normalizedDisplayNamePtBr = normalizeSearchText(displayNamePtBr);
    const category =
      item.foodCategory?.description?.trim() ||
      item.wweiaFoodCategory?.wweiaFoodCategoryDescription?.trim() ||
      null;

    const macros = extractMacros(item.foodNutrients, isFoundation);
    if (macros.calories == null && macros.protein == null && macros.carb == null && macros.fat == null) {
      withoutEssentialMacros++;
    }

    const nowIso = new Date().toISOString();

    records.push({
      publicId: crypto.randomUUID(),
      scope: "GLOBAL",
      consultancyId: null,
      name,
      normalizedName,
      displayNamePtBr,
      normalizedDisplayNamePtBr,
      category,
      referenceAmount: 100.0,
      referenceUnitCode: "G",
      caloriesKcal: macros.calories,
      proteinG: macros.protein,
      carbohydrateG: macros.carb,
      fatG: macros.fat,
      fiberG: macros.fiber,
      status: "ACTIVE",
      sourceType: "EXTERNAL",
      dataQuality,
      sourceKey,
      sourceExternalCode: String(fdcId),
      sourceVersion,
      sourceReference: `USDA FoodData Central [FDC ID: ${fdcId}]`,
      sourceImportedAt: nowIso,
      lastVerifiedAt: nowIso,
      sourceUid: `${prefix}${fdcId}`,
    });
  }

  return { records, withoutEssentialMacros, invalidItems };
}

export function reconcilePlannedWithExisting(
  plannedItems,
  existingRows,
  targetSourceKeys,
  { hasFiber = true, hasDataQuality = true } = {}
) {
  const existingMap = new Map(existingRows.map((r) => [r.source_uid, r]));
  const toInsert = [];
  const toUpdate = [];
  let unchangedCount = 0;

  for (const planned of plannedItems) {
    const existing = existingMap.get(planned.sourceUid);
    if (!existing) {
      toInsert.push(planned);
    } else {
      const isVersionSame = existing.source_version === planned.sourceVersion;
      const isNameSame = existing.name === planned.name;
      const isPtBrSame = existing.display_name_pt_br === planned.displayNamePtBr;
      const isCategorySame = (existing.category || null) === (planned.category || null);
      const isCalSame =
        (existing.calories_kcal == null && planned.caloriesKcal == null) ||
        (existing.calories_kcal != null && planned.caloriesKcal != null && Math.abs(Number(existing.calories_kcal) - planned.caloriesKcal) < 0.001);
      const isProtSame =
        (existing.protein_g == null && planned.proteinG == null) ||
        (existing.protein_g != null && planned.proteinG != null && Math.abs(Number(existing.protein_g) - planned.proteinG) < 0.001);
      const isCarbSame =
        (existing.carbohydrate_g == null && planned.carbohydrateG == null) ||
        (existing.carbohydrate_g != null && planned.carbohydrateG != null && Math.abs(Number(existing.carbohydrate_g) - planned.carbohydrateG) < 0.001);
      const isFatSame =
        (existing.fat_g == null && planned.fatG == null) ||
        (existing.fat_g != null && planned.fatG != null && Math.abs(Number(existing.fat_g) - planned.fatG) < 0.001);
      const isFiberSame =
        !hasFiber ||
        (existing.fiber_g == null && planned.fiberG == null) ||
        (existing.fiber_g != null && planned.fiberG != null && Math.abs(Number(existing.fiber_g) - planned.fiberG) < 0.001);
      const isDataQualitySame =
        !hasDataQuality || existing.data_quality === planned.dataQuality;
      const isStatusSame = existing.status === "ACTIVE";

      if (
        isVersionSame &&
        isNameSame &&
        isPtBrSame &&
        isCategorySame &&
        isCalSame &&
        isProtSame &&
        isCarbSame &&
        isFatSame &&
        isFiberSame &&
        isDataQualitySame &&
        isStatusSame
      ) {
        unchangedCount++;
      } else {
        toUpdate.push({
          id: existing.id,
          publicId: existing.public_id,
          planned,
          existingVersion: existing.source_version,
        });
      }
    }
  }

  const plannedUidSet = new Set(plannedItems.map((p) => p.sourceUid));
  const obsoleteRows = existingRows.filter(
    (r) => targetSourceKeys.includes(r.source_key) && !plannedUidSet.has(r.source_uid)
  );
  const obsoleteToInactivate = obsoleteRows.filter((r) => r.status === "ACTIVE");
  const obsoleteToFixProvenance = obsoleteRows.filter(
    (r) => r.source_key === SOURCE_KEY_FOUNDATION && r.source_version === SOURCE_VERSION_FOUNDATION
  );

  return {
    toInsert,
    toUpdate,
    unchangedCount,
    obsoleteRows,
    obsoleteToInactivate,
    obsoleteToFixProvenance,
  };
}

export async function runMicronutrientsOnlyImport({
  pool,
  dataset,
  isApply,
  foundationRawItems,
  fnddsRawItems,
}) {
  console.log("\n================================================================================");
  console.log("MODO SELECIONADO: MICRONUTRIENTS_ONLY");
  console.log("Gravação restrita exclusivamente à tabela: nutrition_v2_food_nutrients");
  console.log("Preservação estrita: nutrition_v2_foods, meal_items, substitutions, plans INTACTOS");
  console.log("================================================================================");

  const targetSourceKeys = [];
  if (dataset === "all" || dataset === "foundation") targetSourceKeys.push(SOURCE_KEY_FOUNDATION);
  if (dataset === "all" || dataset === "fndds") targetSourceKeys.push(SOURCE_KEY_FNDDS);

  // 1. Fetch active foods from DB
  const [foods] = await pool.query(
    `SELECT id, source_uid, source_key, source_external_code, reference_amount, reference_unit_code
     FROM nutrition_v2_foods
     WHERE source_key IN (${targetSourceKeys.map(() => "?").join(", ")})
       AND status = 'ACTIVE'
       AND deleted_at IS NULL`,
    targetSourceKeys
  );

  const foodByUid = new Map(foods.map((f) => [f.source_uid, f]));
  console.log(`\nAlimentos USDA ativos no banco para [${targetSourceKeys.join(", ")}]: ${foods.length}`);

  // 2. Prepare planned micronutrients
  const plannedNutrients = [];
  let foundationRowsCount = 0;
  let fnddsRowsCount = 0;

  if (dataset === "all" || dataset === "foundation") {
    for (const item of foundationRawItems) {
      if (!item || !item.fdcId || !item.description) continue;
      const uid = `USDA:FOUNDATION:${item.fdcId}`;
      const food = foodByUid.get(uid);
      if (!food) continue;

      const micronutrients = extractMicronutrients(item.foodNutrients);
      for (const [code, nutrient] of micronutrients.entries()) {
        const factor = Number(food.reference_amount) / 100.0;
        const amount = nutrient.amount != null ? Number((nutrient.amount * factor).toFixed(4)) : null;
        plannedNutrients.push({
          foodId: food.id,
          sourceKey: SOURCE_KEY_FOUNDATION,
          nutrientCode: code,
          amountPerReference: amount,
          unitCode: nutrient.unit,
          status: nutrient.status,
        });
        foundationRowsCount++;
      }
    }
  }

  if (dataset === "all" || dataset === "fndds") {
    for (const item of fnddsRawItems) {
      if (!item || !item.fdcId || !item.description) continue;
      const uid = `USDA:FNDDS:${item.fdcId}`;
      const food = foodByUid.get(uid);
      if (!food) continue;

      const micronutrients = extractMicronutrients(item.foodNutrients);
      for (const [code, nutrient] of micronutrients.entries()) {
        const factor = Number(food.reference_amount) / 100.0;
        const amount = nutrient.amount != null ? Number((nutrient.amount * factor).toFixed(4)) : null;
        plannedNutrients.push({
          foodId: food.id,
          sourceKey: SOURCE_KEY_FNDDS,
          nutrientCode: code,
          amountPerReference: amount,
          unitCode: nutrient.unit,
          status: nutrient.status,
        });
        fnddsRowsCount++;
      }
    }
  }

  console.log(`Linhas de micronutrientes extraídas do dataset:`);
  if (dataset === "all" || dataset === "foundation") console.log(`  Foundation: ${foundationRowsCount}`);
  if (dataset === "all" || dataset === "fndds") console.log(`  FNDDS:      ${fnddsRowsCount}`);
  console.log(`  Total:      ${plannedNutrients.length}`);

  // 3. Reconcile with existing nutrition_v2_food_nutrients
  const foodIds = [...new Set(plannedNutrients.map((p) => p.foodId))];
  const existingMap = new Map(); // `${food_id}:${nutrient_code}` -> row

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < foodIds.length; i += CHUNK_SIZE) {
    const chunkIds = foodIds.slice(i, i + CHUNK_SIZE);
    const [rows] = await pool.query(
      `SELECT id, food_id, nutrient_code, amount_per_reference, unit_code, status
       FROM nutrition_v2_food_nutrients
       WHERE food_id IN (${chunkIds.map(() => "?").join(", ")})`,
      chunkIds
    );
    for (const r of rows) {
      existingMap.set(`${r.food_id}:${r.nutrient_code}`, r);
    }
  }

  const toInsert = [];
  const toUpdate = [];
  let unchangedCount = 0;

  for (const planned of plannedNutrients) {
    const key = `${planned.foodId}:${planned.nutrientCode}`;
    const existing = existingMap.get(key);
    if (!existing) {
      toInsert.push(planned);
    } else {
      const isStatusSame = existing.status === planned.status;
      const isUnitSame = existing.unit_code === planned.unitCode;
      const isAmountSame =
        (existing.amount_per_reference == null && planned.amountPerReference == null) ||
        (existing.amount_per_reference != null &&
          planned.amountPerReference != null &&
          Math.abs(Number(existing.amount_per_reference) - planned.amountPerReference) < 0.0001);

      if (isStatusSame && isUnitSame && isAmountSame) {
        unchangedCount++;
      } else {
        toUpdate.push({ id: existing.id, planned });
      }
    }
  }

  console.log(`\nReconciliação com o banco de dados:`);
  console.log(`  Novos a inserir (toInsert):          ${toInsert.length}`);
  console.log(`  Existentes a atualizar (toUpdate):   ${toUpdate.length}`);
  console.log(`  Inalterados idênticos (unchanged):   ${unchangedCount}`);

  if (!isApply) {
    console.log("\n================================================================================");
    console.log("DRY RUN MICRONUTRIENTS CONCLUÍDO COM SUCESSO. NENHUMA ALTERAÇÃO REALIZADA NO BANCO.");
    console.log("Para gravar no banco de dados, execute com a flag '--apply'.");
    console.log("================================================================================");
    return {
      foundationRowsCount,
      fnddsRowsCount,
      totalRowsCount: plannedNutrients.length,
      toInsertCount: toInsert.length,
      toUpdateCount: toUpdate.length,
      unchangedCount,
    };
  }

  // 4. Batch Inserts
  if (toInsert.length > 0) {
    console.log(`\nInserindo ${toInsert.length} micronutrientes em lotes de 1000...`);
    let insertedTotal = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const values = chunk.map((p) => [
        p.foodId,
        p.nutrientCode,
        p.amountPerReference,
        p.unitCode,
        p.status,
      ]);
      await pool.query(
        `INSERT INTO nutrition_v2_food_nutrients (
           food_id, nutrient_code, amount_per_reference, unit_code, status
         ) VALUES ?`,
        [values]
      );
      insertedTotal += chunk.length;
      process.stdout.write(`Progresso inserts: ${insertedTotal}/${toInsert.length} (${Math.round((insertedTotal / toInsert.length) * 100)}%)\r`);
    }
    console.log(`\nInserts concluídos: ${insertedTotal} micronutrientes inseridos.`);
  }

  // 5. Updates
  if (toUpdate.length > 0) {
    console.log(`\nAtualizando ${toUpdate.length} micronutrientes alterados...`);
    let updatedTotal = 0;
    for (const u of toUpdate) {
      await pool.query(
        `UPDATE nutrition_v2_food_nutrients
         SET amount_per_reference = ?, unit_code = ?, status = ?
         WHERE id = ?`,
        [u.planned.amountPerReference, u.planned.unitCode, u.planned.status, u.id]
      );
      updatedTotal++;
    }
    console.log(`Updates concluídos: ${updatedTotal} micronutrientes atualizados.`);
  }

  console.log(`\nSUCESSO: Persistência de micronutrientes concluída.`);

  return {
    foundationRowsCount,
    fnddsRowsCount,
    totalRowsCount: plannedNutrients.length,
    toInsertCount: toInsert.length,
    toUpdateCount: toUpdate.length,
    unchangedCount,
  };
}

async function run() {
  const { isApply, isAllowProduction, dataset, mode } = parseArgs(process.argv.slice(2));
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
  console.log("Escopo:        ", mode.toUpperCase());
  console.log("Dataset:       ", dataset.toUpperCase());

  const scratchDir = process.env.USDA_SCRATCH_DIR
    ? path.resolve(process.env.USDA_SCRATCH_DIR)
    : path.resolve(__dirname, "../scratch");

  // Determine Foundation and FNDDS JSON paths with robust candidates
  const candidateFoundation = [
    process.env.USDA_FOUNDATION_PATH,
    path.join(scratchDir, "foundation_2026_extracted/FoodData_Central_foundation_food_json_2026-04-30.json"),
    path.join(scratchDir, "foundation_extracted/FoodData_Central_foundation_food_json_2026-04-30.json"),
    path.join(scratchDir, "foundation_extracted/foundationDownload.json"),
  ].filter(Boolean);

  const candidateFndds = [
    process.env.USDA_FNDDS_PATH,
    path.join(scratchDir, "fndds_extracted/surveyDownload.json"),
  ].filter(Boolean);

  const foundationPath = candidateFoundation.find((p) => fs.existsSync(p));
  const fnddsPath = candidateFndds.find((p) => fs.existsSync(p));

  let foundationRawItems = [];
  let fnddsRawItems = [];

  if (dataset === "all" || dataset === "foundation") {
    if (!foundationPath) {
      throw new Error(`Arquivo Foundation não encontrado nos caminhos candidatos. Execute o download antes.`);
    }
    const raw = fs.readFileSync(foundationPath, "utf8");
    foundationRawItems = JSON.parse(raw).FoundationFoods || [];
    console.log(`- Foundation Foods carregados do JSON (${path.basename(foundationPath)}): ${foundationRawItems.length}`);
  }

  if (dataset === "all" || dataset === "fndds") {
    if (!fnddsPath) {
      throw new Error(`Arquivo FNDDS não encontrado nos caminhos candidatos. Execute o download antes.`);
    }
    const raw = fs.readFileSync(fnddsPath, "utf8");
    fnddsRawItems = JSON.parse(raw).SurveyFoods || [];
    console.log(`- Survey Foods (FNDDS) carregados do JSON (${path.basename(fnddsPath)}): ${fnddsRawItems.length}`);
  }

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
    // Runtime database verification (SELECT DATABASE())
    const [activeDbRows] = await pool.query("SELECT DATABASE() AS db");
    const activeDb = activeDbRows[0]?.db;

    if (!activeDb) {
      throw new Error("ERRO DE SEGURANÇA: SELECT DATABASE() retornou vazio.");
    }

    if (isAllowProduction) {
      if (activeDb !== PROD_DB_NAME) {
        throw new Error(
          `ERRO DE SEGURANÇA: Execução em PRODUÇÃO requer SELECT DATABASE() == '${PROD_DB_NAME}'. Retornado: '${activeDb}'. ABORTANDO.`
        );
      }
    } else {
      if (activeDb === PROD_DB_NAME) {
        throw new Error(
          `ERRO CRÍTICO DE SEGURANÇA: Conectado ao banco de produção '${PROD_DB_NAME}' sem a flag '--allow-production'. ABORTANDO IMEDIATAMENTE.`
        );
      }
      if (activeDb !== DEV_DB_NAME) {
        throw new Error(
          `ERRO DE SEGURANÇA: Banco retornado por SELECT DATABASE() ('${activeDb}') não corresponde ao banco DEV autorizado ('${DEV_DB_NAME}').`
        );
      }
    }

    console.log(`Validação runtime do banco (SELECT DATABASE()): '${activeDb}' OK.`);

    if (mode === "micronutrients-only") {
      await runMicronutrientsOnlyImport({
        pool,
        dataset,
        isApply,
        foundationRawItems,
        fnddsRawItems,
      });
      return;
    }

    const prepFoundation = prepareFoodRecords(foundationRawItems, "FOUNDATION");
    const prepFndds = prepareFoodRecords(fnddsRawItems, "FNDDS");

    const plannedItems = [];
    if (dataset === "all" || dataset === "foundation") {
      plannedItems.push(...prepFoundation.records);
    }
    if (dataset === "all" || dataset === "fndds") {
      plannedItems.push(...prepFndds.records);
    }

    // Audit schema capabilities from target database
    const [colRows] = await pool.query("SHOW COLUMNS FROM nutrition_v2_foods");
    const existingCols = new Set(colRows.map((c) => c.Field));
    const hasFiber = existingCols.has("fiber_g");
    const hasDataQuality = existingCols.has("data_quality");
    const hasLastVerifiedAt = existingCols.has("last_verified_at");

    console.log(`Capacidade de schema em nutrition_v2_foods:`);
    console.log(`  fiber_g:          ${hasFiber ? "PRESENTE" : "AUSENTE"}`);
    console.log(`  data_quality:     ${hasDataQuality ? "PRESENTE" : "AUSENTE"}`);
    console.log(`  last_verified_at: ${hasLastVerifiedAt ? "PRESENTE" : "AUSENTE"}`);

    // Audit current state from target database
    const targetSourceKeys = [];
    if (dataset === "all" || dataset === "foundation") targetSourceKeys.push(SOURCE_KEY_FOUNDATION);
    if (dataset === "all" || dataset === "fndds") targetSourceKeys.push(SOURCE_KEY_FNDDS);

    const selectCols = [
      "id",
      "public_id",
      "source_uid",
      "source_key",
      "source_version",
      "name",
      "normalized_name",
      "display_name_pt_br",
      "normalized_display_name_pt_br",
      "category",
      "reference_amount",
      "reference_unit_code",
      "calories_kcal",
      "protein_g",
      "carbohydrate_g",
      "fat_g",
      "status",
    ];
    if (hasFiber) selectCols.push("fiber_g");
    if (hasDataQuality) selectCols.push("data_quality");
    if (hasLastVerifiedAt) selectCols.push("last_verified_at");

    const [existingRows] = await pool.query(
      `SELECT
        ${selectCols.join(",\n        ")}
      FROM nutrition_v2_foods
      WHERE source_key IN (${targetSourceKeys.map(() => "?").join(", ")})`,
      targetSourceKeys
    );

    const existingMap = new Map(existingRows.map((r) => [r.source_uid, r]));
    console.log(`\nRegistros USDA já existentes no banco para [${targetSourceKeys.join(", ")}]: ${existingMap.size}`);

    const {
      toInsert,
      toUpdate,
      unchangedCount,
      obsoleteRows,
      obsoleteToInactivate,
      obsoleteToFixProvenance,
    } = reconcilePlannedWithExisting(
      plannedItems,
      existingRows,
      targetSourceKeys,
      { hasFiber, hasDataQuality }
    );

    console.log("\n--- ESTATÍSTICAS DE PROCESSAMENTO ---");
    if (dataset === "all" || dataset === "foundation") {
      console.log(`FOUNDATION 04/2026:`);
      console.log(`  Total no arquivo:                 ${foundationRawItems.length}`);
      console.log(`  Inválidos (nulos/sem dados):      ${prepFoundation.invalidItems}`);
      console.log(`  Válidos:                          ${prepFoundation.records.length}`);
      console.log(`  Sem macros essenciais:            ${prepFoundation.withoutEssentialMacros}`);
    }
    if (dataset === "all" || dataset === "fndds") {
      console.log(`FNDDS:`);
      console.log(`  Total no arquivo:                 ${fnddsRawItems.length}`);
      console.log(`  Inválidos:                        ${prepFndds.invalidItems}`);
      console.log(`  Válidos:                          ${prepFndds.records.length}`);
      console.log(`  Sem macros essenciais:            ${prepFndds.withoutEssentialMacros}`);
    }

    console.log(`\nRESUMO DA OPERAÇÃO:`);
    console.log(`  Novos a inserir (INSERT):          ${toInsert.length}`);
    console.log(`  Existentes a atualizar (UPDATE):   ${toUpdate.length}`);
    console.log(`  Existentes idênticos (UNCHANGED):  ${unchangedCount}`);
    console.log(`  Novas inativações de obsoletos:    ${obsoleteToInactivate.length}`);
    if (obsoleteToFixProvenance.length > 0) {
      console.log(`  Correções de proveniência obsoleta: ${obsoleteToFixProvenance.length}`);
    }

    if (!isApply) {
      console.log("\n================================================================================");
      console.log("DRY RUN CONCLUÍDO COM SUCESSO. NENHUMA ALTERAÇÃO REALIZADA NO BANCO.");
      console.log("Para gravar no banco de dados, execute com a flag '--apply'.");
      console.log("================================================================================");
      return;
    }

    // Apply Phase — Pre-write runtime guard
    if (toUpdate.length > 0 || toInsert.length > 0 || obsoleteToInactivate.length > 0 || obsoleteToFixProvenance.length > 0) {
      const [preWriteRows] = await pool.query("SELECT DATABASE() AS db");
      const preWriteDb = preWriteRows[0]?.db;

      if (isAllowProduction) {
        if (preWriteDb !== PROD_DB_NAME) {
          throw new Error(
            `ABORTAR: Falha de segurança pré-escrita! SELECT DATABASE() retornou '${preWriteDb}', esperado exatamente '${PROD_DB_NAME}'. Nenhuma alteração foi realizada.`
          );
        }
      } else {
        if (preWriteDb !== DEV_DB_NAME) {
          throw new Error(
            `ABORTAR: Falha de segurança pré-escrita! SELECT DATABASE() retornou '${preWriteDb}', esperado exatamente '${DEV_DB_NAME}'. Nenhuma alteração foi realizada.`
          );
        }
      }
    }

    if (toUpdate.length > 0) {
      console.log(`\nAtualizando ${toUpdate.length} registros existentes para nova versão...`);
      const updateCols = [
        "name = ?",
        "normalized_name = ?",
        "display_name_pt_br = ?",
        "normalized_display_name_pt_br = ?",
        "category = ?",
        "source_version = ?",
        "source_reference = ?",
        "reference_amount = ?",
        "reference_unit_code = ?",
        "calories_kcal = ?",
        "protein_g = ?",
        "carbohydrate_g = ?",
        "fat_g = ?",
      ];
      if (hasFiber) updateCols.push("fiber_g = ?");
      if (hasDataQuality) updateCols.push("data_quality = ?");
      updateCols.push("status = ?");
      updateCols.push("source_imported_at = ?");
      if (hasLastVerifiedAt) updateCols.push("last_verified_at = ?");

      const updateSql = `
        UPDATE nutrition_v2_foods SET
          ${updateCols.join(",\n          ")}
        WHERE id = ?
      `;

      let updatedCount = 0;
      for (const item of toUpdate) {
        const updateParams = [
          item.planned.name,
          item.planned.normalizedName,
          item.planned.displayNamePtBr,
          item.planned.normalizedDisplayNamePtBr,
          item.planned.category,
          item.planned.sourceVersion,
          item.planned.sourceReference,
          item.planned.referenceAmount,
          item.planned.referenceUnitCode,
          item.planned.caloriesKcal,
          item.planned.proteinG,
          item.planned.carbohydrateG,
          item.planned.fatG,
        ];
        if (hasFiber) updateParams.push(item.planned.fiberG);
        if (hasDataQuality) updateParams.push(item.planned.dataQuality);
        updateParams.push(item.planned.status);
        updateParams.push(new Date().toISOString());
        if (hasLastVerifiedAt) updateParams.push(item.planned.lastVerifiedAt);
        updateParams.push(item.id);

        await pool.query(updateSql, updateParams);
        updatedCount++;
        if (updatedCount % 50 === 0 || updatedCount === toUpdate.length) {
          process.stdout.write(`Progresso updates: ${updatedCount}/${toUpdate.length} (${Math.round((updatedCount / toUpdate.length) * 100)}%)\r`);
        }
      }
      console.log(`\nUpdates concluídos: ${updatedCount} registros atualizados.`);
    }

    if (toInsert.length > 0) {
      console.log(`\nInserindo ${toInsert.length} novos alimentos em lotes de 500...`);
      const BATCH_SIZE = 500;
      let insertedTotal = 0;

      const insertCols = [
        "public_id",
        "scope",
        "consultancy_id",
        "name",
        "normalized_name",
        "display_name_pt_br",
        "normalized_display_name_pt_br",
        "category",
        "reference_amount",
        "reference_unit_code",
        "calories_kcal",
        "protein_g",
        "carbohydrate_g",
        "fat_g",
      ];
      if (hasFiber) insertCols.push("fiber_g");
      insertCols.push("status", "source_type");
      if (hasDataQuality) insertCols.push("data_quality");
      insertCols.push(
        "source_key",
        "source_external_code",
        "source_version",
        "source_reference",
        "source_imported_at"
      );
      if (hasLastVerifiedAt) insertCols.push("last_verified_at");
      insertCols.push(
        "source_uid",
        "created_by_user_id",
        "created_by_membership_id"
      );

      const insertSql = `
        INSERT INTO nutrition_v2_foods (
          ${insertCols.join(",\n          ")}
        ) VALUES ?
      `;

      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const chunk = toInsert.slice(i, i + BATCH_SIZE);
        const values = chunk.map((item) => {
          const row = [
            item.publicId,
            item.scope,
            item.consultancyId,
            item.name,
            item.normalizedName,
            item.displayNamePtBr,
            item.normalizedDisplayNamePtBr,
            item.category,
            item.referenceAmount,
            item.referenceUnitCode,
            item.caloriesKcal,
            item.proteinG,
            item.carbohydrateG,
            item.fatG,
          ];
          if (hasFiber) row.push(item.fiberG);
          row.push(item.status, item.sourceType);
          if (hasDataQuality) row.push(item.dataQuality);
          row.push(
            item.sourceKey,
            item.sourceExternalCode,
            item.sourceVersion,
            item.sourceReference,
            item.sourceImportedAt
          );
          if (hasLastVerifiedAt) row.push(item.lastVerifiedAt);
          row.push(item.sourceUid, null, null);
          return row;
        });

        await pool.query(insertSql, [values]);
        insertedTotal += chunk.length;
        process.stdout.write(`Progresso inserts: ${insertedTotal}/${toInsert.length} (${Math.round((insertedTotal / toInsert.length) * 100)}%)\r`);
      }
      console.log(`\nInserts concluídos: ${insertedTotal} alimentos inseridos.`);
    }

    if (obsoleteToInactivate.length > 0 || obsoleteToFixProvenance.length > 0) {
      console.log(`\nProcessando ${obsoleteRows.length} alimentos obsoletos da release anterior...`);
      for (const obs of obsoleteRows) {
        // Obsolete foods preserve their true last-known release (Foundation 2024-10-31), NOT the new release
        const validVersion =
          obs.source_version === SOURCE_VERSION_FOUNDATION
            ? "Foundation 2024-10-31"
            : obs.source_version;
        await pool.query(
          `UPDATE nutrition_v2_foods SET
            status = 'INACTIVE',
            source_version = ?,
            source_reference = ?,
            source_imported_at = ?
          WHERE id = ?`,
          [
            validVersion,
            `USDA FoodData Central [FDC ID: ${obs.source_external_code || ""}]`,
            new Date().toISOString(),
            obs.id,
          ]
        );
      }
      console.log(`Inativação e preservação de proveniência de obsoletos concluídas.`);
    }

    console.log(`\nSUCESSO: Sincronização USDA concluída.`);

    // Verification summary
    const [finalCounts] = await pool.query(`
      SELECT
        source_key,
        source_version,
        status,
        COUNT(*) as total,
        COUNT(DISTINCT source_uid) as distinct_uids
      FROM nutrition_v2_foods
      WHERE deleted_at IS NULL
      GROUP BY source_key, source_version, status
      ORDER BY source_key, source_version, status
    `);
    console.log("\n--- CONTAGEM FINAL POR FONTE E VERSÃO EM NUTRITION V2 ---");
    console.table(finalCounts);

    const [totalActive] = await pool.query(
      "SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE deleted_at IS NULL AND status = 'ACTIVE'"
    );
    console.log(`Total geral de alimentos ATIVOS em nutrition_v2_foods: ${totalActive[0].total}`);

    // Verify audit specific requirements
    const [foundation2026Active] = await pool.query(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE source_key = ? AND source_version = ? AND status = 'ACTIVE'`,
      [SOURCE_KEY_FOUNDATION, SOURCE_VERSION_FOUNDATION]
    );
    const [foundation2026Inactive] = await pool.query(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE source_key = ? AND source_version = ? AND status = 'INACTIVE'`,
      [SOURCE_KEY_FOUNDATION, SOURCE_VERSION_FOUNDATION]
    );
    const [foundationOldInactive] = await pool.query(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods WHERE source_key = ? AND source_version = 'Foundation 2024-10-31' AND status = 'INACTIVE'`,
      [SOURCE_KEY_FOUNDATION]
    );
    console.log(`\n--- PROVA DE PROVENIÊNCIA E STATUS ---`);
    console.log(`ACTIVE Foundation 04/2026:                           ${foundation2026Active[0].total}`);
    console.log(`INACTIVE Foundation 04/2026 ausentes do dataset:      ${foundation2026Inactive[0].total}`);
    console.log(`INACTIVE Foundation release anterior (2024-10-31):    ${foundationOldInactive[0].total}`);

    if (hasDataQuality) {
      const [qualityCounts] = await pool.query(`
        SELECT data_quality, COUNT(*) as total
        FROM nutrition_v2_foods
        WHERE deleted_at IS NULL
        GROUP BY data_quality
        ORDER BY total DESC
      `);
      console.log("\n--- CONTAGEM POR DATA QUALITY ---");
      console.table(qualityCounts);
    }

    if (hasFiber) {
      const [fiberCounts] = await pool.query(`
        SELECT
          source_key,
          COUNT(*) as total_foods,
          COUNT(fiber_g) as fiber_known,
          SUM(CASE WHEN fiber_g IS NULL THEN 1 ELSE 0 END) as fiber_null,
          SUM(CASE WHEN fiber_g = 0 THEN 1 ELSE 0 END) as fiber_zero,
          SUM(CASE WHEN fiber_g > 0 THEN 1 ELSE 0 END) as fiber_positive
        FROM nutrition_v2_foods
        WHERE deleted_at IS NULL AND status = 'ACTIVE'
        GROUP BY source_key
      `);
      console.log("\n--- COBERTURA DE FIBRA (FIBER_G) EM ATIVOS ---");
      console.table(fiberCounts);
    }
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
