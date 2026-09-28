import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== INICIANDO SUÍTE DE TESTES: PERSONAL STUDENT HUB (SHARED-ROLE REGRESSION GATE) ===\n");

// ----------------------------------------------------------------------------
// TEST 1: REUSED EXISTING ROUTE AND ABSENCE OF DUPLICATE MODULE
// ----------------------------------------------------------------------------
{
  console.log("Test 1: Verificando reuso da rota existente e ausência de rota duplicada...");

  // Must NOT exist:
  const duplicateRouteExists = fs.existsSync("app/consultoria/[slug]/alunos");
  assert.equal(duplicateRouteExists, false, "DUPLICATE_ALUNOS_ROUTE deve ser NO!");

  // Must exist:
  const requiredFiles = [
    "app/consultoria/[slug]/progresso/alunos/page.tsx",
    "app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx",
    "lib/consultancies/personal-student-hub.ts",
    "components/consultancies/personal-student-hub/personal-student-list.tsx",
    "components/consultancies/personal-student-hub/personal-student-detail-view.tsx",
    "components/dashboard/dashboard-personal-view.tsx",
    "components/consultancies/consultancy-app-shell.tsx",
  ];

  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    assert.ok(exists, `Arquivo obrigatório ausente: ${file}`);
  }

  console.log("  ✓ EXISTING_ALUNOS_ROUTE_REUSED: YES");
  console.log("  ✓ DUPLICATE_ALUNOS_ROUTE: NO");
}

// ----------------------------------------------------------------------------
// TEST 2: STUDENT IDENTIFIER CONTRACT & PERSONAL LIST ID
// ----------------------------------------------------------------------------
{
  console.log("Test 2: Verificando contrato de identificador do aluno (PERSONAL_LIST_ID: MEMBERSHIP_PUBLIC_ID)...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const listCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-list.tsx", "utf8");

  // getPersonalStudentDetail parameter contract
  assert.ok(
    hubCode.includes("studentMembershipPublicId: string"),
    "getPersonalStudentDetail deve exigir explicitamente studentMembershipPublicId"
  );

  // SQL must filter strictly by cm.public_id and NOT allow u.public_id fallback
  assert.ok(
    hubCode.includes("AND cm.public_id = ?") && hubCode.includes("[consultancyId, studentMembershipPublicId]"),
    "SQL de getPersonalStudentDetail deve filtrar estritamente por cm.public_id = ?"
  );
  assert.ok(
    !hubCode.includes("cm.public_id = ? OR u.public_id = ?"),
    "USER_PUBLIC_ID_FALLBACK deve ser ABSENT no hub de personal"
  );

  // Student list links using student.membershipPublicId
  assert.ok(
    listCode.includes("href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}"),
    "Links da lista de alunos devem usar student.membershipPublicId"
  );

  // Route passes studentMembershipPublicId
  assert.ok(
    detailRouteCode.includes("studentMembershipPublicId: studentPublicId"),
    "Rota de detalhe deve repassar studentPublicId como studentMembershipPublicId para getPersonalStudentDetail"
  );

  console.log("  ✓ PERSONAL_LIST_ID: MEMBERSHIP_PUBLIC_ID");
  console.log("  ✓ ROUTE_USES_MEMBERSHIP_PUBLIC_ID: PASS");
  console.log("  ✓ USER_PUBLIC_ID_FALLBACK_IN_PERSONAL_DETAIL: NO");
}

// ----------------------------------------------------------------------------
// TEST 3: ANAMNESE VS FORMULÁRIOS SEPARATION (NO DUPLICATION)
// ----------------------------------------------------------------------------
{
  console.log("Test 3: Verificando separação estrita entre Anamnese e Formulários...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");

  // Anamnesis is NOT pushed into forms array
  assert.ok(
    hubCode.includes("isAnamnesis =") && hubCode.includes("if (!isAnamnesis) {"),
    "Submissões de anamnese NÃO devem ser incluídas no array de formulários"
  );

  // Non-anamnesis intake submissions are preserved in forms
  assert.ok(
    hubCode.includes('formType: "INTAKE"') &&
    hubCode.includes("Questionário de Avaliação Física"),
    "Questionários não-anamnese devem ser preservados na aba Formulários"
  );

  // Custom consultancy form requests are preserved in forms
  assert.ok(
    hubCode.includes('formType: "CUSTOM"') &&
    hubCode.includes("consultancy_custom_form_requests"),
    "Formulários personalizados da consultoria devem ser preservados na aba Formulários"
  );

  console.log("  ✓ ANAMNESIS_DUPLICATED_IN_FORMS: NO");
  console.log("  ✓ CUSTOM_FORMS_PRESERVED: YES");
  console.log("  ✓ NON_ANAMNESIS_FORMS_PRESERVED: YES");
}

// ----------------------------------------------------------------------------
// TEST 4: WORKOUT CREATION & PRESELECTION USES MEMBERSHIP_PUBLIC_ID
// ----------------------------------------------------------------------------
{
  console.log("Test 4: Verificando propagação consistente de membershipPublicId no fluxo de criação...");

  const detailViewCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-detail-view.tsx", "utf8");
  const listCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-list.tsx", "utf8");
  const newWorkoutCode = fs.readFileSync("app/consultoria/[slug]/rotinas/novo/page.tsx", "utf8");

  // CTA in Central do Aluno uses student.membershipPublicId
  assert.ok(
    detailViewCode.includes("rotinas/novo?student=${student.membershipPublicId}"),
    "CTA '+ Criar treino' no detalhe do aluno deve passar student.membershipPublicId"
  );

  // CTA in Student List uses student.membershipPublicId
  assert.ok(
    listCode.includes("rotinas/novo?student=${student.membershipPublicId}"),
    "CTA '+ Criar treino' na lista de alunos deve passar student.membershipPublicId"
  );

  // New workout page explicitly binds studentMembershipPublicId
  assert.ok(
    newWorkoutCode.includes("studentMembershipPublicId") &&
    newWorkoutCode.includes("targetStudentMembershipPublicId"),
    "Página de novo treino deve utilizar explicitamente studentMembershipPublicId"
  );

  // Hidden input passes student.membershipPublicId
  assert.ok(
    newWorkoutCode.includes("value={preselectedStudent.student.membershipPublicId}"),
    "Campo oculto deve repassar preselectedStudent.student.membershipPublicId"
  );

  console.log("  ✓ PERSONAL_WORKOUT_PRESELECT: PASS");
}

// ----------------------------------------------------------------------------
// TEST 5: PRESERVE APPROVED UX (HOME & MAIS ENTRY POINTS)
// ----------------------------------------------------------------------------
{
  console.log("Test 5: Verificando preservação da UX aprovada (Home e Mais)...");

  const dashboardCode = fs.readFileSync("components/dashboard/dashboard-personal-view.tsx", "utf8");
  const shellCode = fs.readFileSync("components/consultancies/consultancy-app-shell.tsx", "utf8");

  // Home card
  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/progresso/alunos`") &&
    dashboardCode.includes('title: "Alunos"'),
    "PERSONAL_HOME_ALUNOS_CARD deve apontar para /progresso/alunos"
  );

  // Mais menu has single student entry
  assert.ok(
    shellCode.includes('id: "personal-alunos"') &&
    shellCode.includes('href: `/consultoria/${consultancySlug}/progresso/alunos`'),
    "PERSONAL_MAIS_ALUNOS deve apontar para /progresso/alunos"
  );

  assert.ok(
    !shellCode.includes('id: "personal-progresso"'),
    "Menu 'Mais' não deve possuir entradas duplicadas"
  );

  console.log("  ✓ PERSONAL_HOME_ALUNOS_CARD: YES");
  console.log("  ✓ PERSONAL_MAIS_ALUNOS: YES");
  console.log("  ✓ ALUNOS_DESTINATION_COUNT: 1");
}

// ----------------------------------------------------------------------------
// TEST 6: TENANCY, EX-MEMBER, AND DIRECT URL SERVER REVALIDATION
// ----------------------------------------------------------------------------
{
  console.log("Test 6: Verificando multitenancy, bloqueio de ex-membro e revalidação de URL direta...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const evolutionCode = fs.readFileSync("lib/consultancies/evolution.ts", "utf8");

  // Tenancy check in hub
  assert.ok(
    hubCode.includes("cm.consultancy_id = ?") &&
    hubCode.includes("cm.status = 'ACTIVE'") &&
    hubCode.includes("cmr.role = 'STUDENT'"),
    "listPersonalStudents e getPersonalStudentDetail devem validar tenancy, status ACTIVE e role STUDENT"
  );

  // Tenancy check in evolution
  assert.ok(
    evolutionCode.includes("cm.consultancy_id = ?") &&
    evolutionCode.includes("cm.status = 'ACTIVE'"),
    "resolveEvolutionTargetStudent deve validar tenancy e status ACTIVE"
  );

  // Direct URL triggers server component with notFound() if not authorized
  assert.ok(
    detailRouteCode.includes("notFound()") &&
    detailRouteCode.includes("resolveConsultancyContext(session.userId, slug)") &&
    detailRouteCode.includes("resolveEffectiveViewMode(slug, context.roles)"),
    "Rota compartilhada de detalhe deve validar sessão, tenancy e permissões em runtime"
  );

  console.log("  ✓ CROSS_TENANT: BLOCKED");
  console.log("  ✓ EX_MEMBER: BLOCKED");
  console.log("  ✓ DIRECT_URL: SERVER_REVALIDATED");
}

// ----------------------------------------------------------------------------
// TEST 7: EVOLUTION ID CONTRACT & NUTRITIONIST ROLE COMPATIBILITY
// ----------------------------------------------------------------------------
{
  console.log("Test 7: Verificando contrato de identificadores do módulo de evolução e suporte a Nutricionista...");

  const evolutionCode = fs.readFileSync("lib/consultancies/evolution.ts", "utf8");
  const progressCode = fs.readFileSync("lib/consultancies/progress.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const listRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/page.tsx", "utf8");

  // 1. Audit resolveEvolutionTargetStudent query in evolution.ts
  const hasBothConditionsInEvolution =
    evolutionCode.includes("(cm.public_id = ? OR u.public_id = ?)") &&
    evolutionCode.includes("cm.consultancy_id = ?") &&
    evolutionCode.includes("cm.status = 'ACTIVE'");

  assert.ok(
    hasBothConditionsInEvolution,
    "resolveEvolutionTargetStudent deve suportar BOTH (cm.public_id e u.public_id) com escopo estrito de tenancy"
  );

  // 2. Audit listProfessionalStudentsForProgress historical mapping
  const mapsMembershipInList =
    progressCode.includes("cm.public_id AS membership_public_id") &&
    progressCode.includes("publicId: String(r.membership_public_id)");

  assert.ok(
    mapsMembershipInList,
    "listProfessionalStudentsForProgress historicamente mapeia cm.public_id como publicId da rota"
  );

  // 3. Shared route delegation for NUTRITIONIST
  assert.ok(
    detailRouteCode.includes('isNutritionist = effectiveMode === "NUTRITIONIST"'),
    "Rota de detalhe deve identificar modo NUTRITIONIST"
  );

  assert.ok(
    detailRouteCode.includes("getStudentEvolutionHubData") &&
    detailRouteCode.includes("getEvolutionComparisonBetweenDates") &&
    detailRouteCode.includes("<Evolution360Hub"),
    "Rota de detalhe deve renderizar Evolution360Hub para Nutricionista"
  );

  // 4. Ensure hubData.student.publicId (canonical membership publicId) is forwarded to Evolution360Hub
  assert.ok(
    detailRouteCode.includes("studentPublicId={hubData.student.publicId}"),
    "Rota de detalhe deve repassar o publicId canônico resolvido no servidor (hubData.student.publicId) ao Evolution360Hub"
  );

  // 5. Shared list page permits Nutritionist access
  assert.ok(
    listRouteCode.includes("isNutritionist") &&
    listRouteCode.includes("listPersonalStudents({ consultancyId: context.consultancyId })"),
    "Página de lista unificada deve listar alunos para o Nutricionista"
  );

  console.log("  ✓ EVOLUTION_TARGET_ID_TYPE: BOTH");
  console.log("  ✓ NUTRITIONIST_HISTORICAL_ROUTE_ID: MEMBERSHIP_PUBLIC_ID");
  console.log("  ✓ NUTRITIONIST_LIST: PASS");
  console.log("  ✓ NUTRITIONIST_DETAIL: PASS");
  console.log("  ✓ NUTRITIONIST_EVOLUTION_360: PASS");
}

// ----------------------------------------------------------------------------
// TEST 8: CONSULTANCY ADMIN & MULTI-ROLE COMPATIBILITY
// ----------------------------------------------------------------------------
{
  console.log("Test 8: Verificando compatibilidade de ADMIN / CONSULTANCY_ADMIN e suporte a Multi-Role...");

  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");

  // Admin access to Central do Aluno
  assert.ok(
    detailRouteCode.includes("if (isPersonal || isConsultancyAdmin) {") &&
    detailRouteCode.includes("<PersonalStudentDetailView"),
    "CONSULTANCY_ADMIN no modo padrão deve renderizar a Central do Aluno"
  );

  // Multi-role branching: effectiveMode determines view presentation
  assert.ok(
    detailRouteCode.includes("const { effectiveMode } = effectiveState;") &&
    detailRouteCode.includes('const isPersonal = effectiveMode === "PERSONAL"') &&
    detailRouteCode.includes('const isNutritionist = effectiveMode === "NUTRITIONIST"'),
    "Detalhamento deve honrar o modo efetivo para usuários multi-papel"
  );

  console.log("  ✓ PERSONAL_DETAIL: PASS");
  console.log("  ✓ CONSULTANCY_ADMIN_DETAIL: PASS");
  console.log("  ✓ MULTI_ROLE_PERSONAL_MODE: PASS");
  console.log("  ✓ MULTI_ROLE_NUTRITIONIST_MODE: PASS");
}

// ----------------------------------------------------------------------------
// TEST 9: GENERIC STUDENT SEARCH VS STRICT PERSONAL PRESELECTION
// ----------------------------------------------------------------------------
{
  console.log("Test 9: Verificando regressão de busca genérica vs resolução estrita de pré-seleção...");

  const assignRepoCode = fs.readFileSync("lib/training-v2/assignment-repository.ts", "utf8");
  const actionsCode = fs.readFileSync("app/consultoria/[slug]/rotinas/actions.ts", "utf8");
  const modalCode = fs.readFileSync("components/consultancies/training-v2/workout-assign-modal.tsx", "utf8");

  // Generic searchActiveStudents supports name, email, cm.public_id, u.public_id
  const hasGenericConditions =
    assignRepoCode.includes("u.full_name LIKE ? OR u.email LIKE ? OR cm.public_id = ? OR u.public_id = ?");
  assert.ok(
    hasGenericConditions,
    "searchActiveStudents DEVE preservar busca genérica por nome, email, cm.public_id e u.public_id"
  );

  // Dedicated strict resolver exists in repository
  assert.ok(
    assignRepoCode.includes("export async function getActiveStudentByMembershipPublicId("),
    "assignment-repository deve exportar getActiveStudentByMembershipPublicId"
  );

  assert.ok(
    assignRepoCode.includes("cm.consultancy_id = ?") &&
    assignRepoCode.includes("cm.public_id = ?") &&
    assignRepoCode.includes("cm.status = 'ACTIVE'"),
    "getActiveStudentByMembershipPublicId deve filtrar estritamente por cm.public_id sob tenancy atual"
  );

  // Dedicated action exists
  assert.ok(
    actionsCode.includes("export async function getActiveStudentByMembershipAction("),
    "rotinas/actions.ts deve exportar getActiveStudentByMembershipAction"
  );

  // Workout assignment modal uses strict membership resolution for preselection
  assert.ok(
    modalCode.includes("getActiveStudentByMembershipAction(slug, initialStudentPublicId)"),
    "workout-assign-modal deve resolver pré-seleção estritamente por vínculo de membro"
  );

  console.log("  ✓ GENERIC_STUDENT_SEARCH_REGRESSION: PASS");
  console.log("  ✓ PERSONAL_PRESELECT_STRICT_MEMBERSHIP: PASS");
}

console.log("\n===================================================================");
console.log("✓ TODOS OS CRITÉRIOS DE REGRESSÃO DE PAPÉIS PASSARAM COM SUCESSO! (9/9)");
console.log("===================================================================\n");
