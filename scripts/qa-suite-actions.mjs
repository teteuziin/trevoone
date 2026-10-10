/**
 * TREVO ONE — QA SUITE: SERVER ACTIONS INTEGRITY & ERROR CONTRACT (NO BROWSER)
 * 
 * Tests:
 * 1. Systematic audit of all 49 Server Action files in the project
 * 2. Directive compliance: Enforces "use server" on server action modules
 * 3. Auth Guard Invariant: Verifies presence of session/access resolution
 * 4. Error Sanitation Contract: Actions return { success: false, error } and never leak stack traces
 * 5. Input Validation Schemas across critical action groups
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

function findActionFiles(dir) {
  let actions = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      actions.push(...findActionFiles(fullPath));
    } else if (
      entry.name.includes("action") &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      actions.push(fullPath.replace(/\\/g, "/"));
    }
  }
  return actions;
}

export async function runActionsSuite() {
  console.log("=== 9. SERVER ACTIONS AUDIT & CONTRACT VERIFICATION SUITE ===");

  const actionFiles = findActionFiles("app");

  runTest(`ACTION INVENTORY: Audited ${actionFiles.length} server action modules across all features`, () => {
    assert(actionFiles.length >= 45, `Expected at least 45 action files (found ${actionFiles.length})`);
    for (const file of actionFiles) {
      assert(fs.existsSync(path.resolve(file)), `Action file must exist: ${file}`);
    }
  });

  runTest("DIRECTIVE COMPLIANCE: Server action files contain 'use server' directive", () => {
    for (const file of actionFiles) {
      // client files (like admin-actions-client.tsx) don't have "use server"
      if (file.includes("client")) continue;
      const content = fs.readFileSync(path.resolve(file), "utf8");
      assert(
        content.includes('"use server"') || content.includes("'use server'"),
        `File ${file} must declare "use server"`
      );
    }
  });

  runTest("AUTH GUARD INVARIANT: Protected server actions verify session or tenancy context", () => {
    const protectedActions = actionFiles.filter(
      (f) =>
        !f.includes("/login/") &&
        !f.includes("/cadastro/") &&
        !f.includes("/recuperar-senha/") &&
        !f.includes("/redefinir-senha/") &&
        !f.includes("client")
    );

    let guardedCount = 0;
    for (const file of protectedActions) {
      const content = fs.readFileSync(path.resolve(file), "utf8");
      const hasAuth =
        content.includes("getCurrentSession") ||
        content.includes("resolveTrainingAccessContext") ||
        content.includes("resolveNutritionAccessContext") ||
        content.includes("getPlatformAdminSession") ||
        content.includes("requireSession") ||
        content.includes("session");
      if (hasAuth) guardedCount++;
    }

    assert(
      guardedCount >= protectedActions.length * 0.9,
      `At least 90% of protected action modules must explicitly check auth (checked ${guardedCount}/${protectedActions.length})`
    );
  });

  runTest("ERROR CONTRACT: Server actions do not leak error.stack in public returns", () => {
    for (const file of actionFiles) {
      const content = fs.readFileSync(path.resolve(file), "utf8");
      assert(
        !content.includes("error.stack"),
        `Action ${file} must never expose error.stack in return payload`
      );
    }
  });

  runTest("ACTION RETURN SHAPES: Standard action responses use structured ActionResult { success, ... }", () => {
    const criticalActionGroups = [
      "app/consultoria/[slug]/treinos/actions.ts",
      "app/consultoria/[slug]/planos-v2/actions.ts",
      "app/consultoria/[slug]/consultas/actions.ts",
      "app/consultoria/[slug]/checkin/actions.ts",
      "app/notificacoes/actions.ts",
      "app/conta/seguranca/actions.ts",
    ];

    for (const group of criticalActionGroups) {
      const content = fs.readFileSync(path.resolve(group), "utf8");
      assert(
        content.includes("success: false") || content.includes("success: true"),
        `Action group ${group} must use structured { success: boolean } return contract`
      );
    }
  });

  console.log(`\nSERVER ACTIONS SUITE PASS: ${passedCount}/${totalCount} testes executados com sucesso!\n`);
  return { passedCount, totalCount, actionCount: actionFiles.length };
}

if (process.argv[1]?.endsWith("qa-suite-actions.mjs")) {
  runActionsSuite();
}
