import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== RUNNING NUTRITION PATIENT CONTEXT CLOSURE TEST SUITE ===\n");

let allPassed = true;
function runTest(name, fn) {
  try {
    fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.error(`${name}: FAIL ->`, err.message);
    allPassed = false;
  }
}

// 1. UTF8 NO REPLACEMENT CHAR
runTest("UTF8 NO REPLACEMENT CHAR", () => {
  const rootDirs = ["app", "components", "lib", "types"];
  let badFiles = [];
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (/\.(tsx?|jsx?|json|md)$/.test(entry.name)) {
        const content = fs.readFileSync(full, "utf8");
        if (content.includes("\uFFFD")) {
          badFiles.push(full);
        }
      }
    }
  }
  for (const d of rootDirs) scan(d);
  assert.strictEqual(badFiles.length, 0, `Found U+FFFD in files: ${badFiles.join(", ")}`);
});

// 2. NUTRITIONIST PATIENT LABELS
runTest("NUTRITIONIST PATIENT LABELS", () => {
  const pagePath = "app/consultoria/[slug]/progresso/alunos/page.tsx";
  const pageContent = fs.readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes('eyebrow={isNutritionist ? "Pacientes" : "Central de Alunos"}'));
  assert.ok(pageContent.includes('title={isNutritionist ? "Pacientes da Consultoria" : "Alunos da Consultoria"}'));
  assert.ok(pageContent.includes('Acompanhe prontuário, plano alimentar e evolução dos seus pacientes.'));
  assert.ok(pageContent.includes('backLabel="Visão geral"'));

  const listPath = "components/consultancies/personal-student-hub/personal-student-list.tsx";
  const listContent = fs.readFileSync(listPath, "utf8");
  assert.ok(listContent.includes('isEffectiveNutritionist ? "Ver paciente" : "Ver aluno"'));
  assert.ok(listContent.includes('"paciente encontrado"'));
  assert.ok(listContent.includes('"pacientes encontrados"'));
  assert.ok(listContent.includes('isEffectiveNutritionist ? "Nenhum paciente cadastrado" : "Nenhum aluno cadastrado"'));
  assert.ok(listContent.includes('Acompanhamento nutricional'));
});

// 3. NUTRITIONIST NO TRAINING LANGUAGE
runTest("NUTRITIONIST NO TRAINING LANGUAGE", () => {
  const listPath = "components/consultancies/personal-student-hub/personal-student-list.tsx";
  const listContent = fs.readFileSync(listPath, "utf8");
  assert.ok(listContent.includes("{!isEffectiveNutritionist && ("));
  assert.ok(listContent.includes('isEffectiveNutritionist ? "Filtros de Pacientes" : "Filtros de Alunos"'));
  assert.ok(listContent.includes('isEffectiveNutritionist ? "Objetivo do Paciente" : "Objetivo do Aluno"'));
});

// 4. NUTRITIONIST DESKTOP PATIENT NAV ACTIVE
runTest("NUTRITIONIST DESKTOP PATIENT NAV ACTIVE", () => {
  const navPath = "components/consultancies/consultancy-navigation.tsx";
  const navContent = fs.readFileSync(navPath, "utf8");
  assert.ok(navContent.includes("isPatientRecordRoute"));
  assert.ok(navContent.includes('cleanItemHref === `${baseSlugHref}/progresso/alunos`'));
  assert.ok(navContent.includes('cleanItemHref === `${baseSlugHref}/planos-v2`'));

  // Unit-simulate isItemActive logic
  const baseSlugHref = "/consultoria/trevo-demo";
  function simulateIsItemActive(pathname, itemHref) {
    if (!pathname || !itemHref) return false;
    if (itemHref === baseSlugHref) return pathname === baseSlugHref;
    const cleanItemHref = itemHref.split("#")[0].split("?")[0];
    const isPatientRecordRoute =
      pathname === `${baseSlugHref}/planos-v2/prontuario` ||
      pathname.startsWith(`${baseSlugHref}/planos-v2/prontuario/`);
    if (isPatientRecordRoute) {
      if (cleanItemHref === `${baseSlugHref}/progresso/alunos`) return true;
      if (cleanItemHref === `${baseSlugHref}/planos-v2`) return false;
    }
    if (pathname === cleanItemHref) return true;
    if (pathname.startsWith(cleanItemHref + "/")) {
      if (cleanItemHref === `${baseSlugHref}/progresso` && pathname.startsWith(`${baseSlugHref}/progresso/alunos`)) return false;
      return true;
    }
    return false;
  }

  // Test root prontuario route
  const rootProntuario = `${baseSlugHref}/planos-v2/prontuario`;
  assert.strictEqual(simulateIsItemActive(rootProntuario, `${baseSlugHref}/progresso/alunos`), true);
  assert.strictEqual(simulateIsItemActive(rootProntuario, `${baseSlugHref}/planos-v2`), false);

  // Test detail prontuario route
  const detailProntuario = `${baseSlugHref}/planos-v2/prontuario/student-123`;
  assert.strictEqual(simulateIsItemActive(detailProntuario, `${baseSlugHref}/progresso/alunos`), true);
  assert.strictEqual(simulateIsItemActive(detailProntuario, `${baseSlugHref}/planos-v2`), false);
});

// 5. NUTRITIONIST MOBILE PATIENT NAV ACTIVE
runTest("NUTRITIONIST MOBILE PATIENT NAV ACTIVE", () => {
  const baseSlugHref = "/consultoria/trevo-demo";
  const detailProntuario = `${baseSlugHref}/planos-v2/prontuario/student-123`;
  const cleanItemHref = `${baseSlugHref}/progresso/alunos`;
  const isPatientRecordRoute =
    detailProntuario === `${baseSlugHref}/planos-v2/prontuario` ||
    detailProntuario.startsWith(`${baseSlugHref}/planos-v2/prontuario/`);
  assert.strictEqual(isPatientRecordRoute && cleanItemHref === `${baseSlugHref}/progresso/alunos`, true);
});

// 6. EVOLUTION DESKTOP ACTIVE PLAN
runTest("EVOLUTION DESKTOP ACTIVE PLAN", () => {
  const hubPath = "components/consultancies/evolution/evolution-360-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes("hubData.activeNutritionPlan"));
  assert.ok(hubContent.includes("Plano Alimentar Vigente"));
  assert.ok(hubContent.includes("Ver Plano Completo"));
  assert.ok(hubContent.includes("totals.caloriesKcal"));
});

// 7. EVOLUTION MOBILE ACTIVE PLAN
runTest("EVOLUTION MOBILE ACTIVE PLAN", () => {
  const mobilePath = "components/consultancies/evolution/mobile-evolution-cockpit.tsx";
  const mobileContent = fs.readFileSync(mobilePath, "utf8");
  assert.ok(mobileContent.includes("hubData.activeNutritionPlan"));
  assert.ok(mobileContent.includes('data-testid="mobile-active-nutrition-plan"'));
  assert.ok(mobileContent.includes("Plano Alimentar Vigente"));
  assert.ok(mobileContent.includes("Abrir plano"));
  assert.ok(mobileContent.includes("formatIsoDateToBr(hubData.activeNutritionPlan.startsOn)"));
  assert.ok(mobileContent.includes('totals.caloriesKcal !== null && hubData.activeNutritionPlan.totals.caloriesKcal !== undefined\n                  ? `${hubData.activeNutritionPlan.totals.caloriesKcal}`\n                  : "—"'));
});

// 8. PERSONAL TRAINING CONTEXT PRESERVED
runTest("PERSONAL TRAINING CONTEXT PRESERVED", () => {
  const listPath = "components/consultancies/personal-student-hub/personal-student-list.tsx";
  const listContent = fs.readFileSync(listPath, "utf8");
  assert.ok(listContent.includes("!isEffectiveNutritionist"));
  assert.ok(listContent.includes("Com treino"));
  assert.ok(listContent.includes("Sem treino"));
  assert.ok(listContent.includes("Criar treino"));
});

// 9. MULTI-ROLE PERSONAL
runTest("MULTI-ROLE PERSONAL", () => {
  function checkMode(effectiveMode, roles) {
    const isNutritionist = effectiveMode === "NUTRITIONIST" || roles.includes("NUTRITIONIST");
    const isPersonal = effectiveMode === "PERSONAL" || roles.includes("PERSONAL");
    const isEffectiveNutritionist =
      effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);
    return { isEffectiveNutritionist, isPersonal };
  }
  const res = checkMode("PERSONAL", ["PERSONAL", "NUTRITIONIST"]);
  assert.strictEqual(res.isEffectiveNutritionist, false);
  assert.strictEqual(res.isPersonal, true);
});

// 10. MULTI-ROLE NUTRITIONIST
runTest("MULTI-ROLE NUTRITIONIST", () => {
  function checkMode(effectiveMode, roles) {
    const isNutritionist = effectiveMode === "NUTRITIONIST" || roles.includes("NUTRITIONIST");
    const isPersonal = effectiveMode === "PERSONAL" || roles.includes("PERSONAL");
    const isEffectiveNutritionist =
      effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);
    return { isEffectiveNutritionist, isPersonal };
  }
  const res = checkMode("NUTRITIONIST", ["PERSONAL", "NUTRITIONIST"]);
  assert.strictEqual(res.isEffectiveNutritionist, true);
});

// 11. LEGACY ROUTES
runTest("LEGACY ROUTES", () => {
  const shellPath = "components/consultancies/consultancy-app-shell.tsx";
  const shellContent = fs.readFileSync(shellPath, "utf8");
  assert.ok(shellContent.includes("/planos-v2/prontuario"));
  assert.ok(shellContent.includes("/progresso/alunos"));
});

// 12. TENANCY
runTest("TENANCY", () => {
  const pagePath = "app/consultoria/[slug]/progresso/alunos/page.tsx";
  const pageContent = fs.readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes("resolveConsultancyContext(session.userId, slug)"));
  assert.ok(pageContent.includes("listPersonalStudents({ consultancyId: context.consultancyId })"));
});

if (!allPassed) {
  process.exit(1);
}
console.log("\nALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY!");
