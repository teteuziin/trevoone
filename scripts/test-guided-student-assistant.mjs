import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — GUIDED STUDENT ASSISTANT (NO AI) TEST SUITE");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

const assistantFile = path.resolve("components/consultancies/personal-student-hub/guided-student-assistant.tsx");
const listFile = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const pageFile = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");
const actionsFile = path.resolve("app/consultoria/[slug]/progresso/student-request-actions.ts");

assert.ok(fs.existsSync(assistantFile), "guided-student-assistant.tsx must exist");
assert.ok(fs.existsSync(listFile), "personal-student-list.tsx must exist");
assert.ok(fs.existsSync(pageFile), "alunos/page.tsx must exist");
assert.ok(fs.existsSync(actionsFile), "student-request-actions.ts must exist");

const assistantCode = fs.readFileSync(assistantFile, "utf-8");
const listCode = fs.readFileSync(listFile, "utf-8");
const pageCode = fs.readFileSync(pageFile, "utf-8");
const actionsCode = fs.readFileSync(actionsFile, "utf-8");

// -----------------------------------------------------------------------------
// 1. ABERTURA DIRETA & ARQUITETURA
// -----------------------------------------------------------------------------
runTest("1.1 Rota oficial de Alunos reutilizada com integração do assistente guiado", () => {
  assert.ok(
    pageCode.includes("PersonalStudentList"),
    "page.tsx deve renderizar o PersonalStudentList"
  );
  assert.ok(
    pageCode.includes("professionalName={session.fullName}"),
    "page.tsx deve passar o nome real do profissional autenticado"
  );
  assert.ok(
    listCode.includes("GuidedStudentAssistant"),
    "personal-student-list.tsx deve integrar o GuidedStudentAssistant diretamente"
  );
});

runTest("1.2 Abertura direta sem exigir segundo clique para 'Abrir assistente'", () => {
  assert.ok(
    assistantCode.includes('step === "SELECT_STUDENT"'),
    "O assistente deve abrir diretamente na Etapa 1 ao acessar a tela"
  );
  assert.ok(
    !assistantCode.includes("Abrir assistente"),
    "Não deve conter botão intermediário obrigatório para abrir o assistente"
  );
});

// -----------------------------------------------------------------------------
// 2. PRIMEIRA ETAPA — ESCOLHER O ALUNO
// -----------------------------------------------------------------------------
runTest("2.1 Saudação conversacional determinística com nome real do profissional", () => {
  assert.ok(
    assistantCode.includes("professionalName && professionalName.trim()") &&
    assistantCode.includes("Olá, ${professionalName.trim()}! Qual aluno você gostaria de ver?") &&
    assistantCode.includes("Olá! Qual aluno você gostaria de ver?"),
    "Deve conter a saudação nominal e fallback neutro"
  );
});

runTest("2.2 Busca convencional em tempo real sem IA", () => {
  assert.ok(
    assistantCode.includes("matchesName") &&
    assistantCode.includes("matchesEmail"),
    "Busca convencional por nome e e-mail implementada"
  );
  assert.ok(
    !assistantCode.includes("openai") &&
    !assistantCode.includes("chat/completions"),
    "Zero chamadas ou dependência de IA no assistente"
  );
});

runTest("2.3 Filtros de treino (Todos, Com treino, Sem treino)", () => {
  assert.ok(
    assistantCode.includes('workoutFilter === "ALL"') &&
    assistantCode.includes('workoutFilter === "WITH_WORKOUT"') &&
    assistantCode.includes('workoutFilter === "WITHOUT_WORKOUT"'),
    "Filtros operacionais de treino presentes"
  );
});

runTest("2.4 Cards de alunos ergonômicos com toque completo (>= 44px) e informações secundárias", () => {
  assert.ok(
    assistantCode.includes('data-testid="guided-student-card"'),
    "Card de aluno identificado"
  );
  assert.ok(
    assistantCode.includes("handleSelectStudent(student)"),
    "Toque em qualquer parte do card seleciona o aluno"
  );
  assert.ok(
    assistantCode.includes("min-h-[76px]") || assistantCode.includes("min-h-[44px]"),
    "Alvo de toque mínimo >= 44px respeitado"
  );
  assert.ok(
    assistantCode.includes("Treino ativo:") && assistantCode.includes("Sem treino prescrito"),
    "Informações de treino exibidas claramente no card"
  );
});

// -----------------------------------------------------------------------------
// 3. SEGUNDA ETAPA — ESCOLHER O QUE VER
// -----------------------------------------------------------------------------
runTest("3.1 Avanço em slide com apresentação 'O que você gostaria de ver de [nome]?'", () => {
  assert.ok(
    assistantCode.includes('step === "SELECT_SECTION"'),
    "Etapa 2 definida no componente"
  );
  assert.ok(
    assistantCode.includes("O que você gostaria de ver de {selectedStudent.name}?"),
    "Pergunta conversacional determinística presente"
  );
});

runTest("3.2 Cinco opções claras (Visão Geral, Fotos, Anamnese, Formulários, Treinos)", () => {
  assert.ok(assistantCode.includes('handleSelectSection("visao-geral")'), "Opção Visão Geral presente");
  assert.ok(assistantCode.includes('handleSelectSection("fotos")'), "Opção Fotos presente");
  assert.ok(assistantCode.includes('handleSelectSection("anamnese")'), "Opção Anamnese presente");
  assert.ok(assistantCode.includes('handleSelectSection("formularios")'), "Opção Formulários presente");
  assert.ok(assistantCode.includes('handleSelectSection("treinos")'), "Opção Treinos presente");
});

runTest("3.3 Troca de aluno fácil preservando contexto", () => {
  assert.ok(
    assistantCode.includes("handleBackToStudents"),
    "Função de retorno à lista de alunos implementada"
  );
  assert.ok(
    assistantCode.includes("Trocar aluno"),
    "Ação de trocar aluno disponível"
  );
});

// -----------------------------------------------------------------------------
// 4. TERCEIRA ETAPA — SEÇÕES DETERMINÍSTICAS
// -----------------------------------------------------------------------------
runTest("4.1 Visão Geral: blocos informativos estruturados sem interpretações de IA", () => {
  assert.ok(
    assistantCode.includes("1. Cadastro e Contato") &&
    assistantCode.includes("2. Objetivos Registrados") &&
    assistantCode.includes("3. Medidas e Evolução Registradas") &&
    assistantCode.includes("4. Situação dos Treinos") &&
    assistantCode.includes("5. Anamneses e Formulários"),
    "Todos os blocos informativos reais da Visão Geral presentes"
  );
  assert.ok(
    assistantCode.includes("Veja as informações de {currentDetail.student.name}."),
    "Cabeçalho conversacional da Visão Geral determinístico"
  );
});

runTest("4.2 Fotos: timeline por data, proporção preservada, zoom e comparador lado a lado", () => {
  assert.ok(
    assistantCode.includes("Aqui estão os registros fotográficos de {currentDetail.student.name}."),
    "Cabeçalho de Fotos presente"
  );
  assert.ok(
    assistantCode.includes("object-contain"),
    "Proporção da imagem preservada sem cortes distorcidos"
  );
  assert.ok(
    assistantCode.includes("setSelectedZoomPhoto"),
    "Ampliação da foto (Lightbox) implementada"
  );
  assert.ok(
    assistantCode.includes("Comparar antes e depois") || assistantCode.includes("Comparação Lado a Lado"),
    "Comparador de fotos lado a lado implementado"
  );
  assert.ok(
    assistantCode.includes("handleSendPhotosRequest"),
    "Ação de solicitar fotos de evolução preservada"
  );
});

runTest("4.3 Anamnese: sub-abas de respostas, histórico e envio guiado", () => {
  assert.ok(
    assistantCode.includes("Anamnese e histórico de saúde de {currentDetail.student.name}."),
    "Cabeçalho de Anamnese presente"
  );
  assert.ok(
    assistantCode.includes("Ver respostas do aluno") &&
    assistantCode.includes("Consultar histórico") &&
    assistantCode.includes("Enviar anamnese ao aluno"),
    "Sub-abas de Anamnese presentes"
  );
  assert.ok(
    assistantCode.includes("handleSendAnamnesisRequest"),
    "Ação de envio de anamnese integrada"
  );
});

runTest("4.4 Formulários: respostas salvas, histórico e envio de modelos", () => {
  assert.ok(
    assistantCode.includes("Formulários e questionários de {currentDetail.student.name}."),
    "Cabeçalho de Formulários presente"
  );
  assert.ok(
    assistantCode.includes("Formulários respondidos") &&
    assistantCode.includes("Enviar novo formulário"),
    "Sub-abas de Formulários presentes"
  );
  assert.ok(
    assistantCode.includes("handleSendCustomFormRequest"),
    "Ação de envio de formulário com confirmação integrada"
  );
});

runTest("4.5 Treinos: 1 ativo abre fluxo oficial; múltiplos permite escolha; 0 oferece criação", () => {
  assert.ok(
    assistantCode.includes("activeWorkouts.length === 1"),
    "Trata o caso de 1 treino ativo"
  );
  assert.ok(
    assistantCode.includes("Abrir no Training Studio →") || assistantCode.includes("rotinas/${workout.workoutPublicId}"),
    "Link direto para o treino ativo no Training Studio"
  );
  assert.ok(
    assistantCode.includes("activeWorkouts.length > 1"),
    "Trata o caso de múltiplos treinos ativos com escolha nominal"
  );
  assert.ok(
    assistantCode.includes("Nenhum treino ativo no momento"),
    "Trata o caso de 0 treinos ativos com criação e modelos"
  );
});

// -----------------------------------------------------------------------------
// 5. SERVER ACTIONS & SEGURANÇA MULTI-TENANT
// -----------------------------------------------------------------------------
runTest("5.1 getPersonalStudentDetailAction valida sessão, roles e tenancy no servidor", () => {
  assert.ok(
    actionsCode.includes("export async function getPersonalStudentDetailAction"),
    "getPersonalStudentDetailAction exportada"
  );
  assert.ok(
    actionsCode.includes("getCurrentSession()") &&
    actionsCode.includes("resolveConsultancyContext"),
    "Autenticação e resolução de contexto presentes"
  );
  assert.ok(
    actionsCode.includes("getPersonalStudentDetail({"),
    "Chama serviço central com consultancyId e studentMembershipPublicId"
  );
});

runTest("5.2 Prevenção de race conditions ao alternar rapidamente entre alunos", () => {
  assert.ok(
    assistantCode.includes("latestRequestIdRef"),
    "Identificador de requisição utilizado para descartar respostas defasadas"
  );
});

// -----------------------------------------------------------------------------
// 6. DESIGN, TEMAS & CONTRASTE
// -----------------------------------------------------------------------------
runTest("6.1 Identidade visual preto/grafite (#151619, #0B0C0E) sem cards verde-escuros (#10271F)", () => {
  assert.ok(
    assistantCode.includes("bg-[#151619]") && assistantCode.includes("bg-[#0B0C0E]"),
    "Cards pretos/grafite sólidos utilizados"
  );
  assert.ok(
    !assistantCode.includes("#10271F") && !assistantCode.includes("#1e4738"),
    "Cards verde-escuros antigos não utilizados no assistente"
  );
  assert.ok(
    assistantCode.includes("text-white") && assistantCode.includes("text-emerald-400"),
    "Textos claros e destaque esmeralda dentro de cards pretos"
  );
});

console.log("\n================================================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
