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

export interface AlternateFoodSourceProvenance {
  publicId: string;
  sourceKey?: string | null;
  sourceExternalCode?: string | null;
  name: string;
  displayNamePtBr?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}

export interface FoodListItemDto extends Omit<NutritionV2FoodDto, "id"> {
  portionsCount: number;
  canonicalId?: string;
  isCanonicalPrimary?: boolean;
  totalAvailableSources?: number;
  alternativeSources?: AlternateFoodSourceProvenance[];
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

export const APPROVED_BR_SOURCE_KEYS = Object.freeze(["TACO", "IBGE_POF_2008_2009", "GROWTH_SUPPLEMENTS"] as const);
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
  COALESCE(f.calories_kcal, 0) < 0
  OR COALESCE(f.protein_g, 0) < 0
  OR COALESCE(f.carbohydrate_g, 0) < 0
  OR COALESCE(f.fat_g, 0) < 0
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
  candidateSql: string;
  candidateParams: (string | number)[];
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
  // Pães e variações regionais brasileiras
  cacetinho: ["pao frances", "frances"],
  careca: ["frances", "pao frances"],
  // Tubérculos e Raízes (variações regionais inequívocas em PT-BR)
  aipim: ["mandioca", "macaxeira"],
  macaxeira: ["mandioca", "aipim"],
  mandioca: ["aipim", "macaxeira"],

  // Frutas com variações regionais brasileiras
  mexerica: ["tangerina", "bergamota", "mandarina"],
  bergamota: ["tangerina", "mexerica", "mandarina"],
  tangerina: ["mexerica", "bergamota", "mandarina"],
  abacaxi: ["ananas"],

  // Pescados e Óleos em PT-BR
  tilapia: ["peixe de agua doce", "saint peter"],
  azeite: ["azeite de oliva"],

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

    // Phrase-aware handling: pão francês / cacetinho / pão de sal / pão careca
    const hasPao = tokens.some((t) => normalizeSearchText(t) === "pao");
    if (hasPao && (normalized === "sal" || normalized === "careca")) {
      return [token, "frances", "sal", "careca"];
    }
    if (hasPao && normalized === "frances") {
      return [token, "frances", "cacetinho", "sal"];
    }
    if (normalized === "cacetinho") {
      return [token, "cacetinho", "frances"];
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


// ============================================================================
// CLEAN PROFESSIONAL PT-BR FOOD DISPLAY NAME STANDARDIZATION
// ============================================================================

export const EXACT_CANONICAL_NAME_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  // Pães e Farináceos
  "Pão, trigo, francês": "Pão francês",
  "Pão, trigo, forma, integral": "Pão de forma integral",
  "Pão, trigo, sovado": "Pão sovado",
  "Pao de Sal": "Pão francês",
  "Pão francês, cacetinho": "Pão francês",
  "Pao frances, cacetinho": "Pão francês",

  // Queijos e Laticínios
  "Queijo, mozarela": "Muçarela",
  "Queijo, minas, frescal": "Queijo minas frescal",
  "Queijo, minas, meia cura": "Queijo minas meia cura",
  "Queijo, prato": "Queijo prato",
  "Queijo, parmesão": "Queijo parmesão",
  "Queijo, ricota": "Ricota",
  "Queijo, requeijão, cremoso": "Requeijão cremoso",
  "Queijo, pasteurizado": "Queijo pasteurizado",
  "Queijo, petit suisse, morango": "Queijo petit suisse morango",
  "Mussarela": "Muçarela",
  "Mussarela de Bufala": "Muçarela de búfala",
  "Mussarela Light": "Muçarela light",
  "Queijo Mussarela Light": "Queijo muçarela light",
  "Muçarela, mussarela, mozarela": "Muçarela",
  "Soja, queijo (tofu)": "Tofu",

  // Frutas e Tubérculos canônicos
  "Bergamota": "Tangerina",
  "Mexerica": "Tangerina",
  "Tangerina": "Tangerina",
  "Tangerina, mexerica, bergamota": "Tangerina",
  "Aipim": "Mandioca",
  "Macaxeira": "Mandioca",
  "Mandioca": "Mandioca",
  "Mandioca, aipim, macaxeira": "Mandioca",
  // Arroz e Feijão canônicos (preserva neutralidade oficial sem inferir cozido em prep 99)
  "Arroz (polido, Parboilizado, Agulha, Agulhinha, Etc)": "Arroz branco",
  "Arroz Integral": "Arroz integral",
  "Arroz Organico": "Arroz orgânico",
  "Arroz Integral Organico": "Arroz integral orgânico",
  "Feijao (preto, Mulatinho, Roxo, Rosinha, Etc)": "Feijão",
  "Feijao Organico": "Feijão orgânico",
  "Feijao de Corda": "Feijão de corda",
  "Feijao Verde": "Feijão verde",
  "Feijao Verde Organico": "Feijão verde orgânico",
  "Banana (ouro, Prata, D´água, da Terra, Etc)": "Banana",
  "Laranja (pera, Seleta, Lima, da Terra, Etc)": "Laranja",
  "Limao (comum, Galego, Etc)": "Limão",
  "Cha (preto, Camomila, Erva Cidreira, Capim Limao, Etc)": "Chá",
  "Linguica (suína, Bovina, Mista, Etc)": "Linguiça",
});

const ANIMAL_CUTS = [
  "filé",
  "file",
  "peito",
  "coxa",
  "sobrecoxa",
  "asa",
  "coração",
  "coracao",
  "fígado",
  "figado",
  "bisteca",
  "costela",
  "lombo",
  "pernil",
  "posta",
  "moela",
];

const ANIMALS_FOR_CUTS = [
  "frango",
  "abadejo",
  "porco",
  "peru",
  "merluza",
  "pescada",
  "salmão",
  "salmao",
  "bacalhau",
  "cação",
  "cacao",
  "lambari",
  "corvina",
  "peixe",
];

const FEMININE_NOUN_ROOTS = [
  "mandioca",
  "batata",
  "tilápia",
  "tilapia",
  "carne",
  "abóbora",
  "abobora",
  "abobrinha",
  "cenoura",
  "couve",
  "berinjela",
  "beterraba",
  "cebola",
  "banana",
  "maçã",
  "maca",
  "sardinha",
  "pescada",
  "merluza",
  "costela",
  "bisteca",
  "linguiça",
  "linguica",
  "salsicha",
  "coxa",
  "sobrecoxa",
  "asa",
  "moela",
  "fava",
  "ervilha",
  "lentilha",
  "aveia",
  "farinha",
  "tapioca",
  "margarina",
  "manteiga",
  "polpa",
  "geléia",
  "geleia",
];

export function cleanTacoDisplayName(name: string): string {
  let s = name.trim();
  if (EXACT_CANONICAL_NAME_OVERRIDES[s]) {
    return EXACT_CANONICAL_NAME_OVERRIDES[s];
  }

  // Botanical canonical renames
  if (s.startsWith("Mexerica,")) {
    s = s.replace(/^Mexerica,/, "Tangerina,");
  }

  // Strip comma-separated alias lists if present in input
  s = s.replace(/,\s*(?:cacetinho|pão de sal|pao de sal|aipim|macaxeira|mexerica|bergamota|mandarina|mussarela|mozarela)\b/gi, "");

  // Lab duration annotations (e.g. /10minutos in UNICAMP egg protocols)
  s = s.replace(/\/10minutos/gi, "");

  // Slashes and noise cleanup
  s = s.replace(/\//g, " ");

  // Animal Cut Reordering (e.g. "Frango, peito, sem pele, grelhado" -> "Peito de frango sem pele grelhado")
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const p0 = parts[0].toLowerCase();
    const p1 = parts[1].toLowerCase();

    if (ANIMALS_FOR_CUTS.includes(p0)) {
      if (ANIMAL_CUTS.some((c) => p1 === c || p1.startsWith(c + " "))) {
        const cutName = parts[1];
        const animalName = parts[0].toLowerCase();
        const rest = parts.slice(2).join(" ");
        s = `${cutName} de ${animalName}${rest ? " " + rest : ""}`;
        s = s.charAt(0).toUpperCase() + s.slice(1);
        return s.replace(/,/g, "").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
      }
    }

    // Bovine Meat Reordering
    if (p0 === "carne" && p1 === "bovina" && parts.length >= 3) {
      const cutOrName = parts[2];
      const rest = parts.slice(3).join(" ");
      const cutLower = cutOrName.toLowerCase();
      if (cutLower === "seca") {
        s = `Carne seca ${rest ? " " + rest : ""}`;
      } else if (cutLower === "charque") {
        s = `Charque ${rest ? " " + rest : ""}`;
      } else if (["costela", "fígado", "figado", "língua", "lingua", "bucho", "músculo", "musculo"].includes(cutLower)) {
        const adj = ["costela", "língua", "lingua"].includes(cutLower) ? "bovina" : "bovino";
        s = `${cutOrName} ${adj}${rest ? " " + rest : ""}`;
      } else {
        s = `${cutOrName}${rest ? " " + rest : ""}`;
      }
      s = s.charAt(0).toUpperCase() + s.slice(1);
      return s.replace(/,/g, "").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
    }
  }

  // Remove commas, parens, and normalize spaces
  s = s.replace(/,\s*/g, " ").replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  return s;
}

export function cleanIbgeDisplayName(name: string): string {
  let s = name.trim();
  if (EXACT_CANONICAL_NAME_OVERRIDES[s]) {
    return EXACT_CANONICAL_NAME_OVERRIDES[s];
  }

  // 1. Tilápia canonicalization
  if (
    s.includes("(Tilápia, Saint Peter)") ||
    s.includes("Peixe de água doce (Tilápia") ||
    s.includes("Tilápia / Peixe")
  ) {
    s = s.replace(/Peixe de água doce\s*\(Tilápia,\s*Saint Peter\)/gi, "Tilápia");
    s = s.replace(/Tilápia\s*\/\s*Peixe de água doce/gi, "Tilápia");
  }

  // 2. Canonical bread / cheese / fruit / cassava names
  if (/^Pao de Sal\b/i.test(s)) {
    s = s.replace(/^Pao de Sal\b/i, "Pão francês");
  }
  if (/^Mussarela\b/i.test(s)) {
    s = s.replace(/^Mussarela\b/i, "Muçarela");
  }
  if (/^Queijo Mussarela\b/i.test(s)) {
    s = s.replace(/^Queijo Mussarela\b/i, "Queijo muçarela");
  }
  if (/^(Bergamota|Mexerica)\b/i.test(s)) {
    s = s.replace(/^(Bergamota|Mexerica)\b/i, "Tangerina");
  }
  if (/^Aipim\b/i.test(s)) {
    s = s.replace(/^Aipim\b/i, "Mandioca");
  }
  if (/^Macaxeira\b/i.test(s)) {
    s = s.replace(/^Macaxeira\b/i, "Mandioca");
  }
  if (/^Bolo de (Aipim|Macaxeira)/i.test(s)) {
    s = s.replace(/^Bolo de (Aipim|Macaxeira)/i, "Bolo de mandioca");
  }
  if (/^Bolinho de Aipim/i.test(s)) {
    s = s.replace(/^Bolinho de Aipim/i, "Bolinho de mandioca");
  }
  if (/^Folha de (Aipim|Macaxeira)/i.test(s)) {
    s = s.replace(/^Folha de (Aipim|Macaxeira)/i, "Folha de mandioca");
  }

  // 3. Remove parentheses containing alias lists or variant enumerations
  s = s.replace(
    /\s*\([^)]*(?:etc|galego|agulhinha|seleta|mista|camarao|palmito|batata baroa|não especificada|nao especificada|qualquer especie)[^)]*\)/gi,
    ""
  );
  s = s.replace(/\s*\([^)]*,[^)]*\)/g, "");
  s = s.replace(/\s*\((?:não especificada|nao especificada|qualquer especie)\)/gi, "");
  s = s.replace(/\s*\(in natura\)/gi, " in natura");
  s = s.replace(/\s*\(em grao\)/gi, " em grão");

  // Strip remaining single parentheses, retaining inner descriptor text
  s = s.replace(/\s*\(([^)]+)\)/g, " $1");

  // 4. Handle prep state feminine grammatical agreement
  const sLower = s.toLowerCase();
  const isFeminine = FEMININE_NOUN_ROOTS.some((n) => sLower.startsWith(n));

  if (isFeminine) {
    s = s.replace(/,\s*cru$/i, " crua");
    s = s.replace(/,\s*cozido$/i, " cozida");
    s = s.replace(/,\s*assado$/i, " assada");
    s = s.replace(/,\s*grelhado$/i, " grelhada");
    s = s.replace(/,\s*frito$/i, " frita");
    s = s.replace(/,\s*refogado$/i, " refogada");
    s = s.replace(/,\s*ensopado$/i, " ensopada");
    s = s.replace(/,\s*moído$/i, " moída");
    s = s.replace(/,\s*moido$/i, " moída");
  } else {
    s = s.replace(/,\s*cru$/i, " cru");
    s = s.replace(/,\s*cozido$/i, " cozido");
    s = s.replace(/,\s*assado$/i, " assado");
    s = s.replace(/,\s*grelhado$/i, " grelhado");
    s = s.replace(/,\s*frito$/i, " frito");
    s = s.replace(/,\s*refogado$/i, " refogado");
    s = s.replace(/,\s*ensopado$/i, " ensopado");
  }

  // 5. Replace remaining commas, hyphens in batata-inglesa, and slashes
  s = s.replace(/Batata-inglesa/gi, "Batata inglesa");
  s = s.replace(/\//g, " e ");
  s = s.replace(/,\s*/g, " ");
  s = s.replace(/[()]/g, "");
  s = s.replace(/\s+/g, " ").trim();

  // Clean casing: ensure sentence case
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

/**
 * Master food display name cleaner.
 * Strictly preserves source name for non-curated databases (USDA, branded products)
 * while providing pristine, comma-free, alias-separated names for TACO and IBGE.

 */
export function cleanFoodDisplayName(name: string, sourceKey?: string | null): string {
  if (!name || typeof name !== "string") return "";

  if (sourceKey === "TACO" || !sourceKey) {
    return cleanTacoDisplayName(name);
  }

  if (sourceKey === "IBGE_POF_2008_2009" || sourceKey === "IBGE") {
    return cleanIbgeDisplayName(name);
  }
  // For USDA, branded products, or consultancy custom foods:
  // preserve existing name without inventing semantics
  return name.trim();
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
  const orderParams: (string | number)[] = [];

  // Collect canonical search tokens for first token (e.g. aipim -> [aipim, mandioca, macaxeira])
  const primarySearchTokens = [firstToken];
  const synonyms = USER_SEARCH_ALIASES[firstToken] || [];
  for (const syn of synonyms) {
    const norm = normalizeSearchText(syn);
    if (norm && !primarySearchTokens.includes(norm)) {
      primarySearchTokens.push(norm);
    }
  }

  // Tier 1: Exact match normalized PT-BR or canonical alias
  const t1Conditions: string[] = [
    "f.normalized_name = ?",
    "f.normalized_name = ?",
    "COALESCE(f.normalized_display_name_pt_br, '') = ?",
    "COALESCE(f.normalized_display_name_pt_br, '') = ?"
  ];
  orderParams.push(normalizedQuery, cleanQuery, normalizedQuery, cleanQuery);

  for (const tok of primarySearchTokens.slice(1)) {
    t1Conditions.push("COALESCE(f.normalized_display_name_pt_br, '') = ?");
    orderParams.push(tok);
  }

  // Tier 2: Sequence starts with first token or canonical alias as distinct word or phrase
  const tier2Conditions: string[] = [];
  if (queryTokens.length >= 2) {
    const t0 = queryTokens[0];
    const t1 = queryTokens[1];
    const s0 = getWordStem(t0);
    tier2Conditions.push(
      "f.normalized_name LIKE ?", "f.normalized_name LIKE ?",
      "f.normalized_name LIKE ?", "f.normalized_name LIKE ?",
      "f.normalized_name LIKE ?", "f.normalized_name LIKE ?",
      "COALESCE(f.normalized_display_name_pt_br, '') LIKE ?",
      "COALESCE(f.normalized_display_name_pt_br, '') LIKE ?"
    );
    orderParams.push(
      `${t0}, %${t1}%`, `${t0} %${t1}%`,
      `${s0}, %${t1}%`, `${s0}s, %${t1}%`,
      `${t1}, %${t0}%`, `${t1} %${t0}%`,
      `${t0} %${t1}%`, `${t1} %${t0}%`
    );
  } else {
    for (const tok of primarySearchTokens) {
      const stem = getWordStem(tok);
      tier2Conditions.push(
        "f.normalized_name LIKE ?", "f.normalized_name LIKE ?", "f.normalized_name LIKE ?",
        "COALESCE(f.normalized_display_name_pt_br, '') LIKE ?", "COALESCE(f.normalized_display_name_pt_br, '') LIKE ?"
      );
      orderParams.push(`${tok},%`, `${stem},%`, `${tok} %`, `${tok},%`, `${tok} %`);
    }
  }

  // Tier 3: Primary noun prefix matching
  const tier3Conditions: string[] = [];
  for (const tok of primarySearchTokens) {
    tier3Conditions.push(
      "f.normalized_name LIKE ?",
      "COALESCE(f.normalized_display_name_pt_br, '') LIKE ?"
    );
    orderParams.push(`${tok}%`, `${tok}%`);
  }

  const tenancyOrder = isUnified ? `CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC,` : "";

  // Category detection for contextual culinary preparation ranking
  const isGrainQuery = queryTokens.some((t) =>
    ["arroz", "aveia", "milho", "quinoa", "cevada", "trigo", "centeio"].includes(t)
  );
  const isLegumeQuery = queryTokens.some((t) =>
    ["feijao", "feijão", "lentilha", "grao", "grão", "ervilha", "fava", "soja"].includes(t)
  );
  const isTuberQuery = queryTokens.some((t) =>
    ["mandioca", "aipim", "macaxeira", "batata", "inhame", "cara", "cará"].includes(t)
  );
  const isFruitQuery = queryTokens.some((t) =>
    [
      "banana", "maca", "maçã", "laranja", "abacaxi", "manga", "mamao", "mamão",
      "uva", "melancia", "melao", "melão", "morango", "pera", "pêra", "tangerina",
      "mexerica", "bergamota", "goiaba", "abacate", "limao", "limão", "maracuja", "maracujá"
    ].includes(t)
  );
  const isMeatOrPoultryQuery = queryTokens.some((t) =>
    [
      "frango", "galinha", "carne", "bife", "alcatra", "patinho", "maminha", "picanha",
      "peixe", "tilapia", "tilápia", "salmao", "salmão", "atum", "bacalhau", "pescada",
      "merluza", "porco", "lombo", "pernil", "costela"
    ].includes(t)
  );
  const isEggQuery = queryTokens.some((t) =>
    ["ovo", "ovos"].includes(t)
  );
  const isMilkQuery = queryTokens.some((t) => ["milk", "leite"].includes(t));
  const hasCheeseOrYogurtQuery = queryTokens.some((t) =>
    ["cheese", "queijo", "yogurt", "iogurte", "ricota", "ricotta"].includes(t)
  );
  const isBreadQuery = queryTokens.some((t) => ["bread", "pao", "pão"].includes(t));
  const isYogurtQuery = queryTokens.some((t) => ["yogurt", "iogurte"].includes(t));

  const hasCookingKeyword = queryTokens.some((t) =>
    [
      "cozido", "cozida", "assado", "assada", "grelhado", "grelhada", "frito", "frita",
      "cru", "crua", "refogado", "refogada", "ensopado", "ensopada", "empanado", "empanada",
      "cooked", "boiled", "baked", "roasted", "grilled", "fried", "raw"
    ].includes(t)
  );

  const orderClause = `ORDER BY
    ${tenancyOrder}
    CASE
      -- Tier 1: Exact match normalized PT-BR or canonical alias
      WHEN ${t1Conditions.join(" OR ")} THEN 1
      -- Tier 2: Sequence starts with first token or canonical alias
      WHEN ${tier2Conditions.join(" OR ")} THEN 2
      -- Tier 3: Prefix matching on primary noun
      WHEN ${tier3Conditions.join(" OR ")} THEN 3
      ELSE 4
    END ASC,
    -- Category-aware culinary preparation ranking
    CASE
      -- Grains (arroz, etc.): cooked everyday form ranks before raw or recipes
      WHEN (${isGrainQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN f.normalized_name LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%' THEN 1
          WHEN f.normalized_name LIKE '%cru%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%' THEN 2
          ELSE 3
        END
      -- Legumes (feijão, etc.): cooked everyday bean ranks before raw or recipes; staple carioca/preto first
      WHEN (${isLegumeQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN (f.normalized_name LIKE '%carioca%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%carioca%')
            AND (f.normalized_name LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%') THEN 1
          WHEN (f.normalized_name LIKE '%preto%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%preto%')
            AND (f.normalized_name LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%') THEN 2
          WHEN f.normalized_name LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%' THEN 3
          WHEN f.normalized_name LIKE '%cru%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%' THEN 4
          ELSE 5
        END
      -- Tubers & Roots (mandioca, aipim, macaxeira, batata): plain cooked/baked ranks before fried or recipes/soups
      WHEN (${isTuberQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN f.normalized_name LIKE '%cozida%' OR f.normalized_name LIKE '%cozido%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozida%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%' THEN 1
          WHEN f.normalized_name LIKE '%assada%' OR f.normalized_name LIKE '%assado%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assada%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assado%' THEN 2
          WHEN f.normalized_name LIKE '%crua%' OR f.normalized_name LIKE '%cru%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%crua%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%' THEN 3
          WHEN f.normalized_name LIKE '%frita%' OR f.normalized_name LIKE '%frito%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%frita%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%frito%' THEN 4
          ELSE 5
        END
      -- Fruits: fresh/raw in natura fruit ranks before cooked/processed recipes/sweets
      WHEN (${isFruitQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN f.normalized_name LIKE '%crua%' OR f.normalized_name LIKE '%cru%' OR f.normalized_name LIKE '%in natura%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%crua%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%in natura%' THEN 1
          WHEN f.normalized_name LIKE '%cozida%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozida%' THEN 2
          WHEN f.normalized_name LIKE '%doce%' OR f.normalized_name LIKE '%bolo%' OR f.normalized_name LIKE '%farofa%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%doce%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%bolo%' THEN 4
          ELSE 3
        END
      -- Meats & Poultry: plain cooked/grilled/roasted ranks before raw or complex recipes
      WHEN (${isMeatOrPoultryQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN (f.normalized_name LIKE '%grelhado%' OR f.normalized_name LIKE '%grelhada%'
            OR f.normalized_name LIKE '%cozido%' OR f.normalized_name LIKE '%cozida%'
            OR f.normalized_name LIKE '%assado%' OR f.normalized_name LIKE '%assada%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%grelhado%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%grelhada%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozida%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assado%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assada%')
            AND (f.normalized_name LIKE '%sem pele%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%sem pele%') THEN 1
          WHEN f.normalized_name LIKE '%grelhado%' OR f.normalized_name LIKE '%grelhada%'
            OR f.normalized_name LIKE '%cozido%' OR f.normalized_name LIKE '%cozida%'
            OR f.normalized_name LIKE '%assado%' OR f.normalized_name LIKE '%assada%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%grelhado%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%grelhada%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozida%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assado%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%assada%' THEN 2
          WHEN f.normalized_name LIKE '%cru%' OR f.normalized_name LIKE '%crua%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%crua%' THEN 3
          WHEN f.normalized_name LIKE '%frito%' OR f.normalized_name LIKE '%frita%' OR f.normalized_name LIKE '%milanesa%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%frito%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%frita%' THEN 4
          ELSE 5
        END
      -- Eggs: prepared whole chicken eggs rank before raw, and before quail eggs
      WHEN (${isEggQuery && !hasCookingKeyword ? "1=1" : "1=0"}) THEN
        CASE
          WHEN (f.normalized_name LIKE '%galinha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%galinha%')
            AND (f.normalized_name LIKE '%cozido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cozido%') THEN 1
          WHEN (f.normalized_name LIKE '%galinha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%galinha%')
            AND (f.normalized_name LIKE '%frito%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%frito%'
                 OR f.normalized_name LIKE '%mexido%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%mexido%'
                 OR f.normalized_name LIKE '%poch%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%poch%') THEN 2
          WHEN (f.normalized_name LIKE '%galinha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%galinha%')
            AND (f.normalized_name LIKE '%cru%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cru%') THEN 3
          WHEN f.normalized_name LIKE '%galinha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%galinha%' THEN 4
          WHEN f.normalized_name LIKE '%codorna%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%codorna%' THEN 5
          ELSE 6
        END
      ELSE 1
    END ASC,
    -- Cultivar priority for legumes when no specific cultivar is queried
    CASE
      WHEN (${isLegumeQuery && !queryTokens.some((t) => ["jalo", "fradinho", "rajado", "branco", "corda", "verde", "soja"].includes(t)) ? "1=1" : "1=0"}) THEN
        CASE
          WHEN f.normalized_name LIKE '%carioca%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%carioca%' THEN 1
          WHEN f.normalized_name LIKE '%preto%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%preto%' THEN 2
          ELSE 3
        END
      ELSE 1
    END ASC,
    -- Meats & Poultry: main muscle cuts rank before offal/viscera (unless specifically queried)
    CASE
      WHEN (${isMeatOrPoultryQuery && !queryTokens.some((t) => ["figado", "fígado", "coracao", "coração", "moela", "bucho", "lingua", "língua"].includes(t)) ? "1=1" : "1=0"}) THEN
        CASE
          WHEN f.normalized_name LIKE '%peito%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%peito%'
            OR f.normalized_name LIKE '%file%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%file%'
            OR f.normalized_name LIKE '%filé%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%filé%' THEN 1
          WHEN f.normalized_name LIKE '%coxa%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%coxa%'
            OR f.normalized_name LIKE '%sobrecoxa%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%sobrecoxa%'
            OR f.normalized_name LIKE '%carne%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%carne%'
            OR f.normalized_name LIKE '%inteiro%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%inteiro%' THEN 2
          WHEN f.normalized_name LIKE '%figado%' OR f.normalized_name LIKE '%coracao%' OR f.normalized_name LIKE '%moela%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%figado%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%cora%'
            OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%moela%' THEN 4
          ELSE 3
        END
      ELSE 1
    END ASC,
    -- Chicken egg priority over quail egg even when preparation keyword is present
    CASE
      WHEN (${isEggQuery ? "1=1" : "1=0"}) THEN
        CASE
          WHEN (f.normalized_name LIKE '%galinha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%galinha%') THEN 1
          WHEN (f.normalized_name LIKE '%codorna%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%codorna%') THEN 2
          ELSE 3
        END
      ELSE 1
    END ASC,
    -- Prioritize direct milk foods over dairy derivatives when querying milk / leite
    CASE
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (f.normalized_name LIKE 'leite%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE 'leite%') THEN 1
      WHEN (${isMilkQuery && !hasCheeseOrYogurtQuery ? "1=1" : "1=0"})
        AND (f.normalized_name LIKE 'queijo%' OR f.normalized_name LIKE 'iogurte%'
             OR COALESCE(f.normalized_display_name_pt_br, '') LIKE 'queijo%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE 'iogurte%') THEN 3
      ELSE 2
    END ASC,
    -- Prioritize plain / white / whole wheat bread over nut / fruit bread when querying bread
    CASE
      WHEN (${isBreadQuery ? "1=1" : "1=0"})
        AND (f.normalized_name LIKE '%castanha%' OR f.normalized_name LIKE '%nozes%' OR f.normalized_name LIKE '%passas%'
             OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%castanha%' OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%nozes%') THEN 3
      ELSE 1
    END ASC,
    -- Prioritize plain yogurt over sugary / fruit-flavored yogurt
    CASE
      WHEN (${isYogurtQuery ? "1=1" : "1=0"})
        AND (f.normalized_name LIKE '%morango%' OR f.normalized_name LIKE '%coco%' OR f.normalized_name LIKE '%mel%'
             OR COALESCE(f.normalized_display_name_pt_br, '') LIKE '%morango%') THEN 3
      ELSE 1
    END ASC,
    -- Prioritize analytical laboratory direct data & survey recipe data quality
    CASE
      WHEN f.source_key = 'TACO' THEN 1
      WHEN f.source_key = 'IBGE_POF_2008_2009' THEN 2
      WHEN f.source_key = 'IBGE' THEN 2
      WHEN f.source_key = 'USDA_FOUNDATION' THEN 3
      WHEN f.source_key = 'USDA_FNDDS' THEN 4
      ELSE 5
    END ASC,
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
    f.display_name_pt_br,
    f.normalized_display_name_pt_br,
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

  const candidateSql = `SELECT
    ${coreFields},
    ${portionsSubquery}
  FROM nutrition_v2_foods f
  WHERE ${whereClause}
  ${orderClause}`;
  const candidateParams: (string | number)[] = [...params, ...orderParams];

  return {
    fullSql,
    candidateSql,
    candidateParams,
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

  const rawDisplayName = safeNullableString(r.display_name_pt_br);
  const cleanedDisplay = cleanFoodDisplayName(rawDisplayName || name, sourceKey);
  const effectiveDisplayName = cleanedDisplay || name;

  return {
    publicId,
    scope,
    consultancyId,
    name,
    displayNamePtBr: effectiveDisplayName,
    normalizedDisplayNamePtBr: normalizeSearchText(effectiveDisplayName),
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

// ============================================================================
// CANONICAL RESULT GROUPING & MULTI-SOURCE CONSOLIDATION (PHASE B2A.3)
// ============================================================================

export function getBaseCanonicalIdentity(item: {
  name: string;
  displayNamePtBr?: string | null;
  sourceKey?: string | null;
}): string {
  const display = (item.displayNamePtBr || item.name || "").trim().toLowerCase();
  const normalizedDisplay = normalizeSearchText(display);

  let prep = "default";
  if (/\b(?:frit[ao]|frito)\b/i.test(normalizedDisplay)) prep = "frita";
  else if (/\b(?:cozid[ao]|cozido)\b/i.test(normalizedDisplay)) prep = "cozida";
  else if (/\b(?:assad[ao]|assado)\b/i.test(normalizedDisplay)) prep = "assada";
  else if (/\b(?:grelhad[ao]|grelhado)\b/i.test(normalizedDisplay)) prep = "grelhada";
  else if (/\b(?:refogad[ao]|refogado)\b/i.test(normalizedDisplay)) prep = "refogada";
  else if (/\b(?:ensopad[ao]|ensopado)\b/i.test(normalizedDisplay)) prep = "ensopada";
  else if (/\b(?:cru[a]?)\b/i.test(normalizedDisplay)) prep = "crua";
  else if (/\b(?:ao molho vermelho)\b/i.test(normalizedDisplay)) prep = "ao_molho_vermelho";
  else if (/\b(?:ao molho branco)\b/i.test(normalizedDisplay)) prep = "ao_molho_branco";
  else if (/\b(?:com manteiga e oleo|com manteiga\/oleo)\b/i.test(normalizedDisplay)) prep = "com_manteiga_oleo";
  else if (/\b(?:sopa)\b/i.test(normalizedDisplay)) prep = "sopa";

  return `${normalizedDisplay}::${prep}`;
}

export function getCanonicalFoodKey(item: {
  name: string;
  displayNamePtBr?: string | null;
  sourceKey?: string | null;
  scope?: string | null;
  consultancyId?: string | number | null;
}): string {
  const baseKey = getBaseCanonicalIdentity(item);
  if (item.scope === "CONSULTANCY" && item.consultancyId != null) {
    return `tenant:${item.consultancyId}::${baseKey}`;
  }
  return baseKey;
}

export function getCanonicalSourcePriority(item: { scope?: string; sourceKey?: string | null }): number {
  if (item.scope === "CONSULTANCY") return 1;
  if (item.sourceKey === "TACO") return 2;
  if (item.sourceKey === "IBGE_POF_2008_2009" || item.sourceKey === "IBGE") return 3;
  if (item.sourceKey === "GROWTH_SUPPLEMENTS") return 4;
  return 5;
}

export function groupCanonicalFoods(items: FoodListItemDto[]): FoodListItemDto[] {
  if (!items || items.length === 0) return [];

  interface CanonicalGroup {
    primary: FoodListItemDto;
    alts: AlternateFoodSourceProvenance[];
    tenantId: string | null;
    baseKey: string;
  }

  const groups: CanonicalGroup[] = [];

  for (const item of items) {
    const baseKey = getBaseCanonicalIdentity(item);
    const itemTenant =
      item.scope === "CONSULTANCY" && item.consultancyId != null
        ? String(item.consultancyId)
        : null;

    let targetGroup: CanonicalGroup | undefined;

    // Find compatible canonical group
    for (const g of groups) {
      if (g.baseKey === baseKey) {
        if (itemTenant == null) {
          // Global food: joins existing group matching baseKey (prefer exact global group)
          if (g.tenantId == null || !targetGroup) {
            targetGroup = g;
            if (g.tenantId == null) break;
          }
        } else {
          // Consultancy food: must match same tenant, or merge with a purely global group
          if (g.tenantId === itemTenant) {
            targetGroup = g;
            break;
          } else if (g.tenantId == null && !targetGroup) {
            targetGroup = g;
          }
        }
      }
    }

    if (!targetGroup) {
      const canonicalId = itemTenant ? `tenant:${itemTenant}::${baseKey}` : baseKey;
      const newGroup: CanonicalGroup = {
        primary: {
          ...item,
          canonicalId,
          isCanonicalPrimary: true,
          totalAvailableSources: 1,
          alternativeSources: [],
        },
        alts: [],
        tenantId: itemTenant,
        baseKey,
      };
      groups.push(newGroup);
    } else {
      if (itemTenant != null && targetGroup.tenantId == null) {
        targetGroup.tenantId = itemTenant;
      }

      const currentPriority = getCanonicalSourcePriority(targetGroup.primary);
      const newPriority = getCanonicalSourcePriority(item);

      const altRecord: AlternateFoodSourceProvenance = {
        publicId: item.publicId,
        sourceKey: item.sourceKey,
        sourceExternalCode: item.sourceExternalCode,
        name: item.name,
        displayNamePtBr: item.displayNamePtBr,
        caloriesKcal: item.caloriesKcal,
        proteinG: item.proteinG,
        carbohydrateG: item.carbohydrateG,
        fatG: item.fatG,
        fiberG: item.fiberG,
      };

      if (newPriority < currentPriority) {
        const oldPrimaryAlt: AlternateFoodSourceProvenance = {
          publicId: targetGroup.primary.publicId,
          sourceKey: targetGroup.primary.sourceKey,
          sourceExternalCode: targetGroup.primary.sourceExternalCode,
          name: targetGroup.primary.name,
          displayNamePtBr: targetGroup.primary.displayNamePtBr,
          caloriesKcal: targetGroup.primary.caloriesKcal,
          proteinG: targetGroup.primary.proteinG,
          carbohydrateG: targetGroup.primary.carbohydrateG,
          fatG: targetGroup.primary.fatG,
          fiberG: targetGroup.primary.fiberG,
        };
        targetGroup.alts.push(oldPrimaryAlt);
        const canonicalId = targetGroup.tenantId ? `tenant:${targetGroup.tenantId}::${baseKey}` : baseKey;
        targetGroup.primary = {
          ...item,
          canonicalId,
          isCanonicalPrimary: true,
          totalAvailableSources: targetGroup.alts.length + 1,
          alternativeSources: [...targetGroup.alts],
        };
      } else {
        targetGroup.alts.push(altRecord);
        targetGroup.primary.totalAvailableSources = targetGroup.alts.length + 1;
        targetGroup.primary.alternativeSources = [...targetGroup.alts];
      }
    }
  }

  return groups.map((g) => g.primary);
}
