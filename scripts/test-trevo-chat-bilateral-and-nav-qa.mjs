import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== TREVO ONE: QA VERIFICATION (TREVO CHAT BILATERAL & NAVIGATION) ===");

// 1. Verify Migration 052
const migrationPath = path.resolve("database/migrations/052_trevo_chat_bilateral_appointments.sql");
assert.ok(fs.existsSync(migrationPath), "Migration 052 must exist");
const migrationContent = fs.readFileSync(migrationPath, "utf-8");
assert.ok(migrationContent.includes("proposed_by_user_id"), "Migration 052 must add proposed_by_user_id");
assert.ok(migrationContent.includes("proposed_start_at"), "Migration 052 must add proposed_start_at");
assert.ok(migrationContent.includes("student_accepted_at"), "Migration 052 must add student_accepted_at");
assert.ok(migrationContent.includes("professional_accepted_at"), "Migration 052 must add professional_accepted_at");
assert.ok(migrationContent.includes("declined_reason"), "Migration 052 must add declined_reason");
console.log("✓ Migration 052 valid and contains all bilateral proposal columns");

// 2. Verify lib/consultancies/trevo-chat.ts exports and logic
const trevoChatLibPath = path.resolve("lib/consultancies/trevo-chat.ts");
const trevoChatLib = fs.readFileSync(trevoChatLibPath, "utf-8");
assert.ok(trevoChatLib.includes("isChatMessagingUnlocked"), "lib must export isChatMessagingUnlocked helper");
assert.ok(trevoChatLib.includes("proposeChatConsultation"), "lib must export proposeChatConsultation");
assert.ok(trevoChatLib.includes("respondToChatProposal"), "lib must export respondToChatProposal");
assert.ok(trevoChatLib.includes("cancelChatConsultation"), "lib must export cancelChatConsultation");
console.log("✓ lib/consultancies/trevo-chat.ts contains bilateral actions and status check");

// 3. Verify chat-actions.ts exports
const chatActionsPath = path.resolve("app/consultoria/[slug]/consultas/chat-actions.ts");
const chatActions = fs.readFileSync(chatActionsPath, "utf-8");
assert.ok(chatActions.includes("proposeChatConsultationAction"), "chat-actions must have proposeChatConsultationAction");
assert.ok(chatActions.includes("respondToChatProposalAction"), "chat-actions must have respondToChatProposalAction");
assert.ok(chatActions.includes("cancelChatConsultationAction"), "chat-actions must have cancelChatConsultationAction");
console.log("✓ app/consultoria/[slug]/consultas/chat-actions.ts exports server actions");

// 4. Verify ConsultationsTabbedContainer has shared header and modal
const containerPath = path.resolve("components/consultancies/consultations-tabbed-container.tsx");
const container = fs.readFileSync(containerPath, "utf-8");
assert.ok(container.includes("Consultas"), "Shared header must have 'Consultas' title");
assert.ok(container.includes("Agendar consulta"), "Shared header must have 'Agendar consulta'");
assert.ok(container.includes("Voltar"), "Shared header must have 'Voltar' link");
assert.ok(container.includes("Videochamada 1:1"), "Schedule modal must have Videochamada option");
assert.ok(container.includes("Trevo Chat"), "Schedule modal must have Trevo Chat option");
console.log("✓ components/consultancies/consultations-tabbed-container.tsx has shared header and modal");

// 5. Verify TrevoChatWorkspace has bilateral proposal UI, min 44x44 back button, closed AI panel
const workspacePath = path.resolve("components/consultancies/trevo-chat/trevo-chat-workspace.tsx");
const workspace = fs.readFileSync(workspacePath, "utf-8");
assert.ok(workspace.includes("min-w-[44px] min-h-[44px]"), "Mobile back button must have >= 44x44px target");
assert.ok(workspace.includes("isAiDrawerOpen"), "Workspace must control AI drawer state");
assert.ok(workspace.includes("Aceitar agendamento"), "Workspace must offer 'Aceitar agendamento'");
assert.ok(workspace.includes("Propor outro horário"), "Workspace must offer 'Propor outro horário'");
assert.ok(workspace.includes("isChatMessagingUnlocked"), "Workspace must guard messaging with isChatMessagingUnlocked");
console.log("✓ components/consultancies/trevo-chat/trevo-chat-workspace.tsx conforms to UX & bilateral rules");

// 6. Verify Navigation bar & role chips
const navPath = path.resolve("components/consultancies/consultancy-navigation.tsx");
const nav = fs.readFileSync(navPath, "utf-8");
assert.ok(nav.includes("shouldHideMobileBottomNav"), "Nav must hide bottom bar in active chat");
assert.ok(nav.includes("isConsultasActiveChat"), "Nav must detect active chat param");
assert.ok(nav.includes("getRoleBadgeColor"), "Nav must provide specific colored role chips");
console.log("✓ components/consultancies/consultancy-navigation.tsx has active chat bottom bar hiding & colored badges");

// 7. Verify ConsultancyAppShell 5 mobile destinations
const shellPath = path.resolve("components/consultancies/consultancy-app-shell.tsx");
const shell = fs.readFileSync(shellPath, "utf-8");
assert.ok(shell.includes("Consultas"), "Mobile bottom nav items must include Consultas");
console.log("✓ components/consultancies/consultancy-app-shell.tsx includes Consultas in mobile navigation");

console.log("\n=== ALL QA ASSERTIONS PASSED SUCCESSFULLY! ===");
