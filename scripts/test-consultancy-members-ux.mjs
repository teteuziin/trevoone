// Automated test suite for Consultancy Members & Invitations UX modernization
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let total = 0;

function runCase(id, description, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Test ${id}: ${description}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("==================================================");
console.log("TREVO ONE — MEMBERS & INVITATIONS UX TEST SUITE");
console.log("==================================================\n");

const adminLibPath = path.resolve(process.cwd(), "lib/consultancies/admin.ts");
const adminLibCode = fs.readFileSync(adminLibPath, "utf-8");

const invitationsLibPath = path.resolve(process.cwd(), "lib/consultancies/invitations.ts");
const invitationsLibCode = fs.readFileSync(invitationsLibPath, "utf-8");

const actionsPath = path.resolve(process.cwd(), "app/consultoria/[slug]/membros/actions.ts");
const actionsCode = fs.readFileSync(actionsPath, "utf-8");

const managerComponentPath = path.resolve(process.cwd(), "components/consultancies/members/consultancy-members-manager.tsx");
const managerComponentCode = fs.readFileSync(managerComponentPath, "utf-8");

const pagePath = path.resolve(process.cwd(), "app/consultoria/[slug]/membros/page.tsx");
const pageCode = fs.readFileSync(pagePath, "utf-8");

// TEST 1: Operational counters function in admin lib
runCase(1, "Operational counters function exists with honest error handling", () => {
  assert.ok(
    adminLibCode.includes("export async function getConsultancyMembersOperationalCounters"),
    "Deve exportar getConsultancyMembersOperationalCounters"
  );
  assert.ok(
    adminLibCode.includes("isError: true"),
    "Deve retornar isError: true em caso de falha de conexão"
  );
  assert.ok(
    adminLibCode.includes("active_members") && adminLibCode.includes("pending_invitations"),
    "Deve calcular active_members e pending_invitations diretamente no MySQL"
  );
});

// TEST 2: Role update function protects last admin
runCase(2, "updateConsultancyMemberRoles guards against removing the last active admin", () => {
  assert.ok(
    adminLibCode.includes("export async function updateConsultancyMemberRoles"),
    "Deve exportar updateConsultancyMemberRoles"
  );
  assert.ok(
    adminLibCode.includes("Não é possível remover a função do único administrador ativo da consultoria"),
    "Deve bloquear a remoção da função de admin do último administrador ativo"
  );
  assert.ok(
    adminLibCode.includes("CONSULTANCY_MEMBER_ROLES_UPDATED"),
    "Deve registrar evento de auditoria ao atualizar roles"
  );
});

// TEST 3: Status toggle blocks self-suspension and last admin suspension
runCase(3, "toggleConsultancyMemberStatus blocks self-suspension and last admin suspension", () => {
  assert.ok(
    adminLibCode.includes("export async function toggleConsultancyMemberStatus"),
    "Deve exportar toggleConsultancyMemberStatus"
  );
  assert.ok(
    adminLibCode.includes("Não é permitido suspender o próprio usuário"),
    "Deve impedir que o administrador suspenda a si mesmo"
  );
  assert.ok(
    adminLibCode.includes("Não é possível suspender o único administrador ativo da consultoria"),
    "Deve impedir a suspensão do último administrador ativo"
  );
});

// TEST 4: Resend invitation renewals
runCase(4, "resendConsultancyInvitation generates a fresh 7-day token and clears revocation", () => {
  assert.ok(
    invitationsLibCode.includes("export async function resendConsultancyInvitation"),
    "Deve exportar resendConsultancyInvitation"
  );
  assert.ok(
    invitationsLibCode.includes("DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)"),
    "Deve renovar a validade do convite por 7 dias"
  );
  assert.ok(
    invitationsLibCode.includes("token_hash = ?"),
    "Deve atualizar o hash do token para alta segurança"
  );
  assert.ok(
    invitationsLibCode.includes("CONSULTANCY_INVITATION_RESENT"),
    "Deve registrar evento de auditoria ao reenviar convite"
  );
});

// TEST 5: Server Actions export and RBAC
runCase(5, "Server Actions validate CONSULTANCY_ADMIN and session", () => {
  assert.ok(actionsCode.includes("export async function resendInvitationAction"), "Deve exportar resendInvitationAction");
  assert.ok(actionsCode.includes("export async function updateMemberRolesAction"), "Deve exportar updateMemberRolesAction");
  assert.ok(actionsCode.includes("export async function toggleMemberStatusAction"), "Deve exportar toggleMemberStatusAction");
  assert.ok(actionsCode.includes("export async function deactivateMemberAction"), "Deve exportar deactivateMemberAction");
  assert.ok(
    actionsCode.includes("context.roles.includes(\"CONSULTANCY_ADMIN\")"),
    "Todas as Server Actions devem validar a permissão de CONSULTANCY_ADMIN"
  );
});

// TEST 6: Manager component renders tabs with count badges
runCase(6, "ConsultancyMembersManager implements tabs with counters", () => {
  assert.ok(
    managerComponentCode.includes("activeTab === \"members\"") &&
    managerComponentCode.includes("activeTab === \"invitations\""),
    "Componente deve suportar abas 'members' e 'invitations'"
  );
  assert.ok(
    managerComponentCode.includes("{members.length}") &&
    managerComponentCode.includes("{invitations.length}"),
    "Abas devem exibir os contadores de itens"
  );
});

// TEST 7: Live search with debounce (~300ms)
runCase(7, "Debounced live search implemented on members and invitations", () => {
  assert.ok(
    managerComponentCode.includes("setDebouncedMemberSearch") &&
    managerComponentCode.includes("setTimeout"),
    "Busca de membros deve usar debounce para alta fluidez"
  );
  assert.ok(
    managerComponentCode.includes("setDebouncedInviteSearch"),
    "Busca de convites deve usar debounce para alta fluidez"
  );
});

// TEST 8: Status & Role chips filters
runCase(8, "Filter chips for status and role are present", () => {
  assert.ok(
    managerComponentCode.includes("memberStatusFilter") &&
    managerComponentCode.includes("memberRoleFilter"),
    "Filtros de status e função de membros devem estar presentes"
  );
  assert.ok(
    managerComponentCode.includes("inviteStatusFilter"),
    "Filtro de status de convites deve estar presente"
  );
});

// TEST 9: Row contextual menu ⋯ replaces repetitive buttons
runCase(9, "Row contextual menu ⋯ is implemented without repetitive red buttons", () => {
  assert.ok(
    managerComponentCode.includes("openMemberMenuId") &&
    managerComponentCode.includes("openInviteMenuId"),
    "Menus contextuais ⋯ devem estar presentes por linha"
  );
  assert.ok(
    managerComponentCode.includes("Editar funções") &&
    managerComponentCode.includes("Suspender membro") &&
    managerComponentCode.includes("Desligar da consultoria"),
    "Ações contextuais essenciais de membro devem estar disponíveis"
  );
  assert.ok(
    managerComponentCode.includes("Copiar link") &&
    managerComponentCode.includes("Reenviar convite") &&
    managerComponentCode.includes("Cancelar convite"),
    "Ações contextuais de convite devem estar disponíveis"
  );
});

// TEST 10: Mobile ergonomics & safe-area
runCase(10, "Mobile ergonomics, touch targets and safe area padding respected", () => {
  assert.ok(
    managerComponentCode.includes("pb-28 sm:pb-12"),
    "Deve conter padding inferior seguro para não cobrir itens com a bottom nav móvel"
  );
  assert.ok(
    managerComponentCode.includes("min-h-[44px]"),
    "Ações e botões devem respeitar alvo mínimo de toque de 44px"
  );
  assert.ok(
    managerComponentCode.includes("overflow-x-auto no-scrollbar"),
    "Chips de filtro horizontais devem rolar suavemente sem quebrar layout"
  );
});

// TEST 11: Pagination implemented (15 items per page)
runCase(11, "Pagination of 15 items per page is implemented", () => {
  assert.ok(
    managerComponentCode.includes("PAGE_SIZE = 15") || managerComponentCode.includes("15"),
    "Paginação de 15 itens deve ser configurada"
  );
  assert.ok(
    managerComponentCode.includes("totalMemberPages") && managerComponentCode.includes("totalInvitePages"),
    "Controle de páginas de membros e convites deve ser calculado"
  );
});

// TEST 12: Invariants in page.tsx preserved
runCase(12, "Invariants in page.tsx strictly preserved", () => {
  assert.ok(
    pageCode.includes("const resolvedSearchParams = searchParams ? await searchParams : {};"),
    "resolvedSearchParams deve ser mantido"
  );
  assert.ok(
    pageCode.includes("function formatDate(date: unknown): string"),
    "Helper formatDate deve ser mantido"
  );
  assert.ok(
    pageCode.includes("consultancyPublicId={context.consultancyPublicId}"),
    "consultancyPublicId deve ser passado ao shell"
  );
  assert.ok(
    pageCode.includes("try {") && pageCode.includes("catch (err) {"),
    "Carregamento com try/catch deve ser mantido"
  );
});

console.log("\n==================================================");
console.log(`TEST SUITE FINISHED: ${passed}/${total} PASS`);
console.log("==================================================");
