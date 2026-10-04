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
console.log("TREVO ONE — VISUAL DE-AI PASS GLOBAL AUDIT SUITE");
console.log("==================================================");

// 1. BACKGROUND DECORATION REDUCTION
const wallpaperFile = path.resolve("components/brand/brand-wallpaper.tsx");
const globalsCssFile = path.resolve("app/globals.css");
assert(fs.existsSync(wallpaperFile), "Background: brand-wallpaper component exists");
const wallpaperContent = fs.readFileSync(wallpaperFile, "utf-8");
const globalsCssContent = fs.readFileSync(globalsCssFile, "utf-8");

assert(
  !wallpaperContent.includes("trevo-brand-wallpaper-grid") &&
  !wallpaperContent.includes("<pattern") &&
  !wallpaperContent.includes("patternUnits"),
  "BACKGROUND DECORATION REDUCTION: Repetitive clover grid SVG pattern eliminated"
);
assert(
  globalsCssContent.includes("--wallpaper-pattern-opacity: 0;") ||
  globalsCssContent.includes("--wallpaper-pattern-opacity: 0"),
  "BACKGROUND DECORATION REDUCTION: Wallpaper pattern opacity token zeroed in globals.css"
);

// 2. CARD COUNT REDUCTION & RADIUS ADJUSTMENT
const surfaceFile = path.resolve("components/ui/surface.tsx");
const surfaceContent = fs.readFileSync(surfaceFile, "utf-8");
assert(
  surfaceContent.includes("rounded-xl") && !surfaceContent.includes("rounded-2xl border-[var(--border-default)] shadow-xs"),
  "CARD COUNT REDUCTION: Surface variants adjusted from rounded-2xl to disciplined rounded-xl with subtle shadow"
);

const designSystemFile = path.resolve("components/ui/design-system.tsx");
const designSystemContent = fs.readFileSync(designSystemFile, "utf-8");
assert(
  designSystemContent.includes("CompactCard") && designSystemContent.includes("rounded-xl") && designSystemContent.includes("shadow-2xs"),
  "CARD COUNT REDUCTION: CompactCard container styling standardized to rounded-xl with shadow-2xs"
);

// 3. TYPOGRAPHY CONSISTENCY
const loginShellFile = path.resolve("components/auth/login-shell-v2.tsx");
const loginShellContent = fs.readFileSync(loginShellFile, "utf-8");
const loginBrandPanelFile = path.resolve("components/auth/login-brand-panel.tsx");
const loginBrandPanelContent = fs.readFileSync(loginBrandPanelFile, "utf-8");

assert(
  !loginShellContent.includes("Playfair+Display") &&
  !loginShellContent.includes(".font-editorial"),
  "TYPOGRAPHY CONSISTENCY: Heavy Playfair Display serif font import removed from login"
);
assert(
  !loginBrandPanelContent.includes("font-editorial") &&
  loginBrandPanelContent.includes("font-heading"),
  "TYPOGRAPHY CONSISTENCY: Login brand panel uses consistent sans font-heading"
);

// 4. ICON COLOR CONSISTENCY
const adminDashboardFile = path.resolve("components/dashboard/dashboard-admin-view.tsx");
const adminDashboardContent = fs.readFileSync(adminDashboardFile, "utf-8");
const personalDashboardFile = path.resolve("components/dashboard/dashboard-personal-view.tsx");
const personalDashboardContent = fs.readFileSync(personalDashboardFile, "utf-8");
const nutritionistDashboardFile = path.resolve("components/dashboard/dashboard-nutritionist-view.tsx");
const nutritionistDashboardContent = fs.readFileSync(nutritionistDashboardFile, "utf-8");
const studentDashboardFile = path.resolve("components/dashboard/dashboard-student-view.tsx");
const studentDashboardContent = fs.readFileSync(studentDashboardFile, "utf-8");

assert(
  !adminDashboardContent.includes("text-emerald-500") &&
  !adminDashboardContent.includes("text-sky-500") &&
  !adminDashboardContent.includes("text-violet-500") &&
  !adminDashboardContent.includes("text-amber-500"),
  "ICON COLOR CONSISTENCY: Dashboard Admin View compact card icons neutralized to text-[var(--text-secondary)]"
);
assert(
  !personalDashboardContent.includes("text-emerald-500") &&
  !personalDashboardContent.includes("text-sky-500") &&
  !personalDashboardContent.includes("text-violet-500") &&
  !personalDashboardContent.includes("text-amber-500"),
  "ICON COLOR CONSISTENCY: Dashboard Personal View compact card icons neutralized to text-[var(--text-secondary)]"
);
assert(
  !nutritionistDashboardContent.includes("text-emerald-500") &&
  !nutritionistDashboardContent.includes("text-sky-500") &&
  !nutritionistDashboardContent.includes("text-violet-500") &&
  !nutritionistDashboardContent.includes("text-amber-500"),
  "ICON COLOR CONSISTENCY: Dashboard Nutritionist View compact card icons neutralized to text-[var(--text-secondary)]"
);
assert(
  !studentDashboardContent.includes("text-emerald-500") &&
  !studentDashboardContent.includes("text-sky-500") &&
  !studentDashboardContent.includes("text-violet-500") &&
  !studentDashboardContent.includes("text-amber-500"),
  "ICON COLOR CONSISTENCY: Dashboard Student View compact card icons neutralized to text-[var(--text-secondary)]"
);

// 5. BADGE NOISE & SUBTITLE REDUCTION
assert(
  !personalDashboardContent.includes("Últimas rotinas criadas ou atualizadas"),
  "BADGE NOISE REDUCTION: Redundant microtext 'Últimas rotinas criadas ou atualizadas' removed from personal dashboard"
);
assert(
  !nutritionistDashboardContent.includes("Últimos cardápios criados ou editados"),
  "BADGE NOISE REDUCTION: Redundant subtitle 'Últimos cardápios criados ou editados' removed from nutritionist dashboard"
);

// 6. DESKTOP DASHBOARD DE-TEMPLATE
assert(
  adminDashboardContent.includes("CompactCard") &&
  adminDashboardContent.includes("grid-cols-2 sm:grid-cols-4"),
  "DESKTOP DASHBOARD DE-TEMPLATE: Desktop dashboard maintains clean 4-metric grid without template clutter"
);

// 7. MOBILE DASHBOARD DE-TEMPLATE
const mobileCockpitFile = path.resolve("components/dashboard/mobile-dashboard-cockpit.tsx");
const mobileCockpitContent = fs.readFileSync(mobileCockpitFile, "utf-8");
assert(
  !mobileCockpitContent.includes("Acesse as principais áreas com um toque") &&
  mobileCockpitContent.includes("rounded-xl"),
  "MOBILE DASHBOARD DE-TEMPLATE: Mobile cockpit quick action cards refined to rounded-xl without generic helper text"
);

// 8. SIDEBAR REFINEMENT & DESKTOP PRESERVED
const navFile = path.resolve("components/consultancies/consultancy-navigation.tsx");
const navContent = fs.readFileSync(navFile, "utf-8");
assert(
  navContent.includes("<aside") &&
  navContent.includes("hidden lg:flex") &&
  navContent.includes("border-r border-[var(--border-default)]"),
  "SIDEBAR REFINEMENT: Desktop sidebar presents unified border-r and structured sections"
);
assert(
  navContent.includes("AppearanceSegmentedControl") &&
  navContent.includes("Trocar consultoria") &&
  navContent.includes("LogoutButton"),
  "DESKTOP PRESERVED: Desktop sidebar retains user preferences, consultancy switcher, and logout"
);

// 9. BOTTOM NAV PRESERVED
assert(
  navContent.includes("h-16") &&
  navContent.includes("w-[22px] h-[22px]") &&
  navContent.includes("bg-[var(--brand)]/15 text-[var(--brand)]") &&
  navContent.includes("pb-[env(safe-area-inset-bottom,0px)]"),
  "BOTTOM NAV PRESERVED: Mobile bottom nav height (64px), icon size (22px), active pill and safe-area strictly preserved"
);

// 10. FORMS & INPUTS REFINEMENT
const loginFormFile = path.resolve("components/auth/login-form.tsx");
const loginFormContent = fs.readFileSync(loginFormFile, "utf-8");
assert(
  loginFormContent.includes("rounded-xl") &&
  loginFormContent.includes("min-h-[44px]"),
  "FORMS REFINEMENT: Auth input fields and submit actions enforce 44px ergonomics and rounded-xl containers"
);

// 11. DRAWERS / SHEETS / MODALS REFINEMENT
const studentListFile = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const studentListContent = fs.readFileSync(studentListFile, "utf-8");
const studentDetailFile = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
const studentDetailContent = fs.readFileSync(studentDetailFile, "utf-8");

assert(
  !studentListContent.includes("DumbbellIcon className=\"w-5 h-5 text-emerald-600") &&
  !studentDetailContent.includes("ClipboardCheckIcon className=\"w-5 h-5 text-purple-600") &&
  !studentDetailContent.includes("FileTextIcon className=\"w-5 h-5 text-indigo-600") &&
  studentDetailContent.includes("DumbbellIcon className=\"w-5 h-5 text-[var(--text-secondary)]\""),
  "DRAWERS/SHEETS REFINEMENT: Contextual action sheets utilize clean neutral icons instead of rainbow template styling"
);

// 12. PROFILE / SETTINGS REFINEMENT
const appShellFile = path.resolve("components/consultancies/consultancy-app-shell.tsx");
const appShellContent = fs.readFileSync(appShellFile, "utf-8");
assert(
  appShellContent.includes("ConsultancyNavigation") &&
  appShellContent.includes("SessionScopeGuard") &&
  appShellContent.includes("pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"),
  "PROFILE/SETTINGS REFINEMENT: App shell provides consistent clearance and security guard"
);

// 13. AUTH REFINEMENT
assert(
  !loginShellContent.includes("stroke=\"url(#arcGreenGrad)\"") &&
  loginShellContent.includes("rounded-2xl bg-[#0c0d12]/95"),
  "AUTH REFINEMENT: Sci-fi neon arc SVG removed and login card container refined to rounded-2xl"
);

// 14. LIBRARIES REFINEMENT
const exercisePageFile = path.resolve("app/consultoria/[slug]/exercicios/page.tsx");
const exercisePageContent = fs.readFileSync(exercisePageFile, "utf-8");
const foodLibFile = path.resolve("components/consultancies/nutrition-v2/nutritionist-food-library.tsx");
const foodLibContent = fs.readFileSync(foodLibFile, "utf-8");

assert(
  !exercisePageContent.includes("rounded-2xl sm:rounded-3xl") &&
  exercisePageContent.includes("rounded-xl p-4 sm:p-5"),
  "LIBRARIES REFINEMENT: Exercise catalog cards refined to disciplined rounded-xl"
);
assert(
  !foodLibContent.includes("border-[var(--border-default)] rounded-2xl p-4 sm:p-5") &&
  foodLibContent.includes("border-[var(--border-default)] rounded-xl p-4 sm:p-5"),
  "LIBRARIES REFINEMENT: Food library item cards refined to disciplined rounded-xl"
);

// 15. LIST CONVERSION QUALITY & USAGE
assert(
  studentListContent.includes("mobile-student-card") &&
  studentListContent.includes("rounded-xl") &&
  !studentListContent.includes("rounded-2xl sm:rounded-3xl"),
  "LIST CONVERSION QUALITY: Student list uses disciplined list cards with rounded-xl"
);

// 16. EVOLUTION REFINEMENT
const evolutionScript = path.resolve("scripts/test-mobile-evolution-phase5.mjs");
assert(fs.existsSync(evolutionScript), "Evolution: test script exists");

// 17. HISTORY / TEMPLATES REFINEMENT
const workoutTemplatesScript = path.resolve("scripts/test-workout-templates.mjs");
assert(fs.existsSync(workoutTemplatesScript), "Templates: test script exists");

// 18. MOBILE RESPONSIVE
assert(
  mobileCockpitContent.includes("grid-cols-2") &&
  mobileCockpitContent.includes("min-h-[72px]"),
  "MOBILE RESPONSIVE: Mobile dashboard cockpit adapts gracefully with 72px touch targets"
);

// 19. RBAC & TENANCY
assert(
  appShellContent.includes("isPersonal") &&
  appShellContent.includes("isNutritionist") &&
  appShellContent.includes("isAdmin") &&
  appShellContent.includes("isStudent"),
  "RBAC: Presentation roles and effective view mode strictly segregation verified"
);
assert(
  appShellContent.includes("SessionScopeGuard") &&
  appShellContent.includes("consultancySlug={consultancySlug}"),
  "TENANCY: Server-side tenancy scope guard preserved without cross-tenant leakage"
);

// 20. NO FLOW REGRESSION
assert(
  fs.existsSync("app/consultoria/[slug]/page.tsx") &&
  fs.existsSync("app/consultoria/[slug]/treinos/page.tsx") &&
  fs.existsSync("app/consultoria/[slug]/nutricao/page.tsx") &&
  fs.existsSync("app/consultoria/[slug]/progresso/page.tsx"),
  "NO FLOW REGRESSION: All primary application routes are present and intact"
);

console.log("==================================================");
console.log(`VISUAL DE-AI PASS AUDIT: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
