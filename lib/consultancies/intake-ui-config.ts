import {
  INTAKE_FORMS_REGISTRY,
  type IntakeFormDefinition,
} from "./intake-schemas";

export interface IntakeUIStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  fieldKeys: readonly string[];
}

export interface IntakeUIFormConfig {
  formKey: string;
  version: string;
  displayTitle: string;
  badgeLabel: string;
  introDescription: string;
  steps: readonly IntakeUIStep[];
  fieldHints?: Record<
    string,
    {
      placeholder?: string;
      helpText?: string;
      unit?: string;
      inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
    }
  >;
}

// ============================================================================
// 1. PHYSICAL ASSESSMENT UI CONFIG (18 fields, 4 steps)
// ============================================================================

export const PHYSICAL_ASSESSMENT_UI_CONFIG: IntakeUIFormConfig = {
  formKey: "physical-assessment",
  version: "1.0",
  displayTitle: "Avaliação Física",
  badgeLabel: "Avaliação Antropométrica",
  introDescription:
    "Preencha suas informações corporais e medidas com precisão para elaboração do seu plano personalizado.",
  steps: [
    {
      id: "basic-info",
      title: "Identificação & Dados Básicos",
      shortTitle: "Identificação",
      description: "Informações cadastrais e biometria inicial.",
      fieldKeys: ["full_name", "age", "weight", "height"],
    },
    {
      id: "goals-health",
      title: "Objetivo & Saúde",
      shortTitle: "Objetivo",
      description: "Seu foco principal e histórico de saúde relevante.",
      fieldKeys: ["goal", "health_limitation", "assessment_date"],
    },
    {
      id: "lower-body",
      title: "Membros Inferiores & Tronco",
      shortTitle: "Inferiores & Tronco",
      description: "Medidas corporais de membros inferiores e cintura (em cm).",
      fieldKeys: [
        "left_calf",
        "right_calf",
        "left_thigh_hip_line",
        "right_thigh_hip_line",
        "glutes_max",
        "waist",
      ],
    },
    {
      id: "upper-body",
      title: "Membros Superiores & Tórax",
      shortTitle: "Superiores & Tórax",
      description: "Medidas de tórax e braços relaxados/contraídos (em cm).",
      fieldKeys: [
        "chest",
        "left_biceps_relaxed",
        "left_biceps_contracted",
        "right_biceps_relaxed",
        "right_biceps_contracted",
      ],
    },
  ],
  fieldHints: {
    full_name: { placeholder: "Seu nome completo" },
    age: { placeholder: "Ex: 28", inputMode: "numeric" },
    weight: { placeholder: "Ex: 75.5 kg ou 75,5", helpText: "Informe em quilogramas (kg)." },
    height: { placeholder: "Ex: 178 cm ou 1.78 m", helpText: "Informe em centímetros ou metros." },
    goal: { placeholder: "Ex: Hipertrofia e melhora do condicionamento geral" },
    health_limitation: {
      placeholder: "Ex: Condromalácia patelar grau 1 no joelho esquerdo, ou 'Nenhuma'",
    },
    left_calf: { placeholder: "Ex: 38 cm", unit: "cm" },
    right_calf: { placeholder: "Ex: 38.5 cm", unit: "cm" },
    left_thigh_hip_line: { placeholder: "Ex: 58 cm", unit: "cm" },
    right_thigh_hip_line: { placeholder: "Ex: 58 cm", unit: "cm" },
    glutes_max: { placeholder: "Ex: 98 cm", unit: "cm" },
    waist: { placeholder: "Ex: 82 cm", unit: "cm" },
    chest: { placeholder: "Ex: 100 cm", unit: "cm" },
    left_biceps_relaxed: { placeholder: "Ex: 35 cm", unit: "cm" },
    left_biceps_contracted: { placeholder: "Ex: 38 cm", unit: "cm" },
    right_biceps_relaxed: { placeholder: "Ex: 35.5 cm", unit: "cm" },
    right_biceps_contracted: { placeholder: "Ex: 38.5 cm", unit: "cm" },
  },
};

// ============================================================================
// 2. COMPLETE ANAMNESIS UI CONFIG (45 fields, 8 steps)
// ============================================================================

export const COMPLETE_ANAMNESIS_UI_CONFIG: IntakeUIFormConfig = {
  formKey: "complete-anamnesis",
  version: "1.0",
  displayTitle: "Anamnese Completa",
  badgeLabel: "Histórico de Saúde & Estilo de Vida",
  introDescription:
    "Este questionário é confidencial e essencial para compreendermos sua saúde, rotina, preferências alimentares e metas.",
  steps: [
    {
      id: "identification",
      title: "Identificação & Contato",
      shortTitle: "Identificação",
      description: "Dados cadastrais e canais de contato direto.",
      fieldKeys: ["full_name", "birth_date", "age", "sex", "phone", "email"],
    },
    {
      id: "routine-initial",
      title: "Rotina & Informações Iniciais",
      shortTitle: "Rotina Inicial",
      description: "Ocupação profissional, localização e dados básicos.",
      fieldKeys: ["weight", "height", "profession", "city_state", "assessment_date"],
    },
    {
      id: "goals-health",
      title: "Objetivo & Histórico de Saúde",
      shortTitle: "Saúde & Queixas",
      description: "Objetivo principal, queixas digestivas e histórico clínico.",
      fieldKeys: [
        "main_goal",
        "health_complaints",
        "bowel_function",
        "health_problems",
        "nutritional_deficiency_history",
      ],
    },
    {
      id: "allergies-meds",
      title: "Alergias, Medicamentos & Tratamentos",
      shortTitle: "Tratamentos",
      description: "Alergias, intolerâncias alimentares, cirurgias e fármacos em uso.",
      fieldKeys: [
        "food_allergies",
        "food_intolerances",
        "continuous_medications",
        "health_treatment",
        "surgery_history",
      ],
    },
    {
      id: "sleep-lifestyle",
      title: "Sono & Hábitos de Vida",
      shortTitle: "Sono & Hábitos",
      description: "Qualidade do repouso, horários de vigília, álcool e tabagismo.",
      fieldKeys: [
        "sleep_quality",
        "sleep_hours_per_night",
        "wake_up_time",
        "bed_time",
        "alcohol_consumption_frequency",
        "smoking",
      ],
    },
    {
      id: "nutrition-habits",
      title: "Alimentação & Comportamento",
      shortTitle: "Alimentação",
      description: "Consumo hídrico, suplementação, frequência de refeições e preferências.",
      fieldKeys: [
        "daily_water_intake",
        "supplements_used",
        "meals_per_day",
        "preferred_foods",
        "disliked_foods",
        "binge_eating_complaints",
      ],
    },
    {
      id: "physical-lower",
      title: "Atividade Física & Membros Inferiores",
      shortTitle: "Treino & Inferiores",
      description: "Rotina de exercícios e medidas de pernas/glúteos (em cm).",
      fieldKeys: [
        "physical_activity_routine",
        "left_calf",
        "right_calf",
        "left_thigh_hip_line",
        "right_thigh_hip_line",
        "glutes_max",
      ],
    },
    {
      id: "body-upper",
      title: "Tronco & Membros Superiores",
      shortTitle: "Tronco & Braços",
      description: "Circunferência de cintura, tórax e braços (em cm).",
      fieldKeys: [
        "waist",
        "chest",
        "left_biceps_relaxed",
        "left_biceps_contracted",
        "right_biceps_relaxed",
        "right_biceps_contracted",
      ],
    },
  ],
  fieldHints: {
    full_name: { placeholder: "Seu nome completo" },
    age: { placeholder: "Ex: 30", inputMode: "numeric" },
    sex: { placeholder: "Ex: Masculino, Feminino..." },
    weight: { placeholder: "Ex: 80 kg", helpText: "Opcional" },
    height: { placeholder: "Ex: 1.75 m ou 175 cm" },
    phone: { placeholder: "Ex: (11) 99999-9999", inputMode: "tel" },
    email: { placeholder: "Ex: seuemail@exemplo.com", inputMode: "email" },
    profession: { placeholder: "Ex: Engenheiro de Software" },
    city_state: { placeholder: "Ex: São Paulo / SP" },
    health_problems: { placeholder: "Ex: Hipertensão leve, ou 'Não possuo'" },
    food_allergies: { placeholder: "Ex: Amendoim e frutos do mar, ou 'Nenhuma'" },
    food_intolerances: { placeholder: "Ex: Intolerância moderada a lactose, ou 'Nenhuma'" },
    health_treatment: { placeholder: "Ex: Fisioterapia para ombro, ou 'Nenhum'" },
    surgery_history: { placeholder: "Ex: Apendicectomia em 2018, ou 'Nenhuma'" },
    sleep_hours_per_night: { placeholder: "Ex: 7 a 8 horas" },
    nutritional_deficiency_history: {
      placeholder: "Ex: Deficiência de Vitamina D tratada em 2024, ou 'Não'",
    },
    daily_water_intake: { placeholder: "Ex: 2.5 a 3 litros" },
    supplements_used: { placeholder: "Ex: Creatina 5g, Whey Protein 30g, Omega 3, ou 'Nenhum'" },
    physical_activity_routine: {
      placeholder: "Ex: Musculação 5x por semana + 20 min cardio pós-treino",
    },
    meals_per_day: { placeholder: "Ex: 4 refeições (Café, Almoço, Lanche, Jantar)" },
    preferred_foods: {
      placeholder: "Ex: Frango grelhado, ovos, arroz branco, aveia, banana, açaí...",
    },
    disliked_foods: { placeholder: "Ex: Berinjela, fígado, quiabo (Opcional)" },
    binge_eating_complaints: {
      placeholder: "Ex: Costumo sentir vontade incontrolável de doces no período da noite, ou 'Não'",
    },
    left_calf: { placeholder: "Ex: 39 cm", unit: "cm" },
    right_calf: { placeholder: "Ex: 39 cm", unit: "cm" },
    left_thigh_hip_line: { placeholder: "Ex: 60 cm", unit: "cm" },
    right_thigh_hip_line: { placeholder: "Ex: 60 cm", unit: "cm" },
    glutes_max: { placeholder: "Ex: 102 cm", unit: "cm" },
    waist: { placeholder: "Ex: 85 cm", unit: "cm" },
    chest: { placeholder: "Ex: 104 cm", unit: "cm" },
    left_biceps_relaxed: { placeholder: "Ex: 36 cm", unit: "cm" },
    left_biceps_contracted: { placeholder: "Ex: 39 cm", unit: "cm" },
    right_biceps_relaxed: { placeholder: "Ex: 36.5 cm", unit: "cm" },
    right_biceps_contracted: { placeholder: "Ex: 39.5 cm", unit: "cm" },
  },
};

// ============================================================================
// UI REGISTRY
// ============================================================================

export const INTAKE_UI_CONFIG_REGISTRY: Record<string, IntakeUIFormConfig> = {
  "physical-assessment": PHYSICAL_ASSESSMENT_UI_CONFIG,
  "complete-anamnesis": COMPLETE_ANAMNESIS_UI_CONFIG,
};

export function getIntakeUIFormConfig(formKey: string): IntakeUIFormConfig | null {
  if (!formKey || typeof formKey !== "string") return null;
  return INTAKE_UI_CONFIG_REGISTRY[formKey.trim()] || null;
}

// ============================================================================
// INTEGRITY AUDIT FUNCTION (Guarantees zero field drifts between Schema & UI)
// ============================================================================

export interface UIConfigIntegrityReport {
  formKey: string;
  schemaFieldCount: number;
  uiFieldCount: number;
  missingFieldKeys: string[];
  unknownFieldKeys: string[];
  duplicateFieldKeys: string[];
  valid: boolean;
}

export function verifyFormUIIntegrity(
  schemaDef: IntakeFormDefinition,
  uiConfig: IntakeUIFormConfig
): UIConfigIntegrityReport {
  const schemaKeys = schemaDef.fields.map((f) => f.key);
  const schemaKeySet = new Set(schemaKeys);

  const seenInUI = new Set<string>();
  const duplicates: string[] = [];
  const unknown: string[] = [];

  const allUiKeys: string[] = [];

  for (const step of uiConfig.steps) {
    for (const k of step.fieldKeys) {
      allUiKeys.push(k);
      if (seenInUI.has(k)) {
        duplicates.push(k);
      }
      seenInUI.add(k);
      if (!schemaKeySet.has(k)) {
        unknown.push(k);
      }
    }
  }

  const missing = schemaKeys.filter((k) => !seenInUI.has(k));

  return {
    formKey: schemaDef.formKey,
    schemaFieldCount: schemaKeys.length,
    uiFieldCount: allUiKeys.length,
    missingFieldKeys: missing,
    unknownFieldKeys: unknown,
    duplicateFieldKeys: duplicates,
    valid:
      missing.length === 0 &&
      unknown.length === 0 &&
      duplicates.length === 0 &&
      schemaKeys.length === allUiKeys.length,
  };
}

export function verifyAllIntakeUIConfigs(): {
  valid: boolean;
  reports: Record<string, UIConfigIntegrityReport>;
} {
  const reports: Record<string, UIConfigIntegrityReport> = {};
  let valid = true;

  for (const [formKey, schemaDef] of Object.entries(INTAKE_FORMS_REGISTRY)) {
    const uiConfig = INTAKE_UI_CONFIG_REGISTRY[formKey];
    if (!uiConfig) {
      valid = false;
      continue;
    }
    const report = verifyFormUIIntegrity(schemaDef, uiConfig);
    reports[formKey] = report;
    if (!report.valid) {
      valid = false;
    }
  }

  return { valid, reports };
}
