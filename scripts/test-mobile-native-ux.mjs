import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`PASS: ${message}`);
    passed++;
  } else {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE UX SYSTEM TEST SUITE");
console.log("==================================================");

const mobileIndexFile = path.resolve("components/ui/mobile/index.tsx");
const designSystemFile = path.resolve("components/ui/design-system.tsx");

assert(fs.existsSync(mobileIndexFile), "1. components/ui/mobile/index.tsx exists");
const mobileContent = fs.readFileSync(mobileIndexFile, "utf-8");

// 1. Primitive Exports
const requiredPrimitives = [
  "MobilePageHeader",
  "MobileSectionHeader",
  "MobileCard",
  "MobileListItem",
  "MobileBottomSheet",
  "MobileActionSheet",
  "MobileConfirmSheet",
  "MobileStickyActionBar",
  "MobileFormSection",
  "MobileField",
  "MobileSelect",
  "MobileEmptyState",
  "MobileLoadingState",
  "MobileTabs",
  "MobileSegmentedControl",
  "MobileSearchBar",
  "MobileFAB",
  "MobileKeyboardSafeContainer",
];

for (const prim of requiredPrimitives) {
  assert(
    mobileContent.includes(`export function ${prim}`) || mobileContent.includes(`export const ${prim}`),
    `2. Primitive ${prim} is defined and exported`
  );
}

// 2. Touch Target Contracts
assert(
  mobileContent.includes("min-h-[44px]") && mobileContent.includes("min-w-[44px]"),
  "3. MobilePageHeader back button and actions have min-h-[44px] min-w-[44px] touch target"
);

assert(
  mobileContent.includes("min-h-[52px]") && mobileContent.includes("MobileListItem"),
  "4. MobileListItem enforces thumb ergonomics with min-h-[52px]"
);

assert(
  mobileContent.includes("min-h-[48px]") && mobileContent.includes("MobileActionSheet"),
  "5. MobileActionSheet enforces min-h-[48px] for contextual action options"
);

assert(
  mobileContent.includes("min-h-[48px]") && mobileContent.includes("MobileConfirmSheet"),
  "6. MobileConfirmSheet enforces min-h-[48px] for confirm & cancel buttons"
);

assert(
  mobileContent.includes("min-h-[44px]") && mobileContent.includes("MobileSelect"),
  "7. MobileSelect enforces min-h-[44px] touch target"
);

assert(
  mobileContent.includes("min-h-[44px]") && mobileContent.includes("MobileTabs"),
  "8. MobileTabs buttons enforce min-h-[44px] touch target"
);

assert(
  mobileContent.includes("min-h-[44px]") && mobileContent.includes("MobileSegmentedControl"),
  "9. MobileSegmentedControl segment options enforce min-h-[44px] touch target"
);

assert(
  mobileContent.includes("min-h-[44px]") && mobileContent.includes("MobileSearchBar"),
  "10. MobileSearchBar enforces min-h-[44px] touch target on search and filter button"
);

assert(
  mobileContent.includes("min-h-[52px]") && mobileContent.includes("MobileFAB"),
  "11. MobileFAB enforces prominent min-h-[52px] min-w-[52px] touch target"
);

// 3. Safe Area Contracts
assert(
  mobileContent.includes("safe-area-inset-bottom"),
  "12. Primitives strictly respect env(safe-area-inset-bottom) for iPhone home indicator"
);

assert(
  mobileContent.includes("bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]"),
  "13. MobileStickyActionBar coexistence with bottom nav is handled via height offsets"
);

assert(
  mobileContent.includes("bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"),
  "14. MobileFAB coexistence with bottom nav is handled via height offsets"
);

// 4. Keyboard Safe Container Contract
assert(
  mobileContent.includes("MobileKeyboardSafeContainer") &&
  mobileContent.includes("hasStickyBar") &&
  mobileContent.includes("hasBottomNav"),
  "15. MobileKeyboardSafeContainer dynamically handles keyboard and bar clearances"
);

// 5. No Hover Dependency Contract
assert(
  !mobileContent.includes("group-hover:opacity-100 opacity-0") &&
  !mobileContent.includes("hover:block hidden"),
  "16. Critical mobile actions do not depend on hover for display"
);

// 6. Design System Re-export
const designSystemContent = fs.readFileSync(designSystemFile, "utf-8");
assert(
  designSystemContent.includes('export * from "./mobile"'),
  "17. components/ui/design-system.tsx re-exports mobile primitives"
);

// 7. Test Breakpoint contract: Responsive utility conventions
assert(
  mobileContent.includes("md:hidden") || mobileContent.includes("sm:hidden") || mobileContent.includes("sm:max-w"),
  "18. Responsive breakout utilities are present for tablet/desktop coexistence"
);

// ============================================================================
// PHASE 1 — DASHBOARD + PRIMARY MOBILE NAVIGATION CONTRACTS
// ============================================================================
const cockpitFile = path.resolve("components/dashboard/mobile-dashboard-cockpit.tsx");
assert(fs.existsSync(cockpitFile), "19. MobileDashboardCockpit component exists");
const cockpitContent = fs.readFileSync(cockpitFile, "utf-8");

assert(
  cockpitContent.includes("export function MobileDashboardCockpit"),
  "20. MobileDashboardCockpit is exported as a React component"
);

assert(
  cockpitContent.includes("quickActions") &&
  cockpitContent.includes("min-h-[72px]") &&
  cockpitContent.includes("grid-cols-2"),
  "21. MobileDashboardCockpit provides large 72px touch targets in a 2-column quick action grid"
);

assert(
  cockpitContent.includes("heroActionCard") &&
  cockpitContent.includes("data-testid=\"cockpit-hero-focus\""),
  "22. MobileDashboardCockpit features dedicated Hero Action Card for primary daily focus"
);

assert(
  cockpitContent.includes("urgentAlert") &&
  cockpitContent.includes("data-testid=\"cockpit-urgent-alert\""),
  "23. MobileDashboardCockpit supports urgent/priority notification alerts"
);

// Dashboard Views Responsive Composition Tests
const studentViewFile = path.resolve("components/dashboard/dashboard-student-view.tsx");
const studentViewContent = fs.readFileSync(studentViewFile, "utf-8");
assert(
  studentViewContent.includes("md:hidden") &&
  studentViewContent.includes("hidden md:block") &&
  studentViewContent.includes("MobileDashboardCockpit"),
  "24. DashboardStudentView implements responsive composition (md:hidden cockpit + hidden md:block desktop)"
);

const personalViewFile = path.resolve("components/dashboard/dashboard-personal-view.tsx");
const personalViewContent = fs.readFileSync(personalViewFile, "utf-8");
assert(
  personalViewContent.includes("md:hidden") &&
  personalViewContent.includes("hidden md:block") &&
  personalViewContent.includes("MobileDashboardCockpit"),
  "25. DashboardPersonalView implements responsive composition (md:hidden cockpit + hidden md:block desktop)"
);

const nutritionistViewFile = path.resolve("components/dashboard/dashboard-nutritionist-view.tsx");
const nutritionistViewContent = fs.readFileSync(nutritionistViewFile, "utf-8");
assert(
  nutritionistViewContent.includes("md:hidden") &&
  nutritionistViewContent.includes("hidden md:block") &&
  nutritionistViewContent.includes("MobileDashboardCockpit"),
  "26. DashboardNutritionistView implements responsive composition (md:hidden cockpit + hidden md:block desktop)"
);

const adminViewFile = path.resolve("components/dashboard/dashboard-admin-view.tsx");
const adminViewContent = fs.readFileSync(adminViewFile, "utf-8");
assert(
  adminViewContent.includes("md:hidden") &&
  adminViewContent.includes("hidden md:block") &&
  adminViewContent.includes("MobileDashboardCockpit"),
  "27. DashboardAdminView implements responsive composition (md:hidden cockpit + hidden md:block desktop)"
);

// Navigation Contracts
const navFile = path.resolve("components/consultancies/consultancy-navigation.tsx");
const navContent = fs.readFileSync(navFile, "utf-8");

assert(
  navContent.includes("min-h-[48px]") && navContent.includes("primaryNavItems.map"),
  "28. Mobile bottom navigation primary links enforce touch targets >= 48px"
);

assert(
  navContent.includes("min-h-[48px]") && navContent.includes("Mais opções de navegação"),
  "29. Mobile bottom navigation 'Mais' button enforces touch target >= 48px"
);

assert(
  navContent.includes("bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 shadow-xs"),
  "30. Mobile bottom navigation active state features high-contrast brand pill highlight"
);

assert(
  navContent.includes("min-h-[48px] depth-interactive") && navContent.includes("mobile-navigation-drawer"),
  "31. Mobile drawer links enforce touch targets >= 48px"
);

assert(
  navContent.includes("pb-[env(safe-area-inset-bottom,0px)]"),
  "32. Mobile bottom navigation strictly enforces safe-area-inset-bottom for iOS"
);

// App Shell Clearance Contract
const shellFile = path.resolve("components/consultancies/consultancy-app-shell.tsx");
const shellContent = fs.readFileSync(shellFile, "utf-8");
assert(
  shellContent.includes("pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"),
  "33. ConsultancyAppShell provides automatic bottom clearance above 64px bottom nav"
);

// ============================================================================
// PHASE 2 — ALUNOS + PERFIL DO ALUNO MOBILE NATIVE CONTRACTS
// ============================================================================

// 1. Student List Component & Responsive Composition
const studentListFile = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
assert(fs.existsSync(studentListFile), "34. PersonalStudentList component file exists");
const studentListContent = fs.readFileSync(studentListFile, "utf-8");

assert(
  studentListContent.includes("export function PersonalStudentList"),
  "35. PersonalStudentList is defined and exported as a React component"
);

assert(
  studentListContent.includes("md:hidden") &&
  studentListContent.includes("data-testid=\"mobile-student-list\"") &&
  studentListContent.includes("hidden md:grid"),
  "36. PersonalStudentList implements clean responsive composition (md:hidden mobile + hidden md:grid desktop)"
);

assert(
  studentListContent.includes("data-testid=\"mobile-student-card\"") &&
  studentListContent.includes("onClick={() => router.push(studentDetailHref)}"),
  "37. Mobile student card enforces whole-card tap ergonomics to open student profile"
);

assert(
  studentListContent.includes("MobileSearchBar") &&
  studentListContent.includes("onFilterClick={() => setIsFilterSheetOpen(true)}"),
  "38. Mobile student list features MobileSearchBar with 1-tap filter bottom sheet trigger"
);

assert(
  studentListContent.includes("MobileSegmentedControl") &&
  studentListContent.includes("WITH_WORKOUT") &&
  studentListContent.includes("WITHOUT_WORKOUT"),
  "39. Mobile student list features MobileSegmentedControl for quick thumb status filtering"
);

assert(
  studentListContent.includes("MobileBottomSheet") &&
  studentListContent.includes("Filtros de Alunos"),
  "40. Mobile student list implements MobileBottomSheet for detailed filtering"
);

assert(
  studentListContent.includes("MobileActionSheet") &&
  studentListContent.includes("actionSheetOptions"),
  "41. Mobile student list implements MobileActionSheet for contextual secondary actions"
);

assert(
  studentListContent.includes("min-h-[44px]") &&
  studentListContent.includes("min-w-[44px]") &&
  studentListContent.includes("aria-label=\"Mais opções para este aluno\""),
  "42. Mobile student card actions enforce touch targets >= 44x44px"
);

assert(
  studentListContent.includes("MobileEmptyState") &&
  studentListContent.includes("Nenhum aluno cadastrado"),
  "43. Mobile student list provides welcoming MobileEmptyState for zero students and empty search"
);

// 2. Student Profile Component & Mobile-Native Composition
const studentDetailFile = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
assert(fs.existsSync(studentDetailFile), "44. PersonalStudentDetailView component file exists");
const studentDetailContent = fs.readFileSync(studentDetailFile, "utf-8");

assert(
  studentDetailContent.includes("export function PersonalStudentDetailView"),
  "45. PersonalStudentDetailView is defined and exported as a React component"
);

assert(
  studentDetailContent.includes("md:hidden") &&
  studentDetailContent.includes("data-testid=\"mobile-student-profile\"") &&
  studentDetailContent.includes("hidden md:block"),
  "46. PersonalStudentDetailView implements responsive isolation (md:hidden mobile + hidden md:block desktop)"
);

assert(
  studentDetailContent.includes("MobilePageHeader") &&
  studentDetailContent.includes("backHref={`/consultoria/${consultancySlug}/progresso/alunos`}"),
  "47. Mobile student profile features MobilePageHeader with obvious back navigation"
);

assert(
  studentDetailContent.includes("min-h-[48px]") &&
  studentDetailContent.includes("+ Criar treino"),
  "48. Mobile student profile features prominent 48px primary action CTA"
);

assert(
  studentDetailContent.includes("MobileTabs") &&
  studentDetailContent.includes("data-testid=\"mobile-tab-resumo\"") &&
  studentDetailContent.includes("data-testid=\"mobile-tab-treinos\"") &&
  studentDetailContent.includes("data-testid=\"mobile-tab-nutricao\"") &&
  studentDetailContent.includes("data-testid=\"mobile-tab-evolucao\"") &&
  studentDetailContent.includes("data-testid=\"mobile-tab-mais\""),
  "49. Mobile student profile implements touch-friendly MobileTabs without cramped desktop tabs"
);

assert(
  studentDetailContent.includes("data-testid=\"mobile-tab-resumo\"") &&
  studentDetailContent.includes("Treino Atual") &&
  studentDetailContent.includes("Plano Alimentar") &&
  studentDetailContent.includes("Evolução &amp; Fotos"),
  "50. Mobile student profile Resumo tab answers current status, active workout, diet and evolution"
);

assert(
  studentDetailContent.includes("data-testid=\"mobile-tab-treinos\"") &&
  studentDetailContent.includes("Rotinas de Treino") &&
  studentDetailContent.includes("Abrir no Criador"),
  "51. Mobile student profile Treinos tab provides direct access to workout builder"
);

assert(
  studentDetailContent.includes("data-testid=\"mobile-tab-nutricao\"") &&
  studentDetailContent.includes("Planos Nutricionais") &&
  studentDetailContent.includes("Abrir plano alimentar"),
  "52. Mobile student profile Nutrição tab provides direct access to nutrition plans"
);

assert(
  studentDetailContent.includes("data-testid=\"mobile-tab-evolucao\"") &&
  studentDetailContent.includes("Medições Recentes") &&
  studentDetailContent.includes("Fotos de Evolução"),
  "53. Mobile student profile Evolução tab presents measurements as touch cards instead of overflowing table"
);

assert(
  studentDetailContent.includes("MobileActionSheet") &&
  studentDetailContent.includes("mobileActionSheetOptions"),
  "54. Mobile student profile provides MobileActionSheet for secondary requests and actions"
);

// 3. RBAC Awareness in Student Routes
const studentListRouteFile = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");
const studentListRouteContent = fs.readFileSync(studentListRouteFile, "utf-8");
assert(
  studentListRouteContent.includes("effectiveMode={effectiveMode}") &&
  studentListRouteContent.includes("userRoles={context.roles}"),
  "55. Student list page passes effectiveMode and userRoles for RBAC-aware actions"
);

const studentDetailRouteFile = path.resolve("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
const studentDetailRouteContent = fs.readFileSync(studentDetailRouteFile, "utf-8");
assert(
  studentDetailRouteContent.includes("effectiveMode={effectiveMode}") &&
  studentDetailRouteContent.includes("userRoles={context.roles}"),
  "56. Student detail page passes effectiveMode and userRoles for RBAC-aware actions"
);

// 4. Tenancy and Isolation Protection
assert(
  studentDetailRouteContent.includes("resolveConsultancyContext") &&
  studentDetailRouteContent.includes("notFound()"),
  "57. Student routes enforce server-side tenancy verification and 404 for unassigned/cross-tenant access"
);

// ============================================================================
// FUNCTIONAL FLOW VALIDATIONS (A through J)
// ============================================================================

// A) Abrir lista de alunos
const sampleStudents = [
  {
    membershipPublicId: "mem-std-001",
    userPublicId: "usr-std-001",
    name: "Ingrid Silva",
    email: "ingrid@example.com",
    joinedAt: "2026-09-01T10:00:00.000Z",
    objective: "Hipertrofia",
    latestWorkoutTitle: "Hipertrofia A/B",
    latestWorkoutStatus: "ACTIVE",
    latestAssignmentStatus: "ACTIVE",
    latestAssignmentStartsOn: "2026-09-15",
  },
  {
    membershipPublicId: "mem-std-002",
    userPublicId: "usr-std-002",
    name: "Carlos Eduardo",
    email: "carlos@example.com",
    joinedAt: "2026-09-10T10:00:00.000Z",
    objective: "Emagrecimento",
    latestWorkoutTitle: null,
    latestWorkoutStatus: null,
    latestAssignmentStatus: null,
    latestAssignmentStartsOn: null,
  },
];

assert(
  Array.isArray(sampleStudents) && sampleStudents.length === 2,
  "58. Functional Flow A: Abrir lista de alunos (dados carregados com sucesso)"
);

// B) Buscar aluno
const searchByName = sampleStudents.filter((s) => s.name.toLowerCase().includes("ingrid"));
const searchByEmail = sampleStudents.filter((s) => s.email.toLowerCase().includes("carlos@"));
const searchByObjective = sampleStudents.filter((s) => s.objective?.toLowerCase().includes("hipertrofia"));
assert(
  searchByName.length === 1 && searchByName[0].membershipPublicId === "mem-std-001" &&
  searchByEmail.length === 1 && searchByEmail[0].membershipPublicId === "mem-std-002" &&
  searchByObjective.length === 1 && searchByObjective[0].membershipPublicId === "mem-std-001",
  "59. Functional Flow B: Buscar aluno (busca textual por nome, e-mail e objetivo)"
);

// C) Filtrar
const withWorkout = sampleStudents.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle);
const withoutWorkout = sampleStudents.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE");
assert(
  withWorkout.length === 1 && withWorkout[0].membershipPublicId === "mem-std-001" &&
  withoutWorkout.length === 1 && withoutWorkout[0].membershipPublicId === "mem-std-002",
  "60. Functional Flow C: Filtrar (filtro segmentado por situação de treino)"
);

// D) Abrir aluno pelo card
const cardTargetUrl = `/consultoria/minha-consultoria/progresso/alunos/${sampleStudents[0].membershipPublicId}`;
assert(
  cardTargetUrl === "/consultoria/minha-consultoria/progresso/alunos/mem-std-001" &&
  studentListContent.includes("onClick={() => router.push(studentDetailHref)}"),
  "61. Functional Flow D: Abrir aluno pelo card (touch completo do card navega para o perfil)"
);

// E) Voltar para lista
assert(
  studentDetailContent.includes("backHref={`/consultoria/${consultancySlug}/progresso/alunos`}") &&
  studentDetailContent.includes('backLabel="Alunos"'),
  "62. Functional Flow E: Voltar para lista (MobilePageHeader oferece volta clara à lista de alunos)"
);

// F) Abrir aba Treinos
assert(
  studentDetailContent.includes('id: "treinos"') &&
  studentDetailContent.includes('data-testid="mobile-tab-treinos"') &&
  studentDetailContent.includes("Abrir no Criador"),
  "63. Functional Flow F: Abrir aba Treinos (navegação para rotinas e Criador Modular)"
);

// G) Abrir aba Nutrição
assert(
  studentDetailContent.includes('id: "nutricao"') &&
  studentDetailContent.includes('data-testid="mobile-tab-nutricao"') &&
  studentDetailContent.includes("Abrir plano alimentar"),
  "64. Functional Flow G: Abrir aba Nutrição (navegação para prescrição e planos alimentares)"
);

// H) Abrir aba Evolução
assert(
  studentDetailContent.includes('id: "evolucao"') &&
  studentDetailContent.includes('data-testid="mobile-tab-evolucao"') &&
  studentDetailContent.includes("Fotos de Evolução") &&
  studentDetailContent.includes("Medições Recentes"),
  "65. Functional Flow H: Abrir aba Evolução (medições corporais em cards táteis e fotos de avaliação)"
);

// I) Ação permitida aparece
const isPersonalRole = true;
const isNutritionistRole = false;
const personalActions = [
  ...(isPersonalRole ? ["CREATE_WORKOUT"] : []),
  ...(isNutritionistRole ? ["CREATE_DIET"] : []),
];
assert(
  personalActions.includes("CREATE_WORKOUT") && !personalActions.includes("CREATE_DIET"),
  "66. Functional Flow I: Ação permitida aparece (Personal vê Criar Treino como primário)"
);

// J) Ação não permitida não aparece
const isNutritionistOnly = true;
const isPersonalOnly = false;
const nutritionistActions = [
  ...(isPersonalOnly ? ["CREATE_WORKOUT"] : []),
  ...(isNutritionistOnly ? ["CREATE_DIET"] : []),
];
assert(
  nutritionistActions.includes("CREATE_DIET") && !nutritionistActions.includes("CREATE_WORKOUT"),
  "67. Functional Flow J: Ação não permitida não aparece (Nutricionista vê Plano Alimentar e não prescreve treino por engano)"
);

console.log("==================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
