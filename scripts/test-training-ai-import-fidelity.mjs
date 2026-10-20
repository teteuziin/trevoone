import assert from "node:assert";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const {
  resolveCanonicalExercise,
  calculateExerciseMatchScore,
  hasConflictingModifiers,
  areExerciseSynonyms,
} = await import("../lib/training-v2/exercise-resolver.ts");

const { POPULAR_EXERCISE_ALIASES } = await import("../lib/training-v2/exercise-search.ts");

console.log("=== RUNNING TRAINING IMPORT FIDELITY TESTS ===");

// 1. Conflict Guards
console.log("1. Testing conflict guards...");
assert.strictEqual(
  hasConflictingModifiers("Cadeira abdutora", "Cadeira adutora"),
  true,
  "Cadeira abdutora MUST conflict with Cadeira adutora"
);
assert.strictEqual(
  hasConflictingModifiers("Cadeira extensora", "Mesa flexora"),
  true,
  "Cadeira extensora MUST conflict with Mesa flexora"
);
assert.strictEqual(
  hasConflictingModifiers("Cadeira extensora", "Cadeira flexora"),
  true,
  "Cadeira extensora MUST conflict with Cadeira flexora"
);
assert.strictEqual(
  hasConflictingModifiers("Cadeira extensora", "Extensão de pernas"),
  false,
  "Cadeira extensora must NOT conflict with Extensão de pernas"
);
assert.strictEqual(
  hasConflictingModifiers("Cadeira abdutora", "Abdução de quadril"),
  false,
  "Cadeira abdutora must NOT conflict with Abdução de quadril"
);
assert.strictEqual(
  hasConflictingModifiers("Cadeira adutora", "Adução de quadril"),
  false,
  "Cadeira adutora must NOT conflict with Adução de quadril"
);
console.log("✓ Conflict guards passed!");

// 2. Popular aliases index
console.log("2. Testing popular exercise aliases...");
assert.ok(POPULAR_EXERCISE_ALIASES["cadeira abdutora"], "cadeira abdutora must be in popular aliases");
assert.ok(POPULAR_EXERCISE_ALIASES["cadeira adutora"], "cadeira adutora must be in popular aliases");
assert.ok(POPULAR_EXERCISE_ALIASES["cadeira extensora"], "cadeira extensora must be in popular aliases");
console.log("✓ Popular aliases present!");

// 3. Catalog Matching without false ambiguity
console.log("3. Testing catalog matching for key exercises...");
const mockCatalog = [
  { publicId: "ex-agach", name: "Agachamento livre com barra" },
  { publicId: "ex-leg45", name: "Leg press 45" },
  { publicId: "ex-mesa-flex", name: "Mesa flexora" },
  { publicId: "ex-cad-ext", name: "Cadeira extensora" },
  { publicId: "ex-cad-abd", name: "Cadeira abdutora" },
  { publicId: "ex-cad-adut", name: "Cadeira adutora" },
  { publicId: "ex-ext-short", name: "Extensora" },
  { publicId: "ex-abd-short", name: "Abdutora" },
];

// Query "Cadeira extensora" should cleanly match "Cadeira extensora", NOT ambiguous with "Extensora"
const matchExt = resolveCanonicalExercise("Cadeira extensora", mockCatalog);
assert.strictEqual(matchExt.status, "MATCHED", "Cadeira extensora should be MATCHED");
assert.strictEqual(matchExt.matched?.publicId, "ex-cad-ext");

// Query "Cadeira abdutora" should cleanly match "Cadeira abdutora", NOT ambiguous with "Abdutora"
const matchAbd = resolveCanonicalExercise("Cadeira abdutora", mockCatalog);
assert.strictEqual(matchAbd.status, "MATCHED", "Cadeira abdutora should be MATCHED");
assert.strictEqual(matchAbd.matched?.publicId, "ex-cad-abd");

// Query "Leg press 45"
const matchLeg = resolveCanonicalExercise("Leg press 45", mockCatalog);
assert.strictEqual(matchLeg.status, "MATCHED");
assert.strictEqual(matchLeg.matched?.publicId, "ex-leg45");

// Query with database aliases
const libraryWithCustomAliases = [
  {
    publicId: "ex-custom-ext",
    name: "Extensão de Pernas na Máquina",
    aliases: ["cadeira extensora", "extensora"]
  }
];
const matchCustom = resolveCanonicalExercise("Cadeira extensora", libraryWithCustomAliases);
assert.strictEqual(matchCustom.status, "MATCHED");
assert.strictEqual(matchCustom.matched?.publicId, "ex-custom-ext");

console.log("✓ All training import fidelity tests passed cleanly!");
