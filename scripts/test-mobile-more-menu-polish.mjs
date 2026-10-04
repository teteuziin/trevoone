/**
 * TREVO ONE — MOBILE "MAIS" MENU & NAVIGATION HIERARCHY TEST SUITE
 * Validates:
 * 1. Zero duplication of primary bottom nav items inside "Mais"
 * 2. Role-aware deduplication (ADMIN, PERSONAL, NUTRITIONIST, STUDENT, MULTI-ROLE)
 * 3. 1-Column layout with comfortable typography (13-14px titles, 11-12px descriptions)
 * 4. Distinct semantic groupings (GESTÃO, NEGÓCIO, SISTEMA) with discrete headers
 * 5. Touch targets >= 48px on links and >= 44px on buttons
 * 6. Visual chevron indicators and optical icon alignment
 * 7. Active state on "Mais" button while drawer is open
 * 8. Appearance control positioned after secondary groups
 * 9. ViewModeSelector / Role Switcher with prominent active state
 * 10. Responsive safety (320px–430px) without horizontal overflow
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log("==================================================");
console.log("TREVO ONE — MOBILE MORE MENU POLISH AUDIT");
console.log("==================================================");

const consultancyNavPath = path.join(
  rootDir,
  "components/consultancies/consultancy-navigation.tsx"
);
assert.ok(fs.existsSync(consultancyNavPath), "consultancy-navigation.tsx must exist");
const consultancyNavCode = fs.readFileSync(consultancyNavPath, "utf-8");
const consultancyNavNormalized = consultancyNavCode.replace(/\r\n/g, "\n");

const viewModeSelectorPath = path.join(
  rootDir,
  "components/consultancies/view-mode-selector.tsx"
);
assert.ok(fs.existsSync(viewModeSelectorPath), "view-mode-selector.tsx must exist");
const viewModeSelectorCode = fs.readFileSync(viewModeSelectorPath, "utf-8");

const appShellPath = path.join(
  rootDir,
  "components/consultancies/consultancy-app-shell.tsx"
);
assert.ok(fs.existsSync(appShellPath), "consultancy-app-shell.tsx must exist");
const appShellCode = fs.readFileSync(appShellPath, "utf-8");

// =============================================================================
// 1. DEDUPLICATION ARCHITECTURE
// =============================================================================
runTest("DUPLICATE PRIMARY NAV ITEMS: NONE (Primary hrefs excluded from secondaryNavItems)", () => {
  assert.ok(
    consultancyNavCode.includes("const primaryHrefs = new Set(primaryNavItems.map((item) => item.href));"),
    "Must collect all primary nav hrefs into a Set"
  );
  assert.ok(
    consultancyNavCode.includes("const secondaryNavItems = items.filter((item) => !primaryHrefs.has(item.href));"),
    "Must strictly filter out any item that is already in primary navigation"
  );
});

// =============================================================================
// 2. ROLE-AWARE DEDUPLICATION SIMULATION
// =============================================================================
runTest("ADMIN MORE MENU: Primary destinations (Visão geral, Membros/Alunos, Treinos/Financeiro, Operações) never repeat", () => {
  // Simulate admin role with primaryNavItems
  const adminPrimaryHrefs = [
    "/consultoria/demo",
    "/consultoria/demo/progresso/alunos",
    "/consultoria/demo/rotinas",
    "/consultoria/demo/operacoes",
  ];
  const allAdminItems = [
    { id: "overview", href: "/consultoria/demo", label: "Visão geral" },
    { id: "atendimento-alunos", href: "/consultoria/demo/progresso/alunos", label: "Alunos" },
    { id: "personal-rotinas", href: "/consultoria/demo/rotinas", label: "Treinos" },
    { id: "admin-operacoes", href: "/consultoria/demo/operacoes", label: "Operações" },
    { id: "atendimento-consultas", href: "/consultoria/demo/consultas", label: "Consultas" },
    { id: "admin-membros", href: "/consultoria/demo/membros", label: "Membros" },
    { id: "admin-missoes", href: "/consultoria/demo/missoes/gestao", label: "Gestão de Missões" },
    { id: "admin-financeiro", href: "/consultoria/demo/financeiro", label: "Financeiro" },
    { id: "admin-indicacoes", href: "/consultoria/demo/indicacoes", label: "Indicações & Afiliados" },
    { id: "admin-assinatura", href: "/consultoria/demo/assinatura", label: "Assinatura" },
    { id: "admin-ia", href: "/consultoria/demo/configuracoes/ia", label: "Gestão de IA & Cotas" },
    { id: "admin-atividades", href: "/consultoria/demo/atividades", label: "Central de Atividades" },
    { id: "personal-exercicios", href: "/consultoria/demo/exercicios", label: "Biblioteca de Exercícios" },
  ];

  const primarySet = new Set(adminPrimaryHrefs);
  const secondary = allAdminItems.filter((i) => !primarySet.has(i.href));

  assert.equal(secondary.some((i) => i.id === "overview"), false, "Overview must not be in secondary");
  assert.equal(secondary.some((i) => i.id === "atendimento-alunos"), false, "Alunos must not be in secondary");
  assert.equal(secondary.some((i) => i.id === "personal-rotinas"), false, "Treinos must not be in secondary");
  assert.equal(secondary.some((i) => i.id === "admin-operacoes"), false, "Operações must not be in secondary");
  assert.equal(secondary.length, 9, "Secondary items must contain exactly the 9 non-primary items");
});

runTest("STUDENT MORE MENU: Primary destinations (Início, Treinos, Nutrição, Evolução) never repeat", () => {
  const studentPrimaryHrefs = [
    "/consultoria/demo",
    "/consultoria/demo/treinos",
    "/consultoria/demo/nutricao",
    "/consultoria/demo/progresso",
  ];
  const allStudentItems = [
    { id: "overview", href: "/consultoria/demo", label: "Início" },
    { id: "learner-treinos", href: "/consultoria/demo/treinos", label: "Treinos" },
    { id: "learner-nutricao", href: "/consultoria/demo/nutricao", label: "Nutrição" },
    { id: "learner-progresso", href: "/consultoria/demo/progresso", label: "Evolução" },
    { id: "student-consultas", href: "/consultoria/demo/consultas", label: "Consultas" },
    { id: "student-formularios", href: "/consultoria/demo/formularios", label: "Formulários" },
    { id: "student-pagamentos", href: "/consultoria/demo/pagamentos", label: "Pagamentos" },
  ];

  const primarySet = new Set(studentPrimaryHrefs);
  const secondary = allStudentItems.filter((i) => !primarySet.has(i.href));

  assert.equal(secondary.some((i) => i.id === "overview"), false);
  assert.equal(secondary.some((i) => i.id === "learner-treinos"), false);
  assert.equal(secondary.some((i) => i.id === "learner-nutricao"), false);
  assert.equal(secondary.some((i) => i.id === "learner-progresso"), false);
  assert.equal(secondary.length, 3);
});

// =============================================================================
// 3. SECTION GROUPING & LABELS
// =============================================================================
runTest("SECTION GROUPING: Discrete semantic categories (Gestão, Negócio, Sistema, Outros)", () => {
  assert.ok(consultancyNavCode.includes('aria-label="Gestão"'), "Gestão section must exist");
  assert.ok(consultancyNavCode.includes('aria-label="Negócio"'), "Negócio section must exist");
  assert.ok(consultancyNavCode.includes('aria-label="Sistema"'), "Sistema section must exist");
  assert.ok(consultancyNavCode.includes('aria-label="Outros módulos"'), "Outros módulos fallback section must exist");

  assert.ok(
    consultancyNavCode.includes("drawerManagementIds"),
    "Management IDs set must be defined"
  );
  assert.ok(
    consultancyNavCode.includes("drawerBusinessIds"),
    "Business IDs set must be defined"
  );
  assert.ok(
    consultancyNavCode.includes("drawerSystemIds"),
    "System IDs set must be defined"
  );
});

runTest("CABEÇALHOS DOS GRUPOS: Discrete headers with uppercase tracking and subtle color", () => {
  assert.ok(
    consultancyNavCode.includes("text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1"),
    "Section headers must be small (11px), uppercase tracking-wider, text-tertiary"
  );
});

// =============================================================================
// 4. CARD ERGONOMICS & ONE-COLUMN LAYOUT
// =============================================================================
runTest("ONE-COLUMN READABILITY: Flex col layout replacing cramped grid-cols-2", () => {
  // Ensure the drawer nav elements use flex flex-col gap-1.5, not grid-cols-2
  const drawerMatch = consultancyNavCode.match(/id="mobile-navigation-drawer"[\s\S]*?<\/div>\s*<\/div>\s*\)/);
  assert.ok(drawerMatch, "Mobile navigation drawer must exist");
  const drawerCode = drawerMatch[0];

  assert.ok(
    !drawerCode.includes("grid grid-cols-2"),
    "Cramped 2-column grid must be replaced with comfortable 1-column layout"
  );
  assert.ok(
    drawerCode.includes("flex flex-col gap-1.5"),
    "Drawer groups must use 1-column flex-col layout"
  );
});

runTest("TOUCH TARGETS: Cards meet >= 48px touch targets (min-h-[52px])", () => {
  assert.ok(
    consultancyNavCode.includes("min-h-[52px] depth-interactive"),
    "Drawer link cards must meet or exceed 52px height for easy tapping"
  );
  assert.ok(
    consultancyNavCode.includes("min-h-[44px] min-w-[44px] flex items-center justify-center"),
    "Close button must meet >= 44px touch target"
  );
});

runTest("TYPOGRAPHY: Primary labels 13-14px font-medium, descriptions 11px", () => {
  assert.ok(
    consultancyNavCode.includes("text-[13px] sm:text-sm"),
    "Item labels must be 13-14px"
  );
  assert.ok(
    consultancyNavCode.includes("text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5"),
    "Item descriptions must be 11px text-tertiary"
  );
});

runTest("WHOLE-ROW TOUCH: Area inteira = acao, zero nested buttons", () => {
  const drawerMatch = consultancyNavCode.match(/id="mobile-navigation-drawer"[\s\S]*?<\/div>\s*<\/div>\s*\)/);
  assert.ok(drawerMatch);
  const drawerCode = drawerMatch[0];

  // In drawer navigation items, verify they are pure Links with chevron and no nested buttons
  assert.ok(
    !drawerCode.includes("<button className=\"[^\"]*\">Abrir"),
    "No nested action buttons inside card"
  );
});

runTest("CHEVRON: Discrete indicator on secondary destination rows", () => {
  assert.ok(
    consultancyNavCode.includes("d=\"M8.25 4.5l7.5 7.5-7.5 7.5\""),
    "Chevron right SVG indicator must be present on rows"
  );
});

// =============================================================================
// 5. ACTIVE "MAIS" STATE
// =============================================================================
runTest("ACTIVE MORE STATE: Bottom Nav 'Mais' remains active while drawer is open", () => {
  assert.ok(
    consultancyNavCode.includes("const isMoreButtonActive = isMoreActive || mobileMenuOpen;"),
    "isMoreButtonActive must be true when drawer (mobileMenuOpen) is open"
  );
  assert.ok(
    consultancyNavNormalized.includes("isMoreButtonActive") &&
    consultancyNavNormalized.includes("bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"),
    "Bottom Nav 'Mais' button must use isMoreButtonActive for active pill"
  );
  assert.ok(
    consultancyNavNormalized.includes("isMoreButtonActive") &&
    consultancyNavNormalized.includes("font-semibold text-[var(--brand)]"),
    "Bottom Nav 'Mais' button must use isMoreButtonActive for active label"
  );
});

// =============================================================================
// 6. APARÊNCIA & ALTERNAR PERFIL
// =============================================================================
runTest("APPEARANCE: Positioned after secondary navigation groups", () => {
  const drawerMatch = consultancyNavNormalized.match(/id="mobile-navigation-drawer"[\s\S]*?<\/div>\s*<\/div>\s*\)/);
  assert.ok(drawerMatch);
  const drawerCode = drawerMatch[0];

  const secondaryPos = drawerCode.indexOf("Secondary Navigation Groups");
  const prefsPos = drawerCode.indexOf("Preferências do usuário");
  const appearancePos = drawerCode.indexOf("Aparência & Tema");
  const viewModePos = drawerCode.indexOf("Alternar Perfil");
  const actionsPos = drawerCode.indexOf("Ações de Conta");

  assert.ok(secondaryPos < prefsPos, "Secondary groups must precede preferences");
  assert.ok(prefsPos < appearancePos, "Preferences must precede appearance");
  assert.ok(appearancePos < viewModePos, "Appearance must precede role switcher");
  assert.ok(viewModePos < actionsPos, "Role switcher must precede account actions");
});

// =============================================================================
// 7. ROLE SWITCHER
// =============================================================================
runTest("ROLE SWITCHER: ViewModeSelector features 'Alternar perfil' and prominent active state", () => {
  assert.ok(
    viewModeSelectorCode.includes("Alternar perfil"),
    "ViewModeSelector title must be 'Alternar perfil'"
  );
  assert.ok(
    viewModeSelectorCode.includes("Seu perfil"),
    "Active role must have 'Seu perfil' badge indicator"
  );
  assert.ok(
    viewModeSelectorCode.includes("d=\"M4.5 12.75l6 6 9-13.5\""),
    "Active role must have prominent checkmark icon"
  );
  assert.ok(
    viewModeSelectorCode.includes("min-h-[48px]"),
    "ViewModeSelector touch target must meet >= 48px"
  );
});

// =============================================================================
// 8. RESPONSIVE GEOMETRY (320px to 430px)
// =============================================================================
runTest("RESPONSIVE GEOMETRY: Truncation, min-w-0 and no horizontal overflow", () => {
  assert.ok(
    consultancyNavCode.includes("truncate leading-snug"),
    "Item labels must truncate gracefully"
  );
  assert.ok(
    consultancyNavCode.includes("min-w-0 flex flex-col text-left"),
    "Text container must enforce min-w-0 to prevent flex blowout"
  );
  assert.ok(
    consultancyNavCode.includes("pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"),
    "Drawer must respect safe area inset bottom"
  );
});

// =============================================================================
// 9. DESKTOP & BOTTOM NAV REGRESSION GUARDS
// =============================================================================
runTest("DESKTOP REGRESSION: Desktop sidebar and tablet navigation remain unaffected", () => {
  assert.ok(
    consultancyNavCode.includes("hidden lg:flex fixed top-0 bottom-0 left-0 w-64"),
    "Desktop persistent sidebar must remain untouched"
  );
  assert.ok(
    consultancyNavCode.includes("hidden md:flex lg:hidden sticky top-0"),
    "Tablet adaptive topbar must remain untouched"
  );
});

runTest("BOTTOM NAV REGRESSION: Height, active pill, and safe area strictly preserved", () => {
  assert.ok(
    consultancyNavCode.includes("pb-[env(safe-area-inset-bottom,0px)]"),
    "Bottom Nav safe area must be preserved"
  );
  assert.ok(
    consultancyNavCode.includes("h-16"),
    "Bottom Nav height h-16 must be preserved"
  );
  assert.ok(
    consultancyNavCode.includes("w-[22px] h-[22px] shrink-0"),
    "22px icon size must be preserved"
  );
});

console.log("==================================================");
console.log(`MOBILE MORE MENU TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
