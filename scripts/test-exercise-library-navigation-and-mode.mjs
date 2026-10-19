import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  normalizeSearchQuery,
  tokenizeSearchText,
  levenshteinDistance,
  scoreExercise,
  rankExercises,
} = await import("../lib/training-v2/exercise-search.ts");

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — EXERCISE LIBRARY & VIEW MODE AUDIT");
console.log("==================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. Audit exercicios/page.tsx
runTest("Audit exercicios/page.tsx: View mode resolution & ExerciseLibraryView", () => {
  const filePath = path.join(rootDir, "app/consultoria/[slug]/exercicios/page.tsx");
  assert.ok(fs.existsSync(filePath), "exercicios/page.tsx must exist");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.ok(
    content.includes("resolveEffectiveViewMode"),
    "Must import and call resolveEffectiveViewMode"
  );
  assert.ok(
    content.includes("viewModeState={effectiveState}"),
    "Must pass viewModeState to ConsultancyAppShell"
  );
  assert.ok(
    content.includes("themeVariant=\"dark-overview\""),
    "Must use themeVariant='dark-overview'"
  );
  assert.ok(
    content.includes("showDashboardWallpaper={true}"),
    "Must enable showDashboardWallpaper"
  );
  assert.ok(
    content.includes("<ExerciseLibraryView"),
    "Must render unified ExerciseLibraryView"
  );
});

// 2. Audit exercicios/[publicId]/page.tsx & novo/page.tsx
runTest("Audit sub-routes: Detail & Novo page preserve viewModeState", () => {
  const detailPath = path.join(rootDir, "app/consultoria/[slug]/exercicios/[publicId]/page.tsx");
  const novoPath = path.join(rootDir, "app/consultoria/[slug]/exercicios/novo/page.tsx");

  assert.ok(fs.existsSync(detailPath), "Detail page must exist");
  assert.ok(fs.existsSync(novoPath), "Novo page must exist");

  const detailContent = fs.readFileSync(detailPath, "utf-8");
  const novoContent = fs.readFileSync(novoPath, "utf-8");

  assert.ok(
    detailContent.includes("resolveEffectiveViewMode") &&
    detailContent.includes("viewModeState={effectiveState}"),
    "Detail page must resolve and pass viewModeState"
  );
  assert.ok(
    novoContent.includes("resolveEffectiveViewMode") &&
    novoContent.includes("viewModeState={effectiveState}"),
    "Novo page must resolve and pass viewModeState"
  );
});

// 3. Audit ConsultancyAppShell & Navigation
runTest("Audit ConsultancyAppShell & Navigation: Role preservation & switcher", () => {
  const shellPath = path.join(rootDir, "components/consultancies/consultancy-app-shell.tsx");
  const navPath = path.join(rootDir, "components/consultancies/consultancy-navigation.tsx");

  assert.ok(fs.existsSync(shellPath), "consultancy-app-shell.tsx must exist");
  assert.ok(fs.existsSync(navPath), "consultancy-navigation.tsx must exist");

  const shellContent = fs.readFileSync(shellPath, "utf-8");
  const navContent = fs.readFileSync(navPath, "utf-8");

  // Multi-role personal + admin can access exercise library without switching
  assert.ok(
    shellContent.includes("if (isPersonal || isAdmin)"),
    "Library navigation must be available to both Personal and Admin modes"
  );
  assert.ok(
    shellContent.includes("resolvedViewModeState.effectiveMode === \"ADMIN\""),
    "AppShell role resolution must use resolvedViewModeState"
  );

  // Desktop navigation switcher
  assert.ok(
    navContent.includes("<CockpitRoleModeSwitcher"),
    "Navigation must render CockpitRoleModeSwitcher on desktop sidebar"
  );
});

// 4. Audit Exercise Search: Accents, case, typos, aliases, ranking
runTest("Audit Exercise Search: 5-tier ranking & Brazilian fitness aliases", () => {
  const exercises = [
    {
      id: 1,
      publicId: "ex-1",
      name: "Supino Reto com Barra",
      muscleGroupPrimary: "Peito",
      equipment: "Barra",
      scope: "GLOBAL",
      visibility: "GLOBAL",
      status: "PUBLISHED",
      difficultyLevel: "INTERMEDIATE",
      aliases: ["Supino Barra", "Supino"],
    },
    {
      id: 2,
      publicId: "ex-2",
      name: "Cadeira Extensora",
      muscleGroupPrimary: "Quadríceps",
      equipment: "Máquina",
      scope: "GLOBAL",
      visibility: "GLOBAL",
      status: "PUBLISHED",
      difficultyLevel: "BEGINNER",
      aliases: ["Extensora de Joelhos", "Extensora"],
    },
    {
      id: 3,
      publicId: "ex-3",
      name: "Puxada Frontal Aberta",
      muscleGroupPrimary: "Costas",
      equipment: "Polia",
      scope: "GLOBAL",
      visibility: "GLOBAL",
      status: "PUBLISHED",
      difficultyLevel: "INTERMEDIATE",
      aliases: ["Lat Pulldown", "Puxador Frente"],
    },
    {
      id: 4,
      publicId: "ex-4",
      name: "Levantamento Terra Romeno (Stiff)",
      muscleGroupPrimary: "Posterior de Coxa",
      equipment: "Barra",
      scope: "GLOBAL",
      visibility: "GLOBAL",
      status: "PUBLISHED",
      difficultyLevel: "INTERMEDIATE",
      aliases: ["Stiff", "RDL"],
    },
  ];

  // Search by exact alias "extensora"
  const ranked1 = rankExercises(exercises, "extensora");
  assert.strictEqual(ranked1[0].exercise.name, "Cadeira Extensora", "Extensora alias must rank first");
  assert.ok(ranked1[0].matchedAlias, "Must populate matchedAlias");

  // Search with typo "extencora"
  const rankedTypo = rankExercises(exercises, "extencora");
  assert.strictEqual(rankedTypo[0].exercise.name, "Cadeira Extensora", "Typo 'extencora' must still match Cadeira Extensora");

  // Search by word order "reto supino"
  const rankedOrder = rankExercises(exercises, "reto supino");
  assert.strictEqual(rankedOrder[0].exercise.name, "Supino Reto com Barra", "Inverted word order must match");

  // Search by equipment "polia"
  const rankedEquip = rankExercises(exercises, "polia");
  assert.strictEqual(rankedEquip[0].exercise.name, "Puxada Frontal Aberta", "Equipment search must match");

  // Search by alias "stiff"
  const rankedStiff = rankExercises(exercises, "stiff");
  assert.strictEqual(rankedStiff[0].exercise.name, "Levantamento Terra Romeno (Stiff)", "Stiff must match");
});

// 5. Audit Migration
runTest("Audit Database Migration: 053_exercise_aliases_and_search.sql", () => {
  const migPath = path.join(rootDir, "database/migrations/053_exercise_aliases_and_search.sql");
  assert.ok(fs.existsSync(migPath), "Migration 053 must exist");
  const migContent = fs.readFileSync(migPath, "utf-8");
  assert.ok(
    migContent.includes("exercise_aliases"),
    "Migration must create exercise_aliases"
  );
  assert.ok(
    migContent.includes("idx_ex_equipment"),
    "Migration must index equipment"
  );
});

console.log("==================================================");
console.log(`AUDIT RESULTS: ${passed} PASS / ${failed} FAIL`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
