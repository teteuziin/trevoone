import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  resolveClinicalFieldsProvenance,
} = await import("../lib/nutrition-v2/patient-record-repository.ts");

const {
  validatePatientRecordInput,
  validateClinicalNoteInput,
  validatePregnancyInput,
} = await import("../lib/nutrition-v2/patient-record-validation.ts");

console.log("==================================================");
console.log("TREVO ONE — ETAPA 9: REGISTRO GERAL E PRONTUÁRIO NUTRICIONAL TEST SUITE");
console.log("==================================================");

let passed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// 1. PROVENANCE & STRICT TRI-STATE: CAMPO VAZIO NUNCA SIGNIFICA "NÃO"
// ----------------------------------------------------------------------------
runTest("STRICT TRI-STATE: Empty fields resolve strictly to NOT_INFORMED (never 'Não' or assumed negative)", () => {
  const dummyRecord = {
    id: 1,
    publicId: "rec-1",
    consultancyId: 10,
    studentMembershipId: 20,
    createdByMembershipId: 30,
    birthDate: null,
    biologicalSex: "FEMALE",
    occupation: null,
    routineNotes: null,
    followUpReason: null,
    mainObjective: null,
    clinicalObservations: null,
    diagnosedConditions: null,
    previousSurgeries: null,
    hospitalizations: null,
    allergies: null,
    foodAllergiesIntolerances: null,
    foodIntolerances: null,
    currentMedications: null,
    supplements: null,
    familyHistory: null,
    gastrointestinalNotes: null,
    bowelHabit: null,
    sleepNotes: null,
    hydrationNotes: null,
    foodPreferences: null,
    dislikedFoods: null,
    dietaryRestrictions: null,
    usualEatingRoutine: null,
    mealScheduleNotes: null,
    appetiteNotes: null,
    difficultiesAdherenceNotes: null,
    physicalActivityNotes: null,
    smokingStatus: null,
    alcoholNotes: null,
    sleepRoutine: null,
    workStudyRoutine: null,
    fieldProvenanceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const emptyOnboarding = {
    hasOnboardingData: false,
    fullName: null,
    birthDate: null,
    sex: null,
    phone: null,
    email: null,
    occupation: null,
    mainObjective: null,
    reportedWeightKg: null,
    reportedHeightCm: null,
    dietaryRestrictions: null,
    foodAllergies: null,
    foodIntolerances: null,
    preferredFoods: null,
    dislikedFoods: null,
    medications: null,
    healthConditions: null,
    surgeries: null,
    bowelHabit: null,
    sleepQuality: null,
    waterIntake: null,
    physicalActivity: null,
    alcoholFrequency: null,
    smoking: null,
    submittedAt: null,
  };

  const prov = resolveClinicalFieldsProvenance(dummyRecord, emptyOnboarding, null);

  assert.strictEqual(prov.allergies.origin, "NOT_INFORMED");
  assert.strictEqual(prov.allergies.label, "Não informado");

  assert.strictEqual(prov.foodIntolerances.origin, "NOT_INFORMED");
  assert.strictEqual(prov.diagnosedConditions.origin, "NOT_INFORMED");
  assert.strictEqual(prov.smokingStatus.origin, "NOT_INFORMED");
  assert.strictEqual(prov.alcoholNotes.origin, "NOT_INFORMED");
  assert.strictEqual(prov.currentMedications.origin, "NOT_INFORMED");
  assert.strictEqual(prov.supplements.origin, "NOT_INFORMED");
});

// ----------------------------------------------------------------------------
// 2. PROVENANCE: PATIENT_REPORTED vs PROFESSIONAL_RECORDED vs REVIEWED
// ----------------------------------------------------------------------------
runTest("PROVENANCE: Patient-reported onboarding data is preserved with submission date", () => {
  const dummyRecord = {
    id: 1,
    publicId: "rec-1",
    consultancyId: 10,
    studentMembershipId: 20,
    createdByMembershipId: 30,
    birthDate: "1995-04-12",
    biologicalSex: "FEMALE",
    occupation: null,
    routineNotes: null,
    followUpReason: null,
    mainObjective: "Emagrecimento com saúde",
    clinicalObservations: null,
    diagnosedConditions: null,
    previousSurgeries: null,
    hospitalizations: null,
    allergies: "Amendoim",
    foodAllergiesIntolerances: null,
    foodIntolerances: null,
    currentMedications: null,
    supplements: null,
    familyHistory: null,
    gastrointestinalNotes: null,
    bowelHabit: null,
    sleepNotes: null,
    hydrationNotes: null,
    foodPreferences: null,
    dislikedFoods: null,
    dietaryRestrictions: null,
    usualEatingRoutine: null,
    mealScheduleNotes: null,
    appetiteNotes: null,
    difficultiesAdherenceNotes: null,
    physicalActivityNotes: null,
    smokingStatus: null,
    alcoholNotes: null,
    sleepRoutine: null,
    workStudyRoutine: null,
    fieldProvenanceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const filledOnboarding = {
    hasOnboardingData: true,
    fullName: "Maria Silva",
    birthDate: "1995-04-12",
    sex: "FEMALE",
    phone: null,
    email: null,
    occupation: null,
    mainObjective: "Emagrecimento com saúde",
    reportedWeightKg: 65,
    reportedHeightCm: 168,
    dietaryRestrictions: null,
    foodAllergies: "Amendoim",
    foodIntolerances: "Lactose",
    preferredFoods: "Frutas, aveia",
    dislikedFoods: "Fígado",
    medications: null,
    healthConditions: "Hipotireoidismo",
    surgeries: null,
    bowelHabit: "Diário",
    sleepQuality: "Boa",
    waterIntake: "2L",
    physicalActivity: "Musculação",
    alcoholFrequency: "Raramente",
    smoking: "Não",
    submittedAt: "2026-09-15T14:30:00.000Z",
  };

  const prov = resolveClinicalFieldsProvenance(dummyRecord, filledOnboarding, null);

  assert.strictEqual(prov.allergies.origin, "PATIENT_REPORTED");
  assert.strictEqual(prov.allergies.sourceDate, "2026-09-15");

  assert.strictEqual(prov.mainObjective.origin, "PATIENT_REPORTED");

  assert.strictEqual(prov.foodIntolerances.origin, "PATIENT_REPORTED");
  assert.strictEqual(prov.foodIntolerances.sourceDate, "2026-09-15");
});

runTest("PROVENANCE: Professional edited values resolve to PROFESSIONAL_RECORDED", () => {
  const dummyRecord = {
    id: 1,
    publicId: "rec-1",
    consultancyId: 10,
    studentMembershipId: 20,
    createdByMembershipId: 30,
    birthDate: null,
    biologicalSex: "FEMALE",
    occupation: null,
    routineNotes: null,
    followUpReason: null,
    mainObjective: "Hipertrofia com recomposição",
    clinicalObservations: null,
    diagnosedConditions: null,
    previousSurgeries: null,
    hospitalizations: null,
    allergies: null,
    foodAllergiesIntolerances: null,
    foodIntolerances: null,
    currentMedications: null,
    supplements: null,
    familyHistory: null,
    gastrointestinalNotes: null,
    bowelHabit: null,
    sleepNotes: null,
    hydrationNotes: null,
    foodPreferences: null,
    dislikedFoods: null,
    dietaryRestrictions: null,
    usualEatingRoutine: null,
    mealScheduleNotes: null,
    appetiteNotes: null,
    difficultiesAdherenceNotes: null,
    physicalActivityNotes: null,
    smokingStatus: null,
    alcoholNotes: null,
    sleepRoutine: null,
    workStudyRoutine: null,
    fieldProvenanceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const onboarding = {
    hasOnboardingData: true,
    fullName: null,
    birthDate: null,
    sex: null,
    phone: null,
    email: null,
    occupation: null,
    mainObjective: "Emagrecimento",
    reportedWeightKg: null,
    reportedHeightCm: null,
    dietaryRestrictions: null,
    foodAllergies: null,
    foodIntolerances: null,
    preferredFoods: null,
    dislikedFoods: null,
    medications: null,
    healthConditions: null,
    surgeries: null,
    bowelHabit: null,
    sleepQuality: null,
    waterIntake: null,
    physicalActivity: null,
    alcoholFrequency: null,
    smoking: null,
    submittedAt: "2026-09-15T14:30:00.000Z",
  };

  const prov = resolveClinicalFieldsProvenance(dummyRecord, onboarding, null);
  assert.strictEqual(prov.mainObjective.origin, "PROFESSIONAL_RECORDED");
});

runTest("PROVENANCE: Reviewed fields resolve to PROFESSIONAL_REVIEWED with reviewer", () => {
  const dummyRecord = {
    id: 1,
    publicId: "rec-1",
    consultancyId: 10,
    studentMembershipId: 20,
    createdByMembershipId: 30,
    birthDate: null,
    biologicalSex: "FEMALE",
    occupation: null,
    routineNotes: null,
    followUpReason: null,
    mainObjective: null,
    clinicalObservations: null,
    diagnosedConditions: "Gastrite",
    previousSurgeries: null,
    hospitalizations: null,
    allergies: null,
    foodAllergiesIntolerances: null,
    foodIntolerances: null,
    currentMedications: null,
    supplements: null,
    familyHistory: null,
    gastrointestinalNotes: null,
    bowelHabit: null,
    sleepNotes: null,
    hydrationNotes: null,
    foodPreferences: null,
    dislikedFoods: null,
    dietaryRestrictions: null,
    usualEatingRoutine: null,
    mealScheduleNotes: null,
    appetiteNotes: null,
    difficultiesAdherenceNotes: null,
    physicalActivityNotes: null,
    smokingStatus: null,
    alcoholNotes: null,
    sleepRoutine: null,
    workStudyRoutine: null,
    fieldProvenanceJson: JSON.stringify({
      diagnosedConditions: {
        origin: "PROFESSIONAL_REVIEWED",
        reviewedBy: "Dra. Camila Nutricionista",
      },
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const prov = resolveClinicalFieldsProvenance(dummyRecord, { hasOnboardingData: false }, null);
  assert.strictEqual(prov.diagnosedConditions.origin, "PROFESSIONAL_REVIEWED");
  assert.strictEqual(prov.diagnosedConditions.reviewedBy, "Dra. Camila Nutricionista");
});

// ----------------------------------------------------------------------------
// 3. GESTAÇÃO & NÃO SE APLICA
// ----------------------------------------------------------------------------
runTest("GESTAÇÃO: Male biological sex resolves to NOT_APPLICABLE", () => {
  const maleRecord = {
    id: 1,
    publicId: "rec-1",
    consultancyId: 10,
    studentMembershipId: 20,
    createdByMembershipId: 30,
    birthDate: null,
    biologicalSex: "MALE",
    occupation: null,
    routineNotes: null,
    followUpReason: null,
    mainObjective: null,
    clinicalObservations: null,
    diagnosedConditions: null,
    previousSurgeries: null,
    hospitalizations: null,
    allergies: null,
    foodAllergiesIntolerances: null,
    foodIntolerances: null,
    currentMedications: null,
    supplements: null,
    familyHistory: null,
    gastrointestinalNotes: null,
    bowelHabit: null,
    sleepNotes: null,
    hydrationNotes: null,
    foodPreferences: null,
    dislikedFoods: null,
    dietaryRestrictions: null,
    usualEatingRoutine: null,
    mealScheduleNotes: null,
    appetiteNotes: null,
    difficultiesAdherenceNotes: null,
    physicalActivityNotes: null,
    smokingStatus: null,
    alcoholNotes: null,
    sleepRoutine: null,
    workStudyRoutine: null,
    fieldProvenanceJson: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  const prov = resolveClinicalFieldsProvenance(maleRecord, { hasOnboardingData: false, sex: "MALE" }, null);
  assert.strictEqual(prov.pregnancyStatus.origin, "NOT_APPLICABLE");
  assert.strictEqual(prov.gestationalWeeks.origin, "NOT_APPLICABLE");
});

runTest("GESTAÇÃO: Preserves reference date in pregnancy validation", () => {
  const validated = validatePregnancyInput({
    pregnancyStatus: "PREGNANT",
    gestationalWeeks: 14,
    gestationalReferenceDate: "2026-08-10",
  });

  assert.strictEqual(validated.gestationalWeeks, 14);
  assert.strictEqual(validated.gestationalReferenceDate, "2026-08-10");
});

// ----------------------------------------------------------------------------
// 4. ANOTAÇÕES CLÍNICAS (PRONTUÁRIO & STATUS DRAFT vs FINALIZED)
// ----------------------------------------------------------------------------
runTest("ANOTAÇÕES CLÍNICAS: Validates note date, context type, content, and status", () => {
  const validatedDraft = validateClinicalNoteInput({
    noteDate: "2026-10-22",
    contextType: "INITIAL",
    content: "Paciente relata cansaço ao fim da tarde e distensão abdominal.",
    conduct: "Solicitado recordatório alimentar e ajuste hídrico.",
    status: "DRAFT",
  });

  assert.strictEqual(validatedDraft.noteDate, "2026-10-22");
  assert.strictEqual(validatedDraft.contextType, "INITIAL");
  assert.strictEqual(validatedDraft.status, "DRAFT");
  assert.strictEqual(validatedDraft.conduct, "Solicitado recordatório alimentar e ajuste hídrico.");

  const validatedFinal = validateClinicalNoteInput({
    noteDate: "2026-10-22",
    contextType: "FOLLOW_UP",
    content: "Retorno de 30 dias: perda de 2.2kg, melhora na adesão.",
    status: "FINALIZED",
  });

  assert.strictEqual(validatedFinal.status, "FINALIZED");
});

runTest("ANOTAÇÕES CLÍNICAS: Rejects empty content and invalid note date", () => {
  assert.throws(
    () => validateClinicalNoteInput({ noteDate: "invalid-date", content: "teste" }),
    (err) => err.code === "INVALID_DATE_FORMAT" || err.message.includes("AAAA-MM-DD")
  );

  assert.throws(
    () => validateClinicalNoteInput({ noteDate: "2026-10-22", content: "   " }),
    (err) => err.code === "REQUIRED_NOTE_CONTENT" || err.message.includes("conteúdo")
  );
});

// ----------------------------------------------------------------------------
// 5. VALIDATION: FOOD INTOLERANCES AND FIELD PROVENANCE JSON
// ----------------------------------------------------------------------------
runTest("VALIDATION: Accepts foodIntolerances and fieldProvenanceJson in patient record input", () => {
  const validated = validatePatientRecordInput({
    foodIntolerances: "Lactose e frutose",
    allergies: "Camarão",
    fieldProvenanceJson: JSON.stringify({ allergies: { origin: "PROFESSIONAL_REVIEWED" } }),
  });

  assert.strictEqual(validated.foodIntolerances, "Lactose e frutose");
  assert.strictEqual(validated.allergies, "Camarão");
  assert.ok(validated.fieldProvenanceJson?.includes("PROFESSIONAL_REVIEWED"));
});

console.log("--------------------------------------------------");
console.log(`TOTAL TESTS: ${passed}`);
console.log(`ALL ${passed} TESTS PASSED CLEANLY!`);
console.log("==================================================");
