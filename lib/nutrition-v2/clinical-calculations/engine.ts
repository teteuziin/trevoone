/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL CALCULATION ENGINE
 * Orchestrates inputs provenance, formula resolution, execution, and snapshots.
 */

import type {
  CalculationInputs,
  ClinicalCalculationResult,
  PatientCalculationContext,
} from "./types";
import { createInputValue } from "./validation";
import { clinicalFormulaRegistry } from "./registry";

/**
 * Resolves input values from patient context respecting strict provenance rules:
 * 1. Professional Manual Override (if explicitly passed)
 * 2. Latest Anthropometric Measurement Entry
 * 3. Onboarding Reference Data (fallback)
 */
export function resolveInputsForPatient(
  context: PatientCalculationContext,
  overrides?: Record<string, number | string>
): CalculationInputs {
  const inputs: CalculationInputs = {};

  // 1. Weight (kg)
  if (overrides && overrides.weightKg !== undefined && overrides.weightKg !== null) {
    inputs.weightKg = createInputValue(
      overrides.weightKg,
      "kg",
      "MANUAL_OVERRIDE",
      null,
      "Ajuste manual do profissional",
      true
    );
  } else if (context.latestAnthropometrics?.weightKg) {
    inputs.weightKg = createInputValue(
      context.latestAnthropometrics.weightKg,
      "kg",
      "ANTHROPOMETRIC_ENTRY",
      context.latestAnthropometrics.publicId,
      `Medição antropométrica (${context.latestAnthropometrics.measurementDate})`
    );
  } else if (context.onboardingReference?.reportedWeightKg) {
    inputs.weightKg = createInputValue(
      context.onboardingReference.reportedWeightKg,
      "kg",
      "ONBOARDING_REFERENCE",
      null,
      "Anamnese inicial do aluno"
    );
  }

  // 2. Height (cm)
  if (overrides && overrides.heightCm !== undefined && overrides.heightCm !== null) {
    inputs.heightCm = createInputValue(
      overrides.heightCm,
      "cm",
      "MANUAL_OVERRIDE",
      null,
      "Ajuste manual do profissional",
      true
    );
  } else if (context.latestAnthropometrics?.heightCm) {
    inputs.heightCm = createInputValue(
      context.latestAnthropometrics.heightCm,
      "cm",
      "ANTHROPOMETRIC_ENTRY",
      context.latestAnthropometrics.publicId,
      `Medição antropométrica (${context.latestAnthropometrics.measurementDate})`
    );
  } else if (context.onboardingReference?.reportedHeightCm) {
    inputs.heightCm = createInputValue(
      context.onboardingReference.reportedHeightCm,
      "cm",
      "ONBOARDING_REFERENCE",
      null,
      "Anamnese inicial do aluno"
    );
  }

  // 3. Waist (cm)
  if (overrides && overrides.waistCm !== undefined && overrides.waistCm !== null) {
    inputs.waistCm = createInputValue(
      overrides.waistCm,
      "cm",
      "MANUAL_OVERRIDE",
      null,
      "Ajuste manual do profissional",
      true
    );
  } else if (context.latestAnthropometrics?.waistCm) {
    inputs.waistCm = createInputValue(
      context.latestAnthropometrics.waistCm,
      "cm",
      "ANTHROPOMETRIC_ENTRY",
      context.latestAnthropometrics.publicId,
      `Medição antropométrica (${context.latestAnthropometrics.measurementDate})`
    );
  }

  // 4. Biological Sex (for reference only, no automatic formulas applied)
  if (context.onboardingReference?.sex) {
    inputs.biologicalSex = createInputValue(
      context.onboardingReference.sex,
      "",
      "ONBOARDING_REFERENCE",
      null,
      "Perfil canônico"
    );
  }

  return inputs;
}

/**
 * Executes a calculation using the registered formula and resolved patient context.
 */
export function executeClinicalCalculation(
  formulaCode: string,
  context: PatientCalculationContext,
  overrides?: Record<string, number | string>
): ClinicalCalculationResult {
  const formula = clinicalFormulaRegistry.get(formulaCode);

  if (!formula) {
    return {
      calculationCode: "BMI_STANDARD",
      formulaCode,
      formulaVersion: "UNKNOWN",
      calculatedAt: new Date().toISOString(),
      inputs: {},
      result: null,
      unit: "",
      formattedResult: "Fórmula não encontrada no registro.",
      assumptions: [],
      warnings: [`Fórmula '${formulaCode}' não está registrada.`],
      status: "INVALID_INPUT",
      errorMessage: `Fórmula '${formulaCode}' não encontrada.`,
    };
  }

  const inputs = resolveInputsForPatient(context, overrides);
  return formula.execute(inputs);
}

/**
 * Helper to calculate Standard BMI for a patient.
 */
export function calculatePatientBMI(
  context: PatientCalculationContext,
  overrides?: Record<string, number | string>
): ClinicalCalculationResult {
  return executeClinicalCalculation("BMI_STANDARD_V1", context, overrides);
}
