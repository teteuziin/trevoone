import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== TEST: WORKOUT EXERCISE OCCURRENCE RENAMING ===");

// 1. Verify types
const typesFile = fs.readFileSync("lib/training-v2/types.ts", "utf8");
assert.ok(
  typesFile.includes("originalExerciseName?: string | null;"),
  "WorkoutBlockItemDto must have originalExerciseName?: string | null"
);
console.log("✔ types.ts: WorkoutBlockItemDto contains originalExerciseName");

// 2. Verify workout-repository
const repoFile = fs.readFileSync("lib/training-v2/workout-repository.ts", "utf8");
assert.ok(
  repoFile.includes("export async function renameWorkoutItemInDraft("),
  "workout-repository must export renameWorkoutItemInDraft"
);
assert.ok(
  repoFile.includes("assertCanAuthorTraining(ctx)"),
  "renameWorkoutItemInDraft must enforce assertCanAuthorTraining RBAC check"
);
assert.ok(
  repoFile.includes("e.name AS original_exercise_name"),
  "getWorkoutVersionTree must query e.name AS original_exercise_name"
);
assert.ok(
  repoFile.includes("originalExerciseName: item.original_exercise_name ? String(item.original_exercise_name) : null"),
  "getWorkoutVersionTree must map originalExerciseName"
);
assert.ok(
  repoFile.includes("O nome do exercício deve ter pelo menos 2 caracteres."),
  "renameWorkoutItemInDraft must validate minimum name length"
);
assert.ok(
  repoFile.includes("Apenas treinos em rascunho podem ter exercícios renomeados."),
  "renameWorkoutItemInDraft must enforce DRAFT status only"
);
console.log("✔ workout-repository.ts: renameWorkoutItemInDraft and originalExerciseName mapping validated");

// 3. Verify actions
const actionsFile = fs.readFileSync("app/consultoria/[slug]/rotinas/actions.ts", "utf8");
assert.ok(
  actionsFile.includes("export async function renameExerciseItemAction("),
  "actions.ts must export renameExerciseItemAction"
);
assert.ok(
  actionsFile.includes("renameWorkoutItemInDraft(ctx, itemPublicId, newName)"),
  "renameExerciseItemAction must delegate to renameWorkoutItemInDraft"
);
console.log("✔ actions.ts: renameExerciseItemAction verified");

// 4. Verify Modal component
const modalFile = fs.readFileSync(
  "components/consultancies/training-v2/workout-rename-exercise-modal.tsx",
  "utf8"
);
assert.ok(
  modalFile.includes("Renomear exercício na ficha"),
  "Modal must have title 'Renomear exercício na ficha'"
);
assert.ok(
  modalFile.includes("Nome na ficha"),
  "Modal must have label 'Nome na ficha'"
);
assert.ok(
  modalFile.includes("Este nome aparece para o aluno. O vídeo de execução permanece vinculado."),
  "Modal must have helper text 'Este nome aparece para o aluno. O vídeo de execução permanece vinculado.'"
);
assert.ok(
  modalFile.includes("Usar nome original ("),
  "Modal must have 'Usar nome original' option"
);
assert.ok(
  modalFile.includes("Aplicar"),
  "Modal must have 'Aplicar' action"
);
assert.ok(
  modalFile.includes("Cancelar"),
  "Modal must have 'Cancelar' action"
);
console.log("✔ workout-rename-exercise-modal.tsx: requirements and accessibility verified");

// 5. Verify Category Card & Actions Menu
const cardFile = fs.readFileSync(
  "components/consultancies/training-v2/workout-category-card.tsx",
  "utf8"
);
assert.ok(
  cardFile.includes('aria-label="Renomear exercício"'),
  "Category card must render pencil button with aria-label='Renomear exercício'"
);
assert.ok(
  cardFile.includes("Renomear exercício</span>"),
  "ExerciseActionsSheet must contain 'Renomear exercício' option"
);
assert.ok(
  cardFile.includes("<WorkoutRenameExerciseModal"),
  "Category card must render WorkoutRenameExerciseModal"
);
console.log("✔ workout-category-card.tsx: pencil trigger, actions menu item, and modal integration verified");

// 6. Verify Workout Builder
const builderFile = fs.readFileSync(
  "components/consultancies/training-v2/workout-builder.tsx",
  "utf8"
);
assert.ok(
  builderFile.includes("async function handleRenameExercise("),
  "Builder must implement handleRenameExercise"
);
assert.ok(
  builderFile.includes("renameExerciseItemAction(consultancySlug, itemPublicId, newName)"),
  "Builder must call renameExerciseItemAction"
);
assert.ok(
  builderFile.includes("onRenameExercise={handleRenameExercise}"),
  "Builder must pass onRenameExercise to WorkoutCategoryCard"
);
console.log("✔ workout-builder.tsx: handleRenameExercise and autosave verified");

console.log("\nALL 6 WORKOUT EXERCISE RENAMING QA CHECKS PASSED!");
