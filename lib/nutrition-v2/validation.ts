/**
 * TREVO ONE — NUTRITION V2 VALIDATION SCHEMAS
 * Pure domain validation using Zod. No React, no DB queries, no side effects.
 */

import { z } from "zod";
import {
  ALL_NUTRITION_V2_FOOD_SCOPES,
  ALL_NUTRITION_V2_FOOD_STATUSES,
  ALL_NUTRITION_V2_PLAN_STATUSES,
  ALL_NUTRITION_V2_PLAN_VERSION_STATUSES,
  ALL_NUTRITION_V2_ASSIGNMENT_STATUSES,
  ALL_NUTRITION_V2_UNIT_CODES,
  type NutritionV2FoodScope,
  type NutritionV2FoodStatus,
  type NutritionV2PlanStatus,
  type NutritionV2PlanVersionStatus,
  type NutritionV2AssignmentStatus,
  type NutritionV2UnitCode,
} from "./types";

// ============================================================================
// ENUM & LITERAL SCHEMAS
// ============================================================================

export const nutritionV2FoodScopeSchema = z.enum(
  ALL_NUTRITION_V2_FOOD_SCOPES as [NutritionV2FoodScope, ...NutritionV2FoodScope[]]
);

export const nutritionV2FoodStatusSchema = z.enum(
  ALL_NUTRITION_V2_FOOD_STATUSES as [NutritionV2FoodStatus, ...NutritionV2FoodStatus[]]
);

export const nutritionV2PlanStatusSchema = z.enum(
  ALL_NUTRITION_V2_PLAN_STATUSES as [NutritionV2PlanStatus, ...NutritionV2PlanStatus[]]
);

export const nutritionV2PlanVersionStatusSchema = z.enum(
  ALL_NUTRITION_V2_PLAN_VERSION_STATUSES as [
    NutritionV2PlanVersionStatus,
    ...NutritionV2PlanVersionStatus[]
  ]
);

export const nutritionV2AssignmentStatusSchema = z.enum(
  ALL_NUTRITION_V2_ASSIGNMENT_STATUSES as [
    NutritionV2AssignmentStatus,
    ...NutritionV2AssignmentStatus[]
  ]
);

export const nutritionV2UnitCodeSchema = z.enum(
  ALL_NUTRITION_V2_UNIT_CODES as [NutritionV2UnitCode, ...NutritionV2UnitCode[]]
);

// ============================================================================
// SCOPE INVARIANT SCHEMAS
// ============================================================================

export const nutritionV2FoodScopeValidationSchema = z
  .object({
    scope: nutritionV2FoodScopeSchema,
    consultancyId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "GLOBAL") {
      if (val.consultancyId != null && val.consultancyId !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alimentos com escopo GLOBAL não devem ter consultoria vinculada.",
          path: ["consultancyId"],
        });
      }
    } else if (val.scope === "CONSULTANCY") {
      if (!val.consultancyId || val.consultancyId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alimentos com escopo CONSULTANCY exigem o identificador da consultoria.",
          path: ["consultancyId"],
        });
      }
    }
  });

// ============================================================================
// FOOD & PORTION INPUT SCHEMAS
// ============================================================================

export const nutritionV2FoodInputSchema = z
  .object({
    scope: nutritionV2FoodScopeSchema,
    consultancyId: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1, "Nome do alimento é obrigatório.").max(255),
    normalizedName: z.string().trim().max(255).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    referenceAmount: z
      .number()
      .positive("Quantidade de referência deve ser maior que zero.")
      .default(100),
    referenceUnitCode: nutritionV2UnitCodeSchema.default("G"),
    caloriesKcal: z
      .number()
      .min(0, "Calorias não podem ser negativas.")
      .max(10000)
      .nullable()
      .optional(),
    proteinG: z
      .number()
      .min(0, "Proteínas não podem ser negativas.")
      .max(1000)
      .nullable()
      .optional(),
    carbohydrateG: z
      .number()
      .min(0, "Carboidratos não podem ser negativos.")
      .max(1000)
      .nullable()
      .optional(),
    fatG: z
      .number()
      .min(0, "Gorduras não podem ser negativas.")
      .max(1000)
      .nullable()
      .optional(),
    status: nutritionV2FoodStatusSchema.default("ACTIVE"),
    sourceType: z.string().trim().max(50).default("MANUAL"),
    sourceKey: z.string().trim().max(100).nullable().optional(),
    sourceExternalCode: z.string().trim().max(100).nullable().optional(),
    sourceVersion: z.string().trim().max(50).nullable().optional(),
    sourceReference: z.string().trim().max(255).nullable().optional(),
    sourceUid: z.string().trim().max(255).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "GLOBAL") {
      if (val.consultancyId != null && val.consultancyId !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alimentos com escopo GLOBAL não devem ter consultoria vinculada.",
          path: ["consultancyId"],
        });
      }
    } else if (val.scope === "CONSULTANCY") {
      if (!val.consultancyId || val.consultancyId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alimentos com escopo CONSULTANCY exigem o identificador da consultoria.",
          path: ["consultancyId"],
        });
      }
    }
  });

export const nutritionV2FoodPortionInputSchema = z.object({
  foodPublicId: z.string().trim().min(1).optional(),
  foodId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1, "Rótulo da porção é obrigatório.").max(100),
  equivalentReferenceAmount: z
    .number()
    .positive("Quantidade equivalente deve ser maior que zero."),
  sortOrder: z.number().int().min(0).default(0),
  status: z.string().trim().default("ACTIVE"),
});

// ============================================================================
// ITEM SUBSTITUTION SCHEMA
// ============================================================================

export const nutritionV2ItemSubstitutionSchema = z.object({
  publicId: z.string().trim().min(1).optional(),
  foodId: z.string().trim().min(1).nullable().optional(),
  foodPublicId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  foodNameSnapshot: z
    .string()
    .trim()
    .min(1, "Nome do alimento substituto é obrigatório.")
    .max(255),
  prescribedQuantity: z
    .number()
    .positive("Quantidade prescrita deve ser maior que zero.")
    .nullable()
    .optional(),
  prescribedUnitCode: nutritionV2UnitCodeSchema.nullable().optional(),
  prescribedUnitLabel: z.string().trim().max(100).nullable().optional(),
  caloriesKcalSnapshot: z
    .number()
    .min(0, "Calorias não podem ser negativas.")
    .nullable()
    .optional(),
  proteinGSnapshot: z
    .number()
    .min(0, "Proteínas não podem ser negativas.")
    .nullable()
    .optional(),
  carbohydrateGSnapshot: z
    .number()
    .min(0, "Carboidratos não podem ser negativos.")
    .nullable()
    .optional(),
  fatGSnapshot: z
    .number()
    .min(0, "Gorduras não podem ser negativas.")
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

// ============================================================================
// MEAL ITEM SCHEMA
// ============================================================================

export const nutritionV2MealItemSchema = z.object({
  publicId: z.string().trim().min(1).optional(),
  foodId: z.string().trim().min(1).nullable().optional(),
  foodPublicId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  foodNameSnapshot: z
    .string()
    .trim()
    .min(1, "Nome do alimento é obrigatório.")
    .max(255),
  categorySnapshot: z.string().trim().max(100).nullable().optional(),
  prescribedQuantity: z
    .number()
    .positive("Quantidade prescrita deve ser maior que zero.")
    .nullable()
    .optional(),
  prescribedUnitCode: nutritionV2UnitCodeSchema.nullable().optional(),
  prescribedUnitLabel: z.string().trim().max(100).nullable().optional(),
  caloriesKcalSnapshot: z
    .number()
    .min(0, "Calorias não podem ser negativas.")
    .nullable()
    .optional(),
  proteinGSnapshot: z
    .number()
    .min(0, "Proteínas não podem ser negativas.")
    .nullable()
    .optional(),
  carbohydrateGSnapshot: z
    .number()
    .min(0, "Carboidratos não podem ser negativos.")
    .nullable()
    .optional(),
  fatGSnapshot: z
    .number()
    .min(0, "Gorduras não podem ser negativas.")
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  substitutions: z.array(nutritionV2ItemSubstitutionSchema).default([]),
});

// ============================================================================
// MEAL SCHEMA
// ============================================================================

export const nutritionV2MealSchema = z.object({
  publicId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Título da refeição é obrigatório.").max(255),
  scheduledTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Horário inválido (esperado HH:MM ou HH:MM:SS).")
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  items: z.array(nutritionV2MealItemSchema).default([]),
});

// ============================================================================
// PLAN ROOT & VERSION SCHEMAS
// ============================================================================

export const nutritionV2PlanRootInputSchema = z.object({
  consultancyId: z.string().trim().min(1, "Consultoria é obrigatória."),
  createdByMembershipId: z.string().trim().min(1, "Membro criador é obrigatório."),
  isTemplate: z.boolean().default(false),
  status: nutritionV2PlanStatusSchema.default("ACTIVE"),
});

export const nutritionV2PlanVersionMetadataSchema = z.object({
  versionNumber: z
    .number()
    .int("Número da versão deve ser um inteiro.")
    .min(1, "Número da versão deve ser maior ou igual a 1."),
  status: nutritionV2PlanVersionStatusSchema.default("DRAFT"),
  title: z.string().trim().min(1, "Título do plano é obrigatório.").max(255),
  subtitle: z.string().trim().max(255).nullable().optional(),
  objective: z.string().trim().max(100).nullable().optional(),
  generalGuidance: z.string().trim().max(10000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

/**
 * Nested plan version tree schema (generic draft layer).
 * Empty drafts with zero meals are fully allowed.
 */
export const nutritionV2PlanVersionTreeSchema = nutritionV2PlanVersionMetadataSchema.extend({
  publicId: z.string().trim().min(1).optional(),
  nutritionPlanId: z.string().trim().min(1).optional(),
  createdByMembershipId: z.string().trim().min(1).optional(),
  meals: z.array(nutritionV2MealSchema).default([]),
});

// ============================================================================
// ASSIGNMENT SCHEMA
// ============================================================================

export const nutritionV2AssignmentSchema = z
  .object({
    consultancyId: z.string().trim().min(1, "Consultoria é obrigatória."),
    studentMembershipId: z.string().trim().min(1, "Aluno é obrigatório."),
    nutritionPlanVersionId: z.string().trim().min(1, "Versão do plano é obrigatória."),
    assignedByMembershipId: z.string().trim().min(1, "Profissional responsável é obrigatório."),
    startsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data de início inválido (AAAA-MM-DD)."),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data de término inválido (AAAA-MM-DD).")
      .nullable()
      .optional(),
    status: nutritionV2AssignmentStatusSchema.default("ACTIVE"),
    notesForStudent: z.string().trim().max(3000).nullable().optional(),
  })
  .superRefine((assignment, ctx) => {
    if (assignment.endsOn && assignment.endsOn < assignment.startsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de término não pode ser anterior à data de início.",
        path: ["endsOn"],
      });
    }
  });

// ============================================================================
// TEMPLATES SCHEMAS (RELEASE G)
// ============================================================================

export const nutritionV2CreateTemplateFromPlanSchema = z.object({
  planPublicId: z.string().trim().min(1, 'Identificador do plano é obrigatório.'),
  versionPublicId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, 'Nome do modelo é obrigatório.').max(255, 'Nome do modelo não pode exceder 255 caracteres.'),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const nutritionV2RenameTemplateSchema = z.object({
  templatePublicId: z.string().trim().min(1, 'Identificador do modelo é obrigatório.'),
  name: z.string().trim().min(1, 'Nome do modelo é obrigatório.').max(255, 'Nome do modelo não pode exceder 255 caracteres.'),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const nutritionV2ArchiveTemplateSchema = z.object({
  templatePublicId: z.string().trim().min(1, 'Identificador do modelo é obrigatório.'),
});

export const nutritionV2CreatePlanFromTemplateSchema = z.object({
  templatePublicId: z.string().trim().min(1, 'Identificador do modelo é obrigatório.'),
  title: z.string().trim().min(1, 'Título do novo plano é obrigatório.').max(255).optional(),
});

export const nutritionV2ApplyTemplateToPatientSchema = z.object({
  templatePublicId: z.string().trim().min(1, 'Identificador do modelo é obrigatório.'),
  targetStudentMembershipPublicId: z.string().trim().min(1, 'Identificador do aluno é obrigatório.'),
  title: z.string().trim().max(255).optional(),
  replaceExistingDraft: z.boolean().optional(),
});

export const nutritionV2CopyPatientPlanToStudentSchema = z.object({
  sourcePlanPublicId: z.string().trim().min(1, 'Identificador do plano de origem é obrigatório.'),
  sourceVersionPublicId: z.string().trim().min(1).optional(),
  targetStudentMembershipPublicId: z.string().trim().min(1, 'Identificador do aluno de destino é obrigatório.'),
  replaceExistingDraft: z.boolean().optional(),
  allowDraftSource: z.boolean().optional(),
  title: z.string().trim().max(255).optional(),
});

export const nutritionV2DuplicateTemplateSchema = z.object({
  templatePublicId: z.string().trim().min(1, 'Identificador do modelo é obrigatório.'),
});

// ============================================================================
// PUBLICATION GATE VALIDATION (P0.2)
// ============================================================================

export interface PendingPublicationItem {
  mealPublicId: string;
  mealTitle: string;
  itemPublicId: string;
  foodName: string;
  reason: "UNLINKED" | "UNRESOLVED_PORTION" | "UNKNOWN_NUTRITION" | "INVALID_QUANTITY";
  reasonLabel: string;
}

export interface PublishValidationResult {
  valid: boolean;
  errors: string[];
  pendingItems: PendingPublicationItem[];
}

const VALID_PUBLICATION_UNIT_CODES_SET = new Set([
  "G",
  "KG",
  "ML",
  "L",
  "UNIDADE",
  "FATIA",
  "COLHER_SOPA",
  "COLHER_CHA",
  "XICARA",
  "COPO",
  "SCOOP",
  "PORCAO",
]);

/**
 * Validates a plan version tree for publication according to P0.2 publication gate rules.
 * Pure domain logic safe for both client and server runtime.
 */
export function validatePlanTreeForPublication(tree: {
  version: { title: string };
  meals: Array<{
    publicId: string;
    title: string;
    items: Array<{
      publicId: string;
      foodId?: string | number | null;
      foodNameSnapshot?: string | null;
      prescribedQuantity?: number | null;
      prescribedUnitCode?: string | null;
      caloriesKcalSnapshot?: number | null;
      substitutions?: Array<{
        publicId?: string;
        foodId?: string | number | null;
        foodNameSnapshot?: string | null;
        prescribedQuantity?: number | null;
        prescribedUnitCode?: string | null;
      }>;
    }>;
  }>;
}): PublishValidationResult {
  const errors: string[] = [];
  const pendingItems: PendingPublicationItem[] = [];

  // 1. Version title non-empty
  if (!tree.version.title || !tree.version.title.trim()) {
    errors.push("O título do plano é obrigatório.");
  }

  // 2. Meal count >= 1
  if (!tree.meals || tree.meals.length === 0) {
    errors.push("Adicione pelo menos uma refeição antes de publicar o plano.");
    return { valid: false, errors, pendingItems: [] };
  }

  // 3. Inspect each meal
  for (let mIdx = 0; mIdx < tree.meals.length; mIdx++) {
    const meal = tree.meals[mIdx];
    const mealLabel = meal.title ? `"${meal.title}"` : `Refeição ${mIdx + 1}`;

    if (!meal.title || !meal.title.trim()) {
      errors.push(`O título da refeição ${mIdx + 1} é obrigatório.`);
    }

    if (!meal.items || meal.items.length === 0) {
      errors.push(`Adicione pelo menos um alimento à refeição ${mealLabel}.`);
    }

    // Inspect items
    for (let iIdx = 0; iIdx < (meal.items || []).length; iIdx++) {
      const item = meal.items[iIdx];
      const itemLabel = item.foodNameSnapshot
        ? `"${item.foodNameSnapshot}" (${mealLabel})`
        : `Item ${iIdx + 1} (${mealLabel})`;

      if (!item.foodNameSnapshot || !item.foodNameSnapshot.trim()) {
        errors.push(`O item ${iIdx + 1} da refeição ${mealLabel} está sem o nome do alimento.`);
      }

      // Quantity validation: must be > 0
      if (item.prescribedQuantity == null || item.prescribedQuantity <= 0) {
        errors.push(`A quantidade do item ${itemLabel} deve ser maior que zero.`);
        pendingItems.push({
          mealPublicId: meal.publicId,
          mealTitle: meal.title,
          itemPublicId: item.publicId,
          foodName: item.foodNameSnapshot || `Item ${iIdx + 1}`,
          reason: "INVALID_QUANTITY",
          reasonLabel: "Quantidade inválida (deve ser maior que zero)",
        });
      }

      if (
        item.prescribedUnitCode &&
        !VALID_PUBLICATION_UNIT_CODES_SET.has(item.prescribedUnitCode.trim().toUpperCase())
      ) {
        errors.push(`A unidade "${item.prescribedUnitCode}" do item ${itemLabel} é inválida.`);
      }

      // Publication Gate: Food linking & nutrition resolution
      if (item.foodId == null) {
        pendingItems.push({
          mealPublicId: meal.publicId,
          mealTitle: meal.title,
          itemPublicId: item.publicId,
          foodName: item.foodNameSnapshot || `Item ${iIdx + 1}`,
          reason: "UNLINKED",
          reasonLabel: "Sem vínculo nutricional",
        });
      } else if (item.caloriesKcalSnapshot == null) {
        // Unknown nutrition vs unresolved portion (KNOWN ZERO is caloriesKcalSnapshot === 0, which is valid!)
        const isPortion =
          item.prescribedUnitCode === "PORCAO" ||
          (item.prescribedUnitCode &&
            !["G", "KG", "ML", "L"].includes(item.prescribedUnitCode.trim().toUpperCase()));
        pendingItems.push({
          mealPublicId: meal.publicId,
          mealTitle: meal.title,
          itemPublicId: item.publicId,
          foodName: item.foodNameSnapshot || `Item ${iIdx + 1}`,
          reason: isPortion ? "UNRESOLVED_PORTION" : "UNKNOWN_NUTRITION",
          reasonLabel: isPortion
            ? "Medida sem conversão nutricional"
            : "Informações nutricionais desconhecidas",
        });
      }

      // Inspect substitutions
      if (item.substitutions && item.substitutions.length > 0) {
        for (let sIdx = 0; sIdx < item.substitutions.length; sIdx++) {
          const sub = item.substitutions[sIdx];
          const subLabel = sub.foodNameSnapshot
            ? `"${sub.foodNameSnapshot}" (substituição do item ${itemLabel})`
            : `Substituição ${sIdx + 1} (${itemLabel})`;

          if (!sub.foodNameSnapshot || !sub.foodNameSnapshot.trim()) {
            errors.push(`A substituição ${sIdx + 1} do item ${itemLabel} está sem nome.`);
          }

          if (sub.prescribedQuantity != null && sub.prescribedQuantity <= 0) {
            errors.push(`A quantidade da substituição ${subLabel} deve ser maior que zero.`);
          }

          if (
            sub.prescribedUnitCode &&
            !VALID_PUBLICATION_UNIT_CODES_SET.has(sub.prescribedUnitCode.trim().toUpperCase())
          ) {
            errors.push(`A unidade "${sub.prescribedUnitCode}" da substituição ${subLabel} é inválida.`);
          }
        }
      }
    }
  }

  if (pendingItems.length > 0) {
    errors.push(
      `Existem ${pendingItems.length} alimento(s) que ainda não possuem informações suficientes para cálculo nutricional.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    pendingItems,
  };
}


