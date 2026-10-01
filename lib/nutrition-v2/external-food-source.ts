/**
 * TREVO ONE — EXTERNAL FOOD SOURCE CLIENT (NUTRITION V2)
 * Controlled on-demand external nutritional research, strict provenance tracking,
 * Portuguese localization, and deduplication.
 *
 * CRITICAL RULE:
 * OpenAI is NEVER used as a nutritional authority.
 * Macro and micronutrients MUST come from traceable, approved nutritional sources (e.g. USDA FoodData Central).
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { normalizeSearchText } from "./food-search";

export interface ExternalFoodCandidate {
  sourceUid: string;
  sourceKey: string;
  sourceExternalCode: string;
  sourceName: string;
  displayNamePtBr: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  referenceAmount: number;
  referenceUnitCode: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  preparationMatch: boolean;
  nutrients: Array<{
    code: string;
    unitCode: string;
    amount: number;
  }>;
}

export interface ExternalFoodSearchResult {
  status: "FOUND" | "NOT_FOUND" | "BLOCKED_BY_CONFIGURATION";
  reason?: string;
  candidates: ExternalFoodCandidate[];
}

export const IS_USDA_ONLINE_API_OPTIONAL = true;

/**
 * Checks if the optional USDA FoodData Central online API key is configured.
 * NOTE: The primary resolution engine uses the local USDA Foundation + FNDDS database
 * stored in MySQL, eliminating the functional requirement for this key.
 */
export function isUsdaApiConfigured(): boolean {
  const key = process.env.USDA_FDC_API_KEY || process.env.USDA_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Portuguese -> English food term mapping for USDA FoodData Central querying.
 */
const PT_TO_EN_SEARCH_MAP: Readonly<Record<string, string>> = Object.freeze({
  aipim: "cassava",
  macaxeira: "cassava",
  mandioca: "cassava",
  "aipim assado": "cassava cooked",
  "mandioca assada": "cassava cooked",
  "mandioca cozida": "cassava cooked",
  "moela de frango": "chicken gizzard",
  moela: "chicken gizzard",
  "file suino": "pork tenderloin",
  "lombo suino": "pork loin",
  "carne suina": "pork",
  "atum em posta": "tuna fresh steak",
  "atum fresco": "tuna fresh",
  "atum em lata": "tuna canned",
  "pao libanes": "pita bread",
  "pao sirio": "pita bread",
  "gelatina de frutas": "gelatin dessert",
  gelatina: "gelatin dessert",
  "macarrao de arroz": "rice noodles",
  "batata inglesa assada": "potato baked",
  "pure de batata": "mashed potatoes",
  "ervilha em grao": "green peas cooked",
  "feijao carioca": "pinto beans cooked",
  "feijao preto": "black beans cooked",
  "carne moida": "ground beef",
  "banana da terra": "plantain",
  "banana-da-terra": "plantain",
  "banana prata": "banana",
  patinho: "beef round",
  alcatra: "beef top sirloin",
  "queijo minas": "fresh cheese",
  requeijao: "cream cheese",
  cuscuz: "cornmeal couscous",
  tapioca: "tapioca pearl",
});

/**
 * Common English preparation to Portuguese translation.
 */
function translateUsdaDescriptionToPtBr(desc: string): string {
  let pt = desc;

  // Basic ingredient terms
  pt = pt.replace(/\bCassava\b/gi, "Mandioca");
  pt = pt.replace(/\bChicken gizzard\b/gi, "Moela de frango");
  pt = pt.replace(/\bPork tenderloin\b/gi, "Filé mignon suíno");
  pt = pt.replace(/\bPork loin\b/gi, "Lombo suíno");
  pt = pt.replace(/\bPork\b/gi, "Carne suína");
  pt = pt.replace(/\bTuna\b/gi, "Atum");
  pt = pt.replace(/\bPita bread\b/gi, "Pão sírio / libanês");
  pt = pt.replace(/\bGelatin dessert\b/gi, "Gelatina de frutas");
  pt = pt.replace(/\bRice noodles\b/gi, "Macarrão de arroz");
  pt = pt.replace(/\bMashed potatoes\b/gi, "Purê de batata");
  pt = pt.replace(/\bPlantain\b/gi, "Banana-da-terra");
  pt = pt.replace(/\bGround beef\b/gi, "Carne moída bovina");
  pt = pt.replace(/\bBeef top sirloin\b/gi, "Alcatra bovina");
  pt = pt.replace(/\bBeef round\b/gi, "Patinho bovino");
  pt = pt.replace(/\bGreen peas\b/gi, "Ervilha em grão");
  pt = pt.replace(/\bBlack beans\b/gi, "Feijão preto");
  pt = pt.replace(/\bPinto beans\b/gi, "Feijão carioca");

  // Preparations
  pt = pt.replace(/\bcooked, boiled\b/gi, "cozido");
  pt = pt.replace(/\bcooked, baked\b/gi, "assado");
  pt = pt.replace(/\bcooked, roasted\b/gi, "assado");
  pt = pt.replace(/\bcooked, simmered\b/gi, "cozido");
  pt = pt.replace(/\bcooked\b/gi, "cozido");
  pt = pt.replace(/\braw\b/gi, "cru");
  pt = pt.replace(/\broasted\b/gi, "assado");
  pt = pt.replace(/\bbaked\b/gi, "assado");
  pt = pt.replace(/\bfried\b/gi, "frito");
  pt = pt.replace(/\bgrilled\b/gi, "grelhado");
  pt = pt.replace(/\bcanned\b/gi, "em lata");
  pt = pt.replace(/\bfresh\b/gi, "fresco");
  pt = pt.replace(/\bwithout salt\b/gi, "sem sal");
  pt = pt.replace(/\bwith salt\b/gi, "com sal");
  pt = pt.replace(/\bboneless\b/gi, "desossado");

  // Clean comma spacing
  pt = pt.replace(/\s*,\s*/g, ", ").trim();
  return pt;
}

/**
 * Searches external approved nutritional source (USDA FoodData Central on-demand).
 */
export async function searchExternalFoodSource(
  query: string,
  options?: { requestedPrep?: string; maxResults?: number }
): Promise<ExternalFoodSearchResult> {
  const apiKey = (process.env.USDA_FDC_API_KEY || process.env.USDA_API_KEY)?.trim();
  if (!apiKey) {
    return {
      status: "BLOCKED_BY_CONFIGURATION",
      reason: "Chave USDA_FDC_API_KEY não configurada no ambiente",
      candidates: [],
    };
  }

  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    return { status: "NOT_FOUND", candidates: [] };
  }

  // 1. Determine English search query
  let enQuery = PT_TO_EN_SEARCH_MAP[normQuery];
  if (!enQuery) {
    // Check if prefix / token match exists
    for (const [ptKey, enVal] of Object.entries(PT_TO_EN_SEARCH_MAP)) {
      if (normQuery.startsWith(ptKey) || ptKey.startsWith(normQuery)) {
        enQuery = enVal;
        break;
      }
    }
  }
  if (!enQuery) {
    enQuery = query;
  }

  const requestedPrep = options?.requestedPrep;
  const maxResults = options?.maxResults || 5;

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(
      apiKey
    )}&query=${encodeURIComponent(enQuery)}&pageSize=${maxResults}&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        status: "NOT_FOUND",
        reason: `USDA API retornou status HTTP ${response.status}`,
        candidates: [],
      };
    }

    const data = await response.json();
    const foods = Array.isArray(data?.foods) ? data.foods : [];

    if (foods.length === 0) {
      return { status: "NOT_FOUND", candidates: [] };
    }

    const candidates: ExternalFoodCandidate[] = [];

    for (const f of foods) {
      if (!f.fdcId || !f.description) continue;

      const fdcId = String(f.fdcId);
      const nutrientsList = Array.isArray(f.foodNutrients) ? f.foodNutrients : [];

      let kcal: number | null = null;
      let protein: number | null = null;
      let carbs: number | null = null;
      let fat: number | null = null;
      let fiber: number | null = null;

      const detailedNutrients: ExternalFoodCandidate["nutrients"] = [];

      for (const n of nutrientsList) {
        const nId = Number(n.nutrientId || n.nutrientNumber);
        const val = typeof n.value === "number" ? n.value : Number(n.value);
        if (isNaN(val)) continue;

        // Energy (kcal)
        if (nId === 1008 || n.nutrientName === "Energy") {
          if (n.unitName?.toUpperCase() === "KCAL" || !kcal) {
            kcal = Math.round(val * 10) / 10;
          }
        } else if (nId === 1003 || n.nutrientName?.includes("Protein")) {
          protein = Math.round(val * 10) / 10;
        } else if (nId === 1005 || n.nutrientName?.includes("Carbohydrate")) {
          carbs = Math.round(val * 10) / 10;
        } else if (nId === 1004 || n.nutrientName?.includes("Total lipid")) {
          fat = Math.round(val * 10) / 10;
        } else if (nId === 1079 || n.nutrientName?.includes("Fiber")) {
          fiber = Math.round(val * 10) / 10;
          detailedNutrients.push({ code: "FIBER", unitCode: "g", amount: val });
        } else if (nId === 1087) {
          detailedNutrients.push({ code: "CA", unitCode: "mg", amount: val });
        } else if (nId === 1089) {
          detailedNutrients.push({ code: "FE", unitCode: "mg", amount: val });
        } else if (nId === 1090) {
          detailedNutrients.push({ code: "MG", unitCode: "mg", amount: val });
        } else if (nId === 1091) {
          detailedNutrients.push({ code: "P", unitCode: "mg", amount: val });
        } else if (nId === 1092) {
          detailedNutrients.push({ code: "K", unitCode: "mg", amount: val });
        } else if (nId === 1093) {
          detailedNutrients.push({ code: "NA", unitCode: "mg", amount: val });
        } else if (nId === 1095) {
          detailedNutrients.push({ code: "ZN", unitCode: "mg", amount: val });
        } else if (nId === 1162) {
          detailedNutrients.push({ code: "VIT_C", unitCode: "mg", amount: val });
        } else if (nId === 1106) {
          detailedNutrients.push({ code: "VIT_A", unitCode: "mcg", amount: val });
        } else if (nId === 1114) {
          detailedNutrients.push({ code: "VIT_D", unitCode: "mcg", amount: val });
        } else if (nId === 1109) {
          detailedNutrients.push({ code: "VIT_E", unitCode: "mg", amount: val });
        } else if (nId === 1185) {
          detailedNutrients.push({ code: "VIT_K", unitCode: "mcg", amount: val });
        } else if (nId === 1165) {
          detailedNutrients.push({ code: "VIT_B1", unitCode: "mg", amount: val });
        } else if (nId === 1166) {
          detailedNutrients.push({ code: "VIT_B2", unitCode: "mg", amount: val });
        } else if (nId === 1167) {
          detailedNutrients.push({ code: "VIT_B3", unitCode: "mg", amount: val });
        } else if (nId === 1175) {
          detailedNutrients.push({ code: "VIT_B6", unitCode: "mg", amount: val });
        } else if (nId === 1177) {
          detailedNutrients.push({ code: "FOLATE", unitCode: "mcg", amount: val });
        } else if (nId === 1178) {
          detailedNutrients.push({ code: "VIT_B12", unitCode: "mcg", amount: val });
        }
      }

      // Check preparation match
      const descLower = String(f.description).toLowerCase();
      let prepMatch = true;
      if (requestedPrep) {
        const prepNorm = requestedPrep.toLowerCase();
        if (prepNorm.includes("assad") && !descLower.includes("baked") && !descLower.includes("roasted") && !descLower.includes("cooked")) {
          prepMatch = false;
        } else if (prepNorm.includes("cozid") && !descLower.includes("cooked") && !descLower.includes("boiled") && !descLower.includes("simmered")) {
          prepMatch = false;
        } else if (prepNorm.includes("cru") && !descLower.includes("raw")) {
          prepMatch = false;
        }
      }

      const displayNamePtBr = translateUsdaDescriptionToPtBr(String(f.description));
      const confidence = prepMatch ? "HIGH" : "MEDIUM";

      candidates.push({
        sourceUid: `USDA_${fdcId}`,
        sourceKey: "USDA_FDC",
        sourceExternalCode: fdcId,
        sourceName: String(f.description),
        displayNamePtBr,
        caloriesKcal: kcal,
        proteinG: protein,
        carbsG: carbs,
        fatG: fat,
        fiberG: fiber,
        referenceAmount: 100,
        referenceUnitCode: "G",
        confidence,
        preparationMatch: prepMatch,
        nutrients: detailedNutrients,
      });
    }

    return {
      status: candidates.length > 0 ? "FOUND" : "NOT_FOUND",
      candidates,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      status: "NOT_FOUND",
      reason: `Falha na requisição externa USDA: ${errorMsg}`,
      candidates: [],
    };
  }
}

/**
 * Auto-ingests an external food candidate into Trevo's Food Library V3.
 * Preserves strict provenance and checks for existing source_uid to prevent duplication.
 */
export async function autoIngestExternalFood(
  consultancyId: number | bigint,
  candidate: ExternalFoodCandidate
): Promise<{
  foodPublicId: string;
  name: string;
  sourceType: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  referenceAmount: number;
  referenceUnitCode: string;
}> {
  const db = await getDbConnection();
  try {
    // 1. Deduplication check: re-use if source_uid already exists
    const [existingRows] = await db.query<RowDataPacket[]>(
      `SELECT
        public_id, COALESCE(display_name_pt_br, name) AS display_name,
        calories_kcal, protein_g, carbohydrate_g, fat_g, reference_amount, reference_unit_code
       FROM nutrition_v2_foods
       WHERE source_uid = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1`,
      [candidate.sourceUid]
    );

    if (existingRows.length > 0) {
      const row = existingRows[0];
      return {
        foodPublicId: String(row.public_id),
        name: String(row.display_name),
        sourceType: "EXTERNAL_USDA",
        caloriesKcal: row.calories_kcal !== null ? Number(row.calories_kcal) : null,
        proteinG: row.protein_g !== null ? Number(row.protein_g) : null,
        carbsG: row.carbohydrate_g !== null ? Number(row.carbohydrate_g) : null,
        fatG: row.fat_g !== null ? Number(row.fat_g) : null,
        fiberG: candidate.fiberG,
        referenceAmount: Number(row.reference_amount || 100),
        referenceUnitCode: String(row.reference_unit_code || "G"),
      };
    }

    // 2. Insert new canonical food record with complete provenance
    const foodPublicId = crypto.randomUUID();
    const normalizedName = normalizeSearchText(candidate.displayNamePtBr);

    const [insRes] = await db.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
        reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g,
        status, source_type, data_quality, source_key, source_external_code,
        source_version, source_reference, source_imported_at, source_uid,
        created_at, updated_at
      ) VALUES (
        ?, 'GLOBAL', NULL, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        'ACTIVE', 'EXTERNAL_USDA', 'VERIFIED', ?, ?,
        'FDC_V1', 'USDA FoodData Central', NOW(3), ?,
        NOW(3), NOW(3)
      )`,
      [
        foodPublicId,
        candidate.sourceName,
        candidate.displayNamePtBr,
        normalizedName,
        candidate.referenceAmount,
        candidate.referenceUnitCode,
        candidate.caloriesKcal,
        candidate.proteinG,
        candidate.carbsG,
        candidate.fatG,
        candidate.fiberG,
        candidate.sourceKey,
        candidate.sourceExternalCode,
        candidate.sourceUid,
      ]
    );

    const foodId = insRes.insertId;

    // 3. Insert canonical micronutrients with Unknown != Zero semantics
    for (const nut of candidate.nutrients) {
      if (nut.amount === null || nut.amount === undefined || isNaN(nut.amount)) {
        continue; // UNKNOWN != ZERO: do not insert unknown values
      }
      const status = nut.amount > 0 ? "KNOWN" : "KNOWN_ZERO";
      await db.query(
        `INSERT INTO nutrition_v2_food_nutrients (
          food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))
        ON DUPLICATE KEY UPDATE amount_per_reference = VALUES(amount_per_reference)`,
        [foodId, nut.code, nut.amount, nut.unitCode, status]
      );
    }

    return {
      foodPublicId,
      name: candidate.displayNamePtBr,
      sourceType: "EXTERNAL_USDA",
      caloriesKcal: candidate.caloriesKcal,
      proteinG: candidate.proteinG,
      carbsG: candidate.carbsG,
      fatG: candidate.fatG,
      fiberG: candidate.fiberG,
      referenceAmount: candidate.referenceAmount,
      referenceUnitCode: candidate.referenceUnitCode,
    };
  } finally {
    db.release();
  }
}
