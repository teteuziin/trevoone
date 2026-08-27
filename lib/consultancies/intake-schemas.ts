/**
 * Native Student Intake Form Definitions & Validation Schemas
 * Source of truth for V1.0 Intake Forms (Physical Assessment & Complete Anamnesis)
 */

export type IntakeFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "DATE"
  | "TIME"
  | "SINGLE_CHOICE";

export type IntakeFieldCategory =
  | "IDENTIFICATION"
  | "CONTACT"
  | "BODY"
  | "TRAINING"
  | "NUTRITION"
  | "ROUTINE"
  | "GOALS"
  | "HEALTH"
  | "MEDICATION"
  | "INJURIES"
  | "ALLERGIES"
  | "FOOD"
  | "LIFESTYLE"
  | "OTHER";

export interface IntakeFieldDefinition {
  key: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  category: IntakeFieldCategory;
  options?: readonly string[];
  maxLength?: number;
  description?: string;
}

export interface IntakeFormDefinition {
  formKey: string;
  version: string;
  title: string;
  description: string;
  fields: readonly IntakeFieldDefinition[];
}

// ============================================================================
// FORM 1: AVALIAÇÃO FÍSICA (physical-assessment) V1.0
// 18 Fields (17 Required, 1 Optional)
// ============================================================================

export const PHYSICAL_ASSESSMENT_FORM_V1: IntakeFormDefinition = {
  formKey: "physical-assessment",
  version: "1.0",
  title: "Avaliação física, Saiya Shape",
  description: "Formulário de avaliação física detalhada.",
  fields: [
    {
      key: "full_name",
      label: "Nome completo",
      type: "SHORT_TEXT",
      required: true,
      category: "IDENTIFICATION",
      maxLength: 150,
    },
    {
      key: "age",
      label: "Idade",
      type: "SHORT_TEXT",
      required: false,
      category: "BODY",
      maxLength: 10,
    },
    {
      key: "weight",
      label: "Peso",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 20,
    },
    {
      key: "height",
      label: "Altura",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 20,
    },
    {
      key: "goal",
      label: "Objetivo",
      type: "SHORT_TEXT",
      required: true,
      category: "GOALS",
      maxLength: 255,
    },
    {
      key: "health_limitation",
      label: "Limitação/patologia",
      type: "SHORT_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 255,
    },
    {
      key: "assessment_date",
      label: "Data da avaliação",
      type: "DATE",
      required: true,
      category: "OTHER",
    },
    {
      key: "left_calf",
      label: "Panturrilha - Esquerda",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_calf",
      label: "Panturrilha - Direita",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_thigh_hip_line",
      label: "Coxa linha do quadril - Esquerda",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_thigh_hip_line",
      label: "Coxa linha do quadril - Direita",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "glutes_max",
      label: "Glúteos máximo",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "waist",
      label: "Cintura",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "chest",
      label: "Tórax",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_biceps_relaxed",
      label: "Bíceps esquerdo: Relaxado",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_biceps_contracted",
      label: "Bíceps esquerdo: Contraído",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_biceps_relaxed",
      label: "Bíceps direito: Relaxado",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_biceps_contracted",
      label: "Bíceps direito: Contraído",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
  ],
};

// ============================================================================
// FORM 2: ANAMNESE COMPLETA (complete-anamnesis) V1.0
// 45 Fields (41 Required, 4 Optional)
// ============================================================================

export const COMPLETE_ANAMNESIS_FORM_V1: IntakeFormDefinition = {
  formKey: "complete-anamnesis",
  version: "1.0",
  title: "Anamnese Completa Saiya Shape",
  description: "Formulário de avaliação de anamnese completa.",
  fields: [
    {
      key: "full_name",
      label: "Nome completo",
      type: "SHORT_TEXT",
      required: true,
      category: "IDENTIFICATION",
      maxLength: 150,
    },
    {
      key: "birth_date",
      label: "Data de nascimento",
      type: "DATE",
      required: true,
      category: "IDENTIFICATION",
    },
    {
      key: "age",
      label: "Idade",
      type: "SHORT_TEXT",
      required: true,
      category: "IDENTIFICATION",
      maxLength: 10,
    },
    {
      key: "sex",
      label: "Sexo",
      type: "SHORT_TEXT",
      required: true,
      category: "IDENTIFICATION",
      maxLength: 30,
    },
    {
      key: "weight",
      label: "Peso:",
      type: "SHORT_TEXT",
      required: false,
      category: "BODY",
      maxLength: 20,
    },
    {
      key: "height",
      label: "Altura:",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 20,
    },
    {
      key: "phone",
      label: "Telefone",
      type: "SHORT_TEXT",
      required: true,
      category: "CONTACT",
      maxLength: 30,
    },
    {
      key: "email",
      label: "E-mail",
      type: "SHORT_TEXT",
      required: true,
      category: "CONTACT",
      maxLength: 254,
    },
    {
      key: "profession",
      label: "Profissão",
      type: "SHORT_TEXT",
      required: true,
      category: "ROUTINE",
      maxLength: 150,
    },
    {
      key: "city_state",
      label: "Cidade/Estado",
      type: "SHORT_TEXT",
      required: true,
      category: "CONTACT",
      maxLength: 150,
    },
    {
      key: "assessment_date",
      label: "Data da avaliação",
      type: "DATE",
      required: true,
      category: "OTHER",
    },
    {
      key: "main_goal",
      label: "Qual seu principal objetivo atualmente?",
      type: "SINGLE_CHOICE",
      required: true,
      category: "GOALS",
      options: [
        "Emagrecimento",
        "Hipertrofia muscular",
        "Definição muscular",
        "Ganho de peso",
        "Performance esportiva",
        "Reeducação alimentar",
        "Saúde/qualidade de vida",
        "Outro",
      ],
    },
    {
      key: "health_complaints",
      label: "Possui alguma queixa associada a:",
      type: "SINGLE_CHOICE",
      required: false,
      category: "HEALTH",
      options: [
        "Estufamento",
        "Desconforto gastrointestinal",
        "Insonia",
        "Ansiedade",
        "Baixa Libido",
        "Queda de Cabelo",
        "Unhas quebradiças",
        "Baixa disposição",
      ],
    },
    {
      key: "bowel_function",
      label: "Função Intestinal:",
      type: "SINGLE_CHOICE",
      required: true,
      category: "HEALTH",
      options: ["Normal", "Constipação", "Irregular", "Diarreia"],
    },
    {
      key: "health_problems",
      label: "Possui problemas de saude? Se sim, qual?",
      type: "SHORT_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 500,
    },
    {
      key: "food_allergies",
      label: "Possui alergia alimentar?",
      type: "SHORT_TEXT",
      required: true,
      category: "ALLERGIES",
      maxLength: 500,
    },
    {
      key: "food_intolerances",
      label: "Possui intolerância alimentar?",
      type: "SHORT_TEXT",
      required: true,
      category: "ALLERGIES",
      maxLength: 500,
    },
    {
      key: "continuous_medications",
      label: "Usa medicamentos contínuos?",
      type: "SINGLE_CHOICE",
      required: true,
      category: "MEDICATION",
      options: ["Não", "Sim"],
    },
    {
      key: "health_treatment",
      label: "Está em tratamento de saude? Se sim, qual?",
      type: "SHORT_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 500,
    },
    {
      key: "surgery_history",
      label: "Ja realizou algum tipo de cirurgia? Se sim, qual?",
      type: "SHORT_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 500,
    },
    {
      key: "sleep_quality",
      label: "Qualidade do sono",
      type: "SINGLE_CHOICE",
      required: true,
      category: "ROUTINE",
      options: ["Péssima", "Ruim", "Regular", "Boa", "Excelente"],
    },
    {
      key: "sleep_hours_per_night",
      label: "Horas por noite",
      type: "SHORT_TEXT",
      required: true,
      category: "ROUTINE",
      maxLength: 50,
    },
    {
      key: "nutritional_deficiency_history",
      label: "Possui historico de deficiencia nutricional?",
      type: "SHORT_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 500,
    },
    {
      key: "alcohol_consumption_frequency",
      label: "Frequência de consumo de álcool",
      type: "SINGLE_CHOICE",
      required: true,
      category: "LIFESTYLE",
      options: ["Nunca", "Raramente", "Finais de semana", "Frequente"],
    },
    {
      key: "smoking",
      label: "Fuma?",
      type: "SINGLE_CHOICE",
      required: true,
      category: "LIFESTYLE",
      options: ["Não", "Sim"],
    },
    {
      key: "daily_water_intake",
      label: "Consumo diário de água",
      type: "SHORT_TEXT",
      required: true,
      category: "NUTRITION",
      maxLength: 50,
    },
    {
      key: "supplements_used",
      label: "Suplementos utilizados",
      type: "LONG_TEXT",
      required: false,
      category: "NUTRITION",
      maxLength: 2000,
    },
    {
      key: "wake_up_time",
      label: "Horário que acorda",
      type: "TIME",
      required: true,
      category: "ROUTINE",
    },
    {
      key: "bed_time",
      label: "Horário que dorme",
      type: "TIME",
      required: true,
      category: "ROUTINE",
    },
    {
      key: "physical_activity_routine",
      label: "Pratica atividade física? Se sim, qual? E a frequencia.",
      type: "SHORT_TEXT",
      required: true,
      category: "TRAINING",
      maxLength: 500,
    },
    {
      key: "meals_per_day",
      label: "Dentro da sua rotina habitual, quantas refeiçoes voce consegue fazer?",
      type: "SHORT_TEXT",
      required: true,
      category: "NUTRITION",
      maxLength: 100,
    },
    {
      key: "preferred_foods",
      label: "Descreva aqui seus alimentos preferidos:",
      type: "LONG_TEXT",
      required: true,
      category: "FOOD",
      maxLength: 2000,
    },
    {
      key: "disliked_foods",
      label: "Alimentos que não gosta?",
      type: "LONG_TEXT",
      required: false,
      category: "FOOD",
      maxLength: 2000,
    },
    {
      key: "binge_eating_complaints",
      label: "Possui queixas associadas a compulsão alimentar?",
      type: "LONG_TEXT",
      required: true,
      category: "HEALTH",
      maxLength: 2000,
    },
    {
      key: "left_calf",
      label: "Panturrilha Esquerda",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_calf",
      label: "Panturrilha Direita",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_thigh_hip_line",
      label: "Coxa linha do quadril Esquerda",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_thigh_hip_line",
      label: "Coxa linha do quadril Direita",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "glutes_max",
      label: "Glúteos máximo",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "waist",
      label: "Cintura",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "chest",
      label: "Tórax",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_biceps_relaxed",
      label: "Bíceps esquerdo Relaxado",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "left_biceps_contracted",
      label: "Bíceps esquerdo Contraído",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_biceps_relaxed",
      label: "Bíceps direito Relaxado",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
    {
      key: "right_biceps_contracted",
      label: "Bíceps direito Contraído",
      type: "SHORT_TEXT",
      required: true,
      category: "BODY",
      maxLength: 30,
    },
  ],
};

// ============================================================================
// REGISTRY
// ============================================================================

export const INTAKE_FORMS_REGISTRY: Record<string, IntakeFormDefinition> = {
  "physical-assessment": PHYSICAL_ASSESSMENT_FORM_V1,
  "complete-anamnesis": COMPLETE_ANAMNESIS_FORM_V1,
};

export function getIntakeFormDefinition(formKey: string): IntakeFormDefinition | null {
  if (!formKey || typeof formKey !== "string") return null;
  return INTAKE_FORMS_REGISTRY[formKey.trim()] || null;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SERIALIZED_JSON_BYTES = 64 * 1024; // 64 KiB

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

function isValidTime(timeStr: string): boolean {
  return TIME_REGEX.test(timeStr);
}

/**
 * Validates a single field value against its definition.
 */
function validateFieldValue(
  field: IntakeFieldDefinition,
  val: unknown
): string | null {
  if (val === undefined || val === null || val === "") {
    return null; // Empty check handled by caller based on draft/submit
  }

  if (typeof val !== "string") {
    return "Valor inválido.";
  }

  const str = val.trim();

  // Max length check
  const maxLen = field.maxLength || (field.type === "LONG_TEXT" ? 2000 : 255);
  if (str.length > maxLen) {
    return `Tamanho máximo excedido (${maxLen} caracteres).`;
  }

  switch (field.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT":
      if (field.key === "email" && !EMAIL_REGEX.test(str)) {
        return "E-mail inválido.";
      }
      return null;

    case "DATE":
      if (!isValidDate(str)) {
        return "Data inválida (formato esperado: AAAA-MM-DD).";
      }
      return null;

    case "TIME":
      if (!isValidTime(str)) {
        return "Horário inválido (formato esperado: HH:MM).";
      }
      return null;

    case "SINGLE_CHOICE":
      if (!field.options || !field.options.includes(str)) {
        return "Opção selecionada inválida.";
      }
      return null;

    default:
      return "Tipo de campo não suportado.";
  }
}

/**
 * Validates responses for a DRAFT save.
 * Permits partial/missing required fields, but enforces valid types, values, options, and limits for any provided field.
 */
export function validateIntakeDraftResponses(
  form: IntakeFormDefinition,
  responses: Record<string, unknown>
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
    return { valid: false, errors: { _general: "Payload de respostas inválido." } };
  }

  // Check serialized size
  try {
    const serialized = JSON.stringify(responses);
    if (Buffer.byteLength(serialized, "utf8") > MAX_SERIALIZED_JSON_BYTES) {
      return { valid: false, errors: { _general: "Tamanho máximo das respostas excedido (64 KB)." } };
    }
  } catch {
    return { valid: false, errors: { _general: "Falha ao serializar respostas." } };
  }

  const fieldMap = new Map(form.fields.map((f) => [f.key, f]));

  // Ensure no unknown keys
  for (const [k, v] of Object.entries(responses)) {
    // Skip prototype / inherited properties
    if (!Object.prototype.hasOwnProperty.call(responses, k)) continue;

    const field = fieldMap.get(k);
    if (!field) {
      errors[k] = `Campo desconhecido '${k}'.`;
      continue;
    }

    const fieldError = validateFieldValue(field, v);
    if (fieldError) {
      errors[k] = fieldError;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates responses for FINAL SUBMISSION.
 * Requires ALL required fields to be present, non-empty, and valid.
 */
export function validateIntakeSubmitResponses(
  form: IntakeFormDefinition,
  responses: Record<string, unknown>
): ValidationResult {
  // First run draft checks for format and key validity
  const draftResult = validateIntakeDraftResponses(form, responses);
  const errors: Record<string, string> = { ...draftResult.errors };

  // Then check that all required fields are present and non-empty
  for (const field of form.fields) {
    if (field.required) {
      const val = responses[field.key];
      if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
        errors[field.key] = `O campo '${field.label}' é obrigatório.`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
