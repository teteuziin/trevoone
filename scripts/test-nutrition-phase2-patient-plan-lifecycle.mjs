/**
 * TREVO ONE — NUTRIÇÃO FASE 2 TEST SUITE
 * Edição do Plano da Paciente sem Atrito: Draft + Publicação + Atualização da Prescrição
 *
 * Verifies all 23 mandatory criteria:
 * 1. EDIT PUBLISHED FROM PATIENT
 * 2. PUBLISHED REMAINS IMMUTABLE
 * 3. DRAFT CREATED
 * 4. DRAFT REUSED
 * 5. MULTIPLE EDIT CLICKS SAME DRAFT
 * 6. DRAFT NOT VISIBLE TO STUDENT
 * 7. PUBLISH UPDATE
 * 8. PATIENT ASSIGNMENT UPDATED
 * 9. OLD ASSIGNMENT ARCHIVED
 * 10. OLD VERSION PRESERVED
 * 11. PATIENT HUB REFRESHES
 * 12. STUDENT RECEIVES NEW PUBLISHED
 * 13. OTHER PATIENTS NOT UPDATED
 * 14. SHARED PLAN SAFETY
 * 15. GLOBAL PLAN EDIT DOES NOT AUTO-UPDATE PATIENTS
 * 16. TEMPLATE ORIGINAL UNCHANGED
 * 17. AI IMPORTED PLAN EDITABLE
 * 18. PERSONAL BLOCKED
 * 19. MULTI-ROLE
 * 20. TENANCY
 * 21. MOBILE FLOW
 * 22. DESKTOP FLOW
 * 23. LEGACY ASSIGNMENT FLOW
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== TREVO ONE: NUTRITION PHASE 2 PATIENT PLAN LIFECYCLE TESTS ===\n");

const {
  getPatientPlanState,
  startPatientPlanEdit,
  publishPatientPlanUpdate,
  discardPatientPlanDraft,
} = await import("../lib/nutrition-v2/patient-plan-lifecycle.ts");

const {
  createPlanWithDraftVersion,
  publishPlanVersion,
  getPlanVersionTreeByPlanPublicId,
  addMeal,
  addMealItem,
} = await import("../lib/nutrition-v2/plan-repository.ts");

const {
  assignPlanVersion,
  getActiveNutritionPlanForStudentMembership,
} = await import("../lib/nutrition-v2/assignment-repository.ts");

async function assignStudentPlan(ctx, studentPublicId, planPublicId, versionPublicId) {
  return await assignPlanVersion(ctx, {
    planPublicId,
    versionPublicId,
    studentMembershipPublicId: studentPublicId,
    forceReplace: true,
  });
}

async function getStudentPlan(consultancyId, studentId) {
  return await getActiveNutritionPlanForStudentMembership(consultancyId, studentId);
}

const { getDbPool } = await import("../lib/db/mysql.ts");

const pool = getDbPool();

function makeContext({
  userId = 3,
  membershipId = 1,
  consultancyId = 1,
  consultancyPublicId = "test-consultancy-phase2",
  roles = ["NUTRITIONIST"],
  isPlatformAdmin = false,
} = {}) {
  const hasRole = (r) => roles.includes(r);
  const canAuthorNutrition = hasRole("NUTRITIONIST");
  const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
  const canViewNutrition = canAuthorNutrition || canManageConsultancy || isPlatformAdmin;
  const isStudent = hasRole("STUDENT");

  return {
    userId,
    userPublicId: `usr-phase2-${userId}`,
    membershipId,
    membershipPublicId: `mem-phase2-${membershipId}`,
    isPlatformAdmin,
    consultancyId,
    consultancyPublicId,
    roles,
    hasRole,
    canAuthorNutrition,
    canManageConsultancy,
    canViewNutrition,
    isStudent,
    isPersonal: hasRole("PERSONAL"),
    isNutritionist: hasRole("NUTRITIONIST"),
  };
}

let passedCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Ensure mock students and consultancy for integration tests
const timestamp = Date.now();
const testConsultancyId = 1;
const testUserId = 3;

import crypto from "node:crypto";

// Helper to create a student membership in DB
async function createTestStudentMembership(namePrefix) {
  const email = `${namePrefix}-${timestamp}@example.com`;
  const userPublicId = crypto.randomUUID();
  const [userRes] = await pool.query(
    `INSERT INTO users (public_id, full_name, email, password_hash, created_at)
     VALUES (?, ?, ?, 'mock_hash', NOW())`,
    [userPublicId, `Student ${namePrefix}`, email]
  );
  const userId = userRes.insertId;
  const publicId = crypto.randomUUID();

  const [memRes] = await pool.query(
    `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())`,
    [publicId, testConsultancyId, userId]
  );
  const memId = memRes.insertId;

  await pool.query(
    `INSERT INTO consultancy_member_roles (member_id, role)
     VALUES (?, 'STUDENT')`,
    [memId]
  );

  return { id: memId, publicId, userId, fullName: `Student ${namePrefix}` };
}

async function populateValidPlan(ctx, planPublicId, versionPublicId) {
  const meal = await addMeal(ctx, versionPublicId, {
    title: "Café da Manhã",
    scheduledTime: "08:00",
  });
  await addMealItem(ctx, meal.mealPublicId, {
    customName: "Ovo Cozido",
    prescribedQuantity: 100,
    prescribedUnitCode: "g",
    prescribedUnitLabel: "gramas",
  });
}

try {
  // Setup 3 students: Anny, Carol, Maria
  const anny = await createTestStudentMembership(`Anny-${timestamp}`);
  const carol = await createTestStudentMembership(`Carol-${timestamp}`);
  const maria = await createTestStudentMembership(`Maria-${timestamp}`);

  const ctxNutritionist = makeContext({ userId: testUserId, consultancyId: testConsultancyId, roles: ["NUTRITIONIST"] });
  const ctxPersonal = makeContext({ userId: 4, consultancyId: testConsultancyId, roles: ["PERSONAL"] });
  const ctxMultiRole = makeContext({ userId: 5, consultancyId: testConsultancyId, roles: ["PERSONAL", "NUTRITIONIST"] });

  // 1. Setup an initial published plan
  const initialPlan = await createPlanWithDraftVersion(ctxNutritionist, {
    title: `Plano Base Trevo One ${timestamp}`,
    goal: "Hipertrofia",
  });

  await populateValidPlan(ctxNutritionist, initialPlan.planPublicId, initialPlan.versionPublicId);
  const publishedV1 = await publishPlanVersion(ctxNutritionist, initialPlan.planPublicId, initialPlan.versionPublicId);

  // Assign this published plan to both Anny and Carol (Shared Plan scenario)
  await assignStudentPlan(ctxNutritionist, anny.publicId, initialPlan.planPublicId, publishedV1.versionPublicId);
  await assignStudentPlan(ctxNutritionist, carol.publicId, initialPlan.planPublicId, publishedV1.versionPublicId);

  // TEST 1: EDIT PUBLISHED FROM PATIENT
  await test("EDIT PUBLISHED FROM PATIENT: PASS", async () => {
    const editRes = await startPatientPlanEdit(ctxNutritionist, anny.publicId);
    assert.ok(editRes, "Should return an edit result");
    assert.ok(editRes.planPublicId, "Should have planPublicId");
    assert.ok(editRes.versionPublicId, "Should have versionPublicId");
    assert.strictEqual(editRes.studentMembershipPublicId, anny.publicId);
  });

  // TEST 2: PUBLISHED REMAINS IMMUTABLE
  await test("PUBLISHED REMAINS IMMUTABLE: PASS", async () => {
    const tree = await getPlanVersionTreeByPlanPublicId(ctxNutritionist, initialPlan.planPublicId, publishedV1.versionPublicId);
    assert.strictEqual(tree.version.status, "PUBLISHED", "Original version must still be PUBLISHED");
    assert.strictEqual(tree.version.versionNumber, 1);
  });

  // TEST 3: DRAFT CREATED
  let annyDraft = null;
  await test("DRAFT CREATED: PASS", async () => {
    const state = await getPatientPlanState(ctxNutritionist, anny.publicId);
    assert.ok(state.draftPlan, "Patient state must include draftPlan");
    assert.ok(state.draftPlan.versionPublicId, "Must have draft versionPublicId");
    annyDraft = state.draftPlan;
  });

  // TEST 4: DRAFT REUSED
  await test("DRAFT REUSED: PASS", async () => {
    const editAgain = await startPatientPlanEdit(ctxNutritionist, anny.publicId);
    assert.strictEqual(editAgain.versionPublicId, annyDraft.versionPublicId, "Must reuse the existing draft version");
    assert.strictEqual(editAgain.isExistingDraft, true, "isExistingDraft must be true on reuse");
  });

  // TEST 5: MULTIPLE EDIT CLICKS SAME DRAFT
  await test("MULTIPLE EDIT CLICKS SAME DRAFT: PASS", async () => {
    const edit3 = await startPatientPlanEdit(ctxNutritionist, anny.publicId);
    const edit4 = await startPatientPlanEdit(ctxNutritionist, anny.publicId);
    assert.strictEqual(edit3.versionPublicId, annyDraft.versionPublicId);
    assert.strictEqual(edit4.versionPublicId, annyDraft.versionPublicId);
  });

  // TEST 6: DRAFT NOT VISIBLE TO STUDENT
  await test("DRAFT NOT VISIBLE TO STUDENT: PASS", async () => {
    const studentActivePlan = await getStudentPlan(testConsultancyId, anny.id);
    assert.ok(studentActivePlan, "Student should have active plan");
    assert.strictEqual(studentActivePlan.versionNumber, 1, "Student sees V1 while draft is uncommitted");
  });

  // TEST 7: PUBLISH UPDATE
  let publishedUpdateRes = null;
  await test("PUBLISH UPDATE: PASS", async () => {
    publishedUpdateRes = await publishPatientPlanUpdate(ctxNutritionist, {
      planPublicId: annyDraft.planPublicId,
      versionPublicId: annyDraft.versionPublicId,
      studentMembershipPublicId: anny.publicId,
    });
    assert.ok(publishedUpdateRes, "Publish update must return result");
    assert.ok(publishedUpdateRes.assignmentPublicId, "Should have created new active assignment");
    assert.strictEqual(publishedUpdateRes.studentMembershipPublicId, anny.publicId);
  });

  // TEST 8: PATIENT ASSIGNMENT UPDATED
  await test("PATIENT ASSIGNMENT UPDATED: PASS", async () => {
    const studentActivePlan = await getStudentPlan(testConsultancyId, anny.id);
    assert.ok(studentActivePlan);
    assert.strictEqual(studentActivePlan.assignmentPublicId, publishedUpdateRes.assignmentPublicId);
  });

  // TEST 9: OLD ASSIGNMENT ARCHIVED
  await test("OLD ASSIGNMENT ARCHIVED: PASS", async () => {
    const [rows] = await pool.query(
      `SELECT status, ends_on FROM nutrition_v2_assignments WHERE id = ?`,
      [publishedUpdateRes.archivedAssignmentId]
    );
    assert.strictEqual(rows[0].status, "ENDED", "Old assignment status must be ENDED");
    assert.ok(rows[0].ends_on !== null, "Old assignment ends_on must be set");
  });

  // TEST 10: OLD VERSION PRESERVED
  await test("OLD VERSION PRESERVED: PASS", async () => {
    const [rows] = await pool.query(
      `SELECT status, version_number FROM nutrition_v2_plan_versions WHERE public_id = ?`,
      [publishedV1.versionPublicId]
    );
    assert.strictEqual(rows[0].status, "PUBLISHED", "Old version remains PUBLISHED");
    assert.strictEqual(rows[0].version_number, 1);
  });

  // TEST 11: PATIENT HUB REFRESHES
  await test("PATIENT HUB REFRESHES: PASS", async () => {
    const state = await getPatientPlanState(ctxNutritionist, anny.publicId);
    assert.ok(state.activePlan);
    assert.strictEqual(state.activePlan.assignmentPublicId, publishedUpdateRes.assignmentPublicId);
    assert.strictEqual(state.draftPlan, null, "No draft plan should remain after publishing");
  });

  // TEST 12: STUDENT RECEIVES NEW PUBLISHED
  await test("STUDENT RECEIVES NEW PUBLISHED: PASS", async () => {
    const studentActivePlan = await getStudentPlan(testConsultancyId, anny.id);
    assert.strictEqual(studentActivePlan.planPublicId, publishedUpdateRes.planPublicId);
    assert.strictEqual(studentActivePlan.versionPublicId, publishedUpdateRes.versionPublicId);
  });

  // TEST 13: OTHER PATIENTS NOT UPDATED
  await test("OTHER PATIENTS NOT UPDATED: PASS", async () => {
    const carolActivePlan = await getStudentPlan(testConsultancyId, carol.id);
    assert.ok(carolActivePlan);
    assert.strictEqual(carolActivePlan.planPublicId, initialPlan.planPublicId, "Carol must still have initialPlan");
    assert.strictEqual(carolActivePlan.versionPublicId, publishedV1.versionPublicId, "Carol must still have V1");
  });

  // TEST 14: SHARED PLAN SAFETY
  await test("SHARED PLAN SAFETY: PASS", async () => {
    // Assign Maria to initialPlan so it has multiple active students (Carol and Maria)
    await assignStudentPlan(ctxNutritionist, maria.publicId, initialPlan.planPublicId, publishedV1.versionPublicId);

    // When editing Carol (who shares V1 with Maria), it must fork safely and not affect Maria or initialPlan
    const carolEdit = await startPatientPlanEdit(ctxNutritionist, carol.publicId);
    assert.ok(carolEdit);
    // Carol gets her own dedicated forked draft
    assert.notStrictEqual(carolEdit.planPublicId, initialPlan.planPublicId, "Shared plan must fork to dedicated plan");
    // Clean up Carol's draft via discard
    await discardPatientPlanDraft(ctxNutritionist, carol.publicId);

    // Maria still has initialPlan untouched
    const mariaPlan = await getStudentPlan(testConsultancyId, maria.id);
    assert.strictEqual(mariaPlan.planPublicId, initialPlan.planPublicId);
  });

  // TEST 15: GLOBAL PLAN EDIT DOES NOT AUTO-UPDATE PATIENTS
  await test("GLOBAL PLAN EDIT DOES NOT AUTO-UPDATE PATIENTS: PASS", async () => {
    // Assign initialPlan to Maria
    await assignStudentPlan(ctxNutritionist, maria.publicId, initialPlan.planPublicId, publishedV1.versionPublicId);

    // In global flow, publishPlanVersion does NOT update any assignments
    const { createNextDraftVersion } = await import("../lib/nutrition-v2/plan-repository.ts");
    const globalV2Draft = await createNextDraftVersion(ctxNutritionist, initialPlan.planPublicId);
    const globalV2Pub = await publishPlanVersion(ctxNutritionist, initialPlan.planPublicId, globalV2Draft.versionPublicId);

    // Maria's assignment remains on V1 (global edit does not push automatically)
    const mariaPlan = await getStudentPlan(testConsultancyId, maria.id);
    assert.strictEqual(mariaPlan.versionPublicId, publishedV1.versionPublicId, "Maria must still be on V1");
  });

  // TEST 16: TEMPLATE ORIGINAL UNCHANGED
  await test("TEMPLATE ORIGINAL UNCHANGED: PASS", async () => {
    const { createTemplateFromPlan, createPlanFromTemplate } = await import("../lib/nutrition-v2/template-repository.ts");

    // 1. Create a template from an existing plan
    const tmplRes = await createTemplateFromPlan(ctxNutritionist, {
      planPublicId: initialPlan.planPublicId,
      name: "Template Hipertrofia Base",
    });
    assert.ok(tmplRes.templatePublicId);

    // 2. Create a patient plan from template
    const planFromTmpl = await createPlanFromTemplate(ctxNutritionist, {
      templatePublicId: tmplRes.templatePublicId,
      title: "Plano Maria via Template",
    });

    // 3. Publish and assign to Maria
    await populateValidPlan(ctxNutritionist, planFromTmpl.planPublicId, planFromTmpl.versionPublicId);
    const tmplPlanV1 = await publishPlanVersion(ctxNutritionist, planFromTmpl.planPublicId, planFromTmpl.versionPublicId);
    await assignStudentPlan(ctxNutritionist, maria.publicId, planFromTmpl.planPublicId, tmplPlanV1.versionPublicId);

    // 4. Edit Maria's plan (generates draft)
    const editMaria = await startPatientPlanEdit(ctxNutritionist, maria.publicId);
    assert.ok(editMaria.versionPublicId);

    // 5. Publish Maria's update
    const mariaUpdated = await publishPatientPlanUpdate(ctxNutritionist, {
      planPublicId: editMaria.planPublicId,
      versionPublicId: editMaria.versionPublicId,
      studentMembershipPublicId: maria.publicId,
    });
    assert.ok(mariaUpdated.assignmentPublicId);

    // 6. Check that the original template is untouched
    const [tmplRows] = await pool.query(
      `SELECT name FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL`,
      [tmplRes.templatePublicId]
    );
    assert.strictEqual(tmplRows[0].name, "Template Hipertrofia Base", "Template original must remain unchanged");
  });

  // TEST 17: AI IMPORTED PLAN EDITABLE
  await test("AI IMPORTED PLAN EDITABLE: PASS", async () => {
    const aiPlan = await createPlanWithDraftVersion(ctxNutritionist, {
      title: "Plano Importado via IA",
      notes: "Importado de texto",
    });
    await populateValidPlan(ctxNutritionist, aiPlan.planPublicId, aiPlan.versionPublicId);
    const aiPub = await publishPlanVersion(ctxNutritionist, aiPlan.planPublicId, aiPlan.versionPublicId);

    await assignStudentPlan(ctxNutritionist, maria.publicId, aiPlan.planPublicId, aiPub.versionPublicId);

    const aiEdit = await startPatientPlanEdit(ctxNutritionist, maria.publicId);
    assert.ok(aiEdit.versionPublicId);

    const aiUpdate = await publishPatientPlanUpdate(ctxNutritionist, {
      planPublicId: aiEdit.planPublicId,
      versionPublicId: aiEdit.versionPublicId,
      studentMembershipPublicId: maria.publicId,
    });
    assert.ok(aiUpdate.assignmentPublicId);
  });

  // TEST 18: PERSONAL BLOCKED
  await test("PERSONAL BLOCKED: PASS", async () => {
    let threw = false;
    try {
      await startPatientPlanEdit(ctxPersonal, anny.publicId);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, "Personal without nutritionist role must be blocked");
  });

  // TEST 19: MULTI-ROLE
  await test("MULTI-ROLE: PASS", async () => {
    // Multi-role with NUTRITIONIST active
    const state = await getPatientPlanState(ctxMultiRole, anny.publicId);
    assert.ok(state.activePlan, "Multi-role with NUTRITIONIST role must succeed");
  });

  // TEST 20: TENANCY
  await test("TENANCY: PASS", async () => {
    const ctxOtherTenant = makeContext({
      userId: 99,
      consultancyId: 9999,
      consultancyPublicId: "foreign-consultancy",
      roles: ["NUTRITIONIST"],
    });

    let threw = false;
    try {
      await startPatientPlanEdit(ctxOtherTenant, anny.publicId);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, "Access from different consultancy must be strictly rejected");
  });

  // TEST 21: MOBILE FLOW
  await test("MOBILE FLOW: PASS", async () => {
    const mobileHubFile = fs.readFileSync("components/consultancies/nutrition-v2/mobile-patient-hub.tsx", "utf8");
    assert.ok(mobileHubFile.includes("draftPlan"), "mobile-patient-hub must accept draftPlan");
    assert.ok(mobileHubFile.includes("handleStartEditPlan"), "mobile-patient-hub must have handleStartEditPlan");
    assert.ok(mobileHubFile.includes("handleDiscardDraft"), "mobile-patient-hub must have handleDiscardDraft");
    assert.ok(mobileHubFile.includes("Alteração em andamento"), "mobile-patient-hub must display Alteração em andamento");
    assert.ok(mobileHubFile.includes("Continuar edição"), "mobile-patient-hub must display Continuar edição");
  });

  // TEST 22: DESKTOP FLOW
  await test("DESKTOP FLOW: PASS", async () => {
    const desktopViewFile = fs.readFileSync("components/consultancies/nutrition-v2/patient-record-view.tsx", "utf8");
    assert.ok(desktopViewFile.includes("draftPlan"), "patient-record-view must accept draftPlan");
    assert.ok(desktopViewFile.includes("handleStartEditPlan"), "patient-record-view must have handleStartEditPlan");
    assert.ok(desktopViewFile.includes("handleDiscardDraft"), "patient-record-view must have handleDiscardDraft");
    assert.ok(desktopViewFile.includes("Continuar Edição"), "patient-record-view must display Continuar Edição");
  });

  // TEST 23: LEGACY ASSIGNMENT FLOW
  await test("LEGACY ASSIGNMENT FLOW: PASS", async () => {
    // Legacy direct assignPlanToStudent still works as expected
    const newPlan = await createPlanWithDraftVersion(ctxNutritionist, {
      title: "Plano Manual Direto",
    });
    await populateValidPlan(ctxNutritionist, newPlan.planPublicId, newPlan.versionPublicId);
    const newPub = await publishPlanVersion(ctxNutritionist, newPlan.planPublicId, newPlan.versionPublicId);

    const assignRes = await assignStudentPlan(ctxNutritionist, carol.publicId, newPlan.planPublicId, newPub.versionPublicId);
    assert.ok(assignRes.assignmentPublicId, "Direct assignment should still function normally");
  });

  console.log(`\n=== ALL ${passedCount}/${totalCount} NUTRITION PHASE 2 TESTS PASSED ===\n`);
} finally {
  await pool.end();
}
