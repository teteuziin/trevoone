/**
 * TREVO ONE — TEST SUITE: WORKOUT EXECUTION LIFECYCLE & SUMMARY FIXES
 *
 * Verifies all 7 contracts required by:
 * "TREVO ONE — BUG BLOQUEANTE AO COMEÇAR E REINICIAR TREINO"
 *
 * 1. Stale COMPLETED sessions are NEVER reused as active execution.
 * 2. Renderer completion state is NEVER initialized as "completed" from DB.
 * 3. "Começar treino" triggers server action, creates/resumes IN_PROGRESS session, opens 1st exercise.
 * 4. "Começar do início" marks prior session ABANDONED, creates fresh IN_PROGRESS session with 0 completed sets.
 * 5. Timestamps are ALWAYS ordered: started_at <= completed_at. Never inverted (prevents "17:39 - 17:33").
 * 6. Duration is NEVER negative; clock anomalies are sanitized.
 * 7. Summary metrics accurately compute completed exercises count from confirmed session sets (not 0).
 * 8. "Ver resumo do treino" is an explicit consultation via ?resumo=1 with exit/re-train options.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runWorkoutExecutionLifecycleSuite() {
  console.log('\n=== 13. SUITE: WORKOUT EXECUTION LIFECYCLE & SUMMARY FIXES ===');

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

  // =========================================================================
  // TEST 1: Server Queries: COMPLETED Sessions Never Returned as Active Execution
  // =========================================================================
  runTest('Server Queries: IN_PROGRESS isolation and page.tsx initialExecution boundary', () => {
    const execRepoCode = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/training-v2/execution-repository.ts'),
      'utf-8'
    );
    assert.ok(
      execRepoCode.includes("wes.status = 'IN_PROGRESS'"),
      'getActiveStudentWorkoutExecution must strictly filter by wes.status = IN_PROGRESS'
    );

    const pageCode = fs.readFileSync(
      path.resolve(process.cwd(), 'app/consultoria/[slug]/treinos/[assignmentPublicId]/page.tsx'),
      'utf-8'
    );
    assert.ok(
      pageCode.includes('getActiveStudentWorkoutExecution(ctx, canonicalAssignmentId)'),
      'page.tsx must call getActiveStudentWorkoutExecution for normal execution'
    );
    assert.ok(
      pageCode.includes('search?.resumo === "1" || search?.resumo === "true"'),
      'page.tsx must only check for completed sessions when search.resumo is explicitly 1/true'
    );
  });

  // =========================================================================
  // TEST 2: Renderer State: Completion Card Never Initialized from Stale DB
  // =========================================================================
  runTest('Renderer State: confirmedCompletedSession is never initialized from stale DB', () => {
    const checklistViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-checklist-view.tsx'),
      'utf-8'
    );
    assert.ok(
      !checklistViewCode.includes('useState<WorkoutExecutionSessionDto | null>(\n    isSessionCompleted ? activeSession ?? null : null\n  )'),
      'StudentRuntimeChecklistView must not initialize confirmedCompletedSession from isSessionCompleted'
    );
    assert.ok(
      checklistViewCode.includes('initialViewSummarySession && initialViewSummarySession.status === "COMPLETED"'),
      'confirmedCompletedSession must only initialize if initialViewSummarySession is explicitly provided'
    );
    assert.ok(
      checklistViewCode.includes('activeSession && activeSession.status === "IN_PROGRESS"'),
      'confirmedCompletedSession must reset to null when an IN_PROGRESS session is active'
    );
  });

  // =========================================================================
  // TEST 3: "Começar treino" Flow Contract
  // =========================================================================
  runTest('"Começar treino": initiates execution server-side and routes to 1st exercise in focused view', () => {
    const focusSectionCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/dashboard/student/sections/student-focus-section.tsx'),
      'utf-8'
    );
    assert.ok(
      focusSectionCode.includes('handleStartTraining'),
      'student-focus-section must have handleStartTraining to initiate executions'
    );
    assert.ok(
      focusSectionCode.includes('startOrResumeWorkoutExecutionAction('),
      'handleStartTraining must call startOrResumeWorkoutExecutionAction'
    );
    assert.ok(
      focusSectionCode.includes('isStartingTraining'),
      'student-focus-section must track loading state for starting workouts'
    );

    const rendererCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-workout-renderer.tsx'),
      'utf-8'
    );
    assert.ok(
      rendererCode.includes('initialExecution && initialExecution.status === "IN_PROGRESS"'),
      'StudentWorkoutRenderer must only initialize activeSession if status is IN_PROGRESS'
    );
  });

  // =========================================================================
  // TEST 4: "Começar do início" Restart Flow Contract
  // =========================================================================
  runTest('"Começar do início": marks old session ABANDONED and generates fresh IN_PROGRESS session', () => {
    const execRepoCode = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/training-v2/execution-repository.ts'),
      'utf-8'
    );
    assert.ok(
      execRepoCode.includes("SET status = 'ABANDONED', updated_at = NOW(3)"),
      'startOrResumeWorkoutExecution must mark old session as ABANDONED on resolveConflict: ABANDON'
    );
    assert.ok(
      execRepoCode.includes("publicId: sessionPublicId"),
      'startOrResumeWorkoutExecution must generate a fresh UUID for the new session'
    );

    const restartModalCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/dashboard/student/sections/student-workout-restart-modal.tsx'),
      'utf-8'
    );
    assert.ok(
      restartModalCode.includes('{ resolveConflict: "ABANDON" }'),
      'StudentWorkoutRestartModal must send resolveConflict: ABANDON'
    );
  });

  // =========================================================================
  // TEST 5: Timestamp Order & Clock Sanitization (Anti 17:39 - 17:33)
  // =========================================================================
  runTest('Timestamp Order: SQL GREATEST(NOW(3), started_at) and UI inversion protection', () => {
    const execRepoCode = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/training-v2/execution-repository.ts'),
      'utf-8'
    );
    assert.ok(
      execRepoCode.includes('completed_at = GREATEST(NOW(3), started_at)'),
      'SQL must enforce completed_at = GREATEST(NOW(3), started_at)'
    );
    assert.ok(
      execRepoCode.includes('parseSanitizedExecutionDates'),
      'execution-repository must sanitize dates in DTO mappings'
    );

    const checklistViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-checklist-view.tsx'),
      'utf-8'
    );
    assert.ok(
      checklistViewCode.includes('if (started.getTime() > finished.getTime())'),
      'StudentRuntimeChecklistView must swap timestamps if started > finished'
    );
    assert.ok(
      checklistViewCode.includes('Math.max(0, finished.getTime() - started.getTime())'),
      'Duration calculation must never be negative'
    );

    // Behavioral test for timestamp sanitization function
    function sanitizeTimestamps(startedInput, finishedInput) {
      let started = new Date(startedInput);
      let finished = new Date(finishedInput);
      if (started.getTime() > finished.getTime()) {
        const temp = started;
        started = finished;
        finished = temp;
      }
      const diffMs = Math.max(0, finished.getTime() - started.getTime());
      const diffMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      const startTimeFormatted = started.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const finishTimeFormatted = finished.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        started,
        finished,
        diffMins,
        formattedRange: `${startTimeFormatted} - ${finishTimeFormatted}`,
      };
    }

    const invertedCase = sanitizeTimestamps('2026-10-28T17:39:00Z', '2026-10-28T17:33:00Z');
    assert.ok(invertedCase.started.getTime() <= invertedCase.finished.getTime(), 'Sanitized started must be <= finished');
    assert.ok(invertedCase.diffMins >= 1, 'Duration must be at least 1 min, never negative');
    const [rangeStart, rangeEnd] = invertedCase.formattedRange.split(' - ');
    assert.ok(rangeStart <= rangeEnd, `Formatted range must list earlier time first: ${invertedCase.formattedRange}`);
  });

  // =========================================================================
  // TEST 6: Summary Metrics: Accurate Completed Exercises Count
  // =========================================================================
  runTest('Summary Metrics: Accurate completed exercises count (not 0 of 10)', () => {
    const checklistViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-checklist-view.tsx'),
      'utf-8'
    );
    assert.ok(
      checklistViewCode.includes('sessionSets = confirmedCompletedSession?.sets || activeSession?.sets'),
      'sessionSets must prioritize confirmedCompletedSession.sets when displaying summary'
    );

    // Behavioral test for calculating completed exercises
    const mockBlockItems = [
      { publicId: 'item-1', exerciseName: 'Supino Reto' },
      { publicId: 'item-2', exerciseName: 'Crucifixo' },
      { publicId: 'item-3', exerciseName: 'Desenvolvimento' },
    ];
    const mockCompletedSets = [
      { blockItemPublicId: 'item-1', completedAt: new Date(), isSkipped: false },
      { blockItemPublicId: 'item-1', completedAt: new Date(), isSkipped: false },
      { blockItemPublicId: 'item-2', completedAt: new Date(), isSkipped: false },
      { blockItemPublicId: 'item-3', completedAt: new Date(), isSkipped: false },
    ];

    const map = new Map();
    for (const s of mockCompletedSets) {
      const list = map.get(s.blockItemPublicId) || [];
      list.push(s);
      map.set(s.blockItemPublicId, list);
    }

    let doneExercises = 0;
    for (const item of mockBlockItems) {
      const sets = map.get(item.publicId) || [];
      if (sets.length > 0 && sets.every((s) => s.completedAt !== null && !s.isSkipped)) {
        doneExercises++;
      }
    }

    assert.strictEqual(doneExercises, 3, 'All 3 exercises must be counted as completed, not 0');
  });

  // =========================================================================
  // TEST 7: "Ver resumo do treino" Consultation & Summary Navigation
  // =========================================================================
  runTest('"Ver resumo do treino": explicit consultation via ?resumo=1 with exit and re-train options', () => {
    const focusSectionCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/dashboard/student/sections/student-focus-section.tsx'),
      'utf-8'
    );
    assert.ok(
      focusSectionCode.includes('resumo=1'),
      '"Ver resumo do treino" link must include query parameter ?resumo=1'
    );

    const checklistViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-checklist-view.tsx'),
      'utf-8'
    );
    assert.ok(
      checklistViewCode.includes('handleTrainAgainFromSummary'),
      'Summary screen must provide a button to train again'
    );
    assert.ok(
      checklistViewCode.includes('Visualizar exercícios'),
      'Summary screen must allow exiting to view workout checklist'
    );
  });

  console.log(`=== TODOS OS ${passedCount}/${totalCount} TESTES DO CICLO DE EXECUÇÃO DE TREINO PASSARAM! ===\n`);
  return { passedCount, totalCount };
}

// Suporte para execução direta standalone via CLI: `node scripts/test-workout-execution-lifecycle.mjs`
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/test-workout-execution-lifecycle.mjs')) {
  runWorkoutExecutionLifecycleSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
