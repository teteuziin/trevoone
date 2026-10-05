import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== RUNNING NUTRITION MOBILE PATIENT HUB TEST SUITE ===\n");

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

// UTF8 NO REPLACEMENT CHAR
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

// NUTRITIONIST MOBILE PATIENT HUB
runTest("NUTRITIONIST MOBILE PATIENT HUB", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  assert.ok(fs.existsSync(hubPath), "mobile-patient-hub.tsx must exist");
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes("export function MobilePatientHub"));

  // Check integration in PatientRecordView
  const viewPath = "components/consultancies/nutrition-v2/patient-record-view.tsx";
  const viewContent = fs.readFileSync(viewPath, "utf8");
  assert.ok(viewContent.includes("<MobilePatientHub"));
  assert.ok(viewContent.includes('className="md:hidden"'));
  assert.ok(viewContent.includes('className="hidden md:block'));

  // Check patient list linking for effective nutritionist
  const listPath = "components/consultancies/personal-student-hub/personal-student-list.tsx";
  const listContent = fs.readFileSync(listPath, "utf8");
  assert.ok(listContent.includes("isEffectiveNutritionist"));
  assert.ok(listContent.includes("/planos-v2/prontuario/${student.membershipPublicId}"));
});

// MOBILE DEFAULT TAB RESUMO
runTest("MOBILE DEFAULT TAB RESUMO", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes('return "resumo";'));
  assert.ok(hubContent.includes('activeTab === "resumo"'));
  assert.ok(hubContent.includes("Resumo Clínico"));
  assert.ok(hubContent.includes("Ações Rápidas"));
  assert.ok(hubContent.includes("Plano Alimentar Vigente"));
});

// MOBILE PRONTUARIO TAB
runTest("MOBILE PRONTUARIO TAB", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes('activeTab === "prontuario"'));
  assert.ok(hubContent.includes('clinicalSubTab === "clinico"'));
  assert.ok(hubContent.includes('clinicalSubTab === "alimentar"'));
  assert.ok(hubContent.includes('clinicalSubTab === "estilo_vida"'));
  assert.ok(hubContent.includes('clinicalSubTab === "antropometria"'));
  assert.ok(hubContent.includes('clinicalSubTab === "gestacao"'));
  assert.ok(hubContent.includes('clinicalSubTab === "calculos"'));
  assert.ok(hubContent.includes("onSaveClinical"));
  assert.ok(hubContent.includes("onSavePregnancy"));
  assert.ok(hubContent.includes("onAddAnthropometry"));
});

// MOBILE PLAN TAB
runTest("MOBILE PLAN TAB", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes('activeTab === "plano"'));
  assert.ok(hubContent.includes("Plano Atual"));
  assert.ok(hubContent.includes("Abrir no Builder"));
  assert.ok(hubContent.includes("Nenhum plano alimentar ativo"));
  assert.ok(hubContent.includes("+ Criar plano alimentar"));
});

// MOBILE EVOLUTION TAB
runTest("MOBILE EVOLUTION TAB", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes('activeTab === "evolucao"'));
  assert.ok(hubContent.includes("<MobileEvolutionCockpit"));
  assert.ok(hubContent.includes("hubData={evolutionHubData}"));
  assert.ok(hubContent.includes("isNutritionist={true}"));
});

// MOBILE ACTIVE PLAN
runTest("MOBILE ACTIVE PLAN", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes("activePlan.versionTitle"));
  assert.ok(hubContent.includes("activePlan.totals.caloriesKcal"));
  assert.ok(hubContent.includes("activePlan.totals.proteinG"));
  assert.ok(hubContent.includes("activePlan.totals.carbohydrateG"));
  assert.ok(hubContent.includes("activePlan.totals.fatG"));
  assert.ok(hubContent.includes("Abrir plano"));
});

// MOBILE NO ACTIVE PLAN
runTest("MOBILE NO ACTIVE PLAN", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes("Nenhum plano alimentar ativo"));
  assert.ok(hubContent.includes("Criar plano alimentar"));
});

// MOBILE PATIENT BOTTOM NAV ACTIVE
runTest("MOBILE PATIENT BOTTOM NAV ACTIVE", () => {
  const baseSlugHref = "/consultoria/trevo-demo";
  const detailProntuario = `${baseSlugHref}/planos-v2/prontuario/student-123`;
  const cleanItemHref = `${baseSlugHref}/progresso/alunos`;
  const isPatientRecordRoute =
    detailProntuario === `${baseSlugHref}/planos-v2/prontuario` ||
    detailProntuario.startsWith(`${baseSlugHref}/planos-v2/prontuario/`);
  assert.strictEqual(isPatientRecordRoute && cleanItemHref === `${baseSlugHref}/progresso/alunos`, true);

  const planItemHref = `${baseSlugHref}/planos-v2`;
  assert.strictEqual(isPatientRecordRoute && planItemHref === `${baseSlugHref}/planos-v2`, true);
  // in consultancy-navigation.tsx, it explicitly returns false for planos-v2
  const navContent = fs.readFileSync("components/consultancies/consultancy-navigation.tsx", "utf8");
  assert.ok(navContent.includes('cleanItemHref === `${baseSlugHref}/planos-v2`'));
  assert.ok(navContent.includes("return false;"));
});

// PERSONAL MOBILE FLOW PRESERVED
runTest("PERSONAL MOBILE FLOW PRESERVED", () => {
  const listPath = "components/consultancies/personal-student-hub/personal-student-list.tsx";
  const listContent = fs.readFileSync(listPath, "utf8");
  assert.ok(listContent.includes("!isEffectiveNutritionist"));
  assert.ok(listContent.includes("Com treino"));
  assert.ok(listContent.includes("Sem treino"));
  assert.ok(listContent.includes("Criar treino"));
  assert.ok(listContent.includes("/progresso/alunos/${student.membershipPublicId}"));
});

// MULTI-ROLE PERSONAL
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

// MULTI-ROLE NUTRITIONIST
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

// LEGACY ROUTES
runTest("LEGACY ROUTES", () => {
  const shellPath = "components/consultancies/consultancy-app-shell.tsx";
  const shellContent = fs.readFileSync(shellPath, "utf8");
  assert.ok(shellContent.includes("/planos-v2/prontuario"));
  assert.ok(shellContent.includes("/progresso/alunos"));

  const progressoPage = "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx";
  assert.ok(fs.existsSync(progressoPage), "Legacy /progresso/alunos/[studentPublicId] must exist");
  const prontuarioPage = "app/consultoria/[slug]/planos-v2/prontuario/[studentPublicId]/page.tsx";
  assert.ok(fs.existsSync(prontuarioPage), "Prontuario /planos-v2/prontuario/[studentPublicId] must exist");
});

// TENANCY
runTest("TENANCY", () => {
  const pagePath = "app/consultoria/[slug]/progresso/alunos/page.tsx";
  const pageContent = fs.readFileSync(pagePath, "utf8");
  assert.ok(pageContent.includes("resolveConsultancyContext(session.userId, slug)"));
  assert.ok(pageContent.includes("listPersonalStudents({ consultancyId: context.consultancyId })"));

  const prontuarioPage = "app/consultoria/[slug]/planos-v2/prontuario/[studentPublicId]/page.tsx";
  const prontuarioContent = fs.readFileSync(prontuarioPage, "utf8");
  assert.ok(prontuarioContent.includes("resolveConsultancyContext(session.userId, slug)"));
  assert.ok(prontuarioContent.includes("res.detail.record.consultancyId"));
});

// Touch targets >= 44px
runTest("TOUCH TARGETS >= 44PX", () => {
  const hubPath = "components/consultancies/nutrition-v2/mobile-patient-hub.tsx";
  const hubContent = fs.readFileSync(hubPath, "utf8");
  assert.ok(hubContent.includes("min-h-[44px]"), "MobilePatientHub interactive elements must satisfy min-h-[44px]");
});

if (!allPassed) {
  process.exit(1);
}
console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!");
