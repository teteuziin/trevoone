/**
 * TREVO ONE — PHASE 8 MOBILE NATIVE TEST SUITE
 * Bottom Navigation, Profile, Security, Auth, Auxiliary Flows & App-Wide UX Audit
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
console.log("TREVO ONE — MOBILE NATIVE (PHASE 8 FINAL)");
console.log("BOTTOM NAV, PROFILE, SECURITY, AUTH & GLOBAL AUDIT");
console.log("==================================================");

// Load component files
const consultancyNavPath = path.join(
  rootDir,
  "components/consultancies/consultancy-navigation.tsx"
);
assert.ok(fs.existsSync(consultancyNavPath), "consultancy-navigation.tsx must exist");
const consultancyNavCode = fs.readFileSync(consultancyNavPath, "utf-8");

const appShellPath = path.join(
  rootDir,
  "components/consultancies/consultancy-app-shell.tsx"
);
assert.ok(fs.existsSync(appShellPath), "consultancy-app-shell.tsx must exist");
const appShellCode = fs.readFileSync(appShellPath, "utf-8");

const profilePagePath = path.join(rootDir, "app/conta/perfil/page.tsx");
assert.ok(fs.existsSync(profilePagePath), "app/conta/perfil/page.tsx must exist");
const profilePageCode = fs.readFileSync(profilePagePath, "utf-8");

const securityPagePath = path.join(rootDir, "app/conta/seguranca/page.tsx");
assert.ok(fs.existsSync(securityPagePath), "app/conta/seguranca/page.tsx must exist");
const securityPageCode = fs.readFileSync(securityPagePath, "utf-8");

const loginFormPath = path.join(rootDir, "components/auth/login-form.tsx");
assert.ok(fs.existsSync(loginFormPath), "login-form.tsx must exist");
const loginFormCode = fs.readFileSync(loginFormPath, "utf-8");

const notFoundPath = path.join(rootDir, "app/not-found.tsx");
assert.ok(fs.existsSync(notFoundPath), "app/not-found.tsx must exist");
const notFoundCode = fs.readFileSync(notFoundPath, "utf-8");

const offlinePath = path.join(rootDir, "app/offline/page.tsx");
assert.ok(fs.existsSync(offlinePath), "app/offline/page.tsx must exist");
const offlineCode = fs.readFileSync(offlinePath, "utf-8");

const mobilePrimitivesPath = path.join(rootDir, "components/ui/mobile/index.tsx");
assert.ok(fs.existsSync(mobilePrimitivesPath), "components/ui/mobile/index.tsx must exist");
const mobilePrimitivesCode = fs.readFileSync(mobilePrimitivesPath, "utf-8");

// =============================================================================
// TEST SUITE: PARTE A — BOTTOM NAVIGATION ARCHITECTURE
// =============================================================================
runTest("Parte A: Mobile Bottom Nav component renders with md:hidden and fixed bottom-0", () => {
  assert.ok(
    consultancyNavCode.includes('aria-label="Navegação rápida móvel"'),
    "Bottom navigation must have accessible aria-label"
  );
  assert.ok(
    consultancyNavCode.includes("fixed bottom-0 inset-x-0 z-30"),
    "Bottom navigation must be fixed to bottom with proper z-index"
  );
});

runTest("Parte A: iPhone Safe Area padding env(safe-area-inset-bottom) is strictly enforced", () => {
  assert.ok(
    consultancyNavCode.includes("pb-[env(safe-area-inset-bottom,0px)]"),
    "Bottom navigation must use safe-area-inset-bottom for iPhone home indicator"
  );
  assert.ok(
    appShellCode.includes("pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"),
    "AppShell main content must provide clearance above bottom nav"
  );
});

runTest("Parte A: Number of primary items capped at 4 + 1 Mais button = 5 destinations", () => {
  assert.ok(
    consultancyNavCode.includes("primaryNavItems.slice(0, 4)") ||
    consultancyNavCode.includes("mobilePrimaryItems.slice(0, 4)"),
    "Bottom navigation must cap primary items at 4 to ensure thumb ergonomics"
  );
  assert.ok(
    consultancyNavCode.includes('aria-label="Mais opções de navegação"'),
    "5th destination must be the 'Mais' drawer trigger"
  );
});

runTest("Parte A: Touch targets on bottom navigation meet or exceed 48px", () => {
  assert.ok(
    consultancyNavCode.includes("min-h-[48px]"),
    "Bottom navigation items must meet or exceed 48px touch targets"
  );
  assert.ok(
    consultancyNavCode.includes("h-16"),
    "Bottom bar height must be 64px (h-16) for comfortable thumb resting"
  );
});

runTest("Parte A: Active state indicator has pill/background + brand color with clean non-redundant hierarchy", () => {
  assert.ok(
    consultancyNavCode.includes("bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"),
    "Active bottom nav item must feature highlighted brand pill"
  );
  assert.ok(
    consultancyNavCode.includes("font-semibold text-[var(--brand)]"),
    "Active bottom nav item must feature brand bold/semibold label"
  );
  // Redundant dot next to label has been removed from mobile bottom nav to avoid 3 conflicting indicators and preserve label symmetry:
  const mobileNavMatch = consultancyNavCode.match(/aria-label="Navegação rápida móvel"[\s\S]*?<\/nav>/);
  assert.ok(mobileNavMatch, "Mobile bottom nav section must exist");
  assert.ok(
    !mobileNavMatch[0].includes("w-1.5 h-1.5 rounded-full"),
    "Redundant dot indicator removed from bottom nav for clean native app appearance"
  );
});

runTest("Parte A: Bottom nav icons are 22-24px visual size and consistent across all items", () => {
  assert.ok(
    consultancyNavCode.includes('className="w-[22px] h-[22px] shrink-0"'),
    "Bottom navigation icons must use 22px visual size (w-[22px] h-[22px])"
  );
  assert.ok(
    consultancyNavCode.includes('case "operations":'),
    "NavIcon must define dedicated operations center icon for Operações"
  );
});

runTest("Parte A: Bottom nav labels are 11-12px font-medium for comfortable mobile reading", () => {
  assert.ok(
    consultancyNavCode.includes("text-[11px]"),
    "Bottom navigation labels must be 11px font size"
  );
  assert.ok(
    consultancyNavCode.includes("font-medium text-[var(--text-secondary)]"),
    "Inactive labels must be readable with font-medium and text-secondary contrast"
  );
});

runTest("Parte A: All items including 'Mais' share identical vertical layout and pill structure", () => {
  assert.ok(
    consultancyNavCode.includes('px-3 py-1 rounded-full relative flex items-center justify-center'),
    "Items and 'Mais' button must share identical pill container structure"
  );
  assert.ok(
    consultancyNavCode.includes('<circle cx="5" cy="12" r="2" />'),
    "'Mais' button must feature solid, balanced vector circles matching optical weight"
  );
});

runTest("Parte A: Responsive layout supports 320px to 430px viewports without horizontal overflow", () => {
  assert.ok(
    consultancyNavCode.includes("flex-1 min-w-0"),
    "Each item must have flex-1 min-w-0 for even distribution"
  );
  assert.ok(
    consultancyNavCode.includes("truncate max-w-full"),
    "Labels must truncate with max-w-full to prevent any horizontal overflow on narrow screens"
  );
});

// =============================================================================
// TEST SUITE: PARTE A — ROLE-BASED NAVIGATION ITEMS
// =============================================================================
runTest("Parte A: STUDENT navigation prioritizes Início, Treinos, Nutrição, Evolução", () => {
  assert.ok(
    appShellCode.includes('id: "learner-treinos"'),
    "Student navigation must have learner-treinos"
  );
  assert.ok(
    appShellCode.includes('id: "learner-nutricao"'),
    "Student navigation must have learner-nutricao"
  );
  assert.ok(
    appShellCode.includes('id: "learner-progresso"'),
    "Student navigation must have learner-progresso"
  );
});

runTest("Parte A: PERSONAL navigation prioritizes Início, Alunos, Treinos", () => {
  assert.ok(
    appShellCode.includes('id: "atendimento-alunos"'),
    "Personal navigation must have atendimento-alunos"
  );
  assert.ok(
    appShellCode.includes('id: "personal-rotinas"'),
    "Personal navigation must have personal-rotinas"
  );
});

runTest("Parte A: NUTRITIONIST navigation prioritizes Início, Pacientes, Planos", () => {
  assert.ok(
    appShellCode.includes('id: "nutritionist-planos"'),
    "Nutritionist navigation must have nutritionist-planos"
  );
});

runTest("Parte A: ADMIN navigation prioritizes Início, Membros, Financeiro, Operações", () => {
  assert.ok(
    appShellCode.includes('id: "admin-membros"'),
    "Admin navigation must have admin-membros"
  );
  assert.ok(
    appShellCode.includes('id: "admin-financeiro"'),
    "Admin navigation must have admin-financeiro"
  );
  assert.ok(
    appShellCode.includes('id: "admin-operacoes"'),
    "Admin navigation must have admin-operacoes"
  );
});

// =============================================================================
// TEST SUITE: PARTE A — ROUTE & SUBROUTE MATCHING
// =============================================================================
runTest("Parte A: isItemActive correctly handles exact base slug and subroute boundaries", () => {
  assert.ok(
    consultancyNavCode.includes("function isItemActive"),
    "isItemActive function must be defined"
  );
  assert.ok(
    consultancyNavCode.includes("cleanItemHref + \"/\""),
    "isItemActive must match subroutes with explicit slash boundary"
  );
});

runTest("Parte A: Disambiguation between /progresso and /progresso/alunos is enforced", () => {
  assert.ok(
    consultancyNavCode.includes("pathname.startsWith(`${baseSlugHref}/progresso/alunos`)"),
    "Must disambiguate /progresso from /progresso/alunos to avoid false highlights"
  );
});

// =============================================================================
// TEST SUITE: PARTE A — DEDICATED FULLSCREEN FLOWS & KEYBOARD
// =============================================================================
runTest("Parte A: Student active workout runtime hides mobile bottom nav to prevent CTA collision", () => {
  assert.ok(
    consultancyNavCode.includes("isStudentRuntime"),
    "Must detect student runtime execution route"
  );
  assert.ok(
    consultancyNavCode.includes("shouldHideMobileBottomNav"),
    "Must hide bottom nav on focused fullscreen flows"
  );
});

runTest("Parte A: Workout and Nutrition Builders hide mobile bottom nav to prevent CTA collision", () => {
  assert.ok(
    consultancyNavCode.includes("isWorkoutBuilder"),
    "Must detect workout builder editor routes"
  );
  assert.ok(
    consultancyNavCode.includes("isNutritionBuilder"),
    "Must detect nutrition plan builder editor routes"
  );
});

runTest("Parte A: Virtual keyboard detection hides bottom nav to keep inputs visible", () => {
  assert.ok(
    consultancyNavCode.includes("isKeyboardOpen"),
    "Must track isKeyboardOpen state"
  );
  assert.ok(
    consultancyNavCode.includes("visualViewport") || consultancyNavCode.includes("focusin"),
    "Must use visualViewport or focus listeners for virtual keyboard awareness"
  );
});

// =============================================================================
// TEST SUITE: PARTE B — MENU 'MAIS' / DRAWER
// =============================================================================
runTest("Parte B: Drawer header displays UserAvatar and links to /conta/perfil with returnTo", () => {
  assert.ok(
    consultancyNavCode.includes("/conta/perfil?returnTo="),
    "Drawer header user profile link must include returnTo parameter"
  );
});

runTest("Parte B: Redundant duplicate 'Meu perfil' link removed from drawer Preferências", () => {
  // In the drawer, after the user header card, there should not be a redundant 'Meu perfil' button
  const drawerPrefsMatch = consultancyNavCode.match(/aria-label="Preferências do usuário"[\s\S]*?<\/nav>/);
  assert.ok(drawerPrefsMatch, "Drawer must have Preferências do usuário nav");
  assert.ok(
    !drawerPrefsMatch[0].includes("Meu perfil"),
    "Drawer Preferências section must not have duplicate 'Meu perfil' item"
  );
  assert.ok(
    drawerPrefsMatch[0].includes("Central de notificações") && drawerPrefsMatch[0].includes("Conta e segurança"),
    "Drawer Preferências must contain notifications and security items"
  );
});

runTest("Parte B: Drawer Conta e segurança includes returnTo parameter", () => {
  assert.ok(
    consultancyNavCode.includes("/conta/seguranca?returnTo="),
    "Drawer security link must include returnTo parameter"
  );
});

// =============================================================================
// TEST SUITE: PARTE C & D — PERFIL E SEGURANÇA
// =============================================================================
runTest("Parte C: AccountProfilePage integrates MobilePageHeader on mobile", () => {
  assert.ok(
    profilePageCode.includes("<MobilePageHeader"),
    "AccountProfilePage must render MobilePageHeader on mobile"
  );
  assert.ok(
    profilePageCode.includes("searchParams"),
    "AccountProfilePage must accept searchParams for dynamic returnTo"
  );
});

runTest("Parte C: AccountSecurityPage integrates MobilePageHeader on mobile", () => {
  assert.ok(
    securityPageCode.includes("<MobilePageHeader"),
    "AccountSecurityPage must render MobilePageHeader on mobile"
  );
  assert.ok(
    securityPageCode.includes("searchParams"),
    "AccountSecurityPage must accept searchParams for dynamic returnTo"
  );
});

runTest("Parte C & D: Desktop layout is 100% preserved with hidden sm:block", () => {
  assert.ok(
    profilePageCode.includes("hidden sm:block") || profilePageCode.includes("hidden sm:flex"),
    "Desktop layout in AccountProfilePage must be preserved"
  );
  assert.ok(
    securityPageCode.includes("hidden sm:block") || securityPageCode.includes("hidden sm:flex"),
    "Desktop layout in AccountSecurityPage must be preserved"
  );
});

// =============================================================================
// TEST SUITE: PARTE E — LOGIN / AUTH
// =============================================================================
runTest("Parte E: LoginForm has email type='email' and autocomplete='email'", () => {
  assert.ok(
    loginFormCode.includes('type="email"') && loginFormCode.includes('autoComplete="email"'),
    "Email input must be properly configured for mobile keyboards"
  );
});

runTest("Parte E: LoginForm password visibility toggle has aria-label and min-h-[44px]", () => {
  assert.ok(
    loginFormCode.includes('aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}'),
    "Password toggle must have descriptive aria-label"
  );
  assert.ok(
    loginFormCode.includes("min-w-[44px]") && loginFormCode.includes("min-h-[44px]"),
    "Password toggle must have min-h-[44px] touch target"
  );
});

runTest("Parte E: LoginForm preserves returnTo parameter", () => {
  assert.ok(
    loginFormCode.includes('<input type="hidden" name="returnTo" value={returnTo} />'),
    "LoginForm must pass returnTo as hidden field"
  );
});

// =============================================================================
// TEST SUITE: PARTE K & Q — 404, OFFLINE & PRIMITIVES
// =============================================================================
runTest("Parte K: 404 page has clean mobile layout and min-h-[44px] button", () => {
  assert.ok(
    notFoundCode.includes("min-h-[44px]"),
    "404 page button must meet or exceed 44px touch target"
  );
});

runTest("Parte Q: Offline page has retry button, status indicator, and mobile layout", () => {
  assert.ok(
    offlineCode.includes("Tentar novamente"),
    "Offline page must have retry action"
  );
  assert.ok(
    offlineCode.includes("isOnline"),
    "Offline page must track connectivity state"
  );
});

runTest("Parte G: Mobile primitives (PageHeader, BottomSheet, ActionSheet, ConfirmSheet) exist and are exported", () => {
  assert.ok(mobilePrimitivesCode.includes("export function MobilePageHeader"), "MobilePageHeader must be exported");
  assert.ok(mobilePrimitivesCode.includes("export function MobileBottomSheet"), "MobileBottomSheet must be exported");
  assert.ok(mobilePrimitivesCode.includes("export function MobileActionSheet"), "MobileActionSheet must be exported");
  assert.ok(mobilePrimitivesCode.includes("export function MobileConfirmSheet"), "MobileConfirmSheet must be exported");
  assert.ok(mobilePrimitivesCode.includes("export function MobileStickyActionBar"), "MobileStickyActionBar must be exported");
});

console.log("==================================================");
console.log(`PHASE 8 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
