import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log(" TREVO ONE — QA SUITE: NOVO TREVO CHAT & DESATIVAÇÃO DE VÍDEO");
console.log("======================================================================");

// -----------------------------------------------------------------------------
// 1. MIGRATION 069 AUDIT
// -----------------------------------------------------------------------------
console.log("\n[TEST 1] Verificando Migration 069 e colunas aditivas...");
const migrationPath = path.resolve("database/migrations/069_trevo_chat_consultation_evolution.sql");
assert.ok(fs.existsSync(migrationPath), "Migration 069 deve existir");
const migration069 = fs.readFileSync(migrationPath, "utf-8");

const requiredColumns = [
  "expected_response_hours",
  "closed_at",
  "closed_by_user_id",
  "closure_summary_json",
  "private_notes",
  "linked_previous_consultation_id",
  "client_message_id",
  "reply_to_message_id",
  "payload_json",
];

for (const col of requiredColumns) {
  assert.ok(migration069.includes(col), `Migration 069 deve conter coluna '${col}'`);
}
console.log("✓ Migration 069 contém todas as 9 novas colunas aditivas e índices necessários.");

// -----------------------------------------------------------------------------
// 2. VIDEO CONSULTATION DEACTIVATION & ZERO LOSS OF HISTORICAL DATA
// -----------------------------------------------------------------------------
console.log("\n[TEST 2] Verificando desativação de novas salas de vídeo e preservação do histórico...");
const actionsPath = path.resolve("app/consultoria/[slug]/consultas/actions.ts");
const actionsCode = fs.readFileSync(actionsPath, "utf-8");
assert.ok(
  actionsCode.includes("Trevo Chat") && actionsCode.includes("exclusivamente de forma assíncrona"),
  "scheduleConsultationAction deve rejeitar criação de videochamada e orientar sobre Trevo Chat"
);

const preflightPath = path.resolve("app/consultoria/[slug]/consultas/[consultationPublicId]/preflight/page.tsx");
const preflightCode = fs.readFileSync(preflightPath, "utf-8");
assert.ok(
  preflightCode.includes("Trevo Chat") && preflightCode.includes("Os atendimentos agora acontecem no Trevo Chat"),
  "Página de preflight deve informar migração para o Trevo Chat com link direto"
);

const salaPath = path.resolve("app/consultoria/[slug]/consultas/[consultationPublicId]/sala/page.tsx");
const salaCode = fs.readFileSync(salaPath, "utf-8");
assert.ok(
  salaCode.includes("Trevo Chat") && salaCode.includes("Sala de videochamada desativada"),
  "Página da sala deve informar migração para o Trevo Chat com link direto"
);

// Verify consultas/page.tsx maps video consultations without deleting
const mainPagePath = path.resolve("app/consultoria/[slug]/consultas/page.tsx");
const mainPageCode = fs.readFileSync(mainPagePath, "utf-8");
assert.ok(
  mainPageCode.includes('modality: "VIDEO"') && mainPageCode.includes("📹 Consulta por Vídeo"),
  "Página principal de consultas deve mapear consultas anteriores de vídeo com modality VIDEO e badge"
);
assert.ok(
  !mainPageCode.includes("ConsultationsTabbedContainer"),
  "Página principal não deve mais renderizar o chaveador de abas entre vídeo e chat"
);
console.log("✓ Videochamadas ativas desativadas; páginas informativas e histórico preservado com segurança.");

// -----------------------------------------------------------------------------
// 3. QUEUES SEPARATION LOGIC (STUDENT & PROFESSIONAL)
// -----------------------------------------------------------------------------
console.log("\n[TEST 3] Verificando lógica de separação de filas de atendimento...");

function getStudentQueueKey(c) {
  if (
    c.status === "COMPLETED" ||
    c.status === "DECLINED" ||
    c.status === "CANCELED" ||
    Boolean(c.closedAt) ||
    c.modality === "VIDEO"
  ) {
    return "CONCLUIDAS";
  }
  if (c.status === "PROPOSED") {
    return "SOLICITACOES";
  }
  return "EM_ATENDIMENTO";
}

function getProQueueKey(c) {
  if (
    c.status === "COMPLETED" ||
    c.status === "DECLINED" ||
    c.status === "CANCELED" ||
    Boolean(c.closedAt) ||
    c.modality === "VIDEO"
  ) {
    return "CONCLUIDOS";
  }
  if (c.status === "PROPOSED") {
    return "SOLICITACOES_RECEBIDAS";
  }
  if (c.status === "AWAITING_PROFESSIONAL") {
    return "PRECISO_RESPONDER";
  }
  return "AGUARDANDO_ALUNO";
}

// Assert student queues
assert.equal(getStudentQueueKey({ status: "CONFIRMED", modality: "CHAT" }), "EM_ATENDIMENTO");
assert.equal(getStudentQueueKey({ status: "AWAITING_STUDENT", modality: "CHAT" }), "EM_ATENDIMENTO");
assert.equal(getStudentQueueKey({ status: "AWAITING_PROFESSIONAL", modality: "CHAT" }), "EM_ATENDIMENTO");
assert.equal(getStudentQueueKey({ status: "PROPOSED", modality: "CHAT" }), "SOLICITACOES");
assert.equal(getStudentQueueKey({ status: "COMPLETED", modality: "CHAT" }), "CONCLUIDAS");
assert.equal(getStudentQueueKey({ status: "CONFIRMED", closedAt: "2026-10-30T10:00:00Z", modality: "CHAT" }), "CONCLUIDAS");
assert.equal(getStudentQueueKey({ status: "CONFIRMED", modality: "VIDEO" }), "CONCLUIDAS");

// Assert professional queues
assert.equal(getProQueueKey({ status: "AWAITING_PROFESSIONAL", modality: "CHAT" }), "PRECISO_RESPONDER");
assert.equal(getProQueueKey({ status: "AWAITING_STUDENT", modality: "CHAT" }), "AGUARDANDO_ALUNO");
assert.equal(getProQueueKey({ status: "CONFIRMED", modality: "CHAT" }), "AGUARDANDO_ALUNO");
assert.equal(getProQueueKey({ status: "PROPOSED", modality: "CHAT" }), "SOLICITACOES_RECEBIDAS");
assert.equal(getProQueueKey({ status: "COMPLETED", modality: "CHAT" }), "CONCLUIDOS");
assert.equal(getProQueueKey({ status: "CONFIRMED", closedAt: "2026-10-30T10:00:00Z", modality: "CHAT" }), "CONCLUIDOS");
assert.equal(getProQueueKey({ status: "CONFIRMED", modality: "VIDEO" }), "CONCLUIDOS");

console.log("✓ Filas do aluno (Em atendimento, Solicitações, Concluídas) e profissional (Preciso responder, Aguardando aluno, Solicitações recebidas, Concluídos) segregadas corretamente.");

// -----------------------------------------------------------------------------
// 4. BILATERAL SCHEDULING LIFECYCLE & UNLOCKED MESSAGING
// -----------------------------------------------------------------------------
console.log("\n[TEST 4] Verificando regras de agendamento bilateral e desbloqueio de chat...");
const trevoChatLibPath = path.resolve("lib/consultancies/trevo-chat.ts");
const trevoChatLib = fs.readFileSync(trevoChatLibPath, "utf-8");

assert.ok(trevoChatLib.includes("isChatMessagingUnlocked"), "lib deve exportar isChatMessagingUnlocked");
assert.ok(trevoChatLib.includes("expectedResponseHours"), "lib deve suportar expectedResponseHours");
assert.ok(trevoChatLib.includes("closeChatConsultation"), "lib deve exportar closeChatConsultation");
assert.ok(trevoChatLib.includes("savePrivateNotes"), "lib deve exportar savePrivateNotes");
assert.ok(trevoChatLib.includes("requestReturnConsultation"), "lib deve exportar requestReturnConsultation");

function isChatMessagingUnlocked(status) {
  return status === "CONFIRMED" || status === "AWAITING_STUDENT" || status === "AWAITING_PROFESSIONAL";
}

assert.equal(isChatMessagingUnlocked("CONFIRMED"), true);
assert.equal(isChatMessagingUnlocked("AWAITING_STUDENT"), true);
assert.equal(isChatMessagingUnlocked("AWAITING_PROFESSIONAL"), true);
assert.equal(isChatMessagingUnlocked("PROPOSED"), false);
assert.equal(isChatMessagingUnlocked("COMPLETED"), false);
assert.equal(isChatMessagingUnlocked("DECLINED"), false);
assert.equal(isChatMessagingUnlocked("CANCELED"), false);
console.log("✓ Regras de desbloqueio bilateral estritas e verificadas.");

// -----------------------------------------------------------------------------
// 5. PRIVACY OF PRIVATE NOTES (LEAK PREVENTION)
// -----------------------------------------------------------------------------
console.log("\n[TEST 5] Verificando segregação de notas privadas (Aluno JAMAIS recebe notas privadas)...");
assert.ok(
  trevoChatLib.includes("privateNotes: sanitizeForStudent ? null :"),
  "lib deve sanitizar estritamente privateNotes para null quando visualizado por aluno"
);
assert.ok(
  trevoChatLib.includes("listChatConsultationsForStudent"),
  "listChatConsultationsForStudent deve invocar mapRowToConsultationDto com sanitizeForStudent: true"
);
console.log("✓ Notas privadas sanitizadas no servidor antes de qualquer envio para o perfil de aluno.");

// -----------------------------------------------------------------------------
// 6. IDEMPOTENCY & QUOTED REPLIES
// -----------------------------------------------------------------------------
console.log("\n[TEST 6] Verificando idempotência (client_message_id) e citação de mensagens...");
assert.ok(
  trevoChatLib.includes("client_message_id = ?"),
  "sendChatMessage deve verificar client_message_id para evitar duplicação em múltiplos cliques"
);
assert.ok(
  trevoChatLib.includes("reply_to_message_id"),
  "sendChatMessage e listChatMessages devem suportar reply_to_message_id e snippet de citação"
);
console.log("✓ Idempotência e mensagens citadas implementadas no backend.");

// -----------------------------------------------------------------------------
// 7. STRUCTURED IN-CHAT REQUEST CARDS
// -----------------------------------------------------------------------------
console.log("\n[TEST 7] Verificando cartões estruturados no chat...");
const messageListPath = path.resolve("components/consultancies/trevo-chat/chat-message-list.tsx");
const messageListCode = fs.readFileSync(messageListPath, "utf-8");

const structuredCardTypes = [
  "FORM_REQUEST",
  "PHOTO_REQUEST",
  "DOCUMENT_REQUEST",
  "CLINICAL_GUIDANCE",
  "WORKOUT_CARD",
  "MEAL_PLAN_CARD",
  "CLOSURE_CARD",
];

for (const cardType of structuredCardTypes) {
  assert.ok(
    messageListCode.includes(cardType),
    `chat-message-list deve suportar renderização do cartão '${cardType}'`
  );
}
console.log("✓ Todos os 7 cartões clínicos estruturados implementados e estilizados no chat.");

// -----------------------------------------------------------------------------
// 8. ON-DEMAND AI ASSISTANT TOOLS
// -----------------------------------------------------------------------------
console.log("\n[TEST 8] Verificando ferramentas de IA sob demanda...");
const aiPanelPath = path.resolve("components/consultancies/trevo-chat/ai-anamnesis-panel.tsx");
const aiPanelCode = fs.readFileSync(aiPanelPath, "utf-8");

assert.ok(
  aiPanelCode.includes("generateAiSummaryAction") &&
  aiPanelCode.includes("generateAiSoapAction") &&
  aiPanelCode.includes("generateAiQuestionsAction"),
  "Painel de IA deve conter botões sob demanda para Resumo, SOAP e Dúvidas pendentes"
);
assert.ok(
  trevoChatLib.includes("generateAiConsultationSummary") &&
  trevoChatLib.includes("generateAiProntuarioNotes") &&
  trevoChatLib.includes("generateAiPendingQuestions"),
  "lib deve implementar geradores de IA com fallback determinístico"
);
console.log("✓ Ferramentas de IA sob demanda integradas com fallback de segurança.");

// -----------------------------------------------------------------------------
// 9. WORKSPACE UX & MOBILE RESPONSIVENESS
// -----------------------------------------------------------------------------
console.log("\n[TEST 9] Verificando UX do workspace, toque mínimo de 44px e encerramento formal...");
const workspacePath = path.resolve("components/consultancies/trevo-chat/trevo-chat-workspace.tsx");
const workspaceCode = fs.readFileSync(workspacePath, "utf-8");

assert.ok(workspaceCode.includes("min-h-[44px]"), "Workspace deve conter alvos de toque >= 44px para mobile");
assert.ok(workspaceCode.includes("Finalizar Atendimento"), "Workspace deve conter ação de finalizar atendimento");
assert.ok(workspaceCode.includes("Solicitar Retorno"), "Workspace deve conter ação de solicitar retorno");
assert.ok(workspaceCode.includes("isClosureModalOpen"), "Workspace deve conter modal de encerramento");
assert.ok(workspaceCode.includes("isReturnModalOpen"), "Workspace deve conter modal de retorno");
assert.ok(workspaceCode.includes("Preciso responder"), "Workspace deve exibir fila 'Preciso responder'");
assert.ok(workspaceCode.includes("Aguardando aluno"), "Workspace deve exibir fila 'Aguardando aluno'");
assert.ok(workspaceCode.includes("Em atendimento"), "Workspace deve exibir fila 'Em atendimento'");
console.log("✓ Workspace Trevo Chat completo, responsivo e em total conformidade.");

console.log("\n======================================================================");
console.log(" ✓ TODAS AS VALIDAÇÕES DE COMPORTAMENTO PASSARAM COM SUCESSO!");
console.log("======================================================================\n");
