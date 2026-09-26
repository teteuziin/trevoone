/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * FOOD SEARCH, TOKENIZATION, SYNONYMS & RANKING
 *
 * Pure utility functions for normalizing food search terms, extracting
 * tokens, expanding regional Brazilian synonyms, and computing SQL ranking clauses.
 * No direct database dependencies — fully testable in any runtime.
 */

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
export const COMMON_FOOD_SYNONYMS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // Tubérculos e Raízes (variações regionais inequívocas e tradução direta)
  aipim: ["mandioca", "macaxeira", "cassava"],
  macaxeira: ["mandioca", "aipim", "cassava"],
  mandioca: ["aipim", "macaxeira", "cassava"],
  inhame: ["yam"],
  batata: ["potato"],

  // Frutas com variações regionais inequívocas e tradução direta
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

  // Carnes bovinas e cortes específicos (apenas nomes equivalentes do mesmo corte exato)
  alcatra: ["top sirloin"],
  mignon: ["file mignon", "tenderloin"],
  acem: ["chuck"],
  contrafile: ["strip steak"],
  picanha: ["sirloin cap"],
  fraldinha: ["flank steak"],
  costela: ["rib", "ribs"],

  // Aves e Ovos
  frango: ["chicken"],
  sobrecoxa: ["thigh"],
  coxa: ["drumstick"],
  ovo: ["egg"],
  clara: ["egg white"],
  gema: ["egg yolk"],

  // Peixes e Frutos do Mar
  peixe: ["fish"],
  salmao: ["salmon"],
  atum: ["tuna"],
  bacalhau: ["cod"],
  camarao: ["shrimp", "prawn"],

  // Suplementos, Grãos e Cereais
  whey: ["soro de leite", "whey protein"],
  creatina: ["creatine"],
  aveia: ["oat", "oats"],
  arroz: ["rice"],
  feijao: ["bean", "beans"],
  lentilha: ["lentil"],
  chia: ["chia seed"],
  linhaca: ["flaxseed"],

  // Laticínios e Derivados
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

  // Pastas e cremes (descoberta segura de pasta de amendoim <-> creme de amendoim)
  pasta: ["creme", "massa", "paste"],
  creme: ["pasta", "cream"],

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
  // Tubérculos e féculas brasileiras (mapeamento específico sem contaminação categórica)
  inglesa: ["russet"],
  // Pães e grãos
  frances: ["francesa", "pao frances"],
  francesa: ["frances", "pao frances"],
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

export function buildFoodSearchOrderClause(
  query: string,
  queryTokens: string[],
  isUnified = true
): { orderClause: string; orderParams: (string | number)[] } {
  if (!queryTokens || queryTokens.length === 0) {
    const defaultOrder = isUnified
      ? `ORDER BY CASE WHEN f.scope = 'CONSULTANCY' THEN 0 ELSE 1 END ASC, COALESCE(f.display_name_pt_br, f.name) ASC`
      : `ORDER BY COALESCE(f.display_name_pt_br, f.name) ASC`;
    return { orderClause: defaultOrder, orderParams: [] };
  }

  const normalizedQuery = normalizeSearchText(query);
  const cleanQuery = queryTokens.join(" ");
  const firstToken = queryTokens[0] || "";
  const firstStem = getWordStem(firstToken);
  const orderParams: (string | number)[] = [];

  const targetCol = "COALESCE(f.normalized_display_name_pt_br, f.normalized_name)";

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
  const isRiceQuery = queryTokens.some((t) => ["arroz", "rice"].includes(t));
  const isSweetPotatoQuery = queryTokens.includes("batata") && queryTokens.includes("doce");
  const isBatataInglesaQuery = queryTokens.includes("batata") && queryTokens.includes("inglesa");
  const isGomaTapiocaQuery = queryTokens.includes("goma") && queryTokens.includes("tapioca");
  const hasGrowthQuery = queryTokens.includes("growth");
  const isCouscousQuery = queryTokens.some((t) => ["cuscuz", "couscous"].includes(t));
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
    -- Prioritize national Brazilian staple preparations when querying common staples
    CASE
      WHEN (${isRiceQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'arroz, tipo 1%' OR ${targetCol} LIKE 'arroz, integral%' OR ${targetCol} LIKE 'arroz integral%' OR ${targetCol} LIKE 'arroz branco%') THEN 1
      WHEN (${isRiceQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'arroz%' AND (${targetCol} LIKE '%preto%' OR ${targetCol} LIKE '%vermelho%' OR ${targetCol} LIKE '%selvagem%')) THEN 3
      ELSE 2
    END ASC,
    -- Prioritize verified branded manufacturer products when branded term is queried
    CASE
      WHEN (${hasGrowthQuery ? "1=1" : "1=0"})
        AND (f.brand = 'Growth Supplements' OR ${targetCol} LIKE 'growth%' OR f.normalized_name LIKE 'growth%') THEN 1
      ELSE 2
    END ASC,
    -- Prioritize hydrated tapioca gum over buttered/dessert preparations
    CASE
      WHEN (${isGomaTapiocaQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%hidratada%' OR ${targetCol} LIKE '%massa para tapioca%') THEN 1
      WHEN (${isGomaTapiocaQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%manteiga%' OR ${targetCol} LIKE '%bala de goma%' OR ${targetCol} LIKE '%pudim%') THEN 9
      ELSE 2
    END ASC,
    -- Specific potato rankings
    CASE
      WHEN (${isSweetPotatoQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'batata, doce%' OR ${targetCol} LIKE 'batata doce%') THEN 1
      WHEN (${isSweetPotatoQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%inglesa%') THEN 9
      ELSE 2
    END ASC,
    CASE
      WHEN (${isBatataInglesaQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%inglesa%' OR f.normalized_name LIKE '%inglesa%') THEN 1
      WHEN (${isBatataInglesaQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%russet%' OR f.normalized_name LIKE '%russet%') THEN 2
      WHEN (${isBatataInglesaQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE '%doce%' OR f.normalized_name LIKE '%sweet%' OR ${targetCol} LIKE '%baroa%') THEN 9
      ELSE 3
    END ASC,
    CASE
      WHEN (${isCouscousQuery ? "1=1" : "1=0"})
        AND (${targetCol} LIKE 'cuscuz, de milho%' OR ${targetCol} LIKE 'cuscuz de milho%') THEN 1
      ELSE 2
    END ASC,
    -- Prioritize Brazilian national sources (TACO, BRANDED, GROWTH, AMAFIL)
    CASE
      WHEN f.source_type IN ('TACO', 'BRANDED') OR f.source_key LIKE 'TACO%' OR f.source_key LIKE 'GROWTH%' OR f.source_key LIKE 'AMAFIL%' THEN 1
      WHEN f.data_quality = 'ANALYTICAL_GOLD' THEN 2
      WHEN f.data_quality = 'SURVEY_RECIPE' THEN 3
      ELSE 4
    END ASC,
    -- Prioritize analytical laboratory direct data & survey recipe data quality
    CASE
      WHEN f.data_quality = 'ANALYTICAL_GOLD' THEN 1
      WHEN f.data_quality = 'SURVEY_RECIPE' THEN 2
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
export function getDataQualityBadgeInfo(dataQuality?: string | null): DataQualityBadgeInfo | null {
  if (!dataQuality) return null;
  if (dataQuality === "MANUFACTURER_VERIFIED") {
    return {
      label: "Rótulo oficial",
      title: "Valores obtidos diretamente da tabela nutricional oficial do fabricante",
      variant: "analytical",
    };
  }
  if (dataQuality === "ANALYTICAL_GOLD") {
    return {
      label: "Dados analíticos",
      title: "Valores obtidos por análise laboratorial direta (USDA Foundation)",
      variant: "analytical",
    };
  }
  if (dataQuality === "SURVEY_RECIPE") {
    return {
      label: "Dados de inquérito",
      title: "Valores obtidos por inquérito nutricional (USDA FNDDS)",
      variant: "survey",
    };
  }
  // LEGACY_REFERENCE, CONSULTANCY_CUSTOM, UNCLASSIFIED and others receive neutral/standard display
  return null;
}
