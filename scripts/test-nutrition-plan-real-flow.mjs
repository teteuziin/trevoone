/**
 * TREVO ONE — PHASE 4 & 19 AUTOMATED PLAN FLOW & FOOD SEARCH VALIDATION
 * Validates search for staple foods and regional aliases, display names without commas/alias lists,
 * and meal item creation with immutable macro snapshots and graceful micronutrients handling.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

const env = {};
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const parts = l.trim().split("=");
    const k = parts[0];
    const v = parts.slice(1).join("=");
    if (k && v) env[k.trim()] = v.trim();
  });
}

process.env.DB_HOST = env.DB_HOST;
process.env.DB_USER = env.DB_USER;
process.env.DB_PASSWORD = env.DB_PASSWORD;
process.env.DB_NAME = env.DB_NAME;
process.env.DB_PORT = env.DB_PORT || "3306";

const { listUnifiedFoodsForNutritionist, getFoodWithPortions } = await import("../lib/nutrition-v2/food-repository.ts");
const {
  createPlanWithDraftVersion,
  addMeal,
  addMealItem,
  getPlanVersionTreeByPlanPublicId,
  captureMicronutrientsSnapshotForFood,
} = await import("../lib/nutrition-v2/plan-repository.ts");
const { calculateMealTotals } = await import("../lib/nutrition-v2/nutrient-calculator.ts");

console.log("=== PHASES 4 & 19: REAL PLAN FLOW & SEARCH VALIDATION ===");

function makeContext({
  userId = 3,
  consultancyId = 1,
  consultancyPublicId = "edccc5a2-748c-49da-91b0-81c5140049c6",
  roles = ["NUTRITIONIST"],
  isPlatformAdmin = false,
} = {}) {
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
    membershipId: 1,
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

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 1,
});

async function main() {
  const conn = await pool.getConnection();
  try {
    const [dbRows] = await conn.query("SELECT DATABASE() as db");
    const activeDb = dbRows[0].db;
    console.log(`Database connected: ${activeDb}`);

    const ctx = makeContext();

    // =========================================================================
    // PART 1: SEARCH QUERIES & CLEAN DISPLAY NAMES (PHASES 11, 13, 19)
    // =========================================================================
    console.log("\n--- PART 1: FOOD SEARCH & ALIAS VALIDATION ---");

    const searchQueries = [
      "arroz",
      "feijão",
      "frango",
      "mandioca",
      "aipim",
      "pão francês",
      "cacetinho",
      "ovo",
      "batata doce",
      "tilápia",
      "carne de sol",
      "cuscuz",
    ];

    let namesWithComma = 0;
    let namesWithAliasList = 0;
    const searchResultsSummary = {};

    for (const q of searchQueries) {
      const res = await listUnifiedFoodsForNutritionist(ctx, { query: q, pageSize: 10 });
      const foundCount = res.total;
      searchResultsSummary[q] = foundCount;

      console.log(`  Search '${q}': found ${foundCount} items`);

      for (const f of res.items) {
        if (f.displayNamePtBr.includes(",")) {
          namesWithComma++;
          console.error(`    VIOLATION (comma in display name): '${f.displayNamePtBr}'`);
        }
        if (f.displayNamePtBr.toLowerCase().includes("cacetinho") && f.displayNamePtBr.toLowerCase().includes("pão francês")) {
          namesWithAliasList++;
          console.error(`    VIOLATION (alias list in display name): '${f.displayNamePtBr}'`);
        }
        if (f.displayNamePtBr.toLowerCase().includes("aipim") && f.displayNamePtBr.toLowerCase().includes("mandioca")) {
          namesWithAliasList++;
          console.error(`    VIOLATION (alias list in display name): '${f.displayNamePtBr}'`);
        }
      }
    }

    assert.equal(namesWithComma, 0, `DISPLAY_NAMES_WITH_COMMA must be 0, found ${namesWithComma}`);
    assert.equal(namesWithAliasList, 0, `DISPLAY_NAMES_WITH_ALIAS_LIST must be 0, found ${namesWithAliasList}`);
    console.log("  ✓ DISPLAY_NAMES_WITH_COMMA = 0");
    console.log("  ✓ DISPLAY_NAMES_WITH_ALIAS_LIST = 0");

    // Check alias mapping: cacetinho -> Pão francês
    const cacetinhoRes = await listUnifiedFoodsForNutritionist(ctx, { query: "cacetinho", pageSize: 5 });
    assert.ok(cacetinhoRes.items.length > 0, "Busca por 'cacetinho' deve retornar resultados");
    const hasPaoFrances = cacetinhoRes.items.some((f) => f.displayNamePtBr.toLowerCase().includes("pão francês"));
    assert.ok(hasPaoFrances, "'cacetinho' deve retornar 'Pão francês' como alimento canônico");
    console.log("  ✓ Alias 'cacetinho' correctly resolves to 'Pão francês'");

    // Check alias mapping: aipim -> Mandioca
    const aipimRes = await listUnifiedFoodsForNutritionist(ctx, { query: "aipim", pageSize: 5 });
    assert.ok(aipimRes.items.length > 0, "Busca por 'aipim' deve retornar resultados");
    const hasMandioca = aipimRes.items.some((f) => f.displayNamePtBr.toLowerCase().includes("mandioca"));
    assert.ok(hasMandioca, "'aipim' deve retornar 'Mandioca' como alimento canônico");
    console.log("  ✓ Alias 'aipim' correctly resolves to 'Mandioca'");

    // =========================================================================
    // PART 2: REAL PLAN FLOW TEST (PHASE 4 & 19)
    // =========================================================================
    console.log("\n--- PART 2: REAL PLAN FLOW EXECUTION ---");

    // 1. Pick a representative TACO food
    const arrozRes = await listUnifiedFoodsForNutritionist(ctx, { query: "arroz", pageSize: 5 });
    assert.ok(arrozRes.items.length > 0, "Deve encontrar arroz na base de alimentos");
    const targetFood = arrozRes.items[0];
    console.log(`  Selected food: '${targetFood.displayNamePtBr}' (publicId=${targetFood.publicId}, scope=${targetFood.scope})`);

    // 2. Load food with portions
    const foodWithPortions = await getFoodWithPortions(targetFood.publicId, ctx);
    assert.ok(foodWithPortions, "Deve carregar alimento com porções");
    assert.ok(foodWithPortions.referenceAmount > 0, "referenceAmount deve ser positivo");
    assert.ok(foodWithPortions.caloriesKcal != null, "caloriesKcal deve estar definido");
    console.log(`  Food reference: ${foodWithPortions.referenceAmount}${foodWithPortions.referenceUnitCode} | ${foodWithPortions.caloriesKcal} kcal | ${foodWithPortions.proteinG}g P | ${foodWithPortions.carbohydrateG}g C | ${foodWithPortions.fatG}g G`);

    // 3. Create test plan with draft version
    console.log("  Creating temporary test plan with draft version...");
    const planRes = await createPlanWithDraftVersion(ctx, {
      title: "Plano Teste P0 - Fluxo Automatizado",
    });
    const { planPublicId, versionPublicId } = planRes;
    console.log(`  ✓ Plan created: ${planPublicId} | Draft version: ${versionPublicId}`);

    try {
      // 4. Add a meal
      const mealRes = await addMeal(ctx, versionPublicId, {
        title: "Almoço Teste",
        scheduledTime: "12:30",
      });
      const { mealPublicId } = mealRes;
      console.log(`  ✓ Meal added: ${mealPublicId}`);

      // 5. Add food item to meal using authoritative repository function
      console.log("  Adding food item to meal via addMealItem()...");
      const itemRes = await addMealItem(ctx, mealPublicId, {
        foodPublicId: targetFood.publicId,
        prescribedQuantity: 150,
        prescribedUnitCode: "g",
        prescribedUnitLabel: "g",
      });
      assert.ok(itemRes.itemPublicId, "Item deve ser adicionado com itemPublicId");
      console.log(`  ✓ Meal item added successfully: ${itemRes.itemPublicId}`);

      // 6. Verify immutable macro snapshot created in database
      const [itemRows] = await conn.query(
        `SELECT * FROM nutrition_v2_meal_items WHERE public_id = ?`,
        [itemRes.itemPublicId]
      );
      assert.equal(itemRows.length, 1);
      const itemRow = itemRows[0];
      assert.ok(itemRow.calories_kcal_snapshot > 0, "calories_kcal_snapshot deve ser > 0");
      assert.ok(itemRow.carbohydrate_g_snapshot >= 0, "carbohydrate_g_snapshot deve ser >= 0");
      assert.equal(Number(itemRow.prescribed_quantity), 150);
      assert.equal(itemRow.prescribed_unit_code.toUpperCase(), "G");
      console.log(`  ✓ Snapshot verified: ${itemRow.calories_kcal_snapshot} kcal, ${itemRow.protein_g_snapshot}g P, ${itemRow.carbohydrate_g_snapshot}g C, ${itemRow.fat_g_snapshot}g G`);

      // 7. Calculate meal totals
      const mealTotals = calculateMealTotals([
        {
          caloriesKcalSnapshot: itemRow.calories_kcal_snapshot,
          proteinGSnapshot: itemRow.protein_g_snapshot,
          carbohydrateGSnapshot: itemRow.carbohydrate_g_snapshot,
          fatGSnapshot: itemRow.fat_g_snapshot,
        },
      ]);
      assert.ok(mealTotals.caloriesKcal > 0, "Meal totals calories must be > 0");
      console.log(`  ✓ Meal totals calculated: ${mealTotals.caloriesKcal} kcal | P: ${mealTotals.proteinG}g | C: ${mealTotals.carbohydrateG}g | F: ${mealTotals.fatG}g`);

      // 8. Test load nutrition analysis / version tree
      const planTree = await getPlanVersionTreeByPlanPublicId(ctx, planPublicId, versionPublicId);
      assert.ok(planTree, "Deve carregar árvore da versão do plano");
      assert.equal(planTree.meals.length, 1, "Deve conter 1 refeição");
      assert.equal(planTree.meals[0].items.length, 1, "Deve conter 1 item");
      console.log(`  ✓ Plan version tree reloaded without SQL error`);

    } finally {
      // 9. Clean up all test fixtures in DB
      console.log("  Cleaning up test plan fixtures...");
      const [pRows] = await conn.query("SELECT id FROM nutrition_v2_plans WHERE public_id = ?", [planPublicId]);
      if (pRows.length > 0) {
        const pId = pRows[0].id;
        const [vRows] = await conn.query("SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id = ?", [pId]);
        for (const v of vRows) {
          const [mRows] = await conn.query("SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id = ?", [v.id]);
          for (const m of mRows) {
            await conn.query("DELETE FROM nutrition_v2_meal_items WHERE meal_id = ?", [m.id]);
          }
          await conn.query("DELETE FROM nutrition_v2_meals WHERE nutrition_plan_version_id = ?", [v.id]);
        }
        await conn.query("DELETE FROM nutrition_v2_plan_versions WHERE nutrition_plan_id = ?", [pId]);
        await conn.query("DELETE FROM nutrition_v2_plans WHERE id = ?", [pId]);
      }
      console.log("  ✓ Test fixtures cleaned up completely.");
    }

    // 10. Test graceful degradation during food addition with missing table
    console.log("\n  Simulating missing nutrition_v2_food_nutrients table during item capture...");
    const mockConnMissingTable = {
      async query(sql, params) {
        if (typeof sql === "string" && sql.includes("nutrition_v2_food_nutrients")) {
          const err = new Error("Table 'u406031981_trevoone.nutrition_v2_food_nutrients' doesn't exist");
          err.code = "ER_NO_SUCH_TABLE";
          err.errno = 1146;
          throw err;
        }
        return conn.query(sql, params);
      },
    };

    const [foodRaw] = await conn.query("SELECT * FROM nutrition_v2_foods WHERE public_id = ?", [targetFood.publicId]);
    const degradedEnvelope = await captureMicronutrientsSnapshotForFood(
      mockConnMissingTable,
      foodRaw[0].id,
      foodRaw[0],
      1.5
    );
    assert.ok(degradedEnvelope, "Degraded snapshot must be generated");
    assert.equal(degradedEnvelope.nutrients.length, 23);
    assert.equal(degradedEnvelope.nutrients[0].status, "UNKNOWN");
    assert.equal(degradedEnvelope.nutrients[0].value, null);
    console.log("  ✓ Food addition degrades gracefully to 23 UNKNOWN nutrients when table is absent");

    console.log("\n=== PHASES 4 & 19 VALIDATION COMPLETED WITH 100% SUCCESS ===");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN PLAN FLOW TEST:", err);
  process.exit(1);
});