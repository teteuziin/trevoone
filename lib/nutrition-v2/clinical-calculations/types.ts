/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL CALCULATIONS DOMAIN TYPES
 * Versioned, transparent, traceable, deterministic calculation interfaces.
 */

export type CalculationCode =
  | "BMI_STANDARD"
  | "BMR"
  | "TDEE"
  | "ENERGY_TARGET"
  | "MACRONUTRIENT_SPLIT"
  | "PREGNANCY_ENERGY"
  | "LACTATION_ENERGY";

export type FormulaStatus = "APPROVED" | "SPEC_REQUIRED" | "INACTIVE";

export type InputSource =
  | "ANTHROPOMETRIC_ENTRY"
  | "ONBOARDING_REFERENCE"
  | "MANUAL_OVERRIDE";

export interface CalculationInputValue<T = number | string> {
  value: T;
  unit?: string;
  source: InputSource;
  sourcePublicId?: string | null;
  sourceLabel?: string;
  isOverride?: boolean;
}

export type CalculationInputs = Record<string, CalculationInputValue>;

export interface ClinicalCalculationResult<T = number> {
  calculationCode: CalculationCode;
  formulaCode: string;
  formulaVersion: string;
  calculatedAt: string; // ISO 8601 string
  inputs: CalculationInputs;
  result: T | null;
  unit: string;
  formattedResult: string;
  assumptions: string[];
  warnings: string[];
  status: "SUCCESS" | "SPEC_REQUIRED" | "MISSING_INPUT" | "INVALID_INPUT";
  errorMessage?: string;
}

export interface FormulaDefinition {
  code: string;
  calculationCode: CalculationCode;
  name: string;
  version: string;
  description: string;
  status: FormulaStatus;
  requiredInputs: string[];
  optionalInputs: string[];
  outputUnit: string;
  applicability: string;
  sourceReference?: string;
  execute: (inputs: CalculationInputs) => ClinicalCalculationResult;
}

export interface PatientCalculationContext {
  consultancyId: number;
  studentMembershipId: number;
  patientRecordPublicId?: string | null;
  latestAnthropometrics?: {
    publicId: string;
    measurementDate: string;
    weightKg: number | null;
    heightCm: number | null;
    waistCm: number | null;
    hipCm: number | null;
  } | null;
  onboardingReference?: {
    reportedWeightKg?: number | null;
    reportedHeightCm?: number | null;
    sex?: string | null;
    birthDate?: string | null;
    mainObjective?: string | null;
  } | null;
  pregnancy?: {
    pregnancyStatus: string;
    gestationalWeeks?: number | null;
    deliveryDate?: string | null;
  } | null;
  overrides?: Record<string, number | string>;
}
