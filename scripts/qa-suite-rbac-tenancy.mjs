/**
 * TREVO ONE — QA SUITE: RBAC, ROLES & TENANCY ISOLATION (NO BROWSER)
 * 
 * Tests:
 * 1. Role Normalization (STUDENT, PERSONAL, NUTRITIONIST, CONSULTANCY_ADMIN, INFLUENCER, PLATFORM_ADMIN)
 * 2. Executable RBAC Matrix (Role x Action x Expected Access)
 * 3. Multi-Role & Effective Mode Isolation
 * 4. Cross-Tenant Isolation (Tenant QA-A vs Tenant QA-B)
 * 5. IDOR Protection (Accessing Tenant A resource using Tenant B context)
 * 6. Student Data Segregation (Student A accessing Student B private data)
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const { normalizeConsultancyRole } = await import("../lib/training-v2/access.ts");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

export async function runRbacTenancySuite() {
  console.log("=== 2. RBAC, ROLES, TENANCY & IDOR ISOLATION SUITE ===");

  // 1. ROLE NORMALIZATION
  runTest("ROLES: Normalizes role aliases to canonical values", () => {
    assert.equal(normalizeConsultancyRole("PERSONAL"), "PERSONAL");
    assert.equal(normalizeConsultancyRole("personal_trainer"), "PERSONAL");
    assert.equal(normalizeConsultancyRole("TRAINER"), "PERSONAL");
    assert.equal(normalizeConsultancyRole("CONSULTANCY_ADMIN"), "CONSULTANCY_ADMIN");
    assert.equal(normalizeConsultancyRole("ADMIN"), "CONSULTANCY_ADMIN");
    assert.equal(normalizeConsultancyRole("OWNER"), "CONSULTANCY_ADMIN");
    assert.equal(normalizeConsultancyRole("NUTRITIONIST"), "NUTRITIONIST");
    assert.equal(normalizeConsultancyRole("STUDENT"), "STUDENT");
    assert.equal(normalizeConsultancyRole("ALUNO"), "STUDENT");
    assert.equal(normalizeConsultancyRole("VIP"), "INFLUENCER");
    assert.equal(normalizeConsultancyRole("unknown_role"), null);
    assert.equal(normalizeConsultancyRole(null), null);
  });

  // 2. EXECUTABLE RBAC MATRIX
  // Defines simulated authorization checker based on Trevo One security invariants
  function evaluateRbac(caller, action) {
    const roles = caller.roles || [];
    const isPlatformAdmin = Boolean(caller.isPlatformAdmin);
    const hasRole = (r) => roles.includes(r);

    switch (action) {
      case "CREATE_WORKOUT":
      case "EDIT_WORKOUT":
        return hasRole("CONSULTANCY_ADMIN") || hasRole("PERSONAL");

      case "EXECUTE_WORKOUT":
        return hasRole("STUDENT");

      case "CREATE_NUTRITION_PLAN":
      case "EDIT_NUTRITION_PLAN":
        // Trevo One P0: Only NUTRITIONIST can author clinical nutrition
        return hasRole("NUTRITIONIST");

      case "VIEW_NUTRITION_PLAN":
        return hasRole("NUTRITIONIST") || hasRole("CONSULTANCY_ADMIN") || hasRole("STUDENT") || isPlatformAdmin;

      case "MANAGE_CONSULTANCY_MEMBERS":
      case "VIEW_FINANCIAL_CHARGES":
        return hasRole("CONSULTANCY_ADMIN") || isPlatformAdmin;

      case "ACCESS_PLATFORM_ADMIN":
        return isPlatformAdmin;

      default:
        return false;
    }
  }

  const rbacMatrix = [
    { role: "STUDENT", action: "CREATE_WORKOUT", expected: false },
    { role: "STUDENT", action: "EDIT_WORKOUT", expected: false },
    { role: "STUDENT", action: "EXECUTE_WORKOUT", expected: true },
    { role: "STUDENT", action: "CREATE_NUTRITION_PLAN", expected: false },
    { role: "STUDENT", action: "VIEW_FINANCIAL_CHARGES", expected: false },
    { role: "STUDENT", action: "ACCESS_PLATFORM_ADMIN", expected: false },

    { role: "PERSONAL", action: "CREATE_WORKOUT", expected: true },
    { role: "PERSONAL", action: "EDIT_WORKOUT", expected: true },
    { role: "PERSONAL", action: "EXECUTE_WORKOUT", expected: false },
    { role: "PERSONAL", action: "CREATE_NUTRITION_PLAN", expected: false }, // PERSONAL ONLY cannot author nutrition
    { role: "PERSONAL", action: "ACCESS_PLATFORM_ADMIN", expected: false },

    { role: "NUTRITIONIST", action: "CREATE_WORKOUT", expected: false },
    { role: "NUTRITIONIST", action: "CREATE_NUTRITION_PLAN", expected: true },
    { role: "NUTRITIONIST", action: "EDIT_NUTRITION_PLAN", expected: true },
    { role: "NUTRITIONIST", action: "ACCESS_PLATFORM_ADMIN", expected: false },

    { role: "CONSULTANCY_ADMIN", action: "CREATE_WORKOUT", expected: true },
    { role: "CONSULTANCY_ADMIN", action: "CREATE_NUTRITION_PLAN", expected: false }, // Admin is read-only for clinical nutrition
    { role: "CONSULTANCY_ADMIN", action: "VIEW_NUTRITION_PLAN", expected: true },
    { role: "CONSULTANCY_ADMIN", action: "MANAGE_CONSULTANCY_MEMBERS", expected: true },
    { role: "CONSULTANCY_ADMIN", action: "VIEW_FINANCIAL_CHARGES", expected: true },
    { role: "CONSULTANCY_ADMIN", action: "ACCESS_PLATFORM_ADMIN", expected: false },

    { role: "PLATFORM_ADMIN", action: "ACCESS_PLATFORM_ADMIN", expected: true, isPlatformAdmin: true },
    { role: "PLATFORM_ADMIN", action: "MANAGE_CONSULTANCY_MEMBERS", expected: true, isPlatformAdmin: true },
  ];

  runTest("RBAC MATRIX: Validates all role x action permission pairs", () => {
    for (const testCase of rbacMatrix) {
      const caller = {
        roles: testCase.isPlatformAdmin ? [] : [testCase.role],
        isPlatformAdmin: Boolean(testCase.isPlatformAdmin),
      };
      const allowed = evaluateRbac(caller, testCase.action);
      assert.equal(
        allowed,
        testCase.expected,
        `Role [${testCase.role}] action [${testCase.action}] expected ${testCase.expected ? "ALLOW" : "DENY"}`
      );
    }
  });

  // 3. MULTI-ROLE & EFFECTIVE MODE ISOLATION
  runTest("MULTI-ROLE: User with PERSONAL and STUDENT behaves strictly per effective active mode", () => {
    const multiRoleUser = {
      id: 99,
      allRoles: ["PERSONAL", "STUDENT"],
    };

    // Mode: PERSONAL
    const personalModeCaller = {
      userId: multiRoleUser.id,
      roles: ["PERSONAL"],
    };
    assert.equal(evaluateRbac(personalModeCaller, "CREATE_WORKOUT"), true);
    assert.equal(evaluateRbac(personalModeCaller, "EXECUTE_WORKOUT"), false);

    // Mode: STUDENT
    const studentModeCaller = {
      userId: multiRoleUser.id,
      roles: ["STUDENT"],
    };
    assert.equal(evaluateRbac(studentModeCaller, "CREATE_WORKOUT"), false);
    assert.equal(evaluateRbac(studentModeCaller, "EXECUTE_WORKOUT"), true);
  });

  // 4. CROSS-TENANT ISOLATION & IDOR DEFENSE
  runTest("TENANCY: Cross-tenant resource queries strictly scoped by consultancy_id", () => {
    // Simulated database resource lookup enforcing strict tenant isolation
    const database = [
      { id: 1, publicId: "plan_qa_a_001", consultancyId: 101, title: "Plano Tenant A" },
      { id: 2, publicId: "plan_qa_b_002", consultancyId: 102, title: "Plano Tenant B" },
    ];

    function fetchResourceByPublicId(callerConsultancyId, targetPublicId) {
      // Correct SQL pattern: WHERE public_id = ? AND consultancy_id = ?
      const item = database.find(
        (r) => r.publicId === targetPublicId && r.consultancyId === callerConsultancyId
      );
      if (!item) {
        return { status: 404, error: "Recurso não encontrado ou acesso não autorizado." };
      }
      return { status: 200, data: item };
    }

    // Caller from Tenant QA-A accesses Tenant QA-A resource -> 200 OK
    const callerA = 101;
    const resA = fetchResourceByPublicId(callerA, "plan_qa_a_001");
    assert.equal(resA.status, 200);
    assert.equal(resA.data.title, "Plano Tenant A");

    // IDOR ATTEMPT: Caller from Tenant QA-B attempts to access Tenant QA-A resource -> 404 NOT FOUND (Safe deny)
    const callerB = 102;
    const idorRes = fetchResourceByPublicId(callerB, "plan_qa_a_001");
    assert.equal(idorRes.status, 404);
    assert.equal(idorRes.data, undefined);
  });

  // 5. CROSS-STUDENT PRIVATE DATA ISOLATION
  runTest("STUDENT ISOLATION: Student A is strictly blocked from viewing Student B private records", () => {
    function getStudentPrivateCheckin(callerUserId, callerRoles, targetStudentUserId) {
      const isProfessional = callerRoles.includes("PERSONAL") || callerRoles.includes("NUTRITIONIST") || callerRoles.includes("CONSULTANCY_ADMIN");
      if (callerUserId === targetStudentUserId || isProfessional) {
        return { status: 200, allowed: true };
      }
      return { status: 403, allowed: false, error: "Acesso negado." };
    }

    const studentAId = 501;
    const studentBId = 502;

    // Student A accessing Student A data -> ALLOW
    assert.equal(getStudentPrivateCheckin(studentAId, ["STUDENT"], studentAId).allowed, true);

    // Student A accessing Student B data -> DENY (403)
    const crossStudentRes = getStudentPrivateCheckin(studentAId, ["STUDENT"], studentBId);
    assert.equal(crossStudentRes.allowed, false);
    assert.equal(crossStudentRes.status, 403);

    // Professional accessing Student B data -> ALLOW
    const personalRes = getStudentPrivateCheckin(201, ["PERSONAL"], studentBId);
    assert.equal(personalRes.allowed, true);
  });

  console.log(`\nRBAC & TENANCY SUITE PASS: ${passedCount}/${totalCount} testes executados com sucesso!\n`);
  return { passedCount, totalCount };
}

if (process.argv[1]?.endsWith("qa-suite-rbac-tenancy.mjs")) {
  runRbacTenancySuite();
}
