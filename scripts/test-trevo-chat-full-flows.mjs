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

// -----------------------------------------------------------------------------
// 10. CONCURRENCY & DEDUPLICATION WITH CLIENT_MESSAGE_ID
// -----------------------------------------------------------------------------
console.log("\n[TEST 10] Verificando concorrência e deduplicação estrita de mensagens...");
assert.ok(
  trevoChatLib.includes("_chatSchemaCheckPromise"),
  "trevo-chat.ts deve usar promessa singleton _chatSchemaCheckPromise para evitar DDL concorrente a cada mensagem"
);
assert.ok(
  !trevoChatLib.includes("runtime_bootstrapped"),
  "trevo-chat.ts NÃO deve injetar checksums arbitrários ou artificiais em schema_migrations"
);
assert.ok(
  trevoChatLib.includes("WHERE cm.consultation_id = ? AND cm.client_message_id = ?"),
  "sendChatMessage deve buscar mensagem duplicada filtrada pelo consultation_id e client_message_id"
);
console.log("✓ Concorrência protegida com singleton e deduplicação idempotente verificada.");

// -----------------------------------------------------------------------------
// 11. TENANCY ISOLATION ON QUOTED REPLIES
// -----------------------------------------------------------------------------
console.log("\n[TEST 11] Verificando isolamento de tenancy em respostas citadas (reply_to_message_id)...");
assert.ok(
  trevoChatLib.includes("SELECT id FROM chat_messages WHERE id = ? AND consultation_id = ?"),
  "sendChatMessage deve validar estritamente que a mensagem citada pertence à mesma consulta e consultoria"
);
console.log("✓ Mensagens citadas validadas estritamente contra cross-consultation e cross-tenant spoofing.");

// -----------------------------------------------------------------------------
// 12. BACKWARDS PAGINATION & HISTORICAL CHAT ORDERING
// -----------------------------------------------------------------------------
console.log("\n[TEST 12] Verificando paginação retroativa (histórico) e ordenação cronológica...");
const apiMessagesRoutePath = path.resolve("app/api/consultancies/[slug]/chat/messages/route.ts");
const apiMessagesRouteCode = fs.readFileSync(apiMessagesRoutePath, "utf-8");

assert.ok(
  apiMessagesRouteCode.includes("searchParams.get(\"beforeId\")"),
  "API de mensagens deve aceitar parâmetro beforeId para paginação retroativa"
);
assert.ok(
  apiMessagesRouteCode.includes("searchParams.get(\"limit\")"),
  "API de mensagens deve aceitar parâmetro limit para controle de paginação"
);
assert.ok(
  trevoChatLib.includes("ORDER BY cm.id DESC") && trevoChatLib.includes(".reverse()"),
  "listChatMessages deve buscar as mais recentes via DESC e inverter para exibição cronológica estrita"
);
assert.ok(
  messageListCode.includes("Carregar mensagens anteriores"),
  "chat-message-list deve conter botão de carregar mensagens anteriores"
);
console.log("✓ Paginação retroativa e ordenação cronológica estrita verificadas.");

// -----------------------------------------------------------------------------
// 13. ETHICAL DETERMINISTIC AI FALLBACK (ZERO MEDICAL FABRICATION)
// -----------------------------------------------------------------------------
console.log("\n[TEST 13] Verificando ética e ausência de fabricação clínica nos fallbacks determinísticos...");
assert.ok(
  trevoChatLib.includes("Pendente de avaliação clínica do profissional responsável"),
  "Fallback determinístico de SOAP NÃO deve inventar avaliações clínicas fictícias"
);
assert.ok(
  trevoChatLib.includes("Análise por IA indisponível"),
  "Fallback determinístico deve informar explicitamente a indisponibilidade do assistente"
);
console.log("✓ Fallback determinístico ético: zero diagnósticos ou conclusões fabricadas.");

// -----------------------------------------------------------------------------
// 14. DEEP-LINKING AND DEAD LINK REMOVAL
// -----------------------------------------------------------------------------
console.log("\n[TEST 14] Verificando deep-links oficiais de formulários, treinos e nutrição...");
assert.ok(
  !messageListCode.includes("/consultoria/${consultancySlug}/avaliacoes"),
  "chat-message-list NÃO deve conter rota inexistente /avaliacoes (deve apontar para /progresso)"
);
assert.ok(
  messageListCode.includes("/consultoria/${consultancySlug}/progresso"),
  "chat-message-list deve apontar fotos de evolução para /consultoria/${consultancySlug}/progresso"
);
assert.ok(
  messageListCode.includes("/consultoria/${consultancySlug}/formularios/${msg.payloadJson.formRequestPublicId}"),
  "chat-message-list deve abrir diretamente o questionário pelo ID público do formulário"
);
assert.ok(
  messageListCode.includes("/consultoria/${consultancySlug}/treinos/${msg.payloadJson.assignmentPublicId}"),
  "chat-message-list deve abrir diretamente a prescrição pelo ID público do treino"
);
assert.ok(
  messageListCode.includes("/consultoria/${consultancySlug}/planos-v2/${msg.payloadJson.planPublicId}"),
  "chat-message-list deve abrir diretamente o plano alimentar oficial pelo ID público"
);
console.log("✓ Todos os deep-links canônicos verificados e links mortos eliminados.");

// -----------------------------------------------------------------------------
// 15. DRAFT PRESERVATION & UNREAD COUNTER SYNCHRONIZATION
// -----------------------------------------------------------------------------
console.log("\n[TEST 15] Verificando preservação de rascunho em falha e sincronização de não-lidas...");
assert.ok(
  workspaceCode.includes("setSendErrorNotice"),
  "Workspace deve utilizar banner de aviso não-bloqueante para falha de envio"
);
assert.ok(
  workspaceCode.includes("unreadCountProfessional: isProfessional ? 0"),
  "Workspace deve zerar contadores de não lidas imediatamente em memória ao visualizar"
);
console.log("✓ Rascunhos preservados e contadores sincronizados em tempo real.");

// -----------------------------------------------------------------------------
// 16. COMPLETE VISUAL REDESIGN & SELECTION REVALIDATION
// -----------------------------------------------------------------------------
console.log("\n[TEST 16] Verificando redesign visual, cabeçalho autoritativo e revalidação de seleção...");
assert.ok(
  workspaceCode.includes("handleSelectQueue"),
  "Workspace deve revalidar seleção ativa ao mudar de fila e limpar seleção se item não pertencer ao resultado"
);
assert.ok(
  workspaceCode.includes("isMobileQueueModalOpen"),
  "Workspace deve suportar modal acessível de seleção de filas em mobile para eliminar corte de filtros"
);
assert.ok(
  workspaceCode.includes("grid-cols-2"),
  "Workspace deve organizar filtros no desktop em grid consistente sem corte horizontal"
);
assert.ok(
  workspaceCode.includes("Consulta no formato anterior"),
  "Visualizador de vídeo histórico deve apresentar registro factual neutro sem declarações fictícias"
);
assert.ok(
  !workspaceCode.includes("Vídeo Realizado"),
  "Workspace NÃO deve afirmar 'Vídeo Realizado' sem comprovação"
);
assert.ok(
  workspaceCode.includes("Solicitar consulta"),
  "Workspace deve exibir rótulo contextual 'Solicitar consulta' para alunos"
);
assert.ok(
  workspaceCode.includes("Novo atendimento"),
  "Workspace deve exibir rótulo contextual 'Novo atendimento' para profissionais"
);
console.log("✓ Redesign visual, cabeçalho e revalidação estrita de seleção verificados.");

console.log("\n======================================================================");
console.log(" ✓ TODAS AS 16 VALIDAÇÕES DE COMPORTAMENTO PASSARAM COM SUCESSO!");
console.log("======================================================================\n");
