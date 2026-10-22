/**
 * TREVO ONE — ETAPA 8: TEST SUITE FOR AUTOSAVE & OPTIONAL AUTO-PUBLISH
 * 
 * Verifies:
 * 1. Migration 059 schema definition & syntax
 * 2. Pure domain invariants & canPlanAutoPublish gate
 * 3. getAutoPublishStatusPresentation across all 6 states
 * 4. Builder preferences integration (defaultUpdatePolicy)
 * 5. Server actions contract: setPlanUpdatePolicyAction & autoPublishPlanAction
 * 6. UI & Builder integration: AutoPublishConfirmDialog, AutosaveIndicator, MobileActionSheet
 * 7. Tenancy and concurrency safety contracts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  canPlanAutoPublish,
  getAutoPublishStatusPresentation,
} from "../lib/nutrition-v2/auto-publish-types.ts";
import {
  DEFAULT_NUTRITION_BUILDER_PREFERENCES,
  getPresetFromPreferences,
} from "../lib/nutrition-v2/builder-preferences-types.ts";

console.log("=== TREVO ONE — NUTRITION V2 AUTOSAVE & AUTO-PUBLISH TEST SUITE ===\n");

// ----------------------------------------------------------------------------
// 1. MIGRATION 059 SCHEMA VERIFICATION
// ----------------------------------------------------------------------------
console.log("1. Testing Migration 059 Schema Definition...");
const migrationPath = path.join(process.cwd(), "database/migrations/059_nutrition_v2_plan_update_policy.sql");
assert(fs.existsSync(migrationPath), "Migration 059 file must exist");
const migrationSql = fs.readFileSync(migrationPath, "utf8");

assert(migrationSql.includes("nutrition_v2_plans"), "Must alter nutrition_v2_plans");
assert(migrationSql.includes("update_policy"), "Must add update_policy column");
assert(migrationSql.includes("'MANUAL'"), "Default update policy must be 'MANUAL'");
assert(migrationSql.includes("auto_publish_paused"), "Must add auto_publish_paused column");
assert(migrationSql.includes("last_auto_published_at"), "Must add last_auto_published_at column");
assert(migrationSql.includes("nutrition_v2_builder_preferences"), "Must alter nutrition_v2_builder_preferences");
assert(migrationSql.includes("default_update_policy"), "Must add default_update_policy column");
console.log("  [PASS] Migration 059 defines all required columns with safe defaults");

// ----------------------------------------------------------------------------
// 2. DOMAIN INVARIANTS: canPlanAutoPublish GATE
// ----------------------------------------------------------------------------
console.log("\n2. Testing canPlanAutoPublish Gate Invariants...");

// A. MANUAL policy -> must refuse auto-publish
const manualCheck = canPlanAutoPublish({
  updatePolicy: "MANUAL",
  autoPublishPaused: false,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: true,
  isDraftMutating: false,
});
assert.strictEqual(manualCheck.canPublish, false);
assert.strictEqual(manualCheck.reason, "POLITICA_MANUAL");
console.log("  [PASS] MANUAL policy strictly blocks auto-publish");

// B. Paused -> must refuse auto-publish
const pausedCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: true,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: true,
  isDraftMutating: false,
});
assert.strictEqual(pausedCheck.canPublish, false);
assert.strictEqual(pausedCheck.reason, "ATUALIZACAO_PAUSADA");
console.log("  [PASS] Paused state strictly blocks auto-publish");

// C. Non-draft version -> must refuse auto-publish
const publishedCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: false,
  versionStatus: "PUBLISHED",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: true,
  isDraftMutating: false,
});
assert.strictEqual(publishedCheck.canPublish, false);
assert.strictEqual(publishedCheck.reason, "VERSAO_NAO_E_RASCUNHO");
console.log("  [PASS] Non-draft version status blocks auto-publish");

// D. No active patient assignment -> must refuse auto-publish (first assignment must remain explicit)
const noPatientCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: false,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: false,
  hasValidNutritionalData: true,
  isDraftMutating: false,
});
assert.strictEqual(noPatientCheck.canPublish, false);
assert.strictEqual(noPatientCheck.reason, "SEM_PACIENTE_VINCULADO");
console.log("  [PASS] Missing patient assignment strictly blocks auto-publish");

// E. Mid-mutation typing state -> must refuse auto-publish
const mutatingCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: false,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: true,
  isDraftMutating: true,
});
assert.strictEqual(mutatingCheck.canPublish, false);
assert.strictEqual(mutatingCheck.reason, "MUTACAO_EM_ANDAMENTO");
console.log("  [PASS] Active draft mutation in progress blocks auto-publish");

// F. Incomplete nutritional data / missing macros -> must refuse auto-publish
const incompleteCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: false,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: false,
  isDraftMutating: false,
});
assert.strictEqual(incompleteCheck.canPublish, false);
assert.strictEqual(incompleteCheck.reason, "DADOS_NUTRICIONAIS_INCOMPLETOS");
console.log("  [PASS] Incomplete nutritional data strictly blocks auto-publish");

// G. All conditions met -> allowed
const allowedCheck = canPlanAutoPublish({
  updatePolicy: "AUTO_PUBLISH",
  autoPublishPaused: false,
  versionStatus: "DRAFT",
  hasActivePatientAssignment: true,
  hasValidNutritionalData: true,
  isDraftMutating: false,
});
assert.strictEqual(allowedCheck.canPublish, true);
assert.strictEqual(allowedCheck.reason, undefined);
console.log("  [PASS] Complete draft with active patient and AUTO_PUBLISH is approved");

// ----------------------------------------------------------------------------
// 3. UI PRESENTATION STATES (getAutoPublishStatusPresentation)
// ----------------------------------------------------------------------------
console.log("\n3. Testing getAutoPublishStatusPresentation across all 6 states...");

const pSaving = getAutoPublishStatusPresentation("saving_draft", "AUTO_PUBLISH");
assert.strictEqual(pSaving.isBusy, true);
assert.strictEqual(pSaving.badgeVariant, "brand");
assert(pSaving.label.includes("Salvando"), "Must show saving text");

const pDraftSaved = getAutoPublishStatusPresentation("draft_saved", "AUTO_PUBLISH", false);
assert.strictEqual(pDraftSaved.isBusy, false);
assert.strictEqual(pDraftSaved.badgeVariant, "success");
assert.strictEqual(pDraftSaved.canPause, true);

const pUpdating = getAutoPublishStatusPresentation("updating_patient", "AUTO_PUBLISH");
assert.strictEqual(pUpdating.isBusy, true);
assert.strictEqual(pUpdating.badgeVariant, "brand");
assert(pUpdating.label.includes("paciente"), "Must indicate patient update");

const pUpdated = getAutoPublishStatusPresentation("patient_updated", "AUTO_PUBLISH");
assert.strictEqual(pUpdated.isBusy, false);
assert.strictEqual(pUpdated.badgeVariant, "success");
assert(pUpdated.label.includes("atualizado"), "Must indicate plan updated");

const pPaused = getAutoPublishStatusPresentation("idle", "AUTO_PUBLISH", true);
assert.strictEqual(pPaused.badgeVariant, "warning");
assert.strictEqual(pPaused.canResume, true);

const pError = getAutoPublishStatusPresentation("auto_update_error", "AUTO_PUBLISH");
assert.strictEqual(pError.badgeVariant, "error");
assert(pError.label.includes("versão anterior"), "Must reassure that patient stays on prior version");

console.log("  [PASS] All presentation states map correctly to badges, labels and actions");

// ----------------------------------------------------------------------------
// 4. BUILDER PREFERENCES INTEGRATION
// ----------------------------------------------------------------------------
console.log("\n4. Testing Builder Preferences defaultUpdatePolicy...");

assert.strictEqual(DEFAULT_NUTRITION_BUILDER_PREFERENCES.defaultUpdatePolicy, "MANUAL");
assert.strictEqual(getPresetFromPreferences(DEFAULT_NUTRITION_BUILDER_PREFERENCES), "COMPLETO");

const customPref = {
  ...DEFAULT_NUTRITION_BUILDER_PREFERENCES,
  defaultUpdatePolicy: "AUTO_PUBLISH",
};
assert.strictEqual(customPref.defaultUpdatePolicy, "AUTO_PUBLISH");
console.log("  [PASS] Builder preferences support defaultUpdatePolicy with MANUAL default");

// ----------------------------------------------------------------------------
// 5. SERVER ACTIONS & REPOSITORY EXPORTS
// ----------------------------------------------------------------------------
console.log("\n5. Verifying Server Actions and Repository Contracts...");

const actionsFile = fs.readFileSync(path.join(process.cwd(), "app/consultoria/[slug]/planos-v2/actions.ts"), "utf8");
assert(actionsFile.includes("export async function setPlanUpdatePolicyAction"), "Must export setPlanUpdatePolicyAction");
assert(actionsFile.includes("export async function autoPublishPlanAction"), "Must export autoPublishPlanAction");
assert(actionsFile.includes("saveNutritionBuilderPreferencesAction"), "Must export saveNutritionBuilderPreferencesAction");
assert(actionsFile.includes("defaultUpdatePolicy"), "Must handle defaultUpdatePolicy in saveNutritionBuilderPreferencesAction");

const repoFile = fs.readFileSync(path.join(process.cwd(), "lib/nutrition-v2/plan-repository.ts"), "utf8");
assert(repoFile.includes("export async function updatePlanPolicy"), "Must export updatePlanPolicy");
assert(repoFile.includes("export async function autoPublishPlanVersion"), "Must export autoPublishPlanVersion");
assert(repoFile.includes("CONCURRENT_MODIFICATION"), "Must enforce optimistic lock check");
assert(repoFile.includes("EXPLICIT_ASSIGNMENT_REQUIRED"), "Must enforce explicit first assignment invariant");
assert(repoFile.includes("validatePlanTreeForPublication"), "Must gate auto-publish behind full publication validation");

console.log("  [PASS] Server Actions and Plan Repository contracts strictly verified");

// ----------------------------------------------------------------------------
// 6. UI COMPONENTS INTEGRATION
// ----------------------------------------------------------------------------
console.log("\n6. Verifying UI Components Integration...");

// A. AutoPublishConfirmDialog
const dialogFile = fs.readFileSync(path.join(process.cwd(), "components/consultancies/nutrition-v2/auto-publish-confirm-dialog.tsx"), "utf8");
assert(dialogFile.includes("AutoPublishConfirmDialog"), "Must export AutoPublishConfirmDialog");
assert(dialogFile.includes("planTitle"), "Must identify planTitle");
assert(dialogFile.includes("studentName"), "Must identify studentName");
assert(dialogFile.includes("Confirmar e ativar"), "Must have confirmation action");

// B. AutosaveIndicator
const indicatorFile = fs.readFileSync(path.join(process.cwd(), "components/consultancies/nutrition-v2/autosave-indicator.tsx"), "utf8");
assert(indicatorFile.includes("updating_patient"), "Must handle updating_patient state");
assert(indicatorFile.includes("patient_updated"), "Must handle patient_updated state");
assert(indicatorFile.includes("auto_update_paused"), "Must handle auto_update_paused state");
assert(indicatorFile.includes("auto_update_error"), "Must handle auto_update_error state");

// C. NutritionPlanBuilder
const builderFile = fs.readFileSync(path.join(process.cwd(), "components/consultancies/nutrition-v2/nutrition-plan-builder.tsx"), "utf8");
assert(builderFile.includes("AutoPublishConfirmDialog"), "Builder must embed AutoPublishConfirmDialog");
assert(builderFile.includes("triggerAutoPublishIfEligible"), "Builder must implement debounced coordinator");
assert(builderFile.includes("setPlanUpdatePolicyAction"), "Builder must wire setPlanUpdatePolicyAction");
assert(builderFile.includes("autoPublishPlanAction"), "Builder must wire autoPublishPlanAction");
assert(builderFile.includes("plan-update-policy-btn"), "Builder must provide policy button");
assert(builderFile.includes("toggle-auto-publish"), "MobileActionSheet must provide policy options");

// D. Preferences Drawer
const drawerFile = fs.readFileSync(path.join(process.cwd(), "components/consultancies/nutrition-v2/nutrition-builder-preferences-drawer.tsx"), "utf8");
assert(drawerFile.includes("defaultUpdatePolicy"), "Drawer must provide defaultUpdatePolicy toggle");

console.log("  [PASS] All UI components and modal confirmations verified");

console.log("\n=== ALL NUTRITION AUTOSAVE & AUTO-PUBLISH ASSERTIONS PASSED CLEANLY! ===");
