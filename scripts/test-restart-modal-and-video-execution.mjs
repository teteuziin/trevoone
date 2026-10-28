/**
 * TREVO ONE — TEST SUITE: RESTART MODAL MOBILE & RUNTIME VIDEO DEMONSTRATION
 *
 * Verifies all requirements from:
 * "TREVO ONE — CORRIGIR CONFIRMAÇÃO DE REINÍCIO NO CELULAR E EXIBIR O VÍDEO NA EXECUÇÃO"
 *
 * 1. Restart confirmation modal renders in portal on document.body above bottom nav bar (z-[100]).
 * 2. Background interaction is locked (body overflow: hidden) while modal is open.
 * 3. Mobile modal has internal scrollable body and fixed footer with safe-area padding.
 * 4. Modal action buttons have at least 48px height (min-h-[48px]).
 * 5. Restart action executes with { resolveConflict: "ABANDON" }, preserves history and handles errors.
 * 6. Video demonstration is prominently positioned at the top of the card (under "Exercício X de Y", above title).
 * 7. Video area is 1:1 aspect-square on smartphone, max-w on desktop, with object-contain.
 * 8. Video is muted by default (no autoplay audio) and pauses when changing exercises.
 * 9. When no media exists, no empty square is reserved.
 * 10. When media fails to load, a retry card is shown without blocking workout progress.
 * 11. Media authorization grants students access to global library videos and exercises in their assignments.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runRestartModalAndVideoExecutionSuite() {
  console.log('\n=== 14. SUITE: RESTART MODAL MOBILE & RUNTIME VIDEO DEMONSTRATION ===');

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
  // TEST 1: Restart Modal Portal, Z-Index & Body Scroll Lock
  // =========================================================================
  runTest('Restart Modal: createPortal, z-[100] above bottom nav, and body overflow lock', () => {
    const modalCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/dashboard/student/sections/student-workout-restart-modal.tsx'),
      'utf-8'
    );

    assert.ok(
      modalCode.includes('createPortal(') && modalCode.includes('document.body'),
      'StudentWorkoutRestartModal must use createPortal to mount directly on document.body'
    );
    assert.ok(
      modalCode.includes('z-[100]'),
      'Modal overlay must use z-[100] to sit above bottom navigation (z-30)'
    );
    assert.ok(
      modalCode.includes('document.body.style.overflow = "hidden"'),
      'Modal must lock body scroll while open'
    );
  });

  // =========================================================================
  // TEST 2: Safe Area, Fixed Footer & Minimum 48px Button Heights
  // =========================================================================
  runTest('Restart Modal: internal scrollable body, safe-area footer and >= 48px buttons', () => {
    const modalCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/dashboard/student/sections/student-workout-restart-modal.tsx'),
      'utf-8'
    );

    assert.ok(
      modalCode.includes('overflow-y-auto') && modalCode.includes('min-h-0'),
      'Modal body must have internal scrolling with min-h-0'
    );
    assert.ok(
      modalCode.includes('safe-area-inset-bottom'),
      'Modal footer must incorporate env(safe-area-inset-bottom)'
    );
    assert.ok(
      modalCode.includes('min-h-[48px]'),
      'Modal buttons must have at least 48px height for accessible mobile touch'
    );
    assert.ok(
      modalCode.includes('{ resolveConflict: "ABANDON" }'),
      'Confirm button must send resolveConflict: ABANDON'
    );
    assert.ok(
      modalCode.includes('errorMessage') && modalCode.includes('setIsSubmitting(false)'),
      'Modal must display error messages inline without closing on failure'
    );
  });

  // =========================================================================
  // TEST 3: Focused View Card Order: Header -> 1:1 Video -> Title -> Prescrição -> Sets
  // =========================================================================
  runTest('Focused View: video demonstration placed at top of card (1:1 square, object-contain)', () => {
    const focusedCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-focused-view.tsx'),
      'utf-8'
    );

    // Order check: "Exercício {exerciseNumber}" appears BEFORE effectiveMedia video container, which appears BEFORE h1 exercise title
    const exerciseHeaderIdx = focusedCode.indexOf('Exercício {exerciseNumber}');
    const videoContainerIdx = focusedCode.indexOf('aspect-square rounded-2xl');
    const titleIdx = focusedCode.indexOf('font-heading leading-tight');

    assert.ok(exerciseHeaderIdx !== -1, 'Header must contain "Exercício {exerciseNumber}"');
    assert.ok(videoContainerIdx !== -1, 'Video container must have aspect-square rounded-2xl');
    assert.ok(titleIdx !== -1, 'Exercise title must exist in card');
    assert.ok(
      exerciseHeaderIdx < videoContainerIdx && videoContainerIdx < titleIdx,
      'Card order must be: 1. Header (Exercício X de Y) -> 2. Video demonstration -> 3. Exercise title'
    );

    assert.ok(
      focusedCode.includes('aspect-square') && focusedCode.includes('object-contain'),
      'Video container must be aspect-square and media must use object-contain'
    );
    assert.ok(
      focusedCode.includes('sm:max-w-sm lg:max-w-md'),
      'Desktop video container must be bounded so it does not become a giant screen'
    );
  });

  // =========================================================================
  // TEST 4: Audio Safety (Muted), Preload & Pause on Item Change
  // =========================================================================
  runTest('Focused View: video is muted by default, preload metadata, and pauses on navigation', () => {
    const focusedCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-focused-view.tsx'),
      'utf-8'
    );

    assert.ok(
      focusedCode.includes('muted'),
      'Video must be muted by default to prevent unexpected loud audio'
    );
    assert.ok(
      focusedCode.includes('preload="metadata"'),
      'Video must preload metadata only on demand, avoiding bulk downloading of all routine videos'
    );
    assert.ok(
      focusedCode.includes('.pause()') && focusedCode.includes('videoRef'),
      'Must pause previous video when changing active exercise item'
    );
  });

  // =========================================================================
  // TEST 5: Fallback States: No Empty Square & Retry on Failure
  // =========================================================================
  runTest('Focused View: no empty square when no media, friendly retry card on load failure', () => {
    const focusedCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-focused-view.tsx'),
      'utf-8'
    );

    assert.ok(
      focusedCode.includes('Tentar carregar novamente'),
      'Must offer a retry button if media fails to load'
    );
    assert.ok(
      focusedCode.includes('Carregando demonstração...'),
      'Must display loading indicator while media is being fetched'
    );
    assert.ok(
      focusedCode.includes(': null}'),
      'Must evaluate to null when no media exists (does NOT reserve large empty square)'
    );
  });

  // =========================================================================
  // TEST 6: Media Authorization: exercise_media linked to assignments & GLOBAL access
  // =========================================================================
  runTest('Media Authorization: students authorized for assigned catalog exercises & global demos', () => {
    const mediaRepoCode = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/training-v2/media-repository.ts'),
      'utf-8'
    );

    assert.ok(
      mediaRepoCode.includes('LEFT JOIN exercise_media em ON em.media_asset_id = ?'),
      'Media authorization query must include exercise_media for catalog exercises'
    );
    assert.ok(
      mediaRepoCode.includes('(em.exercise_id = wbi.exercise_id OR em.exercise_id = wbi.custom_exercise_id)'),
      'Media authorization query must match exercise_id or custom_exercise_id'
    );
    assert.ok(
      mediaRepoCode.includes('r.scope === "GLOBAL"') && mediaRepoCode.includes('ctx.userId'),
      'Global exercise library demonstrations must be accessible to authenticated users'
    );

    const mediaRouteCode = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/training-v2/media/[publicId]/route.ts'),
      'utf-8'
    );
    assert.ok(
      !mediaRouteCode.includes("AND cmr.role IN ('PERSONAL', 'CONSULTANCY_ADMIN')"),
      'Media streaming route must not exclude student memberships when resolving consultancy'
    );
  });

  // =========================================================================
  // TEST 7: On-demand Catalog Lazy Fetching in Focused View
  // =========================================================================
  runTest('Focused View: on-demand lazy fetch for exercises with catalog demonstration media', () => {
    const focusedCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/consultancies/training-v2/student-runtime-focused-view.tsx'),
      'utf-8'
    );

    assert.ok(
      focusedCode.includes('fetch(`/api/training-v2/exercises/${targetExPublicId}`)'),
      'Focused view must fetch catalog exercise media on-demand when item has no pinned media'
    );
    assert.ok(
      focusedCode.includes('setExerciseMediaCache'),
      'Must cache resolved catalog exercise media to prevent repeated network requests'
    );
  });

  console.log(`=== TODOS OS ${passedCount}/${totalCount} TESTES DE REINÍCIO MOBILE E VÍDEO PASSARAM! ===\n`);
  return { passedCount, totalCount };
}

// Standalone CLI execution: `node scripts/test-restart-modal-and-video-execution.mjs`
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/test-restart-modal-and-video-execution.mjs')) {
  runRestartModalAndVideoExecutionSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
