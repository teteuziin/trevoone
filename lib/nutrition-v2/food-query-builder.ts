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

export type FoodSourceTab = "TREVO_BRASIL" | "COMMERCIAL" | "MY_FOODS" | "OTHER_DATABASES";

// ============================================================================
// PHASE B1.1 — CURATED BRAZILIAN SOURCE ALLOWLISTS & INTEGRITY GUARDS
// ============================================================================

export const APPROVED_BR_SOURCE_KEYS = Object.freeze(["TACO", "GROWTH_SUPPLEMENTS"] as const);
export type ApprovedBrSourceKey = (typeof APPROVED_BR_SOURCE_KEYS)[number];

export const APPROVED_COMMERCIAL_SOURCE_KEYS = Object.freeze(["GROWTH_SUPPLEMENTS"] as const);
export type ApprovedCommercialSourceKey = (typeof APPROVED_COMMERCIAL_SOURCE_KEYS)[number];

export const INTERNATIONAL_DATABASE_SOURCE_KEYS = Object.freeze([
  "USDA_FOUNDATION",
  "USDA_FNDDS",
] as const);

export function isApprovedBrSourceKey(sourceKey: string | null | undefined): boolean {
  if (!sourceKey) return false;
  return (APPROVED_BR_SOURCE_KEYS as readonly string[]).includes(sourceKey);
}

export function isApprovedCommercialSourceKey(
  sourceKey: string | null | undefined,
  sourceType?: string | null | undefined
): boolean {
  if (!sourceKey) return false;
  const isApprovedKey = (APPROVED_COMMERCIAL_SOURCE_KEYS as readonly string[]).includes(sourceKey);
  if (!isApprovedKey) return false;
  if (sourceType !== undefined) {
    return sourceType === "BRANDED";
  }
  return true;
}

/**
 * Objective data invalidity guard:
 * Only flags records that violate physical / structural data invariants:
 * - negative nutrient values (< 0)
 * - non-positive or missing reference amount (<= 0 or NULL)
 * - missing reference unit code (NULL or empty)
 * - missing or empty food name
 *
 * NOTE: Discrepancies between declared kcal and 4P+4C+9F (Atwater) are
 * review signals only and MUST NOT automatically hide official source foods.
 */
export const OBJECTIVE_INVALID_DATA_SQL_CONDITION = `(
  f.calories_kcal < 0
  OR f.protein_g < 0
  OR f.carbohydrate_g < 0
  OR f.fat_g < 0
  OR f.reference_amount <= 0
  OR f.reference_amount IS NULL
  OR f.reference_unit_code IS NULL
  OR TRIM(f.reference_unit_code) = ''
  OR f.name IS NULL
  OR TRIM(f.name) = ''
)`;

export type ListFoodsFilter = FoodQueryFilter;
export interface FoodQueryFilter {
  query?: string;
  scope?: "ALL" | "GLOBAL" | "CONSULTANCY";
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
  source?: "ALL" | "TACO" | "USDA" | "CONSULTANCY";
  sourceTab?: FoodSourceTab;
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
// SEARCH TOKENIZATION & RANKING (PHASE B1 — PT-BR CURATED ONLY)
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
  "de",
  "da",
  "do",
  "dos",
  "das",
  "com",
  "sem",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "um",
  "uma",
  "uns",
  "umas",
  "ao",
  "aos",
  "as",
  "os",
  "e",
  "ou",
]);

export function tokenizeSearchQuery(query: string): string[] {
  if (!query || typeof query !== "string") return [];
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const rawTokens = normalized
    .split(/[\s,./;:_()\-+!@#$%^&*=[\]{}|\\<>"'?`~]+/)
    .filter((token) => /[a-z0-9]/.test(token));

  if (rawTokens.length === 0) return [];

  // Filter out stop words and single-character noise while preserving unique tokens (up to 8)
  const uniqueTokens = new Set<string>();
  for (const token of rawTokens) {
    if (token.length > 1 && !SEARCH_STOP_WORDS.has(token)) {
      uniqueTokens.add(token);
      if (uniqueTokens.size >= 8) break;
    }
  }

  // If all tokens were filtered out (e.g. very short tokens), fall back to raw non-empty tokens
  if (uniqueTokens.size === 0) {
    for (const token of rawTokens) {
      uniqueTokens.add(token);
      if (uniqueTokens.size >= 8) break;
    }
  }

  return Array.from(uniqueTokens);
}

export function getFirstRelevantToken(tokens: string[]): string {
  if (!tokens || tokens.length === 0) return "";
  const firstSignificant = tokens.find(
    (t) => t.length > 2 && !SEARCH_STOP_WORDS.has(t)
  );
  return firstSignificant || tokens[0] || "";
}

function getWordStem(word: string): string {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * Curated Brazilian Food Synonyms & Regional Equivalents.
 * Expands search vocabulary without risky automated database merges.
 */
/**
 * Curated Brazilian Food Synonyms & Regional Equivalents for user search.
 * STRICTLY Portuguese regional equivalents, culinary preparation states,
 * and unambiguous Brazilian synonyms.
 * NO English cross-language tokens allowed in user search queries.
 */
export const USER_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // Tubérculos e Raízes (variações regionais inequívocas em PT-BR)
  aipim: ["mandioca", "macaxeira"],
  macaxeira: ["mandioca", "aipim"],
  mandioca: ["aipim", "macaxeira"],

  // Frutas com variações regionais brasileiras
  mexerica: ["tangerina", "bergamota", "mandarina"],
  bergamota: ["tangerina", "mexerica", "mandarina"],
  tangerina: ["mexerica", "bergamota", "mandarina"],
  abacaxi: ["ananas"],

  // Queijos e grafias em PT-BR
  mussarela: ["mucarela", "mozarela"],
  mucarela: ["mussarela", "mozarela"],
  mozarela: ["mussarela", "mucarela"],
  mozzarella: ["mussarela", "mucarela", "mozarela"],

  // Carnes
  mignon: ["file mignon"],

  // Suplementos e derivados lácteos em PT-BR
  whey: ["whey protein", "soro de leite"],

  // Flexões culinárias e estados de preparo simétricos (preserva o estado exato: cozido <-> cozida, cru <-> crua, etc.)
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

/**
 * Aliased to USER_SEARCH_ALIASES for backward compatibility with user-facing code.
 */
export const COMMON_FOOD_SYNONYMS: Readonly<Record<string, readonly string[]>> = USER_SEARCH_ALIASES;

/**
 * Internal cross-language discovery aliases reserved EXCLUSIVELY for ingestion / curation scripts.
 * Must NEVER be exposed to or used in user nutritionist search queries.
 */
export const DISCOVERY_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  aipim: ["cassava"],
  macaxeira: ["cassava"],
  mandioca: ["cassava"],
  inhame: ["yam"],
  batata: ["potato"],
  abacaxi: ["pineapple"],
  morango: ["strawberry"],
  abacate: ["avocado"],
  melancia: ["watermelon"],
  melao: ["melon"],
  mamao: ["papaya"],
  maracuja: ["passion fruit"],
  alcatra: ["top sirloin"],
  mignon: ["tenderloin"],
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
  whey: ["whey protein"],
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
});

export function expandSearchTokensWithSynonyms(tokens: string[]): string[][] {
  const hasAmendoim = tokens.some((t) => normalizeSearchText(t) === "amendoim");

  return tokens.map((token) => {
    const normalized = normalizeSearchText(token);

    // Phrase-aware handling: pasta / creme / manteiga de amendoim
    if (hasAmendoim && (normalized === "pasta" || normalized === "creme" || normalized === "manteiga")) {
      return [token, "pasta", "creme", "manteiga"];
    }

    // Phrase-aware handling: arroz branco -> TACO arroz tipo 1 / tipo 2 / polido
    const hasArroz = tokens.some((t) => normalizeSearchText(t) === "arroz");
    if (hasArroz && (normalized === "branco" || normalized === "polido" || normalized === "tipo 1")) {
      return [token, "tipo 1", "tipo 2", "polido", "branco"];
    }

    const synonyms = USER_SEARCH_ALIASES[normalized];
    if (synonyms && synonyms.length > 0) {
      return [token, ...synonyms];
    }
    return [token];
  });
}

export function buildFoodSearchOrderClause(
  query: string,
  queryTokens: string[],
  isUnified = true
): { orderClause: string; orderParams: (string | number)[] } {
  if (!queryTokens || queryTokens.length === 0) {
    const defaultOrder = isUnified
      ? `ORDER BY CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC, f.name ASC`
      : `ORDER BY f.name ASC`;
    return { orderClause: defaultOrder, orderParams: [] };
  }

  const normalizedQuery = normalizeSearchText(query);
  const cleanQuery = queryTokens.join(" ");
  const firstToken = queryTokens[0] || "";
  const firstStem = getWordStem(firstToken);
  const orderParams: (string | number)[] = [];

  const targetCol = "f.normalized_name";

  // Tier 1: Exact match normalized (PT-BR first, then EN alias)
  orderParams.push(normalizedQuery, cleanQuery);
  orderParams.push(normalizedQuery, cleanQuery);

  // Tier 2: Sequence starts with first token as distinct word or phrase
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

  // Tier 4: Starts with first token as full word (space)
  orderParams.push(`${firstToken} %`, `${firstStem} %`);
  orderParams.push(`${firstToken} %`, `${firstStem} %`);

  // Tier 5: Starts with first token prefix
  orderParams.push(`${firstToken}%`);
  orderParams.push(`${firstToken}%`);

  const tenancyOrder = isUnified ? `CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC,` : "";

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
      -- Tier 1: Exact match normalized PT-BR
      WHEN ${targetCol} = ? OR ${targetCol} = ? THEN 1
      -- Tier 1b: Exact match normalized EN alias
      WHEN f.normalized_name = ? OR f.normalized_name = ? THEN 2
      -- Tier 2: Query phrase or structured sequence at start with word boundaries (PT-BR)
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
      -- Tier 3: Primary noun followed by comma (base food indicator)
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? OR ${targetCol} LIKE ?
        OR ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 5
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? OR f.normalized_name LIKE ?
        OR f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 6
      -- Tier 4: Starts with first token as full word
      WHEN ${targetCol} LIKE ? OR ${targetCol} LIKE ? THEN 7
      WHEN f.normalized_name LIKE ? OR f.normalized_name LIKE ? THEN 8
      -- Tier 5: Starts with first token prefix
      WHEN ${targetCol} LIKE ? THEN 9
      WHEN f.normalized_name LIKE ? THEN 10
      ELSE 11
    END ASC,
    -- Prioritize direct milk foods over dairy derivatives (yogurt, cheese) when querying milk / leite
    CASE
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'leite%' OR f.normalized_name LIKE 'milk%') THEN 1
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'queijo%' OR ${targetCol} LIKE 'iogurte%' OR f.normalized_name LIKE 'cheese%' OR f.normalized_name LIKE 'yogurt%') THEN 3
      ELSE 2
    END ASC,
    -- Prioritize clean, lean base cuts (sem osso / sem pele / boneless / skinless)
    CASE
      WHEN (${targetCol} LIKE '%sem osso%' AND ${targetCol} LIKE '%sem pele%')
        OR (f.normalized_name LIKE '%boneless%' AND f.normalized_name LIKE '%skinless%') THEN 1
      WHEN ${targetCol} LIKE '%sem pele%' OR f.normalized_name LIKE '%skinless%' THEN 2
      WHEN ${targetCol} LIKE '%sem osso%' OR f.normalized_name LIKE '%boneless%' THEN 3
      WHEN ${targetCol} LIKE '%carne e pele%' OR ${targetCol} LIKE '%com pele%'
        OR f.normalized_name LIKE '%meat and skin%' OR f.normalized_name LIKE '%skin eaten%' OR f.normalized_name LIKE '%skin on%' THEN 5
      ELSE 4
    END ASC,
    -- Prefer raw / cru base food when cooking method is not specified in query
    CASE
      WHEN (${!hasCookingKeyword ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '% cru%' OR ${targetCol} LIKE '%, cru%' OR ${targetCol} LIKE 'cru,%' OR ${targetCol} = 'cru'
             OR f.normalized_name LIKE '% raw%' OR f.normalized_name LIKE '%, raw%' OR f.normalized_name LIKE 'raw,%' OR f.normalized_name = 'raw') THEN 1
      ELSE 2
    END ASC,
    -- Prefer plain / white / whole wheat bread over nut / fruit bread when querying bread
    CASE
      WHEN (${isBreadQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%castanha%' OR ${targetCol} LIKE '%nozes%' OR ${targetCol} LIKE '%passas%'
             OR f.normalized_name LIKE '%nut%' OR f.normalized_name LIKE '%raisin%') THEN 3
      ELSE 1
    END ASC,
    -- Prefer plain whole / skim yogurt over sugary / fruit-flavored yogurt
    CASE
      WHEN (${isYogurtQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%morango%' OR ${targetCol} LIKE '%coco%' OR ${targetCol} LIKE '%mel%'
             OR f.normalized_name LIKE '%fruit%' OR f.normalized_name LIKE '%flavored%') THEN 3
      ELSE 1
    END ASC,
    -- Prioritize analytical laboratory direct data & survey recipe data quality
    CASE
      WHEN f.source_key = 'USDA_FOUNDATION' THEN 1
      WHEN f.source_key = 'USDA_FNDDS' THEN 2
      ELSE 3
    END ASC,
    -- Shorter food names tend to be basic primary ingredients rather than complex derivatives
    CHAR_LENGTH(COALESCE(f.display_name_pt_br, f.name)) ASC,
    COALESCE(f.display_name_pt_br, f.name) ASC`;

  return { orderClause, orderParams };
}

export interface DataQualityBadgeInfo {
  label: string;
  title: string;
  variant: "analytical" | "survey";
}

/**
 * Maps persistent data_quality values from Release A to user-friendly,
 * technically neutral, non-evaluative UI presentation badges.
 */

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

  // Determine effective source tab (defaults to TREVO_BRASIL for nutritionist experience)
  let effectiveTab: FoodSourceTab = filter.sourceTab || "TREVO_BRASIL";
  if (filter.source === "USDA") {
    effectiveTab = "OTHER_DATABASES";
  } else if (filter.source === "CONSULTANCY") {
    effectiveTab = "MY_FOODS";
  } else if (filter.source === "TACO") {
    effectiveTab = "TREVO_BRASIL";
  }

  if (effectiveTab === "TREVO_BRASIL") {
    // Explicit allowlist: TACO + Approved Commercial Brands + Consultancy custom foods
    // Strictly blocks unknown future sources, unverified brands (AMAFIL), and raw USDA
    const brKeysSql = APPROVED_BR_SOURCE_KEYS.map(() => "?").join(", ");
    if (consultancyId != null) {
      conditions.push(
        `(f.source_key IN (${brKeysSql}) OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ?))`
      );
      params.push(...APPROVED_BR_SOURCE_KEYS, consultancyId);
    } else {
      conditions.push(`f.source_key IN (${brKeysSql})`);
      params.push(...APPROVED_BR_SOURCE_KEYS);
    }

    // Objective data invalidity guard (physical / structural invariants only)
    // NOTE: Atwater heuristic auto-hiding is strictly DISABLED per Phase B1.1 Section 4.
    conditions.push(`NOT ${OBJECTIVE_INVALID_DATA_SQL_CONDITION}`);
  } else if (effectiveTab === "COMMERCIAL") {
    // Verified commercial products only: requires BOTH source_type = 'BRANDED' AND approved commercial source_key
    const commKeysSql = APPROVED_COMMERCIAL_SOURCE_KEYS.map(() => "?").join(", ");
    conditions.push(`(f.source_type = 'BRANDED' AND f.source_key IN (${commKeysSql}))`);
    params.push(...APPROVED_COMMERCIAL_SOURCE_KEYS);
    conditions.push(`NOT ${OBJECTIVE_INVALID_DATA_SQL_CONDITION}`);
  } else if (effectiveTab === "MY_FOODS") {
    // Consultancy custom foods only
    if (consultancyId != null) {
      conditions.push("f.scope = 'CONSULTANCY' AND f.consultancy_id = ?");
      params.push(consultancyId);
    } else {
      conditions.push("f.scope = 'CONSULTANCY' AND 1=0");
    }
  } else if (effectiveTab === "OTHER_DATABASES") {
    // USDA and international databases
    const intlKeysSql = INTERNATIONAL_DATABASE_SOURCE_KEYS.map(() => "?").join(", ");
    conditions.push(`f.source_key IN (${intlKeysSql})`);
    params.push(...INTERNATIONAL_DATABASE_SOURCE_KEYS);
  }

  // Text search tokens
  const queryTokens = filter.query ? tokenizeSearchQuery(filter.query) : [];
  if (queryTokens.length > 0) {
    const tokenGroups = expandSearchTokensWithSynonyms(queryTokens);
    for (const group of tokenGroups) {
      const orClauses: string[] = [];
      for (const variant of group) {
        orClauses.push("(f.normalized_name LIKE ? OR f.normalized_display_name_pt_br LIKE ?)");
        params.push(`%${variant}%`, `%${variant}%`);
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

  const effectiveDisplayName = safeNullableString(r.display_name_pt_br) || name;

  return {
    publicId,
    scope,
    consultancyId,
    name,
    displayNamePtBr: effectiveDisplayName,
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
