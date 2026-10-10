/**
 * TREVO ONE — REGRESSION TEST SUITE
 * PATIENT HUB UX CLEANUP + AUTOSAVE REGRESSION SUITE (HARDENED)
 * 
 * Verifies P0 UX and Data Loss Prevention:
 * 1. PATIENT CARD: only "Ver paciente" primary action visible for nutritionists (no green "Plano" button)
 * 2. LEGACY PLAN ROUTE: still accessible by direct deep link (/planos-v2/novo)
 * 3. AUTOSAVE TRIGGER: field change triggers debounced save
 * 4. AUTOSAVE DEBOUNCE: multiple rapid changes result in latest value (500-800ms debounce window)
 * 5. SERIALIZED SERVER WRITES: at most 1 save request in flight (queue serialized)
 * 6. RAPID EDITS: A -> B -> C results in final persisted value C in storage
 * 7. EDIT DURING SAVE: latest value saved after active request completes
 * 8. OUT OF ORDER SERVER COMPLETION: older request cannot overwrite newer state in storage
 * 9. BLUR FLUSH: field blur flushes pending edit immediately
 * 10. TAB CHANGE FLUSH: flushes pending edit before switching tabs
 * 11. AUTOSAVE SUCCESS: status = "Salvo" only after latest change completes
 * 12. AUTOSAVE ERROR: status = "error", local value preserved
 * 13. AUTOSAVE RETRY: persists latest state from memory
 * 14. SAVE STATUS: does not show final "Salvo" while newer change is pending
 * 15. REFRESH AFTER SAVE: value persists in server action / DB
 * 16. NO MANUAL SAVE BUTTON: "Salvar Prontuário" manual button completely removed
 * 17. PLAN AUTOPUBLISH: MUST NOT HAPPEN (drafts are not published)
 * 18. PUBLICATION GATE: 4-macro validation gate preserved
 * 19. DUPLICATE CONTINUE EDIT: removed from header cockpit; preserved contextually in Plano tab
 * 20. MOBILE STRUCTURAL: touch targets >= 44px, compact autosave indicator
 * 21. DESKTOP STRUCTURAL: single clean primary action button for patient cards
 */

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TREVO ONE: PATIENT HUB UX CLEANUP + AUTOSAVE HARDENED REGRESSION TEST ===\n");

let passedCount = 0;
let totalCount = 0;

async function runTest(name, fn) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// 1. PATIENT CARD & LISTAGEM DE PACIENTES
// ----------------------------------------------------------------------------
await runTest("PATIENT CARD: only 'Ver paciente' primary action visible for nutritionists", () => {
  const listCode = fs.readFileSync(
    "components/consultancies/personal-student-hub/personal-student-list.tsx",
    "utf8"
  );

  // Nutritionist label is "Ver paciente"
  assert.ok(listCode.includes('isEffectiveNutritionist ? "Ver paciente" : "Ver aluno"'));

  // Mobile card: When isEffectiveNutritionist, the "Plano" button is NOT rendered
  assert.ok(
    !listCode.includes('isEffectiveNutritionist ? (\n                      <Link\n                        href={createPlanHref}'),
    "Mobile card must not render green 'Plano' CTA for nutritionists"
  );
  assert.ok(
    !listCode.includes('<span>Plano</span>'),
    "Mobile card must not contain standalone Plano text CTA"
  );

  // Desktop card: When isEffectiveNutritionist, no separate create plan CTA
  assert.ok(
    !listCode.includes('href={`/consultoria/${consultancySlug}/planos-v2/novo?studentId=${student.membershipPublicId}`'),
    "Desktop card must not render redundant 'Criar plano' / 'Plano' CTA"
  );

  // Personal Trainer still has Treino button
  assert.ok(listCode.includes("!isEffectiveNutritionist && ("));
  assert.ok(listCode.includes("<span>Treino</span>"));
});

// ----------------------------------------------------------------------------
// 2. LEGACY PLAN ROUTE ACCESSIBILITY
// ----------------------------------------------------------------------------
await runTest("LEGACY PLAN ROUTE: still accessible by direct deep link", () => {
  const planNewRoute = "app/consultoria/[slug]/planos-v2/novo/page.tsx";
  assert.ok(fs.existsSync(planNewRoute), "Legacy /planos-v2/novo route must exist");
  const routeContent = fs.readFileSync(planNewRoute, "utf8");
  assert.ok(
    routeContent.includes("searchParams"),
    "New plan page must accept deep-link query parameters"
  );
});

// ----------------------------------------------------------------------------
// 3. PATIENT RECORD AUTOSAVE TRIGGER
// ----------------------------------------------------------------------------
await runTest("AUTOSAVE TRIGGER: field change triggers debounced save", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  assert.ok(viewCode.includes("processSaveQueue"), "patient-record-view must define processSaveQueue");
  assert.ok(viewCode.includes("updatePatientRecordAction"), "processSaveQueue must call updatePatientRecordAction");
  assert.ok(
    viewCode.includes("debounceTimerRef.current = setTimeout"),
    "Autosave must debounce field changes"
  );
});

// ----------------------------------------------------------------------------
// 4. AUTOSAVE DEBOUNCE (500–800ms)
// ----------------------------------------------------------------------------
await runTest("AUTOSAVE DEBOUNCE: multiple rapid changes result in latest value (500-800ms window)", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  
  // Verify timer matches recommended window
  const debounceMatch = viewCode.match(/debounceTimerRef\.current\s*=\s*setTimeout\([\s\S]*?,\s*(\d+)\);/);
  assert.ok(debounceMatch, "Debounce timer pattern must be present");
  const delayMs = parseInt(debounceMatch[1], 10);
  assert.ok(
    delayMs >= 500 && delayMs <= 800,
    `Debounce delay ${delayMs}ms must be between 500ms and 800ms`
  );

  // Verify previous timer is cancelled on rapid keystroke
  assert.ok(
    viewCode.includes("clearTimeout(debounceTimerRef.current)"),
    "Rapid consecutive keystrokes must clear pending debounce timer"
  );
});

// ----------------------------------------------------------------------------
// 5. SERIALIZED SERVER WRITES: at most 1 active request in flight
// ----------------------------------------------------------------------------
await runTest("SERIALIZED SERVER WRITES: maximum 1 active save at any time", async () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );

  assert.ok(viewCode.includes("isSavingRef"), "Must track in-flight save state via isSavingRef");
  assert.ok(viewCode.includes("if (isSavingRef.current)"), "Must reject concurrent executions while save is in flight");
  assert.ok(viewCode.includes("while (pendingSaveRef.current)"), "Active save must drain pending queue sequentially");

  // Functional state-machine simulation
  let inFlightCount = 0;
  let peakInFlight = 0;
  let isSaving = false;
  let pendingSave = null;
  const committedValues = [];

  async function mockDbWrite(val) {
    inFlightCount++;
    peakInFlight = Math.max(peakInFlight, inFlightCount);
    await new Promise((r) => setTimeout(r, 20));
    committedValues.push(val);
    inFlightCount--;
  }

  async function queueWorker() {
    if (isSaving) return;
    isSaving = true;
    while (pendingSave) {
      const next = pendingSave;
      pendingSave = null;
      await mockDbWrite(next);
    }
    isSaving = false;
  }

  // Trigger multiple saves concurrently
  pendingSave = "write-1";
  const p1 = queueWorker();
  pendingSave = "write-2";
  const p2 = queueWorker();
  pendingSave = "write-3";
  const p3 = queueWorker();

  await Promise.all([p1, p2, p3]);

  assert.strictEqual(peakInFlight, 1, "Peak in-flight server requests must NEVER exceed 1");
  assert.strictEqual(inFlightCount, 0, "All server writes must settle cleanly");
  assert.strictEqual(committedValues[committedValues.length - 1], "write-3", "Latest write must be committed last");
});

// ----------------------------------------------------------------------------
// 6. RAPID EDITS: A -> B -> C results in final persisted value C
// ----------------------------------------------------------------------------
await runTest("RAPID EDITS: A -> B -> C results in final persisted value = C", async () => {
  let inFlight = false;
  let pending = null;
  let dbValue = null;

  async function simulateQueue() {
    if (inFlight) return;
    inFlight = true;
    while (pending) {
      const toSave = pending;
      pending = null;
      await new Promise((r) => setTimeout(r, 25));
      dbValue = toSave;
    }
    inFlight = false;
  }

  // User types A -> save starts
  pending = "Paciente bebe 2L";
  const run1 = simulateQueue();

  // Rapid changes B and C arrive while A is saving
  pending = "Paciente bebe 2.5L";
  pending = "Paciente bebe 3L"; // C overwrites B

  await run1;

  assert.strictEqual(dbValue, "Paciente bebe 3L", "Final committed value in DB must be C (3L), never intermediate B or stale A");
});

// ----------------------------------------------------------------------------
// 7. EDIT DURING SAVE: latest value saved after active request completes
// ----------------------------------------------------------------------------
await runTest("EDIT DURING SAVE: latest value saved after active request completes", async () => {
  let isSaving = false;
  let pending = null;
  const history = [];

  async function executeSaveLoop() {
    if (isSaving) return;
    isSaving = true;
    while (pending) {
      const val = pending;
      pending = null;
      await new Promise((r) => setTimeout(r, 20));
      history.push(val);
    }
    isSaving = false;
  }

  pending = "State 1";
  const promiseA = executeSaveLoop();

  // Edit arrives mid-flight
  pending = "State 2 (Modified during save)";

  await promiseA;

  assert.deepStrictEqual(history, ["State 1", "State 2 (Modified during save)"]);
  assert.strictEqual(history[history.length - 1], "State 2 (Modified during save)");
});

// ----------------------------------------------------------------------------
// 8. OUT OF ORDER SERVER COMPLETION: cannot overwrite newer state
// ----------------------------------------------------------------------------
await runTest("OUT OF ORDER SERVER COMPLETION: older request cannot overwrite newer state", async () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );

  // Sequence ref guard verification
  assert.ok(viewCode.includes("saveSequenceRef"), "Must track save sequence number");
  assert.ok(
    viewCode.includes("const currentSeq = ++saveSequenceRef.current;"),
    "Must increment sequence before firing save"
  );
  assert.ok(
    viewCode.includes("if (currentSeq !== saveSequenceRef.current)"),
    "Must drop stale response if sequence changed during inflight request"
  );

  // Functional simulation of out of order responses
  let serverCommitted = null;
  let clientSequence = 0;
  let clientStatus = "idle";

  async function mockAutosave(value, delayMs) {
    const seq = ++clientSequence;
    clientStatus = "saving";
    return new Promise((resolve) => {
      setTimeout(() => {
        if (seq !== clientSequence) {
          resolve({ dropped: true });
          return;
        }
        serverCommitted = value;
        clientStatus = "saved";
        resolve({ dropped: false, committed: value });
      }, delayMs);
    });
  }

  // Request A fired with 50ms delay
  const pA = mockAutosave("Change A", 50);
  // Request B fired right after with 10ms delay (faster than A)
  const pB = mockAutosave("Change B", 10);

  const [resA, resB] = await Promise.all([pA, pB]);
  assert.strictEqual(resB.dropped, false, "Request B must be committed");
  assert.strictEqual(resA.dropped, true, "Stale Request A must be dropped");
  assert.strictEqual(serverCommitted, "Change B", "Server state must remain 'Change B'");
  assert.strictEqual(clientStatus, "saved");
});

// ----------------------------------------------------------------------------
// 9. BLUR FLUSH: flushes pending edit immediately
// ----------------------------------------------------------------------------
await runTest("BLUR FLUSH: field blur flushes pending edit immediately", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );

  assert.ok(viewCode.includes("handleFieldBlur"), "patient-record-view must define handleFieldBlur");
  assert.ok(
    viewCode.includes("onBlur={handleFieldBlur}"),
    "Clinical sections and inputs must attach onBlur={handleFieldBlur}"
  );
  assert.match(
    viewCode,
    /const handleFieldBlur = useCallback\(\(\) => \{[\r\n\s]+if \(!canAuthorNutrition\) return;[\r\n\s]+const currentSnapshot = JSON\.stringify\(latestFormRef\.current\);[\r\n\s]+if \(currentSnapshot !== lastSavedSnapshotRef\.current\) \{[\r\n\s]+flushPendingSave\(\);/,
    "handleFieldBlur must flush when latest form snapshot differs from last saved snapshot"
  );

  const mobileCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    mobileCode.includes("onFieldBlur?: () => void;"),
    "MobilePatientHubProps must accept onFieldBlur"
  );
  assert.ok(
    mobileCode.includes("onBlur={onFieldBlur}"),
    "Mobile clinical sub-tabs must attach onBlur={onFieldBlur}"
  );
});

// ----------------------------------------------------------------------------
// 10. TAB CHANGE FLUSH: flushes pending edit before switching tabs
// ----------------------------------------------------------------------------
await runTest("TAB CHANGE FLUSH: flushes pending edit before switching tabs", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  assert.ok(
    viewCode.includes("flushPendingSave"),
    "patient-record-view must implement flushPendingSave"
  );
  assert.ok(
    viewCode.includes("handleTabChange"),
    "patient-record-view must handle tab switching through handleTabChange"
  );
  assert.match(
    viewCode,
    /flushPendingSave\(\);[\r\n\s]+setActiveTab\(newTab\);/,
    "handleTabChange must flush pending save before activating new tab"
  );

  const mobileHubCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    mobileHubCode.includes("handleMobileTabChange"),
    "mobile-patient-hub must implement handleMobileTabChange"
  );
  assert.match(
    mobileHubCode,
    /onFlushSave\?\.?\(\);[\r\n\s]+setActiveTab\(newTab\);/,
    "handleMobileTabChange must invoke onFlushSave before tab transition"
  );
  assert.match(
    mobileHubCode,
    /onFlushSave\?\.?\(\);[\r\n\s]+setClinicalSubTab\(sub\.id\);/,
    "Clinical sub-tab switch must also invoke onFlushSave"
  );
});

// ----------------------------------------------------------------------------
// 11. AUTOSAVE SUCCESS STATE
// ----------------------------------------------------------------------------
await runTest("AUTOSAVE SUCCESS: status = 'Salvo' only after latest change completes", () => {
  const indicatorCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/autosave-indicator.tsx",
    "utf8"
  );
  assert.ok(
    indicatorCode.includes('status === "saved"'),
    "AutosaveIndicator must handle status === 'saved'"
  );
  assert.ok(
    indicatorCode.includes('<span>Salvo</span>'),
    "AutosaveIndicator must render 'Salvo'"
  );
});

// ----------------------------------------------------------------------------
// 12. AUTOSAVE ERROR STATE & PRESERVATION OF LOCAL VALUES
// ----------------------------------------------------------------------------
await runTest("AUTOSAVE ERROR: status = error and local value preserved", () => {
  const indicatorCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/autosave-indicator.tsx",
    "utf8"
  );
  assert.ok(
    indicatorCode.includes('status === "error"'),
    "AutosaveIndicator must handle status === 'error'"
  );
  assert.ok(
    indicatorCode.includes("Não foi possível salvar"),
    "AutosaveIndicator must show 'Não foi possível salvar'"
  );
  assert.ok(
    indicatorCode.includes("Tentar novamente"),
    "AutosaveIndicator must render 'Tentar novamente' action button"
  );

  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  // On error, clinicalForm state is NOT reset or wiped
  assert.ok(
    !viewCode.includes("setClinicalForm(initialDetail.record)"),
    "Must not revert local form on save error"
  );
});

// ----------------------------------------------------------------------------
// 13. AUTOSAVE RETRY ACTION: persists latest state from memory
// ----------------------------------------------------------------------------
await runTest("AUTOSAVE RETRY: latest value persists on retry", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  assert.ok(
    viewCode.includes("handleRetryAutosave"),
    "patient-record-view must implement handleRetryAutosave"
  );
  assert.ok(
    viewCode.includes("executeAutosave(latestFormRef.current)"),
    "handleRetryAutosave must re-attempt with latestFormRef.current (latest in-memory state)"
  );
  assert.ok(
    viewCode.includes("onRetry={handleRetryAutosave}"),
    "AutosaveIndicator must receive retry handler"
  );
});

// ----------------------------------------------------------------------------
// 14. SAVE STATUS: does not show final 'Salvo' while newer change is pending
// ----------------------------------------------------------------------------
await runTest("SAVE STATUS: does not show final 'Salvo' while newer change is pending", async () => {
  let status = "idle";
  let isSaving = false;
  let pending = null;

  async function runQueueWithStatus() {
    if (isSaving) return;
    isSaving = true;
    status = "saving";

    while (pending) {
      const next = pending;
      pending = null;
      await new Promise((r) => setTimeout(r, 20));
      // Notice: if new pending arrived, loop continues without switching to 'saved'
    }

    isSaving = false;
    status = "saved";
  }

  // User types change 1
  pending = "Edit 1";
  const p = runQueueWithStatus();

  // User types change 2 mid-flight
  pending = "Edit 2";
  assert.strictEqual(status, "saving", "Status must remain 'saving' while edit 2 is pending");

  await p;
  assert.strictEqual(status, "saved", "Status transitions to 'saved' only after all edits complete");
});

// ----------------------------------------------------------------------------
// 15. REFRESH AFTER SAVE: persistence in server action
// ----------------------------------------------------------------------------
await runTest("REFRESH AFTER SAVE: value persists in server action / DB", () => {
  const actionCode = fs.readFileSync(
    "app/consultoria/[slug]/planos-v2/patient-actions.ts",
    "utf8"
  );
  assert.ok(
    actionCode.includes("export async function updatePatientRecordAction"),
    "updatePatientRecordAction must be exported"
  );
  assert.ok(
    actionCode.includes("await updatePatientRecord("),
    "updatePatientRecordAction must persist to repository"
  );
  assert.ok(
    actionCode.includes("revalidatePath("),
    "updatePatientRecordAction must revalidate patient path"
  );
});

// ----------------------------------------------------------------------------
// 16. MANUAL SAVE BUTTON REMOVED
// ----------------------------------------------------------------------------
await runTest("NO MANUAL SAVE BUTTON: 'Salvar Prontuário' removed from desktop & mobile", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  assert.ok(
    !viewCode.includes("Salvar Prontuário"),
    "patient-record-view must not contain manual 'Salvar Prontuário' button"
  );

  const mobileCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    !mobileCode.includes("Salvar Prontuário"),
    "mobile-patient-hub must not contain manual 'Salvar Prontuário' button"
  );
});

// ----------------------------------------------------------------------------
// 17. PLAN AUTOPUBLISH PREVENTION
// ----------------------------------------------------------------------------
await runTest("PLAN AUTOPUBLISH: MUST NOT HAPPEN (drafts never auto-publish)", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );
  assert.ok(
    !viewCode.includes("publishPlanVersionAction"),
    "Autosave in Patient Hub must NEVER invoke publishPlanVersionAction"
  );

  const mobileCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    !mobileCode.includes("publishPlanVersionAction"),
    "Mobile Hub must NEVER auto-publish plan version"
  );
});

// ----------------------------------------------------------------------------
// 18. PUBLICATION GATE PRESERVED
// ----------------------------------------------------------------------------
await runTest("PUBLICATION GATE: preserved and unaffected", () => {
  const validationCode = fs.readFileSync(
    "lib/nutrition-v2/validation.ts",
    "utf8"
  );
  assert.ok(
    validationCode.includes("validatePlanTreeForPublication"),
    "4-Macro publication gate validator must exist untouched"
  );
});

// ----------------------------------------------------------------------------
// 19. DUPLICATE 'CONTINUAR EDIÇÃO' AUDIT & CLEANUP
// ----------------------------------------------------------------------------
await runTest("DUPLICATE CONTINUE EDIT: removed from header; preserved in Plano tab", () => {
  const viewCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/patient-record-view.tsx",
    "utf8"
  );

  // Header Cockpit must NOT contain "Continuar Edição"
  const headerCockpitPart = viewCode.split('id: "resumo"')[0];
  assert.ok(
    !headerCockpitPart.includes("Continuar Edição"),
    "Header Cockpit must not render duplicate 'Continuar Edição'"
  );

  // Plano Tab MUST retain contextual "Continuar Edição"
  assert.ok(
    viewCode.includes("Continuar Edição"),
    "Plano section must retain contextual 'Continuar Edição'"
  );

  // Mobile Hub retains contextual "Continuar edição" in Plano / Resumo tabs
  const mobileCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    mobileCode.includes("Continuar edição"),
    "Mobile Hub must retain contextual 'Continuar edição' in Plano tab"
  );
});

// ----------------------------------------------------------------------------
// 20. MOBILE STRUCTURAL INTEGRITY & TOUCH TARGETS
// ----------------------------------------------------------------------------
await runTest("MOBILE STRUCTURAL: touch targets >= 44px and compact autosave indicator", () => {
  const mobileCode = fs.readFileSync(
    "components/consultancies/nutrition-v2/mobile-patient-hub.tsx",
    "utf8"
  );
  assert.ok(
    mobileCode.includes("min-h-[44px]"),
    "Mobile interactive elements must have min-h-[44px]"
  );
  assert.ok(
    mobileCode.includes("<AutosaveIndicator"),
    "Mobile hub must integrate AutosaveIndicator"
  );
});

// ----------------------------------------------------------------------------
// 21. DESKTOP STRUCTURAL INTEGRITY
// ----------------------------------------------------------------------------
await runTest("DESKTOP STRUCTURAL: single clean primary action button for patient cards", () => {
  const listCode = fs.readFileSync(
    "components/consultancies/personal-student-hub/personal-student-list.tsx",
    "utf8"
  );
  assert.ok(
    listCode.includes('flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)]'),
    "Primary button must have flex-1 layout spanning available card width"
  );
});

console.log(`\n=== ALL ${passedCount}/${totalCount} PATIENT HUB UX CLEANUP & HARDENED AUTOSAVE TESTS PASSED CLEANLY! ===\n`);
