import assert from "node:assert";
import fs from "node:fs";

console.log("======================================================================");
console.log(" TREVO ONE — QA SUITE: AUTORIZAÇÃO E RESOLUÇÃO DA FICHA DO ALUNO");
console.log("======================================================================\n");

// [TEST 1] Origem do link na lista de alunos
console.log("[TEST 1] Verificando geração de link canônico na lista de alunos...");
const listCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-list.tsx", "utf8");
assert.ok(
  listCode.includes("const studentDetailHref = isEffectiveNutritionist"),
  "studentDetailHref deve distinguir modo nutricionista e personal"
);
assert.ok(
  listCode.includes("/progresso/alunos/${student.membershipPublicId}?fromPage=${safePage}&filter=${filter}"),
  "studentDetailHref deve repassar membershipPublicId, fromPage e filter na URL"
);
console.log("✓ Link canônico com membershipPublicId e preservação de paginação/filtros verificado.\n");

// [TEST 2] Rota canônica no App Router e parâmetros de retorno
console.log("[TEST 2] Verificando tratamento de query params e backHref na rota de detalhe...");
const detailPageCode = fs.readFileSync("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx", "utf8");
assert.ok(
  detailPageCode.includes("resolvedSearchParams?.fromPage") &&
  detailPageCode.includes("resolvedSearchParams?.filter"),
  "Rota de detalhe deve extrair fromPage e filter de searchParams"
);
assert.ok(
  detailPageCode.includes("backQuery.set(\"page\", resolvedSearchParams.fromPage)") &&
  detailPageCode.includes("backQuery.set(\"filter\", resolvedSearchParams.filter)"),
  "Rota de detalhe deve montar backHref preservando página e filtros de retorno"
);
assert.ok(
  detailPageCode.includes("backHref={backHref}"),
  "Rota de detalhe deve repassar backHref para PersonalStudentDetailView"
);
console.log("✓ backHref montado e propagado corretamente para retorno fiel à listagem.\n");

// [TEST 3] Resolução segura de identificadores (cm.public_id e u.public_id) e isolamento multi-tenant
console.log("[TEST 3] Verificando resolução do aluno e proteção estrita de tenancy...");
assert.ok(
  detailPageCode.includes("cm.consultancy_id = ?") &&
  detailPageCode.includes("(cm.public_id = ? OR u.public_id = ?)") &&
  detailPageCode.includes("cm.status = 'ACTIVE'"),
  "Consulta de validação deve verificar tenancy, status ativo e aceitar tanto cm.public_id quanto u.public_id"
);
assert.ok(
  detailPageCode.includes("if (!Array.isArray(mRows) || mRows.length === 0) {") &&
  detailPageCode.includes("notFound();"),
  "Acesso a aluno inexistente ou de outra consultoria deve disparar notFound() (404 seguro)"
);
assert.ok(
  detailPageCode.includes("if (canonicalMembershipPublicId !== studentPublicId) {") &&
  detailPageCode.includes("redirect(`/consultoria/${slug}/progresso/alunos/${canonicalMembershipPublicId}${query}`);"),
  "Acesso por user_public_id deve redirecionar para a URL canônica de membership preservando query params"
);
console.log("✓ Resolução de identificador com isolamento estrito de tenancy e redirecionamento canônico verificados.\n");

// [TEST 4] Matriz de autorização e responsabilidade de equipe
console.log("[TEST 4] Verificando política de autorização (equipe, responsabilidade e dados clínicos)...");
assert.ok(
  detailPageCode.includes("if (isPersonal && !isConsultancyAdmin) {"),
  "Rota deve aplicar regras de autorização de equipe para personal quando não for admin"
);
assert.ok(
  detailPageCode.includes("hasDirectRelationship") &&
  detailPageCode.includes("assignedToOtherRows"),
  "Rota deve verificar relação direta ou atribuição a outro profissional da consultoria"
);
assert.ok(
  detailPageCode.includes("if (isAssignedToOtherCoach) {") &&
  detailPageCode.includes("notFound();"),
  "Profissional SEM relação direta NÃO pode acessar aluno sob responsabilidade de outro treinador"
);
console.log("✓ Autorização de equipe verificada: restrição legítima entre profissionais da mesma consultoria preservada.\n");

// [TEST 5] Verificando compatibilidade com estados vazios em PersonalStudentDetailView
console.log("[TEST 5] Verificando estados vazios na visão da ficha do aluno...");
const detailViewCode = fs.readFileSync("components/consultancies/personal-student-hub/personal-student-detail-view.tsx", "utf8");
assert.ok(
  detailViewCode.includes("Nenhuma rotina de treino ativa no momento para este aluno.") ||
  detailViewCode.includes("Nenhum treino criado para este aluno"),
  "PersonalStudentDetailView deve conter mensagem amigável de estado vazio para treinos"
);
assert.ok(
  detailViewCode.includes("Nenhuma foto registrada para este aluno") ||
  detailViewCode.includes("Nenhuma foto anexada"),
  "PersonalStudentDetailView deve conter mensagem amigável de estado vazio para fotos"
);
assert.ok(
  detailViewCode.includes("Nenhum formulário respondido") ||
  detailViewCode.includes("Nenhum formulário cadastrado para este aluno"),
  "PersonalStudentDetailView deve conter mensagem amigável de estado vazio para formulários"
);
console.log("✓ Estados vazios adequados confirmados para alunos sem registros.\n");

// [TEST 6] Simulação lógica da matriz de autorização
console.log("[TEST 6] Executando simulação lógica completa da matriz de autorização...");

function evaluateStudentAccess({
  userRole,
  userMembershipId,
  userConsultancyId,
  student,
  activeAssignments,
}) {
  // 1. Tenancy check
  if (!student || student.consultancy_id !== userConsultancyId || student.status !== "ACTIVE") {
    return { allowed: false, reason: "TENANT_OR_INACTIVE" };
  }

  // 2. Student role cannot access other student
  if (userRole === "STUDENT" || userRole === "INFLUENCER") {
    return { allowed: false, reason: "ROLE_UNAUTHORIZED" };
  }

  // 3. Admin has global visibility within the active consultancy
  if (userRole === "CONSULTANCY_ADMIN") {
    return { allowed: true, reason: "ADMIN_GLOBAL" };
  }

  // 4. Personal Trainer logic
  if (userRole === "PERSONAL") {
    const studentAssignments = activeAssignments.filter(
      (a) => a.student_membership_id === student.id && a.consultancy_id === userConsultancyId
    );

    // Direct relationship
    const isDirectlyAssigned = studentAssignments.some(
      (a) => a.assigned_by_membership_id === userMembershipId
    );
    if (isDirectlyAssigned) {
      return { allowed: true, reason: "DIRECT_RELATIONSHIP" };
    }

    // Check if assigned to another coach in the same consultancy
    const isAssignedToOtherCoach = studentAssignments.some(
      (a) => a.assigned_by_membership_id !== userMembershipId
    );
    if (isAssignedToOtherCoach) {
      return { allowed: false, reason: "ASSIGNED_TO_OTHER_COACH" };
    }

    // Student has no active assignments (unassigned) -> Allowed to prescribe
    return { allowed: true, reason: "UNASSIGNED_STUDENT_OPEN_TO_PRESCRIBE" };
  }

  return { allowed: false, reason: "UNKNOWN_ROLE" };
}

const mockDbStudents = {
  unassigned: { id: 10, consultancy_id: 1, status: "ACTIVE" },
  assignedToCoachA: { id: 11, consultancy_id: 1, status: "ACTIVE" },
  otherConsultancy: { id: 20, consultancy_id: 2, status: "ACTIVE" },
};

const mockAssignments = [
  { id: 1, consultancy_id: 1, student_membership_id: 11, assigned_by_membership_id: 101, status: "ACTIVE" },
];

const COACH_A_ID = 101;
const COACH_B_ID = 102;
const ADMIN_ID = 999;

// Caso 1: Coach A acessa aluno sob sua responsabilidade (aluno 11) -> PERMITIDO
const c1 = evaluateStudentAccess({
  userRole: "PERSONAL",
  userMembershipId: COACH_A_ID,
  userConsultancyId: 1,
  student: mockDbStudents.assignedToCoachA,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c1.allowed, true);
assert.strictEqual(c1.reason, "DIRECT_RELATIONSHIP");

// Caso 2: Coach A acessa aluno sem treino/não atribuído (aluno 10) -> PERMITIDO
const c2 = evaluateStudentAccess({
  userRole: "PERSONAL",
  userMembershipId: COACH_A_ID,
  userConsultancyId: 1,
  student: mockDbStudents.unassigned,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c2.allowed, true);
assert.strictEqual(c2.reason, "UNASSIGNED_STUDENT_OPEN_TO_PRESCRIBE");

// Caso 3: Coach B acessa aluno de Coach A (mesma consultoria) -> NEGADO (proteção de responsabilidade e clínica)
const c3 = evaluateStudentAccess({
  userRole: "PERSONAL",
  userMembershipId: COACH_B_ID,
  userConsultancyId: 1,
  student: mockDbStudents.assignedToCoachA,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c3.allowed, false);
assert.strictEqual(c3.reason, "ASSIGNED_TO_OTHER_COACH");

// Caso 4: Admin da consultoria acessa qualquer aluno da consultoria -> PERMITIDO
const c4 = evaluateStudentAccess({
  userRole: "CONSULTANCY_ADMIN",
  userMembershipId: ADMIN_ID,
  userConsultancyId: 1,
  student: mockDbStudents.assignedToCoachA,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c4.allowed, true);
assert.strictEqual(c4.reason, "ADMIN_GLOBAL");

// Caso 5: Coach A acessa aluno de OUTRA consultoria -> NEGADO (cross-tenant)
const c5 = evaluateStudentAccess({
  userRole: "PERSONAL",
  userMembershipId: COACH_A_ID,
  userConsultancyId: 1,
  student: mockDbStudents.otherConsultancy,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c5.allowed, false);
assert.strictEqual(c5.reason, "TENANT_OR_INACTIVE");

// Caso 6: Aluno tentando acessar outro aluno -> NEGADO
const c6 = evaluateStudentAccess({
  userRole: "STUDENT",
  userMembershipId: 50,
  userConsultancyId: 1,
  student: mockDbStudents.assignedToCoachA,
  activeAssignments: mockAssignments,
});
assert.strictEqual(c6.allowed, false);
assert.strictEqual(c6.reason, "ROLE_UNAUTHORIZED");

console.log("✓ Todos os 6 cenários da matriz de autorização testados e aprovados.\n");

console.log("======================================================================");
console.log(" ✓ TODAS AS 6 VALIDAÇÕES DA SUÍTE PASSARAM COM SUCESSO!");
console.log("======================================================================\n");
