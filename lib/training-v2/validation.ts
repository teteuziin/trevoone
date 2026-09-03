/**
 * TREVO ONE — TRAINING V2 VALIDATION SCHEMAS
 * Pure domain validation using Zod. No React, no DB queries, no side effects.
 */

import { z } from "zod";
import {
  ALL_WORKOUT_BLOCK_TYPES,
  type WorkoutBlockType,
} from "./types";

// ============================================================================
// PRIMITIVE & ENUM SCHEMAS
// ============================================================================

export const exerciseScopeSchema = z.enum(["GLOBAL", "CONSULTANCY"]);
export const exerciseVisibilitySchema = z.enum(["GLOBAL", "CREATOR_ONLY", "CONSULTANCY"]);
export const exerciseStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const mediaScopeSchema = z.enum(["GLOBAL", "CONSULTANCY"]);
export const mediaVisibilitySchema = z.enum(["GLOBAL", "CREATOR_ONLY", "CONSULTANCY"]);
export const mediaTypeSchema = z.enum(["VIDEO", "IMAGE"]);
export const mediaRoleSchema = z.enum([
  "EXECUTION_VIDEO",
  "START_IMAGE",
  "VIDEO_POSTER",
  "ALTERNATE_VIDEO",
  "ALTERNATE_IMAGE",
]);
export const storageProviderSchema = z.enum(["HOSTINGER_LOCAL", "CLOUDFLARE_R2"]);

export const workoutStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export const workoutVersionStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const workoutBlockTypeSchema = z.enum(ALL_WORKOUT_BLOCK_TYPES as [WorkoutBlockType, ...WorkoutBlockType[]]);
export const prescriptionModeSchema = z.enum(["SETS", "TIME", "DISTANCE", "INTERVALS"]);
export const workoutSetTypeSchema = z.enum([
  "WARMUP",
  "FEEDER",
  "NORMAL",
  "DROP_STAGE",
  "REST_PAUSE_MINI",
  "FAILURE",
]);
export const workoutAssignmentStatusSchema = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);
export const heartRateZoneSchema = z.enum(["Z1", "Z2", "Z3", "Z4", "Z5"]);

// ============================================================================
// SCOPE & VISIBILITY CONSISTENCY RULES
// ============================================================================

export const exerciseScopeVisibilitySchema = z
  .object({
    scope: exerciseScopeSchema,
    visibility: exerciseVisibilitySchema,
    consultancyId: z.string().trim().min(1).nullable().optional(),
    createdByMembershipId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "GLOBAL") {
      if (val.visibility !== "GLOBAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exercícios com escopo GLOBAL devem ter visibilidade GLOBAL.",
          path: ["visibility"],
        });
      }
      if (val.consultancyId != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exercícios com escopo GLOBAL não devem ter consultoria vinculada.",
          path: ["consultancyId"],
        });
      }
    } else if (val.scope === "CONSULTANCY") {
      if (val.visibility === "GLOBAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exercícios com escopo CONSULTANCY não podem ter visibilidade GLOBAL.",
          path: ["visibility"],
        });
      }
      if (!val.consultancyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exercícios com escopo CONSULTANCY exigem o identificador da consultoria.",
          path: ["consultancyId"],
        });
      }
    }
  });

export const mediaScopeVisibilitySchema = z
  .object({
    scope: mediaScopeSchema,
    visibility: mediaVisibilitySchema,
    consultancyId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "GLOBAL") {
      if (val.visibility !== "GLOBAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mídias com escopo GLOBAL devem ter visibilidade GLOBAL.",
          path: ["visibility"],
        });
      }
      if (val.consultancyId != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mídias com escopo GLOBAL não devem ter consultoria vinculada.",
          path: ["consultancyId"],
        });
      }
    } else if (val.scope === "CONSULTANCY") {
      if (val.visibility === "GLOBAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mídias com escopo CONSULTANCY não podem ter visibilidade GLOBAL.",
          path: ["visibility"],
        });
      }
      if (!val.consultancyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mídias com escopo CONSULTANCY exigem o identificador da consultoria.",
          path: ["consultancyId"],
        });
      }
    }
  });

// ============================================================================
// METHOD CONFIG SCHEMAS (BOUNDED JSON)
// ============================================================================

export const cardioMethodConfigSchema = z
  .object({
    speedKmh: z.number().positive("Velocidade deve ser maior que zero.").max(100).nullable().optional(),
    paceSecondsPerKm: z.number().int().positive("Pace deve ser positivo.").max(7200).nullable().optional(),
    inclinePercent: z.number().min(-15).max(45).nullable().optional(),
    heartRateZone: heartRateZoneSchema.nullable().optional(),
    intensityLabel: z.string().trim().max(50).nullable().optional(),
  })
  .strict();

export const restPauseMethodConfigSchema = z
  .object({
    intraPauseSeconds: z.number().int().min(1).max(120).nullable().optional(),
    targetTotalReps: z.number().int().min(1).max(200).nullable().optional(),
  })
  .strict();

export const warmupMethodConfigSchema = z
  .object({
    focus: z.string().trim().max(100).nullable().optional(),
    targetJoint: z.string().trim().max(100).nullable().optional(),
  })
  .strict();

// ============================================================================
// WORKOUT SETS SCHEMA
// ============================================================================

export const workoutItemSetSchema = z
  .object({
    setNumber: z.number().int().min(1, "O número da série deve ser maior ou igual a 1."),
    setType: workoutSetTypeSchema,
    parentSetNumber: z.number().int().min(1).nullable().optional(),
    targetReps: z.number().int().min(0, "Repetições não podem ser negativas.").max(500).nullable().optional(),
    targetRepsMax: z.number().int().min(0, "Repetições máximas não podem ser negativas.").max(500).nullable().optional(),
    targetLoadKg: z.number().min(0, "Carga não pode ser negativa.").max(2000).nullable().optional(),
    targetDurationSeconds: z.number().int().positive("Duração deve ser maior que zero.").max(86400).nullable().optional(),
    targetDistanceMeters: z.number().int().positive("Distância deve ser maior que zero.").max(500000).nullable().optional(),
    targetRestSeconds: z.number().int().min(0, "Descanso não pode ser negativo.").max(3600).nullable().optional(),
    intensityIndicator: z.string().trim().max(50).nullable().optional(),
  })
  .superRefine((set, ctx) => {
    if (set.targetReps != null && set.targetRepsMax != null) {
      if (set.targetRepsMax < set.targetReps) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A faixa máxima de repetições deve ser maior ou igual à mínima.",
          path: ["targetRepsMax"],
        });
      }
    }
    if (set.setType === "DROP_STAGE" || set.setType === "REST_PAUSE_MINI") {
      if (set.parentSetNumber == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Séries do tipo ${set.setType} devem referenciar uma série pai (parentSetNumber).`,
          path: ["parentSetNumber"],
        });
      }
    }
  });

// ============================================================================
// WORKOUT BLOCK ITEM SCHEMA
// ============================================================================

export const workoutBlockItemSchema = z.object({
  exercisePublicId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.number().int().min(0),
  exerciseNameSnapshot: z.string().trim().min(1, "Nome do exercício é obrigatório.").max(255),
  muscleGroupSnapshot: z.string().trim().max(100).nullable().optional(),
  equipmentSnapshot: z.string().trim().max(100).nullable().optional(),
  instructionsSnapshot: z.string().trim().max(5000).nullable().optional(),
  prescriptionMode: prescriptionModeSchema.default("SETS"),
  targetCadence: z.string().trim().max(20).nullable().optional(),
  targetRpe: z.number().min(1.0).max(10.0).nullable().optional(),
  targetRir: z.number().int().min(0).max(10).nullable().optional(),
  methodConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  customVideoUrl: z.string().url("URL de vídeo inválida.").max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  sets: z.array(workoutItemSetSchema).default([]),
});

// ============================================================================
// 11 MANDATORY WORKOUT BLOCK TYPES VALIDATION
// ============================================================================

export const workoutBlockSchema = z
  .object({
    blockType: workoutBlockTypeSchema,
    title: z.string().trim().max(255).nullable().optional(),
    sortOrder: z.number().int().min(0),
    rounds: z.number().int().min(1, "O número de voltas deve ser no mínimo 1.").max(50).nullable().optional(),
    restBetweenItemsSeconds: z.number().int().min(0).max(3600).nullable().optional(),
    restBetweenRoundsSeconds: z.number().int().min(0).max(3600).nullable().optional(),
    restAfterBlockSeconds: z.number().int().min(0).max(3600).nullable().optional(),
    instructions: z.string().trim().max(2000).nullable().optional(),
    items: z.array(workoutBlockItemSchema).min(1, "O bloco deve conter ao menos 1 exercício."),
  })
  .superRefine((block, ctx) => {
    const count = block.items.length;

    switch (block.blockType) {
      case "SINGLE": {
        if (count !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo SINGLE deve conter exatamente 1 exercício (recebeu ${count}).`,
            path: ["items"],
          });
        }
        break;
      }

      case "BI_SET": {
        if (count !== 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo BI_SET deve conter exatamente 2 exercícios (recebeu ${count}).`,
            path: ["items"],
          });
        }
        break;
      }

      case "TRI_SET": {
        if (count !== 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo TRI_SET deve conter exatamente 3 exercícios (recebeu ${count}).`,
            path: ["items"],
          });
        }
        break;
      }

      case "SUPER_SET": {
        if (count !== 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo SUPER_SET deve conter exatamente 2 exercícios (recebeu ${count}).`,
            path: ["items"],
          });
        }
        // NOTE: No anatomical/muscle pairing validation. The professional selects the methodology.
        break;
      }

      case "CIRCUIT": {
        if (count < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo CIRCUIT deve conter ao menos 2 exercícios (recebeu ${count}).`,
            path: ["items"],
          });
        }
        if (block.rounds != null && block.rounds < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O número de voltas do circuito deve ser maior que zero.",
            path: ["rounds"],
          });
        }
        break;
      }

      case "DROP_SET": {
        if (count !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo DROP_SET deve conter exatamente 1 exercício principal (recebeu ${count}).`,
            path: ["items"],
          });
        } else {
          const item = block.items[0];
          const hasDropStage = item.sets.some((s) => s.setType === "DROP_STAGE");
          if (!hasDropStage) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Bloco DROP_SET deve conter ao menos uma série do tipo DROP_STAGE.",
              path: ["items", 0, "sets"],
            });
          }
        }
        break;
      }

      case "REST_PAUSE": {
        if (count !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo REST_PAUSE deve conter exatamente 1 exercício (recebeu ${count}).`,
            path: ["items"],
          });
        } else {
          const item = block.items[0];
          const hasMiniSet = item.sets.some((s) => s.setType === "REST_PAUSE_MINI");
          if (!hasMiniSet) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Bloco REST_PAUSE deve conter ao menos uma mini-série do tipo REST_PAUSE_MINI.",
              path: ["items", 0, "sets"],
            });
          }
        }
        break;
      }

      case "COMBINED_SET": {
        if (count < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo COMBINED_SET deve conter ao menos 2 exercícios combinados (recebeu ${count}).`,
            path: ["items"],
          });
        }
        break;
      }

      case "WARMUP": {
        if (count < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Bloco de WARMUP deve conter ao menos 1 exercício.",
            path: ["items"],
          });
        }
        break;
      }

      case "CARDIO": {
        if (count !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Bloco do tipo CARDIO deve conter exatamente 1 exercício (recebeu ${count}).`,
            path: ["items"],
          });
        } else {
          const item = block.items[0];
          // Validate methodConfig if present
          if (item.methodConfig) {
            const parsed = cardioMethodConfigSchema.safeParse(item.methodConfig);
            if (!parsed.success) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Configuração de CARDIO inválida: " + parsed.error.issues.map((i) => i.message).join(", "),
                path: ["items", 0, "methodConfig"],
              });
            }
          }
          // Validate that at least one metric/target is present (sets duration/distance or method config metrics)
          const hasSetMetrics = item.sets.some((s) => (s.targetDurationSeconds ?? 0) > 0 || (s.targetDistanceMeters ?? 0) > 0);
          const hasConfigMetrics = Boolean(
            item.methodConfig &&
              (Number(item.methodConfig.speedKmh) > 0 ||
                Number(item.methodConfig.paceSecondsPerKm) > 0 ||
                Number(item.methodConfig.inclinePercent) !== 0 ||
                item.methodConfig.heartRateZone)
          );
          if (!hasSetMetrics && !hasConfigMetrics) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Bloco CARDIO deve conter ao menos uma meta de duração, distância, velocidade ou zona de frequência.",
              path: ["items", 0],
            });
          }
        }
        break;
      }

      case "CUSTOM": {
        if (count < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Bloco CUSTOM deve conter ao menos 1 exercício.",
            path: ["items"],
          });
        }
        break;
      }
    }
  });

// ============================================================================
// WORKOUT VERSION & ASSIGNMENT SCHEMAS
// ============================================================================

export const workoutVersionSchema = z.object({
  versionNumber: z.number().int().min(1),
  status: workoutVersionStatusSchema.default("DRAFT"),
  title: z.string().trim().min(1, "Título é obrigatório.").max(255),
  subtitle: z.string().trim().max(255).nullable().optional(),
  objective: z.string().trim().max(100).nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).nullable().optional(),
  difficultyLevel: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  blocks: z.array(workoutBlockSchema).default([]),
});

export const workoutAssignmentSchema = z
  .object({
    consultancyId: z.string().trim().min(1, "Consultoria é obrigatória."),
    studentMembershipId: z.string().trim().min(1, "Aluno é obrigatório."),
    workoutVersionId: z.string().trim().min(1, "Versão do treino é obrigatória."),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data de início inválido (AAAA-MM-DD)."),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data de término inválido (AAAA-MM-DD).").nullable().optional(),
    status: workoutAssignmentStatusSchema.default("ACTIVE"),
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
