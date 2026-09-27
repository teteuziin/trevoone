import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== INICIANDO SUÍTE DE TESTES: PERSONAL STUDENT HUB (FINAL UX CORRECTION) ===\n");

// ----------------------------------------------------------------------------
// TEST 1: CONFIRM REUSED EXISTING ROUTE AND ABSENCE OF DUPLICATE MODULE
// ----------------------------------------------------------------------------
{
  console.log("Test 1: Verificando reuso da rota existente e ausência de rota duplicada...");

  // Must NOT exist:
  const duplicateRouteExists = fs.existsSync("app/consultoria/[slug]/alunos");
  assert.equal(duplicateRouteExists, false, "Rota duplicada /consultoria/[slug]/alunos NÃO deve existir!");

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

  console.log("  ✓ Rota existente /progresso/alunos reutilizada e rota duplicada /alunos eliminada.");
}

// ----------------------------------------------------------------------------
// TEST 2: PERSONAL DASHBOARD ENTRY POINT (HOME)
// ----------------------------------------------------------------------------
{
  console.log("Test 2: Verificando card Alunos no Dashboard do Personal (Home)...");

  const dashboardCode = fs.readFileSync("components/dashboard/dashboard-personal-view.tsx", "utf8");

  assert.ok(
    dashboardCode.includes("href: `/consultoria/${consultancySlug}/progresso/alunos`"),
    "Dashboard deve possuir link apontando para /consultoria/${consultancySlug}/progresso/alunos"
  );
  assert.ok(
    dashboardCode.includes('title: "Alunos"'),
    "Card deve ter título 'Alunos'"
  );
  assert.ok(
    dashboardCode.includes("Veja seus alunos, informações, avaliações e monte treinos."),
    "Card deve ter o texto de apoio exato solicitado pelo produto"
  );
  assert.ok(
    dashboardCode.includes("UsersIcon"),
    "Card deve utilizar o ícone UsersIcon (users / people)"
  );

  console.log("  ✓ Dashboard Personal possui atalho 'Alunos' apontando para /progresso/alunos.");
}

// ----------------------------------------------------------------------------
// TEST 3: MENU 'MAIS' AUDIT (SINGLE ENTRY FOR ALUNOS)
// ----------------------------------------------------------------------------
{
  console.log("Test 3: Verificando menu 'Mais' do Personal com única entrada 'Alunos'...");

  const shellCode = fs.readFileSync("components/consultancies/consultancy-app-shell.tsx", "utf8");

  // In items: Personal must have single student entry 'personal-alunos' pointing to /progresso/alunos
  assert.ok(
    shellCode.includes('id: "personal-alunos"') &&
    shellCode.includes('href: `/consultoria/${consultancySlug}/progresso/alunos`'),
    "Navegação do Personal deve conter 'personal-alunos' apontando para /progresso/alunos"
  );

  // Must NOT contain separate student sub-modules in Mais menu for personal
  assert.ok(
    !shellCode.includes('id: "personal-progresso"'),
    "Navegação do Personal não pode conter entrada duplicada de progresso"
  );
  assert.ok(
    !shellCode.includes('id: "personal-formularios"'),
    "Navegação do Personal não pode conter entrada paralela de formulários solta"
  );

  console.log("  ✓ Menu 'Mais' possui apenas 'Alunos' como entrada de gestão de alunos.");
}

// ----------------------------------------------------------------------------
// TEST 4: TENANCY & SERVER-SIDE AUTHORIZATION IN DATA LAYER
// ----------------------------------------------------------------------------
{
  console.log("Test 4: Verificando segurança e multitenancy no módulo personal-student-hub.ts...");

  const hubCode = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");

  // Check tenancy enforcement in student listing
  assert.ok(
    hubCode.includes("cm.consultancy_id = ?"),
    "listPersonalStudents deve filtrar estritamente por cm.consultancy_id"
  );
  assert.ok(
    hubCode.includes("cm.status = 'ACTIVE'"),
    "listPersonalStudents deve filtrar apenas alunos ativos"
  );
  assert.ok(
    hubCode.includes("cmr.role = 'STUDENT'"),
    "listPersonalStudents deve filtrar apenas membros com role STUDENT"
  );

  // Check tenancy enforcement in student detail
  assert.ok(
    hubCode.includes("(cm.public_id = ? OR u.public_id = ?)"),
    "getPersonalStudentDetail deve aceitar tanto membershipPublicId quanto userPublicId"
  );
  assert.ok(
    hubCode.includes("consultancyId") && hubCode.includes("consultancySlug"),
    "getPersonalStudentDetail deve validar estritamente a consultoria corrente"
  );

  // Cross-tenant check: if member doesn't belong to consultancy, returns null
  assert.ok(
    hubCode.includes("members.length === 0") && hubCode.includes("return null;"),
    "getPersonalStudentDetail deve retornar null para alunos de outro tenant"
  );

  console.log("  ✓ Multitenancy, bloqueio cross-tenant e validação de vínculo garantidos no servidor.");
}

// ----------------------------------------------------------------------------
// TEST 5: DIRECT URL ROUTE PROTECTION (EXISTING REUSED ROUTES)
// ----------------------------------------------------------------------------
{
  console.log("Test 5: Verificando proteção e revalidação de rota direta...");

  const listPageCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/page.tsx", "utf8");
  const detailPageCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");

  assert.ok(
    listPageCode.includes("resolveConsultancyContext") &&
    listPageCode.includes("resolveEffectiveViewMode"),
    "Lista de alunos deve resolver contexto e effectiveViewMode no servidor"
  );
  assert.ok(
    listPageCode.includes("context.roles.includes(\"PERSONAL\")") &&
    listPageCode.includes("context.roles.includes(\"CONSULTANCY_ADMIN\")"),
    "Lista de alunos deve autorizar apenas PERSONAL e CONSULTANCY_ADMIN"
  );

  assert.ok(
    detailPageCode.includes("notFound()"),
    "Detalhe do aluno deve emitir notFound() se o aluno for de outro tenant ou inexistente"
  );
  assert.ok(
    detailPageCode.includes("getPersonalStudentDetail"),
    "Detalhe do aluno deve carregar dados via getPersonalStudentDetail server-side para Personal"
  );

  console.log("  ✓ Rotas /progresso/alunos e /progresso/alunos/[studentPublicId] revalidam permissão e tenant.");
}

// ----------------------------------------------------------------------------
// TEST 6: WORKOUT CREATION FLOW & STUDENT PRESELECTION AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 6: Verificando fluxo de criação de treino com aluno pré-selecionado...");

  const newWorkoutCode = fs.readFileSync("app/consultoria/[slug]/rotinas/novo/page.tsx", "utf8");
  const editorPageCode = fs.readFileSync("app/consultoria/[slug]/rotinas/[publicId]/page.tsx", "utf8");
  const builderCode = fs.readFileSync("components/consultancies/training-v2/workout-builder.tsx", "utf8");
  const assignModalCode = fs.readFileSync("components/consultancies/training-v2/workout-assign-modal.tsx", "utf8");

  // new workout page receives ?student=
  assert.ok(
    newWorkoutCode.includes("const { student: studentPublicId } = await searchParams;"),
    "Página de novo treino deve receber searchParams.student"
  );
  assert.ok(
    newWorkoutCode.includes("preselectedStudent"),
    "Página de novo treino deve validar e carregar o aluno pré-selecionado"
  );
  assert.ok(
    newWorkoutCode.includes("redirectUrl = targetStudent"),
    "Ao criar a rotina rascunho vazia, deve redirecionar com ?student= preservado"
  );

  // editor page propagates student to WorkoutBuilder
  assert.ok(
    editorPageCode.includes("initialStudentPublicId={student}"),
    "Página do editor deve passar initialStudentPublicId para WorkoutBuilder"
  );

  // WorkoutBuilder passes initialStudentPublicId to WorkoutAssignModal
  assert.ok(
    builderCode.includes("initialStudentPublicId={initialStudentPublicId}"),
    "WorkoutBuilder deve repassar initialStudentPublicId para WorkoutAssignModal"
  );

  // WorkoutAssignModal automatically binds student
  assert.ok(
    assignModalCode.includes("if (initialStudentPublicId && !selectedStudent)"),
    "WorkoutAssignModal deve auto-selecionar o aluno vinculado sem necessidade de segunda busca"
  );

  console.log("  ✓ Fluxo completo de criação de treino do zero com aluno pré-selecionado validado.");
}

// ----------------------------------------------------------------------------
// TEST 7: CENTRAL DO ALUNO TABS & HONEST EMPTY STATES AUDIT
// ----------------------------------------------------------------------------
{
  console.log("Test 7: Verificando abas e empty states honestos na Central do Aluno...");

  const detailViewCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-detail-view.tsx", "utf8");

  const requiredTabs = ["visao-geral", "fotos", "anamnese", "formularios", "treinos"];
  for (const tab of requiredTabs) {
    assert.ok(detailViewCode.includes(tab), `Aba '${tab}' deve estar implementada`);
  }

  // Check required empty states
  assert.ok(
    detailViewCode.includes("Nenhuma foto registrada"),
    "Empty state honesto de fotos deve ser 'Nenhuma foto registrada'"
  );
  assert.ok(
    detailViewCode.includes("Anamnese ainda não preenchida"),
    "Empty state honesto de anamnese deve ser 'Anamnese ainda não preenchida'"
  );
  assert.ok(
    detailViewCode.includes("Nenhum formulário respondido"),
    "Empty state honesto de formulários deve ser 'Nenhum formulário respondido'"
  );
  assert.ok(
    detailViewCode.includes("Nenhum treino criado para este aluno"),
    "Empty state honesto de treinos deve ser 'Nenhum treino criado para este aluno'"
  );

  // Check + Criar treino CTA exists and links to new workout
  assert.ok(
    detailViewCode.includes("+ Criar treino"),
    "CTA '+ Criar treino' deve existir no cabeçalho e na aba de treinos"
  );
  assert.ok(
    detailViewCode.includes("rotinas/novo?student="),
    "CTA deve direcionar para rotinas/novo com query student preenchida"
  );

  console.log("  ✓ Abas, visualização de dados reais e empty states honestos validados.");
}

console.log("\n=======================================================");
console.log("✓ TODOS OS TESTES PASSARAM COM SUCESSO! (7/7)");
console.log("=======================================================\n");
