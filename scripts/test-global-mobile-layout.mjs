import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — GLOBAL MOBILE RESPONSIVE AUDIT SUITE");
console.log("==================================================");

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

// 1. Audit app/globals.css
const globalsCssPath = path.join(rootDir, "app/globals.css");
assert.ok(fs.existsSync(globalsCssPath), "app/globals.css exists");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");

// 2. Audit app/layout.tsx
const rootLayoutPath = path.join(rootDir, "app/layout.tsx");
assert.ok(fs.existsSync(rootLayoutPath), "app/layout.tsx exists");
const rootLayout = fs.readFileSync(rootLayoutPath, "utf-8");

// 3. Audit ConsultancyAppShell
const shellPath = path.join(rootDir, "components/consultancies/consultancy-app-shell.tsx");
assert.ok(fs.existsSync(shellPath), "consultancy-app-shell.tsx exists");
const shellCode = fs.readFileSync(shellPath, "utf-8");

// 4. Audit ConsultancyNavigation
const navPath = path.join(rootDir, "components/consultancies/consultancy-navigation.tsx");
assert.ok(fs.existsSync(navPath), "consultancy-navigation.tsx exists");
const navCode = fs.readFileSync(navPath, "utf-8");

// 5. Audit PlatformAdminShell
const adminShellPath = path.join(rootDir, "components/admin/platform-admin-shell.tsx");
assert.ok(fs.existsSync(adminShellPath), "platform-admin-shell.tsx exists");
const adminShellCode = fs.readFileSync(adminShellPath, "utf-8");

// 6. Audit WorkoutBuilder & Routine Page
const routinePagePath = path.join(rootDir, "app/consultoria/[slug]/rotinas/[publicId]/page.tsx");
assert.ok(fs.existsSync(routinePagePath), "routine page.tsx exists");
const routinePageCode = fs.readFileSync(routinePagePath, "utf-8");

const builderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
assert.ok(fs.existsSync(builderPath), "workout-builder.tsx exists");
const builderCode = fs.readFileSync(builderPath, "utf-8");

const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
assert.ok(fs.existsSync(categoryCardPath), "workout-category-card.tsx exists");
const categoryCardCode = fs.readFileSync(categoryCardPath, "utf-8");

// Tests
runTest("NO GLOBAL DESKTOP MIN WIDTH: PASS", () => {
  // html and body must not have desktop min-width: 768px, 1024px, 1200px
  assert.ok(!/html[^{]*\{[^}]*min-width:\s*(768|1024|1200|1440)px/i.test(globalsCss), "html must not have desktop min-width");
  assert.ok(!/body[^{]*\{[^}]*min-width:\s*(768|1024|1200|1440)px/i.test(globalsCss), "body must not have desktop min-width");
  assert.ok(globalsCss.includes("width: 100%"), "html/body must specify width: 100%");
  assert.ok(globalsCss.includes("max-width: 100%"), "html/body must specify max-width: 100%");
  assert.ok(globalsCss.includes("min-width: 0"), "html/body must specify min-width: 0");
});

runTest("MOBILE SIDEBAR RESERVES NO SPACE: PASS", () => {
  // On mobile, sidebar must not have static reservation (e.g., permanent ml-64 or static grid col)
  assert.ok(
    navCode.includes("fixed inset-y-0") || navCode.includes("z-50"),
    "Mobile sidebar must use fixed overlay drawer, taking 0 static layout space"
  );
  assert.ok(
    !navCode.includes("ml-64 w-full") && !navCode.includes("ml-72 w-full"),
    "Sidebar must not push mobile layout with unconditional margin-left"
  );
  // Main in consultancy-app-shell must not have unconditional desktop margin
  assert.ok(!shellCode.includes("ml-64") && !shellCode.includes("ml-72"), "Consultancy shell main must not have permanent mobile margin");
});

runTest("MAIN FLEX CHILD HAS MIN-W-0: PASS", () => {
  // ConsultancyAppShell: main must have min-w-0 max-w-full
  assert.ok(
    shellCode.includes("min-w-0") && shellCode.includes("max-w-full"),
    "Consultancy shell main must have min-w-0 and max-w-full to prevent flex content expansion"
  );
  // PlatformAdminShell: main must have min-w-0 max-w-full
  assert.ok(
    adminShellCode.includes("min-w-0") && adminShellCode.includes("max-w-full"),
    "Platform admin shell main must have min-w-0 and max-w-full"
  );
});

runTest("NO MOBILE 100VW INSIDE PADDED CONTAINER: PASS", () => {
  // Shell and builder must not nest w-screen or 100vw within padded containers
  assert.ok(!shellCode.includes("w-screen"), "Consultancy shell must not contain w-screen");
  assert.ok(!builderCode.includes("w-[100vw]") && !builderCode.includes("width: 100vw"), "Workout builder must not use 100vw");
  assert.ok(!routinePageCode.includes("w-screen"), "Routine page must not use w-screen");
});

runTest("NO GLOBAL SCALE: PASS", () => {
  assert.ok(!/html[^{]*\{[^}]*transform:\s*scale/i.test(globalsCss), "html must not have global scale");
  assert.ok(!/body[^{]*\{[^}]*transform:\s*scale/i.test(globalsCss), "body must not have global scale");
  assert.ok(!rootLayout.includes("scale-"), "root layout must not have global scale class");
});

runTest("NO GLOBAL ZOOM: PASS", () => {
  assert.ok(!/html[^{]*\{[^}]*zoom:/i.test(globalsCss), "html must not have global zoom");
  assert.ok(!/body[^{]*\{[^}]*zoom:/i.test(globalsCss), "body must not have global zoom");
  assert.ok(!rootLayout.includes("zoom"), "root layout must not have zoom");
});

runTest("VIEWPORT META: PASS", () => {
  assert.ok(rootLayout.includes('width: "device-width"'), "Viewport metadata must define width: device-width");
  assert.ok(rootLayout.includes("initialScale: 1"), "Viewport metadata must define initialScale: 1");
  assert.ok(!rootLayout.includes("user-scalable=no"), "Viewport metadata must not force user-scalable=no");
  assert.ok(!rootLayout.includes("maximumScale"), "Viewport metadata must not restrict maximumScale");
});

runTest("MOBILE GRID SINGLE COLUMN: PASS", () => {
  // Workout builder workspace grid must be single column on mobile
  assert.ok(
    builderCode.includes("grid-cols-1 lg:grid-cols-12"),
    "Workout builder workspace grid must be 1 column on mobile and 12 columns only on lg breakpoint"
  );
});

runTest("DESKTOP SHELL PRESERVED: PASS", () => {
  assert.ok(
    navCode.includes("hidden md:flex") || navCode.includes("hidden lg:flex"),
    "Desktop sidebar layout must be preserved for md/lg breakpoints"
  );
  assert.ok(
    navCode.includes("Trevo One") || navCode.includes("TREVO ONE"),
    "Consultancy navigation brand header must be preserved"
  );
});

runTest("NO OVERFLOW-X HIDDEN AS MASK: PASS", () => {
  assert.ok(
    !/body\s*\{[^}]*overflow-x:\s*hidden/i.test(globalsCss),
    "Body must not use overflow-x: hidden as a global mask"
  );
  assert.ok(
    !/html\s*\{[^}]*overflow-x:\s*hidden/i.test(globalsCss),
    "Html must not use overflow-x: hidden as a global mask"
  );
});

runTest("BUILDER ACTIONS WRAP AND MIN-W-0 CONSTRAINTS: PASS", () => {
  // Mobile builder header actions toolbar must wrap and have min-w-0
  assert.ok(
    builderCode.includes('data-testid="mobile-builder-header"'),
    "Workout builder mobile header testid must exist"
  );
  assert.ok(
    builderCode.includes("data-testid=\"mobile-builder-header\"") &&
    builderCode.includes("flex-wrap") &&
    builderCode.includes("min-w-0"),
    "Workout builder actions toolbar must allow wrapping and min-w-0"
  );
});

runTest("CATEGORY AND COMBINATION CARDS WIDTH CONSTRAINTS: PASS", () => {
  // Category card and Combination block must declare w-full max-w-full min-w-0
  assert.ok(
    categoryCardCode.includes('data-testid="mobile-combination-block"'),
    "Combination block testid must exist"
  );
  assert.ok(
    categoryCardCode.includes("data-block-type=\"unified-combination-block\""),
    "Combination block marker must exist"
  );
  assert.ok(
    categoryCardCode.includes("w-full max-w-full min-w-0"),
    "Category cards and combination blocks must be constrained with w-full max-w-full min-w-0"
  );
});

runTest("VIEWPORT WIDTH ADAPTATION (320px, 360px, 375px, 390px, 412px, 430px): PASS", () => {
  // Check that no fixed min-width element exceeds 320px in core layout files
  const fixedMinWs = [...builderCode.matchAll(/min-w-\[(\d+)px\]/g)].map(m => parseInt(m[1], 10));
  const over320 = fixedMinWs.filter(w => w > 300);
  assert.equal(over320.length, 0, `No fixed min-w above 300px in builder (found: ${over320.join(", ")})`);

  // Verify page wrapper constraints
  assert.ok(
    routinePageCode.includes("w-full max-w-full min-w-0"),
    "Routine page wrapper must have w-full max-w-full min-w-0"
  );
});

console.log("==================================================");
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("AUTOMATED STRUCTURAL CHECK: PASS");
  console.log("VISUAL QA: PENDING USER");
}
