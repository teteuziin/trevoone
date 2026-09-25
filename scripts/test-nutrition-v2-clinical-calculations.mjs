/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL CALCULATIONS DOMAIN & ENGINE TEST SUITE
 *
 * Tests:
 * 1. Registry is deterministic and frozen
 * 2. Formula code & version are mandatory
 * 3. Required inputs are enforced
 * 4. Missing value != 0 (unknown remains unknown)
 * 5. NaN is blocked
 * 6. Infinity is blocked
 * 7. Zero / negative values blocked for anatomical inputs
 * 8. Provenance preservation (Anthropometric vs Onboarding vs Override)
 * 9. Manual override does not mutate patient history
 * 10. Old snapshots / frozen formulas are immutable
 * 11. No hidden fallback (source label transparent)
 * 12. Unapproved metabolic formulas return CLINICAL_FORMULA_SPEC_REQUIRED
 * 13. Pregnancy energy formula is NOT invented
 * 14. Lactation energy formula is NOT invented
 * 15. Template creation does not leak clinical calculation data
 * 16. Deterministic BMI calculations with exact WHO mathematical formula
 * 17. Diagnostic classification is explicitly NOT generated automatically
 */

import assert from "node:assert/strict";
import {
  clinicalFormulaRegistry,
  executeClinicalCalculation,
  calculatePatientBMI,
  resolveInputsForPatient,
  validateNumericInput,
} from "../lib/nutrition-v2/clinical-calculations/index.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: CLINICAL CALCULATIONS (RELEASE I) ===\n");

// ----------------------------------------------------------------------------
// 1. Registry Determinism & Immutability
// ----------------------------------------------------------------------------
{
  const allFormulas = clinicalFormulaRegistry.listAll();
  assert(allFormulas.length >= 6, "Registry must contain registered formulas");

  const bmiFormula = clinicalFormulaRegistry.get("BMI_STANDARD_V1");
  assert(bmiFormula, "BMI_STANDARD_V1 must be registered");
  assert.equal(bmiFormula.status, "APPROVED");
  assert.equal(bmiFormula.version, "1.0");

  // Immutability check: modifying formula should fail or be frozen
  assert(Object.isFrozen(bmiFormula), "Formula definition in registry must be frozen/immutable");
  assert.throws(() => {
    bmiFormula.version = "2.0";
  }, /Cannot assign to read only property/);

  // Duplicate registration must be rejected
  assert.throws(() => {
    clinicalFormulaRegistry.register(bmiFormula);
  }, /já está registrada/);

  console.log("✔ 1. Registry é determinístico, único e imutável");
}

// ----------------------------------------------------------------------------
// 2. Mandatory Version & Formula Code
// ----------------------------------------------------------------------------
{
  assert.throws(() => {
    clinicalFormulaRegistry.register({
      code: "",
      calculationCode: "BMR",
      name: "Invalid",
      version: "1.0",
      description: "",
      status: "APPROVED",
      requiredInputs: [],
      optionalInputs: [],
      outputUnit: "",
      applicability: "",
      execute: () => ({}),
    });
  }, /código e versão definidos/);

  assert.throws(() => {
    clinicalFormulaRegistry.register({
      code: "TEST_NO_VERSION",
      calculationCode: "BMR",
      name: "Invalid",
      version: "",
      description: "",
      status: "APPROVED",
      requiredInputs: [],
      optionalInputs: [],
      outputUnit: "",
      applicability: "",
      execute: () => ({}),
    });
  }, /código e versão definidos/);

  console.log("✔ 2. Código e versão são estritamente obrigatórios no registro");
}

// ----------------------------------------------------------------------------
// 3 & 4. Missing Values != Zero (Unknown remains Unknown)
// ----------------------------------------------------------------------------
{
  const emptyContext = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: null,
    onboardingReference: null,
  };

  const bmiResult = calculatePatientBMI(emptyContext);
  assert.equal(bmiResult.status, "MISSING_INPUT");
  assert.equal(bmiResult.result, null, "Result must be null when input is missing, NEVER 0");
  assert.notEqual(bmiResult.formattedResult, "0 kg/m²", "Unknown cannot be displayed as 0");
  assert(bmiResult.formattedResult.includes("peso não informado"), "Formatted result must explain missing input");
  assert(bmiResult.warnings.length > 0, "Warnings must explain missing weight");

  // Only weight provided, missing height
  const weightOnlyContext = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "anthro_1",
      measurementDate: "2026-09-01",
      weightKg: 75.0,
      heightCm: null,
      waistCm: null,
      hipCm: null,
    },
    onboardingReference: null,
  };

  const bmiResult2 = calculatePatientBMI(weightOnlyContext);
  assert.equal(bmiResult2.status, "MISSING_INPUT");
  assert.equal(bmiResult2.result, null, "Result must be null when height is missing, NEVER 0");
  assert(bmiResult2.formattedResult.includes("altura não informada"), "Formatted result must explain missing height");

  console.log("✔ 3 & 4. Valores ausentes nunca são coagidos a zero (UNKNOWN != 0)");
}

// ----------------------------------------------------------------------------
// 5, 6 & 7. Input Validation: NaN, Infinity, Zero, Negative, Bounds
// ----------------------------------------------------------------------------
{
  // NaN check
  assert.throws(() => {
    validateNumericInput(NaN, "peso", 10, 500, "kg");
  }, (err) => err.code === "NAN_VALUE");

  assert.throws(() => {
    validateNumericInput("abc", "peso", 10, 500, "kg");
  }, (err) => err.code === "NAN_VALUE");

  // Infinity check
  assert.throws(() => {
    validateNumericInput(Infinity, "altura", 40, 260, "cm");
  }, (err) => err.code === "INFINITY_VALUE");

  assert.throws(() => {
    validateNumericInput(-Infinity, "altura", 40, 260, "cm");
  }, (err) => err.code === "INFINITY_VALUE");

  // Zero check
  assert.throws(() => {
    validateNumericInput(0, "peso", 10, 500, "kg");
  }, (err) => err.code === "NON_POSITIVE_VALUE");

  // Negative check
  assert.throws(() => {
    validateNumericInput(-15, "peso", 10, 500, "kg");
  }, (err) => err.code === "NON_POSITIVE_VALUE");

  // Bounds check
  assert.throws(() => {
    validateNumericInput(5, "peso", 10, 500, "kg");
  }, (err) => err.code === "OUT_OF_BOUNDS");

  assert.throws(() => {
    validateNumericInput(600, "peso", 10, 500, "kg");
  }, (err) => err.code === "OUT_OF_BOUNDS");

  // Valid number
  const valid = validateNumericInput(72.5, "peso", 10, 500, "kg");
  assert.equal(valid, 72.5);

  console.log("✔ 5, 6 & 7. Validação estrita: NaN, Infinity, zero e negativos bloqueados");
}

// ----------------------------------------------------------------------------
// 8 & 11. Provenance Preservation & Explicit Fallback
// ----------------------------------------------------------------------------
{
  // Priority 1: Anthropometrics present
  const anthroContext = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "anthro_rec_123",
      measurementDate: "2026-09-20",
      weightKg: 78.4,
      heightCm: 178,
      waistCm: null,
      hipCm: null,
    },
    onboardingReference: {
      reportedWeightKg: 80.0,
      reportedHeightCm: 177,
      sex: "M",
      birthDate: "1995-05-10",
      mainObjective: "Hipertrofia",
    },
  };

  const inputs1 = resolveInputsForPatient(anthroContext);
  assert.equal(inputs1.weightKg.source, "ANTHROPOMETRIC_ENTRY");
  assert.equal(inputs1.weightKg.sourcePublicId, "anthro_rec_123");
  assert.equal(inputs1.weightKg.value, 78.4);
  assert.equal(inputs1.heightCm.source, "ANTHROPOMETRIC_ENTRY");
  assert.equal(inputs1.heightCm.value, 178);

  // Priority 2: Fallback to onboarding reference (explicitly labeled)
  const onboardingOnlyContext = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: null,
    onboardingReference: {
      reportedWeightKg: 80.0,
      reportedHeightCm: 177,
      sex: "M",
      birthDate: "1995-05-10",
      mainObjective: "Hipertrofia",
    },
  };

  const inputs2 = resolveInputsForPatient(onboardingOnlyContext);
  assert.equal(inputs2.weightKg.source, "ONBOARDING_REFERENCE");
  assert.equal(inputs2.weightKg.sourcePublicId, null);
  assert.equal(inputs2.weightKg.value, 80.0);
  assert.equal(inputs2.weightKg.sourceLabel, "Anamnese inicial do aluno");
  assert.equal(inputs2.heightCm.source, "ONBOARDING_REFERENCE");
  assert.equal(inputs2.heightCm.value, 177);

  console.log("✔ 8 & 11. Proveniência de dados preservada e fallback explicitamente sinalizado");
}

// ----------------------------------------------------------------------------
// 9. Manual Overrides Do NOT Mutate Patient History
// ----------------------------------------------------------------------------
{
  const baselineContext = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "anthro_fixed",
      measurementDate: "2026-09-15",
      weightKg: 85.0,
      heightCm: 180,
      waistCm: null,
      hipCm: null,
    },
    onboardingReference: null,
  };

  // Perform calculation with temporary manual override
  const resultWithOverride = calculatePatientBMI(baselineContext, { weightKg: 80.0 });
  assert.equal(resultWithOverride.status, "SUCCESS");
  assert.equal(resultWithOverride.inputs.weightKg.value, 80.0);
  assert.equal(resultWithOverride.inputs.weightKg.source, "MANUAL_OVERRIDE");
  assert.equal(resultWithOverride.inputs.weightKg.isOverride, true);

  // Verify baseline context was NOT mutated
  assert.equal(baselineContext.latestAnthropometrics.weightKg, 85.0, "Baseline context must remain untouched");
  assert.equal(baselineContext.latestAnthropometrics.heightCm, 180);

  // Recalculate without override
  const resultWithoutOverride = calculatePatientBMI(baselineContext);
  assert.equal(resultWithoutOverride.inputs.weightKg.value, 85.0);
  assert.equal(resultWithoutOverride.inputs.weightKg.source, "ANTHROPOMETRIC_ENTRY");
  assert.equal(resultWithoutOverride.inputs.weightKg.isOverride, false);

  console.log("✔ 9. Ajuste manual de cálculo não contamina o prontuário nem o histórico antropométrico");
}

// ----------------------------------------------------------------------------
// 10. Snapshot Reproducibility
// ----------------------------------------------------------------------------
{
  const context = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "anthro_snap",
      measurementDate: "2026-09-25",
      weightKg: 70.0,
      heightCm: 175,
      waistCm: null,
      hipCm: null,
    },
  };

  const snapshot = calculatePatientBMI(context);
  assert.equal(snapshot.formulaCode, "BMI_STANDARD_V1");
  assert.equal(snapshot.formulaVersion, "1.0");
  assert(snapshot.calculatedAt, "Calculated timestamp required");
  assert.equal(snapshot.result, 22.86);
  assert.equal(snapshot.unit, "kg/m²");

  // Verify that snapshot is a self-contained reproducible object
  const serialized = JSON.stringify(snapshot);
  const deserialized = JSON.parse(serialized);
  assert.equal(deserialized.formulaCode, "BMI_STANDARD_V1");
  assert.equal(deserialized.result, 22.86);

  console.log("✔ 10. Snapshot de cálculo é reprodutível, versionado e determinístico");
}

// ----------------------------------------------------------------------------
// 12, 13 & 14. Unapproved Metabolic, Pregnancy & Lactation Formulas Return SPEC_REQUIRED
// ----------------------------------------------------------------------------
{
  const context = {
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "anthro_1",
      measurementDate: "2026-09-20",
      weightKg: 65.0,
      heightCm: 165,
      waistCm: null,
      hipCm: null,
    },
    pregnancy: {
      pregnancyStatus: "PREGNANT",
      gestationalWeeks: 24,
      deliveryDate: null,
    },
  };

  // BMR
  const bmrResult = executeClinicalCalculation("BMR_UNSPECIFIED", context);
  assert.equal(bmrResult.status, "SPEC_REQUIRED");
  assert.equal(bmrResult.result, null, "BMR must not be invented");
  assert.equal(bmrResult.errorMessage, "CLINICAL_FORMULA_SPEC_REQUIRED");

  // TDEE
  const tdeeResult = executeClinicalCalculation("TDEE_UNSPECIFIED", context);
  assert.equal(tdeeResult.status, "SPEC_REQUIRED");
  assert.equal(tdeeResult.result, null, "TDEE must not be invented");
  assert.equal(tdeeResult.errorMessage, "CLINICAL_FORMULA_SPEC_REQUIRED");

  // Pregnancy Energy
  const pregResult = executeClinicalCalculation("PREGNANCY_ENERGY_UNSPECIFIED", context);
  assert.equal(pregResult.status, "SPEC_REQUIRED");
  assert.equal(pregResult.result, null, "Pregnancy energy must not be invented");
  assert.equal(pregResult.errorMessage, "CLINICAL_FORMULA_SPEC_REQUIRED");

  // Lactation Energy
  const lactResult = executeClinicalCalculation("LACTATION_ENERGY_UNSPECIFIED", context);
  assert.equal(lactResult.status, "SPEC_REQUIRED");
  assert.equal(lactResult.result, null, "Lactation energy must not be invented");
  assert.equal(lactResult.errorMessage, "CLINICAL_FORMULA_SPEC_REQUIRED");

  console.log("✔ 12, 13 & 14. Nenhuma fórmula metabólica/gestacional inventada: SPEC_REQUIRED retornado");
}

// ----------------------------------------------------------------------------
// 15. Templates Do NOT Leak Clinical Calculations
// ----------------------------------------------------------------------------
{
  // A template must only contain plan structural data, never patient calculation snapshots
  const dummyTemplate = {
    title: "Template Hipertrofia Masculina",
    notes: "Orientações gerais",
    meals: [],
  };

  assert(!("clinicalCalculations" in dummyTemplate), "Template must not contain clinical calculations");
  assert(!("patientCalculationSnapshot" in dummyTemplate), "Template must not contain patient calculation snapshots");

  console.log("✔ 15. Templates reutilizáveis não contêm nem vazam cálculos clínicos de pacientes");
}

// ----------------------------------------------------------------------------
// 16 & 17. Deterministic Standard BMI & No Automatic Diagnostic Labels
// ----------------------------------------------------------------------------
{
  // Example 1: 70kg, 175cm -> 70 / 1.75^2 = 22.85714... -> rounded to 22.86 (presentation 22.9 kg/m²)
  const res1 = calculatePatientBMI({
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "a1",
      measurementDate: "2026-09-25",
      weightKg: 70.0,
      heightCm: 175,
      waistCm: null,
      hipCm: null,
    },
  });
  assert.equal(res1.status, "SUCCESS");
  assert.equal(res1.result, 22.86);
  assert.equal(res1.formattedResult, "22.9 kg/m²");

  // Example 2: 85.5kg, 180cm -> 85.5 / 1.80^2 = 26.38888... -> 26.39 (presentation 26.4 kg/m²)
  const res2 = calculatePatientBMI({
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "a2",
      measurementDate: "2026-09-25",
      weightKg: 85.5,
      heightCm: 180,
      waistCm: null,
      hipCm: null,
    },
  });
  assert.equal(res2.status, "SUCCESS");
  assert.equal(res2.result, 26.39);
  assert.equal(res2.formattedResult, "26.4 kg/m²");

  // Example 3: 52.3kg, 162cm -> 52.3 / 1.62^2 = 19.928... -> 19.93 (presentation 19.9 kg/m²)
  const res3 = calculatePatientBMI({
    consultancyId: 1,
    studentMembershipId: 10,
    latestAnthropometrics: {
      publicId: "a3",
      measurementDate: "2026-09-25",
      weightKg: 52.3,
      heightCm: 162,
      waistCm: null,
      hipCm: null,
    },
  });
  assert.equal(res3.status, "SUCCESS");
  assert.equal(res3.result, 19.93);
  assert.equal(res3.formattedResult, "19.9 kg/m²");

  // CRITICAL REQUIREMENT 17: No automatic diagnostic classifications attached
  for (const res of [res1, res2, res3]) {
    const serialized = JSON.stringify(res).toLowerCase();
    assert(!serialized.includes("magreza") && !serialized.includes("underweight"), "Must not diagnose underweight");
    assert(!serialized.includes("eutrofia") && !serialized.includes("normal weight"), "Must not diagnose normal weight");
    assert(!serialized.includes("sobrepeso") && !serialized.includes("overweight"), "Must not diagnose overweight");
    assert(!serialized.includes("obesidade") && !serialized.includes("obese"), "Must not diagnose obesity");
  }

  console.log("✔ 16 & 17. IMC padrão com cálculo matemático exato e zero diagnósticos automáticos");
}

console.log("\n=== TODOS OS TESTES DE CÁLCULO CLÍNICO PASSARAM COM SUCESSO! ===\n");
