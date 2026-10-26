/**
 * TREVO ONE — PERFORMANCE OPTIMIZATIONS BEHAVIORAL VERIFICATION
 *
 * Verifies:
 * 1. Single variable font in app/layout.tsx (no redundant multi-file woff2 requests).
 * 2. Splash prefetch on mount for instant zero-stall transition.
 * 3. Loading skeleton files present on all heavy routes to eliminate white screen.
 * 4. Audio preload="none" on login to avoid unneeded initial audio fetches.
 * 5. Out-of-order search protection (requestId counter pattern) in food and exercise pickers.
 * 6. Code splitting in consultancy page and modals (dynamic imports).
 * 7. Server query deduplication (React.cache) in context.ts and parallel execution in billing.ts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";

console.log("==================================================");
console.log("TREVO ONE — PERFORMANCE OPTIMIZATIONS VERIFICATION");
console.log("==================================================\n");

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// 1. Font Optimization
runTest("FONTS: Layout uses single variable font file without redundant multi-file downloads", () => {
  const layout = fs.readFileSync("app/layout.tsx", "utf8");
  assert.ok(layout.includes("PlusJakartaSans-Variable.woff2"), "Must use PlusJakartaSans-Variable.woff2");
  assert.ok(!layout.includes("PlusJakartaSans-Medium.woff2"), "Must not load separate Medium.woff2");
  assert.ok(!layout.includes("PlusJakartaSans-SemiBold.woff2"), "Must not load separate SemiBold.woff2");
  assert.ok(!layout.includes("PlusJakartaSans-Bold.woff2"), "Must not load separate Bold.woff2");
  assert.ok(layout.includes('display: "swap"'), "Must enforce font-display: swap");
});

// 2. Splash Prefetch
runTest("SPLASH: Prefetches destination route on mount to eliminate post-splash navigation stall", () => {
  const splash = fs.readFileSync("components/splash/splash-redirect.tsx", "utf8");
  assert.ok(splash.includes("router.prefetch(target)"), "Must call router.prefetch(target) on mount");
});

// 3. Audio Preload None
runTest("AUDIO: Login audio controller enforces preload='none' to avoid eagerly downloading audio", () => {
  const audio = fs.readFileSync("components/auth/login-audio-controller.tsx", "utf8");
  assert.ok(audio.includes('audio.preload = "none"'), "Must specify audio.preload = 'none'");
  assert.ok(!audio.includes('audio.preload = "auto"'), "Must not use audio.preload = 'auto'");
});

// 4. Loading States for Heavy Routes
runTest("SKELETONS: Heavy navigation routes have stable loading.tsx skeletons", () => {
  const heavyRoutes = [
    "app/consultoria/[slug]/loading.tsx",
    "app/consultoria/[slug]/planos-v2/loading.tsx",
    "app/consultoria/[slug]/planos-v2/[planPublicId]/loading.tsx",
    "app/consultoria/[slug]/planos-v2/prontuario/[studentPublicId]/loading.tsx",
    "app/consultoria/[slug]/rotinas/loading.tsx",
    "app/consultoria/[slug]/rotinas/[publicId]/loading.tsx",
    "app/consultoria/[slug]/alimentos-v2/loading.tsx",
    "app/consultoria/[slug]/exercicios/loading.tsx",
    "app/consultoria/[slug]/membros/loading.tsx",
    "app/consultoria/[slug]/treinos/loading.tsx",
    "app/consultoria/[slug]/nutricao/loading.tsx",
  ];

  for (const file of heavyRoutes) {
    assert.ok(fs.existsSync(file), `Loading file must exist: ${file}`);
    const content = fs.readFileSync(file, "utf8");
    assert.ok(content.includes('aria-busy="true"'), `${file} must include aria-busy="true"`);
    assert.ok(content.includes("Skeleton"), `${file} must render Skeleton components`);
  }
});

// 5. Code Splitting on Consultancy Dashboard
runTest("CODE SPLITTING: Role dashboard views are dynamically imported to isolate client JS", () => {
  const page = fs.readFileSync("app/consultoria/[slug]/page.tsx", "utf8");
  assert.ok(page.includes("import dynamic from \"next/dynamic\""), "Must import next/dynamic");
  assert.ok(page.includes("const DashboardStudentView = dynamic("), "DashboardStudentView must be dynamic");
  assert.ok(page.includes("const DashboardPersonalView = dynamic("), "DashboardPersonalView must be dynamic");
  assert.ok(page.includes("const DashboardNutritionistView = dynamic("), "DashboardNutritionistView must be dynamic");
  assert.ok(page.includes("const DashboardAdminView = dynamic("), "DashboardAdminView must be dynamic");
});

// 6. Out-of-Order Search Protection
runTest("SEARCH: Food and exercise search protect against out-of-order race conditions", () => {
  const foodSearch = fs.readFileSync("components/consultancies/nutrition-v2/nutrition-meal-inline-search.tsx", "utf8");
  assert.ok(foodSearch.includes("requestIdRef"), "Food search must use requestIdRef");
  assert.ok(foodSearch.includes("currentReqId !== requestIdRef.current"), "Food search must discard stale responses");

  const exPicker = fs.readFileSync("components/consultancies/training-v2/unified-exercise-picker.tsx", "utf8");
  assert.ok(exPicker.includes("debounceTimerRef"), "Exercise picker must debounce requests");
  assert.ok(exPicker.includes("requestIdRef"), "Exercise picker must use requestIdRef");
  assert.ok(exPicker.includes("currentReqId !== requestIdRef.current"), "Exercise picker must discard stale responses");
});

// 7. Context Deduplication and Billing Parallelization
runTest("DATABASE / SERVER: resolveConsultancyContext is cached and billing queries run in parallel", () => {
  const contextFile = fs.readFileSync("lib/consultancies/context.ts", "utf8");
  assert.ok(contextFile.includes("export const resolveConsultancyContext = cache("), "Must wrap resolveConsultancyContext in React.cache");

  const billingFile = fs.readFileSync("lib/platform-admin/billing.ts", "utf8");
  assert.ok(billingFile.includes("const [subResult, chargeResult] = await Promise.all(["), "Billing queries must execute in parallel");
});

// 8. Video Optimization
runTest("VIDEO: Embedded videos in chat and modals specify preload='metadata'", () => {
  const chat = fs.readFileSync("components/consultancies/trevo-chat/chat-message-list.tsx", "utf8");
  assert.ok(chat.includes('preload="metadata"'), "Chat video must specify preload='metadata'");
  assert.ok(chat.includes("playsInline"), "Chat video must specify playsInline");

  const modal = fs.readFileSync("components/consultancies/training-v2/custom-exercise-inline-modal.tsx", "utf8");
  assert.ok(modal.includes('preload="metadata"'), "Custom exercise video must specify preload='metadata'");
});

console.log("\n==================================================");
console.log("ALL PERFORMANCE OPTIMIZATION TESTS PASSED! (8/8)");
console.log("==================================================\n");
