/**
 * Exercise Similarity and Duplicate Protection Utilities
 *
 * Distinguishes EXACT DUPLICATES from LEGITIMATE VARIATIONS:
 * - Exact duplicate: normalized character identity.
 * - Similar naming: identical base exercise with synonymous wording (e.g., "halter" vs "halteres").
 * - Legitimate variation: different angle (reto vs inclinado), equipment (barra vs halteres),
 *   or grip/stance (pronado vs supinado, unilateral vs bilateral).
 *
 * Client and Server safe.
 */

export function normalizeExerciseText(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const normalizeExerciseName = normalizeExerciseText;

export function stemPortugueseWord(word: string): string {
  let s = word.toLowerCase();
  if (s.endsWith("res")) {
    s = s.slice(0, -2); // halteres -> halter
  } else if (s.endsWith("es") && s.length > 4) {
    s = s.slice(0, -2);
  } else if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) {
    s = s.slice(0, -1);
  }
  return s;
}

export function tokenizeExercise(name: string): string[] {
  const stopWords = new Set(["de", "do", "da", "dos", "das", "com", "em", "no", "na", "para", "e", "a", "o"]);
  return normalizeExerciseText(name)
    .split(/[\s\-_/,.]+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

export interface DuplicateCheckResult {
  isExactDuplicate: boolean;
  isSimilar: boolean;
  similarExerciseName?: string;
  message?: string;
}

export interface ExerciseVariationCheckResult {
  isDuplicate: boolean;
  variationType: "EXACT_DUPLICATE" | "LEGITIMATE_VARIATION" | "NONE";
  targetName?: string;
  variationReason?: string;
  message?: string;
}

export const MODIFIER_GROUPS: readonly (readonly string[])[] = [
  ["reto", "inclinado", "declinado"],
  ["barra", "halter", "halteres", "polia", "maquina", "elastico", "peso corporal", "kettlebell", "anilha"],
  ["aberto", "fechado", "neutro", "pronado", "supinado", "invertido"],
  ["unilateral", "bilateral"],
  ["frente", "costas", "nuca"],
  ["livre", "smith", "guiado"],
  ["curvado", "sentado", "em pe", "deitado"],
];

export function isStructuralVariation(
  candStems: string[],
  existStems: string[]
): { isVariation: boolean; reason: string } {
  for (const group of MODIFIER_GROUPS) {
    const normalizedGroup = group.map((m) => stemPortugueseWord(m));
    const candMatches = candStems.filter((s) => normalizedGroup.includes(s));
    const existMatches = existStems.filter((s) => normalizedGroup.includes(s));

    if (candMatches.length > 0 && existMatches.length > 0) {
      const overlap = candMatches.filter((m) => existMatches.includes(m));
      if (overlap.length === 0) {
        return {
          isVariation: true,
          reason: `${existMatches.join("/")} vs ${candMatches.join("/")}`,
        };
      }
    }
  }
  return { isVariation: false, reason: "" };
}

export function checkExerciseDuplicateOrVariation(
  candidateName: string,
  existingNames: string[]
): ExerciseVariationCheckResult {
  const normCandidate = normalizeExerciseText(candidateName);
  if (!normCandidate) {
    return { isDuplicate: false, variationType: "NONE" };
  }

  const candidateTokens = tokenizeExercise(candidateName);
  if (candidateTokens.length === 0) {
    return { isDuplicate: false, variationType: "NONE" };
  }

  const candStems = candidateTokens.map((t) => stemPortugueseWord(t));

  for (const existing of existingNames) {
    const normExisting = normalizeExerciseText(existing);
    if (!normExisting) continue;

    // 1. Exact Duplicate (case, punctuation, diacritics normalized)
    if (normCandidate === normExisting) {
      return {
        isDuplicate: true,
        variationType: "EXACT_DUPLICATE",
        targetName: existing,
        message: `Exercício com o mesmo nome já cadastrado: "${existing}".`,
      };
    }

    const existingTokens = tokenizeExercise(existing);
    if (existingTokens.length === 0) continue;
    const existStems = existingTokens.map((t) => stemPortugueseWord(t));

    // Check for structural variation (e.g. angle reto vs inclinado, equipment barra vs halter)
    const varCheck = isStructuralVariation(candStems, existStems);
    if (varCheck.isVariation) {
      // Find if they share the base movement stem (e.g. "supino")
      const commonBase = candStems.filter((s) => existStems.includes(s));
      if (commonBase.length > 0) {
        return {
          isDuplicate: false,
          variationType: "LEGITIMATE_VARIATION",
          targetName: existing,
          variationReason: varCheck.reason,
          message: `Variação legítima de "${existing}" (${varCheck.reason}).`,
        };
      }
    }

    // Near match without legitimate variation
    const matchingStems = candStems.filter((s) => existStems.includes(s));
    const minLength = Math.min(candStems.length, existStems.length);

    if (
      minLength >= 2 &&
      matchingStems.length >= minLength &&
      Math.abs(candStems.length - existStems.length) <= 1
    ) {
      return {
        isDuplicate: true,
        variationType: "EXACT_DUPLICATE",
        targetName: existing,
        message: `Nome muito parecido com exercício existente: "${existing}". Verifique duplicidade.`,
      };
    }
  }

  return { isDuplicate: false, variationType: "NONE" };
}

export function checkExerciseDuplicate(
  candidateName: string,
  existingNames: string[]
): DuplicateCheckResult {
  const result = checkExerciseDuplicateOrVariation(candidateName, existingNames);
  if (result.isDuplicate) {
    return {
      isExactDuplicate: result.variationType === "EXACT_DUPLICATE",
      isSimilar: true,
      similarExerciseName: result.targetName,
      message: result.message,
    };
  }
  return {
    isExactDuplicate: false,
    isSimilar: false,
  };
}
