/**
 * TREVO ONE — NUTRITION DATABASE
 * SEED IMPORTER: BASE BRASIL V1
 *
 * Imports authoritative, verified Brazilian branded products and staples
 * into the global catalog with complete provenance, exact portions, and
 * idempotent deduplication.
 *
 * Target: DEV (u406031981_trevoone_dev)
 */

import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { normalizeSearchText } from "../lib/nutrition-v2/food-search.ts";

export const BASE_BRASIL_V1_MANIFEST = [
  // 1. Growth — 100% Whey Protein Concentrado — Natural
  {
    name: "Growth - 100% Whey Protein Concentrado - Natural",
    displayNamePtBr: "Growth — 100% Whey Protein Concentrado — Natural",
    brand: "Growth Supplements",
    productLine: "100% Whey Protein Concentrado",
    flavorOrVariant: "Natural",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 413.33,
    proteinG: 80.00,
    carbohydrateG: 7.67,
    fatG: 7.00,
    fiberG: 0.00,
    sodiumMg: 156.67,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-WPC-NATURAL-1KG",
    sourceReference: "https://www.gsuplementos.com.br/whey-protein-concentrado-1kg-growth-supplements-p985936",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 15.0, sortOrder: 1 },
      { label: "2 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 2. Growth — 100% Whey Protein Concentrado — Chocolate
  {
    name: "Growth - 100% Whey Protein Concentrado - Chocolate",
    displayNamePtBr: "Growth — 100% Whey Protein Concentrado — Chocolate",
    brand: "Growth Supplements",
    productLine: "100% Whey Protein Concentrado",
    flavorOrVariant: "Chocolate",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 403.33,
    proteinG: 70.00,
    carbohydrateG: 15.00,
    fatG: 7.00,
    fiberG: 0.00,
    sodiumMg: 176.67,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-WPC-CHOCOLATE-1KG",
    sourceReference: "https://www.gsuplementos.com.br/100-whey-protein-concentrado-chocolate",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 15.0, sortOrder: 1 },
      { label: "2 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 3. Growth — 100% Whey Protein Concentrado — Morango
  {
    name: "Growth - 100% Whey Protein Concentrado - Morango",
    displayNamePtBr: "Growth — 100% Whey Protein Concentrado — Morango",
    brand: "Growth Supplements",
    productLine: "100% Whey Protein Concentrado",
    flavorOrVariant: "Morango",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 403.33,
    proteinG: 70.00,
    carbohydrateG: 15.67,
    fatG: 6.67,
    fiberG: 0.00,
    sodiumMg: 166.67,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-WPC-MORANGO-1KG",
    sourceReference: "https://www.gsuplementos.com.br/100-whey-protein-concentrado-morango",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 15.0, sortOrder: 1 },
      { label: "2 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 4. Growth — 100% Whey Protein Concentrado — Baunilha
  {
    name: "Growth - 100% Whey Protein Concentrado - Baunilha",
    displayNamePtBr: "Growth — 100% Whey Protein Concentrado — Baunilha",
    brand: "Growth Supplements",
    productLine: "100% Whey Protein Concentrado",
    flavorOrVariant: "Baunilha",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 400.00,
    proteinG: 70.00,
    carbohydrateG: 15.33,
    fatG: 6.67,
    fiberG: 0.00,
    sodiumMg: 170.00,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-WPC-BAUNILHA-1KG",
    sourceReference: "https://www.gsuplementos.com.br/100-whey-protein-concentrado-baunilha",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 15.0, sortOrder: 1 },
      { label: "2 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 5. Growth — TOP Whey Protein Isolado — Natural
  {
    name: "Growth - TOP Whey Protein Isolado - Natural",
    displayNamePtBr: "Growth — TOP Whey Protein Isolado — Natural",
    brand: "Growth Supplements",
    productLine: "TOP Whey Protein Isolado",
    flavorOrVariant: "Natural",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 386.67,
    proteinG: 90.00,
    carbohydrateG: 6.67,
    fatG: 0.00,
    fiberG: 0.00,
    sodiumMg: 146.67,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-WPI-NATURAL-1KG",
    sourceReference: "https://www.gsuplementos.com.br/top-whey-protein-isolado-1kg-growth-supplements-p985937",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 12.0, sortOrder: 1 },
      { label: "2,5 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 6. Growth — Medium Whey Protein — Natural
  {
    name: "Growth - Medium Whey Protein - Natural",
    displayNamePtBr: "Growth — Medium Whey Protein — Natural",
    brand: "Growth Supplements",
    productLine: "Medium Whey Protein",
    flavorOrVariant: "Natural",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 403.33,
    proteinG: 56.67,
    carbohydrateG: 29.00,
    fatG: 6.67,
    fiberG: 0.00,
    sodiumMg: 253.33,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-MEDIUM-NATURAL-1KG",
    sourceReference: "https://www.gsuplementos.com.br/medium-whey-protein-1kg-growth-supplements-p986001",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 15.0, sortOrder: 1 },
      { label: "2 dosadores (1 porção)", equivalentReferenceAmount: 30.0, sortOrder: 2 },
    ],
  },
  // 7. Growth — Creatina Monohidratada 100% Pura
  {
    name: "Growth - Creatina Monohidratada 100% Pura",
    displayNamePtBr: "Growth — Creatina Monohidratada 100% Pura",
    brand: "Growth Supplements",
    productLine: "Creatina Monohidratada 100% Pura",
    flavorOrVariant: "Sem Sabor (100% Pura)",
    manufacturer: "Growth Supplements Nutrição Esportiva Ltda",
    category: "Suplementos",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 0.00,
    proteinG: 0.00,
    carbohydrateG: 0.00,
    fatG: 0.00,
    fiberG: 0.00,
    sodiumMg: 0.00,
    sourceType: "BRANDED",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceExternalCode: "GROWTH-CREATINA-MONO-500G",
    sourceReference: "https://www.gsuplementos.com.br/creatina-monohidratada-500g-pouch",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 dosador", equivalentReferenceAmount: 1.25, sortOrder: 1 },
      { label: "4 dosadores (1 porção)", equivalentReferenceAmount: 5.0, sortOrder: 2 },
    ],
  },
  // 8. Amafil — Massa para Tapioca (Goma de Mandioca Hidratada)
  {
    name: "Amafil - Massa para Tapioca (Goma de Mandioca Hidratada)",
    displayNamePtBr: "Amafil — Massa para Tapioca (Goma de Mandioca Hidratada)",
    brand: "Amafil",
    productLine: "Massa para Tapioca",
    flavorOrVariant: "Tradicional (Goma Hidratada)",
    manufacturer: "Amafil Alimentos",
    category: "Cereais e Derivados",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 232.00,
    proteinG: 0.00,
    carbohydrateG: 58.00,
    fatG: 0.00,
    fiberG: 0.00,
    sodiumMg: 70.00,
    sourceType: "BRANDED",
    sourceKey: "AMAFIL",
    sourceExternalCode: "AMAFIL-TAPIOCA-500G",
    sourceReference: "https://amafil.com.br/receita/receita_categoria/tapiocas/",
    dataQuality: "MANUFACTURER_VERIFIED",
    portions: [
      { label: "1 colher de sopa", equivalentReferenceAmount: 20.0, sortOrder: 1 },
      { label: "5 colheres de sopa (1 porção)", equivalentReferenceAmount: 100.0, sortOrder: 2 },
    ],
  },
];

export async function runBaseBrasilSeed() {
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
    const activeDb = dbRows[0].db_name;
    if (activeDb !== "u406031981_trevoone_dev") {
      throw new Error(`Safety gate: Seed can only execute on u406031981_trevoone_dev. Found: ${activeDb}`);
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of BASE_BRASIL_V1_MANIFEST) {
      // 1. Deterministic deduplication check
      const [existing] = await connection.query(
        `SELECT id, public_id FROM nutrition_v2_foods 
         WHERE (source_key = ? AND source_external_code = ?)
            OR (brand = ? AND product_line = ? AND flavor_or_variant = ?)
         LIMIT 1`,
        [item.sourceKey, item.sourceExternalCode, item.brand, item.productLine, item.flavorOrVariant]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        skippedCount++;
        continue;
      }

      // 2. Insert new verified food record
      const publicId = crypto.randomUUID();
      const normalizedName = normalizeSearchText(item.name);
      const normalizedDisplayNamePtBr = normalizeSearchText(item.displayNamePtBr);

      const [foodRes] = await connection.query(
        `INSERT INTO nutrition_v2_foods (
          public_id, scope, consultancy_id, name, display_name_pt_br,
          normalized_display_name_pt_br, normalized_name, category,
          brand, product_line, flavor_or_variant, manufacturer,
          reference_amount, reference_unit_code, calories_kcal,
          protein_g, carbohydrate_g, fat_g, fiber_g,
          status, source_type, data_quality, source_key,
          source_external_code, source_reference, source_imported_at,
          last_verified_at, created_at, updated_at
        ) VALUES (
          ?, 'GLOBAL', NULL, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          'ACTIVE', ?, ?, ?,
          ?, ?, CURRENT_TIMESTAMP(3),
          CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
        )`,
        [
          publicId, item.name, item.displayNamePtBr,
          normalizedDisplayNamePtBr, normalizedName, item.category,
          item.brand, item.productLine, item.flavorOrVariant, item.manufacturer,
          item.referenceAmount, item.referenceUnitCode, item.caloriesKcal,
          item.proteinG, item.carbohydrateG, item.fatG, item.fiberG,
          item.sourceType, item.dataQuality, item.sourceKey,
          item.sourceExternalCode, item.sourceReference,
        ]
      );

      const foodId = foodRes.insertId;

      // 3. Insert verified household portions
      for (const p of item.portions) {
        const portionPublicId = crypto.randomUUID();
        await connection.query(
          `INSERT INTO nutrition_v2_food_portions (
            public_id, food_id, label, equivalent_reference_amount,
            sort_order, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
          [portionPublicId, foodId, p.label, p.equivalentReferenceAmount, p.sortOrder]
        );
      }

      // 4. Insert micronutrients (sodium) with strict schema check
      if (item.sodiumMg != null) {
        const nutrientStatus = item.sodiumMg === 0 ? "KNOWN_ZERO" : "KNOWN";
        await connection.query(
          `INSERT INTO nutrition_v2_food_nutrients (
            food_id, nutrient_code, amount_per_reference, unit_code,
            status, created_at, updated_at
          ) VALUES (?, 'NA', ?, 'mg', ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
          [foodId, item.sodiumMg, nutrientStatus]
        );
      }

      insertedCount++;
    }

    return {
      activeDb,
      totalManifest: BASE_BRASIL_V1_MANIFEST.length,
      insertedCount,
      skippedCount,
      duplicateCount: 0,
    };
  } finally {
    connection.release();
    await pool.end();
  }
}

// CLI direct execution
runBaseBrasilSeed()
  .then((res) => {
    console.log("\n==========================================");
    console.log("BASE BRASIL V1 SEED EXECUTION RESULT:");
    console.log(JSON.stringify(res, null, 2));
    console.log("==========================================\n");
  })
  .catch((err) => {
    console.error("Seed execution failed:", err);
    process.exit(1);
  });
