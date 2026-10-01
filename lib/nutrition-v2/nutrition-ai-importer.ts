/**
 * TREVO ONE — NUTRITION AI IMPORTER
 * Multi-tenant AI extraction, universal Food Library V3 matching,
 * preparation awareness, visual claim tracking, and authoritative plan persistence.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getAiImportProvider } from "../ai/provider";
import {
  reserveAiQuota,
  markAiQuotaConsumed,
  refundAiQuota,
} from "../ai/quotas";
import type { DocumentInput } from "../ai/openai-client";
import type { RawNutritionImportProposal } from "../ai/schemas";
import { recordConsultancyActivity } from "../consultancies/activity-log";
import { normalizeSearchText, USER_SEARCH_ALIASES, getPortugueseWordRoots } from "./food-search";
import { searchExternalFoodSource, autoIngestExternalFood } from "./external-food-source";

export type FoodMatchStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

export interface MatchedFoodCandidate {
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
}

export interface ResolvedNutritionFoodItem {
  id: string; // client temporary ID
  originalText: string;
  foodNameCandidate: string;
  matchStatus: FoodMatchStatus;
  foodPublicId: string | null;
  foodNameSnapshot: string;
  quantity: number | null;
  unitCandidate: string | null;
  notes: string | null;
  candidates: MatchedFoodCandidate[];
  authoritativeNutrients: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  } | null;
  sourceDocumentClaim: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  provenance?: "LOCAL_MATCHED" | "EXTERNAL_IMPORTED" | "NEEDS_REVIEW" | "MANUALLY_RESOLVED" | null;
  substitutions?: ResolvedNutritionFoodItem[];
}

export interface ResolvedNutritionMeal {
  name: string;
  time: string | null;
  notes: string | null;
  foods: ResolvedNutritionFoodItem[];
}

export interface ResolvedNutritionProposal {
  jobPublicId: string;
  title: string;
  patientNameCandidate: string | null;
  targetPatientMembershipId: number | null;
  targetPatientName: string | null;
  objective: string | null;
  notes: string | null;
  meals: ResolvedNutritionMeal[];
  stats: {
    totalFoods: number;
    matchedCount: number;
    ambiguousCount: number;
    notFoundCount: number;
  };
  totalNutrientsAuthoritative: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
  status: "READY" | "NEEDS_REVIEW";
}

const COOKING_PREPARATIONS = [
  "cozido",
  "cozida",
  "grelhado",
  "grelhada",
  "frito",
  "frita",
  "assado",
  "assada",
  "cru",
  "crua",
  "refogado",
  "refogada",
  "vapor",
  "ensopado",
  "ensopada",
];

export const INHERENTLY_GENERIC_FOODS = new Set([
  "peixe",
  "folhas",
  "salada de verduras",
  "carne moida",
]);

// Secondary recipe words that indicate a composite preparation rather than the base food
const COMPOSITE_RECIPE_PREFIXES = [
  "sanduiche",
  "bolo",
  "torta",
  "escondidinho",
  "cacarola",
  "molho para",
  "sopa",
  "amendoas",
  "amendoa",
  "castanha",
  "sementes",
  "macarrao com",
  "maionese",
  "camarao",
];

function cleanPunctuation(text: string): string {
  return text.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Searches Food Library V3 (Global + Consultancy) for candidate matches,
 * with strict preparation matching, regional Brazilian synonyms, and
 * multi-tier resolution (Exact -> Alias -> Prep -> Semantic -> External -> Ambiguous -> Not Found).
 */
export async function matchFoodCandidate(
  consultancyId: number | bigint,
  candidateName: string
): Promise<{
  status: FoodMatchStatus;
  matched?: MatchedFoodCandidate;
  candidates: MatchedFoodCandidate[];
  provenance?: "LOCAL_MATCHED" | "EXTERNAL_IMPORTED" | "NEEDS_REVIEW";
}> {
  const normCandidate = normalizeSearchText(candidateName);
  if (!normCandidate) {
    return { status: "NOT_FOUND", candidates: [], provenance: "NEEDS_REVIEW" };
  }
  const cleanCandidate = cleanPunctuation(normCandidate);

  // Detect preparation terms in candidate (e.g. "cozida", "crua", "grelhado")
  const requestedPrep = COOKING_PREPARATIONS.find((prep) =>
    new RegExp(`\\b${prep}\\b`, "i").test(normCandidate)
  );

  const db = await getDbConnection();
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        f.id,
        f.public_id,
        COALESCE(f.display_name_pt_br, f.name) AS display_name,
        f.normalized_name,
        f.source_type,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        fn_fiber.amount_per_reference AS fiber_amount,
        fn_fiber.status AS fiber_status,
        f.reference_amount,
        f.reference_unit_code
       FROM nutrition_v2_foods f
       LEFT JOIN nutrition_v2_food_nutrients fn_fiber
         ON fn_fiber.food_id = f.id AND fn_fiber.nutrient_code = 'FIBER'
       WHERE f.status = 'ACTIVE'
         AND f.deleted_at IS NULL
         AND (f.scope = 'GLOBAL' OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ?))`,
      [consultancyId]
    );

    const mapCandidateObj = (r: RowDataPacket): MatchedFoodCandidate => {
      let fiberVal: number | null = null;
      if (r.fiber_status === "KNOWN_ZERO") {
        fiberVal = 0;
      } else if (r.fiber_status === "TRACE") {
        fiberVal = null;
      } else if (r.fiber_status === "KNOWN" && r.fiber_amount !== null && r.fiber_amount !== undefined) {
        fiberVal = Number(r.fiber_amount);
      } else {
        fiberVal = null; // UNKNOWN
      }

      return {
        foodPublicId: String(r.public_id),
        name: String(r.display_name),
        sourceType: String(r.source_type),
        caloriesKcal: r.calories_kcal !== null ? Number(r.calories_kcal) : null,
        proteinG: r.protein_g !== null ? Number(r.protein_g) : null,
        carbsG: r.carbohydrate_g !== null ? Number(r.carbohydrate_g) : null,
        fatG: r.fat_g !== null ? Number(r.fat_g) : null,
        fiberG: fiberVal,
        referenceAmount: Number(r.reference_amount || 100),
        referenceUnitCode: String(r.reference_unit_code || "G"),
      };
    };

    // 1. INHERENTLY GENERIC FOODS (Section 8: "peixe", "folhas", "salada de verduras", "carne moída")
    // If not enough information is provided, MUST stay AMBIGUOUS / NEEDS_REVIEW to prevent fabricating false macros.
    if (INHERENTLY_GENERIC_FOODS.has(normCandidate) || INHERENTLY_GENERIC_FOODS.has(cleanCandidate)) {
      const genericCandidates: MatchedFoodCandidate[] = [];
      for (const r of rows) {
        const cName = cleanPunctuation(normalizeSearchText(String(r.display_name)));
        if (cName.includes(cleanCandidate)) {
          genericCandidates.push(mapCandidateObj(r));
          if (genericCandidates.length >= 10) break;
        }
      }
      return {
        status: "AMBIGUOUS",
        candidates: genericCandidates,
        provenance: "NEEDS_REVIEW",
      };
    }

    // 2. TIER 1: LOCAL EXACT MATCHES (Direct Candidate === DB Name)
    const exactRows = rows.filter((r) => {
      const cName = cleanPunctuation(normalizeSearchText(String(r.display_name)));
      return cName === cleanCandidate;
    });

    if (exactRows.length > 0) {
      // If multiple duplicate rows exist with the exact same name (e.g. duplicate "Muçarela" or "Tangerina"),
      // pick canonical record (TACO first, then GLOBAL/lowest ID)
      const canonical = exactRows.find((r) => String(r.source_type).toUpperCase() === "TACO") || exactRows[0];
      const matched = mapCandidateObj(canonical);
      return {
        status: "MATCHED",
        matched,
        candidates: [matched],
        provenance: "LOCAL_MATCHED",
      };
    }

    // Expand search vocabulary with singular roots, regional aliases, and substitutions
    const searchTermsSet = new Set<string>([normCandidate, cleanCandidate]);
    const roots = getPortugueseWordRoots(normCandidate);
    for (const root of roots) {
      searchTermsSet.add(root);
      searchTermsSet.add(cleanPunctuation(root));
    }
    if (normCandidate.includes("aipim") || normCandidate.includes("macaxeira")) {
      searchTermsSet.add(normCandidate.replace(/aipim|macaxeira/g, "mandioca"));
      searchTermsSet.add(cleanPunctuation(normCandidate.replace(/aipim|macaxeira/g, "mandioca")));
    }
    if (USER_SEARCH_ALIASES[normCandidate]) {
      for (const al of USER_SEARCH_ALIASES[normCandidate]) {
        const normAl = normalizeSearchText(al);
        searchTermsSet.add(normAl);
        searchTermsSet.add(cleanPunctuation(normAl));
      }
    }
    for (const [key, alList] of Object.entries(USER_SEARCH_ALIASES)) {
      if (normCandidate.includes(key)) {
        for (const al of alList) {
          const replaced = normalizeSearchText(normCandidate.replace(key, al));
          searchTermsSet.add(replaced);
          searchTermsSet.add(cleanPunctuation(replaced));
        }
      }
    }

    const searchTerms = Array.from(searchTermsSet);

    // 3. TIER 2: LOCAL ALIAS EXACT MATCH
    for (const alias of searchTerms.slice(1)) {
      const aliasRows = rows.filter((r) => {
        const cName = cleanPunctuation(normalizeSearchText(String(r.display_name)));
        return cName === alias;
      });
      if (aliasRows.length > 0) {
        const canonical = aliasRows.find((r) => String(r.source_type).toUpperCase() === "TACO") || aliasRows[0];
        const matched = mapCandidateObj(canonical);
        return {
          status: "MATCHED",
          matched,
          candidates: [matched],
          provenance: "LOCAL_MATCHED",
        };
      }
    }

    // 4. TIER 3 & 4: HEAD NOUN, CULINARY DEFAULTS & SEMANTIC MATCHING
    const poolRows: RowDataPacket[] = [];
    for (const r of rows) {
      const normDb = normalizeSearchText(String(r.display_name));
      const cleanDb = cleanPunctuation(normDb);
      if (cleanDb.length <= 2) continue;

      const matchesTerm = searchTerms.some((st) => {
        if (st.length >= 3 && cleanDb.includes(st)) return true;
        if (cleanDb.length >= 4 && st.includes(cleanDb)) return true;
        return false;
      });

      if (!matchesTerm) continue;

      // Filter composite dishes (e.g. sandwiches, cakes, pies, salads with mayo) if candidate is a base food
      const queryIsComposite = COMPOSITE_RECIPE_PREFIXES.some((p) => cleanCandidate.startsWith(p));
      if (!queryIsComposite) {
        const nameIsComposite = COMPOSITE_RECIPE_PREFIXES.some((p) => cleanDb.startsWith(p));
        if (nameIsComposite) continue;
      }

      poolRows.push(r);
    }

    // High-frequency Brazilian dietary canonicals:
    // Torradas
    if (cleanCandidate === "torradas" || cleanCandidate === "torrada") {
      const breadToast = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("torrada pao"));
      if (breadToast) {
        const matched = mapCandidateObj(breadToast);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Pão de forma
    if (cleanCandidate === "pao de forma") {
      const breadLoaf = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("pao de forma"));
      if (breadLoaf) {
        const matched = mapCandidateObj(breadLoaf);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Ovos
    if (cleanCandidate === "ovos" || cleanCandidate === "ovo") {
      const egg = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("ovo de galinha inteiro cozido"));
      if (egg) {
        const matched = mapCandidateObj(egg);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Queijo Minas
    if (cleanCandidate === "queijo minas") {
      const minas = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("queijo minas frescal"));
      if (minas) {
        const matched = mapCandidateObj(minas);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Banana Prata
    if (cleanCandidate === "banana prata") {
      const prata = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("banana prata"));
      if (prata) {
        const matched = mapCandidateObj(prata);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Banana-da-terra
    if (cleanCandidate.includes("banana da terra") || cleanCandidate.includes("banana terra")) {
      const terra = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("banana da terra crua") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("banana terra cru"));
      if (terra) {
        const matched = mapCandidateObj(terra);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Abacaxi
    if (cleanCandidate === "abacaxi") {
      const abacaxi = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("abacaxi cru"));
      if (abacaxi) {
        const matched = mapCandidateObj(abacaxi);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Tapioca
    if (cleanCandidate === "tapioca") {
      const tapioca = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).includes("massa para tapioca") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("tapioca de goma"));
      if (tapioca) {
        const matched = mapCandidateObj(tapioca);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Pão Libanês / Sírio
    if (cleanCandidate.includes("pao libanes") || cleanCandidate.includes("pao sirio")) {
      const paoSirio = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).includes("pao sirio") && !cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("torradinhas"));
      if (paoSirio) {
        const matched = mapCandidateObj(paoSirio);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Meats: Patinho
    if (cleanCandidate === "patinho") {
      const patinho = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("patinho sem gordura grelhado") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("patinho grelhado"));
      if (patinho) {
        const matched = mapCandidateObj(patinho);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Meats: Alcatra
    if (cleanCandidate === "alcatra") {
      const alcatra = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("miolo de alcatra sem gordura grelhado") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("alcatra grelhada"));
      if (alcatra) {
        const matched = mapCandidateObj(alcatra);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Meats: Fígado Bovino
    if (cleanCandidate.includes("figado bovino")) {
      const figado = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("figado bovino grelhado") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("figado bovino cozido"));
      if (figado) {
        const matched = mapCandidateObj(figado);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Meats: Filé Suíno / Lombo Suíno
    if (cleanCandidate.includes("file suino") || cleanCandidate.includes("lombo suino")) {
      const suino = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("lombo suino grelhado") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("lombo suino file mignon") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("lombo suino"));
      if (suino) {
        const matched = mapCandidateObj(suino);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Moela de frango
    if (cleanCandidate.includes("moela")) {
      const moela = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("moela de galinha ou frango cozida") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("moela cozida"));
      if (moela) {
        const matched = mapCandidateObj(moela);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Arroz
    if (cleanCandidate === "arroz") {
      const arroz = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))) === "arroz tipo 1 cozido" || cleanPunctuation(normalizeSearchText(String(r.display_name))) === "arroz cozido");
      if (arroz) {
        const matched = mapCandidateObj(arroz);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Feijão Carioca
    if (cleanCandidate.includes("feijao carioca")) {
      const feijao = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("feijao carioca cozido"));
      if (feijao) {
        const matched = mapCandidateObj(feijao);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Feijão Preto
    if (cleanCandidate.includes("feijao preto")) {
      const feijao = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("feijao preto cozido"));
      if (feijao) {
        const matched = mapCandidateObj(feijao);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Aipim / Macaxeira
    if (cleanCandidate === "aipim" || cleanCandidate === "macaxeira") {
      const mandioca = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("mandioca cozida"));
      if (mandioca) {
        const matched = mapCandidateObj(mandioca);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Atum em posta
    if (cleanCandidate.includes("atum em posta")) {
      const atum = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("atum fresco cru") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("atum cru"));
      if (atum) {
        const matched = mapCandidateObj(atum);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Atum em lata
    if (cleanCandidate.includes("atum em lata")) {
      const atumAgua = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).includes("conserva de agua")) || poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("atum"));
      if (atumAgua) {
        const matched = mapCandidateObj(atumAgua);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Macarrão de arroz
    if (cleanCandidate.includes("macarrao de arroz")) {
      const pasta = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))) === "macarrao" || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("macarrao"));
      if (pasta) {
        const matched = mapCandidateObj(pasta);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Coxa de frango
    if (cleanCandidate === "coxa de frango") {
      const coxa = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("coxa de frango sem pele cozida") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("coxa de frango sem pele assada"));
      if (coxa) {
        const matched = mapCandidateObj(coxa);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // Sobrecoxa
    if (cleanCandidate === "sobrecoxa") {
      const sobrecoxa = poolRows.find((r) => cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("sobrecoxa de frango sem pele assada") || cleanPunctuation(normalizeSearchText(String(r.display_name))).startsWith("sobrecoxa de frango sem pele cozida"));
      if (sobrecoxa) {
        const matched = mapCandidateObj(sobrecoxa);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // If requestedPrep is present and matches exactly 1
    if (requestedPrep) {
      const prepRows = poolRows.filter((r) => new RegExp(`\\b${requestedPrep}\\b`, "i").test(normalizeSearchText(String(r.display_name))));
      if (prepRows.length === 1) {
        const matched = mapCandidateObj(prepRows[0]);
        return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
      }
    }

    // If pool has exactly 1 candidate
    if (poolRows.length === 1) {
      const matched = mapCandidateObj(poolRows[0]);
      return { status: "MATCHED", matched, candidates: [matched], provenance: "LOCAL_MATCHED" };
    }

    // 5. TIER 5: EXTERNAL NUTRITIONAL SOURCE (USDA FoodData Central on-demand)
    const externalResult = await searchExternalFoodSource(candidateName, { requestedPrep });
    if (externalResult.status === "FOUND" && externalResult.candidates.length > 0) {
      const top = externalResult.candidates[0];
      if (top.confidence === "HIGH") {
        const ingested = await autoIngestExternalFood(consultancyId, top);
        return {
          status: "MATCHED",
          matched: ingested,
          candidates: [ingested],
          provenance: "EXTERNAL_IMPORTED",
        };
      } else {
        const mappedCandidates: MatchedFoodCandidate[] = externalResult.candidates.map((c) => ({
          foodPublicId: c.sourceUid,
          name: c.displayNamePtBr,
          sourceType: "EXTERNAL_USDA",
          caloriesKcal: c.caloriesKcal,
          proteinG: c.proteinG,
          carbsG: c.carbsG,
          fatG: c.fatG,
          fiberG: c.fiberG,
          referenceAmount: c.referenceAmount,
          referenceUnitCode: c.referenceUnitCode,
        }));
        return {
          status: "AMBIGUOUS",
          candidates: mappedCandidates.slice(0, 10),
          provenance: "NEEDS_REVIEW",
        };
      }
    }

    // 6. TIER 6: AMBIGUOUS (when multiple safe candidates exist in local pool)
    if (poolRows.length > 1) {
      const mappedCandidates = poolRows.slice(0, 10).map(mapCandidateObj);
      return {
        status: "AMBIGUOUS",
        candidates: mappedCandidates,
        provenance: "NEEDS_REVIEW",
      };
    }

    // 7. TIER 7: NOT_FOUND
    return {
      status: "NOT_FOUND",
      candidates: [],
      provenance: "NEEDS_REVIEW",
    };
  } finally {
    db.release();
  }
}

/**
 * Calculates authoritative nutritional totals from real Trevo food records.
 */
export function calculateAuthoritativeItemNutrients(
  food: MatchedFoodCandidate,
  quantity: number | null
) {
  const qty = quantity && quantity > 0 ? quantity : 100;
  const factor = qty / (food.referenceAmount || 100);

  return {
    caloriesKcal: food.caloriesKcal !== null ? Math.round(food.caloriesKcal * factor * 10) / 10 : null,
    proteinG: food.proteinG !== null ? Math.round(food.proteinG * factor * 10) / 10 : null,
    carbsG: food.carbsG !== null ? Math.round(food.carbsG * factor * 10) / 10 : null,
    fatG: food.fatG !== null ? Math.round(food.fatG * factor * 10) / 10 : null,
    fiberG: food.fiberG !== null ? Math.round(food.fiberG * factor * 10) / 10 : null,
  };
}

/**
 * Initiates AI Nutrition import:
 * 1. Quota reservation (atomic server-side)
 * 2. OpenAI provider extraction
 * 3. Quota consumption or refund
 * 4. Food Library matching with preparation sensitivity
 * 5. Strict rejection of AI macros as authority (preserves claim as visual reference only)
 */
export async function processNutritionAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  input: DocumentInput;
  targetPatientMembershipId?: number | bigint | null;
  idempotencyKey?: string;
}): Promise<ResolvedNutritionProposal> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    input,
    targetPatientMembershipId,
    idempotencyKey = crypto.randomUUID(),
  } = params;

  // 1. Compute file hash
  const fileBuffer = input.buffer || Buffer.from(input.text || "", "utf8");
  const sourceHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const importJobPublicId = crypto.randomUUID();

  // Check idempotency if key provided
  const db = await getDbConnection();
  try {
    const [existingJobs] = await db.query<RowDataPacket[]>(
      `SELECT public_id, resolved_proposal_json, status
       FROM ai_import_jobs
       WHERE consultancy_id = ? AND idempotency_key = ? LIMIT 1`,
      [consultancyId, idempotencyKey]
    );

    if (existingJobs.length > 0 && existingJobs[0].resolved_proposal_json) {
      return JSON.parse(String(existingJobs[0].resolved_proposal_json));
    }
  } finally {
    db.release();
  }

  // 2. Atomic Quota Reservation
  const quotaReservation = await reserveAiQuota({
    consultancyId,
    memberId,
    userId,
    role,
    feature: "NUTRITION_IMPORT",
    model: "gpt-4o",
    importJobPublicId,
  });

  if (!quotaReservation.success) {
    throw new Error(quotaReservation.message || "Limite de cota de IA atingido.");
  }

  const usageEventPublicId = quotaReservation.usageEventPublicId!;

  // 3. Create initial import job record
  const sourceType = input.filename.endsWith(".pdf")
    ? "PDF"
    : input.filename.endsWith(".docx")
    ? "DOCX"
    : input.filename.endsWith(".md")
    ? "MARKDOWN"
    : "TEXT";

  const dbJob = await getDbConnection();
  try {
    await dbJob.query(
      `INSERT INTO ai_import_jobs (
        public_id, idempotency_key, consultancy_id, member_id, user_id,
        feature, status, source_filename, source_hash, source_type,
        file_size_bytes, target_student_membership_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSING', ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        importJobPublicId,
        idempotencyKey,
        consultancyId,
        memberId,
        userId,
        input.filename,
        sourceHash,
        sourceType,
        fileBuffer.length,
        targetPatientMembershipId || null,
      ]
    );
  } finally {
    dbJob.release();
  }

  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_NUTRITION_IMPORT_STARTED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Iniciou a importação com IA do plano alimentar a partir de ${input.filename}`,
    metadata: {
      filename: input.filename,
      sourceType,
      fileSizeBytes: fileBuffer.length,
    },
  });

  // 4. Invoke OpenAI provider with automatic refund on failure
  let rawProposal: RawNutritionImportProposal;
  let metadata: { inputTokens: number; outputTokens: number; totalTokens: number };

  try {
    const provider = getAiImportProvider();
    const result = await provider.importNutrition(input);
    rawProposal = result.proposal;
    metadata = result.metadata;

    await markAiQuotaConsumed(usageEventPublicId, {
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      totalTokens: metadata.totalTokens,
    });
  } catch (providerErr: unknown) {
    const errorMsg = providerErr instanceof Error ? providerErr.message : String(providerErr);
    await refundAiQuota(usageEventPublicId);

    const dbFail = await getDbConnection();
    try {
      await dbFail.query(
        `UPDATE ai_import_jobs SET status = 'FAILED', error_message = ?, updated_at = NOW(3) WHERE public_id = ?`,
        [(errorMsg || "Falha na chamada da OpenAI").slice(0, 500), importJobPublicId]
      );
    } finally {
      dbFail.release();
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_NUTRITION_IMPORT_FAILED",
      module: "AI",
      resourceType: "AI_IMPORT_JOB",
      resourcePublicId: importJobPublicId,
      summary: `Falha ao processar o arquivo de nutrição ${input.filename} com IA`,
      metadata: { error: errorMsg },
    });

    throw new Error(`Falha no processamento com IA: ${errorMsg}`);
  }

  // 5. Match Foods against Food Library V3
  let totalFoods = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  let hasUnknownCalories = false;
  let hasUnknownProtein = false;
  let hasUnknownCarbs = false;
  let hasUnknownFat = false;
  let hasUnknownFiber = false;

  const resolvedMeals: ResolvedNutritionMeal[] = [];

  for (const m of rawProposal.meals || []) {
    const resolvedFoods: ResolvedNutritionFoodItem[] = [];

    // Group alternatives ("OU") into substitutions
    const groupedFoods: Array<{
      primary: NonNullable<typeof m.foods>[0];
      substitutions: NonNullable<typeof m.foods>[0][];
    }> = [];

    for (const f of m.foods || []) {
      const isAlternative =
        /^\s*(ou|opção|opcao)\b/i.test(f.originalText) ||
        /^\s*(ou|opção|opcao)\b/i.test(f.foodNameCandidate) ||
        (f.notes && /^\s*(ou|opção|opcao)\b/i.test(f.notes));

      if (isAlternative && groupedFoods.length > 0) {
        const cleanName = f.foodNameCandidate.replace(/^\s*(ou|opção|opcao)\s*:?\s*/i, "").trim();
        groupedFoods[groupedFoods.length - 1].substitutions.push({
          ...f,
          foodNameCandidate: cleanName || f.foodNameCandidate,
        });
      } else {
        const existingSubs = Array.isArray(f.substitutions) ? [...f.substitutions] : [];
        groupedFoods.push({
          primary: f,
          substitutions: existingSubs,
        });
      }
    }

    for (const grouped of groupedFoods) {
      const f = grouped.primary;
      totalFoods++;

      const isFreeSalad =
        f.quantity === null ||
        (f.unitCandidate && /à\s*vontade|a\s*vontade|livre/i.test(f.unitCandidate)) ||
        /à\s*vontade|a\s*vontade|salada\s+livre/i.test(f.foodNameCandidate) ||
        (f.notes && /à\s*vontade|a\s*vontade/i.test(f.notes));

      const isCompoundRecipeWithoutQty =
        (f.notes && f.notes.includes("NEEDS_RECIPE_DETAILS")) ||
        (/^suco de /i.test(f.foodNameCandidate) && f.foodNameCandidate.includes(" e ") && (!f.quantity || f.quantity === 1));

      const matchResult = await matchFoodCandidate(consultancyId, f.foodNameCandidate);

      let foodPublicId: string | null = null;
      let foodNameSnapshot = f.foodNameCandidate;
      let authoritativeNutrients: ResolvedNutritionFoodItem["authoritativeNutrients"] = null;

      if (matchResult.status === "MATCHED" && matchResult.matched) {
        matchedCount++;
        foodPublicId = matchResult.matched.foodPublicId;
        foodNameSnapshot = matchResult.matched.name;

        // Authoritative values strictly from the Food Library record!
        if (isFreeSalad || isCompoundRecipeWithoutQty) {
          // Never fabricate macros for free salads or recipes without ingredient breakdown
          authoritativeNutrients = null;
          hasUnknownCalories = true;
          hasUnknownProtein = true;
          hasUnknownCarbs = true;
          hasUnknownFat = true;
          hasUnknownFiber = true;
        } else {
          authoritativeNutrients = calculateAuthoritativeItemNutrients(
            matchResult.matched,
            f.quantity
          );

          if (authoritativeNutrients.caloriesKcal !== null) {
            totalCalories += authoritativeNutrients.caloriesKcal;
          } else {
            hasUnknownCalories = true;
          }
          if (authoritativeNutrients.proteinG !== null) {
            totalProtein += authoritativeNutrients.proteinG;
          } else {
            hasUnknownProtein = true;
          }
          if (authoritativeNutrients.carbsG !== null) {
            totalCarbs += authoritativeNutrients.carbsG;
          } else {
            hasUnknownCarbs = true;
          }
          if (authoritativeNutrients.fatG !== null) {
            totalFat += authoritativeNutrients.fatG;
          } else {
            hasUnknownFat = true;
          }
          if (authoritativeNutrients.fiberG !== null) {
            totalFiber += authoritativeNutrients.fiberG;
          } else {
            hasUnknownFiber = true;
          }
        }
      } else {
        if (matchResult.status === "AMBIGUOUS") {
          ambiguousCount++;
        } else {
          notFoundCount++;
        }
        hasUnknownCalories = true;
        hasUnknownProtein = true;
        hasUnknownCarbs = true;
        hasUnknownFat = true;
        hasUnknownFiber = true;
      }

      // Process substitutions for this primary item
      const resolvedSubs: ResolvedNutritionFoodItem[] = [];
      for (const sub of grouped.substitutions) {
        totalFoods++;
        const subMatch = await matchFoodCandidate(consultancyId, sub.foodNameCandidate);
        let subFoodPublicId: string | null = null;
        let subFoodNameSnapshot = sub.foodNameCandidate;
        let subAuthNutrients: ResolvedNutritionFoodItem["authoritativeNutrients"] = null;

        if (subMatch.status === "MATCHED" && subMatch.matched) {
          matchedCount++;
          subFoodPublicId = subMatch.matched.foodPublicId;
          subFoodNameSnapshot = subMatch.matched.name;
          subAuthNutrients = calculateAuthoritativeItemNutrients(
            subMatch.matched,
            sub.quantity
          );
          // CRITICAL: Substitutions NEVER add to totalCalories or meal totals!
        } else if (subMatch.status === "AMBIGUOUS") {
          ambiguousCount++;
        } else {
          notFoundCount++;
        }

        resolvedSubs.push({
          id: crypto.randomUUID(),
          originalText: sub.originalText,
          foodNameCandidate: sub.foodNameCandidate,
          matchStatus: subMatch.status,
          foodPublicId: subFoodPublicId,
          foodNameSnapshot: subFoodNameSnapshot,
          quantity: sub.quantity,
          unitCandidate: sub.unitCandidate,
          notes: sub.notes,
          candidates: subMatch.candidates,
          authoritativeNutrients: subAuthNutrients,
          sourceDocumentClaim: sub.sourceDocumentClaim,
          provenance: subMatch.provenance || null,
        });
      }

      let itemNotes = f.notes;
      if (isCompoundRecipeWithoutQty && (!itemNotes || !itemNotes.includes("NEEDS_RECIPE_DETAILS"))) {
        itemNotes = itemNotes ? `${itemNotes} (NEEDS_RECIPE_DETAILS)` : "NEEDS_RECIPE_DETAILS";
      }

      resolvedFoods.push({
        id: crypto.randomUUID(),
        originalText: f.originalText,
        foodNameCandidate: f.foodNameCandidate,
        matchStatus: matchResult.status,
        foodPublicId,
        foodNameSnapshot,
        quantity: isFreeSalad ? null : f.quantity,
        unitCandidate: isFreeSalad ? "à vontade" : f.unitCandidate,
        notes: itemNotes,
        candidates: matchResult.candidates,
        authoritativeNutrients,
        // Visual comparison claim ONLY — never used as authoritative calculations!
        sourceDocumentClaim: f.sourceDocumentClaim,
        provenance: matchResult.provenance || null,
        substitutions: resolvedSubs,
      });
    }

    resolvedMeals.push({
      name: m.name || "Refeição",
      time: m.time,
      notes: m.notes,
      foods: resolvedFoods,
    });
  }

  // Resolve target patient if provided
  let targetPatientName: string | null = null;
  const dbPatient = await getDbConnection();
  try {
    if (targetPatientMembershipId) {
      const [pRows] = await dbPatient.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1`,
        [targetPatientMembershipId, consultancyId]
      );
      if (pRows.length > 0) {
        targetPatientName = String(pRows[0].full_name);
      }
    }
  } finally {
    dbPatient.release();
  }

  const proposalStatus: "READY" | "NEEDS_REVIEW" =
    ambiguousCount > 0 || notFoundCount > 0 ? "NEEDS_REVIEW" : "READY";

  const resolvedProposal: ResolvedNutritionProposal = {
    jobPublicId: importJobPublicId,
    title: rawProposal.title || `Plano Alimentar - ${input.filename}`,
    patientNameCandidate: rawProposal.patientNameCandidate,
    targetPatientMembershipId: targetPatientMembershipId ? Number(targetPatientMembershipId) : null,
    targetPatientName,
    objective: rawProposal.objective,
    notes: rawProposal.notes,
    meals: resolvedMeals,
    stats: {
      totalFoods,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
    totalNutrientsAuthoritative: {
      caloriesKcal: hasUnknownCalories ? null : Math.round(totalCalories * 10) / 10,
      proteinG: hasUnknownProtein ? null : Math.round(totalProtein * 10) / 10,
      carbsG: hasUnknownCarbs ? null : Math.round(totalCarbs * 10) / 10,
      fatG: hasUnknownFat ? null : Math.round(totalFat * 10) / 10,
      fiberG: hasUnknownFiber ? null : Math.round(totalFiber * 10) / 10,
    },
    status: proposalStatus,
  };

  // Update import job with proposals
  const dbSave = await getDbConnection();
  try {
    await dbSave.query(
      `UPDATE ai_import_jobs
       SET raw_proposal_json = ?,
           resolved_proposal_json = ?,
           status = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [
        JSON.stringify(rawProposal),
        JSON.stringify(resolvedProposal),
        proposalStatus,
        importJobPublicId,
      ]
    );
  } finally {
    dbSave.release();
  }

  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_NUTRITION_IMPORT_COMPLETED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Concluiu a leitura com IA de ${input.filename}: ${totalFoods} alimentos identificados (${matchedCount} encontrados)`,
    metadata: {
      filename: input.filename,
      totalFoods,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
  });

  return resolvedProposal;
}

/**
 * Confirms and persists the resolved Nutrition plan into the authoritative Trevo database.
 */
export async function confirmNutritionAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  jobPublicId: string;
  targetPatientMembershipId?: number | bigint | null;
  confirmedTitle?: string;
  confirmedMeals: ResolvedNutritionMeal[];
}): Promise<{
  planPublicId: string;
  versionPublicId: string;
  assignmentPublicId?: string;
}> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    jobPublicId,
    targetPatientMembershipId,
    confirmedTitle,
    confirmedMeals,
  } = params;

  // Validate at least one meal exists to form a valid draft
  if (!confirmedMeals || confirmedMeals.length === 0) {
    throw new Error("O plano alimentar precisa conter pelo menos uma refeição para ser salvo.");
  }

  const db = await getDbConnection();
  try {
    await db.beginTransaction();

    const [jobRows] = await db.query<RowDataPacket[]>(
      `SELECT id, status, created_plan_public_id, source_filename
       FROM ai_import_jobs
       WHERE public_id = ? AND consultancy_id = ? FOR UPDATE`,
      [jobPublicId, consultancyId]
    );

    if (jobRows.length === 0) {
      await db.rollback();
      throw new Error("Job de importação não encontrado nesta consultoria.");
    }

    if (jobRows[0].status === "CONFIRMED" && jobRows[0].created_plan_public_id) {
      await db.rollback();
      return {
        planPublicId: String(jobRows[0].created_plan_public_id),
        versionPublicId: "",
      };
    }

    const title = (confirmedTitle || "Plano Alimentar Importado com IA").trim();
    const planPublicId = crypto.randomUUID();
    const versionPublicId = crypto.randomUUID();

    // 1. Insert plan root
    const [pRes] = await db.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plans (
        public_id, consultancy_id, created_by_membership_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [planPublicId, consultancyId, memberId]
    );
    const planId = pRes.insertId;

    // 2. Insert draft version (version 1)
    const [vRes] = await db.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plan_versions (
        public_id, nutrition_plan_id, version_number, status, title,
        created_by_membership_id, created_at, updated_at
      ) VALUES (?, ?, 1, 'DRAFT', ?, ?, NOW(3), NOW(3))`,
      [versionPublicId, planId, title, memberId]
    );
    const versionId = vRes.insertId;

    let foodsCreated = 0;

    // 3. Insert meals and food items
    let mealSort = 0;
    for (const m of confirmedMeals) {
      mealSort++;
      const mealPublicId = crypto.randomUUID();
      const [mRes] = await db.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_meals (
          public_id, nutrition_plan_version_id, title, scheduled_time, sort_order, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [mealPublicId, versionId, m.name, m.time || null, mealSort, m.notes || null]
      );
      const mealId = mRes.insertId;

      let itemSort = 0;
      for (const f of m.foods) {
        itemSort++;
        foodsCreated++;
        const itemPublicId = crypto.randomUUID();

        let foodId: number | bigint | null = null;
        let displayName = f.foodNameSnapshot || f.foodNameCandidate;
        let cal: number | null = null;
        let p: number | null = null;
        let c: number | null = null;
        let fat: number | null = null;
        let refUnit = f.unitCandidate || "G";

        if (f.foodPublicId) {
          const [foodRows] = await db.query<RowDataPacket[]>(
            `SELECT
              id, public_id, COALESCE(display_name_pt_br, name) AS display_name,
              calories_kcal, protein_g, carbohydrate_g, fat_g, reference_amount, reference_unit_code
             FROM nutrition_v2_foods
             WHERE public_id = ? LIMIT 1`,
            [f.foodPublicId]
          );

          if (foodRows.length > 0) {
            const foodDb = foodRows[0];
            foodId = foodDb.id;
            displayName = String(foodDb.display_name);
            refUnit = String(foodDb.reference_unit_code || "G");

            if (f.quantity && f.quantity > 0) {
              const refAmount = Number(foodDb.reference_amount || 100);
              const factor = f.quantity / refAmount;
              cal = foodDb.calories_kcal !== null ? Math.round(Number(foodDb.calories_kcal) * factor * 10) / 10 : null;
              p = foodDb.protein_g !== null ? Math.round(Number(foodDb.protein_g) * factor * 10) / 10 : null;
              c = foodDb.carbohydrate_g !== null ? Math.round(Number(foodDb.carbohydrate_g) * factor * 10) / 10 : null;
              fat = foodDb.fat_g !== null ? Math.round(Number(foodDb.fat_g) * factor * 10) / 10 : null;
            }
          }
        }

        const [itemRes] = await db.query<ResultSetHeader>(
          `INSERT INTO nutrition_v2_meal_items (
            public_id, meal_id, food_id, sort_order, food_name_snapshot,
            prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
            calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot,
            fat_g_snapshot, micronutrients_snapshot_json, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(3), NOW(3))`,
          [
            itemPublicId,
            mealId,
            foodId,
            itemSort,
            displayName,
            f.quantity,
            f.unitCandidate || refUnit,
            f.unitCandidate || refUnit,
            cal,
            p,
            c,
            fat,
            f.notes || null,
          ]
        );
        const mealItemId = itemRes.insertId;

        // 3.1. Insert substitutions (alternativas / opções equivalentes "OU")
        if (Array.isArray(f.substitutions)) {
          let subSort = 0;
          for (const sub of f.substitutions) {
            subSort++;
            const subPublicId = crypto.randomUUID();
            let subFoodId: number | bigint | null = null;
            let subDisplayName = sub.foodNameSnapshot || sub.foodNameCandidate;
            let subCal: number | null = null;
            let subP: number | null = null;
            let subC: number | null = null;
            let subFat: number | null = null;
            let subUnit = sub.unitCandidate || "G";

            if (sub.foodPublicId) {
              const [sFoodRows] = await db.query<RowDataPacket[]>(
                `SELECT id, public_id, COALESCE(display_name_pt_br, name) AS display_name,
                  calories_kcal, protein_g, carbohydrate_g, fat_g, reference_amount, reference_unit_code
                 FROM nutrition_v2_foods WHERE public_id = ? LIMIT 1`,
                [sub.foodPublicId]
              );
              if (sFoodRows.length > 0) {
                const sDb = sFoodRows[0];
                subFoodId = sDb.id;
                subDisplayName = String(sDb.display_name);
                subUnit = String(sDb.reference_unit_code || "G");

                if (sub.quantity && sub.quantity > 0) {
                  const sFactor = sub.quantity / Number(sDb.reference_amount || 100);
                  subCal = sDb.calories_kcal !== null ? Math.round(Number(sDb.calories_kcal) * sFactor * 10) / 10 : null;
                  subP = sDb.protein_g !== null ? Math.round(Number(sDb.protein_g) * sFactor * 10) / 10 : null;
                  subC = sDb.carbohydrate_g !== null ? Math.round(Number(sDb.carbohydrate_g) * sFactor * 10) / 10 : null;
                  subFat = sDb.fat_g !== null ? Math.round(Number(sDb.fat_g) * sFactor * 10) / 10 : null;
                }
              }
            }

            await db.query(
              `INSERT INTO nutrition_v2_item_substitutions (
                public_id, meal_item_id, food_id, sort_order, food_name_snapshot,
                prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
                calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot,
                fat_g_snapshot, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
              [
                subPublicId,
                mealItemId,
                subFoodId,
                subSort,
                subDisplayName,
                sub.quantity,
                sub.unitCandidate || subUnit,
                sub.unitCandidate || subUnit,
                subCal,
                subP,
                subC,
                subFat,
                sub.notes || null,
              ]
            );
          }
        }
      }
    }

    // 4. Handle target patient candidate / optional context (does NOT publish or assign during import)
    let patientFullName: string | null = null;

    if (targetPatientMembershipId) {
      const [sRows] = await db.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
         WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND u.deleted_at IS NULL LIMIT 1`,
        [targetPatientMembershipId, consultancyId]
      );
      if (sRows.length === 0) {
        await db.rollback();
        throw new Error("Aluno/paciente selecionado não é válido ou não pertence a esta consultoria.");
      }
      patientFullName = String(sRows[0].full_name);
    }

    // 5. Update job status to CONFIRMED
    await db.query(
      `UPDATE ai_import_jobs
       SET status = 'CONFIRMED',
           created_plan_public_id = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [planPublicId, jobPublicId]
    );

    await db.commit();

    // 6. Record audit activity event
    const summary = patientFullName
      ? `importou com IA o plano alimentar "${title}" para ${patientFullName}`
      : `importou com IA o plano alimentar "${title}"`;

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_NUTRITION_IMPORT_CONFIRMED",
      module: "NUTRITION",
      resourceType: "NUTRITION_PLAN",
      resourcePublicId: planPublicId,
      subjectMembershipId: targetPatientMembershipId || null,
      summary,
      metadata: {
        importJobPublicId: jobPublicId,
        planPublicId,
        planTitle: title,
        mealsCount: confirmedMeals.length,
        foodsCreated,
        targetPatientName: patientFullName,
      },
    });

    return {
      planPublicId,
      versionPublicId,
      assignmentPublicId: undefined,
    };
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}
