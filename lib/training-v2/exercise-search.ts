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
  "cadeira extensora": ["extensora", "extensora pernas", "extensao de pernas"],
  "cadeira flexora": ["flexora", "flexora sentada", "flexao de pernas"],
  "mesa flexora": ["flexora", "flexora deitada", "mesa de pernas"],
  "leg press 45": ["leg", "leg 45", "leg press", "legpress"],
  "leg press horizontal": ["leg horizontal", "leg reto", "leg sentado"],
  "puxada frontal": ["puxada", "puxador costas", "lat pulldown", "pulley frente", "puxada aberta"],
  "puxada alta": ["puxada", "puxador costas", "lat pulldown", "pulley costas"],
  "remada curvada": ["remada", "barbell row", "remada barra", "remada curvada barra"],
  "remada baixa": ["pulley baixo", "remada sentada", "remada cabo", "remada polia"],
  "remada unilateral": ["remada serrote", "serrote", "remada halter"],
  "desenvolvimento com halteres": ["desenvolvimento", "shoulder press", "desenvolvimento halteres", "desenvolvimento ombros"],
  "desenvolvimento com barra": ["desenvolvimento militar", "ohp", "overhead press", "militar"],
  "elevacao lateral": ["lateral", "abducao de ombros", "abducao lateral", "elevacao lateral halteres"],
  "elevacao frontal": ["frontal", "elevacao frontal halteres"],
  "crucifixo reto": ["crucifixo", "fly", "crucifixo halteres"],
  "crucifixo invertido": ["crucifixo inverso", "peck deck reverso", "voador invertido"],
  "peck deck": ["voador", "borboleta", "voador peitoral", "crucifixo maquina"],
  "voador": ["peck deck", "borboleta", "voador peitoral"],
  "triceps corda": ["corda", "triceps polia corda", "corda pulley"],
  "triceps testa": ["testa", "skull crusher", "triceps testa barra w", "testa halteres"],
  "triceps frances": ["frances", "triceps frances halter"],
  "triceps banco": ["mergulho banco", "triceps mergulho"],
  "rosca direta": ["biceps barra", "biceps direto", "rosca barra"],
  "rosca martelo": ["martelo", "hammer curl", "biceps martelo"],
  "rosca scott": ["scott", "banco scott", "preacher curl"],
  "rosca concentrada": ["concentrada", "concentrado", "biceps concentrado"],
  "stiff": ["stiff com halteres", "stiff com barra", "levantamento stiff"],
  "levantamento terra": ["terra", "deadlift"],
  "agachamento livre": ["agacho", "squat", "agachamento com barra", "agachamento barra"],
  "agachamento smith": ["agachamento guiado", "smith", "agacho smith"],
  "agachamento sumô": ["sumo", "agacho sumo", "agachamento pernas abertas"],
  "agachamento bulgaro": ["bulgaro", "bulgarian split squat"],
  "afundo": ["lunge", "passada", "avanco"],
  "passada": ["lunge", "afundo", "avanco"],
  "elevacao pelvica": ["hip thrust", "elevacao de quadril", "ponte de gluteos"],
  "abdominal infra": ["infra", "abdomen infra", "abdominal pernas", "infra solo"],
  "abdominal supra": ["supra", "crunch", "abdomen supra", "abdominal tradicional"],
  "abdominal prancha": ["prancha", "prancha ventral", "plank"],
  "panturrilha sentado": ["panturrilha", "gemeos sentado", "panturrilha maquina", "soleo"],
  "panturrilha em pe": ["panturrilha", "gemeos em pe", "panturrilha no degrau", "panturrilha smith"],
};

/**
 * Returns all potential aliases (official aliases + database aliases + knowledge base) for an exercise.
 */
export function getExerciseAliases(exercise: ExerciseItemDto, dbAliases: string[] = []): string[] {
  const aliases = new Set<string>();

  // Add db aliases
  for (const a of dbAliases) {
    if (a && a.trim()) aliases.add(a.trim());
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
      return {
        exercise,
        relevanceScore: 780 + consecutiveOrder - extraTokensPenalty,
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

  // 5. ATTRIBUTE MATCH (Equipment or Muscle Group) (Rank 5: 250 - 350)
  const normEquipment = normalizeSearchQuery(exercise.equipment || "");
  const normMuscle = normalizeSearchQuery(exercise.muscleGroupPrimary || "");

  const matchesEquipment =
    normEquipment.includes(normQuery) ||
    normQuery.includes(normEquipment) ||
    queryTokens.some((t) => normEquipment.includes(t));

  const matchesMuscle =
    normMuscle.includes(normQuery) ||
    normQuery.includes(normMuscle) ||
    queryTokens.some((t) => normMuscle.includes(t));

  if (matchesEquipment) {
    return {
      exercise,
      relevanceScore: 320,
      matchType: "ATTRIBUTE",
      matchReason: `Equipamento: ${exercise.equipment}`,
    };
  }

  if (matchesMuscle) {
    return {
      exercise,
      relevanceScore: 280,
      matchType: "ATTRIBUTE",
      matchReason: `Grupo muscular: ${exercise.muscleGroupPrimary}`,
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
