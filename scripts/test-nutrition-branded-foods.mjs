/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * BRANDED FOOD PRODUCTS & SUPPLEMENTS AUDIT SUITE
 *
 * Validates brand identity, variant separation, exact manufacturer macros,
 * household portions, creatine explicit zero rules, and duplicate prevention.
 */

import mysql from "mysql2/promise";
import { runBaseBrasilSeed } from "./seed-nutrition-base-brasil-v1.mjs";

async function run() {
  console.log("=== INICIANDO SUÍTE DE TESTES: BRANDED FOOD PRODUCTS & SUPPLEMENTS ===");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const connection = await pool.getConnection();

  try {
    const [dbRows] = await connection.query("SELECT DATABASE() AS db_name");
    console.log(`✓ Conectado ao banco: ${dbRows[0].db_name}`);

    // Test 1: Branded Columns & Data Model
    console.log("\nTest 1: Validando integridade das colunas dedicadas de marca e variante...");
    const [foods] = await connection.query(`
      SELECT id, public_id, name, display_name_pt_br, brand, product_line,
             flavor_or_variant, manufacturer, reference_amount, calories_kcal,
             protein_g, carbohydrate_g, fat_g, fiber_g, source_type, source_key,
             source_external_code, source_reference, last_verified_at, data_quality
      FROM nutrition_v2_foods
      WHERE source_type = 'BRANDED' AND deleted_at IS NULL
      ORDER BY brand ASC, product_line ASC, flavor_or_variant ASC
    `);

    if (foods.length < 8) {
      throw new Error(`Esperado pelo menos 8 alimentos branded no catálogo, encontrado: ${foods.length}`);
    }

    for (const f of foods) {
      if (!f.brand) throw new Error(`Alimento ID ${f.id} sem campo 'brand'.`);
      if (!f.product_line) throw new Error(`Alimento ID ${f.id} sem campo 'product_line'.`);
      if (!f.flavor_or_variant) throw new Error(`Alimento ID ${f.id} sem campo 'flavor_or_variant'.`);
      if (!f.source_reference) throw new Error(`Alimento ID ${f.id} sem URL oficial 'source_reference'.`);
      if (!f.last_verified_at) throw new Error(`Alimento ID ${f.id} sem 'last_verified_at'.`);
      if (f.brand === "Growth Supplements" && f.data_quality !== "MANUFACTURER_VERIFIED") {
        throw new Error(`Alimento Growth ID ${f.id} com data_quality incorreto: ${f.data_quality}`);
      }
      if (f.brand === "Amafil" && f.data_quality !== "UNCLASSIFIED") {
        throw new Error(`Alimento Amafil ID ${f.id} deveria estar UNCLASSIFIED (NOT_READY_FOR_PROD), encontrado: ${f.data_quality}`);
      }
    }
    console.log(`  ✓ Todos os ${foods.length} alimentos branded possuem metadados completos de fabricante e proveniência`);

    // Test 2: Separation of Variants (No generic merging)
    console.log("\nTest 2: Validando separação estrita de variantes e sabores...");
    const wpcNatural = foods.find((f) => f.product_line === "100% Whey Protein Concentrado" && f.flavor_or_variant === "Natural");
    const wpcChoc = foods.find((f) => f.product_line === "100% Whey Protein Concentrado" && f.flavor_or_variant === "Chocolate");
    const wpiNatural = foods.find((f) => f.product_line === "TOP Whey Protein Isolado" && f.flavor_or_variant === "Natural");
    const mediumNatural = foods.find((f) => f.product_line === "Medium Whey Protein" && f.flavor_or_variant === "Natural");

    if (!wpcNatural || !wpcChoc || !wpiNatural || !mediumNatural) {
      throw new Error("Produtos fundamentais da Growth ausentes no catálogo.");
    }

    // Concentrado Natural vs Chocolate
    if (Number(wpcNatural.protein_g) === Number(wpcChoc.protein_g)) {
      throw new Error("Erro de mesclagem: WPC Natural e Chocolate possuem teores de proteína idênticos!");
    }
    if (Number(wpcNatural.carbohydrate_g) === Number(wpcChoc.carbohydrate_g)) {
      throw new Error("Erro de mesclagem: WPC Natural e Chocolate possuem teores de carboidrato idênticos!");
    }
    console.log(`  ✓ WPC Natural (80% prot, ${wpcNatural.protein_g}g) e Chocolate (70% prot, ${wpcChoc.protein_g}g) mantêm macros distintos`);

    // Concentrado vs Isolado vs Medium
    if (Number(wpiNatural.protein_g) <= Number(wpcNatural.protein_g)) {
      throw new Error("Isolado deveria ter maior teor de proteína que o Concentrado.");
    }
    if (Number(mediumNatural.protein_g) >= Number(wpcNatural.protein_g)) {
      throw new Error("Medium Whey deveria ter menor teor de proteína que o Concentrado.");
    }
    console.log(`  ✓ Escalonamento de linhas comprovado: Isolado (${wpiNatural.protein_g}g) > Concentrado (${wpcNatural.protein_g}g) > Medium (${mediumNatural.protein_g}g)`);

    // Test 3: Creatine Explicit Zero Rule
    console.log("\nTest 3: Validando regra estrita de creatina (UNKNOWN != ZERO)...");
    const creatina = foods.find((f) => f.product_line.includes("Creatina"));
    if (!creatina) throw new Error("Creatina da Growth ausente no catálogo.");

    if (Number(creatina.calories_kcal) !== 0 || Number(creatina.protein_g) !== 0) {
      throw new Error("Creatina com valores energéticos diferentes de zero.");
    }

    const [creatinaNutrients] = await connection.query(
      `SELECT nutrient_code, amount_per_reference, status
       FROM nutrition_v2_food_nutrients
       WHERE food_id = ?`,
      [creatina.id]
    );

    const sodiumNutrient = creatinaNutrients.find((n) => n.nutrient_code === "NA");
    if (!sodiumNutrient || sodiumNutrient.status !== "KNOWN_ZERO" || Number(sodiumNutrient.amount_per_reference) !== 0) {
      throw new Error("Constraint check falhou: Creatina deve ter status 'KNOWN_ZERO' explícito no rótulo!");
    }
    console.log("  ✓ Creatina validada com status 'KNOWN_ZERO' suportado por declaração explícita de rótulo ANVISA");

    // Test 4: Household Portions Exactitude
    console.log("\nTest 4: Validando porções caseiras específicas por produto...");
    for (const f of foods) {
      const [portions] = await connection.query(
        `SELECT label, equivalent_reference_amount
         FROM nutrition_v2_food_portions
         WHERE food_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
         ORDER BY sort_order ASC`,
        [f.id]
      );

      if (portions.length === 0) {
        throw new Error(`Alimento ID ${f.id} sem nenhuma porção caseira cadastrada.`);
      }

      if (f.product_line.includes("Isolado")) {
        const scoop = portions.find((p) => p.label === "1 dosador");
        if (!scoop || Number(scoop.equivalent_reference_amount) !== 12) {
          throw new Error(`Dosador do Isolado deveria ser 12g, encontrado: ${scoop?.equivalent_reference_amount}`);
        }
      } else if (f.product_line.includes("Concentrado") || f.product_line.includes("Medium")) {
        const scoop = portions.find((p) => p.label === "1 dosador");
        if (!scoop || Number(scoop.equivalent_reference_amount) !== 15) {
          throw new Error(`Dosador do Concentrado deveria ser 15g, encontrado: ${scoop?.equivalent_reference_amount}`);
        }
      } else if (f.product_line.includes("Creatina")) {
        const scoop = portions.find((p) => p.label === "1 dosador");
        if (!scoop || Number(scoop.equivalent_reference_amount) !== 1.25) {
          throw new Error(`Dosador da Creatina deveria ser 1.25g, encontrado: ${scoop?.equivalent_reference_amount}`);
        }
      } else if (f.brand === "Amafil") {
        const colher = portions.find((p) => p.label === "1 colher de sopa");
        if (!colher || Number(colher.equivalent_reference_amount) !== 20) {
          throw new Error(`Colher de sopa da Tapioca Amafil deveria ser 20g, encontrado: ${colher?.equivalent_reference_amount}`);
        }
      }
    }
    console.log("  ✓ Porções caseiras verificadas individualmente por densidade e rótulo do fabricante (sem chutes universais)");

    // Test 5: Idempotency & Duplicate Prevention
    console.log("\nTest 5: Validando idempotência do importador e prevenção de duplicatas...");
    const reseedResult = await runBaseBrasilSeed();
    if (reseedResult.insertedCount !== 0) {
      throw new Error(`Re-seed inseriu ${reseedResult.insertedCount} registros! Deveria ser 0.`);
    }
    if (reseedResult.duplicateCount !== 0) {
      throw new Error(`Re-seed gerou ${reseedResult.duplicateCount} duplicatas.`);
    }
    console.log(`  ✓ Idempotência comprovada: segunda execução inseriu 0 e pulou ${reseedResult.skippedCount} itens com 0 duplicatas`);

    console.log("\n=======================================================");
    console.log("BRANDED FOOD PRODUCTS & SUPPLEMENTS: TODOS OS TESTES PASSARAM!");
    console.log("=======================================================\n");
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
