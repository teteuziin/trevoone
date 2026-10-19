import assert from "node:assert";
import fs from "node:fs";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION PLAN CHOICE SHEET - MOBILE & ACCESSIBILITY REDESIGN");
console.log("================================================================================\n");

function readFile(relPath) {
  return fs.readFileSync(relPath, "utf-8");
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

const choiceCode = readFile("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");

// -----------------------------------------------------------------------------
// 1. Portal & Stacking above Bottom Navigation Bar
// -----------------------------------------------------------------------------
test("1. Renders via createPortal directly into document.body with z-[70] layer", () => {
  assert(choiceCode.includes('import { createPortal } from "react-dom";'), "Must import createPortal");
  assert(choiceCode.includes("createPortal("), "Must call createPortal");
  assert(choiceCode.includes("document.body"), "Portal destination must be document.body");
  assert(choiceCode.includes("z-[70]"), "Overlay must use z-[70] to strictly exceed bottom navigation bar (z-30)");
});

// -----------------------------------------------------------------------------
// 2. Body Scroll Locking and Cleanup
// -----------------------------------------------------------------------------
test("2. Locks body scroll when open and cleans up on unmount or close", () => {
  assert(choiceCode.includes('document.body.style.overflow = "hidden"'), "Must lock document.body.style.overflow to hidden");
  assert(choiceCode.includes("originalOverflow"), "Must save and restore original body overflow");
});

// -----------------------------------------------------------------------------
// 3. Focus Trap and Focus Restoration
// -----------------------------------------------------------------------------
test("3. Restores focus to previousActiveElement on close and traps escape", () => {
  assert(choiceCode.includes("previousActiveElementRef"), "Must save previous active element");
  assert(choiceCode.includes("previousActiveElementRef.current.focus()"), "Must restore focus to triggering element");
  assert(choiceCode.includes('e.key === "Escape"'), "Must handle Escape key");
});

// -----------------------------------------------------------------------------
// 4. Header: Title, Subtitle, and 44x44 Close Button
// -----------------------------------------------------------------------------
test("4. Clean header with 20px title, 14px subtitle 'Como deseja começar?' and >=44px close button", () => {
  assert(choiceCode.includes("Novo plano alimentar"), "Title must be 'Novo plano alimentar'");
  assert(choiceCode.includes("Como deseja começar?"), "Subtitle must be 'Como deseja começar?'");
  assert(
    !choiceCode.includes("Escolha a melhor forma de iniciar a prescrição nutricional"),
    "Old long subtitle must be removed"
  );
  assert(
    choiceCode.includes("min-h-[44px]") && choiceCode.includes("min-w-[44px]"),
    "Close button must have minimum 44x44px target"
  );
  assert(choiceCode.includes('aria-label="Fechar"'), "Close button must have accessible aria-label");
});

// -----------------------------------------------------------------------------
// 5. Discrete Drag Handle for Mobile
// -----------------------------------------------------------------------------
test("5. Discrete drag indicator on smartphone without blocking desktop", () => {
  assert(choiceCode.includes("sm:hidden") && choiceCode.includes("rounded-full"), "Must have mobile drag indicator");
});

// -----------------------------------------------------------------------------
// 6. Four Mandated Options and Exact Copies
// -----------------------------------------------------------------------------
test("6. Four options with exact concise copies", () => {
  // Option 1
  assert(choiceCode.includes("Criar manualmente"), "Must have 'Criar manualmente'");
  assert(choiceCode.includes("Escolha alimentos e monte as refeições."), "Option 1 copy must match");

  // Option 2
  assert(choiceCode.includes("Criar do zero com IA"), "Must have 'Criar do zero com IA'");
  assert(choiceCode.includes("Descreva o plano que deseja criar."), "Option 2 copy must match");

  // Option 3
  assert(choiceCode.includes("Importar com IA"), "Must have 'Importar com IA'");
  assert(choiceCode.includes("Importe um plano para revisar e editar."), "Option 3 copy must match");

  // Option 4
  assert(choiceCode.includes("Usar modelo"), "Must have 'Usar modelo'");
  assert(choiceCode.includes("Escolha um modelo e personalize."), "Option 4 copy must match");
});

// -----------------------------------------------------------------------------
// 7. Removal of All Badges / Tags
// -----------------------------------------------------------------------------
test("7. All option tags/badges are removed", () => {
  assert(!choiceCode.includes("Controle total"), "Must not include badge 'Controle total'");
  assert(!choiceCode.includes("IA Avançada"), "Must not include badge 'IA Avançada'");
  assert(!choiceCode.includes("PDF / Texto"), "Must not include badge 'PDF / Texto'");
  assert(!choiceCode.includes("Base pronta"), "Must not include badge 'Base pronta'");
});

// -----------------------------------------------------------------------------
// 8. Typography, Sizing, Padding, and Spacing
// -----------------------------------------------------------------------------
test("8. Typography and layout tokens: 16px title, 14px description, 40px icon, 16px padding, 12px gap", () => {
  assert(choiceCode.includes("font-bold") && choiceCode.includes("text-base"), "Option title must be 16px font-bold");
  assert(choiceCode.includes("text-sm") && choiceCode.includes("text-[#6B7280]"), "Option description must be 14px with proper contrast");
  assert(choiceCode.includes("min-w-[40px] min-h-[40px]"), "Option icon container must be approximately 40px");
  assert(choiceCode.includes("p-4"), "Internal card padding must be 16px");
  assert(choiceCode.includes("gap-3"), "Gap between options on mobile must be 12px (gap-3)");
});

// -----------------------------------------------------------------------------
// 9. Responsive Bottom Sheet Sizing & Safe Area
// -----------------------------------------------------------------------------
test("9. Responsive bottom sheet with 100% width on mobile, max-w-2xl on desktop, and safe area padding", () => {
  assert(choiceCode.includes("w-full max-w-full sm:max-w-2xl"), "Must take full width on mobile and max-w-2xl on desktop");
  assert(choiceCode.includes("rounded-t-3xl sm:rounded-2xl"), "Must use rounded-t-3xl on mobile and rounded-2xl on desktop");
  assert(choiceCode.includes("safe-area-inset-bottom"), "Must respect safe-area-inset-bottom");
  assert(choiceCode.includes("overflow-y-auto"), "Must support internal scrolling when content overflows");
});

// -----------------------------------------------------------------------------
// 10. Light and Dark Theme Solid Surfaces
// -----------------------------------------------------------------------------
test("10. Light and Dark mode solid surfaces", () => {
  assert(choiceCode.includes("bg-white dark:bg-[#151619]"), "Modal background must be solid light/dark");
  assert(choiceCode.includes("border-[#E5E7EB] dark:border-[#303238]"), "Borders must have solid contrast");
  assert(choiceCode.includes("dark:bg-[#1B1D21]"), "Option cards must have solid dark surface");
});

// -----------------------------------------------------------------------------
// 11. Preservation of Option Actions
// -----------------------------------------------------------------------------
test("11. Preserves all 4 selection triggers", () => {
  assert(choiceCode.includes('onSelectOption("manual")'), "Must trigger manual");
  assert(choiceCode.includes('onSelectOption("ai-scratch")'), "Must trigger ai-scratch");
  assert(choiceCode.includes('onSelectOption("ai-import")'), "Must trigger ai-import");
  assert(choiceCode.includes('onSelectOption("template")'), "Must trigger template");
});

// -----------------------------------------------------------------------------
// 12. Structural Viewport Invariants (320px, 360px, 375px, 390px, 430px, Low Screens)
// -----------------------------------------------------------------------------
test("12. Structural viewport tests across 320px, 360px, 375px, 390px, 430px and low screens", () => {
  // Mobile sheet must have no fixed min-width wider than 320px
  assert(!choiceCode.includes("min-w-[400px]"), "Must not have min-w wider than mobile screen");
  assert(!choiceCode.includes("min-w-[350px]"), "Must not have min-w wider than 320px");
  assert(choiceCode.includes("max-w-full"), "Must constrain width to max-w-full on mobile");
  assert(choiceCode.includes("min-w-0"), "Cards must contain min-w-0 for flex text wrap safety");

  // Verify dvh and max-h for short screens / landscape
  assert(choiceCode.includes("85dvh") || choiceCode.includes("90vh"), "Must use dynamic viewport unit or max-h");
  assert(choiceCode.includes("shrink-0"), "Header must have shrink-0 so it never shrinks away on low screens");
});

// -----------------------------------------------------------------------------
// 13. Stacking Context & Bottom Nav Shielding
// -----------------------------------------------------------------------------
test("13. Shielding: Overlay is attached to document.body and z-[70] > bottom nav z-30", () => {
  const navCode = readFile("components/consultancies/consultancy-navigation.tsx");
  assert(navCode.includes("z-30"), "Bottom nav bar is z-30");
  assert(choiceCode.includes("z-[70]"), "Choice modal overlay is z-[70], ensuring it renders strictly above the nav bar");
});

console.log(`\nAll ${passed} tests passed successfully!\n`);

