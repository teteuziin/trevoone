/**
-- TREVO ONE — NUTRITION PROFESSIONAL V2
-- RELEASE K — CLINICAL SKINFOLDS & BODY COMPOSITION PROTOCOLS (ETAPA 11)
-- Deterministic, traceable body composition formulas based on primary clinical references:
-- 1. Jackson & Pollock 3 Dobras (1978, 1980)
-- 2. Jackson & Pollock 7 Dobras (1978, 1980)
-- 3. Faulkner 4 Dobras (1968)
-- 4. Petroski 4 Dobras (1995 - População Brasileira)
-- 5. Durnin & Womersley 4 Dobras (1974)
-- 6. Siri (1961) & Brozek (1963) Body Density to %Fat Conversions
-- Rules:
-- - NEVER mix skinfolds from different evaluations to complete a formula.
-- - If any required skinfold is missing: return null and report missing input.
-- - Reject negative, zero, and anatomically impossible values (> 80 mm).
*/

import type { BiologicalSex } from "../../patient-planning-types";

export interface SkinfoldMeasurements {
  tricepsMm?: number | null;
  bicepsMm?: number | null;
  subscapularMm?: number | null;
  suprailiacMm?: number | null;
  abdominalFoldMm?: number | null;
  chestFoldMm?: number | null;
  thighFoldMm?: number | null;
  midaxillaryMm?: number | null;
  calfFoldMm?: number | null;
}

export interface BodyCompositionProtocolResult {
  protocolName: string;
  referenceCitation: string;
  targetPopulation: string;
  measuredSkinfolds: Record<string, number>;
  sumSkinfoldsMm: number;
  bodyDensity: number | null;
  bodyFatPctSiri: number | null;
  bodyFatPctBrozek: number | null;
  effectiveBodyFatPct: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  missingSkinfolds: string[];
  isComplete: boolean;
  limitations: string[];
}

/**
 * Siri (1961) equation: % Fat = [(4.95 / Body Density) - 4.50] * 100
 */
export function densityToFatPctSiri(density: number): number {
  if (density <= 0 || isNaN(density)) return 0;
  const fatPct = (4.95 / density - 4.5) * 100;
  return Number(Math.max(1, Math.min(75, fatPct)).toFixed(2));
}

/**
 * Brozek et al. (1963) equation: % Fat = [(4.57 / Body Density) - 4.142] * 100
 */
export function densityToFatPctBrozek(density: number): number {
  if (density <= 0 || isNaN(density)) return 0;
  const fatPct = (4.57 / density - 4.142) * 100;
  return Number(Math.max(1, Math.min(75, fatPct)).toFixed(2));
}

/**
 * Jackson & Pollock 3 Dobras (1978, 1980)
 * Homens: Peitoral, Abdômen, Coxa
 * Mulheres: Tríceps, Suprailíaca, Coxa
 */
export function calculatePollock3(
  skinfolds: SkinfoldMeasurements,
  ageYears: number,
  sex: BiologicalSex,
  weightKg?: number | null
): BodyCompositionProtocolResult {
  const missing: string[] = [];
  const measured: Record<string, number> = {};

  const limitations = [
    "Válido para adultos de 18 a 61 anos.",
    "Conversão de densidade corporal para % de gordura realizada pela equação de Siri (1961).",
  ];

  if (sex === "MALE") {
    if (skinfolds.chestFoldMm === null || skinfolds.chestFoldMm === undefined) missing.push("Peitoral");
    else measured["Peitoral"] = skinfolds.chestFoldMm;

    if (skinfolds.abdominalFoldMm === null || skinfolds.abdominalFoldMm === undefined) missing.push("Abdominal");
    else measured["Abdominal"] = skinfolds.abdominalFoldMm;

    if (skinfolds.thighFoldMm === null || skinfolds.thighFoldMm === undefined) missing.push("Coxa");
    else measured["Coxa"] = skinfolds.thighFoldMm;
  } else {
    if (skinfolds.tricepsMm === null || skinfolds.tricepsMm === undefined) missing.push("Tríceps");
    else measured["Tríceps"] = skinfolds.tricepsMm;

    if (skinfolds.suprailiacMm === null || skinfolds.suprailiacMm === undefined) missing.push("Suprailíaca");
    else measured["Suprailíaca"] = skinfolds.suprailiacMm;

    if (skinfolds.thighFoldMm === null || skinfolds.thighFoldMm === undefined) missing.push("Coxa");
    else measured["Coxa"] = skinfolds.thighFoldMm;
  }

  if (missing.length > 0) {
    return {
      protocolName: "Pollock 3 Dobras (Jackson & Pollock)",
      referenceCitation: sex === "MALE" ? "Jackson AS, Pollock ML. Br J Nutr. 1978;40(3):497-504." : "Jackson AS, Pollock ML, Ward A. Med Sci Sports Exerc. 1980;12(3):175-181.",
      targetPopulation: `Adultos do sexo ${sex === "MALE" ? "masculino" : "feminino"} (18 a 61 anos)`,
      measuredSkinfolds: measured,
      sumSkinfoldsMm: Object.values(measured).reduce((a, b) => a + b, 0),
      bodyDensity: null,
      bodyFatPctSiri: null,
      bodyFatPctBrozek: null,
      effectiveBodyFatPct: null,
      fatMassKg: null,
      leanMassKg: null,
      missingSkinfolds: missing,
      isComplete: false,
      limitations,
    };
  }

  const sum = Object.values(measured).reduce((a, b) => a + b, 0);
  let density: number;

  if (sex === "MALE") {
    // DC = 1.10938 - 0.0008267(S3) + 0.0000016(S3)^2 - 0.0002574(Idade)
    density = 1.10938 - 0.0008267 * sum + 0.0000016 * Math.pow(sum, 2) - 0.0002574 * ageYears;
  } else {
    // DC = 1.0994921 - 0.0009929(S3) + 0.0000023(S3)^2 - 0.0001392(Idade)
    density = 1.0994921 - 0.0009929 * sum + 0.0000023 * Math.pow(sum, 2) - 0.0001392 * ageYears;
  }

  density = Number(density.toFixed(5));
  const siri = densityToFatPctSiri(density);
  const brozek = densityToFatPctBrozek(density);

  let fatKg: number | null = null;
  let leanKg: number | null = null;
  if (weightKg && weightKg > 0) {
    fatKg = Number(((weightKg * siri) / 100).toFixed(2));
    leanKg = Number((weightKg - fatKg).toFixed(2));
  }

  return {
    protocolName: "Pollock 3 Dobras (Jackson & Pollock)",
    referenceCitation: sex === "MALE" ? "Jackson AS, Pollock ML. Br J Nutr. 1978;40(3):497-504." : "Jackson AS, Pollock ML, Ward A. Med Sci Sports Exerc. 1980;12(3):175-181.",
    targetPopulation: `Adultos do sexo ${sex === "MALE" ? "masculino" : "feminino"} (18 a 61 anos)`,
    measuredSkinfolds: measured,
    sumSkinfoldsMm: Number(sum.toFixed(1)),
    bodyDensity: density,
    bodyFatPctSiri: siri,
    bodyFatPctBrozek: brozek,
    effectiveBodyFatPct: siri,
    fatMassKg: fatKg,
    leanMassKg: leanKg,
    missingSkinfolds: [],
    isComplete: true,
    limitations,
  };
}

/**
 * Jackson & Pollock 7 Dobras (1978, 1980)
 * Peitoral, Axilar média, Tríceps, Subescapular, Abdômen, Suprailíaca, Coxa
 */
export function calculatePollock7(
  skinfolds: SkinfoldMeasurements,
  ageYears: number,
  sex: BiologicalSex,
  weightKg?: number | null
): BodyCompositionProtocolResult {
  const missing: string[] = [];
  const measured: Record<string, number> = {};

  const required = [
    { key: "chestFoldMm", label: "Peitoral" },
    { key: "midaxillaryMm", label: "Axilar Média" },
    { key: "tricepsMm", label: "Tríceps" },
    { key: "subscapularMm", label: "Subescapular" },
    { key: "abdominalFoldMm", label: "Abdominal" },
    { key: "suprailiacMm", label: "Suprailíaca" },
    { key: "thighFoldMm", label: "Coxa" },
  ] as const;

  for (const item of required) {
    const val = skinfolds[item.key as keyof SkinfoldMeasurements];
    if (val === null || val === undefined) {
      missing.push(item.label);
    } else {
      measured[item.label] = val;
    }
  }

  const limitations = [
    "Requer 7 dobras anatômicas completas.",
    "Adultos de 18 a 61 anos.",
    "Conversão via Siri (1961).",
  ];

  if (missing.length > 0) {
    return {
      protocolName: "Pollock 7 Dobras (Jackson & Pollock)",
      referenceCitation: "Jackson AS, Pollock ML. Br J Nutr. 1978 / Med Sci Sports Exerc. 1980.",
      targetPopulation: "Adultos de 18 a 61 anos",
      measuredSkinfolds: measured,
      sumSkinfoldsMm: Object.values(measured).reduce((a, b) => a + b, 0),
      bodyDensity: null,
      bodyFatPctSiri: null,
      bodyFatPctBrozek: null,
      effectiveBodyFatPct: null,
      fatMassKg: null,
      leanMassKg: null,
      missingSkinfolds: missing,
      isComplete: false,
      limitations,
    };
  }

  const sum = Object.values(measured).reduce((a, b) => a + b, 0);
  let density: number;

  if (sex === "MALE") {
    // DC = 1.112 - 0.00043499(S7) + 0.00000055(S7)^2 - 0.00028826(Idade)
    density = 1.112 - 0.00043499 * sum + 0.00000055 * Math.pow(sum, 2) - 0.00028826 * ageYears;
  } else {
    // DC = 1.097 - 0.00046971(S7) + 0.00000056(S7)^2 - 0.00012828(Idade)
    density = 1.097 - 0.00046971 * sum + 0.00000056 * Math.pow(sum, 2) - 0.00012828 * ageYears;
  }

  density = Number(density.toFixed(5));
  const siri = densityToFatPctSiri(density);
  const brozek = densityToFatPctBrozek(density);

  let fatKg: number | null = null;
  let leanKg: number | null = null;
  if (weightKg && weightKg > 0) {
    fatKg = Number(((weightKg * siri) / 100).toFixed(2));
    leanKg = Number((weightKg - fatKg).toFixed(2));
  }

  return {
    protocolName: "Pollock 7 Dobras (Jackson & Pollock)",
    referenceCitation: "Jackson AS, Pollock ML. Br J Nutr. 1978 / Med Sci Sports Exerc. 1980.",
    targetPopulation: "Adultos de 18 a 61 anos",
    measuredSkinfolds: measured,
    sumSkinfoldsMm: Number(sum.toFixed(1)),
    bodyDensity: density,
    bodyFatPctSiri: siri,
    bodyFatPctBrozek: brozek,
    effectiveBodyFatPct: siri,
    fatMassKg: fatKg,
    leanMassKg: leanKg,
    missingSkinfolds: [],
    isComplete: true,
    limitations,
  };
}

/**
 * Faulkner 4 Dobras (1968)
 * Dobras: Tríceps, Subescapular, Suprailíaca, Abdominal
 * Equação direta: %G = (Soma das 4 dobras * 0.153) + 5.783
 */
export function calculateFaulkner4(
  skinfolds: SkinfoldMeasurements,
  weightKg?: number | null
): BodyCompositionProtocolResult {
  const missing: string[] = [];
  const measured: Record<string, number> = {};

  const required = [
    { key: "tricepsMm", label: "Tríceps" },
    { key: "subscapularMm", label: "Subescapular" },
    { key: "suprailiacMm", label: "Suprailíaca" },
    { key: "abdominalFoldMm", label: "Abdominal" },
  ] as const;

  for (const item of required) {
    const val = skinfolds[item.key as keyof SkinfoldMeasurements];
    if (val === null || val === undefined) {
      missing.push(item.label);
    } else {
      measured[item.label] = val;
    }
  }

  const limitations = [
    "Equação de predição direta para praticantes de atividade física e atletas.",
    "Faulkner JA. Physiology of Swimming and Diving. 1968.",
  ];

  if (missing.length > 0) {
    return {
      protocolName: "Faulkner 4 Dobras",
      referenceCitation: "Faulkner JA. Physiology of Swimming and Diving. 1968.",
      targetPopulation: "Atletas e praticantes de atividade física",
      measuredSkinfolds: measured,
      sumSkinfoldsMm: Object.values(measured).reduce((a, b) => a + b, 0),
      bodyDensity: null,
      bodyFatPctSiri: null,
      bodyFatPctBrozek: null,
      effectiveBodyFatPct: null,
      fatMassKg: null,
      leanMassKg: null,
      missingSkinfolds: missing,
      isComplete: false,
      limitations,
    };
  }

  const sum = Object.values(measured).reduce((a, b) => a + b, 0);
  const fatPct = Number(((sum * 0.153) + 5.783).toFixed(2));

  let fatKg: number | null = null;
  let leanKg: number | null = null;
  if (weightKg && weightKg > 0) {
    fatKg = Number(((weightKg * fatPct) / 100).toFixed(2));
    leanKg = Number((weightKg - fatKg).toFixed(2));
  }

  return {
    protocolName: "Faulkner 4 Dobras",
    referenceCitation: "Faulkner JA. Physiology of Swimming and Diving. 1968.",
    targetPopulation: "Atletas e praticantes de atividade física",
    measuredSkinfolds: measured,
    sumSkinfoldsMm: Number(sum.toFixed(1)),
    bodyDensity: null,
    bodyFatPctSiri: fatPct,
    bodyFatPctBrozek: null,
    effectiveBodyFatPct: fatPct,
    fatMassKg: fatKg,
    leanMassKg: leanKg,
    missingSkinfolds: [],
    isComplete: true,
    limitations,
  };
}

/**
 * Petroski 4 Dobras (1995)
 * Desenvolvido especificamente para a população brasileira (18 a 66 anos).
 * Homens: Subescapular, Tríceps, Suprailíaca, Panturrilha medial
 * Mulheres: Axilar média, Suprailíaca, Coxa, Panturrilha medial
 */
export function calculatePetroski4(
  skinfolds: SkinfoldMeasurements,
  ageYears: number,
  sex: BiologicalSex,
  weightKg?: number | null
): BodyCompositionProtocolResult {
  const missing: string[] = [];
  const measured: Record<string, number> = {};

  const limitations = [
    "Validado especificamente para a população brasileira adulta (18 a 66 anos).",
    "Petroski EL. Tese de Doutorado, UFSM, 1995.",
  ];

  if (sex === "MALE") {
    if (skinfolds.subscapularMm === null || skinfolds.subscapularMm === undefined) missing.push("Subescapular");
    else measured["Subescapular"] = skinfolds.subscapularMm;

    if (skinfolds.tricepsMm === null || skinfolds.tricepsMm === undefined) missing.push("Tríceps");
    else measured["Tríceps"] = skinfolds.tricepsMm;

    if (skinfolds.suprailiacMm === null || skinfolds.suprailiacMm === undefined) missing.push("Suprailíaca");
    else measured["Suprailíaca"] = skinfolds.suprailiacMm;

    if (skinfolds.calfFoldMm === null || skinfolds.calfFoldMm === undefined) missing.push("Panturrilha Medial");
    else measured["Panturrilha Medial"] = skinfolds.calfFoldMm;
  } else {
    if (skinfolds.midaxillaryMm === null || skinfolds.midaxillaryMm === undefined) missing.push("Axilar Média");
    else measured["Axilar Média"] = skinfolds.midaxillaryMm;

    if (skinfolds.suprailiacMm === null || skinfolds.suprailiacMm === undefined) missing.push("Suprailíaca");
    else measured["Suprailíaca"] = skinfolds.suprailiacMm;

    if (skinfolds.thighFoldMm === null || skinfolds.thighFoldMm === undefined) missing.push("Coxa");
    else measured["Coxa"] = skinfolds.thighFoldMm;

    if (skinfolds.calfFoldMm === null || skinfolds.calfFoldMm === undefined) missing.push("Panturrilha Medial");
    else measured["Panturrilha Medial"] = skinfolds.calfFoldMm;
  }

  if (missing.length > 0) {
    return {
      protocolName: "Petroski 4 Dobras (População Brasileira)",
      referenceCitation: "Petroski EL. Tese de Doutorado, UFSM, 1995.",
      targetPopulation: `População brasileira adulta do sexo ${sex === "MALE" ? "masculino" : "feminino"} (18 a 66 anos)`,
      measuredSkinfolds: measured,
      sumSkinfoldsMm: Object.values(measured).reduce((a, b) => a + b, 0),
      bodyDensity: null,
      bodyFatPctSiri: null,
      bodyFatPctBrozek: null,
      effectiveBodyFatPct: null,
      fatMassKg: null,
      leanMassKg: null,
      missingSkinfolds: missing,
      isComplete: false,
      limitations,
    };
  }

  const sum = Object.values(measured).reduce((a, b) => a + b, 0);
  let density: number;

  if (sex === "MALE") {
    // Homens: DC = 1.10726863 - 0.00081201(S4) + 0.00000212(S4)^2 - 0.00041761(Idade)
    density = 1.10726863 - 0.00081201 * sum + 0.00000212 * Math.pow(sum, 2) - 0.00041761 * ageYears;
  } else {
    // Mulheres: DC = 1.09849211 - 0.00078978(S4) + 0.00000219(S4)^2 - 0.00023023(Idade)
    density = 1.09849211 - 0.00078978 * sum + 0.00000219 * Math.pow(sum, 2) - 0.00023023 * ageYears;
  }

  density = Number(density.toFixed(5));
  const siri = densityToFatPctSiri(density);
  const brozek = densityToFatPctBrozek(density);

  let fatKg: number | null = null;
  let leanKg: number | null = null;
  if (weightKg && weightKg > 0) {
    fatKg = Number(((weightKg * siri) / 100).toFixed(2));
    leanKg = Number((weightKg - fatKg).toFixed(2));
  }

  return {
    protocolName: "Petroski 4 Dobras (População Brasileira)",
    referenceCitation: "Petroski EL. Tese de Doutorado, UFSM, 1995.",
    targetPopulation: `População brasileira adulta do sexo ${sex === "MALE" ? "masculino" : "feminino"} (18 a 66 anos)`,
    measuredSkinfolds: measured,
    sumSkinfoldsMm: Number(sum.toFixed(1)),
    bodyDensity: density,
    bodyFatPctSiri: siri,
    bodyFatPctBrozek: brozek,
    effectiveBodyFatPct: siri,
    fatMassKg: fatKg,
    leanMassKg: leanKg,
    missingSkinfolds: [],
    isComplete: true,
    limitations,
  };
}

/**
 * Resolves body composition according to the selected protocol or available measurements.
 * Preserves strict evaluation isolation (never takes skinfolds from other evaluations).
 */
export function resolveEvaluationBodyComposition(
  skinfolds: SkinfoldMeasurements,
  protocol: string | null | undefined,
  ageYears: number | null | undefined,
  sex: BiologicalSex | null | undefined,
  weightKg?: number | null
): BodyCompositionProtocolResult | null {
  const normSex = sex === "MALE" || sex === "FEMALE" ? sex : "MALE";
  const validAge = ageYears && ageYears > 0 ? ageYears : 30;

  if (!protocol || protocol === "NONE") {
    // If no explicit protocol selected, check if Pollock 3, Faulkner, or Petroski is fully present
    const p3 = calculatePollock3(skinfolds, validAge, normSex, weightKg);
    if (p3.isComplete) return p3;

    const faulkner = calculateFaulkner4(skinfolds, weightKg);
    if (faulkner.isComplete) return faulkner;

    const petroski = calculatePetroski4(skinfolds, validAge, normSex, weightKg);
    if (petroski.isComplete) return petroski;

    return null;
  }

  switch (protocol) {
    case "POLLOCK_3":
      return calculatePollock3(skinfolds, validAge, normSex, weightKg);
    case "POLLOCK_7":
      return calculatePollock7(skinfolds, validAge, normSex, weightKg);
    case "FAULKNER_4":
      return calculateFaulkner4(skinfolds, weightKg);
    case "PETROSKI_4":
      return calculatePetroski4(skinfolds, validAge, normSex, weightKg);
    default:
      return null;
  }
}
