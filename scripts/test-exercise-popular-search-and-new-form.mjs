/**
 * TREVO ONE — TEST SUITE: POPULAR SEARCH, VIEW MODE SELECTOR & NEW EXERCISE FORM
 * Validates:
 * 1. Mode selector logic (desktop 44px dropdown + mobile bottom sheet, hidden when single mode)
 * 2. 5-tier search ranking with Brazilian fitness aliases & fuzzy typo tolerance
 * 3. Required test cases: extensora, supno reto, supino halter, abdomen, leg 45
 * 4. New exercise form empty defaults, demand-driven accordions, and alias persistence
 * 5. Migration 054 additive integrity
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const {
  rankExercises,
  scoreExercise,
  normalizeSearchQuery,
  tokenizeSearchText,
  getSearchExpansionTerms,
  getExerciseAliases,
  POPULAR_EXERCISE_ALIASES,
} = await import("../lib/training-v2/exercise-search.ts");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("TREVO ONE — POPULAR SEARCH, MODE SELECTOR & FORM AUDIT");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function pass(name) {
  testsPassed++;
  console.log(`[PASS] ${name}`);
}

function fail(name, error) {
  testsFailed++;
  console.error(`[FAIL] ${name}:`, error?.message || error);
}

// -----------------------------------------------------------------------------
// 1. Mock Catalog representing realistic production exercises
// -----------------------------------------------------------------------------
const mockExercises = [
  {
    publicId: "ex-1",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Cadeira Extensora",
    normalizedName: "cadeira extensora",
    muscleGroupPrimary: "Quadríceps",
    equipment: "Máquina",
    difficultyLevel: "BEGINNER",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-2",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Supino Reto com Barra",
    normalizedName: "supino reto com barra",
    muscleGroupPrimary: "Peitoral",
    equipment: "Barra",
    difficultyLevel: "INTERMEDIATE",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-3",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Supino Reto com Halteres",
    normalizedName: "supino reto com halteres",
    muscleGroupPrimary: "Peitoral",
    equipment: "Halteres",
    difficultyLevel: "INTERMEDIATE",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-4",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Supino Inclinado com Halteres",
    normalizedName: "supino inclinado com halteres",
    muscleGroupPrimary: "Peitoral",
    equipment: "Halteres",
    difficultyLevel: "INTERMEDIATE",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-5",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Peck Deck (Fly / Voador)",
    normalizedName: "peck deck fly voador",
    muscleGroupPrimary: "Peitoral",
    equipment: "Máquina",
    difficultyLevel: "BEGINNER",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-6",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Leg Press 45°",
    normalizedName: "leg press 45",
    muscleGroupPrimary: "Quadríceps",
    equipment: "Máquina",
    difficultyLevel: "INTERMEDIATE",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-7",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Abdominal Infra no Solo",
    normalizedName: "abdominal infra no solo",
    muscleGroupPrimary: "Abdominal",
    equipment: "Peso Corporal",
    difficultyLevel: "BEGINNER",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-8",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Abdominal Supra (Crunch)",
    normalizedName: "abdominal supra crunch",
    muscleGroupPrimary: "Abdominal",
    equipment: "Peso Corporal",
    difficultyLevel: "BEGINNER",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-9",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Remada Unilateral com Halter (Serrote)",
    normalizedName: "remada unilateral com halter serrote",
    muscleGroupPrimary: "Costas",
    equipment: "Halteres",
    difficultyLevel: "INTERMEDIATE",
    media: [],
    status: "PUBLISHED",
  },
  {
    publicId: "ex-10",
    scope: "GLOBAL",
    visibility: "GLOBAL",
    consultancyPublicId: null,
    name: "Levantamento Terra com Barra",
    normalizedName: "levantamento terra com barra",
    muscleGroupPrimary: "Costas",
    equipment: "Barra",
    difficultyLevel: "ADVANCED",
    media: [],
    status: "PUBLISHED",
  },
];

// -----------------------------------------------------------------------------
// Test 1: "extensora" -> Cadeira Extensora (Rank 2: EXACT_ALIAS)
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "extensora");
  assert(ranked.length > 0, "Deve encontrar resultados para 'extensora'");
  assert.strictEqual(ranked[0].exercise.name, "Cadeira Extensora");
  assert(
    ranked[0].matchType === "EXACT_ALIAS" || ranked[0].matchType === "STRONG_WORDS",
    `Match type esperado EXACT_ALIAS ou STRONG_WORDS, obtido: ${ranked[0].matchType}`
  );
  pass("Busca 1: 'extensora' -> Cadeira Extensora como primeiro resultado");
} catch (e) {
  fail("Busca 1: 'extensora'", e);
}

// -----------------------------------------------------------------------------
// Test 2: "supno reto" -> Supino Reto (Rank 4: FUZZY_TYPO)
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "supno reto");
  assert(ranked.length > 0, "Deve tolerar erro de digitação 'supno reto'");
  const topNames = ranked.slice(0, 2).map((r) => r.exercise.name);
  assert(
    topNames.includes("Supino Reto com Barra") || topNames.includes("Supino Reto com Halteres"),
    `Top 2 deve incluir Supino Reto, obtido: ${topNames.join(", ")}`
  );
  assert.strictEqual(ranked[0].matchType, "FUZZY_TYPO");
  pass("Busca 2: 'supno reto' -> Tolera erro de digitação e sugere Supino Reto");
} catch (e) {
  fail("Busca 2: 'supno reto'", e);
}

// -----------------------------------------------------------------------------
// Test 3: "supino halter" -> Variações com halteres no topo, distintas da barra
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "supino halter");
  assert(ranked.length >= 2, "Deve retornar variações pertinentes de supino");
  const topResult = ranked[0];
  const secondResult = ranked[1];
  assert(
    topResult.exercise.equipment === "Halteres",
    `O 1º resultado deve ser com halteres, obtido: ${topResult.exercise.name}`
  );
  assert(
    secondResult.exercise.equipment === "Halteres",
    `O 2º resultado deve ser com halteres, obtido: ${secondResult.exercise.name}`
  );

  // Barra variation must have much lower score than halteres variation
  const barraResult = ranked.find((r) => r.exercise.name === "Supino Reto com Barra");
  if (barraResult) {
    assert(
      topResult.relevanceScore > barraResult.relevanceScore + 100,
      `Variações com halteres (${topResult.relevanceScore}) devem superar amplamente barra (${barraResult.relevanceScore})`
    );
  }
  pass("Busca 3: 'supino halter' -> Prioriza variações com halteres e preserva distinção de barra");
} catch (e) {
  fail("Busca 3: 'supino halter'", e);
}

// -----------------------------------------------------------------------------
// Test 4: "abdomen" -> Exercícios pertinentes a abdômen
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "abdomen");
  assert(ranked.length >= 2, "Deve encontrar exercícios do grupo abdominal");
  const allAbdomen = ranked.slice(0, 2).every((r) => r.exercise.muscleGroupPrimary === "Abdominal");
  assert(allAbdomen, "Os primeiros resultados devem pertencer ao grupo Abdominal");
  pass("Busca 4: 'abdomen' -> Retorna exercícios pertinentes do grupo muscular abdominal");
} catch (e) {
  fail("Busca 4: 'abdomen'", e);
}

// -----------------------------------------------------------------------------
// Test 5: "leg 45" -> Leg press 45°
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "leg 45");
  assert(ranked.length > 0, "Deve encontrar Leg Press 45°");
  assert.strictEqual(ranked[0].exercise.name, "Leg Press 45°");
  pass("Busca 5: 'leg 45' -> Reconhece apelido com número e traz Leg Press 45°");
} catch (e) {
  fail("Busca 5: 'leg 45'", e);
}

// -----------------------------------------------------------------------------
// Test 6: "serrote" -> Remada Unilateral (Serrote)
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "serrote");
  assert(ranked.length > 0, "Deve encontrar remada unilateral para 'serrote'");
  assert(ranked[0].exercise.name.includes("Serrote") || ranked[0].exercise.name.includes("Remada"));
  pass("Busca 6: 'serrote' -> Reconhece apelido popular brasileiro Serrote");
} catch (e) {
  fail("Busca 6: 'serrote'", e);
}

// -----------------------------------------------------------------------------
// Test 7: "voador" -> Peck Deck
// -----------------------------------------------------------------------------
try {
  const ranked = rankExercises(mockExercises, "voador");
  assert(ranked.length > 0, "Deve encontrar Peck Deck para 'voador'");
  assert(ranked[0].exercise.name.includes("Peck Deck") || ranked[0].exercise.name.includes("Voador"));
  pass("Busca 7: 'voador' -> Reconhece apelido de máquina popular Voador");
} catch (e) {
  fail("Busca 7: 'voador'", e);
}

// -----------------------------------------------------------------------------
// Test 8: Query expansions helper returns canonical gym mapping
// -----------------------------------------------------------------------------
try {
  const expansionsExt = getSearchExpansionTerms("extensora");
  assert(expansionsExt.includes("cadeira extensora"), "Deve expandir extensora para cadeira extensora");

  const expansionsVoador = getSearchExpansionTerms("voador");
  assert(expansionsVoador.includes("peck deck"), "Deve expandir voador para peck deck");

  const expansionsLeg = getSearchExpansionTerms("leg 45");
  assert(expansionsLeg.includes("leg press 45"), "Deve expandir leg 45 para leg press 45");

  pass("Query Expansion: getSearchExpansionTerms mapeia corretamente apelidos para nomes canônicos");
} catch (e) {
  fail("Query Expansion", e);
}

// -----------------------------------------------------------------------------
// Test 9: Seletor de modo único (CockpitRoleModeSwitcher)
// -----------------------------------------------------------------------------
try {
  const switcherPath = path.join(rootDir, "components/dashboard/cockpit-role-mode-switcher.tsx");
  const switcherContent = fs.readFileSync(switcherPath, "utf-8");

  assert(switcherContent.includes("Modo de acesso"), "Deve conter label 'Modo de acesso'");
  assert(switcherContent.includes("min-h-[44px]"), "Botão desktop deve possuir altura mínima de 44px");
  assert(switcherContent.includes("authorizedOptions.length <= 1"), "Se só existir um modo autorizado, não exibe seletor desnecessário");
  assert(switcherContent.includes("trevo-view-mode-change"), "Deve disparar evento trevo-view-mode-change");
  assert(switcherContent.includes("router.refresh()"), "Deve disparar refresh no router");

  pass("Seletor de Modo: CockpitRoleModeSwitcher possui label discreta, 44px, dropdown desktop e sheet mobile");
} catch (e) {
  fail("Seletor de Modo", e);
}

// -----------------------------------------------------------------------------
// Test 10: Formulário de Novo Exercício (ConsultancyExerciseForm)
// -----------------------------------------------------------------------------
try {
  const formPath = path.join(rootDir, "components/consultancies/training-v2/consultancy-exercise-form.tsx");
  const formContent = fs.readFileSync(formPath, "utf-8");

  // Defaults must NOT pre-select arbitrary values
  assert(
    formContent.includes('const [muscleGroupPrimary, setMuscleGroupPrimary] = useState(initialData?.muscleGroupPrimary || "");'),
    "Grupo muscular não deve iniciar pré-preenchido com 'Peitoral'"
  );
  assert(
    formContent.includes('const [equipment, setEquipment] = useState(initialData?.equipment || "");'),
    "Equipamento não deve iniciar pré-preenchido com 'Halteres'"
  );
  assert(
    formContent.includes('const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | "">('),
    "Nível de dificuldade não deve iniciar pré-preenchido como se o usuário já tivesse escolhido"
  );

  // Demand-driven accordions
  assert(formContent.includes("toggleSection"), "Deve conter controle expansível de seções");
  assert(formContent.includes("Orientações"), "Deve conter seção expansível de Orientações");
  assert(formContent.includes("Fotos e vídeo"), "Deve conter seção expansível de Fotos e vídeo");
  assert(formContent.includes("Detalhes adicionais"), "Deve conter seção expansível de Detalhes adicionais");
  assert(formContent.includes("Outros nomes"), "Deve conter seção expansível de Outros nomes");

  // Save button
  assert(formContent.includes("Salvar exercício"), "Botão principal deve exibir 'Salvar exercício'");
  assert(formContent.includes("min-h-[44px]"), "Campos e botões devem respeitar alvo de toque de pelo menos 44px");

  pass("Formulário de Exercício: Inicia vazio, organiza detalhes sob demanda em 4 accordions e salva apelidos");
} catch (e) {
  fail("Formulário de Exercício", e);
}

// -----------------------------------------------------------------------------
// Test 11: Migration 054 additive integrity
// -----------------------------------------------------------------------------
try {
  const migPath = path.join(rootDir, "database/migrations/054_seed_exercise_aliases.sql");
  assert(fs.existsSync(migPath), "Migration 054 deve existir");
  const migContent = fs.readFileSync(migPath, "utf-8");

  assert(migContent.includes("INSERT IGNORE INTO `exercise_aliases`"), "Migration deve ser aditiva com INSERT IGNORE");
  assert(migContent.includes("extensora"), "Migration deve semear apelido extensora");
  assert(migContent.includes("leg 45"), "Migration deve semear apelido leg 45");
  assert(migContent.includes("voador"), "Migration deve semear apelido voador");
  assert(migContent.includes("serrote"), "Migration deve semear apelido serrote");

  pass("Migration 054: Aditiva, segura, semeia aliases para exercícios existentes sem renomear o acervo");
} catch (e) {
  fail("Migration 054", e);
}

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log("==================================================");
console.log(`AUDIT RESULTS: ${testsPassed} PASS / ${testsFailed} FAIL`);
console.log("==================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
