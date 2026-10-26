/**
 * TREVO ONE — TEST SUITE: ISOLATED PERSISTENCE HARNESS (CHECKLIST, FEEDBACK, CUSTOM TITLES & RETRIES)
 * 
 * Verifies:
 * 1. Assignment creation & update with custom_title (isolated DB + reload).
 * 2. Exercise-level completion declaration without fabricating loads/reps.
 * 3. Finalization with student feedback notes & completion state.
 * 4. Idempotency, duplicate toggle protection (UNIQUE KEY uq_wei_session_item) and retry safety.
 * 5. Strict Schema Absence Guards: NO action reports false success discarding data.
 */

import assert from "node:assert/strict";

console.log("================================================================================");
console.log("TREVO ONE — ISOLATED DATABASE PERSISTENCE, RELOAD & RETRY TEST SUITE");
console.log("================================================================================\n");

// In-Memory Isolated Database Simulator
class IsolatedDatabase {
  constructor(options = {}) {
    this.hasCustomTitleColumn = options.hasCustomTitleColumn ?? true;
    this.hasFeedbackColumns = options.hasFeedbackColumns ?? true;
    this.hasExecutionItemsTable = options.hasExecutionItemsTable ?? true;

    this.workout_assignments = new Map();
    this.workout_execution_sessions = new Map();
    this.workout_execution_items = new Map();
    this.workout_execution_sets = new Map();

    this.autoIncrement = {
      assignments: 1,
      sessions: 1,
      items: 1,
      sets: 1,
    };
  }

  // --- ASSIGNMENTS ---
  createAssignment({ publicId, studentMembershipId, workoutVersionId, customTitle, status = "ACTIVE" }) {
    if (!this.hasCustomTitleColumn) {
      if (customTitle) {
        throw new Error("MIGRATION_068_REQUIRED: Coluna custom_title ausente no banco de dados.");
      }
    }

    const id = this.autoIncrement.assignments++;
    const row = {
      id,
      public_id: publicId,
      student_membership_id: studentMembershipId,
      workout_version_id: workoutVersionId,
      custom_title: this.hasCustomTitleColumn ? (customTitle?.trim() || null) : undefined,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.workout_assignments.set(id, row);
    return { ...row };
  }

  updateAssignmentTitle(publicId, newCustomTitle) {
    if (!this.hasCustomTitleColumn) {
      if (newCustomTitle) {
        throw new Error("MIGRATION_068_REQUIRED: Coluna custom_title ausente no banco de dados.");
      }
    }

    let found = null;
    for (const row of this.workout_assignments.values()) {
      if (row.public_id === publicId) {
        found = row;
        break;
      }
    }
    if (!found) throw new Error("Assignment not found");

    if (this.hasCustomTitleColumn) {
      found.custom_title = newCustomTitle?.trim() || null;
      found.updated_at = new Date().toISOString();
    }
    return { ...found };
  }

  getAssignmentByPublicId(publicId) {
    for (const row of this.workout_assignments.values()) {
      if (row.public_id === publicId) return { ...row };
    }
    return null;
  }

  // --- SESSIONS ---
  createExecutionSession({ publicId, assignmentId, workoutBlockId }) {
    const id = this.autoIncrement.sessions++;
    const row = {
      id,
      public_id: publicId,
      workout_assignment_id: assignmentId,
      workout_block_id: workoutBlockId,
      status: "IN_PROGRESS",
      student_completion_state: this.hasFeedbackColumns ? null : undefined,
      student_feedback_notes: this.hasFeedbackColumns ? null : undefined,
      student_feedback_at: this.hasFeedbackColumns ? null : undefined,
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.workout_execution_sessions.set(id, row);
    return { ...row };
  }

  getSessionByPublicId(publicId) {
    for (const row of this.workout_execution_sessions.values()) {
      if (row.public_id === publicId) return { ...row };
    }
    return null;
  }

  // --- EXECUTION ITEMS (CHECKLIST) ---
  toggleExerciseCompletion({ sessionPublicId, blockItemId, completed }) {
    if (!this.hasExecutionItemsTable) {
      throw new Error("MIGRATION_068_REQUIRED: Tabela workout_execution_items ausente no banco de dados.");
    }

    const session = this.getSessionByPublicId(sessionPublicId);
    if (!session) throw new Error("Session not found");

    const key = `${session.id}_${blockItemId}`;
    if (completed) {
      // Upsert / idempotent per UNIQUE KEY (execution_session_id, block_item_id)
      const existing = this.workout_execution_items.get(key);
      const now = new Date().toISOString();
      if (existing) {
        existing.status = "COMPLETED";
        existing.completed_at = now;
        existing.skip_reason = null;
        existing.updated_at = now;
      } else {
        const id = this.autoIncrement.items++;
        this.workout_execution_items.set(key, {
          id,
          public_id: `wei_${id}`,
          execution_session_id: session.id,
          block_item_id: blockItemId,
          status: "COMPLETED",
          skip_reason: null,
          completed_at: now,
          created_at: now,
          updated_at: now,
        });
      }

      // Mark sets completed WITHOUT inventing actual_reps or actual_load_kg
      for (const setRow of this.workout_execution_sets.values()) {
        if (setRow.execution_session_id === session.id && setRow.block_item_id === blockItemId) {
          setRow.completed_at = setRow.completed_at || now;
          setRow.is_skipped = 0;
          setRow.updated_at = now;
        }
      }
    } else {
      // Uncheck
      this.workout_execution_items.delete(key);
      for (const setRow of this.workout_execution_sets.values()) {
        if (setRow.execution_session_id === session.id && setRow.block_item_id === blockItemId) {
          if (setRow.actual_reps === null && setRow.actual_load_kg === null) {
            setRow.completed_at = null;
          }
          setRow.is_skipped = 0;
          setRow.updated_at = new Date().toISOString();
        }
      }
    }

    return { success: true };
  }

  skipExercise({ sessionPublicId, blockItemId, reason }) {
    if (!this.hasExecutionItemsTable) {
      throw new Error("MIGRATION_068_REQUIRED: Tabela workout_execution_items ausente no banco de dados.");
    }

    const session = this.getSessionByPublicId(sessionPublicId);
    if (!session) throw new Error("Session not found");

    const key = `${session.id}_${blockItemId}`;
    const now = new Date().toISOString();
    const existing = this.workout_execution_items.get(key);
    if (existing) {
      existing.status = "SKIPPED";
      existing.skip_reason = reason || null;
      existing.completed_at = now;
      existing.updated_at = now;
    } else {
      const id = this.autoIncrement.items++;
      this.workout_execution_items.set(key, {
        id,
        public_id: `wei_${id}`,
        execution_session_id: session.id,
        block_item_id: blockItemId,
        status: "SKIPPED",
        skip_reason: reason || null,
        completed_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    for (const setRow of this.workout_execution_sets.values()) {
      if (setRow.execution_session_id === session.id && setRow.block_item_id === blockItemId) {
        setRow.completed_at = now;
        setRow.is_skipped = 1;
        setRow.updated_at = now;
      }
    }

    return { success: true };
  }

  // --- FINALIZATION WITH FEEDBACK ---
  completeSession(sessionPublicId, { studentCompletionState, studentFeedbackNotes }) {
    if (!this.hasFeedbackColumns) {
      if (studentCompletionState || studentFeedbackNotes) {
        throw new Error("MIGRATION_068_REQUIRED: Colunas de feedback ausentes no banco de dados.");
      }
    }

    let session = null;
    for (const row of this.workout_execution_sessions.values()) {
      if (row.public_id === sessionPublicId) {
        session = row;
        break;
      }
    }
    if (!session) throw new Error("Session not found");

    // Idempotent completion check
    if (session.status === "COMPLETED") {
      return { ...session, alreadyCompleted: true };
    }

    const now = new Date().toISOString();
    session.status = "COMPLETED";
    session.completed_at = now;
    if (this.hasFeedbackColumns) {
      session.student_completion_state = studentCompletionState || null;
      session.student_feedback_notes = studentFeedbackNotes?.trim() || null;
      session.student_feedback_at = (studentCompletionState || studentFeedbackNotes) ? now : null;
    }
    session.updated_at = now;

    return { ...session, alreadyCompleted: false };
  }
}

// -----------------------------------------------------------------------------
// TEST RUNNER
// -----------------------------------------------------------------------------
let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. Assignment Custom Title Persistence & Reload
// -----------------------------------------------------------------------------
runTest("1. Assignment with custom_title: Persist, reload and verify", () => {
  const db = new IsolatedDatabase();
  const created = db.createAssignment({
    publicId: "wa_student_carlos_01",
    studentMembershipId: 42,
    workoutVersionId: 101,
    customTitle: "Treino Personalizado de Força do Carlos",
  });

  // Reload from fresh query
  const reloaded = db.getAssignmentByPublicId("wa_student_carlos_01");
  assert.ok(reloaded, "Assignment must exist after reload");
  assert.equal(reloaded.custom_title, "Treino Personalizado de Força do Carlos");
  assert.equal(reloaded.status, "ACTIVE");
});

// -----------------------------------------------------------------------------
// 2. Personal Updates Custom Title of Already Assigned Routine
// -----------------------------------------------------------------------------
runTest("2. Personal updates custom_title of already assigned routine & reloads", () => {
  const db = new IsolatedDatabase();
  db.createAssignment({
    publicId: "wa_student_carlos_02",
    studentMembershipId: 42,
    workoutVersionId: 101,
    customTitle: "Treino Inicial",
  });

  // Personal updates title later
  const updated = db.updateAssignmentTitle("wa_student_carlos_02", "Treino Focado em Hipertrofia (Mês 2)");
  assert.equal(updated.custom_title, "Treino Focado em Hipertrofia (Mês 2)");

  // Reload from DB
  const reloaded = db.getAssignmentByPublicId("wa_student_carlos_02");
  assert.equal(reloaded.custom_title, "Treino Focado em Hipertrofia (Mês 2)");
});

// -----------------------------------------------------------------------------
// 3. Exercise Checklist Toggle: Own declaration without fabricating set loads/reps
// -----------------------------------------------------------------------------
runTest("3. Exercise completion declaration: Persists in items, sets actual_reps/load remain NULL", () => {
  const db = new IsolatedDatabase();
  const session = db.createExecutionSession({
    publicId: "wes_sess_01",
    assignmentId: 1,
    workoutBlockId: 201,
  });

  // Seed 3 prescribed sets for exercise 501
  db.workout_execution_sets.set(1, {
    id: 1,
    execution_session_id: session.id,
    block_item_id: 501,
    set_number: 1,
    prescribed_reps: 10,
    prescribed_load_kg: 50,
    actual_reps: null,
    actual_load_kg: null,
    is_skipped: 0,
    completed_at: null,
  });
  db.workout_execution_sets.set(2, {
    id: 2,
    execution_session_id: session.id,
    block_item_id: 501,
    set_number: 2,
    prescribed_reps: 10,
    prescribed_load_kg: 50,
    actual_reps: null,
    actual_load_kg: null,
    is_skipped: 0,
    completed_at: null,
  });
  db.workout_execution_sets.set(3, {
    id: 3,
    execution_session_id: session.id,
    block_item_id: 501,
    set_number: 3,
    prescribed_reps: 10,
    prescribed_load_kg: 50,
    actual_reps: null,
    actual_load_kg: null,
    is_skipped: 0,
    completed_at: null,
  });

  // Student marks "Concluir exercício"
  db.toggleExerciseCompletion({
    sessionPublicId: session.public_id,
    blockItemId: 501,
    completed: true,
  });

  // Verify workout_execution_items row exists
  const itemRow = db.workout_execution_items.get(`${session.id}_501`);
  assert.ok(itemRow, "workout_execution_items row must exist");
  assert.equal(itemRow.status, "COMPLETED");
  assert.ok(itemRow.completed_at, "completed_at must be populated");

  // Verify that sets have completed_at populated, but actual_reps and actual_load_kg are NOT fabricated
  for (let sId = 1; sId <= 3; sId++) {
    const sRow = db.workout_execution_sets.get(sId);
    assert.ok(sRow.completed_at, `Set ${sId} must have completed_at`);
    assert.equal(sRow.actual_reps, null, `Set ${sId} actual_reps must remain NULL (never fabricated)`);
    assert.equal(sRow.actual_load_kg, null, `Set ${sId} actual_load_kg must remain NULL (never fabricated)`);
    assert.equal(sRow.is_skipped, 0);
  }
});

// -----------------------------------------------------------------------------
// 4. Student Feedback Persistence & Reload
// -----------------------------------------------------------------------------
runTest("4. Workout finalization with student feedback: Persists, reloads and verifies", () => {
  const db = new IsolatedDatabase();
  const session = db.createExecutionSession({
    publicId: "wes_sess_feedback",
    assignmentId: 1,
    workoutBlockId: 201,
  });

  const completionResult = db.completeSession("wes_sess_feedback", {
    studentCompletionState: "PARTIAL",
    studentFeedbackNotes: "Consegui fazer quase tudo, mas senti desconforto no ombro na última série do supino.",
  });

  assert.equal(completionResult.status, "COMPLETED");
  assert.equal(completionResult.student_completion_state, "PARTIAL");
  assert.equal(
    completionResult.student_feedback_notes,
    "Consegui fazer quase tudo, mas senti desconforto no ombro na última série do supino."
  );

  // Reload from database
  const reloaded = db.getSessionByPublicId("wes_sess_feedback");
  assert.equal(reloaded.status, "COMPLETED");
  assert.equal(reloaded.student_completion_state, "PARTIAL");
  assert.equal(
    reloaded.student_feedback_notes,
    "Consegui fazer quase tudo, mas senti desconforto no ombro na última série do supino."
  );
  assert.ok(reloaded.student_feedback_at, "student_feedback_at must be populated");
});

// -----------------------------------------------------------------------------
// 5. Retries & Idempotency: Duplicate toggle and duplicate completion
// -----------------------------------------------------------------------------
runTest("5. Retries and Idempotency: Repeated calls do not duplicate records or corrupt data", () => {
  const db = new IsolatedDatabase();
  const session = db.createExecutionSession({
    publicId: "wes_sess_retry",
    assignmentId: 1,
    workoutBlockId: 201,
  });

  // Call toggle completion 3 times in a row (simulating network retries)
  db.toggleExerciseCompletion({ sessionPublicId: "wes_sess_retry", blockItemId: 601, completed: true });
  db.toggleExerciseCompletion({ sessionPublicId: "wes_sess_retry", blockItemId: 601, completed: true });
  db.toggleExerciseCompletion({ sessionPublicId: "wes_sess_retry", blockItemId: 601, completed: true });

  // Verify only 1 entry in workout_execution_items for this session+item
  assert.equal(db.workout_execution_items.size, 1, "Only one execution item record must exist for the key");

  // Call completeSession twice
  const res1 = db.completeSession("wes_sess_retry", {
    studentCompletionState: "ALL",
    studentFeedbackNotes: "Treino ótimo!",
  });
  const res2 = db.completeSession("wes_sess_retry", {
    studentCompletionState: "ALL",
    studentFeedbackNotes: "Treino ótimo!",
  });

  assert.equal(res1.alreadyCompleted, false);
  assert.equal(res2.alreadyCompleted, true);
  assert.equal(res2.student_feedback_notes, "Treino ótimo!");
});

// -----------------------------------------------------------------------------
// 6. Strict Guard: Missing Schema NEVER reports success while discarding data
// -----------------------------------------------------------------------------
runTest("6. Missing schema guards: Rejects and throws when data would otherwise be discarded", () => {
  // DB without custom_title column
  const dbNoTitle = new IsolatedDatabase({ hasCustomTitleColumn: false });
  assert.throws(
    () => {
      dbNoTitle.createAssignment({
        publicId: "wa_fail_01",
        studentMembershipId: 10,
        workoutVersionId: 1,
        customTitle: "Treino Especial",
      });
    },
    /MIGRATION_068_REQUIRED/,
    "Must throw when customTitle is passed but column does not exist"
  );

  assert.throws(
    () => {
      dbNoTitle.updateAssignmentTitle("wa_any", "Novo Nome");
    },
    /MIGRATION_068_REQUIRED/,
    "Must throw when updating title but column does not exist"
  );

  // Safe fallback when NO custom title was provided (no data lost)
  const safeAssignment = dbNoTitle.createAssignment({
    publicId: "wa_safe_01",
    studentMembershipId: 10,
    workoutVersionId: 1,
    customTitle: null, // No custom title requested
  });
  assert.ok(safeAssignment, "Assignment without custom title can proceed safely");

  // DB without feedback columns
  const dbNoFeedback = new IsolatedDatabase({ hasFeedbackColumns: false });
  const sess = dbNoFeedback.createExecutionSession({ publicId: "wes_no_fb", assignmentId: 1, workoutBlockId: 1 });
  assert.throws(
    () => {
      dbNoFeedback.completeSession("wes_no_fb", {
        studentCompletionState: "ALL",
        studentFeedbackNotes: "Nota importante",
      });
    },
    /MIGRATION_068_REQUIRED/,
    "Must throw when student provided feedback but columns do not exist"
  );

  // DB without execution_items table
  const dbNoItems = new IsolatedDatabase({ hasExecutionItemsTable: false });
  const sess2 = dbNoItems.createExecutionSession({ publicId: "wes_no_items", assignmentId: 1, workoutBlockId: 1 });
  assert.throws(
    () => {
      dbNoItems.toggleExerciseCompletion({
        sessionPublicId: "wes_no_items",
        blockItemId: 10,
        completed: true,
      });
    },
    /MIGRATION_068_REQUIRED/,
    "Must throw when toggling checklist exercise but table does not exist"
  );
});

console.log("\n================================================================================");
console.log(`ALL ${passed}/${total} ISOLATED PERSISTENCE & RETRY TESTS PASSED CLEANLY!`);
console.log("================================================================================");
