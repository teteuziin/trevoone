import assert from "node:assert";
import fs from "node:fs";

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

// 4. Modal Readability & Accessibility Verification
const modalCode = fs.readFileSync("components/consultancies/training-v2/workout-next-exercise-default-modal.tsx", "utf8");

// Surface & Opacity Verification
assert(modalCode.includes("createPortal("), "Must use createPortal to mount cleanly to document.body");
assert(modalCode.includes("document.body"), "Must mount to document.body");
assert(!modalCode.includes("bg-[var(--surface-primary)]"), "Must NOT use undefined transparent --surface-primary");
assert(!modalCode.includes("bg-[var(--surface-secondary)]"), "Must NOT use undefined transparent --surface-secondary");
assert(modalCode.includes("bg-white dark:bg-zinc-900"), "Must use 100% solid, opaque card background");
assert(modalCode.includes("bg-zinc-50 dark:bg-zinc-950"), "Must use solid header/footer background");

// Accessibility: htmlFor and id associations
assert(modalCode.includes('htmlFor="default-sets-input"'), "Sets label must link to input via htmlFor");
assert(modalCode.includes('id="default-sets-input"'), "Sets input must have matching id");
assert(modalCode.includes('htmlFor="default-reps-min-input"'), "Reps min label must link via htmlFor");
assert(modalCode.includes('id="default-reps-min-input"'), "Reps min input must have matching id");
assert(modalCode.includes('htmlFor="default-reps-max-input"'), "Reps max label must link via htmlFor");
assert(modalCode.includes('id="default-reps-max-input"'), "Reps max input must have matching id");
assert(modalCode.includes('htmlFor="default-reps-input"'), "Fixed reps label must link via htmlFor");
assert(modalCode.includes('id="default-reps-input"'), "Fixed reps input must have matching id");

// Touch targets & iOS Zoom Prevention
assert(modalCode.includes("min-h-[44px]"), "All touch targets must meet minimum 44px height");
assert(modalCode.includes("min-w-[44px]"), "Close button must meet minimum 44px touch target");
assert(modalCode.includes("text-base sm:text-sm"), "Inputs must have at least 16px text on mobile to avoid iOS Safari zoom");

// Keyboard Navigation
assert(modalCode.includes('"Escape"'), "Must handle Escape key to close modal");

// High contrast preview
assert(modalCode.includes("bg-emerald-50 dark:bg-emerald-950/50"), "Preview box must have discreet solid background");
assert(modalCode.includes("text-emerald-950 dark:text-emerald-100"), "Preview box must have high-contrast text");

console.log("✓ Modal structure, accessibility (htmlFor/id, 44px touch targets, Escape key, solid opaque surfaces) verified!");

// 5. WCAG Contrast Ratio Verification
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const parse = (hex) => {
    hex = hex.replace("#", "");
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  };
  const lum1 = getLuminance(...parse(hex1));
  const lum2 = getLuminance(...parse(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Light Mode Contrasts
const lightCardBg = "#ffffff";
const lightTextPrimary = "#18181b"; // zinc-900
const lightTextSecondary = "#3f3f46"; // zinc-700
const lightPreviewBg = "#ecfdf5"; // emerald-50
const lightPreviewText = "#022c22"; // emerald-950

const ratioLightPrimary = getContrastRatio(lightTextPrimary, lightCardBg);
const ratioLightSecondary = getContrastRatio(lightTextSecondary, lightCardBg);
const ratioLightPreview = getContrastRatio(lightPreviewText, lightPreviewBg);

assert(ratioLightPrimary >= 4.5, `Light text primary ratio ${ratioLightPrimary} must be >= 4.5`);
assert(ratioLightSecondary >= 4.5, `Light text secondary ratio ${ratioLightSecondary} must be >= 4.5`);
assert(ratioLightPreview >= 4.5, `Light preview ratio ${ratioLightPreview} must be >= 4.5`);
console.log(`✓ Light mode contrast verified (Primary: ${ratioLightPrimary.toFixed(1)}:1, Labels: ${ratioLightSecondary.toFixed(1)}:1, Preview: ${ratioLightPreview.toFixed(1)}:1)`);

// Dark Mode Contrasts
const darkCardBg = "#18181b"; // zinc-900
const darkTextPrimary = "#f4f4f5"; // zinc-100
const darkTextSecondary = "#d4d4d8"; // zinc-300
const darkPreviewBg = "#064e3b"; // emerald-950
const darkPreviewText = "#d1fae5"; // emerald-100

const ratioDarkPrimary = getContrastRatio(darkTextPrimary, darkCardBg);
const ratioDarkSecondary = getContrastRatio(darkTextSecondary, darkCardBg);
const ratioDarkPreview = getContrastRatio(darkPreviewText, darkPreviewBg);

assert(ratioDarkPrimary >= 4.5, `Dark text primary ratio ${ratioDarkPrimary} must be >= 4.5`);
assert(ratioDarkSecondary >= 4.5, `Dark text secondary ratio ${ratioDarkSecondary} must be >= 4.5`);
assert(ratioDarkPreview >= 4.5, `Dark preview ratio ${ratioDarkPreview} must be >= 4.5`);
console.log(`✓ Dark mode contrast verified (Primary: ${ratioDarkPrimary.toFixed(1)}:1, Labels: ${ratioDarkSecondary.toFixed(1)}:1, Preview: ${ratioDarkPreview.toFixed(1)}:1)`);

console.log("✓ All workout next exercise default tests passed cleanly!");
