/**
-- TREVO ONE — NUTRITION PROFESSIONAL V2
-- RELEASE K — CIRCUMFERENCES & BODY RATIOS (ETAPA 11)
-- Waist-to-Hip Ratio (RCQ / WHR) and waist circumference risk indicators
-- Primary reference: World Health Organization (WHO, 2008) Waist Circumference and Waist-Hip Ratio
*/

import type { BiologicalSex } from "../../patient-planning-types";

export interface WaistToHipRatioResult {
  waistCm: number;
  hipCm: number;
  ratio: number;
  riskCategory: "Baixo risco" | "Risco moderado" | "Risco cardiovascular aumentado" | "Risco muito aumentado";
  badgeVariant: "success" | "warning" | "danger";
  referenceStandard: string;
}

export function calculateWaistToHipRatio(
  waistCm: number | null | undefined,
  hipCm: number | null | undefined,
  sex: BiologicalSex | null | undefined
): WaistToHipRatioResult | null {
  if (
    waistCm === null ||
    waistCm === undefined ||
    hipCm === null ||
    hipCm === undefined ||
    waistCm <= 0 ||
    hipCm <= 0
  ) {
    return null;
  }

  const ratio = Number((waistCm / hipCm).toFixed(2));
  const isMale = sex === "MALE";

  let riskCategory: WaistToHipRatioResult["riskCategory"];
  let badgeVariant: WaistToHipRatioResult["badgeVariant"];

  if (isMale) {
    if (ratio < 0.90) {
      riskCategory = "Baixo risco";
      badgeVariant = "success";
    } else if (ratio < 0.95) {
      riskCategory = "Risco moderado";
      badgeVariant = "warning";
    } else {
      riskCategory = "Risco cardiovascular aumentado";
      badgeVariant = "danger";
    }
  } else {
    if (ratio < 0.80) {
      riskCategory = "Baixo risco";
      badgeVariant = "success";
    } else if (ratio < 0.85) {
      riskCategory = "Risco moderado";
      badgeVariant = "warning";
    } else {
      riskCategory = "Risco cardiovascular aumentado";
      badgeVariant = "danger";
    }
  }

  return {
    waistCm,
    hipCm,
    ratio,
    riskCategory,
    badgeVariant,
    referenceStandard: "World Health Organization (WHO, 2008)",
  };
}
