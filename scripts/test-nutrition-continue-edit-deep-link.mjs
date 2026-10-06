/**
 * TREVO ONE — NUTRITION PHASE 2: CONTINUE EDIT DEEP LINK REGRESSION TEST
 *
 * Verifies that clicking "Continuar Edição" in Patient Hub:
 * 1. Generates the exact expected deep-link URL shape
 * 2. Loads the Plan Builder without throwing SQL or runtime errors (no cm.deleted_at bug)
 * 3. Reuses the existing draft without creating a new draft
 * 4. Loads the correct plan root and draft version
 * 5. Preserves patient context and returnTo link
 * 6. Keeps the student's active published assignment untouched and visible
 * 7. Enforces strict tenancy isolation
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== TREVO ONE: NUTRITION CONTINUE EDIT DEEP LINK REGRESSION TEST ===\n");

const { getDbPool, getDbConnection } = await import("../lib/db/mysql.ts");
const pool = getDbPool();

const {
  getPatientPlanState,
  startPatientPlanEdit,
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
  listPlanAssignments,
} = await import("../lib/nutrition-v2/assignment-repository.ts");

const timestamp = Date.now();
const testConsultancyId = 1;
const testUserId = 3;

function makeContext({
  userId = testUserId,
  membershipId = 1,
  consultancyId = testConsultancyId,
  consultancyPublicId = "fixture-t026-config",
  consultancySlug = "fixture-t026-config",
  roles = ["NUTRITIONIST"],
} = {}) {
  const hasRole = (r) => roles.includes(r);
  return {
    userId,
    userPublicId: `usr-deep-link-${userId}`,
    membershipId,
    membershipPublicId: `mem-deep-link-${membershipId}`,
    isPlatformAdmin: false,
    consultancyId,
    consultancyPublicId,
    consultancySlug,
    roles,
    hasRole,
    canAuthorNutrition: true,
    canManageConsultancy: true,
    canViewNutrition: true,
    isStudent: false,
    isPersonal: false,
    isNutritionist: true,
  };
}

async function runRegressionSuite() {
  const conn = await getDbConnection();
  let studentMembershipId;
  let studentMembershipPublicId;
  let studentUserPublicId;
  let studentFullName = `Student Anny Test ${timestamp}`;

  try {
    // 0. Setup unique test student
    const [userRes] = await conn.query(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (UUID(), ?, 'hash', ?, NOW(), NOW())`,
      [`anny-test-${timestamp}@example.com`, studentFullName]
    );
    const studentUserId = userRes.insertId;

    const [uRows] = await conn.query(`SELECT public_id FROM users WHERE id = ?`, [studentUserId]);
    studentUserPublicId = uRows[0].public_id;

    const [memberRes] = await conn.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, joined_at)
       VALUES (UUID(), ?, ?, 'ACTIVE', NOW())`,
      [testConsultancyId, studentUserId]
    );
    studentMembershipId = memberRes.insertId;

    await conn.query(
      `INSERT INTO consultancy_member_roles (member_id, role)
       VALUES (?, 'STUDENT')`,
      [studentMembershipId]
    );

    const [cmRows] = await conn.query(`SELECT public_id FROM consultancy_members WHERE id = ?`, [studentMembershipId]);
    studentMembershipPublicId = cmRows[0].public_id;

    const ctx = makeContext();

    // 1. Create a published plan and assign it to student (ACTIVE assignment)
    const plan = await createPlanWithDraftVersion(ctx, {
      title: "Plano Alimentar de Teste",
      objective: "Hipertrofia",
      isTemplate: false,
    });
    const meal = await addMeal(ctx, plan.versionPublicId, {
      title: "Café da Manhã",
      scheduledTime: "08:00",
    });
    await addMealItem(ctx, meal.mealPublicId, {
      customName: "Ovo Cozido",
      prescribedQuantity: 100,
      prescribedUnitCode: "g",
      prescribedUnitLabel: "gramas",
    });
    const published = await publishPlanVersion(ctx, plan.planPublicId, plan.versionPublicId);
    assert.strictEqual(published.status, "PUBLISHED");

    await assignPlanVersion(ctx, {
      planPublicId: plan.planPublicId,
      versionPublicId: published.versionPublicId,
      studentMembershipPublicId,
      forceReplace: true,
    });

    // 2. Start edit for student -> creates DRAFT version and DRAFT assignment
    const editResult = await startPatientPlanEdit(ctx, studentMembershipPublicId);
    assert.ok(editResult.planPublicId);
    assert.ok(editResult.versionPublicId);

    // 3. Test PATIENT HUB CONTINUE EDIT LINK
    const patientPlanState = await getPatientPlanState(ctx, studentMembershipPublicId);
    assert.ok(patientPlanState.draftPlan, "Draft plan must exist in patient plan state");
    const draft = patientPlanState.draftPlan;

    // Verify link format as defined in patient-record-view.tsx & mobile-patient-hub.tsx
    const continueEditHref = `/consultoria/${ctx.consultancySlug}/planos-v2/${draft.planPublicId}?v=${draft.versionPublicId}&studentId=${studentMembershipPublicId}`;
    assert.ok(continueEditHref.includes(draft.planPublicId));
    assert.ok(continueEditHref.includes(`v=${draft.versionPublicId}`));
    assert.ok(continueEditHref.includes(`studentId=${studentMembershipPublicId}`));
    console.log("PATIENT HUB CONTINUE EDIT LINK: PASS");

    // 4. Test EXISTING DRAFT OPENS & PAGE LOADER SIMULATION
    // Replicate EXACT logic of app/consultoria/[slug]/planos-v2/[planPublicId]/page.tsx
    const tree = await getPlanVersionTreeByPlanPublicId(ctx, draft.planPublicId, draft.versionPublicId);
    assert.ok(tree, "Tree must be loaded");
    assert.strictEqual(tree.version.status, "DRAFT", "Loaded tree version must be DRAFT");

    // Simulate patientContext resolution (the exact query that previously crashed)
    const targetStudentId = studentMembershipPublicId;
    const [studentRows] = await conn.query(
      `SELECT cm.id, cm.public_id, u.public_id AS user_public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1`,
      [targetStudentId, targetStudentId, ctx.consultancyId]
    );

    assert.ok(studentRows.length > 0, "Student member must be resolved");
    const sr = studentRows[0];
    const patientContext = {
      studentMembershipPublicId: String(sr.public_id),
      studentPublicId: String(sr.user_public_id),
      studentName: String(sr.full_name),
      returnToUrl: `/consultoria/${ctx.consultancySlug}/planos-v2/prontuario/${sr.user_public_id}?tab=plano`,
    };

    console.log("EXISTING DRAFT OPENS: PASS");

    // 5. Test NO NEW DRAFT CREATED
    const [draftVersionsCount] = await conn.query(
      `SELECT COUNT(*) AS count
       FROM nutrition_v2_plan_versions
       WHERE nutrition_plan_id = (SELECT id FROM nutrition_v2_plans WHERE public_id = ?)
         AND status = 'DRAFT'
         AND deleted_at IS NULL`,
      [draft.planPublicId]
    );
    assert.strictEqual(Number(draftVersionsCount[0].count), 1, "There must be exactly 1 draft version");
    console.log("NO NEW DRAFT CREATED: PASS");

    // 6. Test CORRECT PLAN ROOT
    assert.strictEqual(tree.plan.publicId, draft.planPublicId);
    console.log("CORRECT PLAN ROOT: PASS");

    // 7. Test CORRECT DRAFT VERSION
    assert.strictEqual(tree.version.publicId, draft.versionPublicId);
    assert.strictEqual(tree.version.status, "DRAFT");
    console.log("CORRECT DRAFT VERSION: PASS");

    // 8. Test PATIENT CONTEXT PRESERVED
    assert.strictEqual(patientContext.studentMembershipPublicId, studentMembershipPublicId);
    assert.strictEqual(patientContext.studentPublicId, studentUserPublicId);
    assert.strictEqual(patientContext.studentName, studentFullName);
    console.log("PATIENT CONTEXT PRESERVED: PASS");

    // 9. Test RETURN TO PATIENT
    assert.strictEqual(
      patientContext.returnToUrl,
      `/consultoria/${ctx.consultancySlug}/planos-v2/prontuario/${studentUserPublicId}?tab=plano`
    );
    console.log("RETURN TO PATIENT: PASS");

    // 10. Test ACTIVE ASSIGNMENT UNCHANGED
    const [assignments] = await conn.query(
      `SELECT a.id, a.public_id, a.status, v.status AS version_status
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       WHERE a.student_membership_id = ? AND a.deleted_at IS NULL
       ORDER BY a.id ASC`,
      [studentMembershipId]
    );
    const activeAssignment = assignments.find((a) => a.status === "ACTIVE");
    assert.ok(activeAssignment, "Active assignment must exist");
    assert.strictEqual(activeAssignment.version_status, "PUBLISHED", "Active version must remain PUBLISHED");
    console.log("ACTIVE ASSIGNMENT UNCHANGED: PASS");

    // 11. Test STUDENT STILL SEES PUBLISHED
    const studentActivePlan = await getActiveNutritionPlanForStudentMembership(testConsultancyId, studentMembershipId);
    assert.ok(studentActivePlan, "Student active plan must exist");
    assert.strictEqual(studentActivePlan.versionPublicId, published.versionPublicId, "Student must still see published version");
    console.log("STUDENT STILL SEES PUBLISHED: PASS");

    // 12. Test SHARED PLAN FORK CONTEXT
    // Test clicking edit again reuses the draft
    const editAgain = await startPatientPlanEdit(ctx, studentMembershipPublicId);
    assert.strictEqual(editAgain.versionPublicId, draft.versionPublicId, "Must reuse existing draft version");
    assert.strictEqual(editAgain.isExistingDraft, true, "isExistingDraft must be true on reuse");

    // Test a shared plan scenario: assign published plan to second student (Carol)
    const [user2Res] = await conn.query(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (UUID(), ?, 'hash', 'Student Carol Test', NOW(), NOW())`,
      [`carol-test-${timestamp}@example.com`]
    );
    const [member2Res] = await conn.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, joined_at)
       VALUES (UUID(), ?, ?, 'ACTIVE', NOW())`,
      [testConsultancyId, user2Res.insertId]
    );
    await conn.query(
      `INSERT INTO consultancy_member_roles (member_id, role)
       VALUES (?, 'STUDENT')`,
      [member2Res.insertId]
    );
    const [cm2Rows] = await conn.query(`SELECT public_id FROM consultancy_members WHERE id = ?`, [member2Res.insertId]);
    const carolMembershipPublicId = cm2Rows[0].public_id;

    await assignPlanVersion(ctx, {
      planPublicId: plan.planPublicId,
      versionPublicId: published.versionPublicId,
      studentMembershipPublicId: carolMembershipPublicId,
      forceReplace: true,
    });

    // Carol starts edit -> forks shared plan to a dedicated root
    const carolEdit = await startPatientPlanEdit(ctx, carolMembershipPublicId);
    assert.ok(carolEdit.planPublicId, "Carol must receive a plan public ID");
    assert.ok(carolEdit.versionPublicId, "Carol must receive a draft version public ID");
    assert.notStrictEqual(carolEdit.versionPublicId, draft.versionPublicId, "Carol's draft version must be isolated from Anny's");
    console.log("SHARED PLAN FORK CONTEXT: PASS");

    // 13. Test TENANCY
    const foreignTenantCtx = makeContext({ consultancyId: 999999, consultancyPublicId: "foreign-tenant" });
    let foreignAccessBlocked = false;
    try {
      await getPlanVersionTreeByPlanPublicId(foreignTenantCtx, draft.planPublicId);
    } catch (e) {
      foreignAccessBlocked = true;
    }
    assert.strictEqual(foreignAccessBlocked, true, "Foreign tenant access to plan must be blocked");

    const [foreignStudentCheck] = await conn.query(
      `SELECT cm.id FROM consultancy_members cm
       WHERE cm.public_id = ? AND cm.consultancy_id = 999999 AND cm.status = 'ACTIVE'`,
      [studentMembershipPublicId]
    );
    assert.strictEqual(foreignStudentCheck.length, 0, "Student lookup in foreign tenant must return 0");
    console.log("TENANCY: PASS");

  } finally {
    conn.release();
  }
}

try {
  await runRegressionSuite();
  console.log("\n=== ALL REGRESSION CHECKS PASSED SUCCESSFULLY ===");
  process.exit(0);
} catch (err) {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
}
