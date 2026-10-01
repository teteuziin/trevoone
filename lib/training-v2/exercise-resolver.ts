/**
 * TREVO ONE — CANONICAL EXERCISE RESOLUTION ENGINE
 * Resolves exercise candidates across aliases, synonyms, linguistic variations,
 * equipment, and muscle groups with strict anti-collision conflict guardrails.
 */

import { isOpenAiConfigured, getOpenAiClient } from "../ai/openai-client";

export interface ExerciseCandidateDbItem {
  id?: number;
  publicId: string;
  name: string;
  normalizedName?: string | null;
  muscleGroupPrimary?: string | null;
  equipment?: string | null;
  movementPattern?: string | null;
}

export type ExerciseResolutionStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

export interface ExerciseResolutionResult {
  status: ExerciseResolutionStatus;
  matched?: ExerciseCandidateDbItem;
  candidates: ExerciseCandidateDbItem[];
  confidence: number;
}

export const GENERIC_EXERCISE_ROOTS = new Set([
  "remada",
  "supino",
  "agachamento",
  "puxada",
  "desenvolvimento",
  "rosca",
  "triceps",
  "biceps",
  "elevacao",
  "crucifixo",
  "leg press",
  "hack",
  "abdominal",
  "prancha",
  "stiff",
  "afundo",
  "passada",
]);

// Common connector & stop words in Portuguese gym exercise names
const STOP_WORDS = new Set([
  "de", "do", "da", "dos", "das", "com", "na", "no", "nos", "nas",
  "em", "para", "o", "a", "os", "as", "ao", "aos", "e"
]);

/**
 * Normalizes text: strips accents, lowercases, cleans punctuation, normalizes plurals and stop words.
 */
export function normalizeExerciseText(text: string): string {
  if (!text) return "";
  let norm = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common plural/variation suffixes
  norm = norm
    .replace(/\bbracos\b/g, "braco")
    .replace(/\bhalteres\b/g, "halter")
    .replace(/\bbarras\b/g, "barra")
    .replace(/\bpolias\b/g, "polia")
    .replace(/\bmaquinas\b/g, "maquina")
    .replace(/\bpesos\b/g, "peso")
    .replace(/\bcurvadas\b/g, "curvada")
    .replace(/\bunilaterais\b/g, "unilateral")
    .replace(/\barticuladas\b/g, "articulada")
    .replace(/\bpernas\b/g, "perna")
    .replace(/\bquadris\b/g, "quadril")
    .replace(/\bgraus\b/g, "");

  return norm.trim();
}

/**
 * Returns meaningful tokens (excluding stop words).
 */
export function getExerciseTokens(text: string): string[] {
  const norm = normalizeExerciseText(text);
  return norm
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/**
 * Mutually exclusive conflict terms.
 * If candidate contains term A and library candidate contains term B from the SAME group (where A != B),
 * they MUST NEVER be automatically matched.
 */
const CRITICAL_CONFLICT_GROUPS: string[][] = [
  // 1. Bench & body angle
  ["inclinado", "declinado", "reto", "horizontal", "plano", "vertical"],
  // 2. Grip / stance width
  ["aberta", "fechada", "neutra", "pronada", "supinada"],
  // 3. Adductor vs Abductor (CRITICAL)
  ["adutora", "aducao", "adutor"],
  ["abdutora", "abducao", "abdutor"],
  // 4. Triceps movement orientation
  ["pushdown", "pulley", "corda"],
  ["overhead", "frances"],
  ["testa"],
  // 5. Directional delts
  ["frontal", "lateral", "posterior"],
  // 6. Leg machine actions
  ["flexora", "flexao"],
  ["extensora", "extensao"],
  // 7. Abdominals
  ["supra", "infra", "obliquo"],
  // 8. Stance / Position
  ["em pe", "sentado", "deitado"],
  // 9. High vs Low row/pull
  ["alta", "baixa"],
  // 10. Unilateral vs Bilateral
  ["unilateral", "bilateral"],
  // 11. Chest mechanics: Press vs Fly (Crucifixo Inclinado != Supino Inclinado)
  ["supino", "crucifixo", "voador", "peck deck"],
  // 12. Biceps mechanics: Direct vs Scott vs Martelo vs Alternada vs Concentrada (Rosca Scott != Rosca Direta)
  ["rosca direta", "rosca scott", "rosca preacher", "rosca martelo", "rosca concentrada", "rosca alternada"],
  // 13. Back mechanics: Pull/Pulldown vs Row
  ["puxada", "remada"],
  ["pulldown", "remada"],
  ["puxada", "row"],
  // 14. Quad mechanics: Squat vs Leg Press vs Hack
  ["agachamento", "leg press", "hack squat"],
  // 15. Equipment conflict: Dumbbell vs Barbell
  ["halter", "barra"],
];

/**
 * Checks if two exercise names have mutually exclusive conflicting modifiers.
 */
export function hasConflictingModifiers(nameA: string, nameB: string): boolean {
  const normA = ` ${normalizeExerciseText(nameA)} `;
  const normB = ` ${normalizeExerciseText(nameB)} `;

  for (const group of CRITICAL_CONFLICT_GROUPS) {
    const matchedTermsA = group.filter((term) => normA.includes(` ${term} `));
    const matchedTermsB = group.filter((term) => normB.includes(` ${term} `));

    if (matchedTermsA.length > 0 && matchedTermsB.length > 0) {
      // If both contain terms from the same mutually exclusive group,
      // but share NO common term in that group, they conflict!
      const overlap = matchedTermsA.filter((t) => matchedTermsB.includes(t));
      if (overlap.length === 0) {
        return true;
      }
    }
  }

  // Cross-group conflict: Adutora vs Abdutora
  const hasAducA = /\badu(tora|cao|tor)\b/.test(normA);
  const hasAbducA = /\babdu(tora|cao|tor)\b/.test(normA);
  const hasAducB = /\badu(tora|cao|tor)\b/.test(normB);
  const hasAbducB = /\babdu(tora|cao|tor)\b/.test(normB);

  if ((hasAducA && hasAbducB) || (hasAbducA && hasAducB)) {
    return true;
  }

  return false;
}

/**
 * Synonym clusters for standard Brazilian gym terminology and English borrowings.
 * Each array represents expressions referring to the same canonical movement.
 */
export const EXERCISE_SYNONYM_CLUSTERS: string[][] = [
  // Cadeira Abdutora
  [
    "cadeira abdutora",
    "abducao de quadril na maquina",
    "maquina abdutora",
    "abducao de quadril",
    "abducao quadril maquina",
    "abducao maquina",
    "hip abduction machine"
  ],
  // Cadeira Adutora
  [
    "cadeira adutora",
    "aducao de quadril na maquina",
    "maquina adutora",
    "aducao de quadril",
    "aducao quadril maquina",
    "aducao maquina",
    "hip adduction machine"
  ],
  // Rosca Direta Barra W / EZ
  [
    "rosca direta barra w",
    "rosca direta com barra w",
    "rosca direta barra ez",
    "rosca direta com barra ez",
    "rosca barra w",
    "rosca barra ez",
    "rosca w",
    "rosca ez",
    "ez bar curl",
    "biceps barra w",
    "biceps barra ez"
  ],
  // Rosca Direta Barra Reta
  [
    "rosca direta com barra",
    "rosca direta barra reta",
    "rosca direta",
    "rosca com barra",
    "barbell curl",
    "rosca direta barra"
  ],
  // Rosca Alternada
  [
    "rosca alternada",
    "rosca alternada com halteres",
    "rosca biceps alternada",
    "dumbbell alternating curl",
    "alternating dumbbell curl"
  ],
  // Rosca Martelo
  [
    "rosca martelo",
    "rosca martelo com halteres",
    "martelo com halteres",
    "martelo halteres",
    "hammer curl",
    "dumbbell hammer curl"
  ],
  // Rosca Scott
  [
    "rosca scott",
    "rosca preacher",
    "preacher curl",
    "rosca no banco scott",
    "banco scott",
    "rosca scott com barra w",
    "rosca scott barra w"
  ],
  // Supino Reto
  [
    "supino reto com barra",
    "supino reto",
    "supino reto barra",
    "bench press",
    "flat bench press",
    "supino horizontal",
    "supino plano"
  ],
  // Supino Reto Halteres
  [
    "supino reto com halteres",
    "supino reto halteres",
    "dumbbell bench press",
    "supino horizontal com halteres"
  ],
  // Supino Inclinado com Barra
  [
    "supino inclinado com barra",
    "supino inclinado barra",
    "incline bench press",
    "incline barbell bench press"
  ],
  // Supino Inclinado com Halteres
  [
    "supino inclinado com halteres",
    "supino inclinado com halter",
    "supino inclinado halteres",
    "supino inclinado halter",
    "incline dumbbell press",
    "incline dumbbell bench press"
  ],
  // Supino Declinado
  [
    "supino declinado com barra",
    "supino declinado",
    "decline bench press"
  ],
  // Crucifixo Reto
  [
    "crucifixo reto",
    "crucifixo reto com halteres",
    "crucifixo com halteres",
    "crucifixo halteres",
    "dumbbell flyes",
    "crucifixo horizontal"
  ],
  // Crucifixo Inclinado
  [
    "crucifixo inclinado",
    "crucifixo inclinado com halteres",
    "incline dumbbell flyes",
    "crucifixo banco inclinado"
  ],
  // Voador / Peck Deck
  [
    "peck deck",
    "voador",
    "voador peitoral",
    "fly machine",
    "crucifixo na maquina",
    "crucifixo maquina",
    "peck deck voador"
  ],
  // Puxada Frontal com Barra Aberta / Pronada
  [
    "puxada frontal",
    "puxada alta",
    "puxada na polia",
    "puxador frontal",
    "puxada pulley",
    "lat pulldown",
    "front pulldown",
    "puxada frontal com barra aberta",
    "puxada frontal barra aberta"
  ],
  // Puxada Frontal Pegada Neutra com Triângulo
  [
    "puxada frente triangulo",
    "puxada frontal triangulo",
    "puxada frontal com triangulo",
    "puxada frontal pegada neutra com triangulo",
    "puxada pegada neutra com triangulo",
    "puxada neutra com triangulo",
    "puxada triangulo",
    "puxada com triangulo",
    "puxada frontal na polia com pegada neutra fechada",
    "triangle lat pulldown",
    "close grip lat pulldown"
  ],
  // Remada Curvada
  [
    "remada curvada",
    "remada curvada com barra",
    "bent over row",
    "barbell row",
    "remada curvada barra"
  ],
  // Remada Baixa / Sentada
  [
    "remada baixa",
    "remada sentada",
    "remada na polia baixa",
    "remada baixa polia",
    "seated cable row",
    "seated row"
  ],
  // Remada Unilateral / Serrote
  [
    "remada unilateral",
    "remada serrote",
    "serrote",
    "remada unilateral com halter",
    "one arm dumbbell row",
    "remada serrote com halter",
    "remada unilateral halter serrote",
    "remada unilateral serrote"
  ],
  // Remada Cavalinho / T-Bar
  [
    "remada cavalinho",
    "remada com barra t",
    "remada barra t",
    "remada t-bar",
    "remada t bar",
    "t-bar row",
    "t bar row",
    "remada t bar cavalinho",
    "remada t-bar cavalinho",
    "cavalinho"
  ],
  // Desenvolvimento com Halteres
  [
    "desenvolvimento com halteres",
    "desenvolvimento halteres",
    "dumbbell shoulder press",
    "desenvolvimento de ombros com halteres"
  ],
  // Desenvolvimento Militar / com Barra
  [
    "desenvolvimento militar",
    "desenvolvimento com barra",
    "desenvolvimento barra",
    "overhead press",
    "military press"
  ],
  // Elevação Lateral
  [
    "elevacao lateral",
    "elevacao lateral com halteres",
    "elevacao lateral com halter",
    "elevacao lateral halter",
    "elevacao lateral halteres",
    "lateral raise",
    "dumbbell lateral raise"
  ],
  // Elevação Frontal
  [
    "elevacao frontal",
    "elevacao frontal com halteres",
    "front raise",
    "dumbbell front raise"
  ],
  // Tríceps Corda
  [
    "triceps corda",
    "triceps pulley corda",
    "triceps na polia com corda",
    "rope pushdown",
    "triceps pushdown corda"
  ],
  // Tríceps Pulley / Barra Reta
  [
    "triceps pulley",
    "triceps na polia",
    "triceps pushdown",
    "triceps barra reta",
    "triceps polia barra"
  ],
  // Tríceps Testa
  [
    "triceps testa",
    "triceps testa com barra",
    "triceps testa barra w",
    "skull crusher",
    "lying triceps extension"
  ],
  // Tríceps Francês
  [
    "triceps frances",
    "triceps overhead",
    "triceps frances com halter",
    "french press"
  ],
  // Agachamento Livre
  [
    "agachamento livre",
    "agachamento com barra",
    "back squat",
    "barbell squat",
    "agachamento"
  ],
  // Agachamento no Smith
  [
    "agachamento smith",
    "agachamento no smith",
    "smith machine squat"
  ],
  // Leg Press 45
  [
    "leg press 45",
    "leg press 45 graus",
    "leg 45",
    "leg press inclinado"
  ],
  // Leg Press Horizontal
  [
    "leg press horizontal",
    "leg press reto",
    "horizontal leg press"
  ],
  // Cadeira Extensora
  [
    "cadeira extensora",
    "extensora",
    "leg extension",
    "extensao de pernas"
  ],
  // Mesa Flexora
  [
    "mesa flexora",
    "flexora deitada",
    "lying leg curl",
    "flexao de pernas deitado",
    "flexora"
  ],
  // Cadeira Flexora
  [
    "cadeira flexora",
    "flexora sentada",
    "seated leg curl"
  ],
  // Elevação Pélvica
  [
    "elevacao pelvica",
    "hip thrust",
    "elevacao de quadril",
    "barbell hip thrust"
  ],
  // Flexão de Braços
  [
    "flexao de bracos",
    "flexao de braco",
    "flexao de solo",
    "flexao de braco no solo",
    "push up",
    "apoio de frente"
  ],
  // Barra Fixa
  [
    "barra fixa",
    "pull up",
    "chin up",
    "barra fixa pronada",
    "barra fixa supinada"
  ],
  // Stiff
  [
    "stiff",
    "stiff com barra",
    "stiff com halteres",
    "romanian deadlift",
    "rdl"
  ],
  // Levantamento Terra
  [
    "levantamento terra",
    "deadlift",
    "terra com barra",
    "barbell deadlift"
  ],
  // Panturrilha em Pé
  [
    "panturrilha em pe",
    "gemeos em pe",
    "standing calf raise",
    "elevacao de panturrilha em pe"
  ],
  // Panturrilha Sentado
  [
    "panturrilha sentado",
    "gemeos sentado",
    "seated calf raise",
    "panturrilha no soleo"
  ],
  // Abdominal Supra
  [
    "abdominal supra",
    "crunch",
    "abdominal tradicional",
    "abdominal solo"
  ],
  // Abdominal Infra
  [
    "abdominal infra",
    "elevacao de pernas",
    "hanging leg raise",
    "abdominal na barra"
  ],
  // Prancha
  [
    "prancha",
    "prancha ventral",
    "plank",
    "prancha isometrica",
    "prancha frontal"
  ]
];

// Pre-indexed map for fast alias cluster lookup: normalized text -> cluster index
const ALIAS_LOOKUP_MAP = new Map<string, number>();
EXERCISE_SYNONYM_CLUSTERS.forEach((cluster, clusterIdx) => {
  for (const item of cluster) {
    const norm = normalizeExerciseText(item);
    if (norm) {
      ALIAS_LOOKUP_MAP.set(norm, clusterIdx);
    }
  }
});

/**
 * Checks if two exercise names are known synonyms in the same cluster.
 */
export function areExerciseSynonyms(nameA: string, nameB: string): boolean {
  const normA = normalizeExerciseText(nameA);
  const normB = normalizeExerciseText(nameB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const clusterA = ALIAS_LOOKUP_MAP.get(normA);
  const clusterB = ALIAS_LOOKUP_MAP.get(normB);

  return clusterA !== undefined && clusterA === clusterB;
}

/**
 * Calculates similarity score between candidate name and a library item (0.0 to 1.0).
 */
export function calculateExerciseMatchScore(
  candidateName: string,
  target: ExerciseCandidateDbItem
): number {
  const targetName = target.name;

  // 1. Direct ID match
  if (candidateName === target.publicId) {
    return 1.0;
  }

  // 2. Strict Conflict Check (Adutora != Abdutora, Reto != Inclinado, etc.)
  if (hasConflictingModifiers(candidateName, targetName)) {
    return 0.0;
  }

  const normCandidate = normalizeExerciseText(candidateName);
  const normTarget = normalizeExerciseText(targetName);

  // 3. Exact Normalized Match
  if (normCandidate === normTarget) {
    return 1.0;
  }

  // 4. Sub-names check (e.g. target "Remada T-Bar (Cavalinho)" or "Peck Deck / Voador")
  const targetSubNames = [
    targetName,
    ...targetName.split(/[/()]/).map((s) => s.trim()).filter((s) => s.length >= 3),
  ];
  for (const sub of targetSubNames) {
    const normSub = normalizeExerciseText(sub);
    if (normCandidate === normSub) {
      return 1.0;
    }
    if (areExerciseSynonyms(normCandidate, normSub)) {
      return 0.98;
    }
  }

  // 5. Known Synonym Cluster Match
  if (areExerciseSynonyms(normCandidate, normTarget)) {
    return 0.98;
  }

  // 5.5. Cluster Root Matching (e.g. "lat pulldown" in cluster matching "Puxada Frontal com Barra Aberta")
  let clusterRootScore = 0;
  const candidateClusterIdx = ALIAS_LOOKUP_MAP.get(normCandidate);
  if (candidateClusterIdx !== undefined) {
    const cluster = EXERCISE_SYNONYM_CLUSTERS[candidateClusterIdx];
    for (const clustItem of cluster) {
      const normClust = normalizeExerciseText(clustItem);
      if (normClust.length >= 4 && (normTarget.startsWith(normClust) || normClust.startsWith(normTarget))) {
        clusterRootScore = 0.88;
        break;
      }
    }
  }

  // 6. Token Analysis
  const tokensCandidate = getExerciseTokens(normCandidate);
  const tokensTarget = getExerciseTokens(normTarget);

  if (tokensCandidate.length === 0 || tokensTarget.length === 0) {
    return 0.0;
  }

  const candidateSet = new Set(tokensCandidate);
  const targetSet = new Set(tokensTarget);

  let commonTokens = 0;
  for (const t of candidateSet) {
    if (targetSet.has(t)) commonTokens++;
  }

  const unionSize = new Set([...tokensCandidate, ...tokensTarget]).size;
  const jaccard = unionSize > 0 ? commonTokens / unionSize : 0;

  // Prefix / containment: e.g. "Supino Reto" in "Supino Reto com Barra"
  const candidateJoined = tokensCandidate.join(" ");
  const targetJoined = tokensTarget.join(" ");
  const isContained = targetJoined.startsWith(candidateJoined) || candidateJoined.startsWith(targetJoined);

  let score = Math.max(jaccard, clusterRootScore);
  if (isContained && commonTokens >= 2) {
    score = Math.max(score, 0.88);
  } else if (commonTokens >= 2 && commonTokens === tokensCandidate.length) {
    // All candidate tokens are present in target
    score = Math.max(score, 0.85);
  }

  // Specific modifier penalty:
  // If target has specific modifiers that were NOT requested by candidate (e.g. "w", "ez", "smith", "corda"),
  // OR candidate explicitly requested specific modifiers that target lacks, penalize so non-specialized doesn't tie with specialized.
  const SPECIFIC_MODIFIERS = new Set(["w", "ez", "smith", "corda"]);
  let modifierPenalty = 0;
  for (const t of tokensTarget) {
    if (SPECIFIC_MODIFIERS.has(t) && !candidateSet.has(t)) {
      modifierPenalty += 0.14;
    }
  }
  for (const t of tokensCandidate) {
    if (SPECIFIC_MODIFIERS.has(t) && !targetSet.has(t)) {
      modifierPenalty += 0.20;
    }
  }
  score = Math.max(0, score - modifierPenalty);

  // Muscle group / Equipment consistency bonus
  if (target.muscleGroupPrimary && normCandidate.includes(normalizeExerciseText(target.muscleGroupPrimary))) {
    score += 0.05;
  }
  if (target.equipment && normCandidate.includes(normalizeExerciseText(target.equipment))) {
    score += 0.05;
  }

  return Math.min(1.0, score);
}

/**
 * Authoritative Canonical Exercise Resolver.
 * Resolves a raw candidate name against the exercise database rows safely.
 */
export function resolveCanonicalExercise(
  candidateName: string,
  availableDbItems: ExerciseCandidateDbItem[]
): ExerciseResolutionResult {
  const trimmed = candidateName?.trim();
  if (!trimmed || availableDbItems.length === 0) {
    return { status: "NOT_FOUND", candidates: [], confidence: 0 };
  }

  // 1. Direct ID match
  const directIdMatch = availableDbItems.find(
    (item) => item.publicId === trimmed || (item.id != null && String(item.id) === trimmed)
  );
  if (directIdMatch) {
    return {
      status: "MATCHED",
      matched: directIdMatch,
      candidates: [directIdMatch],
      confidence: 1.0,
    };
  }

  // 1.5. Generic Root Check (e.g. "Remada", "Supino")
  const normCandidate = normalizeExerciseText(trimmed);
  const candidateTokens = getExerciseTokens(normCandidate);
  if (candidateTokens.length === 1 && GENERIC_EXERCISE_ROOTS.has(candidateTokens[0])) {
    const root = candidateTokens[0];
    const matchingItems = availableDbItems.filter((item) => {
      const itemTokens = getExerciseTokens(item.name);
      return itemTokens.includes(root);
    });
    if (matchingItems.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: matchingItems.slice(0, 10),
        confidence: 0.5,
      };
    }
  }

  // 2. Score all items
  const scoredItems: Array<{ item: ExerciseCandidateDbItem; score: number }> = [];

  for (const item of availableDbItems) {
    const score = calculateExerciseMatchScore(trimmed, item);
    if (score > 0.40) {
      scoredItems.push({ item, score });
    }
  }

  // Sort descending by score
  scoredItems.sort((a, b) => b.score - a.score);

  if (scoredItems.length === 0) {
    return { status: "NOT_FOUND", candidates: [], confidence: 0 };
  }

  const best = scoredItems[0];
  const second = scoredItems.length > 1 ? scoredItems[1] : null;

  // 3. Clear Winner (High Confidence)
  if (best.score >= 0.85) {
    // Check if second place is too close (real ambiguity)
    if (second && second.score >= 0.80 && best.score - second.score < 0.08) {
      return {
        status: "AMBIGUOUS",
        candidates: scoredItems.slice(0, 5).map((s) => s.item),
        confidence: best.score,
      };
    }

    return {
      status: "MATCHED",
      matched: best.item,
      candidates: [best.item],
      confidence: best.score,
    };
  }

  // 4. Ambiguity / Lower Confidence -> Human Review
  if (best.score >= 0.65) {
    return {
      status: "AMBIGUOUS",
      candidates: scoredItems.slice(0, 5).map((s) => s.item),
      confidence: best.score,
    };
  }

  // 5. Not found with sufficient confidence
  return {
    status: "NOT_FOUND",
    candidates: scoredItems.slice(0, 3).map((s) => s.item),
    confidence: best.score,
  };
}

/**
 * Layer 7: OpenAI Semantic Exercise Resolution with strict library authority.
 * Uses Structured Output to disambiguate or confirm match ONLY from candidate shortlist.
 */
export async function resolveSemanticExerciseWithAi(params: {
  rawCandidateText: string;
  shortlistCandidates: ExerciseCandidateDbItem[];
}): Promise<{
  status: ExerciseResolutionStatus;
  matched?: ExerciseCandidateDbItem;
  reason?: string;
}> {
  const { rawCandidateText, shortlistCandidates } = params;
  if (!shortlistCandidates || shortlistCandidates.length === 0) {
    return { status: "NOT_FOUND" };
  }

  // If only 1 candidate, return it directly
  if (shortlistCandidates.length === 1) {
    return {
      status: "MATCHED",
      matched: shortlistCandidates[0],
      reason: "Único candidato viável na biblioteca",
    };
  }

  if (!isOpenAiConfigured()) {
    return { status: "AMBIGUOUS" };
  }

  try {
    const client = getOpenAiClient();
    const candidatePayload = shortlistCandidates.map((c) => ({
      exercisePublicId: c.publicId,
      name: c.name,
      muscleGroup: c.muscleGroupPrimary || null,
      equipment: c.equipment || null,
    }));

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_IMPORT_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é o resolvedor semântico oficial da Exercise Library do TREVO ONE.
Sua tarefa é analisar o nome escrito de um exercício em uma ficha de treino e determinar se há uma correspondência inequívoca entre os candidatos REAIS fornecidos da biblioteca.

REGRAS RÍGIDAS DE AUTORIDADE:
1. Você DEVE escolher APENAS um 'exercisePublicId' que esteja explicitamente listado na lista de candidatos fornecida. NUNCA invente um ID.
2. Se o texto for genérico (ex: "Remada", "Supino") ou se houver dúvida razoável entre variações distintas presentes na lista (ex: com barra vs com halteres, ou pegada neutra vs pronada), você DEVE retornar result: "AMBIGUOUS".
3. Se nenhum candidato for o mesmo exercício, retorne result: "NOT_FOUND".
4. Retorne apenas JSON no formato:
{
  "result": "MATCHED" | "AMBIGUOUS" | "NOT_FOUND",
  "exercisePublicId": "<id presente nos candidatos ou omitido se não for MATCHED>",
  "reason": "<breve explicação técnica>"
}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            rawExerciseText: rawCandidateText,
            candidateShortlist: candidatePayload,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { status: "AMBIGUOUS" };
    }

    const parsed = JSON.parse(content);
    if (parsed.result === "MATCHED" && parsed.exercisePublicId) {
      // Validate that returned ID is strictly in shortlist (Exercise Library is Authority)
      const validCandidate = shortlistCandidates.find((c) => c.publicId === parsed.exercisePublicId);
      if (validCandidate) {
        return {
          status: "MATCHED",
          matched: validCandidate,
          reason: parsed.reason,
        };
      }
    }

    if (parsed.result === "NOT_FOUND") {
      return { status: "NOT_FOUND", reason: parsed.reason };
    }

    return { status: "AMBIGUOUS", reason: parsed.reason };
  } catch {
    return { status: "AMBIGUOUS" };
  }
}
