import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";

const SOURCE_KEY = "TACO";
const SOURCE_VERSION = "4ª edição revisada e ampliada (2011)";
const EXPECTED_SOURCE_SHA256 = "a66b8ec528daeabc63bc2b015fc9bd8c6d76b941c2fc0ed93a4311d449302d14";
const SOURCE_REFERENCE = `NEPA/UNICAMP - TACO 4ª edição (2011) [SHA-256: ${EXPECTED_SOURCE_SHA256}]`;

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
  for (const arg of argv) {
    if (arg === "--apply") {
      isApply = true;
    }
  }
  return { isApply };
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
  const { isApply } = parseArgs(process.argv.slice(2));
  const env = loadEnv();

  // Safety check: Dev target only
  if (env.DB_NAME !== "u406031981_trevoone_dev" || env.DB_HOST !== "srv1595.hstgr.io") {
    console.error("ERRO DE SEGURANÇA: Este script só pode ser executado no banco DEV (u406031981_trevoone_dev).");
    process.exit(1);
  }

  console.log("=== TREVO ONE — SEED TACO GLOBAL NUTRITION V2 ===");
  console.log("Banco de dados:", env.DB_NAME);
  console.log("Modo de execução:", isApply ? "APPLY (Escrita no banco)" : "DRY RUN (Simulação / Sem escrita)");
  console.log("Versão TACO:", SOURCE_VERSION);

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  try {
    // 1. Read existing TACO foods from V1 as transitional source
    const [v1Rows] = await pool.query(
      `SELECT
        id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at
      FROM nutrition_foods
      WHERE source_key = ?
      ORDER BY CAST(source_external_code AS UNSIGNED) ASC`,
      [SOURCE_KEY]
    );

    console.log(`\nAlimentos TACO encontrados na base V1: ${v1Rows.length}`);
    if (v1Rows.length === 0) {
      console.error("ERRO: Nenhum alimento TACO encontrado em nutrition_foods para importação.");
      process.exit(1);
    }

    // 2. Check existing matching V2 records by source_uid
    const [existingV2] = await pool.query(
      "SELECT source_uid FROM nutrition_v2_foods WHERE source_key = ?",
      [SOURCE_KEY]
    );
    const existingUidSet = new Set(existingV2.map((r) => r.source_uid));
    console.log(`Alimentos TACO já existentes em Nutrition V2: ${existingUidSet.size}`);

    // 3. Prepare planned inserts
    const plannedInserts = [];
    for (const row of v1Rows) {
      const sourceUid = `${SOURCE_KEY}:${row.source_version || SOURCE_VERSION}:${row.source_external_code}`;
      if (existingUidSet.has(sourceUid)) {
        continue;
      }

      plannedInserts.push({
        publicId: crypto.randomUUID(),
        scope: "GLOBAL",
        consultancyId: null,
        name: row.name.trim(),
        normalizedName: row.normalized_name ? row.normalized_name.trim() : normalizeSearchText(row.name),
        category: row.category ? row.category.trim() : null,
        referenceAmount: Number(row.reference_amount) || 100.0,
        referenceUnitCode: row.reference_unit ? row.reference_unit.trim() : "G",
        caloriesKcal: row.calories_kcal != null ? Number(row.calories_kcal) : null,
        proteinG: row.protein_g != null ? Number(row.protein_g) : null,
        carbohydrateG: row.carbohydrate_g != null ? Number(row.carbohydrate_g) : null,
        fatG: row.fat_g != null ? Number(row.fat_g) : null,
        status: "ACTIVE",
        sourceType: "EXTERNAL",
        sourceKey: SOURCE_KEY,
        sourceExternalCode: String(row.source_external_code),
        sourceVersion: row.source_version || SOURCE_VERSION,
        sourceReference: row.source_reference || SOURCE_REFERENCE,
        sourceImportedAt: row.source_imported_at || new Date(),
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

    // 4. Perform batch insert
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

    // 5. Verify post-insert state
    const [finalCount] = await pool.query(
      "SELECT COUNT(*) as total, COUNT(DISTINCT source_uid) as distinct_uids FROM nutrition_v2_foods WHERE source_key = ?",
      [SOURCE_KEY]
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
