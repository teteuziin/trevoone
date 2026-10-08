/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE J — CLINICAL CALCULATION ENGINE
 * Orchestrates inputs provenance, formula resolution, execution, and snapshots.
 */

import type {
  CalculationInputs,
  ClinicalCalculationResult,
  PatientCalculationContext,
} from "./types";
import { createInputValue } from "./validation";
import { clinicalFormulaRegistry } from "./registry";
import { calculateAgeFromBirthDate } from "./formulas/bmr";
import type { GoalTypeCode } from "../patient-planning-types";


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

  // 4. Age (years)
  if (overrides && overrides.ageYears !== undefined && overrides.ageYears !== null) {
    inputs.ageYears = createInputValue(
      overrides.ageYears,
      "anos",
      "MANUAL_OVERRIDE",
      null,
      "Ajuste manual do profissional",
      true
    );
  } else if (context.onboardingReference?.birthDate) {
    const derivedAge = calculateAgeFromBirthDate(context.onboardingReference.birthDate);
    if (derivedAge !== null) {
      inputs.ageYears = createInputValue(
        derivedAge,
        "anos",
        "ONBOARDING_REFERENCE",
        null,
        `Idade calculada pela data de nascimento (${context.onboardingReference.birthDate})`
      );
    }
  }

  // 5. Biological Sex
  if (overrides && overrides.biologicalSex !== undefined && overrides.biologicalSex !== null) {
    inputs.biologicalSex = createInputValue(
      overrides.biologicalSex,
      "",
      "MANUAL_OVERRIDE",
      null,
      "Ajuste manual do profissional",
      true
    );
  } else if (context.onboardingReference?.sex) {
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

/**
 * Helper to calculate BMR for a patient given a specific registered formula code.
 */
export function calculatePatientBMR(
  formulaCode: string,
  context: PatientCalculationContext,
  overrides?: Record<string, number | string>
): ClinicalCalculationResult {
  return executeClinicalCalculation(formulaCode, context, overrides);
}

/**
 * Pure calculation for Total Daily Energy Expenditure (GET / TDEE).
 * Returns null if BMR or activity factor is missing/invalid.
 */
export function calculateTDEE(
  bmrKcal: number | null | undefined,
  activityFactor: number | null | undefined
): number | null {
  if (
    bmrKcal === null ||
    bmrKcal === undefined ||
    isNaN(bmrKcal) ||
    bmrKcal <= 0 ||
    activityFactor === null ||
    activityFactor === undefined ||
    isNaN(activityFactor) ||
    activityFactor <= 0
  ) {
    return null;
  }
  return Number((bmrKcal * activityFactor).toFixed(2));
}

/**
 * Pure calculation for Calorie Target based on TDEE, adjustment, and goal type.
 */
export function calculateTargetCalories(
  tdeeKcal: number | null | undefined,
  calorieAdjustmentKcal: number | null | undefined,
  goalType: GoalTypeCode | null | undefined
): number | null {
  if (tdeeKcal === null || tdeeKcal === undefined || isNaN(tdeeKcal) || tdeeKcal <= 0) {
    return null;
  }
  if (!goalType) {
    return null;
  }
  if (goalType === "MAINTENANCE") {
    return Number(tdeeKcal.toFixed(2));
  }
  const adj = calorieAdjustmentKcal ?? 0;
  const target = tdeeKcal + adj;
  return target > 0 ? Number(target.toFixed(2)) : null;
}

/**
 * Pure calculation of total calories from macronutrient grams.
 * Protein: 4 kcal/g
 * Carbohydrates: 4 kcal/g
 * Fats: 9 kcal/g
 */
export function calculateMacroCalories(
  proteinG: number | null | undefined,
  carbsG: number | null | undefined,
  fatsG: number | null | undefined
): {
  proteinKcal: number | null;
  carbsKcal: number | null;
  fatsKcal: number | null;
  totalKcal: number | null;
  allDefined: boolean;
} {
  const pKcal = proteinG !== null && proteinG !== undefined && !isNaN(proteinG) && proteinG >= 0 ? proteinG * 4 : null;
  const cKcal = carbsG !== null && carbsG !== undefined && !isNaN(carbsG) && carbsG >= 0 ? carbsG * 4 : null;
  const fKcal = fatsG !== null && fatsG !== undefined && !isNaN(fatsG) && fatsG >= 0 ? fatsG * 9 : null;

  const allDefined = pKcal !== null && cKcal !== null && fKcal !== null;

  let total: number | null = null;
  if (pKcal !== null || cKcal !== null || fKcal !== null) {
    total = Number(((pKcal ?? 0) + (cKcal ?? 0) + (fKcal ?? 0)).toFixed(2));
  }

  return {
    proteinKcal: pKcal !== null ? Number(pKcal.toFixed(2)) : null,
    carbsKcal: cKcal !== null ? Number(cKcal.toFixed(2)) : null,
    fatsKcal: fKcal !== null ? Number(fKcal.toFixed(2)) : null,
    totalKcal: total,
    allDefined,
  };
}

/**
 * Calculates macro percentage relative to target calories.
 */
export function calculateMacroPercentage(
  macroKcal: number | null | undefined,
  targetCaloriesKcal: number | null | undefined
): number | null {
  if (
    macroKcal === null ||
    macroKcal === undefined ||
    isNaN(macroKcal) ||
    targetCaloriesKcal === null ||
    targetCaloriesKcal === undefined ||
    isNaN(targetCaloriesKcal) ||
    targetCaloriesKcal <= 0
  ) {
    return null;
  }
  return Number(((macroKcal / targetCaloriesKcal) * 100).toFixed(1));
}
