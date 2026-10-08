/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE J — BASAL METABOLIC RATE (BMR) FORMULAS
 *
 * Clinically validated, transparent, deterministic equations:
 * 1. MIFFLIN_ST_JEOR_V1 (Mifflin MD et al., 1990)
 *    Men:   10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
 *    Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
 *
 * 2. HARRIS_BENEDICT_REVISED_1984_V1 (Roza AM & Shizgal HM, 1984)
 *    Men:   88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
 *    Women: 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
 *
 * Principles:
 * - Deterministic arithmetic, no automatic guesses
 * - If any required input (weight, height, age, biologicalSex) is missing: MISSING_INPUT
 * - Anatomical bounds validated strictly (rejects NaN, Infinity, negative, zero)
 */

import type {
  CalculationInputs,
  ClinicalCalculationResult,
  FormulaDefinition,
} from "../types";
import { validateNumericInput, CalculationValidationError } from "../validation";
import type { BiologicalSex } from "../../patient-planning-types";

export function normalizeBiologicalSex(raw: unknown): BiologicalSex | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "MALE" || s === "MASCULINO" || s === "M" || s === "HOMEM") {
    return "MALE";
  }
  if (s === "FEMALE" || s === "FEMININO" || s === "F" || s === "MULHER") {
    return "FEMALE";
  }
  return null;
}

export function calculateAgeFromBirthDate(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;
  const trimmed = birthDateStr.trim();
  if (!trimmed) return null;

  let birth: Date;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    birth = new Date(trimmed);
  } else if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/").map(Number);
    birth = new Date(y, m - 1, d);
  } else {
    birth = new Date(trimmed);
  }

  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 && age <= 130 ? age : null;
}

/**
 * Pure calculation for Mifflin-St Jeor
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === "MALE" ? base + 5 : base - 161;
  return Number(bmr.toFixed(2));
}

/**
 * Pure calculation for Harris-Benedict Revised (1984)
 */
export function calculateHarrisBenedictRevised(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex
): number {
  let bmr: number;
  if (sex === "MALE") {
    bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears;
  } else {
    bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * ageYears;
  }
  return Number(bmr.toFixed(2));
}

export const BMR_MIFFLIN_ST_JEOR_FORMULA: FormulaDefinition = {
  code: "MIFFLIN_ST_JEOR_V1",
  calculationCode: "BMR",
  name: "Taxa Metabólica Basal — Mifflin-St Jeor (1990)",
  version: "1.0",
  description:
    "Equação de predição de TMB recomendada para a maioria das populações adultas. Homens: 10×P + 6,25×A - 5×I + 5. Mulheres: 10×P + 6,25×A - 5×I - 161.",
  status: "APPROVED",
  requiredInputs: ["weightKg", "heightCm", "ageYears", "biologicalSex"],
  optionalInputs: [],
  outputUnit: "kcal/dia",
  applicability: "Adultos não gestantes para estimativa de gasto metabólico basal.",
  sourceReference: "Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. Am J Clin Nutr. 1990;51(2):241-247.",

  execute(inputs: CalculationInputs): ClinicalCalculationResult {
    const calculatedAt = new Date().toISOString();
    const missing: string[] = [];

    const weightInput = inputs.weightKg;
    const heightInput = inputs.heightCm;
    const ageInput = inputs.ageYears;
    const sexInput = inputs.biologicalSex;

    if (!weightInput || weightInput.value === null || weightInput.value === undefined) {
      missing.push("peso corporal (kg)");
    }
    if (!heightInput || heightInput.value === null || heightInput.value === undefined) {
      missing.push("altura (cm)");
    }
    if (!ageInput || ageInput.value === null || ageInput.value === undefined) {
      missing.push("idade (anos)");
    }
    if (!sexInput || sexInput.value === null || sexInput.value === undefined) {
      missing.push("sexo biológico");
    }

    if (missing.length > 0) {
      const msg = `Não calculado — dados insuficientes: ${missing.join(", ")}.`;
      return {
        calculationCode: "BMR",
        formulaCode: "MIFFLIN_ST_JEOR_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: msg,
        assumptions: [],
        warnings: missing.map((m) => `${m} é obrigatório`),
        status: "MISSING_INPUT",
        errorMessage: msg,
      };
    }

    let weightKg: number;
    let heightCm: number;
    let ageYears: number;
    const sex = normalizeBiologicalSex(sexInput.value);

    if (!sex) {
      const msg = "Sexo biológico não reconhecido (deve ser MASCULINO ou FEMININO).";
      return {
        calculationCode: "BMR",
        formulaCode: "MIFFLIN_ST_JEOR_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: `Não calculado — ${msg}`,
        assumptions: [],
        warnings: [msg],
        status: "INVALID_INPUT",
        errorMessage: msg,
      };
    }

    try {
      weightKg = validateNumericInput(weightInput.value, "peso (kg)", 10, 500, "kg");
      heightCm = validateNumericInput(heightInput.value, "altura (cm)", 40, 260, "cm");
      ageYears = validateNumericInput(ageInput.value, "idade (anos)", 1, 130, "anos");
    } catch (err) {
      const msg = err instanceof CalculationValidationError ? err.message : "Entrada inválida.";
      return {
        calculationCode: "BMR",
        formulaCode: "MIFFLIN_ST_JEOR_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: `Não calculado — ${msg}`,
        assumptions: [],
        warnings: [msg],
        status: "INVALID_INPUT",
        errorMessage: msg,
      };
    }

    const bmrRaw = calculateMifflinStJeor(weightKg, heightCm, ageYears, sex);
    const assumptions = [
      `Fórmula: Mifflin-St Jeor (1990) para sexo ${sex === "MALE" ? "Masculino (+5)" : "Feminino (-161)"}`,
      `Entradas validadas: Peso ${weightKg} kg | Altura ${heightCm} cm | Idade ${ageYears} anos`,
    ];

    return {
      calculationCode: "BMR",
      formulaCode: "MIFFLIN_ST_JEOR_V1",
      formulaVersion: "1.0",
      calculatedAt,
      inputs,
      result: bmrRaw,
      unit: "kcal/dia",
      formattedResult: `${Math.round(bmrRaw).toLocaleString("pt-BR")} kcal/dia`,
      assumptions,
      warnings: [],
      status: "SUCCESS",
    };
  },
};

export const BMR_HARRIS_BENEDICT_REVISED_FORMULA: FormulaDefinition = {
  code: "HARRIS_BENEDICT_REVISED_1984_V1",
  calculationCode: "BMR",
  name: "Taxa Metabólica Basal — Harris-Benedict Revisada (Roza & Shizgal 1984)",
  version: "1.0",
  description:
    "Revisão da equação de Harris-Benedict por Roza & Shizgal (1984). Homens: 88,362 + 13,397×P + 4,799×A - 5,677×I. Mulheres: 447,593 + 9,247×P + 3,098×A - 4,330×I.",
  status: "APPROVED",
  requiredInputs: ["weightKg", "heightCm", "ageYears", "biologicalSex"],
  optionalInputs: [],
  outputUnit: "kcal/dia",
  applicability: "Adultos não gestantes para estimativa de gasto metabólico basal.",
  sourceReference: "Roza AM, Shizgal HM. The Harris Benedict equation reevaluated. Am J Clin Nutr. 1984;40(1):168-182.",

  execute(inputs: CalculationInputs): ClinicalCalculationResult {
    const calculatedAt = new Date().toISOString();
    const missing: string[] = [];

    const weightInput = inputs.weightKg;
    const heightInput = inputs.heightCm;
    const ageInput = inputs.ageYears;
    const sexInput = inputs.biologicalSex;

    if (!weightInput || weightInput.value === null || weightInput.value === undefined) {
      missing.push("peso corporal (kg)");
    }
    if (!heightInput || heightInput.value === null || heightInput.value === undefined) {
      missing.push("altura (cm)");
    }
    if (!ageInput || ageInput.value === null || ageInput.value === undefined) {
      missing.push("idade (anos)");
    }
    if (!sexInput || sexInput.value === null || sexInput.value === undefined) {
      missing.push("sexo biológico");
    }

    if (missing.length > 0) {
      const msg = `Não calculado — dados insuficientes: ${missing.join(", ")}.`;
      return {
        calculationCode: "BMR",
        formulaCode: "HARRIS_BENEDICT_REVISED_1984_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: msg,
        assumptions: [],
        warnings: missing.map((m) => `${m} é obrigatório`),
        status: "MISSING_INPUT",
        errorMessage: msg,
      };
    }

    let weightKg: number;
    let heightCm: number;
    let ageYears: number;
    const sex = normalizeBiologicalSex(sexInput.value);

    if (!sex) {
      const msg = "Sexo biológico não reconhecido (deve ser MASCULINO ou FEMININO).";
      return {
        calculationCode: "BMR",
        formulaCode: "HARRIS_BENEDICT_REVISED_1984_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: `Não calculado — ${msg}`,
        assumptions: [],
        warnings: [msg],
        status: "INVALID_INPUT",
        errorMessage: msg,
      };
    }

    try {
      weightKg = validateNumericInput(weightInput.value, "peso (kg)", 10, 500, "kg");
      heightCm = validateNumericInput(heightInput.value, "altura (cm)", 40, 260, "cm");
      ageYears = validateNumericInput(ageInput.value, "idade (anos)", 1, 130, "anos");
    } catch (err) {
      const msg = err instanceof CalculationValidationError ? err.message : "Entrada inválida.";
      return {
        calculationCode: "BMR",
        formulaCode: "HARRIS_BENEDICT_REVISED_1984_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kcal/dia",
        formattedResult: `Não calculado — ${msg}`,
        assumptions: [],
        warnings: [msg],
        status: "INVALID_INPUT",
        errorMessage: msg,
      };
    }

    const bmrRaw = calculateHarrisBenedictRevised(weightKg, heightCm, ageYears, sex);
    const assumptions = [
      `Fórmula: Harris-Benedict Revisada (Roza & Shizgal 1984) para sexo ${sex === "MALE" ? "Masculino" : "Feminino"}`,
      `Entradas validadas: Peso ${weightKg} kg | Altura ${heightCm} cm | Idade ${ageYears} anos`,
    ];

    return {
      calculationCode: "BMR",
      formulaCode: "HARRIS_BENEDICT_REVISED_1984_V1",
      formulaVersion: "1.0",
      calculatedAt,
      inputs,
      result: bmrRaw,
      unit: "kcal/dia",
      formattedResult: `${Math.round(bmrRaw).toLocaleString("pt-BR")} kcal/dia`,
      assumptions,
      warnings: [],
      status: "SUCCESS",
    };
  },
};
