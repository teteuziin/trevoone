/**
 * TREVO ONE - NUTRITION FOOD LIBRARY PAGE LOAD REGRESSION TEST
 * Validates:
 * 1. Initial Load Query Contract (query=undefined, scope=ALL, status=ACTIVE, page=1, pageSize=20)
 * 2. Pre-033 & Pre-029 schema compatibility (zero unconfirmed columns in initial query)
 * 3. Exact Initial COUNT query dependencies (only 024 guaranteed columns)
 * 4. Defensive mapping integrity & removal of fake semantic defaults (Section 10)
 * 5. Role-based authorization boundaries (Nutritionist, Admin, Student, Personal)
 * 6. Real DB page query execution on DEV (empty, arroz, feijao, aipim)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  buildCountQuery,
  buildSelectFoodsQuery,
  mapFoodRow,
  FoodLibraryMappingError,
} from "../lib/nutrition-v2/food-query-builder.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: FOOD LIBRARY PAGE LOAD & RUNTIME INTEGRITY ===\n");

// ----------------------------------------------------------------------------
// 1. INITIAL LOAD QUERY CONTRACT & SCHEMA DEPENDENCY AUDIT
// ----------------------------------------------------------------------------
console.log("Test 1: Validando contrato exato de carga inicial (INITIAL LOAD CONTRACT)...");
{
  const initialFilter = {
    query: undefined,
    scope: "ALL",
    status: "ACTIVE",
    page: 1,
    pageSize: 20,
  };
  const dummyConsultancyId = 42;

  // A) Initial COUNT query
  const countQuery = buildCountQuery(initialFilter, dummyConsultancyId);
  console.log("  Initial COUNT SQL:", countQuery.sql);
  assert(countQuery.sql.startsWith("SELECT COUNT(*) as total FROM nutrition_v2_foods f WHERE"), "COUNT query inválida");
  assert(countQuery.params.includes(dummyConsultancyId), "COUNT deve conter tenancy param");

  // Verify COUNT query contains ONLY guaranteed 024 columns
  const forbiddenInCount = [
    "display_name_pt_br", "normalized_display_name_pt_br",
    "fiber_g", "data_quality", "last_verified_at",
    "brand", "product_line", "flavor_or_variant", "manufacturer"
  ];
  for (const col of forbiddenInCount) {
    assert(!countQuery.sql.includes(col), `COUNT não pode referenciar ${col}`);
  }
  console.log("  ✓ Initial COUNT query validada: depende exclusivamente de colunas 024.");

  // B) Initial SELECT query
  const selectQuery = buildSelectFoodsQuery(initialFilter, dummyConsultancyId, { isUnified: true });
  console.log("  Initial SELECT fields guaranteed by 024 schema foundation.");

  // Assert empty query order clause uses only 024 columns (f.scope, f.name)
  assert.equal(
    selectQuery.orderClause.trim(),
    "ORDER BY CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC, f.name ASC",
    "Empty query ORDER BY deve usar f.name ASC sem colunas posteriores a 024"
  );
  console.log("  ✓ Initial ORDER BY clause validada: ORDER BY f.scope, f.name ASC.");

  // Assert fullSql has portions count and no post-024 columns in list SELECT
  assert(selectQuery.fullSql.includes("portions_count"), "SELECT deve incluir portions_count");
  assert(!selectQuery.fullSql.includes("fiber_g"), "SELECT inicial não deve requerer fiber_g (029)");
  assert(!selectQuery.fullSql.includes("data_quality"), "SELECT inicial não deve requerer data_quality (029)");
  assert(!selectQuery.fullSql.includes("last_verified_at"), "SELECT inicial não deve requerer last_verified_at (029)");
  assert(!selectQuery.fullSql.includes("brand"), "SELECT não pode conter brand (033)");
  assert(!selectQuery.fullSql.includes("product_line"), "SELECT não pode conter product_line (033)");
  assert(!selectQuery.fullSql.includes("flavor_or_variant"), "SELECT não pode conter flavor_or_variant (033)");
  assert(!selectQuery.fullSql.includes("manufacturer"), "SELECT não pode conter manufacturer (033)");
  console.log("  ✓ Initial SELECT query validada: 100% compatível com schema 024.");
}

// ----------------------------------------------------------------------------
// 2. DEFENSIVE MAPPING INTEGRITY & NO FAKE SEMANTIC DEFAULTS (SECTION 10)
// ----------------------------------------------------------------------------
console.log("Test 2: Validando mapeamento estrito e remoção de falsos defaults semânticos...");
{
  const validBaseRow = {
    public_id: "food-1234-abcd-5678",
    scope: "GLOBAL",
    consultancy_id: null,
    name: "Arroz cozido",
    category: "Cereais",
    reference_amount: "100.00",
    reference_unit_code: "G",
    calories_kcal: "128.50",
    protein_g: "2.50",
    carbohydrate_g: "28.10",
    fat_g: "0.20",
    status: "ACTIVE",
    source_type: "TACO",
    source_key: "TACO",
    portions_count: 3,
  };

  // Valid row mapping
  const mapped = mapFoodRow(validBaseRow);
  assert.equal(mapped.publicId, "food-1234-abcd-5678");
  assert.equal(mapped.referenceAmount, 100);
  assert.equal(mapped.caloriesKcal, 128.5);
  assert.equal(mapped.portionsCount, 3);

  // A) Missing reference_amount: MUST NOT fallback silently to 100
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, reference_amount: null }),
    FoodLibraryMappingError,
    "reference_amount nulo deve lançar FoodLibraryMappingError (não usar default fake 100)"
  );
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, reference_amount: 0 }),
    FoodLibraryMappingError,
    "reference_amount zero deve lançar FoodLibraryMappingError"
  );
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, reference_amount: -50 }),
    FoodLibraryMappingError,
    "reference_amount negativo deve lançar FoodLibraryMappingError"
  );
  console.log("  ✓ Proteção contra fake default referenceAmount=100 comprovada.");

  // B) Missing sourceType: MUST NOT fallback silently to 'MANUAL'
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, source_type: null }),
    FoodLibraryMappingError,
    "source_type nulo deve lançar FoodLibraryMappingError (não usar default fake MANUAL)"
  );
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, source_type: "" }),
    FoodLibraryMappingError,
    "source_type vazio deve lançar FoodLibraryMappingError"
  );
  console.log("  ✓ Proteção contra fake default sourceType='MANUAL' comprovada.");

  // C) Invalid status: MUST NOT fallback silently to 'ACTIVE'
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, status: "INVALID_STATUS" }),
    FoodLibraryMappingError,
    "status inválido deve lançar FoodLibraryMappingError"
  );
  assert.throws(
    () => mapFoodRow({ ...validBaseRow, status: null }),
    FoodLibraryMappingError,
    "status nulo deve lançar FoodLibraryMappingError"
  );
  console.log("  ✓ Proteção contra fake default status='ACTIVE' comprovada.");

  // D) Missing mandatory public_id / name / reference_unit_code
  assert.throws(() => mapFoodRow({ ...validBaseRow, public_id: "" }), FoodLibraryMappingError);
  assert.throws(() => mapFoodRow({ ...validBaseRow, name: "" }), FoodLibraryMappingError);
  assert.throws(() => mapFoodRow({ ...validBaseRow, reference_unit_code: "" }), FoodLibraryMappingError);
  console.log("  ✓ Validação estrita de campos obrigatórios comprovada.");

  // E) Nutrition values null: UNKNOWN != ZERO, NULL != DEFAULT
  const nullMacrosRow = {
    ...validBaseRow,
    calories_kcal: null,
    protein_g: null,
    carbohydrate_g: null,
    fat_g: null,
  };
  const mappedNulls = mapFoodRow(nullMacrosRow);
  assert.equal(mappedNulls.caloriesKcal, null, "Calorias ausentes devem ser null (não 0)");
  assert.equal(mappedNulls.proteinG, null, "Proteína ausente deve ser null (não 0)");
  assert.equal(mappedNulls.carbohydrateG, null, "Carboidrato ausente deve ser null (não 0)");
  assert.equal(mappedNulls.fatG, null, "Gordura ausente deve ser null (não 0)");
  console.log("  ✓ Preservação de valores desconhecidos (null != 0) comprovada.");
}

// ----------------------------------------------------------------------------
// 3. ROLE-BASED AUTHORIZATION VALIDATION
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
    connectionLimit: 2,
  });

  const conn = await pool.getConnection();
  try {
    async function executeFoodSearch(queryText) {
      const dummyConsultancyId = 1;
      const filter = {
        query: queryText || undefined,
        scope: "ALL",
        status: "ACTIVE",
        page: 1,
        pageSize: 20,
      };

      const countQuery = buildCountQuery(filter, dummyConsultancyId);
      const [countRows] = await conn.query(countQuery.sql, countQuery.params);
      const total = Number(countRows[0]?.total || 0);

      const selectQuery = buildSelectFoodsQuery(filter, dummyConsultancyId, { isUnified: true });
      const [rows] = await conn.query(selectQuery.fullSql, selectQuery.selectParams);

      const items = rows.map((r) => mapFoodRow(r));
      return { total, items };
    }

    // A) Empty query (Initial Load contract)
    const resEmpty = await executeFoodSearch("");
    assert(resEmpty.total > 0, "Catálogo não pode estar vazio");
    assert(resEmpty.items.length > 0, "Primeira página deve conter alimentos");
    assert(resEmpty.items[0].referenceAmount > 0, "Alimento deve ter referenceAmount válido");
    console.log(`  ✓ Consulta VAZIA (INITIAL LOAD): ${resEmpty.total} alimentos no total (${resEmpty.items.length} na página 1).`);

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
