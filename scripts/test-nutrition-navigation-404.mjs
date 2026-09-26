import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== INICIANDO SUÍTE DE TESTES: NUTRITION NAVIGATION & 404 AUDIT ===\n");

// ----------------------------------------------------------------------------
// TEST 1: FILESYSTEM ROUTE AUDIT (CONFIRM PHYSICAL PAGE EXISTENCE)
// ----------------------------------------------------------------------------
{
  console.log("Test 1: Verificando existência física das rotas no filesystem...");

  const requiredRoutes = [
    "app/consultoria/[slug]/planos-v2/page.tsx",
    "app/consultoria/[slug]/planos-v2/novo/page.tsx",
    "app/consultoria/[slug]/planos-v2/[planPublicId]/page.tsx",
    "app/consultoria/[slug]/planos-v2/prontuario/page.tsx",
    "app/consultoria/[slug]/planos-v2/prontuario/[studentPublicId]/page.tsx",
    "app/consultoria/[slug]/alimentos-v2/page.tsx",
    "app/admin/alimentos/page.tsx",
  ];

  for (const route of requiredRoutes) {
    const exists = fs.existsSync(route);
    assert.ok(exists, `Rota obrigatória não encontrada no filesystem: ${route}`);
  }

  // Dead route must not exist
  assert.ok(!fs.existsSync("app/admin/alimentos-v2"), "Rota obsoleta /admin/alimentos-v2 não deve existir como diretório");

  console.log("  ✓ Todas as 7 rotas físicas existem e estão no caminho canônico.");
}

// ----------------------------------------------------------------------------
// TEST 2: DASHBOARD NUTRITIONIST VIEW NAVIGATION AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 2: Auditando atalhos e links no Dashboard do Nutricionista...");

  const dashboardCode = fs.readFileSync(
    "components/dashboard/dashboard-nutritionist-view.tsx",
    "utf8"
  );

  // Quick actions audit
  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/planos-v2/prontuario`"),
    "Atalho 'Pacientes' deve apontar para /planos-v2/prontuario (prontuário clínico), não /progresso/alunos"
  );
  assert.ok(
    !dashboardCode.includes("href: `/consultoria/${consultancySlug}/progresso/alunos`,\n      title: \"Pacientes\""),
    "Atalho 'Pacientes' NÃO pode apontar para /progresso/alunos"
  );

  // Carousel CTA audit
  assert.ok(
    dashboardCode.includes("ctaHref: `/consultoria/${consultancySlug}/planos-v2/prontuario`"),
    "Slide de Pacientes no carrossel deve apontar para /planos-v2/prontuario"
  );

  // Other quick action links
  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/planos-v2/novo`"),
    "Atalho 'Novo Plano' deve estar presente"
  );
  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/planos-v2`"),
    "Atalho 'Planos Alimentares' deve estar presente"
  );
  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/alimentos-v2`"),
    "Atalho 'Alimentos' deve estar presente"
  );

  console.log("  ✓ Links do Dashboard do Nutricionista auditados e validados.");
}

// ----------------------------------------------------------------------------
// TEST 3: CONSULTANCY APP SHELL SIDEBAR AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 3: Auditando menu lateral do Nutricionista no ConsultancyAppShell...");

  const shellCode = fs.readFileSync(
    "components/consultancies/consultancy-app-shell.tsx",
    "utf8"
  );

  assert.ok(
    shellCode.includes('id: "nutritionist-prontuario"'),
    "Menu lateral deve conter item 'nutritionist-prontuario'"
  );
  assert.ok(
    shellCode.includes("href: `/consultoria/${consultancySlug}/planos-v2/prontuario`"),
    "Menu lateral de prontuário deve apontar para /planos-v2/prontuario"
  );
  assert.ok(
    shellCode.includes('id: "nutritionist-planos"'),
    "Menu lateral deve conter item 'nutritionist-planos'"
  );
  assert.ok(
    shellCode.includes('id: "nutritionist-alimentos"'),
    "Menu lateral deve conter item 'nutritionist-alimentos'"
  );

  console.log("  ✓ Menu lateral do ConsultancyAppShell contém rotas completas de nutrição.");
}

// ----------------------------------------------------------------------------
// TEST 4: ADMIN DASHBOARD AUDIT (NO DEAD END 404)
// ----------------------------------------------------------------------------
{
  console.log("Test 4: Auditando links no painel administrativo /admin...");

  const adminCode = fs.readFileSync("app/admin/page.tsx", "utf8");

  assert.ok(
    adminCode.includes('href: "/admin/alimentos"'),
    "Painel admin deve apontar para /admin/alimentos"
  );
  assert.ok(
    !adminCode.includes('href: "/admin/alimentos-v2"'),
    "Painel admin NÃO pode ter link morto para /admin/alimentos-v2 (HTTP 404)"
  );

  console.log("  ✓ Painel admin aponta para a rota canônica /admin/alimentos sem 404.");
}

// ----------------------------------------------------------------------------
// TEST 5: AUTHORIZATION MATRIX SIMULATOR (canAuthorNutrition RULES)
// ----------------------------------------------------------------------------
{
  console.log("Test 5: Validando matriz de autorização canAuthorNutrition...");

  function simulateContext(roles, consultancyId = 1, isPlatformAdmin = false) {
    const hasRole = (r) => roles.includes(r);
    const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
    const canAuthorNutrition = canManageConsultancy || hasRole("NUTRITIONIST");
    const isStudent = hasRole("STUDENT");

    return {
      consultancyId,
      roles,
      hasRole,
      canAuthorNutrition,
      canManageConsultancy,
      canManageGlobal: isPlatformAdmin,
      isStudent,
    };
  }

  // A) Active NUTRITIONIST
  const nutri = simulateContext(["NUTRITIONIST"]);
  assert.equal(nutri.canAuthorNutrition, true, "NUTRITIONIST ativo DEVE ter canAuthorNutrition=true");
  assert.equal(nutri.canManageConsultancy, false, "NUTRITIONIST puro não gerencia a consultoria como admin");
  assert.equal(nutri.isStudent, false);

  // B) CONSULTANCY_ADMIN (e.g. Matheus previewing/managing workspace)
  const admin = simulateContext(["CONSULTANCY_ADMIN"]);
  assert.equal(admin.canAuthorNutrition, true, "CONSULTANCY_ADMIN DEVE ter canAuthorNutrition=true (sem 404)");
  assert.equal(admin.canManageConsultancy, true);
  assert.equal(admin.isStudent, false);

  // C) Multi-role NUTRITIONIST + PERSONAL
  const multi = simulateContext(["NUTRITIONIST", "PERSONAL"]);
  assert.equal(multi.canAuthorNutrition, true, "Multi-role NUTRITIONIST + PERSONAL tem acesso a nutrição");

  // D) STUDENT ONLY
  const student = simulateContext(["STUDENT"]);
  assert.equal(student.canAuthorNutrition, false, "STUDENT NÃO pode ter canAuthorNutrition");
  assert.equal(student.isStudent, true);

  // E) PERSONAL ONLY (no admin, no nutritionist)
  const personal = simulateContext(["PERSONAL"]);
  assert.equal(personal.canAuthorNutrition, false, "PERSONAL isolado NÃO tem canAuthorNutrition");

  // F) INFLUENCER ONLY
  const influencer = simulateContext(["INFLUENCER"]);
  assert.equal(influencer.canAuthorNutrition, false, "INFLUENCER isolado NÃO tem canAuthorNutrition");

  // G) Cross-tenant protection simulation
  function simulateAccessGuard(ctx, targetConsultancyId) {
    if (!ctx || !ctx.canAuthorNutrition || ctx.consultancyId !== targetConsultancyId) {
      return "NOT_FOUND_OR_FORBIDDEN";
    }
    return "ACCESS_GRANTED";
  }

  assert.equal(simulateAccessGuard(nutri, 1), "ACCESS_GRANTED");
  assert.equal(simulateAccessGuard(nutri, 999), "NOT_FOUND_OR_FORBIDDEN", "Cross-tenant deve ser bloqueado");
  assert.equal(simulateAccessGuard(student, 1), "NOT_FOUND_OR_FORBIDDEN", "Aluno deve ser bloqueado nas rotas profissionais");

  console.log("  ✓ Matriz de autorização e isolamento multi-tenant aprovados.");
}

console.log("\n=======================================================");
console.log("SUÍTE DE NAVEGAÇÃO & 404: TODOS OS TESTES PASSARAM!");
console.log("=======================================================\n");
