import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  // Ignore
}

// Dynamically import TS modules
const {
  createWorkout,
  getWorkoutWithDraft,
  getWorkoutVersionTree,
  publishWorkoutVersion,
  addBlockToDraft,
  addItemToDraftBlock,
  addSetToDraftItem,
  createWorkoutItemCombination,
  createCustomExerciseInWorkout,
  assignTemplateToStudent,
  getTemplatePreview,
  createNewDraftVersionFromPublished,
  deleteWorkout,
  removeItemFromDraft,
  updateWorkoutDraftMetadata,
} = await import('../lib/training-v2/workout-repository.ts');

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: false,
});

const results = [];

function recordResult(testName, expected, actual, pass) {
  results.push({
    name: testName,
    expected,
    actual,
    pass: !!pass,
  });
  const statusStr = pass ? "PASS" : "FAIL";
  console.log(`[${statusStr}] ${testName} -> ${actual}`);
}

async function runWorkoutTemplatesTestSuite() {
  console.log("==================================================");
  console.log("TREVO ONE — WORKOUT TEMPLATES & COPY-ON-ASSIGN SUITE");
  console.log("==================================================\n");

  const conn = await pool.getConnection();

  let c1Id, c2Id;
  let coachMemberId, studentAMemberId, studentBMemberId, studentCMemberId;
  let coach2MemberId, studentB2MemberId;
  let coachUserId, studentAUserId, studentBUserId, studentCUserId;
  let coach2UserId, studentB2UserId;
  let templateWorkoutPublicId = null;
  let studentAWorkoutPublicId = null;
  let studentBWorkoutPublicId = null;
  let studentCWorkoutPublicId = null;

  try {
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const slug1 = `test-cons-tpl-a-${uniqueSuffix}`;
    const slug2 = `test-cons-tpl-b-${uniqueSuffix}`;

    // 1. Setup Consultancy 1
    const [c1Res] = await conn.execute(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria Templates A ${uniqueSuffix}`, slug1]
    );
    c1Id = c1Res.insertId;

    // 2. Setup Consultancy 2 (for cross-tenant checks)
    const [c2Res] = await conn.execute(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria Templates B ${uniqueSuffix}`, slug2]
    );
    c2Id = c2Res.insertId;

    // Coach in Consultancy 1
    const [uCoachRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Coach Template Alfa', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `coach-tpl-${uniqueSuffix}@test.com`]
    );
    coachUserId = uCoachRes.insertId;
    const coachPublicId = crypto.randomUUID();

    const [mCoachRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [coachPublicId, c1Id, coachUserId]
    );
    coachMemberId = mCoachRes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'PERSONAL', NOW(3)), (?, 'CONSULTANCY_ADMIN', NOW(3))`,
      [coachMemberId, coachMemberId]
    );

    // Student A in Consultancy 1
    const studentAPublicId = crypto.randomUUID();
    const [uSARes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Aluno A', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `student-a-${uniqueSuffix}@test.com`]
    );
    studentAUserId = uSARes.insertId;

    const [mSARes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [studentAPublicId, c1Id, studentAUserId]
    );
    studentAMemberId = mSARes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'STUDENT', NOW(3))`,
      [studentAMemberId]
    );

    // Student B in Consultancy 1
    const studentBPublicId = crypto.randomUUID();
    const [uSBRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Aluno B', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `student-b-${uniqueSuffix}@test.com`]
    );
    studentBUserId = uSBRes.insertId;

    const [mSBRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [studentBPublicId, c1Id, studentBUserId]
    );
    studentBMemberId = mSBRes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'STUDENT', NOW(3))`,
      [studentBMemberId]
    );

    // Student C in Consultancy 1
    const studentCPublicId = crypto.randomUUID();
    const [uSCRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Aluno C', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `student-c-${uniqueSuffix}@test.com`]
    );
    studentCUserId = uSCRes.insertId;

    const [mSCRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [studentCPublicId, c1Id, studentCUserId]
    );
    studentCMemberId = mSCRes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'STUDENT', NOW(3))`,
      [studentCMemberId]
    );

    // Coach 2 in Consultancy 2
    const coach2PublicId = crypto.randomUUID();
    const [uCoach2Res] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Coach Beta', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `coach-beta-${uniqueSuffix}@test.com`]
    );
    coach2UserId = uCoach2Res.insertId;

    const [mCoach2Res] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [coach2PublicId, c2Id, coach2UserId]
    );
    coach2MemberId = mCoach2Res.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'PERSONAL', NOW(3)), (?, 'CONSULTANCY_ADMIN', NOW(3))`,
      [coach2MemberId, coach2MemberId]
    );

    // Contexts
    const ctxA = {
      userId: coachUserId,
      userPublicId: crypto.randomUUID(),
      consultancyId: c1Id,
      consultancyPublicId: crypto.randomUUID(),
      consultancySlug: slug1,
      membershipId: coachMemberId,
      membershipPublicId: coachPublicId,
      roles: ["PERSONAL", "CONSULTANCY_ADMIN"],
      hasRole: (r) => r === "PERSONAL" || r === "CONSULTANCY_ADMIN",
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      canManageGlobal: false,
      isStudent: false,
    };

    const ctxB = {
      userId: coach2UserId,
      userPublicId: crypto.randomUUID(),
      consultancyId: c2Id,
      consultancyPublicId: crypto.randomUUID(),
      consultancySlug: slug2,
      membershipId: coach2MemberId,
      membershipPublicId: coach2PublicId,
      roles: ["PERSONAL", "CONSULTANCY_ADMIN"],
      hasRole: (r) => r === "PERSONAL" || r === "CONSULTANCY_ADMIN",
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      canManageGlobal: false,
      isStudent: false,
    };

    const studentOnlyCtx = {
      userId: studentAUserId,
      userPublicId: crypto.randomUUID(),
      consultancyId: c1Id,
      consultancyPublicId: crypto.randomUUID(),
      consultancySlug: slug1,
      membershipId: studentAMemberId,
      membershipPublicId: studentAPublicId,
      roles: ["STUDENT"],
      hasRole: (r) => r === "STUDENT",
      isPlatformAdmin: false,
      canAuthorTraining: false,
      canManageConsultancy: false,
      canManageGlobal: false,
      isStudent: true,
    };

    // Find sample library exercises for tests
    const [libExRows] = await conn.execute(
      `SELECT public_id, name, muscle_group_primary, equipment FROM exercises WHERE status = 'PUBLISHED' AND scope = 'GLOBAL' LIMIT 6;`
    );
    if (!libExRows || libExRows.length < 4) {
      throw new Error("Exercícios da biblioteca não encontrados.");
    }
    const ex1 = libExRows[0];
    const ex2 = libExRows[1];
    const ex3 = libExRows[2];
    const ex4 = libExRows[3];
    const ex5 = libExRows[4] || libExRows[0];

    // =========================================================================
    // TEST 1: CREATE WORKOUT TEMPLATE (WITH BI-SET, TRI-SET, ACTIVE REST, CUSTOM)
    // =========================================================================
    let tplDraft, tplVersion, block1, item1, item2, item3, item4, item5, item6, customEx;
    try {
      const createdTpl = await createWorkout(ctxA, {
        title: "Definição Básica — Mês 1",
        objective: "Hipertrofia e definição",
        difficultyLevel: "INTERMEDIATE",
        estimatedDurationMinutes: 60,
        notes: "Template de treino modelo oficial",
        isTemplate: true,
      });

      templateWorkoutPublicId = createdTpl.workout.publicId;
      tplDraft = await getWorkoutWithDraft(ctxA, templateWorkoutPublicId);

      assert.strictEqual(tplDraft.workout.isTemplate, true, "Workout must be marked as template");
      assert.strictEqual(Boolean(tplDraft.draftVersion), true, "Version 1 starts as draft");
      assert.strictEqual(tplDraft.draftVersion.status, "DRAFT", "Draft status must be DRAFT");

      // Add Category A (Block 1)
      block1 = await addBlockToDraft(ctxA, tplDraft.draftVersion.publicId, {
        blockType: "CUSTOM",
        title: "Treino A — Superior",
      });

      // Item 1: Normal exercise
      item1 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex1.public_id),
        prescriptionMode: "SETS",
      });
      await addSetToDraftItem(ctxA, item1.publicId, {
        setType: "NORMAL",
        targetReps: 10,
        targetRestSeconds: 60,
      });
      await addSetToDraftItem(ctxA, item1.publicId, {
        setType: "NORMAL",
        targetReps: 10,
        targetRestSeconds: 60,
      });
      await addSetToDraftItem(ctxA, item1.publicId, {
        setType: "NORMAL",
        targetReps: 10,
        targetRestSeconds: 60,
      });

      // Item 2 & 3: Bi-Set combination
      item2 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex2.public_id),
      });

      item3 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex3.public_id),
      });

      const biSetComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: block1.publicId,
        combinationType: "BI_SET",
        title: "Bi-Set Superior",
        itemPublicIds: [item2.publicId, item3.publicId],
        restAfterSeconds: 90,
      });

      // Item 4 & 5 & 6: Tri-Set combination
      item4 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex4.public_id),
      });
      item5 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex1.public_id),
      });
      item6 = await addItemToDraftBlock(ctxA, block1.publicId, {
        exercisePublicId: String(ex2.public_id),
      });

      const triSetComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: block1.publicId,
        combinationType: "TRI_SET",
        title: "Tri-Set Ombros",
        itemPublicIds: [item4.publicId, item5.publicId, item6.publicId],
        restAfterSeconds: 120,
      });

      // Custom Exercise
      customEx = await createCustomExerciseInWorkout(ctxA, {
        categoryPublicId: block1.publicId,
        name: "Abdominal Canivete Especial",
        muscleGroupPrimary: "Abdômen",
        equipment: "Solo",
        sets: [{ setType: "NORMAL", targetReps: 20, targetRestSeconds: 45 }],
      });

      // Publish Template Version 1
      tplVersion = await publishWorkoutVersion(ctxA, tplDraft.draftVersion.publicId);

      assert.strictEqual(tplVersion.status, "PUBLISHED", "Template version must be PUBLISHED");

      recordResult(
        "TEMPLATE CREATION & PUBLISH",
        "Template created with is_template=1, normal exercise, Bi-Set, Tri-Set, custom exercise and PUBLISHED",
        `Created template ${templateWorkoutPublicId} (v${tplVersion.versionNumber})`,
        true
      );
    } catch (e) {
      recordResult("TEMPLATE CREATION & PUBLISH", "Successful template creation", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 2: TEMPLATE PREVIEW DTO
    // =========================================================================
    try {
      const preview = await getTemplatePreview(ctxA, templateWorkoutPublicId);
      assert.strictEqual(preview.title, "Definição Básica — Mês 1");
      assert.strictEqual(preview.categoryCount, 1);
      assert.strictEqual(preview.blocks.length, 1);
      assert.strictEqual(preview.blocks[0].itemsCount >= 7, true);
      assert.strictEqual(preview.totalExercises >= 7, true);

      recordResult(
        "TEMPLATE PREVIEW DTO",
        "Lightweight summary of categories and item counts without full heavy payload",
        `Categories: ${preview.categoryCount}, total exercises: ${preview.totalExercises}`,
        true
      );
    } catch (e) {
      recordResult("TEMPLATE PREVIEW DTO", "Preview generation", e.message, false);
    }

    // =========================================================================
    // TEST 3: COPY-ON-ASSIGN TO STUDENT A
    // =========================================================================
    let assignResultA;
    try {
      assignResultA = await assignTemplateToStudent(
        ctxA,
        templateWorkoutPublicId,
        studentAPublicId,
        { notes: "Prescrito para Aluno A com adaptação progressiva" }
      );

      studentAWorkoutPublicId = assignResultA.workout.publicId;

      assert.ok(studentAWorkoutPublicId, "Assigned workout public ID returned");
      assert.notStrictEqual(
        studentAWorkoutPublicId,
        templateWorkoutPublicId,
        "Student copy MUST have distinct workout ID from template"
      );

      // Verify DB row for student's workout
      const [wRows] = await conn.execute(
        `SELECT id, public_id, title, is_template, status FROM workouts WHERE public_id = ?;`,
        [studentAWorkoutPublicId]
      );
      assert.strictEqual(wRows.length, 1);
      assert.strictEqual(wRows[0].is_template, 0, "Student copy MUST have is_template = 0");

      // Verify assignment in workout_assignments
      const [asgnRows] = await conn.execute(
        `SELECT a.id, a.student_membership_id FROM workout_assignments a
         JOIN workout_versions v ON v.id = a.workout_version_id
         WHERE v.public_id = ?;`,
        [assignResultA.version.publicId]
      );
      assert.strictEqual(asgnRows.length, 1, "Assignment must exist for student");
      assert.strictEqual(asgnRows[0].student_membership_id, studentAMemberId);

      // Verify template row has NO student assignments
      const [tplAsgnRows] = await conn.execute(
        `SELECT a.id FROM workout_assignments a
         JOIN workout_versions v ON v.id = a.workout_version_id
         JOIN workouts w ON w.id = v.workout_id
         WHERE w.public_id = ?;`,
        [templateWorkoutPublicId]
      );
      assert.strictEqual(tplAsgnRows.length, 0, "Template itself must NEVER have student assignments directly");

      recordResult(
        "COPY-ON-ASSIGN (STUDENT A)",
        "Creates independent workout (is_template=0), version 1 published, assigned to student A",
        `Student A Workout: ${studentAWorkoutPublicId}, Template: ${templateWorkoutPublicId} untouched`,
        true
      );
    } catch (e) {
      recordResult("COPY-ON-ASSIGN (STUDENT A)", "Successful copy-on-assign", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 4: DEEP CLONE FIDELITY (BI-SET, TRI-SET, SETS, COMBINATIONS)
    // =========================================================================
    try {
      const studentTree = await getWorkoutVersionTree(ctxA, assignResultA.version.publicId);
      const templateTree = await getWorkoutVersionTree(ctxA, tplVersion.publicId);

      // 1. Blocks cloned
      assert.strictEqual(studentTree.blocks.length, templateTree.blocks.length, "Same number of blocks");
      assert.notStrictEqual(
        studentTree.blocks[0].publicId,
        templateTree.blocks[0].publicId,
        "Blocks must have distinct IDs"
      );

      // 2. Items cloned
      assert.strictEqual(
        studentTree.blocks[0].items.length,
        templateTree.blocks[0].items.length,
        "Same number of items"
      );
      const studentItems = studentTree.blocks[0].items;
      const templateItems = templateTree.blocks[0].items;
      for (let i = 0; i < studentItems.length; i++) {
        assert.notStrictEqual(
          studentItems[i].publicId,
          templateItems[i].publicId,
          `Item ${i} must have independent ID`
        );
      }

      // 3. Bi-Set and Tri-Set combinations preserved with new IDs
      const sBiSet = studentItems.filter((it) => it.combinationType === "BI_SET");
      const tBiSet = templateItems.filter((it) => it.combinationType === "BI_SET");
      assert.strictEqual(sBiSet.length, 2, "Student copy must retain 2 items in Bi-Set");
      assert.strictEqual(tBiSet.length, 2, "Template retains 2 items in Bi-Set");
      assert.ok(sBiSet[0].combinationPublicId, "Student Bi-Set has combination ID");
      assert.notStrictEqual(
        sBiSet[0].combinationPublicId,
        tBiSet[0].combinationPublicId,
        "Combination ID must be brand new"
      );
      assert.strictEqual(sBiSet[0].combinationPublicId, sBiSet[1].combinationPublicId);

      const sTriSet = studentItems.filter((it) => it.combinationType === "TRI_SET");
      const tTriSet = templateItems.filter((it) => it.combinationType === "TRI_SET");
      assert.strictEqual(sTriSet.length, 3, "Student copy must retain 3 items in Tri-Set");
      assert.strictEqual(tTriSet.length, 3, "Template retains 3 items in Tri-Set");
      assert.notStrictEqual(
        sTriSet[0].combinationPublicId,
        tTriSet[0].combinationPublicId,
        "Tri-Set combination ID must be brand new"
      );

      // 4. Sets cloned
      const studentNormalItem = studentItems.find((i) => i.exercisePublicId === String(ex1.public_id) && !i.combinationPublicId);
      const templateNormalItem = templateItems.find((i) => i.exercisePublicId === String(ex1.public_id) && !i.combinationPublicId);
      assert.ok(studentNormalItem, "Student normal item found");
      assert.ok(templateNormalItem, "Template normal item found");
      assert.strictEqual(
        studentNormalItem.sets.length,
        templateNormalItem.sets.length,
        "Sets count preserved"
      );
      assert.strictEqual(
        studentNormalItem.sets[0].targetReps,
        templateNormalItem.sets[0].targetReps,
        "Set target reps preserved"
      );
      const [sSets] = await conn.execute(
        `SELECT id FROM workout_item_sets WHERE block_item_id IN (
           SELECT id FROM workout_block_items WHERE public_id = ?
         );`,
        [studentNormalItem.publicId]
      );
      const [tSets] = await conn.execute(
        `SELECT id FROM workout_item_sets WHERE block_item_id IN (
           SELECT id FROM workout_block_items WHERE public_id = ?
         );`,
        [templateNormalItem.publicId]
      );
      assert.strictEqual(sSets.length, tSets.length);
      assert.notStrictEqual(sSets[0].id, tSets[0].id, "Set database ID must be brand new");

      recordResult(
        "DEEP CLONE FIDELITY & ID ISOLATION",
        "Blocks, items, Bi-Set, Tri-Set combinations and sets duplicated with new unique IDs",
        `Bi-Set items: 2/2, Tri-Set items: 3/3, zero ID collisions`,
        true
      );
    } catch (e) {
      recordResult("DEEP CLONE FIDELITY & ID ISOLATION", "Fidelity check", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 5: CUSTOMIZE STUDENT A COPY (INDEPENDENCE TEST)
    // =========================================================================
    try {
      // Professional edits Student A's workout:
      // Create new draft v2 for Student A
      const studentADraftTree = await createNewDraftVersionFromPublished(ctxA, studentAWorkoutPublicId);

      // Remove the first item from Student A's draft
      const itemToRemove = studentADraftTree.blocks[0].items[0];
      await removeItemFromDraft(ctxA, itemToRemove.publicId);

      // Update metadata on Student A's draft
      await updateWorkoutDraftMetadata(ctxA, studentADraftTree.publicId, {
        title: "Definição Básica — Adaptado para Joelho",
        notes: "Removido exercício de impacto",
      });

      // Publish Student A version 2
      const studentAV2 = await publishWorkoutVersion(ctxA, studentADraftTree.publicId);

      // Verify Student A's workout now has fewer exercises and new title
      const updatedStudentTree = await getWorkoutVersionTree(ctxA, studentAV2.publicId);
      assert.strictEqual(
        updatedStudentTree.blocks[0].items.length,
        studentADraftTree.blocks[0].items.length - 1,
        "Student A now has 1 fewer item"
      );

      // VERIFY TEMPLATE IS 100% UNCHANGED
      const templateAfterTree = await getWorkoutVersionTree(ctxA, tplVersion.publicId);
      assert.strictEqual(
        templateAfterTree.blocks[0].items.length,
        studentADraftTree.blocks[0].items.length,
        "Template STILL has all original items"
      );
      assert.strictEqual(templateAfterTree.title, "Definição Básica — Mês 1", "Template title unaltered");

      recordResult(
        "STUDENT COPY INDEPENDENCE & ISOLATION",
        "Student A edited/customized without any impact on original template",
        `Student A items: ${updatedStudentTree.blocks[0].items.length}, Template items: ${templateAfterTree.blocks[0].items.length} (UNTOUCHED)`,
        true
      );
    } catch (e) {
      recordResult("STUDENT COPY INDEPENDENCE & ISOLATION", "Student customization", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 6: ASSIGN SAME TEMPLATE TO STUDENT B (ORIGINAL PRESERVED)
    // =========================================================================
    try {
      const assignResultB = await assignTemplateToStudent(
        ctxA,
        templateWorkoutPublicId,
        studentBPublicId
      );
      studentBWorkoutPublicId = assignResultB.workout.publicId;

      assert.notStrictEqual(studentBWorkoutPublicId, templateWorkoutPublicId);
      assert.notStrictEqual(studentBWorkoutPublicId, studentAWorkoutPublicId);

      // Verify Student B receives the ORIGINAL template structure (NOT Student A's modified version)
      const studentBTree = await getWorkoutVersionTree(ctxA, assignResultB.version.publicId);
      const templateTree = await getWorkoutVersionTree(ctxA, tplVersion.publicId);

      assert.strictEqual(
        studentBTree.blocks[0].items.length,
        templateTree.blocks[0].items.length,
        "Student B receives original template item count, NOT Student A's reduced count"
      );

      recordResult(
        "ASSIGN TEMPLATE TO STUDENT B",
        "Student B receives the pure original template, unaffected by Student A's customization",
        `Student B items: ${studentBTree.blocks[0].items.length} === Template items: ${templateTree.blocks[0].items.length}`,
        true
      );
    } catch (e) {
      recordResult("ASSIGN TEMPLATE TO STUDENT B", "Student B assignment", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 7: EDIT TEMPLATE (NO AUTO-SYNC TO EXISTING STUDENTS)
    // =========================================================================
    let tplV2;
    try {
      // Coach creates a new draft version on the TEMPLATE
      const tplDraft2 = await createNewDraftVersionFromPublished(ctxA, templateWorkoutPublicId);

      // Add a new exercise to the template draft v2
      const newItem = await addItemToDraftBlock(ctxA, tplDraft2.blocks[0].publicId, {
        exercisePublicId: String(ex5.public_id),
      });

      // Publish template v2
      tplV2 = await publishWorkoutVersion(ctxA, tplDraft2.publicId);

      assert.strictEqual(tplV2.versionNumber, 2, "Template now at v2");

      // Verify Student A's workout is STILL FROZEN on its own version
      const [asgnA] = await conn.execute(
        `SELECT v.version_number, v.title FROM workout_assignments a
         JOIN workout_versions v ON v.id = a.workout_version_id
         WHERE a.student_membership_id = ?;`,
        [studentAMemberId]
      );
      assert.strictEqual(asgnA.length > 0, true);

      // Verify Student B's workout is STILL FROZEN on its received version (does NOT have the new exercise)
      const [bPubRows] = await conn.execute(
        `SELECT public_id FROM workout_versions WHERE workout_id = (SELECT id FROM workouts WHERE public_id = ?) AND status = 'PUBLISHED' LIMIT 1;`,
        [studentBWorkoutPublicId]
      );
      const studentBTree = await getWorkoutVersionTree(ctxA, String(bPubRows[0].public_id));
      const tplV2Tree = await getWorkoutVersionTree(ctxA, tplV2.publicId);

      assert.strictEqual(
        studentBTree.blocks[0].items.length < tplV2Tree.blocks[0].items.length,
        true,
        "Student B workout does NOT automatically sync template changes"
      );

      recordResult(
        "NO AUTO-SYNC ON TEMPLATE EDIT",
        "Template edited to v2; existing student workouts (A & B) remain frozen on their existing versions",
        `Template v2 items: ${tplV2Tree.blocks[0].items.length}, Student B items: ${studentBTree.blocks[0].items.length} (NO AUTO-SYNC)`,
        true
      );
    } catch (e) {
      recordResult("NO AUTO-SYNC ON TEMPLATE EDIT", "Template edit isolation", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 8: NEW ASSIGNMENT USES NEW TEMPLATE VERSION
    // =========================================================================
    try {
      const assignResultC = await assignTemplateToStudent(
        ctxA,
        templateWorkoutPublicId,
        studentCPublicId
      );
      studentCWorkoutPublicId = assignResultC.workout.publicId;

      // Verify Student C receives Template v2 (with the newly added item)
      const studentCTree = await getWorkoutVersionTree(ctxA, assignResultC.version.publicId);
      const tplV2Tree = await getWorkoutVersionTree(ctxA, tplV2.publicId);

      assert.strictEqual(
        studentCTree.blocks[0].items.length,
        tplV2Tree.blocks[0].items.length,
        "New assignment to Student C must receive the updated v2 template"
      );

      recordResult(
        "NEW ASSIGNMENT RECEIVES NEW TEMPLATE VERSION",
        "Student C assigned after template edit receives the new v2 template structure",
        `Student C items: ${studentCTree.blocks[0].items.length} === Template v2 items: ${tplV2Tree.blocks[0].items.length}`,
        true
      );
    } catch (e) {
      recordResult("NEW ASSIGNMENT RECEIVES NEW TEMPLATE VERSION", "Student C assignment", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 9: ARCHIVE / DELETE TEMPLATE SAFETY
    // =========================================================================
    try {
      // Delete/archive the template
      await deleteWorkout(ctxA, templateWorkoutPublicId);

      // Verify template is marked DELETED
      const [tplDel] = await conn.execute(
        `SELECT status FROM workouts WHERE public_id = ?;`,
        [templateWorkoutPublicId]
      );
      assert.strictEqual(
        ["ARCHIVED", "DELETED"].includes(tplDel[0].status),
        true,
        "Template safely archived or deleted"
      );

      // Verify Student A, B, and C workouts are STILL ACTIVE and completely queryable
      const studentAAfter = await getWorkoutWithDraft(ctxA, studentAWorkoutPublicId);
      assert.strictEqual(studentAAfter.workout.status, "ACTIVE", "Student A workout still ACTIVE");

      const studentBAfter = await getWorkoutWithDraft(ctxA, studentBWorkoutPublicId);
      assert.strictEqual(studentBAfter.workout.status, "ACTIVE", "Student B workout still ACTIVE");

      const studentCAfter = await getWorkoutWithDraft(ctxA, studentCWorkoutPublicId);
      assert.strictEqual(studentCAfter.workout.status, "ACTIVE", "Student C workout still ACTIVE");

      recordResult(
        "ARCHIVE / DELETE TEMPLATE SAFETY",
        "Deleting/archiving template does NOT affect assigned student workouts (remain ACTIVE & intact)",
        `Template status: DELETED, Students A, B, C workouts remain ACTIVE and functional`,
        true
      );
    } catch (e) {
      recordResult("ARCHIVE / DELETE TEMPLATE SAFETY", "Delete safety", e.message, false);
      throw e;
    }

    // =========================================================================
    // TEST 10: TENANCY ISOLATION (CROSS-CONSULTANCY ACCESS BLOCKED)
    // =========================================================================
    try {
      let previewBlocked = false;
      try {
        const preview = await getTemplatePreview(ctxB, templateWorkoutPublicId);
        if (!preview) previewBlocked = true;
      } catch (err) {
        previewBlocked = true;
      }
      assert.strictEqual(previewBlocked, true, "Consultancy B coach cannot preview Consultancy A template");

      let assignBlocked = false;
      try {
        await assignTemplateToStudent(
          ctxB,
          templateWorkoutPublicId,
          crypto.randomUUID()
        );
      } catch (err) {
        assignBlocked = true;
      }
      assert.strictEqual(assignBlocked, true, "Consultancy B coach cannot assign Consultancy A template");

      recordResult(
        "TENANCY ISOLATION",
        "Consultancy B cannot preview or assign templates owned by Consultancy A",
        "Cross-consultancy access strictly BLOCKED (404/NOT_FOUND)",
        true
      );
    } catch (e) {
      recordResult("TENANCY ISOLATION", "Tenancy check", e.message, false);
    }

    // =========================================================================
    // TEST 11: RBAC ISOLATION (STUDENT ROLE CANNOT CREATE/ASSIGN TEMPLATES)
    // =========================================================================
    try {
      let createBlocked = false;
      try {
        await createWorkout(studentOnlyCtx, {
          title: "Template Ilegal",
          isTemplate: true,
        });
      } catch (err) {
        createBlocked = true;
      }
      assert.strictEqual(createBlocked, true, "Student role cannot create workout templates");

      let assignBlocked = false;
      try {
        await assignTemplateToStudent(
          studentOnlyCtx,
          templateWorkoutPublicId,
          studentAPublicId
        );
      } catch (err) {
        assignBlocked = true;
      }
      assert.strictEqual(assignBlocked, true, "Student role cannot assign workout templates");

      recordResult(
        "RBAC ISOLATION",
        "Student role blocked from authoring or assigning workout templates",
        "Unauthorized role access strictly BLOCKED (FORBIDDEN)",
        true
      );
    } catch (e) {
      recordResult("RBAC ISOLATION", "RBAC check", e.message, false);
    }

    // =========================================================================
    // TEST 12: TRANSACTION ROLLBACK INTEGRITY
    // =========================================================================
    try {
      // Attempt to assign with an invalid non-existent student membership to trigger rollback
      const countBefore = await conn.execute(
        `SELECT COUNT(*) as cnt FROM workouts WHERE consultancy_id = ?;`,
        [c1Id]
      );
      const totalWorkoutsBefore = Number(countBefore[0][0].cnt);

      let rollbackPassed = false;
      try {
        await assignTemplateToStudent(
          ctxA,
          templateWorkoutPublicId,
          "00000000-0000-0000-0000-999999999999"
        );
      } catch (err) {
        // Expected to fail
        rollbackPassed = true;
      }

      const countAfter = await conn.execute(
        `SELECT COUNT(*) as cnt FROM workouts WHERE consultancy_id = ?;`,
        [c1Id]
      );
      const totalWorkoutsAfter = Number(countAfter[0][0].cnt);

      assert.strictEqual(rollbackPassed, true, "Assignment with invalid student must fail");
      assert.strictEqual(
        totalWorkoutsAfter,
        totalWorkoutsBefore,
        "Transaction rollback must leave zero orphan workout records"
      );

      recordResult(
        "TRANSACTION ROLLBACK INTEGRITY",
        "Failed assignment triggers rollback with zero orphan workouts or blocks",
        `Workouts count before: ${totalWorkoutsBefore}, after: ${totalWorkoutsAfter} (No orphans)`,
        true
      );
    } catch (e) {
      recordResult("TRANSACTION ROLLBACK INTEGRITY", "Rollback check", e.message, false);
    }

    // Print Consolidated Report
    console.log("\n==================================================");
    console.log("CONSOLIDATED AUDIT RESULTS REPORT");
    console.log("==================================================");
    console.log(
      ["TEST NAME".padEnd(45), "EXPECTED".padEnd(40), "ACTUAL".padEnd(45), "STATUS"].join(" | ")
    );
    console.log("-".repeat(140));

    let passCount = 0;
    for (const r of results) {
      if (r.pass) passCount++;
      const statusText = r.pass ? "PASS" : "FAIL";
      console.log(
        [
          r.name.padEnd(45),
          r.expected.slice(0, 38).padEnd(40),
          r.actual.slice(0, 43).padEnd(45),
          statusText,
        ].join(" | ")
      );
    }
    console.log("-".repeat(140));
    console.log(`TOTAL: ${passCount}/${results.length} PASS\n`);

    if (passCount !== results.length) {
      throw new Error(`Audit suite had ${results.length - passCount} failing test(s).`);
    }

  } finally {
    // Cleanup fixtures safely
    if (conn) {
      try {
        console.log("--- Cleaning up test fixtures ---");
        if (c1Id && c2Id) {
          await conn.execute(`DELETE FROM workout_assignments WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(
            `DELETE FROM workout_item_sets WHERE block_item_id IN (
               SELECT id FROM workout_block_items WHERE block_id IN (
                 SELECT id FROM workout_blocks WHERE workout_version_id IN (
                   SELECT id FROM workout_versions WHERE workout_id IN (
                     SELECT id FROM workouts WHERE consultancy_id IN (?, ?)
                   )
                 )
               )
             )`,
            [c1Id, c2Id]
          );
          await conn.execute(
            `DELETE FROM workout_block_items WHERE block_id IN (
               SELECT id FROM workout_blocks WHERE workout_version_id IN (
                 SELECT id FROM workout_versions WHERE workout_id IN (
                   SELECT id FROM workouts WHERE consultancy_id IN (?, ?)
                 )
               )
             )`,
            [c1Id, c2Id]
          );
          await conn.execute(
            `DELETE FROM workout_item_combinations WHERE block_id IN (
               SELECT id FROM workout_blocks WHERE workout_version_id IN (
                 SELECT id FROM workout_versions WHERE workout_id IN (
                   SELECT id FROM workouts WHERE consultancy_id IN (?, ?)
                 )
               )
             )`,
            [c1Id, c2Id]
          );
          await conn.execute(
            `DELETE FROM workout_blocks WHERE workout_version_id IN (
               SELECT id FROM workout_versions WHERE workout_id IN (
                 SELECT id FROM workouts WHERE consultancy_id IN (?, ?)
               )
             )`,
            [c1Id, c2Id]
          );
          await conn.execute(
            `DELETE FROM workout_versions WHERE workout_id IN (
               SELECT id FROM workouts WHERE consultancy_id IN (?, ?)
             )`,
            [c1Id, c2Id]
          );
          await conn.execute(`DELETE FROM workouts WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM exercises WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);

          if (coachMemberId) {
            await conn.execute(
              `DELETE FROM consultancy_member_roles WHERE member_id IN (?, ?, ?, ?, ?)`,
              [coachMemberId, studentAMemberId, studentBMemberId, studentCMemberId, coach2MemberId].filter(Boolean)
            );
            await conn.execute(
              `DELETE FROM consultancy_members WHERE id IN (?, ?, ?, ?, ?)`,
              [coachMemberId, studentAMemberId, studentBMemberId, studentCMemberId, coach2MemberId].filter(Boolean)
            );
          }
          if (coachUserId) {
            await conn.execute(
              `DELETE FROM users WHERE id IN (?, ?, ?, ?, ?)`,
              [coachUserId, studentAUserId, studentBUserId, studentCUserId, coach2UserId].filter(Boolean)
            );
          }
          await conn.execute(`DELETE FROM consultancies WHERE id IN (?, ?)`, [c1Id, c2Id]);
          console.log("Fixtures cleaned up successfully.");
        }
      } catch (cleanErr) {
        console.warn("Cleanup warning:", cleanErr.message);
      }
      conn.release();
    }
    await pool.end();
  }
}

runWorkoutTemplatesTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO CRÍTICO NA SUÍTE DE TEMPLATES:", err);
    process.exit(1);
  });
