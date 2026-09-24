/**
 * TREVO ONE — NUTRITION V2 CANONICAL MICRONUTRIENTS
 * Authoritative canonical definitions, typed contracts, USDA nutrient mapping,
 * and immutable snapshot builders for Release E.
 */

export type MicronutrientCategory = "MACRO_SUB" | "MINERAL" | "VITAMIN" | "OTHER";

export type FoodNutrientStatus = "KNOWN" | "KNOWN_ZERO" | "TRACE";

export type MicronutrientStatus = "KNOWN" | "KNOWN_ZERO" | "TRACE" | "UNKNOWN";

export interface CanonicalNutrientDefinition {
  code: string;
  namePtBr: string;
  unit: string;
  category: MicronutrientCategory;
  sortOrder: number;
  usdaNutrientNumber: string;
}

export const CANONICAL_NUTRIENTS: readonly CanonicalNutrientDefinition[] = Object.freeze([
  { code: "FIBER", namePtBr: "Fibra Alimentar", unit: "g", category: "MACRO_SUB", sortOrder: 10, usdaNutrientNumber: "291" },
  { code: "CA", namePtBr: "Cálcio", unit: "mg", category: "MINERAL", sortOrder: 20, usdaNutrientNumber: "301" },
  { code: "FE", namePtBr: "Ferro", unit: "mg", category: "MINERAL", sortOrder: 30, usdaNutrientNumber: "303" },
  { code: "MG", namePtBr: "Magnésio", unit: "mg", category: "MINERAL", sortOrder: 40, usdaNutrientNumber: "304" },
  { code: "P", namePtBr: "Fósforo", unit: "mg", category: "MINERAL", sortOrder: 50, usdaNutrientNumber: "305" },
  { code: "K", namePtBr: "Potássio", unit: "mg", category: "MINERAL", sortOrder: 60, usdaNutrientNumber: "306" },
  { code: "NA", namePtBr: "Sódio", unit: "mg", category: "MINERAL", sortOrder: 70, usdaNutrientNumber: "307" },
  { code: "ZN", namePtBr: "Zinco", unit: "mg", category: "MINERAL", sortOrder: 80, usdaNutrientNumber: "309" },
  { code: "CU", namePtBr: "Cobre", unit: "mg", category: "MINERAL", sortOrder: 90, usdaNutrientNumber: "312" },
  { code: "MN", namePtBr: "Manganês", unit: "mg", category: "MINERAL", sortOrder: 100, usdaNutrientNumber: "315" },
  { code: "SE", namePtBr: "Selênio", unit: "mcg", category: "MINERAL", sortOrder: 110, usdaNutrientNumber: "317" },
  { code: "VIT_A", namePtBr: "Vitamina A (RAE)", unit: "mcg", category: "VITAMIN", sortOrder: 120, usdaNutrientNumber: "320" },
  { code: "VIT_C", namePtBr: "Vitamina C", unit: "mg", category: "VITAMIN", sortOrder: 130, usdaNutrientNumber: "401" },
  { code: "VIT_D", namePtBr: "Vitamina D", unit: "mcg", category: "VITAMIN", sortOrder: 140, usdaNutrientNumber: "328" },
  { code: "VIT_E", namePtBr: "Vitamina E", unit: "mg", category: "VITAMIN", sortOrder: 150, usdaNutrientNumber: "323" },
  { code: "VIT_K", namePtBr: "Vitamina K", unit: "mcg", category: "VITAMIN", sortOrder: 160, usdaNutrientNumber: "430" },
  { code: "VIT_B1", namePtBr: "Vitamina B1 (Tiamina)", unit: "mg", category: "VITAMIN", sortOrder: 170, usdaNutrientNumber: "404" },
  { code: "VIT_B2", namePtBr: "Vitamina B2 (Riboflavina)", unit: "mg", category: "VITAMIN", sortOrder: 180, usdaNutrientNumber: "405" },
  { code: "VIT_B3", namePtBr: "Vitamina B3 (Niacina)", unit: "mg", category: "VITAMIN", sortOrder: 190, usdaNutrientNumber: "406" },
  { code: "VIT_B5", namePtBr: "Vitamina B5 (Ácido Pantotênico)", unit: "mg", category: "VITAMIN", sortOrder: 200, usdaNutrientNumber: "410" },
  { code: "VIT_B6", namePtBr: "Vitamina B6", unit: "mg", category: "VITAMIN", sortOrder: 210, usdaNutrientNumber: "415" },
  { code: "FOLATE", namePtBr: "Folato Total", unit: "mcg", category: "VITAMIN", sortOrder: 220, usdaNutrientNumber: "417" },
  { code: "VIT_B12", namePtBr: "Vitamina B12", unit: "mcg", category: "VITAMIN", sortOrder: 230, usdaNutrientNumber: "418" },
]);

export const CANONICAL_NUTRIENTS_BY_CODE = Object.freeze(
  new Map(CANONICAL_NUTRIENTS.map((n) => [n.code, n]))
);

export const USDA_NUMBER_TO_CANONICAL_CODE = Object.freeze(
  new Map(CANONICAL_NUTRIENTS.map((n) => [n.usdaNutrientNumber, n.code]))
);

export interface MicronutrientSnapshotItem {
  code: string;
  value: number | null;
  unit: string;
  status: MicronutrientStatus;
}

export interface MicronutrientsSnapshotEnvelope {
  schemaVersion: 1;
  catalogVersion: "1.0";
  sourceUid: string | null;
  sourceType: string;
  sourceKey: string | null;
  sourceVersion: string | null;
  dataQuality: string | null;
  capturedAt: string;
  nutrients: MicronutrientSnapshotItem[];
}

export interface BuildSnapshotOptions {
  sourceUid?: string | null;
  sourceType?: string;
  sourceKey?: string | null;
  sourceVersion?: string | null;
  dataQuality?: string | null;
  capturedAt?: string; // Optional for deterministic testing
}

/**
 * Builds an immutable, deterministic snapshot envelope containing all 23 canonical nutrients
 * sorted strictly by sortOrder.
 */
export function buildMicronutrientsSnapshotEnvelope(
  valuesMap: Map<string, { value: number | null; status: MicronutrientStatus }>,
  options: BuildSnapshotOptions = {}
): MicronutrientsSnapshotEnvelope {
  const nutrients: MicronutrientSnapshotItem[] = CANONICAL_NUTRIENTS.map((defn) => {
    const entry = valuesMap.get(defn.code);
    if (!entry) {
      return {
        code: defn.code,
        value: null,
        unit: defn.unit,
        status: "UNKNOWN",
      };
    }

    if (entry.status === "TRACE") {
      return {
        code: defn.code,
        value: null,
        unit: defn.unit,
        status: "TRACE",
      };
    }

    if (entry.status === "KNOWN_ZERO" || (entry.value === 0 && entry.status !== "UNKNOWN")) {
      return {
        code: defn.code,
        value: 0,
        unit: defn.unit,
        status: "KNOWN_ZERO",
      };
    }

    if (entry.status === "KNOWN" && entry.value != null && Number.isFinite(entry.value)) {
      return {
        code: defn.code,
        value: Math.round(Number(entry.value) * 10000) / 10000,
        unit: defn.unit,
        status: "KNOWN",
      };
    }

    return {
      code: defn.code,
      value: null,
      unit: defn.unit,
      status: "UNKNOWN",
    };
  });

  return {
    schemaVersion: 1,
    catalogVersion: "1.0",
    sourceUid: options.sourceUid ?? null,
    sourceType: options.sourceType ?? "MANUAL",
    sourceKey: options.sourceKey ?? null,
    sourceVersion: options.sourceVersion ?? null,
    dataQuality: options.dataQuality ?? null,
    capturedAt: options.capturedAt || new Date().toISOString(),
    nutrients,
  };
}

/**
 * Authoritatively parses and validates a stored micronutrients snapshot envelope v1.
 * Strict fail-safe semantics:
 * - Returns null if input is null, undefined, malformed JSON, or invalid object.
 * - Returns null if schemaVersion !== 1 or catalogVersion !== "1.0".
 * - Returns null if nutrients array is not valid or doesn't have 23 valid canonical nutrients.
 * - Validates status and value coherence (KNOWN: >0; KNOWN_ZERO: 0; TRACE: null; UNKNOWN: null).
 */
export function parseMicronutrientsSnapshot(val: unknown): MicronutrientsSnapshotEnvelope | null {
  if (!val) return null;

  let obj: unknown = val;
  if (typeof val === "string") {
    try {
      obj = JSON.parse(val);
    } catch {
      return null;
    }
  }

  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return null;
  }

  const raw = obj as Record<string, unknown>;

  if (raw.schemaVersion !== 1) {
    return null;
  }

  if (raw.catalogVersion !== "1.0") {
    return null;
  }

  if (!Array.isArray(raw.nutrients) || raw.nutrients.length !== CANONICAL_NUTRIENTS.length) {
    return null;
  }

  const nutrients: MicronutrientSnapshotItem[] = [];
  const seenCodes = new Set<string>();

  for (const item of raw.nutrients) {
    if (typeof item !== "object" || item === null) return null;
    const n = item as Record<string, unknown>;
    const code = typeof n.code === "string" ? n.code : "";
    const defn = CANONICAL_NUTRIENTS_BY_CODE.get(code);
    if (!defn) return null;

    if (seenCodes.has(code)) return null;
    seenCodes.add(code);

    if (n.unit !== defn.unit) return null;

    const status = n.status;
    if (status !== "KNOWN" && status !== "KNOWN_ZERO" && status !== "TRACE" && status !== "UNKNOWN") {
      return null;
    }

    let valNum: number | null = null;
    if (status === "KNOWN") {
      if (typeof n.value !== "number" || !Number.isFinite(n.value) || n.value <= 0) {
        return null;
      }
      valNum = n.value;
    } else if (status === "KNOWN_ZERO") {
      if (n.value !== 0) {
        return null;
      }
      valNum = 0;
    } else {
      // TRACE or UNKNOWN
      if (n.value !== null && n.value !== undefined) {
        return null;
      }
      valNum = null;
    }

    nutrients.push({
      code,
      value: valNum,
      unit: defn.unit,
      status,
    });
  }

  // Ensure all 23 canonical nutrients are present
  if (nutrients.length !== CANONICAL_NUTRIENTS.length) {
    return null;
  }

  return {
    schemaVersion: 1,
    catalogVersion: "1.0",
    sourceUid: typeof raw.sourceUid === "string" ? raw.sourceUid : null,
    sourceType: typeof raw.sourceType === "string" ? raw.sourceType : "MANUAL",
    sourceKey: typeof raw.sourceKey === "string" ? raw.sourceKey : null,
    sourceVersion: typeof raw.sourceVersion === "string" ? raw.sourceVersion : null,
    dataQuality: typeof raw.dataQuality === "string" ? raw.dataQuality : null,
    capturedAt: typeof raw.capturedAt === "string" ? raw.capturedAt : new Date().toISOString(),
    nutrients,
  };
}
