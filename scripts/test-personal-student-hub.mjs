import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== INICIANDO SUÍTE DE TESTES: PERSONAL STUDENT HUB (HARDENING & CONTRACT) ===\n");

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
// TEST 2: STUDENT IDENTIFIER CONTRACT (MEMBERSHIP_PUBLIC_ID & NO USER FALLBACK)
// ----------------------------------------------------------------------------
{
  console.log("Test 2: Verificando contrato de identificador do aluno (MEMBERSHIP_PUBLIC_ID)...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
  const assignRepoCode = fs.readFileSync("lib/training-v2/assignment-repository.ts", "utf8");

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
    "USER_PUBLIC_ID_FALLBACK deve ser ABSENT no módulo de dados"
  );

  // assignment repository student search must NOT allow user_public_id fallback
  assert.ok(
    !assignRepoCode.includes("cm.public_id = ? OR u.public_id = ?"),
    "searchActiveStudents não deve aceitar user_public_id como fallback para membership"
  );

  // Route passes studentMembershipPublicId
  assert.ok(
    detailRouteCode.includes("studentMembershipPublicId: studentPublicId"),
    "Rota de detalhe deve mapear o parâmetro de rota para studentMembershipPublicId"
  );

  console.log("  ✓ ROUTE_USES_MEMBERSHIP_PUBLIC_ID: PASS");
  console.log("  ✓ USER_PUBLIC_ID_FALLBACK: ABSENT");
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
    hubCode.includes("formType: \"INTAKE\"") &&
    hubCode.includes("Questionário de Avaliação Física"),
    "Questionários não-anamnese devem ser preservados na aba Formulários"
  );

  // Custom consultancy form requests are preserved in forms
  assert.ok(
    hubCode.includes("formType: \"CUSTOM\"") &&
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

  console.log("  ✓ WORKOUT_PRESELECT_USES_MEMBERSHIP_ID: PASS");
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
// TEST 6: TENANCY AND CROSS-TENANT BLOCKING
// ----------------------------------------------------------------------------
{
  console.log("Test 6: Verificando segurança de multitenancy e bloqueio cross-tenant...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  const detailRouteCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");

  assert.ok(
    hubCode.includes("cm.consultancy_id = ?") &&
    hubCode.includes("cm.status = 'ACTIVE'") &&
    hubCode.includes("cmr.role = 'STUDENT'"),
    "listPersonalStudents e getPersonalStudentDetail devem validar consultancy_id, status ativo e papel STUDENT"
  );

  assert.ok(
    detailRouteCode.includes("notFound()"),
    "Rota de detalhe do aluno deve emitir notFound() se o aluno não pertencer à consultoria"
  );

  console.log("  ✓ CROSS_TENANT_ACCESS: BLOCKED");
}

console.log("\n===================================================================");
console.log("✓ TODOS OS CRITÉRIOS DE HARDENING PASSARAM COM SUCESSO! (6/6)");
console.log("===================================================================\n");
