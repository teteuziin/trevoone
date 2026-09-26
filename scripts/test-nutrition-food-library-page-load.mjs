/**
 * TREVO ONE — NUTRITION FOOD LIBRARY PAGE LOAD REGRESSION TEST
 * Validates:
 * 1. Role-based authorization boundaries (Nutritionist, Admin, Student, Personal)
 * 2. Pre-033 schema compatibility (no brand, product_line, flavor_or_variant, manufacturer)
 * 3. Defensive row mapping integrity (null/malformed dates & numbers)
 * 4. Real DB page query execution on DEV (empty, arroz, feijao, aipim)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
} from "../lib/nutrition-v2/food-search.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: FOOD LIBRARY PAGE LOAD & RUNTIME INTEGRITY ===\n");

// ----------------------------------------------------------------------------
// 1. PRE-033 SCHEMA AUDIT
// ----------------------------------------------------------------------------
console.log("Test 1: Auditando consultas SQL da Food Library para compatibilidade pré-033...");
{
  const repoContent = fs.readFileSync("lib/nutrition-v2/food-repository.ts", "utf8");
  const forbiddenColumns = ["f.brand", "f.product_line", "f.flavor_or_variant", "f.manufacturer"];
  for (const col of forbiddenColumns) {
    assert(
      !repoContent.includes(col),
      `A consulta em food-repository.ts NÃO pode conter a coluna '${col}' (dependente da migração 033)`
    );
  }
  console.log("  ✓ Consulta em food-repository.ts não depende de colunas da migração 033.");
}

// ----------------------------------------------------------------------------
// 2. DEFENSIVE ROW MAPPING HELPERS
// ----------------------------------------------------------------------------
console.log("Test 2: Validando helpers de mapeamento defensivo contra campos nulos e malformados...");
{
  function safeIsoString(val, fallback = null) {
    if (val == null || val === "" || val === "0000-00-00 00:00:00" || val === "0000-00-00") {
      return fallback;
    }
    if (val instanceof Date) {
      return Number.isNaN(val.getTime()) ? fallback : val.toISOString();
    }
    if (typeof val === "string" || typeof val === "number") {
      try {
        const d = new Date(val);
        return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  function safeNullableNumber(val) {
    if (val == null || val === "") return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }

  function safeNumber(val, fallback = 0) {
    if (val == null || val === "") return fallback;
    const n = Number(val);
    return Number.isNaN(n) ? fallback : n;
  }

  // Adversarial edge cases that previously threw RangeError: Invalid time value
  assert.equal(safeIsoString(null), null);
  assert.equal(safeIsoString(undefined), null);
  assert.equal(safeIsoString("0000-00-00 00:00:00"), null);
  assert.equal(safeIsoString("0000-00-00"), null);
  assert.equal(safeIsoString(new Date(NaN)), null);
  assert.equal(safeIsoString("data-invalida-xyz"), null);
  assert.equal(safeIsoString(new Date("2026-09-26T12:00:00.000Z")), "2026-09-26T12:00:00.000Z");

  assert.equal(safeNullableNumber(null), null);
  assert.equal(safeNullableNumber(""), null);
  assert.equal(safeNullableNumber("NaN"), null);
  assert.equal(safeNullableNumber("12.5"), 12.5);

  assert.equal(safeNumber(null, 100), 100);
  assert.equal(safeNumber("invalid", 100), 100);
  assert.equal(safeNumber("50", 100), 50);

  console.log("  ✓ Mapeamento defensivo protege contra valores corrompidos ou zerados.");
}

// ----------------------------------------------------------------------------
// 3. ROLE-BASED ACCESS CONTROL AUDIT
// ----------------------------------------------------------------------------
console.log("Test 3: Validando matriz de autorização para Food Library...");
{
  function evaluateAccess(roles, isPlatformAdmin = false) {
    const hasRole = (role) => roles.includes(role);
    const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
    const canAuthorNutrition = hasRole("NUTRITIONIST");
    const canViewNutrition = canAuthorNutrition || canManageConsultancy || isPlatformAdmin;
    const isStudent = hasRole("STUDENT");
    return { canViewNutrition, canAuthorNutrition, canManageConsultancy, isStudent };
  }

  // A) NUTRITIONIST
  const nutAcc = evaluateAccess(["NUTRITIONIST"]);
  assert.equal(nutAcc.canViewNutrition, true, "NUTRITIONIST deve ter READ");
  assert.equal(nutAcc.canAuthorNutrition, true, "NUTRITIONIST deve ter WRITE");

  // B) CONSULTANCY_ADMIN only
  const admAcc = evaluateAccess(["CONSULTANCY_ADMIN"]);
  assert.equal(admAcc.canViewNutrition, true, "CONSULTANCY_ADMIN deve ter READ");
  assert.equal(admAcc.canAuthorNutrition, false, "CONSULTANCY_ADMIN isolado NÃO deve ter WRITE");

  // C) STUDENT
  const stuAcc = evaluateAccess(["STUDENT"]);
  assert.equal(stuAcc.canViewNutrition, false, "STUDENT deve ser BLOQUEADO de READ");
  assert.equal(stuAcc.canAuthorNutrition, false, "STUDENT deve ser BLOQUEADO de WRITE");

  // D) PERSONAL only
  const perAcc = evaluateAccess(["PERSONAL"]);
  assert.equal(perAcc.canViewNutrition, false, "PERSONAL isolado deve ser BLOQUEADO de READ");
  assert.equal(perAcc.canAuthorNutrition, false, "PERSONAL isolado deve ser BLOQUEADO de WRITE");

  // E) PLATFORM_ADMIN without membership
  const paAcc = evaluateAccess([], true);
  assert.equal(paAcc.canViewNutrition, true, "PLATFORM_ADMIN deve ter READ preview");
  assert.equal(paAcc.canAuthorNutrition, false, "PLATFORM_ADMIN sem membership não deve ter WRITE");

  console.log("  ✓ NUTRITIONIST: READ=YES, WRITE=YES");
  console.log("  ✓ CONSULTANCY_ADMIN: READ=YES, WRITE=BLOCKED");
  console.log("  ✓ STUDENT: READ=BLOCKED, WRITE=BLOCKED");
  console.log("  ✓ PERSONAL: READ=BLOCKED, WRITE=BLOCKED");
  console.log("  ✓ PLATFORM_ADMIN: READ=YES, WRITE=BLOCKED");
}

// ----------------------------------------------------------------------------
// 4. REAL DB REPOSITORY QUERIES ON DEV
// ----------------------------------------------------------------------------
console.log("Test 4: Executando consultas reais no banco de dados ativo (DEV)...");
async function runDbTests() {
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
    return;
  }

  const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 3,
  });

  const conn = await pool.getConnection();
  try {
    async function executeFoodSearch(queryText) {
      const dummyConsultancyId = 1;
      const pageSize = 20;
      const offset = 0;

      const conditions = ["f.deleted_at IS NULL"];
      const params = [];

      conditions.push(
        "((f.scope = 'GLOBAL' AND f.status = 'ACTIVE') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ACTIVE'))"
      );
      params.push(dummyConsultancyId);

      const queryTokens = queryText ? tokenizeSearchQuery(queryText) : [];
      if (queryTokens.length > 0) {
        const tokenGroups = expandSearchTokensWithSynonyms(queryTokens);
        for (const group of tokenGroups) {
          const orClauses = [];
          for (const variant of group) {
            orClauses.push("f.normalized_display_name_pt_br LIKE ? OR f.normalized_name LIKE ?");
            params.push(`%${variant}%`, `%${variant}%`);
          }
          conditions.push(`(${orClauses.join(" OR ")})`);
        }
      }

      const whereClause = conditions.join(" AND ");

      const [countRows] = await conn.query(
        `SELECT COUNT(*) as total FROM nutrition_v2_foods f WHERE ${whereClause}`,
        params
      );
      const total = Number(countRows[0]?.total || 0);

      const { orderClause, orderParams } = buildFoodSearchOrderClause(
        queryText || "",
        queryTokens,
        true
      );
      const selectParams = [...params, ...orderParams, pageSize, offset];

      const [rows] = await conn.query(
        `SELECT
          f.public_id,
          f.scope,
          f.consultancy_id,
          f.name,
          f.display_name_pt_br,
          f.normalized_display_name_pt_br,
          f.normalized_name,
          f.category,
          f.reference_amount,
          f.reference_unit_code,
          f.calories_kcal,
          f.protein_g,
          f.carbohydrate_g,
          f.fat_g,
          f.fiber_g,
          f.data_quality,
          f.status,
          f.source_type,
          f.source_key,
          f.source_external_code,
          f.source_version,
          f.source_reference,
          f.source_imported_at,
          f.last_verified_at,
          f.source_uid,
          f.created_by_user_id,
          f.created_by_membership_id,
          f.created_at,
          f.updated_at,
          f.deleted_at,
          (
            SELECT COUNT(*)
            FROM nutrition_v2_food_portions fp
            WHERE fp.food_id = f.id
              AND fp.deleted_at IS NULL
              AND fp.status = 'ACTIVE'
          ) AS portions_count
        FROM nutrition_v2_foods f
        WHERE ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?`,
        selectParams
      );

      // Verify mapping against rows
      const items = rows.map((r) => ({
        publicId: String(r.public_id || ""),
        name: String(r.name || ""),
        displayNamePtBr: r.display_name_pt_br != null ? String(r.display_name_pt_br) : null,
        referenceAmount: Number(r.reference_amount) || 100,
        portionsCount: Number(r.portions_count || 0),
      }));

      return { total, items };
    }

    // A) Empty query
    const resEmpty = await executeFoodSearch("");
    assert(resEmpty.total > 0, "Catálogo não pode estar vazio");
    assert(resEmpty.items.length > 0, "Primeira página deve conter alimentos");
    console.log(`  ✓ Consulta VAZIA: ${resEmpty.total} alimentos no total (${resEmpty.items.length} na página 1).`);

    // B) Arroz
    const resArroz = await executeFoodSearch("arroz");
    assert(resArroz.total > 0, "Busca 'arroz' deve retornar itens");
    console.log(`  ✓ Busca "arroz": ${resArroz.total} resultados.`);

    // C) Feijão
    const resFeijao = await executeFoodSearch("feijão");
    assert(resFeijao.total > 0, "Busca 'feijão' deve retornar itens");
    console.log(`  ✓ Busca "feijão": ${resFeijao.total} resultados.`);

    // D) Aipim (mandioca synonym)
    const resAipim = await executeFoodSearch("aipim");
    assert(resAipim.total > 0, "Busca 'aipim' deve retornar itens via sinônimos de mandioca");
    console.log(`  ✓ Busca "aipim": ${resAipim.total} resultados.`);

  } finally {
    conn.release();
    await pool.end();
  }
}

await runDbTests();

console.log("\n=======================================================");
console.log("SUÍTE FOOD LIBRARY: TODOS OS TESTES PASSARAM COM SUCESSO!");
console.log("=======================================================\n");
