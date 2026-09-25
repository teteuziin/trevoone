/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL CALCULATIONS DOMAIN, REGISTRY & ENGINE
 *
 * Safe, versioned, traceable, transparent clinical calculation architecture.
 * Strict decision-support principles:
 * - Deterministic WHO Standard BMI without automatic medical diagnoses
 * - Zero invented metabolic formulas (BMR, TDEE, pregnancy, lactation return SPEC_REQUIRED)
 * - Strict input provenance (Anthropometrics > Onboarding reference > Manual override)
 * - Manual calculation simulation overrides do NOT mutate patient records or measurement history
 * - Unknown inputs remain unknown (never coerced to zero)
 * - Rejects NaN, Infinity, negative, and zero values where anatomically invalid
 */

// ============================================================================
// 1. DOMAIN TYPES
// ============================================================================

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

// ============================================================================
// 2. VALIDATION & PROVENANCE HELPERS
// ============================================================================

export class CalculationValidationError extends Error {
  public readonly code: string;
  public readonly statusCode = 400;

  constructor(message: string, code = "INVALID_CALCULATION_INPUT") {
    super(message);
    this.name = "CalculationValidationError";
    this.code = code;
  }
}

/**
 * Validates a positive, finite numeric value within anatomical bounds.
 * Rejects NaN, Infinity, negative values, and zero.
 */
export function validateNumericInput(
  raw: unknown,
  fieldName: string,
  min: number,
  max: number,
  unit = ""
): number {
  if (raw === null || raw === undefined || raw === "") {
    throw new CalculationValidationError(
      `O campo '${fieldName}' é obrigatório para este cálculo.`,
      "MISSING_INPUT"
    );
  }

  const num = typeof raw === "number" ? raw : Number(raw);

  if (Number.isNaN(num)) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' é inválido (não numérico/NaN).`,
      "NAN_VALUE"
    );
  }

  if (!Number.isFinite(num)) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' deve ser finito (não infinito).`,
      "INFINITY_VALUE"
    );
  }

  if (num <= 0) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' deve ser estritamente positivo (maior que zero).`,
      "NON_POSITIVE_VALUE"
    );
  }

  if (num < min || num > max) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' (${num}${unit ? " " + unit : ""}) está fora dos limites aceitáveis (${min} a ${max}${unit ? " " + unit : ""}).`,
      "OUT_OF_BOUNDS"
    );
  }

  return num;
}

/**
 * Creates an input value object preserving provenance.
 */
export function createInputValue<T = number | string>(
  value: T,
  unit: string,
  source: InputSource,
  sourcePublicId: string | null = null,
  sourceLabel?: string,
  isOverride = false
): CalculationInputValue<T> {
  return {
    value,
    unit,
    source,
    sourcePublicId,
    sourceLabel,
    isOverride,
  };
}

// ============================================================================
// 3. FORMULAS: APPROVED STANDARD BMI & SPEC-REQUIRED STUBS
// ============================================================================

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

// ============================================================================
// 4. CENTRAL FORMULA REGISTRY
// ============================================================================

class FormulaRegistry {
  private readonly formulas = new Map<string, FormulaDefinition>();

  constructor() {
    // Register approved standard formulas
    this.register(BMI_STANDARD_FORMULA);

    // Register spec-required stubs
    for (const stub of SPEC_REQUIRED_FORMULAS) {
      this.register(stub);
    }
  }

  public register(formula: FormulaDefinition): void {
    if (!formula.code || !formula.version) {
      throw new Error("Fórmula deve ter código e versão definidos.");
    }
    if (this.formulas.has(formula.code)) {
      throw new Error(`Fórmula com código '${formula.code}' já está registrada.`);
    }
    this.formulas.set(formula.code, Object.freeze({ ...formula }));
  }

  public get(code: string): FormulaDefinition | null {
    return this.formulas.get(code) || null;
  }

  public listAll(): FormulaDefinition[] {
    return Array.from(this.formulas.values());
  }

  public listByCalculation(calcCode: CalculationCode): FormulaDefinition[] {
    return Array.from(this.formulas.values()).filter(
      (f) => f.calculationCode === calcCode
    );
  }

  public listApproved(): FormulaDefinition[] {
    return Array.from(this.formulas.values()).filter(
      (f) => f.status === "APPROVED"
    );
  }
}

export const clinicalFormulaRegistry = new FormulaRegistry();

// ============================================================================
// 5. CALCULATION ENGINE & PROVENANCE RESOLVER
// ============================================================================

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
