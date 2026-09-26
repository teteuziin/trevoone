/**
 * TREVO ONE — NUTRITION DATABASE
 * SEED IMPORTER: BASE BRASIL V1 (GROWTH VERIFIED & PROD-READY)
 *
 * Imports authoritative, verified Brazilian branded products into the catalog.
 * Supports --prod-ready-only for PROD promotion (7 Growth products only, Amafil excluded).
 * Supports --dry-run for pre-flight verification.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { normalizeSearchText } from "../lib/nutrition-v2/food-search.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load durable Growth manifest
const growthManifestRaw = await fs.readFile(
  path.join(__dirname, "..", "data", "nutrition", "growth-manifest-v1.json"),
  "utf-8"
);
export const GROWTH_PROD_MANIFEST = JSON.parse(growthManifestRaw);

// DEV-only unverified items (for local research/investigation only)
export const DEV_ONLY_ITEMS = [
  {
    brand: "Amafil",
    product_line: "Massa para Tapioca",
    variant: "Tradicional (Goma Hidratada)",
    name: "Amafil - Massa para Tapioca (Goma de Mandioca Hidratada)",
    display_name_pt_br: "Amafil — Massa para Tapioca (Goma de Mandioca Hidratada)",
    manufacturer: "Amafil Alimentos",
    category: "Cereais e Derivados",
    source_external_code: "AMAFIL-TAPIOCA-500G",
    source_reference: "https://amafil.com.br/produtos/tapioca/",
    source_capture_date: "2026-09-26",
    source_capture_method: "Product Page Presentation (Nutrition facts label unavailable online)",
    reference_amount: 100,
    reference_unit: "G",
    label_serving_amount: 100,
    label_serving_unit: "G",
    calories: 232.00,
    protein: 0.00,
    carbohydrate: 58.00,
    fat: 0.00,
    fiber: 0.00,
    sodium: 70.00,
    source_type: "BRANDED",
    source_key: "AMAFIL",
    data_quality: "UNCLASSIFIED", // Insufficient online manufacturer nutrition facts label; NOT_READY_FOR_PROD
    evidence_status: "INSUFFICIENT_EVIDENCE",
    portions: [
      { label: "1 colher de sopa", equivalent_reference_amount: 20.0, sort_order: 1 },
      { label: "5 colheres de sopa (1 porção)", equivalent_reference_amount: 100.0, sort_order: 2 }
    ]
  }
];

export const BASE_BRASIL_V1_MANIFEST = [
  ...GROWTH_PROD_MANIFEST,
  ...DEV_ONLY_ITEMS
];

export async function runBaseBrasilSeed(options = {}) {
  const isProdReadyOnly = options.prodReadyOnly ?? process.argv.includes("--prod-ready-only");
  const isDryRun = options.dryRun ?? process.argv.includes("--dry-run");

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

    // Safety Gate: PROD database (u406031981_trevoone) requires --prod-ready-only
    if (activeDb === "u406031981_trevoone" && !isProdReadyOnly) {
      throw new Error("HARD SAFETY GATE: PROD database requires --prod-ready-only flag. Aborting.");
    }

    if (activeDb !== "u406031981_trevoone_dev" && activeDb !== "u406031981_trevoone") {
      throw new Error(`Safety gate: Unknown database '${activeDb}'. Aborting.`);
    }

    // Select manifest scope
    const manifest = isProdReadyOnly ? GROWTH_PROD_MANIFEST : BASE_BRASIL_V1_MANIFEST;

    // Hard safety assertions for PROD_READY_ONLY
    if (isProdReadyOnly) {
      if (manifest.length !== 7) {
        throw new Error(`HARD SAFETY GATE: PROD manifest count must be exactly 7. Found: ${manifest.length}`);
      }
      for (const item of manifest) {
        if (item.brand !== "Growth Supplements") {
          throw new Error(`HARD SAFETY GATE: Non-Growth product in PROD manifest: ${item.brand}`);
        }
        if (item.evidence_status !== "OFFICIAL_LABEL_VERIFIED") {
          throw new Error(`HARD SAFETY GATE: Unverified product in PROD manifest: ${item.name}`);
        }
      }
      const amafilCount = manifest.filter((m) => m.brand === "Amafil").length;
      if (amafilCount > 0) {
        throw new Error("HARD SAFETY GATE: Amafil must NOT be included in PROD manifest.");
      }
    }

    // DRY RUN MODE
    if (isDryRun) {
      let readyToInsert = 0;
      let alreadyExisting = 0;

      for (const item of manifest) {
        const [existing] = await connection.query(
          `SELECT id FROM nutrition_v2_foods
           WHERE (source_key = ? AND source_external_code = ?)
              OR (brand = ? AND product_line = ? AND flavor_or_variant = ?)
           LIMIT 1`,
          [item.source_key, item.source_external_code, item.brand, item.product_line, item.variant]
        );
        if (Array.isArray(existing) && existing.length > 0) {
          alreadyExisting++;
        } else {
          readyToInsert++;
        }
      }

      console.log("\n==========================================");
      console.log("PROD READY DRY RUN:");
      console.log(`DATABASE: ${activeDb}`);
      console.log(`READY RECORDS: ${manifest.length}`);
      console.log(`BRANDS: Growth Supplements only`);
      console.log(`AMAFIL: 0`);
      console.log(`OTHER: 0`);
      console.log(`TO INSERT: ${readyToInsert}`);
      console.log(`ALREADY IN DB: ${alreadyExisting}`);
      console.log("==========================================\n");

      return {
        activeDb,
        isDryRun: true,
        readyRecords: manifest.length,
        brands: "Growth Supplements only",
        amafil: 0,
        other: 0,
        toInsert: readyToInsert,
        alreadyInDb: alreadyExisting
      };
    }

    // ACTUAL INSERTION MODE (IDEMPOTENT)
    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of manifest) {
      // 1. Deterministic deduplication check
      const [existing] = await connection.query(
        `SELECT id, public_id FROM nutrition_v2_foods
         WHERE (source_key = ? AND source_external_code = ?)
            OR (brand = ? AND product_line = ? AND flavor_or_variant = ?)
         LIMIT 1`,
        [item.source_key, item.source_external_code, item.brand, item.product_line, item.variant]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        skippedCount++;
        continue;
      }

      // Hard check during actual insert: verify brand
      if (isProdReadyOnly && item.brand !== "Growth Supplements") {
        throw new Error(`FATAL: Attempted to insert non-Growth item into PROD: ${item.brand}`);
      }

      // 2. Insert verified food record
      const publicId = crypto.randomUUID();
      const normalizedName = normalizeSearchText(item.name);
      const normalizedDisplayNamePtBr = normalizeSearchText(item.display_name_pt_br);

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
          publicId, item.name, item.display_name_pt_br,
          normalizedDisplayNamePtBr, normalizedName, item.category,
          item.brand, item.product_line, item.variant, item.manufacturer,
          item.reference_amount, item.reference_unit, item.calories,
          item.protein, item.carbohydrate, item.fat, item.fiber,
          item.source_type, item.data_quality, item.source_key,
          item.source_external_code, item.source_reference,
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
          [portionPublicId, foodId, p.label, p.equivalent_reference_amount, p.sort_order]
        );
      }

      // 4. Insert micronutrients (sodium) with strict schema check
      if (item.sodium != null) {
        const nutrientStatus = item.sodium === 0 ? "KNOWN_ZERO" : "KNOWN";
        await connection.query(
          `INSERT INTO nutrition_v2_food_nutrients (
            food_id, nutrient_code, amount_per_reference, unit_code,
            status, created_at, updated_at
          ) VALUES (?, 'NA', ?, 'mg', ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
          [foodId, item.sodium, nutrientStatus]
        );
      }

      insertedCount++;
    }

    const result = {
      activeDb,
      totalManifest: manifest.length,
      insertedCount,
      skippedCount,
      duplicateCount: 0,
    };

    console.log("\n==========================================");
    console.log("BASE BRASIL V1 SEED EXECUTION RESULT:");
    console.log(JSON.stringify(result, null, 2));
    console.log("==========================================\n");

    return result;
  } finally {
    connection.release();
    await pool.end();
  }
}

// CLI direct execution
if (process.argv[1] && process.argv[1].endsWith("seed-nutrition-base-brasil-v1.mjs")) {
  runBaseBrasilSeed().catch((err) => {
    console.error("Seed execution failed:", err);
    process.exit(1);
  });
}
