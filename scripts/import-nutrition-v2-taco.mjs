import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_KEY = "TACO";
const SOURCE_VERSION = "4ª edição revisada e ampliada (2011)";
const EXPECTED_HISTORICAL_SHA256 = "a66b8ec528daeabc63bc2b015fc9bd8c6d76b941c2fc0ed93a4311d449302d14";
const SOURCE_REFERENCE = `NEPA/UNICAMP - TACO 4ª edição (2011) [SHA-256: ${EXPECTED_HISTORICAL_SHA256}]`;

function normalizeSearchText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseArgs(argv) {
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

function loadEnv() {
  const content = fs.readFileSync(".env.local", "utf8");
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

async function run() {
  const { isApply, isAllowProduction } = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  const PROD_DB_NAME = "u406031981_trevoone";
  const DEV_DB_NAME = "u406031981_trevoone_dev";
  const EXPECTED_HOST = "srv1595.hstgr.io";

  if (env.DB_HOST !== EXPECTED_HOST) {
    console.error(`ERRO DE SEGURANÇA: Host inesperado: '${env.DB_HOST}'. Esperado: '${EXPECTED_HOST}'.`);
    process.exit(1);
  }

  // Target database authorization guard
  if (env.DB_NAME === PROD_DB_NAME) {
    if (!isAllowProduction) {
      console.error("PRODUÇÃO DETECTADA — EXECUÇÃO ABORTADA.");
      console.error("O banco de dados configurado é PRODUÇÃO (u406031981_trevoone).");
      console.error("Para executar contra produção, é obrigatório fornecer a flag explícita '--allow-production'.");
      process.exit(1);
    }
  } else if (env.DB_NAME === DEV_DB_NAME) {
    if (isAllowProduction) {
      console.error("ERRO: Flag inconsistente: '--allow-production' não pode ser utilizada contra o banco DEV (u406031981_trevoone_dev).");
      process.exit(1);
    }
  } else {
    console.error(`ERRO DE SEGURANÇA: Banco de dados não autorizado: '${env.DB_NAME}'.`);
    process.exit(1);
  }

  // Load canonical bundled dataset (independent of target DB)
  const datasetPath = path.resolve(__dirname, "../data/nutrition/taco-2011.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`ERRO: Arquivo do dataset canônico não encontrado: ${datasetPath}`);
    process.exit(1);
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
  if (!metadata || !Array.isArray(foods) || foods.length !== 548) {
    console.error(`ERRO: Dataset inválido. Esperados 548 alimentos, encontrados: ${foods?.length}`);
    process.exit(1);
  }

  console.log("=== TREVO ONE — SEED TACO GLOBAL NUTRITION V2 ===");
  console.log("Fonte de dados:", `Dataset canônico embutido (${foods.length} alimentos)`);
  console.log("Banco de dados alvo:", env.DB_NAME);
  console.log("Ambiente:", env.DB_NAME === PROD_DB_NAME ? "PRODUÇÃO" : "DEV");
  console.log("Modo de execução:", isApply ? "APPLY (Escrita no banco)" : "DRY RUN (Simulação / Sem escrita)");
  console.log("Versão TACO:", metadata.source_version || SOURCE_VERSION);

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  try {
    // 1. Check existing matching V2 records by source_uid in target DB
    const [existingV2] = await pool.query(
      "SELECT source_uid FROM nutrition_v2_foods WHERE source_key = ?",
      [metadata.source_key || SOURCE_KEY]
    );
    const existingUidSet = new Set(existingV2.map((r) => r.source_uid));
    console.log(`Alimentos TACO já existentes em Nutrition V2: ${existingUidSet.size}`);

    // 2. Prepare planned inserts from canonical dataset
    const plannedInserts = [];
    for (const food of foods) {
      const sourceUid = food.source_uid;
      if (existingUidSet.has(sourceUid)) {
        continue;
      }

      plannedInserts.push({
        publicId: crypto.randomUUID(),
        scope: "GLOBAL",
        consultancyId: null,
        name: food.name.trim(),
        normalizedName: normalizeSearchText(food.name),
        category: food.category ? food.category.trim() : null,
        referenceAmount: Number(food.reference_amount) || 100.0,
        referenceUnitCode: food.reference_unit_code ? food.reference_unit_code.trim() : "G",
        caloriesKcal: food.calories_kcal != null ? Number(food.calories_kcal) : null,
        proteinG: food.protein_g != null ? Number(food.protein_g) : null,
        carbohydrateG: food.carbohydrate_g != null ? Number(food.carbohydrate_g) : null,
        fatG: food.fat_g != null ? Number(food.fat_g) : null,
        status: "ACTIVE",
        sourceType: "EXTERNAL",
        sourceKey: metadata.source_key || SOURCE_KEY,
        sourceExternalCode: String(food.source_external_code),
        sourceVersion: metadata.source_version || SOURCE_VERSION,
        sourceReference: metadata.source_reference || SOURCE_REFERENCE,
        sourceImportedAt: metadata.source_imported_at || "2026-08-16T17:26:37.707Z",
        sourceUid,
      });
    }

    console.log(`Novos alimentos a inserir: ${plannedInserts.length}`);

    if (!isApply) {
      console.log("\nSimulação concluída com sucesso.");
      console.log("Nenhuma alteração foi realizada no banco.");
      console.log("Para efetivar a importação, execute com o parâmetro --apply.");
      return;
    }

    if (plannedInserts.length === 0) {
      console.log("\nNenhum novo registro a inserir. Base Nutrition V2 já está 100% sincronizada.");
      return;
    }

    // 3. Perform batch insert into nutrition_v2_foods
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

    const values = plannedInserts.map((item) => [
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
      null, // created_by_user_id
      null, // created_by_membership_id
    ]);

    await pool.query(insertSql, [values]);
    console.log(`\nSUCESSO: ${plannedInserts.length} alimentos TACO importados com sucesso para nutrition_v2_foods.`);

    // 4. Verify post-insert state
    const [finalCount] = await pool.query(
      "SELECT COUNT(*) as total, COUNT(DISTINCT source_uid) as distinct_uids FROM nutrition_v2_foods WHERE source_key = ?",
      [metadata.source_key || SOURCE_KEY]
    );
    console.log(`Total TACO em Nutrition V2 após importação: ${finalCount[0].total}`);
    console.log(`Total de source_uid únicos: ${finalCount[0].distinct_uids}`);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("ERRO CRÍTICO AO EXECUTAR IMPORTADOR:", err);
  process.exit(1);
});
