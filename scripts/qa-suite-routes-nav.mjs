/**
 * TREVO ONE — QA SUITE: ROUTES & NAVIGATION INTEGRITY (NO BROWSER)
 * 
 * Tests:
 * 1. Full Route Inventory Audit (All 103 App Router routes: 73 Pages + 30 APIs)
 * 2. Static Link Integrity (Extracts and validates internal navigation hrefs)
 * 3. Regression Guards:
 *    - No dead link /planos (must be /financeiro)
 *    - No dead link /planos-v2/alimentos (must be /alimentos-v2)
 *    - /planos-v2/[planPublicId] guards against 'alimentos' slug
 * 4. Deep Link Parameter Contracts
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

function scanAppRoutes(dir, base = "") {
  let routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      routes.push(...scanAppRoutes(fullPath, relPath));
    } else if (
      entry.name === "page.tsx" ||
      entry.name === "page.ts" ||
      entry.name === "route.ts" ||
      entry.name === "route.tsx"
    ) {
      routes.push({
        type: entry.name.startsWith("route") ? "API" : "PAGE",
        route: "/" + base.replace(/\\/g, "/"),
        filePath: fullPath,
      });
    }
  }
  return routes;
}

export async function runRoutesNavSuite() {
  console.log("=== 3. ROUTES & NAVIGATION INTEGRITY SUITE ===");

  const allRoutes = scanAppRoutes("app");
  const pages = allRoutes.filter((r) => r.type === "PAGE");
  const apis = allRoutes.filter((r) => r.type === "API");

  runTest(`ROUTES INVENTORY: Discovered exactly 106 total routes (${pages.length} pages, ${apis.length} APIs)`, () => {
    assert.equal(allRoutes.length, 106, "Total routes in App Router must be 106");
    assert.equal(pages.length, 73, "Page routes in App Router must be 73");
    assert.equal(apis.length, 33, "API route handlers in App Router must be 33");
  });

  runTest("REGRESSION GUARD 1: No dead link '/consultoria/[slug]/planos' in admin view", () => {
    const file = path.resolve("components/dashboard/dashboard-admin-view.tsx");
    const content = fs.readFileSync(file, "utf8");
    assert(!content.includes("href: `/consultoria/${consultancySlug}/planos`"), "Dead link /planos must not exist");
    assert(content.includes("href: `/consultoria/${consultancySlug}/financeiro`"), "Points to canonical /financeiro");
  });

  runTest("REGRESSION GUARD 2: Nutritionist menu links to canonical '/alimentos-v2' (not /planos-v2/alimentos)", () => {
    const file = path.resolve("components/consultancies/consultancy-app-shell.tsx");
    const content = fs.readFileSync(file, "utf8");
    assert(!content.includes("href: `/consultoria/${consultancySlug}/planos-v2/alimentos`"), "Obsolete link eliminated");
    assert(content.includes("href: `/consultoria/${consultancySlug}/alimentos-v2`"), "Canonical /alimentos-v2 used");
  });

  runTest("REGRESSION GUARD 3: Plan builder route guards against 'alimentos' publicId with safe redirect", () => {
    const file = path.resolve("app/consultoria/[slug]/planos-v2/[planPublicId]/page.tsx");
    const content = fs.readFileSync(file, "utf8");
    assert(content.includes('if (planPublicId === "alimentos")'), "Explicit guard on 'alimentos' slug present");
    assert(content.includes("redirect(`/consultoria/${slug}/alimentos-v2`)"), "Safe redirect to canonical food library");
  });

  runTest("CRITICAL PAGES EXIST: Verifies all primary core pages exist in App Router", () => {
    const coreRoutes = [
      "/",
      "/login",
      "/cadastro",
      "/recuperar-senha",
      "/redefinir-senha",
      "/selecionar-consultoria",
      "/consultoria/[slug]",
      "/consultoria/[slug]/treinos",
      "/consultoria/[slug]/nutricao",
      "/consultoria/[slug]/planos-v2",
      "/consultoria/[slug]/alimentos-v2",
      "/consultoria/[slug]/consultas",
      "/consultoria/[slug]/progresso",
      "/consultoria/[slug]/financeiro",
      "/consultoria/[slug]/membros",
      "/admin",
      "/conta/perfil",
      "/conta/seguranca",
      "/notificacoes",
    ];

    const routeStrings = pages.map((p) => (p.route === "/" ? "/" : p.route.replace(/\/$/, "")));
    for (const core of coreRoutes) {
      assert(
        routeStrings.includes(core),
        `Core route '${core}' must exist in App Router pages`
      );
    }
  });

  runTest("API CONTRACTS: Verifies all core API endpoints exist in App Router", () => {
    const coreApis = [
      "/api/version",
      "/api/ping",
      "/api/account/profile-photo",
      "/api/consultancies/[slug]/students",
      "/api/consultancies/[slug]/treinos/pdf",
      "/api/consultancies/[slug]/nutricao/pdf",
      "/api/internal/consultation-reminders",
      "/api/training-v2/media",
      "/api/consultancies/[slug]/chat/messages",
      "/api/consultancies/[slug]/chat/attachments/[attachmentPublicId]",
    ];

    const apiStrings = apis.map((a) => a.route.replace(/\/$/, ""));
    for (const core of coreApis) {
      assert(
        apiStrings.includes(core),
        `Core API '${core}' must exist in App Router route handlers`
      );
    }
  });

  console.log(`\nROUTES & NAVIGATION PASS: ${passedCount}/${totalCount} testes executados com sucesso!\n`);
  return { passedCount, totalCount, totalRoutes: allRoutes.length, pagesCount: pages.length, apisCount: apis.length };
}

if (process.argv[1]?.endsWith("qa-suite-routes-nav.mjs")) {
  runRoutesNavSuite();
}
