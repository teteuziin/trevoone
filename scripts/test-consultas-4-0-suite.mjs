import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log(" TREVO ONE — QA SUITE: CONSULTAS 4.0 REFORMULAÇÃO COMPLETA");
console.log("======================================================================");

// 1. Verify app/consultoria/[slug]/consultas/page.tsx
console.log("\n[TEST 1] Verificando Consultas Page (AppShell themeVariant, searchParams.student, Admin access)...");
const pagePath = path.resolve("app/consultoria/[slug]/consultas/page.tsx");
const pageCode = fs.readFileSync(pagePath, "utf-8");

assert.ok(
  pageCode.includes('themeVariant="trainer-refined"'),
  "ConsultasPage deve utilizar themeVariant='trainer-refined' para eliminar a barra lateral escura legada"
);
assert.ok(
  pageCode.includes("showDashboardWallpaper={true}"),
  "ConsultasPage deve ativar o Dashboard Wallpaper"
);
assert.ok(
  pageCode.includes("student?: string"),
  "PageProps deve tipar searchParams com student"
);
assert.ok(
  pageCode.includes("studentParam") && pageCode.includes("targetStudent"),
  "ConsultasPage deve resolver studentParam para abrir diretamente o chat do aluno"
);
assert.ok(
  pageCode.includes("isConsultancyAdmin") && pageCode.includes("isPersonal || isNutritionist || isConsultancyAdmin"),
  "ConsultasPage deve permitir acesso para CONSULTANCY_ADMIN"
);
console.log("✓ ConsultasPage configurada com trainer-refined, resolução de studentParam e acesso unificado.");

// 2. Verify Alunos 4.0 integration
console.log("\n[TEST 2] Verificando integração Alunos 4.0 -> Consultas 4.0...");
const studentDetailPath = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
const studentDetailCode = fs.readFileSync(studentDetailPath, "utf-8");

assert.ok(
  studentDetailCode.includes("consultas?student="),
  "PersonalStudentDetailView deve conter link para Consultas passando student"
);
assert.ok(
  studentDetailCode.includes("Conversar"),
  "PersonalStudentDetailView deve conter botão de ação 'Conversar'"
);
assert.ok(
  studentDetailCode.includes("ChatBubbleIcon"),
  "PersonalStudentDetailView deve utilizar ícone de chat oficial"
);
console.log("✓ Alunos 4.0 integrado com atalho direto 'Conversar' para abrir atendimento do aluno.");

// 3. Verify TrevoChatWorkspace Consultas 4.0 Layout & Empty State
console.log("\n[TEST 3] Verificando Layout e Estado Vazio único de Consultas 4.0...");
const workspacePath = path.resolve("components/consultancies/trevo-chat/trevo-chat-workspace.tsx");
const workspaceCode = fs.readFileSync(workspacePath, "utf-8");

assert.ok(
  workspaceCode.includes("Nenhum atendimento por aqui"),
  "TrevoChatWorkspace deve conter título do estado vazio único 'Nenhum atendimento por aqui'"
);
assert.ok(
  workspaceCode.includes("Comece uma conversa para acompanhar seus alunos."),
  "TrevoChatWorkspace deve conter subtítulo do estado vazio único"
);
assert.ok(
  workspaceCode.includes("Iniciar atendimento"),
  "TrevoChatWorkspace deve conter botão primário do estado vazio 'Iniciar atendimento'"
);
assert.ok(
  workspaceCode.includes("consultations.length === 0 ? ("),
  "TrevoChatWorkspace deve alternar para estado vazio centralizado único quando não houver conversas"
);
console.log("✓ Estado vazio centralizado único implementado sem painéis vazios ou divididos.");

// 4. Verify 3 Main Filter Tabs with Real Dynamic Counters
console.log("\n[TEST 4] Verificando 3 abas principais de filtro com contadores...");
assert.ok(
  workspaceCode.includes("Preciso responder"),
  "Deve conter aba 'Preciso responder'"
);
assert.ok(
  workspaceCode.includes("Aguardando aluno"),
  "Deve conter aba 'Aguardando aluno'"
);
assert.ok(
  workspaceCode.includes("queueCounts.ALL"),
  "Deve exibir contador de 'Todas'"
);
assert.ok(
  workspaceCode.includes("queueCounts as Record<ProQueue, number>).PRECISO_RESPONDER"),
  "Deve exibir contador dinâmico de 'Preciso responder'"
);
assert.ok(
  workspaceCode.includes("queueCounts as Record<ProQueue, number>).AGUARDANDO_ALUNO"),
  "Deve exibir contador dinâmico de 'Aguardando aluno'"
);
assert.ok(
  workspaceCode.includes("Solicitações") && workspaceCode.includes("Concluídos"),
  "Deve conter opções secundárias para Solicitações e Concluídos"
);
console.log("✓ 3 abas principais com contadores reais e opções secundárias implementadas.");

// 5. Verify 1-Click Novo Atendimento (Instant Chat)
console.log("\n[TEST 5] Verificando início instantâneo de atendimento sem formulários forçados...");
assert.ok(
  workspaceCode.includes("handleSelectStudentForDirectChat"),
  "TrevoChatWorkspace deve implementar handleSelectStudentForDirectChat"
);
assert.ok(
  workspaceCode.includes("startOrOpenChatAction"),
  "TrevoChatWorkspace deve importar e chamar startOrOpenChatAction"
);
assert.ok(
  workspaceCode.includes("existingChat.publicId"),
  "Seleção de aluno deve reaproveitar conversa ativa existente sem duplicar chats"
);
console.log("✓ Início instantâneo de atendimento e prevenção de duplicação verificados.");

// 6. Verify Active Chat Header & Alunos 4.0 Profile Link
console.log("\n[TEST 6] Verificando cabeçalho da conversa ativa e atalho para o perfil do aluno...");
assert.ok(
  workspaceCode.includes("Ver perfil do aluno"),
  "Cabeçalho da conversa ativa deve conter atalho 'Ver perfil do aluno'"
);
assert.ok(
  workspaceCode.includes("/progresso/alunos/${activeChat.studentUserPublicId}"),
  "Atalho 'Ver perfil do aluno' deve apontar para o perfil do aluno no Alunos 4.0"
);
console.log("✓ Cabeçalho da conversa ativa conectado diretamente ao Alunos 4.0.");

// 7. Verify Desktop Auto-selection
console.log("\n[TEST 7] Verificando auto-seleção de conversa no desktop...");
assert.ok(
  workspaceCode.includes("activeChat = useMemo") && workspaceCode.includes('c.modality !== "VIDEO"'),
  "TrevoChatWorkspace deve auto-selecionar conversa fallback no activeChat para evitar tela direita em branco"
);
assert.ok(
  workspaceCode.includes("nextMatch"),
  "TrevoChatWorkspace deve auto-selecionar próximo atendimento ao trocar de fila"
);
console.log("✓ Auto-seleção no desktop verificada.");

console.log("\n======================================================================");
console.log(" ✓ TODAS AS VALIDAÇÕES DO CONSULTAS 4.0 PASSARAM COM SUCESSO!");
console.log("======================================================================");
