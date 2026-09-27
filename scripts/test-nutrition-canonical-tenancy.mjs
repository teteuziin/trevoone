/**
 * Test: Nutrition V2 Canonical Food Tenancy Security Gate (Phase B2A.4)
 *
 * Rules Tested:
 * 1. CONSULTANCY_A_CANNOT_READ_B:
 *    - Nutritionist A cannot access Consultancy B food via public_id (403 FORBIDDEN_TENANT_FOOD).
 *    - Nutritionist A cannot find Consultancy B food in listing.
 * 2. CONSULTANCY_B_CANNOT_READ_A:
 *    - Nutritionist B cannot access Consultancy A food via public_id (403 FORBIDDEN_TENANT_FOOD).
 *    - Nutritionist B cannot find Consultancy A food in listing.
 * 3. NO_CROSS_TENANT_ALTERNATIVES:
 *    - Sibling/alternative source lookup excludes other tenant custom foods.
 *    - Equivalent foods from different consultancies never join the same canonical group.
 * 4. GLOBAL_VISIBLE:
 *    - Global foods (TACO, IBGE) are visible to both consultancies.
 * 5. CONSULTANCY_ADMIN_READ_ONLY:
 *    - Consultancy Admin can read own consultancy foods but cannot access other tenant foods or author foods.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const {
  getFoodSourceAlternatives,
  getFoodWithPortions,
  listUnifiedFoodsForNutritionist,
} = await import("../lib/nutrition-v2/food-repository.ts");

const {
  assertCanAuthorNutrition,
} = await import("../lib/nutrition-v2/access.ts");

const {
  groupCanonicalFoods,
  mapFoodRow,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  const parts = l.trim().split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && v) env[k.trim()] = v.trim();
});

const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}

process.env.DB_HOST = env.DB_HOST;
process.env.DB_USER = env.DB_USER;
process.env.DB_PASSWORD = env.DB_PASSWORD;
process.env.DB_NAME = env.DB_NAME;
process.env.DB_PORT = env.DB_PORT || "3306";

function makeContext({
  userId,
  consultancyId,
  consultancyPublicId,
  roles,
  isPlatformAdmin = false,
}) {
  const hasRole = (r) => roles.includes(r);
  const canAuthorNutrition = hasRole("NUTRITIONIST");
  const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
  const canViewNutrition = canAuthorNutrition || canManageConsultancy || isPlatformAdmin;
  const isStudent = hasRole("STUDENT");

  return {
    userId,
    userPublicId: `usr-${userId}`,
    isPlatformAdmin,
    consultancyId,
    consultancyPublicId,
    consultancySlug: `consultancy-${consultancyId}`,
    membershipId: userId * 10,
    membershipPublicId: `mem-${userId}`,
    roles,
    hasRole,
    canAuthorNutrition,
    canViewNutrition,
    canManageConsultancy,
    canManageGlobal: isPlatformAdmin,
    isStudent,
  };
}

async function run() {
  console.log("=== TESTE: CANONICAL FOOD TENANCY & ISOLATION (B2A.4) ===\n");

  const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: Number(env.DB_PORT || 3306),
  });

  const createdFoodIds = [];

  try {
    // 0. Safety DB Check
    const [dbCheck] = await pool.query("SELECT DATABASE() as db");
    assert.equal(dbCheck[0].db, DEV_DB_NAME, "Target DB must be DEV");
    console.log(`Database verified: ${dbCheck[0].db}`);

    // Contexts:
    // Consultancy A: id 1
    // Consultancy B: id 2
    const ctxNutritionistA = makeContext({
      userId: 101,
      consultancyId: 1,
      consultancyPublicId: "edccc5a2-748c-49da-91b0-81c5140049c6",
      roles: ["NUTRITIONIST"],
    });

    const ctxNutritionistB = makeContext({
      userId: 202,
      consultancyId: 2,
      consultancyPublicId: "136d270b-2e0c-46d8-86d0-776b339dc815",
      roles: ["NUTRITIONIST"],
    });

    const ctxAdminA = makeContext({
      userId: 102,
      consultancyId: 1,
      consultancyPublicId: "edccc5a2-748c-49da-91b0-81c5140049c6",
      roles: ["CONSULTANCY_ADMIN"],
    });

    // 1. Create Transactional Test Fixtures in DEV
    const foodAPublicId = crypto.randomUUID();
    const foodBPublicId = crypto.randomUUID();

    console.log("Criando fixtures isoladas de consultoria com identidades canônicas equivalentes...");
    const [resA] = await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_display_name_pt_br,
        normalized_name, reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g,
        fat_g, fiber_g, status, source_type, data_quality, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', 1, 'Mandioca Frita Especial da Casa A', 'Mandioca frita', 'mandioca frita',
        'mandioca frita especial da casa a', 100, 'G', 210, 1.8, 35, 6.5, 2, 'ACTIVE', 'CUSTOM', 'USER_REPORTED', NOW(3), NOW(3))`,
      [foodAPublicId]
    );
    createdFoodIds.push(resA.insertId);

    const [resB] = await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_display_name_pt_br,
        normalized_name, reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g,
        fat_g, fiber_g, status, source_type, data_quality, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', 2, 'Mandioca Frita Gourmet da Casa B', 'Mandioca frita', 'mandioca frita',
        'mandioca frita gourmet da casa b', 100, 'G', 225, 2.0, 38, 7.0, 2, 'ACTIVE', 'CUSTOM', 'USER_REPORTED', NOW(3), NOW(3))`,
      [foodBPublicId]
    );
    createdFoodIds.push(resB.insertId);

    console.log(`  Food A (Consultancy 1): ${foodAPublicId} (id=${resA.insertId})`);
    console.log(`  Food B (Consultancy 2): ${foodBPublicId} (id=${resB.insertId})`);

    // =========================================================================
    // TEST 1: CONSULTANCY_A_CANNOT_READ_B
    // =========================================================================
    console.log("\nTest 1: Validando que Nutricionista A NÃO pode acessar Alimento B da Consultoria B...");

    // 1a. getFoodSourceAlternatives for cross-tenant food
    let blockedTargetA = false;
    try {
      await getFoodSourceAlternatives(ctxNutritionistA, foodBPublicId);
    } catch (err) {
      if (err.statusCode === 403 && err.code === "FORBIDDEN_TENANT_FOOD") {
        blockedTargetA = true;
      } else {
        throw err;
      }
    }
    assert(blockedTargetA, "Nutricionista A deve receber 403 FORBIDDEN_TENANT_FOOD ao acessar alternativas de alimento B");
    console.log("  ✓ getFoodSourceAlternatives(ctxA, foodB) -> 403 FORBIDDEN_TENANT_FOOD");

    // 1b. getFoodWithPortions for cross-tenant food
    let blockedDirectA = false;
    try {
      await getFoodWithPortions(foodBPublicId, ctxNutritionistA);
    } catch (err) {
      if (err.statusCode === 403 && err.code === "FORBIDDEN_TENANT_FOOD") {
        blockedDirectA = true;
      } else {
        throw err;
      }
    }
    assert(blockedDirectA, "getFoodWithPortions deve bloquear alimento de outra consultoria com 403");
    console.log("  ✓ getFoodWithPortions(foodB, ctxA) -> 403 FORBIDDEN_TENANT_FOOD");

    // 1c. listUnifiedFoodsForNutritionist does not leak Food B to A
    const listA = await listUnifiedFoodsForNutritionist(ctxNutritionistA, { query: "mandioca frita" });
    const leakedBInA = listA.items.some((it) => it.publicId === foodBPublicId || (it.alternativeSources && it.alternativeSources.some((alt) => alt.publicId === foodBPublicId)));
    assert(!leakedBInA, "Alimento de Consultoria B NUNCA deve vazar na listagem de A");
    console.log("  ✓ listUnifiedFoodsForNutritionist(ctxA) -> Alimento B ausente");
    console.log("  CONSULTANCY_A_CANNOT_READ_B = PASS");

    // =========================================================================
    // TEST 2: CONSULTANCY_B_CANNOT_READ_A
    // =========================================================================
    console.log("\nTest 2: Validando que Nutricionista B NÃO pode acessar Alimento A da Consultoria A...");

    // 2a. getFoodSourceAlternatives for cross-tenant food
    let blockedTargetB = false;
    try {
      await getFoodSourceAlternatives(ctxNutritionistB, foodAPublicId);
    } catch (err) {
      if (err.statusCode === 403 && err.code === "FORBIDDEN_TENANT_FOOD") {
        blockedTargetB = true;
      } else {
        throw err;
      }
    }
    assert(blockedTargetB, "Nutricionista B deve receber 403 FORBIDDEN_TENANT_FOOD ao acessar alternativas de alimento A");
    console.log("  ✓ getFoodSourceAlternatives(ctxB, foodA) -> 403 FORBIDDEN_TENANT_FOOD");

    // 2b. getFoodWithPortions for cross-tenant food
    let blockedDirectB = false;
    try {
      await getFoodWithPortions(foodAPublicId, ctxNutritionistB);
    } catch (err) {
      if (err.statusCode === 403 && err.code === "FORBIDDEN_TENANT_FOOD") {
        blockedDirectB = true;
      } else {
        throw err;
      }
    }
    assert(blockedDirectB, "getFoodWithPortions deve bloquear alimento de A com 403 para B");
    console.log("  ✓ getFoodWithPortions(foodA, ctxB) -> 403 FORBIDDEN_TENANT_FOOD");

    // 2c. listUnifiedFoodsForNutritionist does not leak Food A to B
    const listB = await listUnifiedFoodsForNutritionist(ctxNutritionistB, { query: "mandioca frita" });
    const leakedAInB = listB.items.some((it) => it.publicId === foodAPublicId || (it.alternativeSources && it.alternativeSources.some((alt) => alt.publicId === foodAPublicId)));
    assert(!leakedAInB, "Alimento de Consultoria A NUNCA deve vazar na listagem de B");
    console.log("  ✓ listUnifiedFoodsForNutritionist(ctxB) -> Alimento A ausente");
    console.log("  CONSULTANCY_B_CANNOT_READ_A = PASS");

    // =========================================================================
    // TEST 3: NO_CROSS_TENANT_ALTERNATIVES & COMPLETE SIBLINGS
    // =========================================================================
    console.log("\nTest 3: Validando isolamento multi-tenant de fontes alternativas...");

    // 3a. Alternatives for Food A within Consultancy A
    const altsForA = await getFoodSourceAlternatives(ctxNutritionistA, foodAPublicId);
    assert(altsForA, "Alternatives para Food A devem existir");
    assert.equal(altsForA.primary.publicId, foodAPublicId, "Food A da consultoria tem prioridade 1 (primary)");
    assert(altsForA.alternatives.length >= 4, `Deve conter TACO + 3 IBGE como alternativas (got ${altsForA.alternatives.length})`);
    const hasBInAltsA = altsForA.alternatives.some((alt) => alt.publicId === foodBPublicId);
    assert(!hasBInAltsA, "Alimento B NUNCA deve aparecer como alternativa do Alimento A");
    console.log(`  ✓ Alimento A possui ${altsForA.alternatives.length} fontes alternativas (TACO + IBGE), sem alimento de B`);

    // 3b. Alternatives for Global Food within Consultancy A
    const [tacoRows] = await pool.query(
      "SELECT public_id FROM nutrition_v2_foods WHERE name = 'Mandioca, frita' AND source_key = 'TACO' LIMIT 1"
    );
    assert(tacoRows.length > 0, "TACO Mandioca frita deve existir");
    const tacoPublicId = tacoRows[0].public_id;

    const altsForTacoInA = await getFoodSourceAlternatives(ctxNutritionistA, tacoPublicId);
    assert(altsForTacoInA, "Alternatives para TACO devem existir");
    const hasBInTacoAlts = altsForTacoInA.alternatives.some((alt) => alt.publicId === foodBPublicId);
    assert(!hasBInTacoAlts, "Consulta de alternativas globais por A NUNCA deve expor alimento da consultoria B");
    console.log("  ✓ Alternativas de alimento global em contexto A não contêm alimento de B");

    // 3c. In-memory multi-tenant grouping isolation
    const [rowsA] = await pool.query("SELECT * FROM nutrition_v2_foods WHERE id = ?", [resA.insertId]);
    const [rowsB] = await pool.query("SELECT * FROM nutrition_v2_foods WHERE id = ?", [resB.insertId]);
    const mappedA = mapFoodRow(rowsA[0]);
    const mappedB = mapFoodRow(rowsB[0]);

    const groupedMemory = groupCanonicalFoods([mappedA, mappedB]);
    assert.equal(groupedMemory.length, 2, "Alimentos de consultorias distintas NUNCA devem agrupar no mesmo card canônico");
    assert.notEqual(groupedMemory[0].canonicalId, groupedMemory[1].canonicalId, "Canonical IDs de consultorias distintas devem ser diferentes");
    console.log(`  ✓ groupCanonicalFoods: Card 1 [${groupedMemory[0].canonicalId}] !== Card 2 [${groupedMemory[1].canonicalId}]`);
    console.log("  NO_CROSS_TENANT_ALTERNATIVES = PASS");

    // =========================================================================
    // TEST 4: GLOBAL_VISIBLE
    // =========================================================================
    console.log("\nTest 4: Validando visibilidade de alimentos globais...");
    const globalForA = await getFoodWithPortions(tacoPublicId, ctxNutritionistA);
    const globalForB = await getFoodWithPortions(tacoPublicId, ctxNutritionistB);
    assert(globalForA && globalForA.scope === "GLOBAL", "Global visível para A");
    assert(globalForB && globalForB.scope === "GLOBAL", "Global visível para B");
    console.log("  ✓ Alimento GLOBAL (TACO) acessível tanto por Nutricionista A quanto por Nutricionista B");
    console.log("  GLOBAL_VISIBLE = PASS");

    // =========================================================================
    // TEST 5: CONSULTANCY_ADMIN READ-ONLY BEHAVIOR
    // =========================================================================
    console.log("\nTest 5: Validando permissões de CONSULTANCY_ADMIN (leitura autorizada na própria consultoria, sem autoria)...");
    const adminReadA = await getFoodWithPortions(foodAPublicId, ctxAdminA);
    assert(adminReadA, "Admin A pode ler alimentos da sua própria consultoria");
    console.log("  ✓ Consultancy Admin A pode visualizar Alimento A da sua própria consultoria");

    let adminBlockedOnB = false;
    try {
      await getFoodWithPortions(foodBPublicId, ctxAdminA);
    } catch (err) {
      if (err.statusCode === 403) adminBlockedOnB = true;
    }
    assert(adminBlockedOnB, "Admin A NÃO pode acessar alimentos da consultoria B");
    console.log("  ✓ Consultancy Admin A bloqueado de ler Alimento B da consultoria B (403)");

    let authorBlocked = false;
    try {
      assertCanAuthorNutrition(ctxAdminA);
    } catch (err) {
      if (err.statusCode === 403 && err.code === "UNAUTHORIZED_NUTRITION_AUTHOR") {
        authorBlocked = true;
      }
    }
    assert(authorBlocked, "Consultancy Admin preview é estritamente read-only");
    console.log("  ✓ assertCanAuthorNutrition bloqueia Consultancy Admin de criar/alterar alimentos (read-only)");

    console.log("\n=== TESTE DE TENANCY E ISOLAMENTO CANÔNICO CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    if (createdFoodIds.length > 0) {
      console.log(`\nLimpando ${createdFoodIds.length} fixtures de teste DEV...`);
      await pool.query(
        `DELETE FROM nutrition_v2_foods WHERE id IN (${createdFoodIds.map(() => "?").join(",")})`,
        createdFoodIds
      );
      console.log("Limpeza concluída com sucesso.");
    }
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
