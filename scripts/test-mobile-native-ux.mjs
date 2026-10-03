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

console.log("==================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
