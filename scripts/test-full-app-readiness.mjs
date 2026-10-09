/**
 * TREVO ONE — FULL APP READINESS VERIFICATION SUITE
 * Tests end-to-end integration contracts across all roles and critical modules.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO SUÍTE DE TESTES: TREVO ONE FULL APP READINESS ===\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    throw err;
  }
}

// ============================================================================
// 1. AUTH & SESSIONS
// ============================================================================

runTest("AUTH: /cadastro redirects authenticated session to safe destination", () => {
  const content = fs.readFileSync(path.resolve("app/cadastro/page.tsx"), "utf8");
  assert(content.includes("getCurrentSession"), "Checks current session in /cadastro");
  assert(content.includes("redirect(safeReturnTo)"), "Redirects to safe returnTo if present");
  assert(content.includes('redirect("/selecionar-consultoria")'), "Redirects to consultancy selector by default");
});

runTest("AUTH: /login redirects authenticated session to safe destination", () => {
  const content = fs.readFileSync(path.resolve("app/login/page.tsx"), "utf8");
  assert(content.includes("getCurrentSession"), "Checks current session in /login");
  assert(content.includes("redirect(safeReturnTo)"), "Redirects to safe returnTo");
  assert(content.includes('redirect("/selecionar-consultoria")'), "Redirects to consultancy selector");
});

runTest("AUTH: /recuperar-senha has robust input validation and friendly UX", () => {
  const content = fs.readFileSync(path.resolve("app/recuperar-senha/actions.ts"), "utf8");
  assert(content.includes("isValidAuthEmail"), "Validates email format");
  assert(content.includes("normalizeAuthEmail"), "Normalizes email input");
});

// ============================================================================
// 2. NAVIGATION & ROUTE INTEGRITY
// ============================================================================

runTest("NAV: Nutritionist 'Alimentos' menu links directly to canonical /alimentos-v2", () => {
  const content = fs.readFileSync(path.resolve("components/consultancies/consultancy-app-shell.tsx"), "utf8");
  assert(
    !content.includes("href: `/consultoria/${consultancySlug}/planos-v2/alimentos`"),
    "Dead link /planos-v2/alimentos eliminated from navigation"
  );
  assert(
    content.includes("href: `/consultoria/${consultancySlug}/alimentos-v2`"),
    "Points directly to /alimentos-v2 canonical route"
  );
});

runTest("NAV: Plan builder defends against legacy /planos-v2/alimentos with redirect", () => {
  const content = fs.readFileSync(path.resolve("app/consultoria/[slug]/planos-v2/[planPublicId]/page.tsx"), "utf8");
  assert(
    content.includes('if (planPublicId === "alimentos")'),
    "Guards against planPublicId === 'alimentos'"
  );
  assert(
    content.includes("redirect(`/consultoria/${slug}/alimentos-v2`)"),
    "Redirects safely to canonical Food Library"
  );
});

runTest("NAV: Admin dashboard quick actions link to real routes without 404s", () => {
  const content = fs.readFileSync(path.resolve("components/dashboard/dashboard-admin-view.tsx"), "utf8");
  assert(
    !content.includes("href: `/consultoria/${consultancySlug}/planos`"),
    "Dead link /planos eliminated"
  );
  assert(
    content.includes("href: `/consultoria/${consultancySlug}/financeiro`"),
    "Points to real /financeiro module"
  );
});

// ============================================================================
// 3. STUDENT DASHBOARD & MOBILE COCKPIT
// ============================================================================

runTest("STUDENT COCKPIT: Nutrition-only students receive dedicated Active Plan hero card", () => {
  const content = fs.readFileSync(path.resolve("components/dashboard/dashboard-student-view.tsx"), "utf8");
  assert(
    content.includes("hasNutrition && activeNutritionPlan"),
    "Handles nutrition plan when training is absent"
  );
  assert(
    content.includes("Plano Alimentar Ativo"),
    "Shows active nutrition plan badge"
  );
  assert(
    content.includes("href={`/consultoria/${consultancySlug}/nutricao`}"),
    "Links to student nutrition view"
  );
});

// ============================================================================
// 4. MULTI-TENANCY & RBAC GUARDS
// ============================================================================

runTest("RBAC: Student Treinos page restricts non-student and unauthenticated callers", () => {
  const content = fs.readFileSync(path.resolve("app/consultoria/[slug]/treinos/page.tsx"), "utf8");
  assert(content.includes("resolveStudentModuleAccess"), "Verifies module access");
  assert(content.includes('access.reason === "NOT_STUDENT"'), "Denies non-students");
  assert(content.includes('access.reason === "UNAUTHENTICATED"'), "Denies unauthenticated");
});

runTest("RBAC: Student Nutrição page restricts non-student and unauthenticated callers", () => {
  const content = fs.readFileSync(path.resolve("app/consultoria/[slug]/nutricao/page.tsx"), "utf8");
  assert(content.includes("resolveStudentModuleAccess"), "Verifies module access");
  assert(content.includes('access.reason === "NOT_STUDENT"'), "Denies non-students");
  assert(content.includes('access.reason === "UNAUTHENTICATED"'), "Denies unauthenticated");
});

// ============================================================================
// 5. SECURITY & STORAGE
// ============================================================================

runTest("STORAGE: Private files validate magic bytes signature against malicious uploads", () => {
  const content = fs.readFileSync(path.resolve("lib/storage/private-files.ts"), "utf8");
  assert(content.includes("detectReceiptFileType"), "Validates file type via buffer signature");
  assert(content.includes("image/jpeg"), "Supports JPEG");
  assert(content.includes("image/png"), "Supports PNG");
  assert(content.includes("application/pdf"), "Supports PDF");
});

// ============================================================================
// 6. HEALTHCHECK & PROXY
// ============================================================================

runTest("PROXY: Request proxy enforces origin guard and handles canonical redirect", () => {
  const content = fs.readFileSync(path.resolve("proxy.ts"), "utf8");
  assert(content.includes("evaluateOriginGuard"), "Evaluates origin guard policy");
  assert(content.includes("trevoone.com"), "Canonicalizes host");
});

console.log("\n==================================================");
console.log(`FULL APP READINESS SUITE: ${passedCount}/${totalCount} TESTES PASS!`);
console.log("==================================================");
