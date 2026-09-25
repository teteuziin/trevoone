/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — METABOLIC FORMULA DESCRIPTORS (SPEC REQUIRED)
 * Typed descriptors for clinical calculations awaiting official nutritionist validation.
 * DO NOT INVENT COEFFICIENTS OR EQUATIONS.
 */

import type {
  CalculationInputs,
  ClinicalCalculationResult,
  FormulaDefinition,
} from "../types";

function createSpecRequiredFormula(
  code: string,
  calculationCode: FormulaDefinition["calculationCode"],
  name: string,
  version: string,
  description: string,
  requiredInputs: string[],
  outputUnit: string,
  applicability: string
): FormulaDefinition {
  return {
    code,
    calculationCode,
    name,
    version,
    description,
    status: "SPEC_REQUIRED",
    requiredInputs,
    optionalInputs: [],
    outputUnit,
    applicability,
    execute(inputs: CalculationInputs): ClinicalCalculationResult {
      return {
        calculationCode,
        formulaCode: code,
        formulaVersion: version,
        calculatedAt: new Date().toISOString(),
        inputs,
        result: null,
        unit: outputUnit,
        formattedResult: "Pendente de validação — fórmula clínica não aprovada.",
        assumptions: [
          "Cálculo suspenso por diretriz clínica até aprovação formal de equação e coeficientes pelo nutricionista.",
        ],
        warnings: [
          "Nenhuma equação metabólica foi inferida automaticamente.",
        ],
        status: "SPEC_REQUIRED",
        errorMessage: "CLINICAL_FORMULA_SPEC_REQUIRED",
      };
    },
  };
}

export const SPEC_REQUIRED_FORMULAS: FormulaDefinition[] = [
  createSpecRequiredFormula(
    "BMR_UNSPECIFIED",
    "BMR",
    "Taxa Metabólica Basal (TMB)",
    "0.1-DRAFT",
    "Estimativa de gasto energético basal. Requer definição formal de equação (ex: Mifflin-St Jeor, Harris-Benedict, Cunningham, Katch-McArdle ou FAO/OMS).",
    ["weightKg", "heightCm", "ageYears", "biologicalSex"],
    "kcal/dia",
    "Adultos em acompanhamento nutricional."
  ),
  createSpecRequiredFormula(
    "TDEE_UNSPECIFIED",
    "TDEE",
    "Gasto Energético Total (GET)",
    "0.1-DRAFT",
    "Estimativa de gasto energético diário total com fator de atividade. Requer definição de tabela de fatores e metodologia.",
    ["bmrKcal", "activityFactor"],
    "kcal/dia",
    "Adultos com rotina de atividade física avaliada."
  ),
  createSpecRequiredFormula(
    "ENERGY_TARGET_UNSPECIFIED",
    "ENERGY_TARGET",
    "Meta Calórica Prescrita",
    "0.1-DRAFT",
    "Ajuste de déficit/superávit para meta (emagrecimento, hipertrofia, manutenção). Requer definição de limites e percentuais seguros.",
    ["tdeeKcal", "objectiveType"],
    "kcal/dia",
    "Prescrição dietética orientada a objetivos."
  ),
  createSpecRequiredFormula(
    "PREGNANCY_ENERGY_UNSPECIFIED",
    "PREGNANCY_ENERGY",
    "Adicional Energético Gestacional",
    "0.1-DRAFT",
    "Adicional calórico por trimestre gestacional. Requer validação de diretriz obstétrica brasileira/internacional aprovada.",
    ["gestationalWeeks", "prePregnancyBmi"],
    "kcal/dia",
    "Gestantes a partir do 2º trimestre."
  ),
  createSpecRequiredFormula(
    "LACTATION_ENERGY_UNSPECIFIED",
    "LACTATION_ENERGY",
    "Adicional Energético para Lactação",
    "0.1-DRAFT",
    "Adicional calórico por lactação exclusiva ou mista. Requer definição de protocolo oficial.",
    ["breastfeedingStatus"],
    "kcal/dia",
    "Nutrizes no pós-parto."
  ),
];
