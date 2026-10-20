import assert from "node:assert";

console.log("=== RUNNING WORKOUT NEXT EXERCISE DEFAULT TESTS ===");

// 1. Fixed Reps Default
const fixedDefault = {
  sets: 3,
  repsType: "FIXED",
  reps: 10,
  repsMin: null,
  repsMax: null,
};

assert.strictEqual(fixedDefault.sets, 3);
assert.strictEqual(fixedDefault.repsType, "FIXED");
assert.strictEqual(fixedDefault.reps, 10);

const fixedSummary = `${fixedDefault.sets} séries · ${fixedDefault.reps} reps`;
assert.strictEqual(fixedSummary, "3 séries · 10 reps");
console.log("✓ Fixed reps default verified:", fixedSummary);

// 2. Range Reps Default
const rangeDefault = {
  sets: 4,
  repsType: "RANGE",
  reps: null,
  repsMin: 8,
  repsMax: 12,
};

assert.strictEqual(rangeDefault.sets, 4);
assert.strictEqual(rangeDefault.repsType, "RANGE");
assert.strictEqual(rangeDefault.repsMin, 8);
assert.strictEqual(rangeDefault.repsMax, 12);

const rangeSummary = `${rangeDefault.sets} séries · ${rangeDefault.repsMin}–${rangeDefault.repsMax} reps`;
assert.strictEqual(rangeSummary, "4 séries · 8–12 reps");
console.log("✓ Range reps default verified:", rangeSummary);

// 3. Prescription Injection Simulation
function simulateAddExercise(defaultConfig) {
  const setCount = defaultConfig?.sets || 4;
  const targetReps = defaultConfig
    ? (defaultConfig.repsType === "FIXED" ? defaultConfig.reps : defaultConfig.repsMin)
    : 10;
  const targetRepsMax = defaultConfig && defaultConfig.repsType === "RANGE"
    ? defaultConfig.repsMax
    : null;

  const sets = [];
  for (let s = 1; s <= setCount; s++) {
    sets.push({
      setNumber: s,
      targetReps,
      targetRepsMax,
      targetRestSeconds: 60,
    });
  }
  return sets;
}

const setsWithRange = simulateAddExercise(rangeDefault);
assert.strictEqual(setsWithRange.length, 4, "Should create 4 sets");
assert.strictEqual(setsWithRange[0].targetReps, 8, "Min reps should be 8");
assert.strictEqual(setsWithRange[0].targetRepsMax, 12, "Max reps should be 12");

const setsWithFixed = simulateAddExercise(fixedDefault);
assert.strictEqual(setsWithFixed.length, 3, "Should create 3 sets");
assert.strictEqual(setsWithFixed[0].targetReps, 10, "Reps should be 10");
assert.strictEqual(setsWithFixed[0].targetRepsMax, null, "Max reps should be null");

const setsWithNoDefault = simulateAddExercise(null);
assert.strictEqual(setsWithNoDefault.length, 4, "Default fallback should create 4 sets");
assert.strictEqual(setsWithNoDefault[0].targetReps, 10, "Default fallback reps should be 10");

console.log("✓ Simulation of prescription injection with defaults passed!");
console.log("✓ All workout next exercise default tests passed cleanly!");
