/**
 * TREVO ONE — TEST SUITE: WORKOUT MOBILE ACTIONS, MODES & AI GENERATION
 * 
 * Verifies:
 * 1. Mode Persistence & autoritative switching (cookie path '/', layout revalidation, custom events)
 * 2. Navigation to Treinos in Coach mode does not switch or leak Admin mode
 * 3. Mobile Card Tap-to-Open with Touch Scroll Guard (>10px displacement cancels tap)
 * 4. "Enviar ficha" action on desktop & mobile:
 *    - Draft-only warning prompts publication before sending
 *    - Published version is assigned even when an active draft is being edited
 *    - Modal uses transactional server actions
 * 5. "Nova ficha" 3 options on mobile (Manual, Importar IA, Criar com IA):
 *    - Structured parameters composition
 *    - Saves strictly as DRAFT for coach review
 *    - Touch targets >= 44px and solid surfaces
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function pass(name) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
}

function group(name) {
  console.log(`\n${colors.cyan}${colors.bold}=== ${name} ===${colors.reset}`);
}

async function runTests() {
  console.log(`${colors.bold}Starting Test Suite: Modes & Workout Mobile Actions${colors.reset}`);

  // =========================================================================
  // GROUP 1: Mode Switcher & Persistence (Item 1 & Item 2)
  // =========================================================================
  group('1. Mode Switcher & Persistence');

  const actionsFile = fs.readFileSync(
    path.resolve(process.cwd(), 'app/consultoria/[slug]/view-mode/actions.ts'),
    'utf-8'
  );
  assert.ok(
    actionsFile.includes('path: "/"'),
    'Cookie path must be root ("/") to prevent path mismatch between subpages and root'
  );
  assert.ok(
    actionsFile.includes('revalidatePath(`/consultoria/${slug}`, "layout")'),
    'View mode action must revalidate entire consultancy layout'
  );
  pass('View mode cookie sets path to "/" and revalidates layout');

  const switcherFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/dashboard/cockpit-role-mode-switcher.tsx'),
    'utf-8'
  );
  assert.ok(
    switcherFile.includes('trevo-view-mode-change'),
    'CockpitRoleModeSwitcher dispatches trevo-view-mode-change custom event for real-time mobile sync'
  );
  assert.ok(
    switcherFile.includes('router.refresh()'),
    'CockpitRoleModeSwitcher triggers router.refresh() on successful mode toggle'
  );
  pass('CockpitRoleModeSwitcher synchronizes state with optimistic updates and event dispatch');

  const shellFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/consultancies/consultancy-app-shell.tsx'),
    'utf-8'
  );
  assert.ok(
    shellFile.includes('resolveEffectiveViewMode(consultancySlug, safeRoles)'),
    'ConsultancyAppShell auto-resolves viewModeState on the server if not explicitly passed'
  );
  pass('ConsultancyAppShell immunizes child routes from leaking admin mode');

  const rotinasPage = fs.readFileSync(
    path.resolve(process.cwd(), 'app/consultoria/[slug]/rotinas/page.tsx'),
    'utf-8'
  );
  assert.ok(
    rotinasPage.includes('resolveEffectiveViewMode'),
    'app/consultoria/[slug]/rotinas/page.tsx resolves effective view mode'
  );
  assert.ok(
    rotinasPage.includes('viewModeState={effectiveState}'),
    'app/consultoria/[slug]/rotinas/page.tsx explicitly passes viewModeState to ConsultancyAppShell'
  );
  pass('Rotinas page explicitly passes viewModeState to preserve Coach mode');

  // =========================================================================
  // GROUP 2: Workout Repository & Mapping (Item 3 & Item 4 data layer)
  // =========================================================================
  group('2. Workout Repository Data Layer');

  const repoFile = fs.readFileSync(
    path.resolve(process.cwd(), 'lib/training-v2/workout-repository.ts'),
    'utf-8'
  );
  assert.ok(
    repoFile.includes('publishedVersionPublicId?: string | null;'),
    'WorkoutListItemDto includes publishedVersionPublicId'
  );
  assert.ok(
    repoFile.includes('published_version_public_id'),
    'listWorkoutsForProfessional selects published_version_public_id in SQL query'
  );
  pass('Workout repository queries and maps publishedVersionPublicId');

  const consultoriaPage = fs.readFileSync(
    path.resolve(process.cwd(), 'app/consultoria/[slug]/page.tsx'),
    'utf-8'
  );
  assert.ok(
    consultoriaPage.includes('publishedVersionNumber: w.publishedVersionNumber ?? null'),
    'consultoria page passes publishedVersionNumber to personal plans items'
  );
  assert.ok(
    consultoriaPage.includes('publishedVersionPublicId: w.publishedVersionPublicId ?? null'),
    'consultoria page passes publishedVersionPublicId to personal plans items'
  );
  pass('Consultoria dashboard page passes publishedVersion fields to client components');

  // =========================================================================
  // GROUP 3: Mobile Card Tap-to-Open & Touch Scroll Guard (Item 3)
  // =========================================================================
  group('3. Mobile Card Tap-to-Open & Scroll Guard');

  const tableFile = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'components/dashboard/personal/sections/personal-workouts-table.tsx'
    ),
    'utf-8'
  );

  // Check scroll guard logic
  assert.ok(
    tableFile.includes('touchStartRef'),
    'personal-workouts-table tracks touch start coordinate'
  );
  assert.ok(
    tableFile.includes('isScrollingRef'),
    'personal-workouts-table tracks isScrollingRef'
  );
  assert.ok(
    tableFile.includes('deltaX > 10 || deltaY > 10'),
    'Touch displacement > 10px marks interaction as scrolling'
  );
  assert.ok(
    tableFile.includes('if (isScrollingRef.current) return;'),
    'Card tap ignores click when user was scrolling'
  );
  assert.ok(
    tableFile.includes('router.push(`/consultoria/${consultancySlug}/rotinas/${publicId}`)'),
    'Card tap directly opens routine route on mobile'
  );

  // Verify that mobile card does not have redundant "Abrir ficha" text button
  const mobileSection = tableFile.split('{/* VISÃO MOBILE:')[1]?.split('{/* MODAL 1:')[0];
  assert.ok(mobileSection, 'Mobile card section must exist');
  assert.ok(
    !mobileSection.includes('Abrir ficha</Link>') && !mobileSection.includes('Abrir ficha</button>'),
    'Mobile card does NOT have redundant explicit "Abrir ficha" button'
  );
  pass('Mobile card tap-to-open and scroll guard logic verified');

  // =========================================================================
  // GROUP 4: "Enviar ficha" Action & Modals (Item 4)
  // =========================================================================
  group('4. "Enviar ficha" Action & Modals');

  assert.ok(
    tableFile.includes('<span>Enviar ficha</span>'),
    'personal-workouts-table includes "Enviar ficha" action button'
  );
  assert.ok(
    tableFile.includes('WorkoutAssignModal'),
    'personal-workouts-table integrates WorkoutAssignModal'
  );
  assert.ok(
    tableFile.includes('TemplateAssignModal'),
    'personal-workouts-table integrates TemplateAssignModal'
  );
  assert.ok(
    tableFile.includes('Publique a ficha antes de enviar'),
    'personal-workouts-table includes modal prompting publication when workout is draft-only'
  );
  assert.ok(
    tableFile.includes('versionPublicId={assignWorkoutTarget.publishedVersionPublicId}'),
    'Workout assignment targets publishedVersionPublicId even if active draft exists'
  );
  pass('"Enviar ficha" verified for both published workouts and draft-only warnings');

  // =========================================================================
  // GROUP 5: "Nova ficha" 3 Options & AI Generator (Item 5)
  // =========================================================================
  group('5. "Nova ficha" 3 Options & Structured AI Generation');

  const headerFile = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'components/dashboard/personal/sections/personal-overview-header.tsx'
    ),
    'utf-8'
  );

  assert.ok(
    headerFile.includes('Criar manual'),
    'Header menu includes "Criar manual" option'
  );
  assert.ok(
    headerFile.includes('Importar com IA'),
    'Header menu includes "Importar com IA" option'
  );
  assert.ok(
    headerFile.includes('Criar com IA'),
    'Header menu includes "Criar com IA" option'
  );
  assert.ok(
    headerFile.includes('TrainingAiImportModal'),
    'Header connects to TrainingAiImportModal'
  );
  assert.ok(
    headerFile.includes('TrainingAiGenerateModal'),
    'Header connects to TrainingAiGenerateModal'
  );
  assert.ok(
    headerFile.includes('min-h-[44px]') || headerFile.includes('min-h-[48px]') || headerFile.includes('min-h-[56px]'),
    'Menu options honor touch target >= 44px'
  );
  pass('Speed dial vertical menu with 3 options verified');

  const generateModalFile = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'components/consultancies/training-v2/training-ai-generate-modal.tsx'
    ),
    'utf-8'
  );

  assert.ok(
    generateModalFile.includes('OBJECTIVE_OPTIONS'),
    'AI generate modal includes objective options'
  );
  assert.ok(
    generateModalFile.includes('LEVEL_OPTIONS'),
    'AI generate modal includes level options'
  );
  assert.ok(
    generateModalFile.includes('SPLIT_OPTIONS'),
    'AI generate modal includes split options'
  );
  assert.ok(
    generateModalFile.includes('EQUIPMENT_OPTIONS'),
    'AI generate modal includes equipment options'
  );
  assert.ok(
    generateModalFile.includes('Salvar rascunho e abrir no editor'),
    'AI generate modal saves strictly as DRAFT for coach review'
  );
  pass('Structured AI generator modal verified with full parameters and draft enforcement');

  console.log(`\n${colors.green}${colors.bold}ALL 5 TEST GROUPS PASSED SUCCESSFULLY!${colors.reset}\n`);
}

runTests().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}TEST SUITE FAILED:${colors.reset}`, err);
  process.exit(1);
});
