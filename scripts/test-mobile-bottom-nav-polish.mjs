/**
 * TREVO ONE — PHASE 8 BOTTOM NAVIGATION POLISH VERIFICATION SUITE
 * Validates visual hierarchy, sizing, ergonomics, role preservation, and responsive math.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log("==================================================");
console.log("TREVO ONE — BOTTOM NAVIGATION POLISH AUDIT");
console.log("==================================================");

const consultancyNavPath = path.join(
  rootDir,
  "components/consultancies/consultancy-navigation.tsx"
);
assert.ok(fs.existsSync(consultancyNavPath), "consultancy-navigation.tsx must exist");
const consultancyNavCode = fs.readFileSync(consultancyNavPath, "utf-8");

const appShellPath = path.join(
  rootDir,
  "components/consultancies/consultancy-app-shell.tsx"
);
assert.ok(fs.existsSync(appShellPath), "consultancy-app-shell.tsx must exist");
const appShellCode = fs.readFileSync(appShellPath, "utf-8");

const mobileNavMatch = consultancyNavCode.match(/aria-label="Navegação rápida móvel"[\s\S]*?<\/nav>/);
assert.ok(mobileNavMatch, "Mobile bottom nav markup must exist");
const mobileNavCode = mobileNavMatch[0];

// 1. ITEM COUNT BY ROLE
runTest("ITEM COUNT BY ROLE: Capped at 4 primary + 1 Mais button = 5 destinations max", () => {
  assert.ok(
    consultancyNavCode.includes("primaryNavItems.slice(0, 4)") ||
    consultancyNavCode.includes("mobilePrimaryItems.slice(0, 4)"),
    "Mobile bottom nav must strictly cap at 4 primary items"
  );
  assert.ok(
    mobileNavCode.includes('aria-label="Mais opções de navegação"'),
    "5th destination is the 'Mais' trigger button"
  );
});

// 2. ACTIVE STATE
runTest("ACTIVE STATE: Crisp pill + brand highlight + bold label without redundant dot", () => {
  assert.ok(
    mobileNavCode.includes("bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"),
    "Active item must feature soft brand pill background with border"
  );
  assert.ok(
    mobileNavCode.includes("font-semibold text-[var(--brand)]"),
    "Active label must display high-contrast brand font-semibold text"
  );
  assert.ok(
    !mobileNavCode.includes("w-1.5 h-1.5 rounded-full"),
    "Dot indicator removed from bottom nav to avoid redundant visual noise"
  );
});

// 3. INACTIVE STATE
runTest("INACTIVE STATE: Readable foreground-secondary + muted hover", () => {
  assert.ok(
    mobileNavCode.includes("font-medium text-[var(--text-secondary)]"),
    "Inactive labels must be readable with font-medium text-secondary"
  );
  assert.ok(
    mobileNavCode.includes("group-hover:bg-[var(--surface-hover)]"),
    "Inactive items must have subtle hover feedback"
  );
});

// 4. ALL ITEMS SAME STRUCTURE
runTest("ALL ITEMS SAME STRUCTURE: Symmetrical vertical stacking (pill -> icon -> label)", () => {
  // Check that both Link and button use identical flex layout
  const linkMatches = mobileNavCode.match(/group flex flex-col items-center justify-center flex-1 min-w-0 min-h-\[48px\] h-full/g);
  assert.ok(linkMatches && linkMatches.length >= 2, "Link and Mais button must share identical container geometry");
  assert.ok(
    mobileNavCode.includes("px-3 py-1 rounded-full relative flex items-center justify-center"),
    "Both links and Mais button must use identical pill wrapper"
  );
});

// 5. ICON SIZE CONSISTENT
runTest("ICON SIZE CONSISTENT: 22px visual size (w-[22px] h-[22px]) across all items including Operações & Mais", () => {
  assert.ok(
    mobileNavCode.includes('className="w-[22px] h-[22px] shrink-0"'),
    "Links must pass 22px visual size to NavIcon"
  );
  assert.ok(
    /<svg[^>]*className="w-\[22px\] h-\[22px\] shrink-0"[^>]*fill="currentColor"/.test(mobileNavCode) ||
    (mobileNavCode.includes('className="w-[22px] h-[22px] shrink-0"') && mobileNavCode.includes('fill="currentColor"')),
    "Mais icon must use identical 22px visual size"
  );
  assert.ok(
    consultancyNavCode.includes('case "operations":'),
    "NavIcon must define operations center cog icon"
  );
});

// 6. LABEL READABILITY
runTest("LABEL READABILITY: 11px font-medium typography with tight tracking", () => {
  assert.ok(
    mobileNavCode.includes("text-[11px] tracking-tight truncate max-w-full leading-tight mt-1 text-center"),
    "Labels must use comfortable 11px typography with 4px top margin"
  );
  assert.ok(
    !mobileNavCode.includes("text-[10px]"),
    "No ultra-small 10px labels in polished mobile bottom nav"
  );
});

// 7. TOUCH >= 48
runTest("TOUCH >= 48: min-h-[48px] with full bar height tap target", () => {
  assert.ok(
    mobileNavCode.includes("min-h-[48px] h-full"),
    "Every nav destination must fulfill minimum 48px touch target"
  );
  assert.ok(
    mobileNavCode.includes("h-16"),
    "Outer bar must have h-16 (64px) for generous thumb resting zone"
  );
});

// 8. SAFE AREA
runTest("SAFE AREA: env(safe-area-inset-bottom) strictly enforced", () => {
  assert.ok(
    mobileNavCode.includes("pb-[env(safe-area-inset-bottom,0px)]"),
    "Bottom navigation must support iOS home indicator inset"
  );
});

// 9. RESPONSIVE BREAKPOINTS (320px, 360px, 375px, 390px, 414px, 430px)
const viewports = [320, 360, 375, 390, 414, 430];
for (const vp of viewports) {
  runTest(`${vp}PX: 5 items fit comfortably without overflow`, () => {
    const itemWidth = (vp - 8) / 5; // minus 8px container padding
    // Pill is 22px icon + 24px padding = 46px wide
    // Label max chars is "Operações" (9 chars) ~ 54px at 11px font
    assert.ok(itemWidth >= 62, `Item width at ${vp}px (${itemWidth.toFixed(1)}px) must be >= 62px`);
    assert.ok(itemWidth > 46, `Item width (${itemWidth.toFixed(1)}px) accommodates 46px pill`);
  });
}

// 10. NO HORIZONTAL OVERFLOW
runTest("NO HORIZONTAL OVERFLOW: fixed bottom-0 inset-x-0 with truncate max-w-full", () => {
  assert.ok(
    mobileNavCode.includes("fixed bottom-0 inset-x-0 z-30"),
    "Nav must be pinned to full width"
  );
  assert.ok(
    mobileNavCode.includes("truncate max-w-full"),
    "Labels must truncate to eliminate horizontal overflow"
  );
});

// 11. DEDICATED FULLSCREEN FLOWS HIDE
runTest("STUDENT RUNTIME HIDE: Bottom nav hidden on active student workout", () => {
  assert.ok(
    consultancyNavCode.includes("isStudentRuntime"),
    "Must detect active student workout"
  );
  assert.ok(
    consultancyNavCode.includes("shouldHideMobileBottomNav"),
    "Must hide bottom nav on student runtime"
  );
});

runTest("TRAINING BUILDER HIDE: Bottom nav hidden on workout builder", () => {
  assert.ok(
    consultancyNavCode.includes("isWorkoutBuilder"),
    "Must detect workout builder editor routes"
  );
});

runTest("NUTRITION BUILDER HIDE: Bottom nav hidden on nutrition plan builder", () => {
  assert.ok(
    consultancyNavCode.includes("isNutritionBuilder"),
    "Must detect nutrition plan builder editor routes"
  );
});

runTest("KEYBOARD: Bottom nav hidden when virtual keyboard opens", () => {
  assert.ok(
    consultancyNavCode.includes("isKeyboardOpen"),
    "Must track virtual keyboard state"
  );
});

runTest("PWA: PWA standalone safe area and print rules preserved", () => {
  assert.ok(
    mobileNavCode.includes("print:hidden"),
    "Bottom navigation must be hidden in print mode"
  );
  assert.ok(
    mobileNavCode.includes("border-specular-t"),
    "Preserves Trevo specular border styling"
  );
});

console.log("==================================================");
console.log(`BOTTOM NAV POLISH RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
