/**
 * TREVO ONE - NUTRITION FOOD LIBRARY BINARY-SEARCH AUDIT
 * Tests progressive SELECT queries against active DB and migrations:
 * TEST A: id/public_id/name
 * TEST B: add scope/status/consultancy fields
 * TEST C: add PT-BR fields
 * TEST D: add macros/fiber/data_quality
 * TEST E: add provenance fields
 * TEST F: add date fields
 * TEST G: add portions subquery
 * TEST H: add ORDER BY (empty query + search query)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  buildWhereClause,
  buildFoodSearchOrderClause,
  tokenizeSearchQuery,
} from "../lib/nutrition-v2/food-query-builder.ts";

console.log("=== INICIANDO AUDITORIA BINÁRIA DA SELECT QUERY (SECTION 8) ===\n");

function loadEnv() {
  const content = fs.existsSync(".env.local")
    ? fs.readFileSync(".env.local", "utf8")
    : fs.existsSync(".env")
    ? fs.readFileSync(".env", "utf8")
    : "";
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq !== -1) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const fileEnv = loadEnv();
const dbHost = process.env.DB_HOST || fileEnv.DB_HOST;
const dbPort = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || fileEnv.DB_USER;
const dbPassword = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD;
const dbName = process.env.DB_NAME || fileEnv.DB_NAME;

if (!dbHost || !dbUser || !dbName) {
  console.log("  [PULADO] Configuração de banco de dados não detectada.");
  process.exit(0);
}

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 2,
});

const conn = await pool.getConnection();

try {
  const dummyConsultancyId = 1;
  const { whereClause, params } = buildWhereClause({}, dummyConsultancyId);

  // TEST A: id/public_id/name (Schema 024)
  console.log("TEST A: SELECT only: id, public_id, name");
  const [rowsA] = await conn.query(
    `SELECT f.id, f.public_id, f.name FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
    params
  );
  assert(rowsA.length > 0, "TEST A deve retornar linhas");
  console.log("  ✓ TEST A: PASS (Dependência mínima: Migration 024)");

  // TEST B: add scope/status/consultancy fields (Schema 024)
  console.log("TEST B: add scope, status, consultancy fields");
  const [rowsB] = await conn.query(
    `SELECT f.id, f.public_id, f.name, f.scope, f.status, f.consultancy_id FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
    params
  );
  assert(rowsB.length > 0, "TEST B deve retornar linhas");
  console.log("  ✓ TEST B: PASS (Dependência: Migration 024)");

  // TEST C: add PT-BR fields (Migration 026)
  console.log("TEST C: add PT-BR fields (display_name_pt_br, normalized_display_name_pt_br)");
  let testCPassed = false;
  try {
    const [rowsC] = await conn.query(
      `SELECT f.id, f.public_id, f.name, f.display_name_pt_br, f.normalized_display_name_pt_br FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
      params
    );
    testCPassed = rowsC.length > 0;
    assert(testCPassed);
    console.log("  ✓ TEST C: PASS on DEV (Dependência: Migration 026)");
  } catch (err) {
    console.log(`  ✗ TEST C: FAIL (${err.code}) - requer Migration 026`);
  }

  // TEST D: add macros/fiber/data_quality (Migration 024 + 029)
  console.log("TEST D: add macros, fiber, data_quality");
  try {
    const [rowsD] = await conn.query(
      `SELECT f.id, f.public_id, f.name, f.calories_kcal, f.protein_g, f.carbohydrate_g, f.fat_g, f.fiber_g, f.data_quality FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
      params
    );
    assert(rowsD.length > 0);
    console.log("  ✓ TEST D: PASS on DEV (Dependência: Migration 029 para fiber_g e data_quality)");
  } catch (err) {
    console.log(`  ✗ TEST D: FAIL (${err.code}) - requer Migration 029`);
  }

  // TEST E: add provenance fields (Migration 024)
  console.log("TEST E: add provenance fields (source_type, source_key, source_external_code, source_version, source_reference, source_imported_at, source_uid)");
  const [rowsE] = await conn.query(
    `SELECT f.id, f.public_id, f.name, f.source_type, f.source_key, f.source_external_code, f.source_version, f.source_reference, f.source_imported_at, f.source_uid FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
    params
  );
  assert(rowsE.length > 0, "TEST E deve retornar linhas");
  console.log("  ✓ TEST E: PASS (Dependência: Migration 024)");

  // TEST F: add date & audit fields
  console.log("TEST F: add date fields (created_at, updated_at, deleted_at, last_verified_at)");
  try {
    const [rowsF] = await conn.query(
      `SELECT f.id, f.public_id, f.name, f.created_at, f.updated_at, f.deleted_at, f.last_verified_at FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
      params
    );
    assert(rowsF.length > 0);
    console.log("  ✓ TEST F: PASS on DEV (Dependência: Migration 029 para last_verified_at, 024 para o restante)");
  } catch (err) {
    console.log(`  ✗ TEST F: FAIL (${err.code})`);
  }

  // TEST G: add portions subquery
  console.log("TEST G: add portions correlated subquery");
  const [rowsG] = await conn.query(
    `SELECT f.id, f.public_id, f.name,
      (SELECT COUNT(*) FROM nutrition_v2_food_portions fp WHERE fp.food_id = f.id AND fp.deleted_at IS NULL AND fp.status = 'ACTIVE') as portions_count
    FROM nutrition_v2_foods f WHERE ${whereClause} LIMIT 5`,
    params
  );
  assert(rowsG.length > 0, "TEST G deve retornar linhas");
  console.log("  ✓ TEST G: PASS (Dependência: Migration 024 nutrition_v2_food_portions)");

  // TEST H: add ORDER BY
  console.log("TEST H: add ORDER BY (Empty query + Search query)");
  const { orderClause: emptyOrder } = buildFoodSearchOrderClause("", [], true);
  assert(
    !emptyOrder.includes("display_name_pt_br") && !emptyOrder.includes("data_quality"),
    "Empty order clause não pode depender de colunas pós-024"
  );
  const [rowsHEmpty] = await conn.query(
    `SELECT f.id, f.public_id, f.name FROM nutrition_v2_foods f WHERE ${whereClause} ${emptyOrder} LIMIT 5`,
    params
  );
  assert(rowsHEmpty.length > 0, "TEST H (vazia) deve retornar linhas");

  const queryTokens = tokenizeSearchQuery("arroz");
  const { orderClause: searchOrder, orderParams } = buildFoodSearchOrderClause("arroz", queryTokens, true);
  assert(
    !searchOrder.includes("data_quality") && !searchOrder.includes("brand"),
    "Search order clause não pode depender de colunas pós-024"
  );
  const [rowsHSearch] = await conn.query(
    `SELECT f.id, f.public_id, f.name FROM nutrition_v2_foods f WHERE ${whereClause} ${searchOrder} LIMIT 5`,
    [...params, ...orderParams]
  );
  assert(rowsHSearch.length > 0, "TEST H (busca) deve retornar linhas");
  console.log("  ✓ TEST H: PASS (Empty query & search query usam schema 024 garantido)");

} finally {
  conn.release();
  await pool.end();
}

console.log("\n=======================================================");
console.log("AUDITORIA BINÁRIA CONCLUÍDA COM SUCESSO!");
console.log("=======================================================\n");
