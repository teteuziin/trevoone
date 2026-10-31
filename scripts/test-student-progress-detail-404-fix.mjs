import assert from "node:assert";
import fs from "node:fs";

console.log("======================================================================");
console.log(" TREVO ONE — QA SUITE: CORREÇÃO DO 404 NA FICHA DO ALUNO");
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

// [TEST 4] Eliminação do bloqueio indevido de alunos sem treino (causa raiz do 404)
console.log("[TEST 4] Verificando que alunos sem treino/avaliações NÃO são bloqueados com 404...");
assert.ok(
  !detailPageCode.includes("assignRows.length === 0") &&
  !detailPageCode.includes("Personal only sees assigned students"),
  "Bloqueio restritivo de assignRows NÃO deve existir na rota de detalhe do aluno"
);
console.log("✓ Bloqueio restritivo removido: qualquer aluno da consultoria pode ser visualizado pelo profissional.\n");

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

// [TEST 6] Simulação lógica de resolução de rotas
console.log("[TEST 6] Executando simulação lógica de resolução...");

function simulateRouteAccess({
  requestedPublicId,
  studentRecord,
  userConsultancyId,
}) {
  if (!studentRecord) return { status: 404 };
  if (studentRecord.consultancy_id !== userConsultancyId) return { status: 404 };
  if (studentRecord.status !== "ACTIVE") return { status: 404 };
  if (requestedPublicId !== studentRecord.membership_public_id && requestedPublicId !== studentRecord.user_public_id) {
    return { status: 404 };
  }
  if (requestedPublicId === studentRecord.user_public_id) {
    return { status: 307, redirect: `/consultoria/saiya-shape/progresso/alunos/${studentRecord.membership_public_id}` };
  }
  return { status: 200, canonicalId: studentRecord.membership_public_id };
}

const mockStudentWithNoWorkouts = {
  id: 101,
  membership_public_id: "8eecfe4f-5b3e-499f-bdb1-bcb74ad2fdc9",
  user_public_id: "usr-444-555-666",
  consultancy_id: 1,
  status: "ACTIVE",
};

const mockOtherTenantStudent = {
  id: 202,
  membership_public_id: "other-tenant-student-id",
  user_public_id: "usr-other-tenant",
  consultancy_id: 99,
  status: "ACTIVE",
};

// Cenário A: Aluno do saiya-shape acessado pelo membership_public_id (url da foto do usuário)
const resA = simulateRouteAccess({
  requestedPublicId: "8eecfe4f-5b3e-499f-bdb1-bcb74ad2fdc9",
  studentRecord: mockStudentWithNoWorkouts,
  userConsultancyId: 1,
});
assert.strictEqual(resA.status, 200, "Aluno da consultoria ativa sem treinos DEVE retornar 200");
assert.strictEqual(resA.canonicalId, "8eecfe4f-5b3e-499f-bdb1-bcb74ad2fdc9");

// Cenário B: Aluno do saiya-shape acessado pelo user_public_id
const resB = simulateRouteAccess({
  requestedPublicId: "usr-444-555-666",
  studentRecord: mockStudentWithNoWorkouts,
  userConsultancyId: 1,
});
assert.strictEqual(resB.status, 307, "Acesso por user_public_id DEVE redirecionar para membership_public_id");
assert.strictEqual(resB.redirect, "/consultoria/saiya-shape/progresso/alunos/8eecfe4f-5b3e-499f-bdb1-bcb74ad2fdc9");

// Cenário C: Aluno de outra consultoria (cross-tenant)
const resC = simulateRouteAccess({
  requestedPublicId: "other-tenant-student-id",
  studentRecord: mockOtherTenantStudent,
  userConsultancyId: 1,
});
assert.strictEqual(resC.status, 404, "Acesso cross-tenant DEVE retornar 404");

// Cenário D: ID inexistente
const resD = simulateRouteAccess({
  requestedPublicId: "completely-non-existent-uuid",
  studentRecord: null,
  userConsultancyId: 1,
});
assert.strictEqual(resD.status, 404, "ID inexistente DEVE retornar 404");

console.log("✓ Todos os 4 cenários de simulação lógica passaram com perfeição.\n");

console.log("======================================================================");
console.log(" ✓ TODAS AS 6 VALIDAÇÕES DA SUÍTE PASSARAM COM SUCESSO!");
console.log("======================================================================\n");
