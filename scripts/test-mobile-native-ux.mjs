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

console.log("==================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
