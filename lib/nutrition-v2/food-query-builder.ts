/**
 * TREVO ONE - NUTRITION V2 FOOD QUERY BUILDER & ERROR ISOLATION
 * Pure SQL query construction, schema compatibility guarantee,
 * typed error taxonomy, and safe row mapping for Food Library.
 * 100% testable in any runtime without DB connection.
 */

import type {
  NutritionV2FoodDto,
  NutritionV2FoodScope,
  NutritionV2FoodStatus,
} from "./types";

export interface FoodListItemDto extends Omit<NutritionV2FoodDto, "id"> {
  portionsCount: number;
}

export interface ListFoodsResult {
  items: FoodListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ListFoodsFilter = FoodQueryFilter;
export interface FoodQueryFilter {
  query?: string;
  scope?: "ALL" | "GLOBAL" | "CONSULTANCY";
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
  source?: "ALL" | "TACO" | "USDA" | "CONSULTANCY";
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface BuiltCountQuery {
  sql: string;
  params: (string | number)[];
}

export interface BuiltSelectQuery {
  fullSql: string;
  selectParams: (string | number)[];
  noPortionsSql: string;
  noOrderSql: string;
  noOrderParams: (string | number)[];
  only024Sql: string;
  orderClause: string;
  orderParams: (string | number)[];
  pageSize: number;
  offset: number;
}

// ============================================================================
// TYPED ERRORS & SAFE MYSQL METADATA EXTRACTION
// ============================================================================

export type FoodLibraryQuerySubstage = "COUNT" | "SELECT" | "ORDER" | "PORTIONS" | "UNKNOWN";

export interface SafeMysqlErrorInfo {
  name?: string;
  code?: string;
}

export function extractSafeMysqlError(err: unknown): SafeMysqlErrorInfo {
  if (err && typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const name = typeof errorObj.name === "string" ? errorObj.name : undefined;
    const code = typeof errorObj.code === "string" ? errorObj.code : undefined;
    return { name, code };
  }
  return {};
}

export class FoodLibraryQueryError extends Error {
  public readonly substage: FoodLibraryQuerySubstage;
  public readonly mysqlCode?: string;
  public readonly cause?: unknown;

  constructor(
    message: string,
    substage: FoodLibraryQuerySubstage = "UNKNOWN",
    cause?: unknown
  ) {
    super(message);
    this.name = "FoodLibraryQueryError";
    this.substage = substage;
    this.cause = cause;
    const safeInfo = extractSafeMysqlError(cause);
    this.mysqlCode = safeInfo.code;
  }
}

export class FoodLibraryQueryCountError extends FoodLibraryQueryError {
  constructor(message: string, cause?: unknown) {
    super(message, "COUNT", cause);
    this.name = "FoodLibraryQueryCountError";
  }
}

export class FoodLibraryQuerySelectError extends FoodLibraryQueryError {
  constructor(message: string, cause?: unknown) {
    super(message, "SELECT", cause);
    this.name = "FoodLibraryQuerySelectError";
  }
}

export class FoodLibraryQueryOrderError extends FoodLibraryQueryError {
  constructor(message: string, cause?: unknown) {
    super(message, "ORDER", cause);
    this.name = "FoodLibraryQueryOrderError";
  }
}

export class FoodLibraryQueryPortionsError extends FoodLibraryQueryError {
  constructor(message: string, cause?: unknown) {
    super(message, "PORTIONS", cause);
    this.name = "FoodLibraryQueryPortionsError";
  }
}

export class FoodLibraryQueryUnknownError extends FoodLibraryQueryError {
  constructor(message: string, cause?: unknown) {
    super(message, "UNKNOWN", cause);
    this.name = "FoodLibraryQueryUnknownError";
  }
}

export class FoodLibraryMappingError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "FoodLibraryMappingError";
    this.cause = cause;
  }
}

// ============================================================================
// SEARCH TOKENIZATION & RANKING (GUARANTEED 024 SCHEMA ONLY)
// ============================================================================

export function normalizeSearchText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const SEARCH_STOP_WORDS = new Set([
  "de", "da", "do", "dos", "das", "com", "sem", "em", "no", "na",
  "nos", "nas", "para", "por", "um", "uma", "uns", "umas", "ao", "aos",
  "as", "os", "e", "ou",
]);

export function tokenizeSearchQuery(query: string): string[] {
  if (!query || typeof query !== "string") return [];
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const rawTokens = normalized
    .split(/[\s,./;:_()\-+!@#$%^&*=[\]{}|\\<>"'?`~]+/)
    .filter((token) => /[a-z0-9]/.test(token));

  if (rawTokens.length === 0) return [];

  const uniqueTokens = new Set<string>();
  for (const token of rawTokens) {
    if (token.length > 1 && !SEARCH_STOP_WORDS.has(token)) {
      uniqueTokens.add(token);
      if (uniqueTokens.size >= 8) break;
    }
  }

  if (uniqueTokens.size === 0) {
    for (const token of rawTokens) {
      uniqueTokens.add(token);
      if (uniqueTokens.size >= 8) break;
    }
  }

  return Array.from(uniqueTokens);
}

export const COMMON_FOOD_SYNONYMS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  aipim: ["mandioca", "macaxeira", "cassava"],
  macaxeira: ["mandioca", "aipim", "cassava"],
  mandioca: ["aipim", "macaxeira", "cassava"],
  mexerica: ["tangerina", "bergamota", "mandarina"],
  bergamota: ["tangerina", "mexerica", "mandarina"],
  tangerina: ["mexerica", "bergamota", "mandarina"],
  abacaxi: ["ananas", "pineapple"],
  morango: ["strawberry"],
  abacate: ["avocado"],
  melancia: ["watermelon"],
  melao: ["melon"],
  mamao: ["papaya"],
  maracuja: ["passion fruit"],
  alcatra: ["top sirloin"],
  mignon: ["file mignon", "tenderloin"],
  acem: ["chuck"],
  contrafile: ["strip steak"],
  picanha: ["sirloin cap"],
  fraldinha: ["flank steak"],
  costela: ["rib", "ribs"],
  frango: ["chicken"],
  sobrecoxa: ["thigh"],
  coxa: ["drumstick"],
  ovo: ["egg"],
  clara: ["egg white"],
  gema: ["egg yolk"],
  peixe: ["fish"],
  salmao: ["salmon"],
  atum: ["tuna"],
  bacalhau: ["cod"],
  camarao: ["shrimp", "prawn"],
  whey: ["soro de leite", "whey protein"],
  creatina: ["creatine"],
  aveia: ["oat", "oats"],
  arroz: ["rice"],
  feijao: ["bean", "beans"],
  lentilha: ["lentil"],
  chia: ["chia seed"],
  linhaca: ["flaxseed"],
  leite: ["milk"],
  iogurte: ["yogurt"],
  queijo: ["cheese"],
  ricota: ["ricotta"],
  cottage: ["cottage cheese"],
  manteiga: ["butter"],
  azeite: ["olive oil"],
  mussarela: ["mucarela", "mozarela", "mozzarella"],
  mucarela: ["mussarela", "mozarela", "mozzarella"],
  mozarela: ["mussarela", "mucarela", "mozzarella"],
  mozzarella: ["mussarela", "mucarela", "mozarela"],
  pasta: ["creme", "massa", "paste"],
  creme: ["pasta", "cream"],
  cozido: ["cozida"],
  cozida: ["cozido"],
  assado: ["assada"],
  assada: ["assado"],
  grelhado: ["grelhada"],
  grelhada: ["grelhado"],
  frito: ["frita"],
  frita: ["frito"],
  cru: ["crua"],
  crua: ["cru"],
  moido: ["moida"],
  moida: ["moido"],
  torrado: ["torrada"],
  torrada: ["torrado"],
  tostado: ["tostada"],
  tostada: ["tostado"],
  desnatado: ["desnatada"],
  desnatada: ["desnatado"],
  defumado: ["defumada"],
  defumada: ["defumado"],
});

export function expandSearchTokensWithSynonyms(tokens: string[]): string[][] {
  return tokens.map((token) => {
    const normalized = normalizeSearchText(token);
    const synonyms = COMMON_FOOD_SYNONYMS[normalized];
    if (synonyms && synonyms.length > 0) {
      return [token, ...synonyms];
    }
    return [token];
  });
}

function getWordStem(word: string): string {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function buildFoodSearchOrderClause(
  query: string,
  queryTokens: string[],
  isUnified = true
): { orderClause: string; orderParams: (string | number)[] } {
  // Empty query: guaranteed 024 schema columns ONLY (f.scope, f.name)
  if (!queryTokens || queryTokens.length === 0) {
    const defaultOrder = isUnified
      ? "ORDER BY CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC, f.name ASC"
      : "ORDER BY f.name ASC";
    return { orderClause: defaultOrder, orderParams: [] };
  }

  const normalizedQuery = normalizeSearchText(query);
  const cleanQuery = queryTokens.join(" ");
  const firstToken = queryTokens[0] || "";
  const firstStem = getWordStem(firstToken);
  const orderParams: (string | number)[] = [];

  // Guaranteed 024 column for text comparison
  const targetCol = "f.normalized_name";

  // Tier 1: Exact match normalized
  orderParams.push(normalizedQuery, cleanQuery);
  orderParams.push(normalizedQuery, cleanQuery);

  // Tier 2: Sequence starts with first token
  const tier2Pt: string[] = [];
  const tier2En: string[] = [];
  if (queryTokens.length >= 2) {
    const t0 = queryTokens[0];
    const t1 = queryTokens[1];
    const s0 = getWordStem(t0);
    tier2Pt.push(`${t0}, %${t1}%`, `${t0} %${t1}%`, `${s0}, %${t1}%`, `${s0}s, %${t1}%`, `${t1}, %${t0}%`, `${t1} %${t0}%`);
    tier2En.push(`${t0}, %${t1}%`, `${t0} %${t1}%`, `${s0}, %${t1}%`, `${s0}s, %${t1}%`, `${t1}, %${t0}%`, `${t1} %${t0}%`);
  } else {
    tier2Pt.push(`${firstToken},%`, `${firstStem},%`, `${firstStem}s,%`, `peixe, ${firstToken},%`, `peixe, ${firstStem},%`, `${firstToken} %`);
    tier2En.push(`${firstToken},%`, `${firstStem},%`, `${firstStem}s,%`, `fish, ${firstToken},%`, `fish, ${firstStem},%`, `${firstToken} %`);
  }
  orderParams.push(...tier2Pt, ...tier2En);

  // Tier 3: Primary noun followed by comma
  orderParams.push(`${firstToken},%`, `${firstStem},%`, `${firstStem}s,%`, `peixe, ${firstToken},%`, `peixe, ${firstStem},%`);
  orderParams.push(`${firstToken},%`, `${firstStem},%`, `${firstStem}s,%`, `fish, ${firstToken},%`, `fish, ${firstStem},%`);

  // Tier 4: Starts with first token as full word
  orderParams.push(`${firstToken} %`, `${firstStem} %`);
  orderParams.push(`${firstToken} %`, `${firstStem} %`);

  // Tier 5: Starts with first token prefix
  orderParams.push(`${firstToken}%`);
  orderParams.push(`${firstToken}%`);

  const tenancyOrder = isUnified ? "CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC," : "";

  const hasCookingKeyword = queryTokens.some((t) =>
    ["cozido", "cozida", "assado", "assada", "grelhado", "grelhada", "frito", "frita",
     "cooked", "boiled", "baked", "roasted", "grilled", "fried", "broiled", "poached"].includes(t)
  );

  const isMilkQuery = queryTokens.some((t) => ["milk", "leite"].includes(t));
  const hasCheeseOrYogurtQuery = queryTokens.some((t) =>
    ["cheese", "queijo", "yogurt", "iogurte", "ricota", "ricotta"].includes(t)
  );

  const isBreadQuery = queryTokens.some((t) => ["bread", "pao"].includes(t));
  const isYogurtQuery = queryTokens.some((t) => ["yogurt", "iogurte"].includes(t));

  const orderClause = `ORDER BY
    ${tenancyOrder}
    CASE
      WHEN ${targetCol} = ? OR ${targetCol} = ? THEN 1
      WHEN f.normalized_name = ? OR f.normalized_name = ? THEN 2
      ${queryTokens.length >= 2 ? `
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ?
        OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 3
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ?
        OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 4
      ` : `
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ?
        OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 3
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ?
        OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 4
      `}
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ?
        OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 5
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ?
        OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 6
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 7
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 8
      WHEN ${targetCol} LIKE ? THEN 9
      WHEN f.normalized_name LIKE ? THEN 10
      ELSE 11
    END ASC,
    CASE
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'leite%' OR f.normalized_name LIKE 'milk%') THEN 1
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'queijo%' OR ${targetCol} LIKE 'iogurte%' OR f.normalized_name LIKE 'cheese%' OR f.normalized_name LIKE 'yogurt%') THEN 3
      ELSE 2
    END ASC,
    CASE
      WHEN (${targetCol} LIKE '%sem osso%' AND ${targetCol} LIKE '%sem pele%')
        OR (f.normalized_name LIKE '%boneless%' AND f.normalized_name LIKE '%skinless%') THEN 1
      WHEN ${targetCol} LIKE '%sem pele%' OR f.normalized_name LIKE '%skinless%' THEN 2
      WHEN ${targetCol} LIKE '%sem osso%' OR f.normalized_name LIKE '%boneless%' THEN 3
      WHEN ${targetCol} LIKE '%carne e pele%' OR ${targetCol} LIKE '%com pele%'
        OR f.normalized_name LIKE '%meat and skin%' OR f.normalized_name LIKE '%skin eaten%' OR f.normalized_name LIKE '%skin on%' THEN 5
      ELSE 4
    END ASC,
    CASE
      WHEN (${!hasCookingKeyword ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '% cru%' OR ${targetCol} LIKE '%, cru%' OR ${targetCol} LIKE 'cru,%' OR ${targetCol} = 'cru'
             OR f.normalized_name LIKE '% raw%' OR f.normalized_name LIKE '%, raw%' OR f.normalized_name LIKE 'raw,%' OR f.normalized_name = 'raw') THEN 1
      ELSE 2
    END ASC,
    CASE
      WHEN (${isBreadQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%castanha%' OR ${targetCol} LIKE '%nozes%' OR ${targetCol} LIKE '%passas%'
             OR f.normalized_name LIKE '%nut%' OR f.normalized_name LIKE '%raisin%') THEN 3
      ELSE 1
    END ASC,
    CASE
      WHEN (${isYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%morango%' OR ${targetCol} LIKE '%coco%' OR ${targetCol} LIKE '%mel%'
             OR f.normalized_name LIKE '%fruit%' OR f.normalized_name LIKE '%flavored%') THEN 3
      ELSE 1
    END ASC,
    -- Source key ranking (guaranteed in 024 schema foundation)
    CASE
      WHEN f.source_key = 'USDA_FOUNDATION' THEN 1
      WHEN f.source_key = 'USDA_FNDDS' THEN 2
      ELSE 3
    END ASC,
    CHAR_LENGTH(f.name) ASC,
    f.name ASC`;

  return { orderClause, orderParams };
}

// ============================================================================
// SQL BUILDERS (100% GUARANTEED 024 SCHEMA COMPATIBILITY)
// ============================================================================

export function buildWhereClause(
  filter: FoodQueryFilter,
  consultancyId: number | null
): { whereClause: string; params: (string | number)[]; queryTokens: string[] } {
  const targetScope = filter.scope || "ALL";
  const targetStatus = filter.status || "ACTIVE";

  const conditions: string[] = ["f.deleted_at IS NULL"];
  const params: (string | number)[] = [];

  if (targetScope === "GLOBAL") {
    conditions.push("f.scope = 'GLOBAL' AND f.status = 'ACTIVE'");
  } else if (targetScope === "CONSULTANCY") {
    if (consultancyId != null) {
      conditions.push("f.scope = 'CONSULTANCY' AND f.consultancy_id = ?");
      params.push(consultancyId);
    } else {
      conditions.push("f.scope = 'CONSULTANCY' AND 1=0");
    }
    if (targetStatus === "ACTIVE") {
      conditions.push("f.status = 'ACTIVE'");
    } else if (targetStatus === "ARCHIVED") {
      conditions.push("f.status = 'ARCHIVED'");
    } else {
      conditions.push("f.status IN ('ACTIVE', 'ARCHIVED')");
    }
  } else {
    // ALL: GLOBAL ACTIVE + Current Consultancy
    if (consultancyId != null) {
      if (targetStatus === "ACTIVE") {
        conditions.push(
          "((f.scope = 'GLOBAL' AND f.status = 'ACTIVE') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ACTIVE'))"
        );
        params.push(consultancyId);
      } else if (targetStatus === "ARCHIVED") {
        conditions.push("f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ARCHIVED'");
        params.push(consultancyId);
      } else {
        conditions.push(
          "((f.scope = 'GLOBAL' AND f.status = 'ACTIVE') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status IN ('ACTIVE', 'ARCHIVED')))"
        );
        params.push(consultancyId);
      }
    } else {
      conditions.push("f.scope = 'GLOBAL' AND f.status = 'ACTIVE'");
    }
  }

  // Source filter
  if (filter.source && filter.source !== "ALL") {
    if (filter.source === "TACO") {
      conditions.push("f.source_key = 'TACO'");
    } else if (filter.source === "USDA") {
      conditions.push("f.source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')");
    } else if (filter.source === "CONSULTANCY") {
      conditions.push("f.scope = 'CONSULTANCY'");
    }
  }

  // Text search tokens
  const queryTokens = filter.query ? tokenizeSearchQuery(filter.query) : [];
  if (queryTokens.length > 0) {
    const tokenGroups = expandSearchTokensWithSynonyms(queryTokens);
    for (const group of tokenGroups) {
      const orClauses: string[] = [];
      for (const variant of group) {
        orClauses.push("f.normalized_name LIKE ?");
        params.push(`%${variant}%`);
      }
      conditions.push(`(${orClauses.join(" OR ")})`);
    }
  }

  // Category filter
  if (filter.category && filter.category.trim()) {
    conditions.push("f.category = ?");
    params.push(filter.category.trim());
  }

  return {
    whereClause: conditions.join(" AND "),
    params,
    queryTokens,
  };
}

export function buildCountQuery(
  filter: FoodQueryFilter,
  consultancyId: number | null
): BuiltCountQuery {
  const { whereClause, params } = buildWhereClause(filter, consultancyId);
  return {
    sql: `SELECT COUNT(*) as total FROM nutrition_v2_foods f WHERE ${whereClause}`,
    params,
  };
}

export function buildSelectFoodsQuery(
  filter: FoodQueryFilter,
  consultancyId: number | null,
  options: { isUnified?: boolean } = {}
): BuiltSelectQuery {
  const page = Math.max(1, Number(filter.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filter.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const { whereClause, params, queryTokens } = buildWhereClause(filter, consultancyId);

  const { orderClause, orderParams } = buildFoodSearchOrderClause(
    filter.query || "",
    queryTokens,
    options.isUnified ?? true
  );

  const selectParams: (string | number)[] = [...params, ...orderParams, pageSize, offset];
  const noOrderParams: (string | number)[] = [...params, pageSize, offset];

  // Essential columns guaranteed by 024 schema foundation ONLY
  const coreFields = `
    f.public_id,
    f.scope,
    f.consultancy_id,
    f.name,
    f.category,
    f.reference_amount,
    f.reference_unit_code,
    f.calories_kcal,
    f.protein_g,
    f.carbohydrate_g,
    f.fat_g,
    f.status,
    f.source_type,
    f.source_key,
    f.created_at,
    f.updated_at
  `;

  // Portions subquery guaranteed by 024 schema foundation ONLY
  const portionsSubquery = `
    (
      SELECT COUNT(*)
      FROM nutrition_v2_food_portions fp
      WHERE fp.food_id = f.id
        AND fp.deleted_at IS NULL
        AND fp.status = 'ACTIVE'
    ) AS portions_count
  `;

  const fullSql = `SELECT
    ${coreFields},
    ${portionsSubquery}
  FROM nutrition_v2_foods f
  WHERE ${whereClause}
  ${orderClause}
  LIMIT ? OFFSET ?`;

  const noPortionsSql = `SELECT
    ${coreFields}
  FROM nutrition_v2_foods f
  WHERE ${whereClause}
  ${orderClause}
  LIMIT ? OFFSET ?`;

  const noOrderSql = `SELECT
    ${coreFields}
  FROM nutrition_v2_foods f
  WHERE ${whereClause}
  ORDER BY f.id ASC
  LIMIT ? OFFSET ?`;

  const only024Sql = `SELECT
    f.id,
    f.public_id,
    f.name
  FROM nutrition_v2_foods f
  WHERE ${whereClause}
  ORDER BY f.id ASC
  LIMIT ? OFFSET ?`;

  return {
    fullSql,
    selectParams,
    noPortionsSql,
    noOrderSql,
    noOrderParams,
    only024Sql,
    orderClause,
    orderParams,
    pageSize,
    offset,
  };
}

// ============================================================================
// DEFENSIVE MAPPING WITHOUT FAKE SEMANTIC DEFAULTS (SECTION 10 COMPLIANCE)
// ============================================================================

export function safeIsoString(val: unknown, fallback: string | null = null): string | null {
  if (val == null || val === "" || val === "0000-00-00 00:00:00" || val === "0000-00-00") {
    return fallback;
  }
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? fallback : val.toISOString();
  }
  if (typeof val === "string" || typeof val === "number") {
    try {
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function safeNullableNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

export function safeNumber(val: unknown, fallback = 0): number {
  if (val == null || val === "") return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

export function safeString(val: unknown, fallback = ""): string {
  if (val == null) return fallback;
  return String(val);
}

export function safeNullableString(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length === 0 ? null : s;
}

export function mapFoodRow(r: Record<string, unknown>): FoodListItemDto {
  const publicId = typeof r.public_id === "string" ? r.public_id.trim() : "";
  if (!publicId) {
    throw new FoodLibraryMappingError("Missing mandatory public_id");
  }

  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) {
    throw new FoodLibraryMappingError("Missing mandatory name");
  }

  const rawScope = String(r.scope || "").trim();
  if (rawScope !== "GLOBAL" && rawScope !== "CONSULTANCY") {
    throw new FoodLibraryMappingError(`Invalid mandatory scope: ${rawScope}`);
  }
  const scope: NutritionV2FoodScope = rawScope;

  const rawStatus = String(r.status || "").trim();
  if (rawStatus !== "ACTIVE" && rawStatus !== "ARCHIVED") {
    throw new FoodLibraryMappingError(`Invalid mandatory status: ${rawStatus}`);
  }
  const status: NutritionV2FoodStatus = rawStatus;

  // Strict referenceAmount validation: NO FAKE 100 DEFAULT
  if (r.reference_amount == null || r.reference_amount === "") {
    throw new FoodLibraryMappingError("Missing mandatory reference_amount");
  }
  const refAmount = Number(r.reference_amount);
  if (Number.isNaN(refAmount) || refAmount <= 0) {
    throw new FoodLibraryMappingError(`Invalid reference_amount value: ${r.reference_amount}`);
  }

  const refUnit = typeof r.reference_unit_code === "string" ? r.reference_unit_code.trim().toUpperCase() : "";
  if (!refUnit) {
    throw new FoodLibraryMappingError("Missing mandatory reference_unit_code");
  }

  // Strict sourceType validation: NO FAKE 'MANUAL' DEFAULT
  const rawSourceType = typeof r.source_type === "string" ? r.source_type.trim() : "";
  if (!rawSourceType) {
    throw new FoodLibraryMappingError("Missing mandatory source_type");
  }

  // Nullable metadata: NULL != DEFAULT VALUE, UNKNOWN != ZERO
  const consultancyId = r.consultancy_id != null ? String(r.consultancy_id) : null;
  const category = safeNullableString(r.category);
  const caloriesKcal = safeNullableNumber(r.calories_kcal);
  const proteinG = safeNullableNumber(r.protein_g);
  const carbohydrateG = safeNullableNumber(r.carbohydrate_g);
  const fatG = safeNullableNumber(r.fat_g);
  const fiberG = safeNullableNumber(r.fiber_g);
  const dataQuality = safeNullableString(r.data_quality) || undefined;
  const sourceKey = safeNullableString(r.source_key);
  const sourceExternalCode = safeNullableString(r.source_external_code);
  const sourceVersion = safeNullableString(r.source_version);
  const sourceReference = safeNullableString(r.source_reference);
  const sourceImportedAt = safeIsoString(r.source_imported_at, null);
  const lastVerifiedAt = safeIsoString(r.last_verified_at, null);
  const sourceUid = safeNullableString(r.source_uid);
  const createdByUserId = r.created_by_user_id != null ? String(r.created_by_user_id) : null;
  const createdByMembershipId = r.created_by_membership_id != null ? String(r.created_by_membership_id) : null;
  const createdAt = safeIsoString(r.created_at, new Date(0).toISOString())!;
  const updatedAt = safeIsoString(r.updated_at, new Date(0).toISOString())!;
  const deletedAt = safeIsoString(r.deleted_at, null);
  const portionsCount = Math.max(0, safeNumber(r.portions_count, 0));

  return {
    publicId,
    scope,
    consultancyId,
    name,
    displayNamePtBr: safeNullableString(r.display_name_pt_br),
    normalizedDisplayNamePtBr: safeNullableString(r.normalized_display_name_pt_br),
    normalizedName: safeString(r.normalized_name, ""),
    category,
    referenceAmount: refAmount,
    referenceUnitCode: refUnit,
    caloriesKcal,
    proteinG,
    carbohydrateG,
    fatG,
    fiberG,
    dataQuality,
    status,
    sourceType: rawSourceType,
    sourceKey,
    sourceExternalCode,
    sourceVersion,
    sourceReference,
    sourceImportedAt,
    lastVerifiedAt,
    sourceUid,
    createdByUserId,
    createdByMembershipId,
    createdAt,
    updatedAt,
    deletedAt,
    portionsCount,
  };
}
