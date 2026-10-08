/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — STANDARD BMI FORMULA
 * Formula: weight_kg / (height_m)^2
 * Pure mathematical calculation without automatic medical/diagnostic classifications.
 */

import type {
  CalculationInputs,
  ClinicalCalculationResult,
  FormulaDefinition,
} from "../types";
import { validateNumericInput, CalculationValidationError } from "../validation";

export const BMI_STANDARD_FORMULA: FormulaDefinition = {
  code: "BMI_STANDARD_V1",
  calculationCode: "BMI_STANDARD",
  name: "Índice de Massa Corporal (IMC)",
  version: "1.0",
  description:
    "Cálculo matemático padrão de relação entre massa e estatura: peso (kg) / [altura (m)]². Não gera diagnósticos clínicos automáticos.",
  status: "APPROVED",
  requiredInputs: ["weightKg", "heightCm"],
  optionalInputs: [],
  outputUnit: "kg/m²",
  applicability: "Adultos não gestantes para referência de proporção antropométrica.",
  sourceReference: "World Health Organization (WHO) Technical Report Series, 854.",

  execute(inputs: CalculationInputs): ClinicalCalculationResult {
    const calculatedAt = new Date().toISOString();

    const weightInput = inputs.weightKg;
    const heightInput = inputs.heightCm;

    if (!weightInput || weightInput.value === null || weightInput.value === undefined) {
      return {
        calculationCode: "BMI_STANDARD",
        formulaCode: "BMI_STANDARD_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kg/m²",
        formattedResult: "Não calculado — peso não informado.",
        assumptions: [],
        warnings: ["Peso corporal não informado."],
        status: "MISSING_INPUT",
        errorMessage: "Peso corporal não informado.",
      };
    }

    if (!heightInput || heightInput.value === null || heightInput.value === undefined) {
      return {
        calculationCode: "BMI_STANDARD",
        formulaCode: "BMI_STANDARD_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kg/m²",
        formattedResult: "Não calculado — altura não informada.",
        assumptions: [],
        warnings: ["Altura não informada."],
        status: "MISSING_INPUT",
        errorMessage: "Altura não informada.",
      };
    }

    let weightKg: number;
    let heightCm: number;

    try {
      weightKg = validateNumericInput(weightInput.value, "peso (kg)", 10, 500, "kg");
      heightCm = validateNumericInput(heightInput.value, "altura (cm)", 40, 260, "cm");
    } catch (err) {
      const msg = err instanceof CalculationValidationError ? err.message : "Entrada inválida.";
      return {
        calculationCode: "BMI_STANDARD",
        formulaCode: "BMI_STANDARD_V1",
        formulaVersion: "1.0",
        calculatedAt,
        inputs,
        result: null,
        unit: "kg/m²",
        formattedResult: `Não calculado — ${msg}`,
        assumptions: [],
        warnings: [msg],
        status: "INVALID_INPUT",
        errorMessage: msg,
      };
    }

    const heightM = heightCm / 100;
    const bmiRaw = weightKg / (heightM * heightM);

    const warnings: string[] = [];
    const assumptions: string[] = [
      `Altura convertida: ${heightCm} cm = ${heightM.toFixed(2)} m`,
      "Fórmula aplicada: peso / (altura)²",
      "Classificação diagnóstica omitida conforme diretriz de suporte à decisão.",
    ];

    if (weightInput.isOverride) {
      assumptions.push(`Peso utilizado por ajuste manual do profissional: ${weightKg} kg`);
    }

    // Format rounded to 1 decimal place for presentation
    const formattedResult = `${bmiRaw.toFixed(1)} kg/m²`;

    return {
      calculationCode: "BMI_STANDARD",
      formulaCode: "BMI_STANDARD_V1",
      formulaVersion: "1.0",
      calculatedAt,
      inputs,
      result: Number(bmiRaw.toFixed(2)),
      unit: "kg/m²",
      formattedResult,
      assumptions,
      warnings,
      status: "SUCCESS",
    };
  },
};

export interface BmiClassification {
  category: string;
  badgeVariant: "success" | "warning" | "danger" | "neutral";
  description: string;
}

export function classifyBMI(bmi: number | null | undefined): BmiClassification | null {
  if (bmi === null || bmi === undefined || isNaN(bmi) || bmi <= 0) {
    return null;
  }
  if (bmi < 18.5) {
    return {
      category: "Abaixo do peso",
      badgeVariant: "warning",
      description: "IMC menor que 18,5 kg/m² (WHO)",
    };
  }
  if (bmi < 25.0) {
    return {
      category: "Eutrofia",
      badgeVariant: "success",
      description: "Peso adequado: IMC entre 18,5 e 24,9 kg/m² (WHO)",
    };
  }
  if (bmi < 30.0) {
    return {
      category: "Sobrepeso",
      badgeVariant: "warning",
      description: "Pré-obesidade: IMC entre 25,0 e 29,9 kg/m² (WHO)",
    };
  }
  if (bmi < 35.0) {
    return {
      category: "Obesidade Grau I",
      badgeVariant: "danger",
      description: "IMC entre 30,0 e 34,9 kg/m² (WHO)",
    };
  }
  if (bmi < 40.0) {
    return {
      category: "Obesidade Grau II",
      badgeVariant: "danger",
      description: "IMC entre 35,0 e 39,9 kg/m² (WHO)",
    };
  }
  return {
    category: "Obesidade Grau III",
    badgeVariant: "danger",
    description: "IMC maior ou igual a 40,0 kg/m² (WHO)",
  };
}

