/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE J — PATIENT NUTRITIONAL PLANNING TYPES & CONSTANTS
 * Strict clinical principles:
 * - UNKNOWN != ZERO
 * - No silent defaults (no auto Sedentary, no auto Maintenance, no auto Macros)
 * - Traceable, versioned formulas and activity factors
 * - Explicit separation between CALCULATED target and MANUAL target
 */

export const BMR_FORMULAS = {
  MIFFLIN_ST_JEOR_V1: "MIFFLIN_ST_JEOR_V1",
  HARRIS_BENEDICT_REVISED_1984_V1: "HARRIS_BENEDICT_REVISED_1984_V1",
} as const;

export type BmrFormulaCode = (typeof BMR_FORMULAS)[keyof typeof BMR_FORMULAS];

export interface BmrFormulaMetadata {
  code: BmrFormulaCode;
  name: string;
  description: string;
  sourceReference: string;
  requiredInputs: string[];
}

export const BMR_FORMULA_METADATA: Record<BmrFormulaCode, BmrFormulaMetadata> = {
  MIFFLIN_ST_JEOR_V1: {
    code: "MIFFLIN_ST_JEOR_V1",
    name: "Mifflin-St Jeor (1990)",
    description: "Fórmula padrão amplamente recomendada pela Academy of Nutrition and Dietetics para estimativa de TMB.",
    sourceReference: "Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241-247.",
    requiredInputs: ["weightKg", "heightCm", "ageYears", "biologicalSex"],
  },
  HARRIS_BENEDICT_REVISED_1984_V1: {
    code: "HARRIS_BENEDICT_REVISED_1984_V1",
    name: "Harris-Benedict Revisada (Roza & Shizgal 1984)",
    description: "Revisão moderna da clássica equação de Harris-Benedict com coeficientes atualizados.",
    sourceReference: "Roza AM, Shizgal HM. Am J Clin Nutr. 1984;40(1):168-182.",
    requiredInputs: ["weightKg", "heightCm", "ageYears", "biologicalSex"],
  },
};

export const ACTIVITY_LEVELS = {
  SEDENTARY: "SEDENTARY",
  LIGHT: "LIGHT",
  MODERATE: "MODERATE",
  VERY_ACTIVE: "VERY_ACTIVE",
  EXTRA_ACTIVE: "EXTRA_ACTIVE",
} as const;

export type ActivityLevelCode = (typeof ACTIVITY_LEVELS)[keyof typeof ACTIVITY_LEVELS];

export interface ActivityLevelDefinition {
  code: ActivityLevelCode;
  factor: number;
  label: string;
  description: string;
}

export const ACTIVITY_LEVEL_DEFINITIONS: Record<ActivityLevelCode, ActivityLevelDefinition> = {
  SEDENTARY: {
    code: "SEDENTARY",
    factor: 1.200,
    label: "Sedentário",
    description: "Pouco ou nenhum exercício na rotina",
  },
  LIGHT: {
    code: "LIGHT",
    factor: 1.375,
    label: "Levemente ativo",
    description: "Exercício leve 1 a 3 dias por semana",
  },
  MODERATE: {
    code: "MODERATE",
    factor: 1.550,
    label: "Moderadamente ativo",
    description: "Exercício moderado 3 a 5 dias por semana",
  },
  VERY_ACTIVE: {
    code: "VERY_ACTIVE",
    factor: 1.725,
    label: "Muito ativo",
    description: "Exercício intenso 6 a 7 dias por semana",
  },
  EXTRA_ACTIVE: {
    code: "EXTRA_ACTIVE",
    factor: 1.900,
    label: "Extremamente ativo",
    description: "Exercício muito intenso diário ou trabalho físico pesado",
  },
};

export const GOAL_TYPES = {
  MAINTENANCE: "MAINTENANCE",
  WEIGHT_LOSS: "WEIGHT_LOSS",
  WEIGHT_GAIN: "WEIGHT_GAIN",
  CUSTOM: "CUSTOM",
} as const;

export type GoalTypeCode = (typeof GOAL_TYPES)[keyof typeof GOAL_TYPES];

export interface GoalTypeDefinition {
  code: GoalTypeCode;
  label: string;
  defaultAdjustmentKcal: number | null;
}

export const GOAL_TYPE_DEFINITIONS: Record<GoalTypeCode, GoalTypeDefinition> = {
  MAINTENANCE: {
    code: "MAINTENANCE",
    label: "Manutenção",
    defaultAdjustmentKcal: 0,
  },
  WEIGHT_LOSS: {
    code: "WEIGHT_LOSS",
    label: "Perda de peso (Déficit)",
    defaultAdjustmentKcal: -300,
  },
  WEIGHT_GAIN: {
    code: "WEIGHT_GAIN",
    label: "Ganho de peso (Superávit)",
    defaultAdjustmentKcal: 300,
  },
  CUSTOM: {
    code: "CUSTOM",
    label: "Meta personalizada",
    defaultAdjustmentKcal: null,
  },
};

export const TARGET_CALORIE_SOURCES = {
  CALCULATED: "CALCULATED",
  MANUAL: "MANUAL",
} as const;

export type TargetCalorieSource = (typeof TARGET_CALORIE_SOURCES)[keyof typeof TARGET_CALORIE_SOURCES];

export type BiologicalSex = "MALE" | "FEMALE";

export interface PatientPlanning {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  patientRecordId: number | null;
  createdByMembershipId: number;
  updatedByMembershipId: number | null;
  calculatedAt: string | null;

  // Snapshot of inputs used at planning calculation time
  snapshotWeightKg: number | null;
  snapshotHeightCm: number | null;
  snapshotAgeYears: number | null;
  snapshotBiologicalSex: BiologicalSex | null;

  // BMR
  bmrFormula: BmrFormulaCode | null;
  bmrKcal: number | null;

  // Activity & TDEE
  activityLevel: ActivityLevelCode | null;
  activityFactor: number | null;
  tdeeKcal: number | null;

  // Goal & Calorie Target
  goalType: GoalTypeCode | null;
  calorieAdjustmentKcal: number | null;
  calculatedTargetCaloriesKcal: number | null;
  targetCaloriesKcal: number | null;
  targetCaloriesSource: TargetCalorieSource | null;

  // Macronutrient Targets
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatsG: number | null;

  clinicalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePatientPlanningInput {
  patientRecordId?: number | null;
  calculatedAt?: string | null;

  // Snapshot
  snapshotWeightKg?: number | null;
  snapshotHeightCm?: number | null;
  snapshotAgeYears?: number | null;
  snapshotBiologicalSex?: BiologicalSex | null;

  // BMR
  bmrFormula?: BmrFormulaCode | null;
  bmrKcal?: number | null;

  // Activity & TDEE
  activityLevel?: ActivityLevelCode | null;
  activityFactor?: number | null;
  tdeeKcal?: number | null;

  // Goal & Calorie Target
  goalType?: GoalTypeCode | null;
  calorieAdjustmentKcal?: number | null;
  calculatedTargetCaloriesKcal?: number | null;
  targetCaloriesKcal?: number | null;
  targetCaloriesSource?: TargetCalorieSource | null;

  // Macros
  targetProteinG?: number | null;
  targetCarbsG?: number | null;
  targetFatsG?: number | null;

  clinicalNotes?: string | null;
}

export interface PatientPlanningStaleStatus {
  isStale: boolean;
  reasons: string[];
  currentInputs: {
    weightKg: number | null;
    heightCm: number | null;
    ageYears: number | null;
    biologicalSex: BiologicalSex | null;
  };
  snapshotInputs: {
    weightKg: number | null;
    heightCm: number | null;
    ageYears: number | null;
    biologicalSex: BiologicalSex | null;
  } | null;
}

export interface PatientPlanningWithStatus {
  planning: PatientPlanning | null;
  staleStatus: PatientPlanningStaleStatus;
}
