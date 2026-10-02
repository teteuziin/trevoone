/**
 * TREVO ONE — NUTRITION V2 REFERENCE FOOD CATALOG AUTO-ENRICHMENT SERVICE
 *
 * Implements two-tier food library auto-enrichment:
 * 1. Active Food Library: TACO, GROWTH_SUPPLEMENTS, Consultancy custom foods, and promoted foods.
 * 2. Reference Food Catalog: IBGE POF 2008-2009, USDA Foundation, USDA FNDDS.
 *
 * Strict Principles:
 * - AI NEVER generates nutrients (calories, protein, carbs, fat, fiber). All values come 100% from reference sources.
 * - Auto-promotes high-confidence canonical foods into the active library on demand.
 * - Saves canonical aliases in nutrition_v2_food_aliases for instant subsequent local match (LOCAL_MATCHED).
 * - Avoids duplicate records: verifies source + source_uid and canonical equivalence.
 * - Resolves food-specific portion measures (e.g. 1 fatia = 25g -> 2 fatias = 50g) from real source portions.
 * - Preserves inherently ambiguous concepts (queijo, peixe, folhas, carne moída) as AMBIGUOUS / NEEDS_REVIEW.
 * - Never discards unpromoted/unmatched items (ITEM_DISCARDED: NEVER).
 */

import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { normalizeSearchText } from "./food-search";

export interface ReferenceCandidate {
  foodId: number | bigint;
  publicId: string;
  name: string;
  displayNamePtBr: string | null;
  sourceKey: string;
  sourceUid: string | null;
  sourceType: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  referenceAmount: number;
  referenceUnitCode: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  canonicalDisplayName: string;
  suggestedAliases: string[];
  portionEquivalentAmount?: number | null;
  portionLabel?: string | null;
}

export interface ReferenceCatalogSearchResult {
  status: "HIGH_CONFIDENCE_MATCH" | "AMBIGUOUS" | "NOT_FOUND";
  candidate?: ReferenceCandidate;
  candidates: ReferenceCandidate[];
}

// Inherently ambiguous food concepts that must NOT be auto-promoted without user clarification
export const INHERENTLY_AMBIGUOUS_CONCEPTS = new Set([
  "queijo",
  "peixe",
  "folhas",
  "salada de folhas",
  "salada de verduras",
  "carne de boi",
  "carne",
  "legumes",
  "verduras",
  "fruta",
  "frutas",
  "suco",
  "castanhas",
  "oleaginosas",
]);

// High-confidence canonical reference mapping specifications
export interface CanonicalReferenceSpec {
  queryMatch: (norm: string, clean: string) => boolean;
  sourceFilter: {
    sourceKey?: string;
    nameLike?: string;
    id?: number;
  };
  canonicalDisplayName: string;
  aliases: string[];
  defaultPortion?: {
    unitMatch: RegExp;
    label: string;
    equivalentReferenceAmount: number;
  };
}

export const CANONICAL_REFERENCE_SPECS: CanonicalReferenceSpec[] = [
  // 1. Pão de forma branco fatiado (IBGE POF: Pao de Forma Industrializado de Qualquer Marca)
  {
    queryMatch: (norm, clean) =>
      clean === "pao de forma" ||
      clean === "pao forma" ||
      clean === "pao fatiado" ||
      clean === "pao de forma branco" ||
      clean === "pao branco de forma" ||
      clean === "pao de forma tradicional" ||
      clean === "pao de forma fatiado",
    sourceFilter: {
      sourceKey: "IBGE_POF_2008_2009",
      nameLike: "%Pao de Forma Industrializado%",
    },
    canonicalDisplayName: "Pão de forma",
    aliases: [
      "pão de forma",
      "pão forma",
      "pao de forma",
      "pao forma",
      "pão fatiado",
      "pao fatiado",
      "pão branco fatiado",
      "pão de forma branco",
      "pão de forma tradicional",
    ],
    defaultPortion: {
      unitMatch: /fatia|fatias/i,
      label: "1 Fatia",
      equivalentReferenceAmount: 25.0,
    },
  },

  // 2. Queijo Cottage (USDA Foundation: Cheese, cottage, lowfat, 2% milkfat)
  {
    queryMatch: (norm, clean) =>
      clean === "queijo cottage" ||
      clean === "cottage" ||
      clean === "cottage cheese" ||
      clean === "queijo tipo cottage",
    sourceFilter: {
      sourceKey: "USDA_FOUNDATION",
      nameLike: "%Cottage%",
    },
    canonicalDisplayName: "Queijo cottage",
    aliases: ["queijo cottage", "cottage", "cottage cheese", "queijo tipo cottage"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 30.0,
    },
  },

  // 3. Pão integral (IBGE POF: Pao Integral)
  {
    queryMatch: (norm, clean) =>
      clean === "pao integral" ||
      clean === "pao de forma integral" ||
      clean === "pao forma integral",
    sourceFilter: {
      nameLike: "%Pao Integral%",
    },
    canonicalDisplayName: "Pão integral",
    aliases: ["pão integral", "pao integral", "pão de forma integral", "pao de forma integral"],
    defaultPortion: {
      unitMatch: /fatia|fatias/i,
      label: "1 Fatia",
      equivalentReferenceAmount: 25.0,
    },
  },

  // 4. Granola (IBGE POF: Granola)
  {
    queryMatch: (norm, clean) =>
      clean === "granola" ||
      clean === "granola tradicional" ||
      clean === "granola de cereais",
    sourceFilter: {
      sourceKey: "IBGE_POF_2008_2009",
      nameLike: "%Granola%",
    },
    canonicalDisplayName: "Granola",
    aliases: ["granola", "granola tradicional", "granola de cereais"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 15.0,
    },
  },

  // 5. Iogurte Grego (USDA Foundation: Yogurt, Greek, plain, whole milk)
  {
    queryMatch: (norm, clean) =>
      clean === "iogurte grego" ||
      clean === "iogurte grego natural" ||
      clean === "iogurte tipo grego" ||
      clean === "grego natural",
    sourceFilter: {
      sourceKey: "USDA_FOUNDATION",
      nameLike: "%Yogurt, Greek, plain, whole milk%",
    },
    canonicalDisplayName: "Iogurte grego natural",
    aliases: ["iogurte grego", "iogurte grego natural", "iogurte tipo grego", "grego natural"],
    defaultPortion: {
      unitMatch: /pote|unidade|copo/i,
      label: "1 Pote",
      equivalentReferenceAmount: 100.0,
    },
  },

  // 6. Arroz Parboilizado (IBGE POF: Arroz polido, Parboilizado)
  {
    queryMatch: (norm, clean) =>
      clean === "arroz parboilizado" ||
      clean === "arroz parboilizado cozido",
    sourceFilter: {
      sourceKey: "IBGE_POF_2008_2009",
      nameLike: "%Parboilizado%",
    },
    canonicalDisplayName: "Arroz parboilizado cozido",
    aliases: ["arroz parboilizado", "arroz parboilizado cozido"],
    defaultPortion: {
      unitMatch: /colher|colheres|concha|escumadeira/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 25.0,
    },
  },

  // 7. Pão Libanês / Sírio (USDA FNDDS: Bread, pita)
  {
    queryMatch: (norm, clean) =>
      clean === "pao libanes" ||
      clean === "pao sirio" ||
      clean === "pao pita" ||
      clean === "pita",
    sourceFilter: {
      sourceKey: "USDA_FNDDS",
      nameLike: "%Bread, pita%",
    },
    canonicalDisplayName: "Pão sírio (Pão libanês)",
    aliases: ["pão libanês", "pao libanes", "pão sírio", "pao sirio", "pão pita", "pao pita"],
    defaultPortion: {
      unitMatch: /unidade|fatia/i,
      label: "1 Unidade",
      equivalentReferenceAmount: 50.0,
    },
  },

  // 8. Macarrão de Arroz (USDA FNDDS: Rice noodles, cooked)
  {
    queryMatch: (norm, clean) =>
      clean === "macarrao de arroz" ||
      clean === "macarrao de arroz cozido" ||
      clean === "bifum" ||
      clean === "bifum cozido",
    sourceFilter: {
      sourceKey: "USDA_FNDDS",
      nameLike: "%Rice noodles, cooked%",
    },
    canonicalDisplayName: "Macarrão de arroz cozido",
    aliases: ["macarrão de arroz", "macarrao de arroz", "bifum", "bifum cozido"],
  },

  // 9. Moela de Frango (IBGE POF: Moela de Galinha ou Frango, cozido)
  {
    queryMatch: (norm, clean) =>
      clean === "moela de frango" ||
      clean === "moela de frango cozida" ||
      clean === "moela cozida" ||
      clean === "moela",
    sourceFilter: {
      sourceKey: "IBGE_POF_2008_2009",
      nameLike: "%Moela de Galinha ou Frango%",
    },
    canonicalDisplayName: "Moela de frango cozida",
    aliases: ["moela de frango", "moela de frango cozida", "moela cozida", "moela"],
  },

  // 10. Creme de Ricota / Ricota Cremosa (TACO: Queijo, ricota / IBGE POF: Queijo Ricota)
  {
    queryMatch: (norm, clean) =>
      clean === "creme de ricota" ||
      clean === "ricota cremosa" ||
      clean === "queijo creme de ricota",
    sourceFilter: {
      nameLike: "%Queijo, ricota%",
    },
    canonicalDisplayName: "Creme de ricota",
    aliases: ["creme de ricota", "ricota cremosa", "queijo creme de ricota"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 30.0,
    },
  },

  // 11. Gelatina de frutas / Gelatina sobremesa (USDA FNDDS 5813 / IBGE POF 6941)
  {
    queryMatch: (norm, clean) =>
      clean === "gelatina de frutas" ||
      clean === "gelatina com frutas" ||
      clean === "gelatina de fruta" ||
      clean === "gelatina sobremesa",
    sourceFilter: {
      nameLike: "%Gelatin dessert with fruit%",
    },
    canonicalDisplayName: "Gelatina de frutas",
    aliases: ["gelatina de frutas", "gelatina com frutas", "gelatina sobremesa com fruta"],
    defaultPortion: {
      unitMatch: /taca|porcao|pote|unidade/i,
      label: "1 Taça",
      equivalentReferenceAmount: 120.0,
    },
  },

  // 12. Filé de Frango (IBGE POF 7682: Frango, Peito, Filé, Sem Pele, Grelhado/cozido)
  {
    queryMatch: (norm, clean) =>
      clean === "file de frango" ||
      clean === "file frango" ||
      clean === "file de frango grelhado",
    sourceFilter: {
      nameLike: "%Frango, Peito, Filé, Sem Pele, Grelhado%",
    },
    canonicalDisplayName: "Filé de frango grelhado",
    aliases: ["file de frango", "file de peito de frango", "file de frango grelhado"],
    defaultPortion: {
      unitMatch: /file|bife|unidade/i,
      label: "1 Filé médio",
      equivalentReferenceAmount: 100.0,
    },
  },

  // 13. Purê de Batata (IBGE POF 7886: Purê de batata)
  {
    queryMatch: (norm, clean) => clean === "pure de batata" || clean === "pure de batatas",
    sourceFilter: {
      nameLike: "%Purê de batata%",
    },
    canonicalDisplayName: "Purê de batata",
    aliases: ["pure de batata", "pure de batatas"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 30.0,
    },
  },

  // 14. Fígado Bovino (IBGE POF 7635: Fígado bovino)
  {
    queryMatch: (norm, clean) =>
      clean === "figado bovino" ||
      clean === "figado bovino grelhado" ||
      clean === "figado",
    sourceFilter: {
      nameLike: "%Fígado bovino%",
    },
    canonicalDisplayName: "Fígado bovino grelhado",
    aliases: ["figado bovino", "bife de figado", "figado bovino grelhado"],
    defaultPortion: {
      unitMatch: /bife|unidade/i,
      label: "1 Bife pequeno",
      equivalentReferenceAmount: 100.0,
    },
  },

  // 15. Filé Suíno / Lombo Suíno (IBGE POF 7660: Lombo/filé suíno)
  {
    queryMatch: (norm, clean) =>
      clean === "file suino" ||
      clean === "lombo suino" ||
      clean === "file mignon suino",
    sourceFilter: {
      nameLike: "%Lombo/filé suíno%",
    },
    canonicalDisplayName: "Filé suíno grelhado",
    aliases: ["file suino", "lombo suino", "file mignon suino"],
    defaultPortion: {
      unitMatch: /bife|file|unidade/i,
      label: "1 Bife médio",
      equivalentReferenceAmount: 100.0,
    },
  },

  // 16. Doce de Leite (IBGE POF 7306: Doce de leite)
  {
    queryMatch: (norm, clean) => clean === "doce de leite" || clean === "doce de leite pastoso",
    sourceFilter: {
      nameLike: "%Doce de leite%",
    },
    canonicalDisplayName: "Doce de leite",
    aliases: ["doce de leite", "doce de leite pastoso"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 20.0,
    },
  },

  // 17. Chia / Semente de Chia (USDA Foundation: Chia seeds, dry, raw)
  {
    queryMatch: (norm, clean) =>
      clean === "chia" ||
      clean === "semente de chia" ||
      clean === "sementes de chia",
    sourceFilter: {
      sourceKey: "USDA_FOUNDATION",
      nameLike: "%Chia seeds, dry, raw%",
    },
    canonicalDisplayName: "Semente de chia",
    aliases: ["chia", "semente de chia", "sementes de chia"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 15.0,
    },
  },

  // 18. Linhaça / Semente de Linhaça (TACO: Linhaça, semente)
  {
    queryMatch: (norm, clean) =>
      clean === "linhaca" ||
      clean === "semente de linhaca" ||
      clean === "sementes de linhaca",
    sourceFilter: {
      nameLike: "%Linhaça, semente%",
    },
    canonicalDisplayName: "Semente de linhaça",
    aliases: ["linhaça", "linhaca", "semente de linhaça", "semente de linhaca"],
    defaultPortion: {
      unitMatch: /colher|colheres/i,
      label: "1 Colher de sopa",
      equivalentReferenceAmount: 15.0,
    },
  },

  // 19. Cuscuz de milho (TACO: Cuscuz, de milho, cozido com sal)
  {
    queryMatch: (norm, clean) =>
      clean === "cuscuz" ||
      clean === "cuscuz de milho" ||
      clean === "cuscuz cozido",
    sourceFilter: {
      nameLike: "%Cuscuz, de milho%",
    },
    canonicalDisplayName: "Cuscuz de milho cozido",
    aliases: ["cuscuz", "cuscuz de milho", "cuscuz cozido"],
    defaultPortion: {
      unitMatch: /colher|colheres|pedaco|fatia/i,
      label: "1 Pedaço médio",
      equivalentReferenceAmount: 80.0,
    },
  },

  // 20. Maçã com casca (TACO: Maçã, Argentina, com casca, crua)
  {
    queryMatch: (norm, clean) =>
      clean === "maca" ||
      clean === "maca gala" ||
      clean === "maca fuji" ||
      clean === "maca argentina" ||
      clean === "maca com casca",
    sourceFilter: {
      nameLike: "%Maçã, Argentina%",
    },
    canonicalDisplayName: "Maçã com casca",
    aliases: ["maçã", "maca", "maçã gala", "maçã fuji", "maçã argentina"],
    defaultPortion: {
      unitMatch: /unidade|unid/i,
      label: "1 Unidade média",
      equivalentReferenceAmount: 130.0,
    },
  },

  // 21. Batata-doce cozida (TACO: Batata, doce, cozida)
  {
    queryMatch: (norm, clean) =>
      clean === "batata doce" ||
      clean === "batata doce cozida",
    sourceFilter: {
      nameLike: "%Batata, doce, cozida%",
    },
    canonicalDisplayName: "Batata-doce cozida",
    aliases: ["batata doce", "batata-doce", "batata doce cozida", "batata-doce cozida"],
    defaultPortion: {
      unitMatch: /unidade|pedaco|fatia/i,
      label: "1 Pedaço médio",
      equivalentReferenceAmount: 100.0,
    },
  },
];

/**
 * Searches the Reference Food Catalog (IBGE POF, USDA Foundation, USDA FNDDS, unpromoted foods)
 * for a reliable, authoritative nutritional match.
 */
export async function searchReferenceCatalogCandidate(
  candidateName: string
): Promise<ReferenceCatalogSearchResult> {
  const normCandidate = normalizeSearchText(candidateName);
  if (!normCandidate) {
    return { status: "NOT_FOUND", candidates: [] };
  }
  const cleanCandidate = normCandidate.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // Guard: Inherently ambiguous concepts MUST stay AMBIGUOUS without forced auto-guess
  if (INHERENTLY_AMBIGUOUS_CONCEPTS.has(cleanCandidate) || INHERENTLY_AMBIGUOUS_CONCEPTS.has(normCandidate)) {
    const dbAmb = await getDbConnection();
    try {
      const [ambRows] = await dbAmb.query<RowDataPacket[]>(
        `SELECT
          f.id, f.public_id, f.name, f.display_name_pt_br, f.source_key, f.source_uid, f.source_type,
          f.calories_kcal, f.protein_g, f.carbohydrate_g, f.fat_g, f.fiber_g,
          f.reference_amount, f.reference_unit_code
         FROM nutrition_v2_foods f
         WHERE f.status = 'ACTIVE'
           AND f.deleted_at IS NULL
           AND (f.normalized_name LIKE ? OR f.normalized_display_name_pt_br LIKE ?)
         LIMIT 10`,
        [`%${cleanCandidate}%`, `%${cleanCandidate}%`]
      );

      const mapped = ambRows.map((r) => ({
        foodId: r.id,
        publicId: String(r.public_id),
        name: String(r.name),
        displayNamePtBr: r.display_name_pt_br ? String(r.display_name_pt_br) : null,
        sourceKey: String(r.source_key),
        sourceUid: r.source_uid ? String(r.source_uid) : null,
        sourceType: String(r.source_type),
        caloriesKcal: r.calories_kcal != null ? Number(r.calories_kcal) : null,
        proteinG: r.protein_g != null ? Number(r.protein_g) : null,
        carbohydrateG: r.carbohydrate_g != null ? Number(r.carbohydrate_g) : null,
        fatG: r.fat_g != null ? Number(r.fat_g) : null,
        fiberG: r.fiber_g != null ? Number(r.fiber_g) : null,
        referenceAmount: Number(r.reference_amount || 100),
        referenceUnitCode: String(r.reference_unit_code || "G"),
        confidence: "MEDIUM" as const,
        canonicalDisplayName: String(r.display_name_pt_br || r.name),
        suggestedAliases: [],
      }));

      return {
        status: "AMBIGUOUS",
        candidates: mapped,
      };
    } finally {
      dbAmb.release();
    }
  }

  // Check predefined canonical high-confidence specifications
  const matchedSpec = CANONICAL_REFERENCE_SPECS.find((spec) =>
    spec.queryMatch(normCandidate, cleanCandidate)
  );

  const db = await getDbConnection();
  try {
    if (matchedSpec) {
      let querySql = `
        SELECT
          f.id, f.public_id, f.name, f.display_name_pt_br, f.source_key, f.source_uid, f.source_type,
          f.calories_kcal, f.protein_g, f.carbohydrate_g, f.fat_g, f.fiber_g,
          f.reference_amount, f.reference_unit_code,
          p.equivalent_reference_amount AS portion_equiv,
          p.label AS portion_label
        FROM nutrition_v2_foods f
        LEFT JOIN nutrition_v2_food_portions p
          ON p.food_id = f.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
        WHERE f.status = 'ACTIVE' AND f.deleted_at IS NULL
      `;
      const params: (string | number)[] = [];

      if (matchedSpec.sourceFilter.sourceKey) {
        querySql += " AND f.source_key = ?";
        params.push(matchedSpec.sourceFilter.sourceKey);
      }
      if (matchedSpec.sourceFilter.nameLike) {
        querySql += " AND (f.name LIKE ? OR f.display_name_pt_br LIKE ?)";
        params.push(matchedSpec.sourceFilter.nameLike, matchedSpec.sourceFilter.nameLike);
      } else if (matchedSpec.sourceFilter.id) {
        querySql += " AND f.id = ?";
        params.push(matchedSpec.sourceFilter.id);
      }
      querySql += " LIMIT 1";

      const [rows] = await db.query<RowDataPacket[]>(querySql, params);
      if (rows.length > 0) {
        const r = rows[0];
        const candidate: ReferenceCandidate = {
          foodId: r.id,
          publicId: String(r.public_id),
          name: String(r.name),
          displayNamePtBr: r.display_name_pt_br ? String(r.display_name_pt_br) : null,
          sourceKey: String(r.source_key),
          sourceUid: r.source_uid ? String(r.source_uid) : null,
          sourceType: String(r.source_type),
          caloriesKcal: r.calories_kcal != null ? Number(r.calories_kcal) : null,
          proteinG: r.protein_g != null ? Number(r.protein_g) : null,
          carbohydrateG: r.carbohydrate_g != null ? Number(r.carbohydrate_g) : null,
          fatG: r.fat_g != null ? Number(r.fat_g) : null,
          fiberG: r.fiber_g != null ? Number(r.fiber_g) : null,
          referenceAmount: Number(r.reference_amount || 100),
          referenceUnitCode: String(r.reference_unit_code || "G"),
          confidence: "HIGH",
          canonicalDisplayName: matchedSpec.canonicalDisplayName,
          suggestedAliases: matchedSpec.aliases,
          portionEquivalentAmount:
            r.portion_equiv != null
              ? Number(r.portion_equiv)
              : matchedSpec.defaultPortion?.equivalentReferenceAmount ?? null,
          portionLabel: r.portion_label ? String(r.portion_label) : matchedSpec.defaultPortion?.label ?? null,
        };

        return {
          status: "HIGH_CONFIDENCE_MATCH",
          candidate,
          candidates: [candidate],
        };
      }
    }

    // Dynamic Reference Catalog Search across IBGE POF and USDA
    const [dynamicRows] = await db.query<RowDataPacket[]>(
      `SELECT
        f.id, f.public_id, f.name, f.display_name_pt_br, f.source_key, f.source_uid, f.source_type,
        f.calories_kcal, f.protein_g, f.carbohydrate_g, f.fat_g, f.fiber_g,
        f.reference_amount, f.reference_unit_code
       FROM nutrition_v2_foods f
       WHERE f.status = 'ACTIVE'
         AND f.deleted_at IS NULL
         AND f.source_key IN ('IBGE_POF_2008_2009', 'USDA_FOUNDATION', 'USDA_FNDDS', 'TACO')
         AND (
           f.normalized_name LIKE ?
           OR f.normalized_display_name_pt_br LIKE ?
           OR f.name LIKE ?
           OR f.display_name_pt_br LIKE ?
         )
       ORDER BY
         CASE
           WHEN f.source_key = 'IBGE_POF_2008_2009' THEN 1
           WHEN f.source_key = 'TACO' THEN 2
           WHEN f.source_key = 'USDA_FOUNDATION' THEN 3
           ELSE 4
         END ASC,
         CHAR_LENGTH(COALESCE(f.display_name_pt_br, f.name)) ASC
       LIMIT 5`,
      [
        `%${cleanCandidate}%`,
        `%${cleanCandidate}%`,
        `%${cleanCandidate}%`,
        `%${cleanCandidate}%`,
      ]
    );

    if (dynamicRows.length === 0) {
      return { status: "NOT_FOUND", candidates: [] };
    }

    const mappedCandidates: ReferenceCandidate[] = dynamicRows.map((r) => {
      const isExactOrStartsWith =
        normalizeSearchText(String(r.display_name_pt_br || r.name)).startsWith(cleanCandidate) ||
        normalizeSearchText(String(r.name)).startsWith(cleanCandidate);

      return {
        foodId: r.id,
        publicId: String(r.public_id),
        name: String(r.name),
        displayNamePtBr: r.display_name_pt_br ? String(r.display_name_pt_br) : null,
        sourceKey: String(r.source_key),
        sourceUid: r.source_uid ? String(r.source_uid) : null,
        sourceType: String(r.source_type),
        caloriesKcal: r.calories_kcal != null ? Number(r.calories_kcal) : null,
        proteinG: r.protein_g != null ? Number(r.protein_g) : null,
        carbohydrateG: r.carbohydrate_g != null ? Number(r.carbohydrate_g) : null,
        fatG: r.fat_g != null ? Number(r.fat_g) : null,
        fiberG: r.fiber_g != null ? Number(r.fiber_g) : null,
        referenceAmount: Number(r.reference_amount || 100),
        referenceUnitCode: String(r.reference_unit_code || "G"),
        confidence: isExactOrStartsWith && dynamicRows.length === 1 ? "HIGH" : "MEDIUM",
        canonicalDisplayName: String(r.display_name_pt_br || r.name),
        suggestedAliases: [cleanCandidate, normCandidate],
      };
    });

    // If an exact name match exists in the reference catalog (e.g. IBGE POF "Banana", "Cuscuz", "Tomate", "Pepino", "Manga", "Laranja", "Tangerina")
    const exactMatch = mappedCandidates.find((c) => {
      const cNorm = normalizeSearchText(c.displayNamePtBr || c.name);
      return cNorm === cleanCandidate;
    });
    if (exactMatch && !INHERENTLY_AMBIGUOUS_CONCEPTS.has(cleanCandidate)) {
      exactMatch.confidence = "HIGH";
      return {
        status: "HIGH_CONFIDENCE_MATCH",
        candidate: exactMatch,
        candidates: [exactMatch],
      };
    }

    if (mappedCandidates.length === 1 && mappedCandidates[0].confidence === "HIGH") {
      return {
        status: "HIGH_CONFIDENCE_MATCH",
        candidate: mappedCandidates[0],
        candidates: mappedCandidates,
      };
    }

    return {
      status: "AMBIGUOUS",
      candidates: mappedCandidates,
    };
  } finally {
    db.release();
  }
}

/**
 * Promotes a reference catalog food into the Active Food Library.
 * Updates auto_imported_from_reference = 1, sets canonical display name,
 * and saves canonical aliases into nutrition_v2_food_aliases.
 * Idempotent: safe to run multiple times with no duplicate records.
 */
export async function autoPromoteReferenceFood(
  candidate: ReferenceCandidate
): Promise<{
  success: boolean;
  foodId: number | bigint;
  publicId: string;
  displayName: string;
  sourceKey: string;
  sourceUid: string | null;
}> {
  const db = await getDbConnection();
  try {
    await db.beginTransaction();

    const canonicalName = candidate.canonicalDisplayName || candidate.name;
    const normalizedName = normalizeSearchText(canonicalName);

    // 1. Update the food record in nutrition_v2_foods to mark it as auto-imported and active
    await db.query(
      `UPDATE nutrition_v2_foods
       SET auto_imported_from_reference = 1,
           display_name_pt_br = ?,
           normalized_display_name_pt_br = ?,
           last_verified_at = NOW(3),
           updated_at = NOW(3)
       WHERE id = ?`,
      [canonicalName, normalizedName, candidate.foodId]
    );

    // 2. Insert canonical aliases into nutrition_v2_food_aliases
    const aliasesToRegister = new Set<string>();
    if (candidate.canonicalDisplayName) {
      aliasesToRegister.add(candidate.canonicalDisplayName);
    }
    if (candidate.suggestedAliases && Array.isArray(candidate.suggestedAliases)) {
      for (const a of candidate.suggestedAliases) {
        if (a && a.trim().length >= 2) {
          aliasesToRegister.add(a.trim());
        }
      }
    }

    for (const aliasText of aliasesToRegister) {
      const normAlias = normalizeSearchText(aliasText);
      if (!normAlias) continue;

      await db.query(
        `INSERT INTO nutrition_v2_food_aliases (
          food_id, alias, normalized_alias, confidence, created_at, updated_at
        ) VALUES (?, ?, ?, 'HIGH', NOW(3), NOW(3))
        ON DUPLICATE KEY UPDATE
          alias = VALUES(alias),
          updated_at = NOW(3)`,
        [candidate.foodId, aliasText, normAlias]
      );
    }

    // 3. Ensure portion is saved if spec provided one and no active portion exists
    if (candidate.portionLabel && candidate.portionEquivalentAmount) {
      const [existingPortions] = await db.query<RowDataPacket[]>(
        `SELECT id FROM nutrition_v2_food_portions
         WHERE food_id = ? AND label = ? AND deleted_at IS NULL LIMIT 1`,
        [candidate.foodId, candidate.portionLabel]
      );

      if (existingPortions.length === 0) {
        const portionPublicId = crypto.randomUUID();
        await db.query(
          `INSERT INTO nutrition_v2_food_portions (
            public_id, food_id, label, equivalent_reference_amount, sort_order, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 1, 'ACTIVE', NOW(3), NOW(3))`,
          [portionPublicId, candidate.foodId, candidate.portionLabel, candidate.portionEquivalentAmount]
        );
      }
    }

    await db.commit();

    return {
      success: true,
      foodId: candidate.foodId,
      publicId: candidate.publicId,
      displayName: canonicalName,
      sourceKey: candidate.sourceKey,
      sourceUid: candidate.sourceUid,
    };
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}
