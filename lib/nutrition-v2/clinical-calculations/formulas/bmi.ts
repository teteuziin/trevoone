/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I & K — POPULATION-SPECIFIC BMI CLASSIFICATION
 * References:
 * - Adults (18-59y): WHO (1995, 2000)
 * - Elderly (>=60y): Lipschitz (1991) / OPAS / MS
 * - Pediatric (<18y): Curvas de Crescimento OMS (Percentil / Escore-Z)
 * - Pregnancy: Atalah et al. (1997) / MS
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
  referenceStandard: string;
  clinicalNotice?: string;
  toString(): string;
}

function makeClassification(
  category: string,
  badgeVariant: "success" | "warning" | "danger" | "neutral",
  description: string,
  referenceStandard: string,
  clinicalNotice?: string
): BmiClassification {
  return {
    category,
    badgeVariant,
    description,
    referenceStandard,
    clinicalNotice,
    toString() {
      return this.category;
    },
  };
}

export function classifyBMI(
  bmi: number | null | undefined,
  context?: { ageYears?: number | null; isPregnant?: boolean }
): BmiClassification | null {
  if (bmi === null || bmi === undefined || isNaN(bmi) || bmi <= 0) {
    return null;
  }

  // 1. Gestante: Não se aplica critério de adulto
  if (context?.isPregnant) {
    return makeClassification(
      "Gestante (Critério Especial)",
      "neutral",
      "Classificação padrão de adulto não se aplica a gestantes.",
      "Atalah et al. (1997) / Ministério da Saúde",
      "Avaliar ganho ponderal gestacional de acordo com a idade gestacional e o IMC pré-gestacional."
    );
  }

  // 2. Menores de 18 anos
  if (context?.ageYears !== undefined && context?.ageYears !== null && context.ageYears < 18) {
    return makeClassification(
      "Pediátrico / Adolescente (Critério Especial)",
      "neutral",
      "Classificação de adulto não se aplica a menores de 18 anos.",
      "Curvas de Crescimento OMS (Percentil / Escore-Z)",
      "Utilizar percentis de IMC para idade e sexo (WHO 2006/2007)."
    );
  }

  // 3. Idosos (>= 60 anos) - Critérios de Lipschitz (1991) / OPAS
  if (context?.ageYears !== undefined && context?.ageYears !== null && context.ageYears >= 60) {
    if (bmi < 22.0) {
      return makeClassification(
        "Baixo peso (Idoso)",
        "warning",
        "IMC < 22,0 kg/m² para idosos",
        "Lipschitz (1991) / Ministério da Saúde / OPAS"
      );
    }
    if (bmi <= 27.0) {
      return makeClassification(
        "Adequado / Eutrófico (Idoso)",
        "success",
        "IMC entre 22,0 e 27,0 kg/m² para idosos",
        "Lipschitz (1991) / Ministério da Saúde / OPAS"
      );
    }
    return makeClassification(
      "Excesso de peso (Idoso)",
      "warning",
      "IMC > 27,0 kg/m² para idosos",
      "Lipschitz (1991) / Ministério da Saúde / OPAS"
    );
  }

  // 4. Adultos (18 a 59 anos) - Critérios OMS (1995/2000)
  if (bmi < 16.0) {
    return makeClassification(
      "Magreza severa",
      "danger",
      "IMC < 16,0 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 17.0) {
    return makeClassification(
      "Magreza moderada",
      "warning",
      "IMC entre 16,0 e 16,9 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 18.5) {
    return makeClassification(
      "Magreza leve",
      "warning",
      "IMC entre 17,0 e 18,4 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 25.0) {
    return makeClassification(
      "Eutrofia",
      "success",
      "IMC entre 18,5 e 24,9 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 30.0) {
    return makeClassification(
      "Sobrepeso",
      "warning",
      "IMC entre 25,0 e 29,9 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 35.0) {
    return makeClassification(
      "Obesidade Grau I",
      "danger",
      "IMC entre 30,0 e 34,9 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  if (bmi < 40.0) {
    return makeClassification(
      "Obesidade Grau II",
      "danger",
      "IMC entre 35,0 e 39,9 kg/m²",
      "Organização Mundial da Saúde (WHO)"
    );
  }
  return makeClassification(
    "Obesidade Grau III",
    "danger",
    "IMC >= 40,0 kg/m²",
    "Organização Mundial da Saúde (WHO)"
  );
}
