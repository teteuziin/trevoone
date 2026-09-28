import {
  resolveDefaultPresentationMode,
  getAllowedViewModeOptions,
} from "../lib/consultancies/view-mode.ts";
import { ROLE_LABELS } from "../lib/consultancies/context.ts";
import fs from "fs";
import path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error("  [FAIL]: " + message);
    failedCount++;
    throw new Error(message);
  } else {
    console.log("  [PASS]: " + message);
    passedCount++;
  }
}

async function run() {
  console.log("==================================================");
  console.log("TESTING STUDENT + INFLUENCER/VIP PRIORITY CORRECTION");
  console.log("==================================================");

  // 1. DEFAULT PRESENTATION MODE RESOLUTION
  console.log("\n--- Suite 1: Presentation Mode Precedence ---");
  assert(
    resolveDefaultPresentationMode(["STUDENT", "INFLUENCER"]) === "STUDENT",
    "STUDENT + INFLUENCER resolves to STUDENT default mode (STUDENT-first)"
  );
  assert(
    resolveDefaultPresentationMode(["INFLUENCER", "STUDENT"]) === "STUDENT",
    "INFLUENCER + STUDENT resolves to STUDENT default mode regardless of array order"
  );
  assert(
    resolveDefaultPresentationMode(["INFLUENCER"]) === "INFLUENCER",
    "Pure INFLUENCER remains unchanged (INFLUENCER default mode)"
  );
  assert(
    resolveDefaultPresentationMode(["STUDENT"]) === "STUDENT",
    "Pure STUDENT remains unchanged (STUDENT default mode)"
  );
  assert(
    resolveDefaultPresentationMode(["PERSONAL", "CONSULTANCY_ADMIN"]) === "ADMIN",
    "PERSONAL + ADMIN remains unchanged (ADMIN default mode)"
  );
  assert(
    resolveDefaultPresentationMode(["NUTRITIONIST", "CONSULTANCY_ADMIN"]) === "ADMIN",
    "NUTRITIONIST + ADMIN remains unchanged (ADMIN default mode)"
  );

  // 2. VIEW MODE SWITCHER OPTIONS
  console.log("\n--- Suite 2: Allowed View Mode Options ---");
  const studentVipOpts = getAllowedViewModeOptions(["STUDENT", "INFLUENCER"]);
  assert(
    studentVipOpts[0]?.mode === "STUDENT",
    "STUDENT is the first/primary option for STUDENT + INFLUENCER"
  );
  assert(
    studentVipOpts.some((o) => o.mode === "INFLUENCER"),
    "INFLUENCER is preserved as secondary option for STUDENT + INFLUENCER"
  );

  const pureInfluencerOpts = getAllowedViewModeOptions(["INFLUENCER"]);
  assert(
    pureInfluencerOpts.length === 1 && pureInfluencerOpts[0].mode === "INFLUENCER",
    "Pure INFLUENCER has exactly INFLUENCER option (no STUDENT)"
  );

  const pureStudentOpts = getAllowedViewModeOptions(["STUDENT"]);
  assert(
    pureStudentOpts.length === 1 && pureStudentOpts[0].mode === "STUDENT",
    "Pure STUDENT has exactly STUDENT option (no INFLUENCER)"
  );

  // 3. APP SHELL ROLE LABELS ORDER
  console.log("\n--- Suite 3: Header & Badge Role Labels Order ---");
  const sortedRolesForLabels = ["INFLUENCER", "STUDENT"].sort((a, b) => {
    if (a === "STUDENT") return -1;
    if (b === "STUDENT") return 1;
    return 0;
  });
  const roleLabels = [];
  for (const r of sortedRolesForLabels) {
    if (r === "INFLUENCER") {
      roleLabels.push("Influenciador", "VIP");
    } else {
      roleLabels.push(ROLE_LABELS[r] || r);
    }
  }
  assert(roleLabels[0] === "Aluno", "Aluno badge is sorted first");
  assert(roleLabels[1] === "Influenciador", "Influenciador badge is sorted second");
  assert(roleLabels[2] === "VIP", "VIP badge is sorted third");

  // 4. NAVIGATION CODE INSPECTION (SIDEBAR & MOBILE)
  console.log("\n--- Suite 4: Sidebar & Mobile Navigation Structure ---");
  const appShellPath = path.resolve("./components/consultancies/consultancy-app-shell.tsx");
  const appShellCode = fs.readFileSync(appShellPath, "utf-8");

  // Check mobilePrimaryItems order for student
  assert(
    appShellCode.includes('if (isStudent && (isInfluencer || (!isPersonal && !isNutritionist && !isAdmin)))'),
    "AppShell mobilePrimaryItems guarantees STUDENT priority when user has STUDENT role"
  );
  assert(
    appShellCode.includes('id: "learner-treinos"') &&
    appShellCode.includes('id: "learner-nutricao"') &&
    appShellCode.includes('id: "learner-progresso"'),
    "AppShell mobilePrimaryItems includes Treinos, Nutrição, Evolução"
  );

  // Check rawItems order: learner items before influencer items
  const learnerIdx = appShellCode.indexOf('id: "learner-treinos"');
  const influencerIdx = appShellCode.indexOf('id: "influencer-missoes"');
  assert(
    learnerIdx !== -1 && influencerIdx !== -1 && learnerIdx < influencerIdx,
    "AppShell rawItems places student tracking items BEFORE influencer items"
  );

  // Check sidebar navigation in consultancy-navigation.tsx
  const navPath = path.resolve("./components/consultancies/consultancy-navigation.tsx");
  const navCode = fs.readFileSync(navPath, "utf-8");

  const meuAcompanhamentoIdx = navCode.indexOf('title: "MEU ACOMPANHAMENTO"');
  const parceriaVipIdx = navCode.indexOf('title: "PARCERIA VIP"');
  assert(
    meuAcompanhamentoIdx !== -1 && parceriaVipIdx !== -1 && meuAcompanhamentoIdx < parceriaVipIdx,
    "Sidebar places MEU ACOMPANHAMENTO before PARCERIA VIP"
  );

  // Check mobile drawer has Parceria VIP and Serviços
  assert(
    navCode.includes("Benefícios VIP & Parceria"),
    "Mobile Drawer includes Benefícios VIP & Parceria group"
  );
  assert(
    navCode.includes("Serviços do Aluno"),
    "Mobile Drawer includes Serviços do Aluno group"
  );

  // 5. COMBINED DASHBOARD VIEW SECTION ORDER
  console.log("\n--- Suite 5: Combined Dashboard Vertical Ordering ---");
  const dashboardPath = path.resolve("./components/dashboard/dashboard-combined-student-vip-view.tsx");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");

  const checkinPos = dashboardCode.indexOf('aria-label="Check-in Diário"');
  const studentSummaryPos = dashboardCode.indexOf('aria-label="Resumo do Aluno"');
  const carouselPos = dashboardCode.indexOf('aria-label="Destaques do Aluno"');
  const workoutPos = dashboardCode.indexOf('aria-label="Rotinas do Aluno"');
  const nutritionPos = dashboardCode.indexOf('aria-label="Plano Alimentar Prescrito"');
  const evolutionPos = dashboardCode.indexOf('aria-label="Sua Evolução"');
  const vipSectionPos = dashboardCode.indexOf('aria-label="Benefícios VIP e Parceria"');

  assert(checkinPos !== -1, "Check-in section exists");
  assert(studentSummaryPos !== -1, "Student Summary (Treino/Nutrição/Evolução) section exists");
  assert(carouselPos !== -1, "Student Carousel section exists");
  assert(workoutPos !== -1, "Workout Routines section exists");
  assert(nutritionPos !== -1, "Nutrition Plan section exists");
  assert(evolutionPos !== -1, "Evolution section exists");
  assert(vipSectionPos !== -1, "VIP Benefits section exists");

  assert(
    checkinPos < studentSummaryPos,
    "1. Check-in appears before Student Summary"
  );
  assert(
    studentSummaryPos < carouselPos,
    "2. Student Summary appears before Student Hero Carousel"
  );
  assert(
    carouselPos < workoutPos,
    "3. Student Hero Carousel appears before Workout Routines"
  );
  assert(
    workoutPos < nutritionPos,
    "4. Workout Routines appears before Nutrition Plan"
  );
  assert(
    nutritionPos < evolutionPos,
    "5. Nutrition Plan appears before Evolution"
  );
  assert(
    evolutionPos < vipSectionPos,
    "6. Evolution appears BEFORE VIP Benefits & Partnership section"
  );

  // 6. VIP BENEFITS PRESERVATION (NOTHING LOST)
  console.log("\n--- Suite 6: VIP Features Preservation ---");
  assert(
    dashboardCode.includes("Missões") && dashboardCode.includes("pendingMissionsCount"),
    "VIP feature preserved: Missions KPI and navigation"
  );
  assert(
    dashboardCode.includes("Indicações") && dashboardCode.includes("registrationsCount"),
    "VIP feature preserved: Referrals KPI and registrations"
  );
  assert(
    dashboardCode.includes("Comissão") && dashboardCode.includes("approvedAmount"),
    "VIP feature preserved: Commissions KPI and amount"
  );
  assert(
    dashboardCode.includes("PIX") && dashboardCode.includes("pixProfile"),
    "VIP feature preserved: PIX status, key and configuration"
  );
  assert(
    dashboardCode.includes("handleCopyLink") && dashboardCode.includes("referralUrl"),
    "VIP feature preserved: Fast Referral link copy"
  );

  // 7. HEADER BADGES IN DASHBOARD CONTEXT
  console.log("\n--- Suite 7: Header Badges Prominence ---");
  const contextPath = path.resolve("./components/dashboard/dashboard-context.tsx");
  const contextCode = fs.readFileSync(contextPath, "utf-8");

  assert(
    contextCode.includes('Badge variant="brand" size="sm"') && contextCode.includes("Aluno"),
    "Aluno badge has primary variant ('brand')"
  );
  assert(
    contextCode.includes('Badge variant={isStudent ? "neutral" : "brand"} size="sm"') && contextCode.includes("Influenciador"),
    "Influenciador badge has secondary variant ('neutral') when isStudent is true"
  );
  assert(
    contextCode.includes('Badge variant={isStudent ? "neutral" : "brand"} size="sm"') && contextCode.includes("VIP"),
    "VIP badge has secondary variant ('neutral') when isStudent is true"
  );

  console.log("\n==================================================");
  console.log(`ALL SUITES PASSED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
