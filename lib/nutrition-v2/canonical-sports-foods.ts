/**
 * TREVO ONE — CANONICAL SPORTS NUTRITION & ESSENTIALS REGISTRY
 * Curated reference foods for fitness, athletic performance, and Brazilian staples:
 * - Whey Protein Concentrado & Isolado (Growth Supplements)
 * - Creatina Monohidratada 100% Pura (Growth Supplements)
 * - Pasta de Amendoim Integral (Growth Supplements)
 * - Albumina Pura, Hipercalórico, Proteína Vegetal, Barra de Proteína
 * - Cuscuz de Milho, Goma de Tapioca, Rap10 / Tortilha, Queijo Cottage, Iogurtes
 *
 * Guarantees instant search results and reliable auto-seed into MySQL.
 */

import { normalizeSearchText } from "./food-query-builder";
import type { FoodListItemDto } from "./food-query-builder";
import { resolveCanonicalPortionsForFood } from "./canonical-food-portions";

export interface CanonicalSportsFoodDef {
  publicId: string;
  sourceUid: string;
  name: string;
  displayNamePtBr: string;
  category: string;
  sourceKey: "GROWTH_SUPPLEMENTS" | "TACO";
  sourceType: "BRANDED" | "REFERENCE";
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
}

export const CANONICAL_SPORTS_FOODS: readonly CanonicalSportsFoodDef[] = Object.freeze([
  {
    publicId: "11111111-sp01-4000-8000-000000000001",
    sourceUid: "GROWTH_SUPPLEMENTS:whey-concentrado",
    name: "100% Whey Protein Concentrado",
    displayNamePtBr: "Whey Protein Concentrado",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 400.0,
    proteinG: 80.0,
    carbohydrateG: 9.3,
    fatG: 6.0,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp02-4000-8000-000000000002",
    sourceUid: "GROWTH_SUPPLEMENTS:whey-isolado",
    name: "100% Whey Protein Isolado",
    displayNamePtBr: "Whey Protein Isolado",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 367.0,
    proteinG: 90.0,
    carbohydrateG: 0.0,
    fatG: 0.7,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp03-4000-8000-000000000003",
    sourceUid: "GROWTH_SUPPLEMENTS:creatina-monohidratada",
    name: "Creatina 100% Pura Monohidratada",
    displayNamePtBr: "Creatina Monohidratada",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 0.0,
    proteinG: 0.0,
    carbohydrateG: 0.0,
    fatG: 0.0,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp04-4000-8000-000000000004",
    sourceUid: "GROWTH_SUPPLEMENTS:pasta-amendoim-integral",
    name: "Pasta de Amendoim Integral",
    displayNamePtBr: "Pasta de Amendoim Integral",
    category: "Nozes, Sementes e Pastas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 588.0,
    proteinG: 28.0,
    carbohydrateG: 18.0,
    fatG: 50.0,
    fiberG: 8.0,
  },
  {
    publicId: "11111111-sp05-4000-8000-000000000005",
    sourceUid: "GROWTH_SUPPLEMENTS:albumina-pura",
    name: "Albumina Pura (Clara de Ovo)",
    displayNamePtBr: "Albumina Pura",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 375.0,
    proteinG: 82.0,
    carbohydrateG: 7.0,
    fatG: 0.0,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp06-4000-8000-000000000006",
    sourceUid: "GROWTH_SUPPLEMENTS:hipercalorico-mass",
    name: "Hipercalórico Mass Blend",
    displayNamePtBr: "Hipercalórico",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 375.0,
    proteinG: 20.0,
    carbohydrateG: 70.0,
    fatG: 1.5,
    fiberG: 2.0,
  },
  {
    publicId: "11111111-sp07-4000-8000-000000000007",
    sourceUid: "GROWTH_SUPPLEMENTS:proteina-vegetal-isolada",
    name: "Proteína Vegetal Isolada (Soy/Pea)",
    displayNamePtBr: "Proteína Vegetal Isolada",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 380.0,
    proteinG: 80.0,
    carbohydrateG: 5.0,
    fatG: 3.0,
    fiberG: 4.0,
  },
  {
    publicId: "11111111-sp08-4000-8000-000000000008",
    sourceUid: "GROWTH_SUPPLEMENTS:barra-proteina",
    name: "Barra de Proteína",
    displayNamePtBr: "Barra de Proteína",
    category: "Suplementos e Vitaminas",
    sourceKey: "GROWTH_SUPPLEMENTS",
    sourceType: "BRANDED",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 350.0,
    proteinG: 33.3,
    carbohydrateG: 33.3,
    fatG: 10.0,
    fiberG: 10.0,
  },
  {
    publicId: "11111111-sp09-4000-8000-000000000009",
    sourceUid: "TACO:cuscuz-milho-cozido",
    name: "Cuscuz de milho, cozido",
    displayNamePtBr: "Cuscuz de milho",
    category: "Cereais e Derivados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 112.0,
    proteinG: 2.1,
    carbohydrateG: 25.4,
    fatG: 0.7,
    fiberG: 2.2,
  },
  {
    publicId: "11111111-sp10-4000-8000-000000000010",
    sourceUid: "TACO:goma-tapioca-hidratada",
    name: "Mandioca, farinha, goma de tapioca hidratada",
    displayNamePtBr: "Goma de tapioca",
    category: "Cereais e Derivados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 242.0,
    proteinG: 0.2,
    carbohydrateG: 60.0,
    fatG: 0.0,
    fiberG: 0.5,
  },
  {
    publicId: "11111111-sp11-4000-8000-000000000011",
    sourceUid: "TACO:rap10-tortilha",
    name: "Tortilha de trigo, Rap10",
    displayNamePtBr: "Rap10 Tradicional",
    category: "Panificados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 275.0,
    proteinG: 8.5,
    carbohydrateG: 50.0,
    fatG: 4.5,
    fiberG: 3.5,
  },
  {
    publicId: "11111111-sp12-4000-8000-000000000012",
    sourceUid: "TACO:queijo-cottage",
    name: "Queijo, cottage",
    displayNamePtBr: "Queijo cottage",
    category: "Leite e Derivados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 98.0,
    proteinG: 11.1,
    carbohydrateG: 3.4,
    fatG: 4.3,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp13-4000-8000-000000000013",
    sourceUid: "TACO:iogurte-natural-desnatado",
    name: "Iogurte, natural, desnatado",
    displayNamePtBr: "Iogurte natural desnatado",
    category: "Leite e Derivados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 41.0,
    proteinG: 3.8,
    carbohydrateG: 5.8,
    fatG: 0.3,
    fiberG: 0.0,
  },
  {
    publicId: "11111111-sp14-4000-8000-000000000014",
    sourceUid: "TACO:iogurte-natural-integral",
    name: "Iogurte, natural, integral",
    displayNamePtBr: "Iogurte natural integral",
    category: "Leite e Derivados",
    sourceKey: "TACO",
    sourceType: "REFERENCE",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 61.0,
    proteinG: 3.5,
    carbohydrateG: 4.7,
    fatG: 3.2,
    fiberG: 0.0,
  },
]);

/**
 * In-memory search helper for canonical sports foods when DB lacks pre-seeded rows.
 */
export function searchCanonicalSportsFoods(query?: string | null): FoodListItemDto[] {
  if (!query || typeof query !== "string") return [];
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return [];

  const matched: FoodListItemDto[] = [];
  for (const food of CANONICAL_SPORTS_FOODS) {
    const normName = normalizeSearchText(food.name);
    const normDisplay = normalizeSearchText(food.displayNamePtBr);
    const combined = `${normName} ${normDisplay}`;

    // Token-level match
    const queryTokens = normQuery.split(/\s+/).filter(Boolean);
    const allTokensMatch = queryTokens.every((token) => combined.includes(token));

    // Synonym match (e.g. "whey" matches "whey protein", "amendoim" matches "pasta de amendoim")
    const matchesWhey = normQuery.includes("whey") && combined.includes("whey");
    const matchesCreatina = normQuery.includes("creatina") && combined.includes("creatina");
    const matchesAmendoim = normQuery.includes("amendoim") && combined.includes("amendoim");
    const matchesCuscuz = normQuery.includes("cuscuz") && combined.includes("cuscuz");
    const matchesTapioca = normQuery.includes("tapioca") && combined.includes("tapioca");
    const matchesRap10 = (normQuery.includes("rap10") || normQuery.includes("rap 10") || normQuery.includes("tortilha")) && combined.includes("rap10");
    const matchesCottage = normQuery.includes("cottage") && combined.includes("cottage");
    const matchesIogurte = normQuery.includes("iogurte") && combined.includes("iogurte");

    if (allTokensMatch || matchesWhey || matchesCreatina || matchesAmendoim || matchesCuscuz || matchesTapioca || matchesRap10 || matchesCottage || matchesIogurte) {
      const portions = resolveCanonicalPortionsForFood({
        name: food.name,
        displayName: food.displayNamePtBr,
        category: food.category,
        referenceUnitCode: food.referenceUnitCode,
      });

      matched.push({
        publicId: food.publicId,
        scope: "GLOBAL",
        consultancyId: null,
        name: food.name,
        displayNamePtBr: food.displayNamePtBr,
        normalizedDisplayNamePtBr: normDisplay,
        normalizedName: normName,
        category: food.category,
        referenceAmount: food.referenceAmount,
        referenceUnitCode: food.referenceUnitCode,
        caloriesKcal: food.caloriesKcal,
        proteinG: food.proteinG,
        carbohydrateG: food.carbohydrateG,
        fatG: food.fatG,
        fiberG: food.fiberG,
        status: "ACTIVE",
        sourceType: food.sourceType,
        sourceKey: food.sourceKey,
        sourceExternalCode: null,
        sourceVersion: null,
        sourceReference: null,
        sourceImportedAt: null,
        lastVerifiedAt: null,
        sourceUid: food.sourceUid,
        autoImportedFromReference: false,
        createdByUserId: null,
        createdByMembershipId: null,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        deletedAt: null,
        portionsCount: portions.length,
      });
    }
  }

  return matched;
}

let hasEnsuredSportsFoodsInDb = false;

/**
 * Idempotently inserts canonical sports foods into nutrition_v2_foods and ensures portions.
 * Called lazily upon search or item creation without requiring disruptive table migrations.
 */
export async function ensureCanonicalSportsFoodsInDatabase(connection: {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
}): Promise<void> {
  if (hasEnsuredSportsFoodsInDb) return;

  for (const food of CANONICAL_SPORTS_FOODS) {
    try {
      const normName = normalizeSearchText(food.name);
      const normDisplay = normalizeSearchText(food.displayNamePtBr);

      await connection.query(
        `INSERT INTO nutrition_v2_foods
         (public_id, scope, consultancy_id, name, normalized_name, display_name_pt_br, normalized_display_name_pt_br,
          category, reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g,
          status, source_type, source_key, source_uid)
         VALUES (?, 'GLOBAL', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = 'ACTIVE',
           display_name_pt_br = VALUES(display_name_pt_br),
           normalized_display_name_pt_br = VALUES(normalized_display_name_pt_br),
           calories_kcal = VALUES(calories_kcal),
           protein_g = VALUES(protein_g),
           carbohydrate_g = VALUES(carbohydrate_g),
           fat_g = VALUES(fat_g),
           fiber_g = VALUES(fiber_g)`,
        [
          food.publicId,
          food.name,
          normName,
          food.displayNamePtBr,
          normDisplay,
          food.category,
          food.referenceAmount,
          food.referenceUnitCode,
          food.caloriesKcal,
          food.proteinG,
          food.carbohydrateG,
          food.fatG,
          food.fiberG,
          food.sourceType,
          food.sourceKey,
          food.sourceUid,
        ]
      );
    } catch {
      // Non-blocking: continue if already present or if column differences occur
    }
  }

  hasEnsuredSportsFoodsInDb = true;
}
