import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  scoreExercise,
  rankExercises,
  normalizeSearchQuery,
  levenshteinDistance,
  isFuzzyTokenMatch,
} = await import("../lib/training-v2/exercise-search.ts");

console.log("=== BEHAVIORAL TESTS: EXERCISE SEARCH & RANKING ===");

// Fixtures
const mockExercises = [
  {
    id: 1,
    publicId: "ex-1",
    name: "Supino Reto com Barra",
    scope: "GLOBAL",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Peitoral",
    equipment: "Barra",
    movementPattern: "PUSH",
    difficultyLevel: "INTERMEDIATE",
    status: "PUBLISHED",
    media: [{ role: "START_IMAGE" }],
  },
  {
    id: 2,
    publicId: "ex-2",
    name: "Supino Inclinado com Halteres",
    scope: "GLOBAL",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Peitoral",
    equipment: "Halteres",
    movementPattern: "PUSH",
    difficultyLevel: "INTERMEDIATE",
    status: "PUBLISHED",
    media: [{ role: "EXECUTION_VIDEO" }],
  },
  {
    id: 3,
    publicId: "ex-3",
    name: "Cadeira Extensora",
    scope: "GLOBAL",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Quadríceps",
    equipment: "Máquina",
    movementPattern: "ISOLATION",
    difficultyLevel: "BEGINNER",
    status: "PUBLISHED",
    media: [],
  },
  {
    id: 4,
    publicId: "ex-4",
    name: "Abdominal Infra",
    scope: "CONSULTANCY",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Abdômen",
    equipment: "Peso Corporal",
    movementPattern: "ISOLATION",
    difficultyLevel: "BEGINNER",
    status: "PUBLISHED",
    media: [],
  },
  {
    id: 5,
    publicId: "ex-5",
    name: "Leg Press 45",
    scope: "GLOBAL",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Quadríceps",
    equipment: "Máquina",
    movementPattern: "SQUAT",
    difficultyLevel: "INTERMEDIATE",
    status: "PUBLISHED",
    media: [],
  },
  {
    id: 6,
    publicId: "ex-6",
    name: "Elevação Lateral com Halteres",
    scope: "GLOBAL",
    visibility: "CONSULTANCY",
    muscleGroupPrimary: "Ombros",
    equipment: "Halteres",
    movementPattern: "ISOLATION",
    difficultyLevel: "INTERMEDIATE",
    status: "PUBLISHED",
    media: [],
  },
];

let testsPassed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

// 1. Exact match
test("Busca exata encontra pelo nome normalizado", () => {
  const ranked = rankExercises(mockExercises, "Supino Reto com Barra");
  assert.equal(ranked.length >= 1, true);
  assert.equal(ranked[0].exercise.name, "Supino Reto com Barra");
  assert.equal(ranked[0].matchType, "EXACT_NAME");
  assert.equal(ranked[0].relevanceScore, 1000);
});

// 2. Diacritics and Case Insensitivity
test("Busca ignora acentos e maiúsculas/minúsculas", () => {
  const ranked1 = rankExercises(mockExercises, "abdomen");
  assert.equal(ranked1.some((r) => r.exercise.name.includes("Abdominal")), true);

  const ranked2 = rankExercises(mockExercises, "CADEIRA EXTENSORA");
  assert.equal(ranked2[0].exercise.name, "Cadeira Extensora");
});

// 3. Aliases
test("Busca por apelido popular 'extensora' encontra 'Cadeira Extensora'", () => {
  const ranked = rankExercises(mockExercises, "extensora");
  assert.equal(ranked.length >= 1, true);
  assert.equal(ranked[0].exercise.name, "Cadeira Extensora");
  assert.equal(ranked[0].matchType, "EXACT_ALIAS");
  assert.equal(ranked[0].matchedAlias, "extensora");
});

test("Busca por apelido 'leg' encontra 'Leg Press 45'", () => {
  const ranked = rankExercises(mockExercises, "leg");
  assert.equal(ranked.length >= 1, true);
  assert.equal(ranked[0].exercise.name, "Leg Press 45");
});

// 4. Word Order
test("Busca com palavras em ordem diferente encontra o exercício ('barra supino reto')", () => {
  const ranked = rankExercises(mockExercises, "barra supino reto");
  assert.equal(ranked.length >= 1, true);
  assert.equal(ranked[0].exercise.name, "Supino Reto com Barra");
  assert.equal(ranked[0].matchType, "STRONG_WORDS");
});

// 5. Typos / Small spelling errors
test("Busca com pequeno erro de digitação ('supno reto') sugere 'Supino Reto'", () => {
  const ranked = rankExercises(mockExercises, "supno reto");
  assert.equal(ranked.length >= 1, true);
  assert.equal(ranked[0].exercise.name, "Supino Reto com Barra");
  assert.equal(ranked[0].matchType, "FUZZY_TYPO");
});

// 6. Equipment search
test("Busca por equipamento 'halteres' encontra exercícios com halteres", () => {
  const ranked = rankExercises(mockExercises, "halteres");
  assert.equal(ranked.length >= 2, true);
  const names = ranked.map((r) => r.exercise.name);
  assert.equal(names.includes("Supino Inclinado com Halteres"), true);
  assert.equal(names.includes("Elevação Lateral com Halteres"), true);
});

// 7. Ranking Order
test("Ranking: Nome exato > Palavras fortes > Erro de digitação", () => {
  const scoreExact = scoreExercise(mockExercises[0], "Supino Reto com Barra")?.relevanceScore || 0;
  const scoreWords = scoreExercise(mockExercises[0], "barra supino")?.relevanceScore || 0;
  const scoreTypo = scoreExercise(mockExercises[0], "supno reto")?.relevanceScore || 0;

  assert.equal(scoreExact > scoreWords, true, "Exact should be higher than word match");
  assert.equal(scoreWords > scoreTypo, true, "Word match should be higher than typo match");
});

console.log(`\nTODOS OS ${testsPassed} TESTES PASSARAM COM SUCESSO!`);
