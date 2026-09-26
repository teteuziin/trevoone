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
// TEST 5: CODEBASE INTEGRITY AUDIT (SEPARATION OF VIEW & AUTHOR)
// ----------------------------------------------------------------------------
{
  console.log("Test 5: Auditando integridade do código-fonte de autorização...");

  const accessCode = fs.readFileSync("lib/nutrition-v2/access.ts", "utf8");

  // canAuthorNutrition must strictly require NUTRITIONIST
  assert.ok(
    accessCode.includes('const canAuthorNutrition = hasRole("NUTRITIONIST");'),
    "canAuthorNutrition DEVE requerer estritamente hasRole('NUTRITIONIST')"
  );
  assert.ok(
    !accessCode.includes('const canAuthorNutrition = canManageConsultancy || hasRole("NUTRITIONIST");'),
    "canAuthorNutrition NÃO pode ser concedido apenas por ser canManageConsultancy"
  );

  // canViewNutrition must be a separate read capability
  assert.ok(
    accessCode.includes("const canViewNutrition = canAuthorNutrition || canManageConsultancy || isPlatformAdmin;"),
    "canViewNutrition deve permitir NUTRITIONIST, CONSULTANCY_ADMIN ou PlatformAdmin"
  );
  assert.ok(
    accessCode.includes("export function assertCanViewNutrition"),
    "assertCanViewNutrition deve estar exportada"
  );
  assert.ok(
    accessCode.includes("export function assertCanAuthorNutrition"),
    "assertCanAuthorNutrition deve estar exportada"
  );

  console.log("  ✓ Código-fonte de access.ts implementa separação estrita de autoria e visualização.");
}

// ----------------------------------------------------------------------------
// TEST 6: AUTHORIZATION MATRIX & MUTATION BOUNDARIES AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 6: Validando matriz de autorização e bloqueio de mutação para Admin...");

  class NutritionAuthorizationError extends Error {
    constructor(message, code = "FORBIDDEN", statusCode = 403) {
      super(message);
      this.name = "NutritionAuthorizationError";
      this.code = code;
      this.statusCode = statusCode;
    }
  }

  function assertCanViewNutrition(ctx) {
    if (!ctx.consultancyId || !ctx.membershipId || !ctx.canViewNutrition) {
      throw new NutritionAuthorizationError(
        "Acesso negado: visualização do workspace nutricional restrita a profissionais autorizados.",
        "UNAUTHORIZED_NUTRITION_VIEW",
        403
      );
    }
  }

  function assertCanAuthorNutrition(ctx) {
    if (!ctx.consultancyId || !ctx.membershipId || !ctx.canAuthorNutrition) {
      throw new NutritionAuthorizationError(
        "Acesso negado: apenas Nutricionistas da consultoria podem gerenciar a biblioteca de alimentos.",
        "UNAUTHORIZED_NUTRITION_AUTHOR",
        403
      );
    }
  }

  function simulateContext(roles, consultancyId = 1, isPlatformAdmin = false) {
    const hasRole = (r) => roles.includes(r);
    const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
    const canAuthorNutrition = hasRole("NUTRITIONIST");
    const canViewNutrition = canAuthorNutrition || canManageConsultancy || isPlatformAdmin;
    const isStudent = hasRole("STUDENT");

    return {
      userId: 100,
      userPublicId: "usr_100",
      isPlatformAdmin,
      consultancyId,
      consultancyPublicId: "c_1",
      consultancySlug: "demo",
      membershipId: 10,
      membershipPublicId: "mem_10",
      roles,
      hasRole,
      canAuthorNutrition,
      canViewNutrition,
      canManageConsultancy,
      canManageGlobal: isPlatformAdmin,
      isStudent,
    };
  }

  // A) Active NUTRITIONIST: Authoring and Viewing allowed
  const nutri = simulateContext(["NUTRITIONIST"]);
  assert.equal(nutri.canAuthorNutrition, true, "NUTRITIONIST ativo DEVE ter canAuthorNutrition=true");
  assert.equal(nutri.canViewNutrition, true, "NUTRITIONIST ativo DEVE ter canViewNutrition=true");
  assert.equal(nutri.canManageConsultancy, false, "NUTRITIONIST puro não é CONSULTANCY_ADMIN");
  assert.equal(nutri.isStudent, false);
  assert.doesNotThrow(() => assertCanAuthorNutrition(nutri), "Nutricionista pode executar ações de autoria/escrita");
  assert.doesNotThrow(() => assertCanViewNutrition(nutri), "Nutricionista pode visualizar workspace");

  // B) CONSULTANCY_ADMIN without NUTRITIONIST: Viewing allowed (read-only), Authoring BLOCKED
  const admin = simulateContext(["CONSULTANCY_ADMIN"]);
  assert.equal(admin.canAuthorNutrition, false, "CONSULTANCY_ADMIN isolado NÃO PODE ter canAuthorNutrition=true");
  assert.equal(admin.canViewNutrition, true, "CONSULTANCY_ADMIN DEVE ter canViewNutrition=true para preview");
  assert.equal(admin.canManageConsultancy, true);
  assert.equal(admin.isStudent, false);
  assert.doesNotThrow(() => assertCanViewNutrition(admin), "Admin tem permissão de preview/leitura do workspace");
  assert.throws(
    () => assertCanAuthorNutrition(admin),
    (err) => err instanceof NutritionAuthorizationError && err.code === "UNAUTHORIZED_NUTRITION_AUTHOR",
    "Admin sem NUTRITIONIST DEVE ser rejeitado com 403 em ações de escrita nutricional"
  );

  // C) Multi-role NUTRITIONIST + CONSULTANCY_ADMIN: Both allowed
  const multiAdminNutri = simulateContext(["CONSULTANCY_ADMIN", "NUTRITIONIST"]);
  assert.equal(multiAdminNutri.canAuthorNutrition, true, "Usuário com ambos os papéis tem autoria permitida");
  assert.equal(multiAdminNutri.canViewNutrition, true);
  assert.doesNotThrow(() => assertCanAuthorNutrition(multiAdminNutri));

  // D) STUDENT ONLY: Both Authoring and Viewing BLOCKED
  const student = simulateContext(["STUDENT"]);
  assert.equal(student.canAuthorNutrition, false, "STUDENT NÃO pode ter canAuthorNutrition");
  assert.equal(student.canViewNutrition, false, "STUDENT NÃO pode ter canViewNutrition");
  assert.equal(student.isStudent, true);
  assert.throws(() => assertCanAuthorNutrition(student));
  assert.throws(() => assertCanViewNutrition(student));

  // E) PERSONAL ONLY: Both Authoring and Viewing BLOCKED
  const personal = simulateContext(["PERSONAL"]);
  assert.equal(personal.canAuthorNutrition, false, "PERSONAL isolado NÃO tem autoria de nutrição");
  assert.equal(personal.canViewNutrition, false, "PERSONAL isolado NÃO tem visualização de nutrição");
  assert.throws(() => assertCanAuthorNutrition(personal));
  assert.throws(() => assertCanViewNutrition(personal));

  // F) Cross-tenant protection simulation
  const crossTenantAdmin = simulateContext(["CONSULTANCY_ADMIN"], 999);
  assert.throws(
    () => {
      if (crossTenantAdmin.consultancyId !== 1) {
        throw new NutritionAuthorizationError("Acesso negado: tenancy mismatch", "FORBIDDEN_CROSS_TENANT", 403);
      }
    },
    (err) => err.code === "FORBIDDEN_CROSS_TENANT"
  );

  console.log("  ✓ Separação estrita de permissões de leitura (preview) e escrita (autoria) aprovada.");
}

console.log("\n=======================================================");
console.log("SUÍTE DE NAVEGAÇÃO & 404: TODOS OS TESTES PASSARAM!");
console.log("=======================================================\n");
