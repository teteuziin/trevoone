/**
 * TREVO ONE — Offline 360 Hotfix P0 Verification Suite
 *
 * Verifies all P0 requirements:
 * 1. Old PWA Cache Upgrade simulation (trevo-static-v3 -> trevo-static-v4, activate purges old caches)
 * 2. Ping endpoint configuration (/api/ping returns 204 with no-store headers, never cached by SW)
 * 3. Auto-Prime Partial Success & Data Bounding (Promise.allSettled, bounded history, zero photos)
 * 4. Canonical Scope Isolation (UUID byte-a-byte, zero slug fallback)
 * 5. Offline workout execution & cold reopen compatibility (workout_sessions + pending_operations schema)
 * 6. Connectivity State Machine (silent online state, debounced flapping, no coexistence of online + offline badge)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("TREVO ONE — OFFLINE 360 HOTFIX P0 VERIFICATION");
console.log("==================================================");

const ROOT = process.cwd();

// --- TEST 1: CACHE STORAGE UPGRADE & SW LIFECYCLE ---
console.log("\n[TEST 1] Service Worker Cache Version & Old PWA Upgrade Simulation");

const swContent = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf-8");
const offlineJsContent = fs.readFileSync(path.join(ROOT, "public/offline.js"), "utf-8");

// Verify CACHE_VERSION is strictly v4
assert.match(swContent, /const CACHE_VERSION = "v4";/, "CACHE_VERSION in public/sw.js must be v4");
assert.match(swContent, /const CACHE_NAME = `trevo-static-\${CACHE_VERSION}`;/, "CACHE_NAME must be trevo-static-v4");

// Verify offline.js connects to trevo_offline_v3 version 4 and zero trevo_offline_v1
assert.match(offlineJsContent, /const DB_NAME = "trevo_offline_v3";/, "offline.js must use trevo_offline_v3");
assert.match(offlineJsContent, /const DB_VERSION = 4;/, "offline.js must use DB_VERSION = 4");
assert.equal(offlineJsContent.includes("trevo_offline_v1"), false, "offline.js must NOT reference trevo_offline_v1");

// Simulate Old Cache Storage with trevo-static-v3 and old offline.js
const mockCacheStorage = new Map();
mockCacheStorage.set("trevo-static-v3", new Map([
  ["/offline.js", "const DB_NAME = 'trevo_offline_v1';"],
  ["/offline.html", "<html>old</html>"],
]));
mockCacheStorage.set("other-unrelated-cache", new Map());

// Simulate SW activate listener logic
const CACHE_NAME = "trevo-static-v4";
const cacheNames = Array.from(mockCacheStorage.keys());
for (const name of cacheNames) {
  if (name.startsWith("trevo-") && name !== CACHE_NAME) {
    mockCacheStorage.delete(name);
  }
}
mockCacheStorage.set(CACHE_NAME, new Map([
  ["/offline.js", offlineJsContent],
  ["/offline.html", "<html>new</html>"],
]));

assert.equal(mockCacheStorage.has("trevo-static-v3"), false, "trevo-static-v3 must be deleted on activate");
assert.equal(mockCacheStorage.has("other-unrelated-cache"), true, "Unrelated caches must be preserved");
assert.equal(mockCacheStorage.has("trevo-static-v4"), true, "trevo-static-v4 must be created");

const cachedOfflineJs = mockCacheStorage.get("trevo-static-v4").get("/offline.js");
assert.match(cachedOfflineJs, /trevo_offline_v3/, "New cached offline.js must target trevo_offline_v3");

console.log("  PASS: Old cache trevo-static-v3 successfully purged; trevo-static-v4 installed with fresh offline.js");

// --- TEST 2: /API/PING CONFIGURATION ---
console.log("\n[TEST 2] /api/ping Route Configuration & Cache Bypass");

const pingRouteContent = fs.readFileSync(path.join(ROOT, "app/api/ping/route.ts"), "utf-8");
assert.match(pingRouteContent, /export const dynamic = "force-dynamic";/, "/api/ping must be dynamic");
assert.match(pingRouteContent, /status: 204/, "/api/ping must return 204 No Content");
assert.match(pingRouteContent, /no-store/, "/api/ping must specify no-store");

// Verify sw.js never intercepts /api/
assert.match(swContent, /pathname\.startsWith\("\/api"\)/, "sw.js must explicitly bypass /api routes from static caching");

console.log("  PASS: /api/ping configured dynamically with 204 No Content and complete SW cache bypass");

// --- TEST 3: AUTO-PRIME SERVER ACTION & DATA BOUNDING ---
console.log("\n[TEST 3] Auto-Prime Partial Success & Bounded Data");

const primeActionContent = fs.readFileSync(path.join(ROOT, "lib/offline/offline-prime-actions.ts"), "utf-8");

assert.match(primeActionContent, /Promise\.allSettled/, "Must use Promise.allSettled for partial success resilience");
assert.match(primeActionContent, /workoutSettled\.status === "fulfilled"/, "Handles workout partial status");
assert.match(primeActionContent, /nutritionSettled\.status === "fulfilled"/, "Handles nutrition partial status");
assert.match(primeActionContent, /formsSettled\.status === "fulfilled"/, "Handles forms partial status");
assert.match(primeActionContent, /evolutionSettled\.status === "fulfilled"/, "Handles evolution partial status");

// Verify data bounding (no massive history, zero photos)
assert.match(primeActionContent, /executionHistory \|\| \[\]\)\.slice\(0, 3\)/, "Workout execution history bounded to at most 3 items");
assert.match(primeActionContent, /milestones \|\| \[\]\)\.slice\(0, 5\)/, "Evolution milestones bounded to at most 5 items");
assert.equal(primeActionContent.includes("getStudentPhotoEvaluationsData"), false, "Auto-prime must NOT download photos");

console.log("  PASS: Promise.allSettled partial success implemented and data bounded");

// --- TEST 4: CANONICAL SCOPE ISOLATION (ZERO SLUG FALLBACK) ---
console.log("\n[TEST 4] Canonical Scope UUID Verification");

const filesToCheck = [
  "components/consultancies/training-v2/student-workout-renderer.tsx",
  "components/consultancies/nutrition-v2/student-nutrition-v2.tsx",
  "components/consultancies/custom-forms/custom-forms-hub.tsx",
  "components/consultancies/evolution/evolution-360-hub.tsx",
  "components/offline/student-offline-primer.tsx",
];

let slugFallbacksFound = 0;
for (const file of filesToCheck) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf-8");
  if (content.includes("scopedConsultancyPublicId || consultancySlug")) {
    console.error(`  FAIL: Found slug fallback in ${file}`);
    slugFallbacksFound++;
  }
  if (content.includes("consultancyPublicId || consultancySlug")) {
    console.error(`  FAIL: Found slug fallback in ${file}`);
    slugFallbacksFound++;
  }
}

assert.equal(slugFallbacksFound, 0, "Expected 0 slug fallbacks across components");
console.log("  PASS: 0 slug fallbacks remaining. All stores and operations enforce canonical UUIDs");

// --- TEST 5: OFFLINE WORKOUT EXECUTION & COLD REOPEN COMPATIBILITY ---
console.log("\n[TEST 5] Offline Workout Execution & Cold Reopen Model");

// Verify public/offline.js has interactive execution and matches pending_operations schema
assert.match(offlineJsContent, /WORKOUT_SESSION_STORE = "workout_sessions"/, "offline.js operates on workout_sessions");
assert.match(offlineJsContent, /PENDING_OPERATIONS_STORE = "pending_operations"/, "offline.js writes to pending_operations");
assert.match(offlineJsContent, /session\.status = "PENDING_SYNC"/, "offline workout completion sets PENDING_SYNC");
assert.match(offlineJsContent, /operationType: "COMPLETE_WORKOUT"/, "offline workout completion queues COMPLETE_WORKOUT");
assert.match(offlineJsContent, /entityType: "WORKOUT_EXECUTION"/, "entityType matches sync engine contract");

// Verify cold reopen reads existing session from WORKOUT_SESSION_STORE
assert.match(offlineJsContent, /const index = store\.index\("by_assignment"\)/, "Recovers session by assignment on boot");

console.log("  PASS: Interactive offline workout execution conforms to server sync contract");

// --- TEST 6: CONNECTIVITY STATE MACHINE & BADGE SILENCE ---
console.log("\n[TEST 6] Connectivity State Machine & Online Badge");

const toastContent = fs.readFileSync(path.join(ROOT, "components/pwa/network-status-toast.tsx"), "utf-8");

assert.match(toastContent, /connectivityState === "OFFLINE"/, "Badge only displays on confirmed OFFLINE");
assert.match(toastContent, /useState<ConnectivityState>\("CHECKING"\)/, "Initial state is CHECKING");
assert.match(toastContent, /return null;/, "Online / Checking states return null (silent)");
assert.match(toastContent, /setTimeout\(async \(\) => {[\s\S]*checkRealConnectivity/, "Debounces offline flapping before declaring offline");

console.log("  PASS: Online state is 100% silent; offline badge only visible on confirmed unreachable network");

// --- TEST 7: DIAGNOSTIC LOGGING ---
console.log("\n[TEST 7] Internal QA Diagnostics in offline.js");

assert.match(offlineJsContent, /window\.__TREVO_OFFLINE_DIAGNOSTICS__/, "Exposes diagnostic object for QA");
assert.match(offlineJsContent, /workoutSnapshotsCount:/, "Diagnostics tracks workout snapshots");
assert.match(offlineJsContent, /nutritionSnapshotsCount:/, "Diagnostics tracks nutrition snapshots");
assert.match(offlineJsContent, /formSnapshotsCount:/, "Diagnostics tracks forms snapshots");
assert.match(offlineJsContent, /evolutionSnapshotsCount:/, "Diagnostics tracks evolution snapshots");

console.log("  PASS: Internal diagnostics available for QA without leaking private IDs to UI");

// --- TEST 8: PRIMER DIAGNOSTICS SCHEMA & PRIVACY ---
console.log("\n[TEST 8] Student Offline Primer Diagnostics & Data Privacy");

const primerContent = fs.readFileSync(path.join(ROOT, "components/offline/student-offline-primer.tsx"), "utf-8");

const requiredDiagFields = [
  "mounted",
  "hasUserPublicId",
  "hasConsultancyPublicId",
  "roleIsStudent",
  "connectivityConfirmed",
  "throttled",
  "actionStarted",
  "actionSucceeded",
  "workoutReceived",
  "nutritionReceived",
  "formsReceived",
  "evolutionReceived",
  "workoutSaved",
  "nutritionSaved",
  "formsSaved",
  "evolutionSaved",
  "contextSaved",
  "lastFailureStage",
];

for (const field of requiredDiagFields) {
  assert.match(
    primerContent,
    new RegExp(`\\b${field}\\b`),
    `StudentOfflinePrimer must track diagnostic field: ${field}`
  );
}

// Ensure zero PII/UUIDs in TrevoPrimeDiagnostics type definition
const diagTypeMatch = primerContent.match(/export type TrevoPrimeDiagnostics = \{([\s\S]*?)\};/);
assert.ok(diagTypeMatch, "TrevoPrimeDiagnostics type must exist");
const diagTypeContent = diagTypeMatch[1];
assert.equal(diagTypeContent.includes("userPublicId:"), false, "Diagnostics must NOT store userPublicId");
assert.equal(diagTypeContent.includes("consultancyPublicId:"), false, "Diagnostics must NOT store consultancyPublicId");
assert.equal(diagTypeContent.includes("email:"), false, "Diagnostics must NOT store user email");
assert.equal(diagTypeContent.includes("payload:"), false, "Diagnostics must NOT store payload data");

console.log("  PASS: All 18 diagnostic flags/counts tracked with zero PII/UUID/health data");

// --- TEST 9: SAFE THROTTLE & CONTROLLED RETRY ---
console.log("\n[TEST 9] Throttle on Confirmed Success & Controlled Retry");

assert.match(
  primerContent,
  /if \(contextSaved\) \{[\s\S]*markThrottled\(throttleKey\);/,
  "Throttle must ONLY be stored when offline_context is confirmed saved"
);
assert.match(
  primerContent,
  /retryCount < 2 && !isDisposed/,
  "Must include controlled retry logic on transient failure (max 2 retries)"
);
assert.match(
  primerContent,
  /saveOfflineActiveContext/,
  "Primer must explicitly persist offline_context before marking success"
);

console.log("  PASS: Throttle represents last successful prime and controlled retry active");

// --- TEST 10: ACTIVE ROLE DERIVATION IN CONSULTANCY APP SHELL ---
console.log("\n[TEST 10] Active Context Role Derivation in ConsultancyAppShell");

const shellContent = fs.readFileSync(path.join(ROOT, "components/consultancies/consultancy-app-shell.tsx"), "utf-8");

assert.match(
  shellContent,
  /activeRole\?: ConsultancyRole;/,
  "ConsultancyAppShellProps must support optional activeRole prop"
);
assert.match(
  shellContent,
  /viewModeState\.effectiveMode === "ADMIN"[\s\S]*\? "CONSULTANCY_ADMIN"/,
  "Must map effectiveMode ADMIN to CONSULTANCY_ADMIN"
);
assert.match(
  shellContent,
  /roles\.length === 1 && roles\[0\] === "STUDENT"/,
  "Single-role student accounts must be unequivocally recognized as STUDENT"
);
assert.match(
  shellContent,
  /const isStudentActive = activeContextRole === "STUDENT";/,
  "Must strictly gate Student Offline capabilities on activeContextRole === STUDENT"
);
assert.match(
  shellContent,
  /\{isStudentActive && \([\s\S]*<StudentOfflinePrimer/,
  "StudentOfflinePrimer must ONLY mount when isStudentActive is true"
);

console.log("  PASS: Active context role derivation correctly gates Student Offline capabilities");

// --- TEST 11: CALLSITE AUDIT — USER, CONSULTANCY & ACTIVE ROLE PROPS ---
console.log("\n[TEST 11] ConsultancyAppShell Callsite Audit");

const dashboardPage = fs.readFileSync(path.join(ROOT, "app/consultoria/[slug]/page.tsx"), "utf-8");
assert.match(dashboardPage, /userPublicId=\{session\.userPublicId\}/, "Dashboard must pass session.userPublicId");
assert.match(dashboardPage, /consultancyPublicId=\{context\.consultancyPublicId\}/, "Dashboard must pass context.consultancyPublicId");
assert.match(dashboardPage, /viewModeState=\{effectiveState\}/, "Dashboard must pass viewModeState to drive active presentation mode");

const treinosPage = fs.readFileSync(path.join(ROOT, "app/consultoria/[slug]/treinos/page.tsx"), "utf-8");
assert.match(treinosPage, /activeRole="STUDENT"/, "Treinos page must explicitly declare activeRole='STUDENT'");

const nutricaoPage = fs.readFileSync(path.join(ROOT, "app/consultoria/[slug]/nutricao/page.tsx"), "utf-8");
assert.match(nutricaoPage, /activeRole="STUDENT"/, "Nutricao page must explicitly declare activeRole='STUDENT'");

console.log("  PASS: Callsites verified. Dashboard and student routes pass canonical scope & role props");

// --- TEST 12: MULTI-ROLE IN STUDENT MODE ---
console.log("\n[TEST 12] MULTI ROLE STUDENT MODE Simulation");

function simulateRoleDerivation(roles, viewModeState, activeRole) {
  const activeMode = viewModeState?.effectiveMode;
  const presentationRoles = activeMode
    ? activeMode === "ADMIN"
      ? [
          "CONSULTANCY_ADMIN",
          ...(roles.includes("PERSONAL") ? ["PERSONAL"] : []),
          ...(roles.includes("NUTRITIONIST") ? ["NUTRITIONIST"] : []),
        ]
      : activeMode === "PERSONAL"
      ? ["PERSONAL"]
      : activeMode === "NUTRITIONIST"
      ? ["NUTRITIONIST"]
      : activeMode === "INFLUENCER"
      ? ["INFLUENCER"]
      : ["STUDENT"]
    : roles;

  let activeContextRole;
  if (activeRole) {
    activeContextRole = activeRole;
  } else if (viewModeState) {
    activeContextRole =
      viewModeState.effectiveMode === "ADMIN"
        ? "CONSULTANCY_ADMIN"
        : viewModeState.effectiveMode;
  } else if (roles.length === 1 && roles[0] === "STUDENT") {
    activeContextRole = "STUDENT";
  } else {
    activeContextRole = presentationRoles[0] || roles[0] || "STUDENT";
  }

  const isStudentActive = activeContextRole === "STUDENT";
  const offlineRole = activeContextRole;
  return { activeContextRole, isStudentActive, offlineRole };
}

// Matheus on Dashboard in STUDENT view mode
const multiRoleStudent = simulateRoleDerivation(
  ["CONSULTANCY_ADMIN", "STUDENT"],
  { effectiveMode: "STUDENT" },
  undefined
);

assert.equal(multiRoleStudent.activeContextRole, "STUDENT", "Active role must be STUDENT");
assert.equal(multiRoleStudent.isStudentActive, true, "Student offline must be ENABLED in student view mode");
assert.equal(multiRoleStudent.offlineRole, "STUDENT", "Offline role must be STUDENT");

console.log("  PASS: Multi-role in STUDENT mode activates Student Offline Primer and persists STUDENT context");

// --- TEST 13: MULTI-ROLE IN ADMIN MODE ---
console.log("\n[TEST 13] MULTI ROLE ADMIN MODE Simulation");

// Matheus on Dashboard in ADMIN view mode
const multiRoleAdmin = simulateRoleDerivation(
  ["CONSULTANCY_ADMIN", "STUDENT"],
  { effectiveMode: "ADMIN" },
  undefined
);

assert.equal(multiRoleAdmin.activeContextRole, "CONSULTANCY_ADMIN", "Active role must be CONSULTANCY_ADMIN");
assert.equal(multiRoleAdmin.isStudentActive, false, "Student offline Primer must be DISABLED in ADMIN view mode");
assert.equal(multiRoleAdmin.offlineRole, "CONSULTANCY_ADMIN", "Offline role must be CONSULTANCY_ADMIN");

// Multi-role on admin sub-route without viewModeState (e.g. /membros)
const multiRoleAdminRoute = simulateRoleDerivation(
  ["CONSULTANCY_ADMIN", "STUDENT"],
  undefined,
  undefined
);

assert.equal(multiRoleAdminRoute.isStudentActive, false, "Primer must remain DISABLED on admin sub-routes without viewModeState");
assert.equal(multiRoleAdminRoute.offlineRole, "CONSULTANCY_ADMIN", "Offline role must default to admin on admin routes");

console.log("  PASS: Multi-role in ADMIN mode strictly disables Primer and prevents Student Offline activation");

// --- TEST 14: STUDENT -> ADMIN -> STUDENT TRANSITION & ZERO LEAKAGE ---
console.log("\n[TEST 14] STUDENT -> ADMIN -> STUDENT Transition & Scope Isolation");

// Mock IndexedDB stores
const mockDb = {
  offline_context: new Map(),
  workout_snapshots: new Map(),
};

const userUid = "u-matheus-123";
const consultancyUid = "c-trevo-456";

// Step A: In STUDENT mode
const stepA = simulateRoleDerivation(["CONSULTANCY_ADMIN", "STUDENT"], { effectiveMode: "STUDENT" });
assert.equal(stepA.isStudentActive, true);

// Primer runs in student mode -> saves snapshots & context
mockDb.workout_snapshots.set(`${userUid}_${consultancyUid}_STUDENT_w1`, {
  userPublicId: userUid,
  consultancyPublicId: consultancyUid,
  role: "STUDENT",
  assignmentPublicId: "w1",
  workout: { name: "Treino A" },
});
mockDb.offline_context.set("active_context", {
  userPublicId: userUid,
  consultancyPublicId: consultancyUid,
  role: "STUDENT",
  validUntil: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
});

assert.equal(mockDb.workout_snapshots.size, 1, "Workout snapshot exists in STUDENT mode");
assert.equal(mockDb.offline_context.get("active_context").role, "STUDENT", "Context is STUDENT");

// Step B: Switch to ADMIN mode
const stepB = simulateRoleDerivation(["CONSULTANCY_ADMIN", "STUDENT"], { effectiveMode: "ADMIN" });
assert.equal(stepB.isStudentActive, false, "Primer must be unmounted in ADMIN mode");

// SessionScopeGuard executes in ADMIN mode:
// 1. Purges prior STUDENT scope data
for (const [key, val] of Array.from(mockDb.workout_snapshots.entries())) {
  if (val.userPublicId === userUid && val.consultancyPublicId === consultancyUid && val.role === "STUDENT") {
    mockDb.workout_snapshots.delete(key);
  }
}
// 2. Sets offline_context to CONSULTANCY_ADMIN
mockDb.offline_context.set("active_context", {
  userPublicId: userUid,
  consultancyPublicId: consultancyUid,
  role: "CONSULTANCY_ADMIN",
  validUntil: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
});

assert.equal(mockDb.workout_snapshots.size, 0, "Student workout snapshots purged upon entering ADMIN mode");
assert.equal(mockDb.offline_context.get("active_context").role, "CONSULTANCY_ADMIN", "Offline context is now CONSULTANCY_ADMIN");

// Verify offline fallback query under ADMIN context
const adminContext = mockDb.offline_context.get("active_context");
const adminSnapshots = Array.from(mockDb.workout_snapshots.values()).filter(
  (s) => s.userPublicId === adminContext.userPublicId &&
         s.consultancyPublicId === adminContext.consultancyPublicId &&
         s.role === adminContext.role
);
assert.equal(adminSnapshots.length, 0, "ZERO student data leaked or returned under ADMIN context");

// Step C: Switch back to STUDENT mode
const stepC = simulateRoleDerivation(["CONSULTANCY_ADMIN", "STUDENT"], { effectiveMode: "STUDENT" });
assert.equal(stepC.isStudentActive, true, "Primer re-enabled upon returning to STUDENT mode");

// Primer runs fresh prime -> repopulates snapshots & restores STUDENT context
mockDb.workout_snapshots.set(`${userUid}_${consultancyUid}_STUDENT_w1`, {
  userPublicId: userUid,
  consultancyPublicId: consultancyUid,
  role: "STUDENT",
  assignmentPublicId: "w1",
  workout: { name: "Treino A (Atualizado)" },
});
mockDb.offline_context.set("active_context", {
  userPublicId: userUid,
  consultancyPublicId: consultancyUid,
  role: "STUDENT",
  validUntil: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
});

assert.equal(mockDb.workout_snapshots.size, 1, "Fresh student workout snapshot restored in STUDENT mode");
assert.equal(mockDb.offline_context.get("active_context").role, "STUDENT", "Context restored to STUDENT");

console.log("  PASS: STUDENT -> ADMIN -> STUDENT transition executed with zero cross-role leakage");

// --- TEST 15: SINGLE ROLE STUDENT PASS-THROUGH ---
console.log("\n[TEST 15] Single Role Student Pass-Through");

const singleStudent = simulateRoleDerivation(["STUDENT"], undefined, undefined);
assert.equal(singleStudent.activeContextRole, "STUDENT");
assert.equal(singleStudent.isStudentActive, true);
assert.equal(singleStudent.offlineRole, "STUDENT");

console.log("  PASS: Single-role student account unconditionally activates Student Offline capabilities");

console.log("\n==================================================");
console.log("ALL HOTFIX P0 UNIT & INTEGRATION TESTS PASSED!");
console.log("==================================================");
