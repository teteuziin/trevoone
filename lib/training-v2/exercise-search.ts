/**
 * TREVO ONE — EXERCISE SEARCH & ALIAS RANKING ENGINE
 * 
 * Multi-tier tolerant search:
 * 1. Exact name match (Rank 1)
 * 2. Exact alias match (Rank 2)
 * 3. Strong token/word match across words (Rank 3)
 * 4. Fuzzy / Levenshtein typo match (Rank 4)
 * 5. Related attribute match (Equipment / Muscle group) (Rank 5)
 * 
 * Fast, deterministic, server-side evaluated across full authorized catalog.
 */

import type { ExerciseItemDto } from "./types";
import { stemPortugueseWord } from "./exercise-similarity";

export type SearchMatchType =
  | "EXACT_NAME"
  | "EXACT_ALIAS"
  | "STRONG_WORDS"
  | "FUZZY_TYPO"
  | "ATTRIBUTE"
  | "PARTIAL";

export interface RankedExerciseResult {
  exercise: ExerciseItemDto;
  relevanceScore: number;
  matchType: SearchMatchType;
  matchedAlias?: string;
  matchReason?: string;
}

const STOP_WORDS = new Set([
  "de", "do", "da", "dos", "das", "com", "em", "no", "na", "para", "e", "a", "o", "ao", "aos", "as", "um", "uma"
]);

/**
 * Normalizes text for search indexing and matching:
 * - strips accents/diacritics
 * - lowercases
 * - strips non-alphanumeric punctuation
 * - collapses whitespace
 */
export function normalizeSearchQuery(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes text into search tokens, filtering stop words and applying Portuguese stemming.
 */
export function tokenizeSearchText(text: string): string[] {
  const normalized = normalizeSearchQuery(text);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const aLen = a.length;
  const bLen = b.length;

  // Swap to save memory
  if (aLen > bLen) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const prevRow: number[] = new Array(a.length + 1);
  const currRow: number[] = new Array(a.length + 1);

  for (let i = 0; i <= a.length; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= b.length; j++) {
    currRow[0] = j;
    const bChar = b[j - 1];

    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === bChar ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1,      // insertion
        prevRow[i] + 1,          // deletion
        prevRow[i - 1] + cost    // substitution
      );
    }

    // Copy curr to prev
    for (let i = 0; i <= a.length; i++) {
      prevRow[i] = currRow[i];
    }
  }

  return prevRow[a.length];
}

/**
 * Returns true if candidate token matches target token with acceptable typo tolerance.
 * Tolerance:
 * - len < 4: exact only
 * - 4 <= len <= 6: distance <= 1
 * - len >= 7: distance <= 2
 */
export function isFuzzyTokenMatch(tokenA: string, tokenB: string): { match: boolean; distance: number } {
  if (tokenA === tokenB) return { match: true, distance: 0 };
  const stemA = stemPortugueseWord(tokenA);
  const stemB = stemPortugueseWord(tokenB);
  if (stemA === stemB) return { match: true, distance: 0 };

  const minLen = Math.min(tokenA.length, tokenB.length);
  const maxDistance = minLen >= 7 ? 2 : minLen >= 4 ? 1 : 0;
  if (maxDistance === 0) return { match: false, distance: 99 };

  // Quick length filter
  if (Math.abs(tokenA.length - tokenB.length) > maxDistance) {
    return { match: false, distance: 99 };
  }

  const dist = levenshteinDistance(stemA, stemB);
  return { match: dist <= maxDistance, distance: dist };
}

/**
 * Curated knowledge base of common Brazilian gym nicknames and popular aliases.
 * Applied in memory as well as for DB search when aliases table is populated.
 */
export const POPULAR_EXERCISE_ALIASES: Record<string, string[]> = {
  "cadeira extensora": ["extensora", "extensora pernas", "extensao de pernas", "extensao de joelho", "extensao perna"],
  "cadeira flexora": ["flexora", "flexora sentada", "flexao de pernas", "flexao perna"],
  "mesa flexora": ["flexora", "flexora deitada", "mesa de pernas", "flexao deitada"],
  "leg press 45": ["leg", "leg 45", "leg press", "legpress", "leg 45 graus", "leg press 45 graus"],
  "leg press horizontal": ["leg horizontal", "leg reto", "leg sentado"],
  "supino reto com barra": ["supino reto", "supino barra", "supino", "supino reto na barra", "supino horizontal"],
  "supino reto com halteres": ["supino reto", "supino halter", "supino halteres", "supino reto no halter", "supino com halteres"],
  "supino inclinado com barra": ["inclinado", "supino inclinado", "supino inclinado barra", "supino inclinado na barra"],
  "supino inclinado com halteres": ["inclinado", "supino inclinado", "supino inclinado halter", "supino inclinado halteres", "inclinado com halteres"],
  "supino declinado com barra": ["declinado", "supino declinado", "supino declinado barra", "canadense"],
  "supino declinado com halteres": ["declinado", "supino declinado", "supino declinado halter", "supino declinado halteres"],
  "puxada frontal": ["puxada", "puxador costas", "lat pulldown", "pulley frente", "puxada aberta", "puxador aberto"],
  "puxada alta": ["puxada", "puxador costas", "lat pulldown", "pulley costas", "puxada triangulo"],
  "remada curvada": ["remada", "barbell row", "remada barra", "remada curvada barra", "remada livre"],
  "remada baixa": ["pulley baixo", "remada sentada", "remada cabo", "remada polia", "remada no cabo"],
  "remada unilateral": ["remada serrote", "serrote", "remada halter", "remada unilateral com halter"],
  "desenvolvimento com halteres": ["desenvolvimento", "shoulder press", "desenvolvimento halteres", "desenvolvimento ombros", "press halteres"],
  "desenvolvimento com barra": ["desenvolvimento militar", "ohp", "overhead press", "militar", "desenvolvimento barra"],
  "elevacao lateral": ["lateral", "abducao de ombros", "abducao lateral", "elevacao lateral halteres", "abducao"],
  "elevacao frontal": ["frontal", "elevacao frontal halteres", "flexao de ombros"],
  "crucifixo reto": ["crucifixo", "fly", "crucifixo halteres", "crucifixo no banco"],
  "crucifixo invertido": ["crucifixo inverso", "peck deck reverso", "voador invertido", "deltoide posterior"],
  "peck deck": ["voador", "borboleta", "voador peitoral", "crucifixo maquina"],
  "voador": ["peck deck", "borboleta", "voador peitoral", "crucifixo maquina"],
  "triceps corda": ["corda", "triceps polia corda", "corda pulley", "triceps polia"],
  "triceps testa": ["testa", "skull crusher", "triceps testa barra w", "testa halteres", "triceps frances barra"],
  "triceps frances": ["frances", "triceps frances halter", "frances bilateral"],
  "triceps banco": ["mergulho banco", "triceps mergulho", "banco triceps"],
  "rosca direta": ["biceps barra", "biceps direto", "rosca barra", "rosca barra w", "rosca direta com barra"],
  "rosca martelo": ["martelo", "hammer curl", "biceps martelo", "rosca martelo com halteres"],
  "rosca scott": ["scott", "banco scott", "preacher curl", "rosca preacher"],
  "rosca concentrada": ["concentrada", "concentrado", "biceps concentrado", "rosca concentrada com halter"],
  "stiff": ["stiff com halteres", "stiff com barra", "levantamento stiff", "stiff barra"],
  "levantamento terra": ["terra", "deadlift", "levantamento terra com barra"],
  "agachamento livre": ["agacho", "squat", "agachamento com barra", "agachamento barra", "agachamento back squat"],
  "agachamento smith": ["agachamento guiado", "smith", "agacho smith"],
  "agachamento sumô": ["sumo", "agacho sumo", "agachamento pernas abertas", "agachamento sumo com halter"],
  "agachamento bulgaro": ["bulgaro", "bulgarian split squat", "afundo bulgaro"],
  "afundo": ["lunge", "passada", "avanco", "afundo com halteres"],
  "passada": ["lunge", "afundo", "avanco", "passada caminhando"],
  "elevacao pelvica": ["hip thrust", "elevacao de quadril", "ponte de gluteos", "pelvica"],
  "abdominal infra": ["infra", "abdomen infra", "abdominal pernas", "infra solo", "elevacao de pernas"],
  "abdominal supra": ["supra", "crunch", "abdomen supra", "abdominal tradicional", "abdominal reto"],
  "abdominal prancha": ["prancha", "prancha ventral", "plank", "prancha isometrica"],
  "abdominal hipopressivo": ["stomach vacuum", "hipopressivo", "vacuum"],
  "panturrilha sentado": ["panturrilha", "gemeos sentado", "panturrilha maquina", "soleo", "panturrilha banco"],
  "panturrilha em pe": ["panturrilha", "gemeos em pe", "panturrilha no degrau", "panturrilha smith"],
};

/**
 * Returns expanded canonical search terms and aliases for query expansion.
 * Ensures SQL candidate queries in repository match pertinent rows.
 */
export function getSearchExpansionTerms(query: string): string[] {
  const normQ = normalizeSearchQuery(query);
  if (!normQ) return [];

  const expansions = new Set<string>();
  const tokens = tokenizeSearchText(normQ);

  // Check direct alias match in knowledge base
  for (const [canonical, aliases] of Object.entries(POPULAR_EXERCISE_ALIASES)) {
    const normCanonical = normalizeSearchQuery(canonical);

    // If query matches alias or canonical
    if (normCanonical.includes(normQ) || normQ.includes(normCanonical)) {
      expansions.add(normCanonical);
    }

    for (const alias of aliases) {
      const normAlias = normalizeSearchQuery(alias);
      if (normAlias === normQ || normQ === normAlias || normAlias.includes(normQ) || normQ.includes(normAlias)) {
        expansions.add(normCanonical);
        expansions.add(normAlias);
      }
    }

    // Token-level check
    for (const t of tokens) {
      if (t.length >= 3) {
        if (normCanonical.includes(t)) {
          expansions.add(normCanonical);
        }
        for (const alias of aliases) {
          const normAlias = normalizeSearchQuery(alias);
          if (normAlias === t || normAlias.includes(t)) {
            expansions.add(normCanonical);
            expansions.add(normAlias);
          }
        }
      }
    }
  }

  // Common gym synonyms and typos
  if (normQ.includes("abdom")) {
    expansions.add("abdominal");
    expansions.add("abdomen");
  }
  if (normQ.includes("supno") || normQ.includes("supin")) {
    expansions.add("supino");
  }
  if (normQ.includes("extencora") || normQ.includes("extensora")) {
    expansions.add("cadeira extensora");
    expansions.add("extensao");
  }
  if (normQ.includes("flexora")) {
    expansions.add("cadeira flexora");
    expansions.add("mesa flexora");
  }
  if (normQ.includes("leg 45") || normQ.includes("leg45")) {
    expansions.add("leg press");
    expansions.add("leg press 45");
  }
  if (normQ.includes("voador") || normQ.includes("borboleta")) {
    expansions.add("peck deck");
    expansions.add("voador");
  }
  if (normQ.includes("serrote")) {
    expansions.add("remada unilateral");
    expansions.add("serrote");
  }
  if (normQ.includes("bulgaro")) {
    expansions.add("agachamento bulgaro");
  }
  if (normQ.includes("sumo")) {
    expansions.add("agachamento sumo");
  }

  return Array.from(expansions);
}

/**
 * Returns all potential aliases (official aliases + database aliases + knowledge base) for an exercise.
 */
export function getExerciseAliases(exercise: ExerciseItemDto, dbAliases: string[] = []): string[] {
  const aliases = new Set<string>();

  // Add db aliases
  for (const a of dbAliases) {
    if (a && a.trim()) aliases.add(a.trim());
  }

  // Also include explicit exercise.aliases if loaded
  if (Array.isArray(exercise.aliases)) {
    for (const a of exercise.aliases) {
      if (a && a.trim()) aliases.add(a.trim());
    }
  }

  // Check knowledge base aliases
  const normName = normalizeSearchQuery(exercise.name);
  for (const [key, list] of Object.entries(POPULAR_EXERCISE_ALIASES)) {
    const normKey = normalizeSearchQuery(key);
    if (normName.includes(normKey) || normKey.includes(normName)) {
      for (const alias of list) {
        aliases.add(alias);
      }
    }
  }

  return Array.from(aliases);
}

/**
 * Scores an individual exercise against a search query.
 */
export function scoreExercise(
  exercise: ExerciseItemDto,
  rawQuery: string,
  extraAliases: string[] = []
): RankedExerciseResult | null {
  const normQuery = normalizeSearchQuery(rawQuery);
  if (!normQuery) {
    return {
      exercise,
      relevanceScore: 100,
      matchType: "PARTIAL",
    };
  }

  const queryTokens = tokenizeSearchText(normQuery);
  const normExerciseName = normalizeSearchQuery(exercise.name);
  const exerciseTokens = tokenizeSearchText(normExerciseName);
  const allAliases = getExerciseAliases(exercise, extraAliases);

  // 1. EXACT NAME MATCH (Rank 1: 1000)
  if (normQuery === normExerciseName) {
    return {
      exercise,
      relevanceScore: 1000,
      matchType: "EXACT_NAME",
    };
  }

  // 2. EXACT ALIAS MATCH (Rank 2: 900)
  for (const alias of allAliases) {
    const normAlias = normalizeSearchQuery(alias);
    if (normQuery === normAlias) {
      return {
        exercise,
        relevanceScore: 900,
        matchType: "EXACT_ALIAS",
        matchedAlias: alias,
      };
    }
  }

  // 2.5 PREFIX NAME MATCH (Rank 2.5: 850)
  if (normExerciseName.startsWith(normQuery)) {
    return {
      exercise,
      relevanceScore: 850,
      matchType: "STRONG_WORDS",
    };
  }

  // 3. STRONG WORD MATCH (All Query Tokens Present in Name, in Any Order) (Rank 3: 750 - 800)
  if (queryTokens.length > 0) {
    const nameStems = exerciseTokens.map((t) => stemPortugueseWord(t));
    const allQueryTokensInName = queryTokens.every((qToken) => {
      const qStem = stemPortugueseWord(qToken);
      return nameStems.some((nStem) => nStem === qStem || nStem.startsWith(qStem));
    });

    if (allQueryTokensInName) {
      // Bonus if words appear in consecutive order
      const consecutiveOrder = normExerciseName.includes(normQuery) ? 30 : 0;
      const extraTokensPenalty = Math.min(50, (exerciseTokens.length - queryTokens.length) * 5);

      // Equipment agreement bonus: if query specifically asks for "halter" or "barra" and exercise equipment agrees
      const normEq = normalizeSearchQuery(exercise.equipment || "");
      let equipmentBonus = 0;
      for (const qToken of queryTokens) {
        const qStem = stemPortugueseWord(qToken);
        if (qStem === "halter" && normEq.includes("halter")) equipmentBonus = 40;
        if (qStem === "barr" && normEq.includes("barr")) equipmentBonus = 40;
        if (qStem === "maquin" && normEq.includes("maquin")) equipmentBonus = 40;
        if (qStem === "pol" && normEq.includes("pol")) equipmentBonus = 40;
      }

      return {
        exercise,
        relevanceScore: 780 + consecutiveOrder + equipmentBonus - extraTokensPenalty,
        matchType: "STRONG_WORDS",
      };
    }

    // Check if all query tokens are present in any alias
    for (const alias of allAliases) {
      const aliasTokens = tokenizeSearchText(alias);
      const aliasStems = aliasTokens.map((t) => stemPortugueseWord(t));
      const allQueryInAlias = queryTokens.every((qToken) => {
        const qStem = stemPortugueseWord(qToken);
        return aliasStems.some((aStem) => aStem === qStem || aStem.startsWith(qStem));
      });

      if (allQueryInAlias) {
        return {
          exercise,
          relevanceScore: 720,
          matchType: "STRONG_WORDS",
          matchedAlias: alias,
        };
      }
    }
  }

  // 4. FUZZY / TYPO MATCH (Rank 4: 500 - 680)
  if (queryTokens.length > 0) {
    let totalDistance = 0;
    let allTokensMatchedFuzzily = true;

    for (const qToken of queryTokens) {
      let bestDist = 99;
      for (const exToken of exerciseTokens) {
        const { match, distance } = isFuzzyTokenMatch(qToken, exToken);
        if (match && distance < bestDist) {
          bestDist = distance;
        }
      }

      // Check aliases as well
      if (bestDist > 2) {
        for (const alias of allAliases) {
          const aliasTokens = tokenizeSearchText(alias);
          for (const aToken of aliasTokens) {
            const { match, distance } = isFuzzyTokenMatch(qToken, aToken);
            if (match && distance < bestDist) {
              bestDist = distance;
            }
          }
        }
      }

      if (bestDist <= 2) {
        totalDistance += bestDist;
      } else {
        allTokensMatchedFuzzily = false;
        break;
      }
    }

    if (allTokensMatchedFuzzily) {
      return {
        exercise,
        relevanceScore: Math.max(500, 680 - totalDistance * 30),
        matchType: "FUZZY_TYPO",
      };
    }
  }

  // 5. ATTRIBUTE MATCH (Equipment or Muscle Group) (Rank 5: 250 - 370)
  const normEquipment = normalizeSearchQuery(exercise.equipment || "");
  const normMuscle = normalizeSearchQuery(exercise.muscleGroupPrimary || "");

  const matchesEquipment =
    normEquipment.includes(normQuery) ||
    normQuery.includes(normEquipment) ||
    queryTokens.some((t) => normEquipment.includes(t));

  const isAbdomenQuery = normQuery.includes("abdom") || queryTokens.some((t) => t.startsWith("abdom"));
  const isAbdomenMuscle = normMuscle.includes("abdom") || normMuscle.includes("core");

  const matchesMuscle =
    isAbdomenQuery && isAbdomenMuscle
      ? true
      : normMuscle.includes(normQuery) ||
        normQuery.includes(normMuscle) ||
        queryTokens.some((t) => normMuscle.includes(t));

  if (matchesMuscle) {
    return {
      exercise,
      relevanceScore: isAbdomenQuery ? 350 : 280,
      matchType: "ATTRIBUTE",
      matchReason: `Grupo muscular: ${exercise.muscleGroupPrimary}`,
    };
  }

  if (matchesEquipment) {
    return {
      exercise,
      relevanceScore: 320,
      matchType: "ATTRIBUTE",
      matchReason: `Equipamento: ${exercise.equipment}`,
    };
  }

  // 6. PARTIAL WORD MATCH (Single token match in multi-token query) (Rank 6: 150 - 240)
  if (queryTokens.length > 1) {
    let matchedCount = 0;
    const nameStems = exerciseTokens.map((t) => stemPortugueseWord(t));

    for (const qToken of queryTokens) {
      const qStem = stemPortugueseWord(qToken);
      if (nameStems.some((nStem) => nStem === qStem || nStem.startsWith(qStem))) {
        matchedCount++;
      }
    }

    if (matchedCount > 0) {
      return {
        exercise,
        relevanceScore: Math.round(150 + (matchedCount / queryTokens.length) * 90),
        matchType: "PARTIAL",
      };
    }
  }

  return null;
}

/**
 * Ranks an array of exercises by relevance score.
 */
export function rankExercises(
  exercises: ExerciseItemDto[],
  rawQuery: string,
  aliasesMap?: Map<string, string[]>
): RankedExerciseResult[] {
  if (!rawQuery || !rawQuery.trim()) {
    return exercises.map((exercise) => ({
      exercise,
      relevanceScore: 100,
      matchType: "PARTIAL" as SearchMatchType,
    }));
  }

  const results: RankedExerciseResult[] = [];

  for (const ex of exercises) {
    const extraAliases = aliasesMap?.get(ex.publicId) || [];
    const scored = scoreExercise(ex, rawQuery, extraAliases);
    if (scored && scored.relevanceScore > 0) {
      results.push(scored);
    }
  }

  // Sort: highest relevanceScore first, then Global before Consultancy, then alphabetical
  results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    if (a.exercise.scope !== b.exercise.scope) {
      return a.exercise.scope === "GLOBAL" ? -1 : 1;
    }
    return a.exercise.name.localeCompare(b.exercise.name, "pt-BR");
  });

  return results;
}
