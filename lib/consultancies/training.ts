import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { resolveConsultancyContext } from "./context";

export type TrainingExerciseStatus = "ACTIVE" | "INACTIVE";
export type TrainingPlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TrainingBlockType =
  | "SINGLE"
  | "BI_SET"
  | "TRI_SET"
  | "SUPERSET"
  | "CIRCUIT";

export const ALLOWED_BLOCK_TYPES: readonly TrainingBlockType[] = [
  "SINGLE",
  "BI_SET",
  "TRI_SET",
  "SUPERSET",
  "CIRCUIT",
];

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type PlanActivationValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type TrainingBlockExerciseDto = {
  publicId: string;
  exercisePublicId: string | null;
  sortOrder: number;
  exerciseName: string;
  description: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  instructions: string | null;
  sets: number | null;
  repetitionsText: string | null;
  restSeconds: number | null;
  loadGuidance: string | null;
  technique: string | null;
  notes: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  videoExternalId: string | null;
};

export type TrainingWorkoutBlockDto = {
  publicId: string;
  blockType: TrainingBlockType | string;
  title: string | null;
  rounds: number | null;
  restBetweenExercisesSeconds: number | null;
  restAfterBlockSeconds: number | null;
  instructions: string | null;
  sortOrder: number;
  exercises: TrainingBlockExerciseDto[];
};

export type TrainingWorkoutSectionDto = {
  publicId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  blocks: TrainingWorkoutBlockDto[];
};

export type TrainingWorkoutDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  scheduledWeekday: number | null;
  sortOrder: number;
  notes: string | null;
  sections: TrainingWorkoutSectionDto[];
};

export type TrainingPlanDto = {
  publicId: string;
  consultancyPublicId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: TrainingPlanStatus | string;
  startsOn: string | null;
  endsOn: string | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  workouts: TrainingWorkoutDto[];
};

export type PersonalTrainingPlanItemDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  startsOn: string | null;
  endsOn: string | null;
  studentName: string;
  studentEmail: string;
  studentMembershipPublicId: string;
  activatedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DraftTrainingPlanItemDto = PersonalTrainingPlanItemDto;

export type DraftTrainingPlanEditorDto = TrainingPlanDto & {
  studentName: string;
  studentEmail: string;
  studentMembershipPublicId: string;
};

export type StudentOptionDto = {
  membershipPublicId: string;
  studentName: string;
  studentEmail: string;
};

export type TrainingExerciseItemDto = {
  publicId: string;
  name: string;
  description: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  instructions: string | null;
  status: TrainingExerciseStatus | string;
  createdAt: Date;
  updatedAt?: Date;
};

export type ListTrainingExercisesResult = {
  items: TrainingExerciseItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ParsedVideo = {
  videoUrl: string | null;
  videoProvider: "YOUTUBE" | "VIMEO" | "EXTERNAL" | null;
  videoExternalId: string | null;
};

export function parseVideoUrl(rawUrl: string | null | undefined): ParsedVideo {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { videoUrl: null, videoProvider: null, videoExternalId: null };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { videoUrl: null, videoProvider: null, videoExternalId: null };
  }
  if (!trimmed.startsWith("https://")) {
    throw new Error("A URL do vídeo deve utilizar o protocolo seguro HTTPS (https://).");
  }

  // YouTube formats
  const ytMatch = trimmed.match(
    /^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      videoUrl: trimmed,
      videoProvider: "YOUTUBE",
      videoExternalId: ytMatch[1],
    };
  }

  // Vimeo formats
  const vimeoMatch = trimmed.match(
    /^https:\/\/(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]{5,15})/
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      videoUrl: trimmed,
      videoProvider: "VIMEO",
      videoExternalId: vimeoMatch[1],
    };
  }

  return {
    videoUrl: trimmed,
    videoProvider: "EXTERNAL",
    videoExternalId: null,
  };
}

/**
 * Validador central puro de completude e prontidão de um Training Plan para ativação.
 */
export function validateTrainingPlanForActivation(
  plan: TrainingPlanDto
): PlanActivationValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Título do Plano
  const title = (plan.title || "").trim();
  if (!title) {
    issues.push({
      code: "PLAN_TITLE_REQUIRED",
      path: "title",
      message: "O título do plano de treino é obrigatório.",
    });
  } else if (title.length > 255) {
    issues.push({
      code: "PLAN_TITLE_TOO_LONG",
      path: "title",
      message: "O título do plano deve ter no máximo 255 caracteres.",
    });
  }

  // 2. Datas do Plano
  if (plan.startsOn && plan.endsOn && plan.endsOn < plan.startsOn) {
    issues.push({
      code: "INVALID_DATE_RANGE",
      path: "endsOn",
      message: "A data final do plano deve ser igual ou posterior à data inicial.",
    });
  }

  // 3. Workouts (Treinos)
  const activeWorkouts = plan.workouts || [];
  if (activeWorkouts.length === 0) {
    issues.push({
      code: "NO_WORKOUTS",
      path: "workouts",
      message: "Adicione pelo menos um treino ao plano (ex: Treino A).",
    });
  }

  for (let wIdx = 0; wIdx < activeWorkouts.length; wIdx++) {
    const workout = activeWorkouts[wIdx];
    const wPath = `workouts[${wIdx}]`;
    const wTitle = (workout.title || "").trim();

    if (!wTitle) {
      issues.push({
        code: "WORKOUT_TITLE_REQUIRED",
        path: `${wPath}.title`,
        message: `O treino ${wIdx + 1} precisa ter um título preenchido.`,
      });
    }

    if (
      workout.scheduledWeekday !== null &&
      workout.scheduledWeekday !== undefined
    ) {
      const wk = Number(workout.scheduledWeekday);
      if (!Number.isInteger(wk) || wk < 1 || wk > 7) {
        issues.push({
          code: "INVALID_WEEKDAY",
          path: `${wPath}.scheduledWeekday`,
          message: `O dia da semana do treino "${wTitle || wIdx + 1}" é inválido.`,
        });
      }
    }

    const activeSections = workout.sections || [];
    if (activeSections.length === 0) {
      issues.push({
        code: "NO_SECTIONS",
        path: `${wPath}.sections`,
        message: `O treino "${wTitle || wIdx + 1}" precisa conter pelo menos uma divisão/seção muscular.`,
      });
    }

    for (let sIdx = 0; sIdx < activeSections.length; sIdx++) {
      const section = activeSections[sIdx];
      const sPath = `${wPath}.sections[${sIdx}]`;
      const sTitle = (section.title || "").trim();

      if (!sTitle) {
        issues.push({
          code: "SECTION_TITLE_REQUIRED",
          path: `${sPath}.title`,
          message: `A seção ${sIdx + 1} do treino "${wTitle || wIdx + 1}" precisa ter um título preenchido.`,
        });
      }

      const activeBlocks = section.blocks || [];
      if (activeBlocks.length === 0) {
        issues.push({
          code: "NO_BLOCKS",
          path: `${sPath}.blocks`,
          message: `A seção "${sTitle || sIdx + 1}" precisa conter pelo menos um bloco de exercícios.`,
        });
      }

      for (let bIdx = 0; bIdx < activeBlocks.length; bIdx++) {
        const block = activeBlocks[bIdx];
        const bPath = `${sPath}.blocks[${bIdx}]`;
        const bType = block.blockType as TrainingBlockType;

        if (!ALLOWED_BLOCK_TYPES.includes(bType)) {
          issues.push({
            code: "INVALID_BLOCK_TYPE",
            path: `${bPath}.blockType`,
            message: `O bloco na seção "${sTitle || sIdx + 1}" possui um tipo inválido.`,
          });
        }

        if (block.rounds !== null && block.rounds !== undefined) {
          const rounds = Number(block.rounds);
          if (!Number.isInteger(rounds) || rounds <= 0) {
            issues.push({
              code: "INVALID_ROUNDS",
              path: `${bPath}.rounds`,
              message: `O número de rounds no bloco "${block.title || bIdx + 1}" deve ser maior que zero.`,
            });
          }
        }

        if (
          block.restBetweenExercisesSeconds !== null &&
          block.restBetweenExercisesSeconds !== undefined
        ) {
          const rBe = Number(block.restBetweenExercisesSeconds);
          if (!Number.isInteger(rBe) || rBe < 0) {
            issues.push({
              code: "INVALID_REST_BETWEEN",
              path: `${bPath}.restBetweenExercisesSeconds`,
              message: `O tempo de descanso entre exercícios no bloco "${block.title || bIdx + 1}" não pode ser negativo.`,
            });
          }
        }

        if (
          block.restAfterBlockSeconds !== null &&
          block.restAfterBlockSeconds !== undefined
        ) {
          const rAf = Number(block.restAfterBlockSeconds);
          if (!Number.isInteger(rAf) || rAf < 0) {
            issues.push({
              code: "INVALID_REST_AFTER",
              path: `${bPath}.restAfterBlockSeconds`,
              message: `O tempo de descanso final no bloco "${block.title || bIdx + 1}" não pode ser negativo.`,
            });
          }
        }

        const activeExercises = block.exercises || [];
        const exCount = activeExercises.length;

        if (bType === "SINGLE" && exCount !== 1) {
          issues.push({
            code: "SINGLE_EXERCISE_COUNT",
            path: `${bPath}.exercises`,
            message: `O bloco isolado "${block.title || 'Exercício ' + (bIdx + 1)}" precisa conter exatamente 1 exercício (atual: ${exCount}).`,
          });
        } else if (bType === "BI_SET" && exCount !== 2) {
          issues.push({
            code: "BI_SET_EXERCISE_COUNT",
            path: `${bPath}.exercises`,
            message: `O bi-set "${block.title || 'Bi-Set ' + (bIdx + 1)}" precisa conter exatamente 2 exercícios (atual: ${exCount}).`,
          });
        } else if (bType === "TRI_SET" && exCount !== 3) {
          issues.push({
            code: "TRI_SET_EXERCISE_COUNT",
            path: `${bPath}.exercises`,
            message: `O tri-set "${block.title || 'Tri-Set ' + (bIdx + 1)}" precisa conter exatamente 3 exercícios (atual: ${exCount}).`,
          });
        } else if (bType === "SUPERSET" && exCount < 2) {
          issues.push({
            code: "SUPERSET_EXERCISE_COUNT",
            path: `${bPath}.exercises`,
            message: `O superset "${block.title || 'Superset ' + (bIdx + 1)}" precisa conter no mínimo 2 exercícios (atual: ${exCount}).`,
          });
        } else if (bType === "CIRCUIT" && exCount < 2) {
          issues.push({
            code: "CIRCUIT_EXERCISE_COUNT",
            path: `${bPath}.exercises`,
            message: `O circuito "${block.title || 'Circuito ' + (bIdx + 1)}" precisa conter no mínimo 2 exercícios (atual: ${exCount}).`,
          });
        }

        for (let eIdx = 0; eIdx < activeExercises.length; eIdx++) {
          const exercise = activeExercises[eIdx];
          const ePath = `${bPath}.exercises[${eIdx}]`;
          const exName = (exercise.exerciseName || "").trim();

          if (!exName) {
            issues.push({
              code: "EXERCISE_NAME_REQUIRED",
              path: `${ePath}.exerciseName`,
              message: `O exercício ${eIdx + 1} no bloco "${block.title || bIdx + 1}" precisa ter um nome.`,
            });
          }

          // Orientação de execução real: sets, reps, load, technique, notes, instructions
          const hasSets =
            exercise.sets !== null &&
            exercise.sets !== undefined &&
            Number(exercise.sets) > 0;
          const hasReps =
            typeof exercise.repetitionsText === "string" &&
            exercise.repetitionsText.trim().length > 0;
          const hasLoad =
            typeof exercise.loadGuidance === "string" &&
            exercise.loadGuidance.trim().length > 0;
          const hasTech =
            typeof exercise.technique === "string" &&
            exercise.technique.trim().length > 0;
          const hasNotes =
            typeof exercise.notes === "string" &&
            exercise.notes.trim().length > 0;
          const hasInst =
            typeof exercise.instructions === "string" &&
            exercise.instructions.trim().length > 0;

          if (
            !hasSets &&
            !hasReps &&
            !hasLoad &&
            !hasTech &&
            !hasNotes &&
            !hasInst
          ) {
            issues.push({
              code: "NO_PRESCRIPTION_GUIDANCE",
              path: `${ePath}.prescription`,
              message: `O exercício "${exName || eIdx + 1}" precisa ter pelo menos uma orientação de execução (séries, repetições, carga, técnica ou observações).`,
            });
          }

          if (
            exercise.sets !== null &&
            exercise.sets !== undefined &&
            Number(exercise.sets) <= 0
          ) {
            issues.push({
              code: "INVALID_SETS",
              path: `${ePath}.sets`,
              message: `O número de séries do exercício "${exName || eIdx + 1}" deve ser maior que zero.`,
            });
          }

          if (
            exercise.restSeconds !== null &&
            exercise.restSeconds !== undefined &&
            Number(exercise.restSeconds) < 0
          ) {
            issues.push({
              code: "INVALID_REST",
              path: `${ePath}.restSeconds`,
              message: `O tempo de descanso do exercício "${exName || eIdx + 1}" não pode ser negativo.`,
            });
          }

          // Vídeo
          if (exercise.videoUrl) {
            try {
              const parsed = parseVideoUrl(exercise.videoUrl);
              if (parsed.videoProvider !== exercise.videoProvider) {
                issues.push({
                  code: "VIDEO_PROVIDER_MISMATCH",
                  path: `${ePath}.videoUrl`,
                  message: `A URL de vídeo do exercício "${exName || eIdx + 1}" está inconsistente com o provedor registrado.`,
                });
              }
            } catch (err: unknown) {
              issues.push({
                code: "INVALID_VIDEO_URL",
                path: `${ePath}.videoUrl`,
                message:
                  err instanceof Error
                    ? err.message
                    : `URL de vídeo inválida no exercício "${exName || eIdx + 1}".`,
              });
            }
          } else {
            if (
              exercise.videoProvider !== null ||
              exercise.videoExternalId !== null
            ) {
              issues.push({
                code: "VIDEO_METADATA_INCONSISTENT",
                path: `${ePath}.videoProvider`,
                message: `Inconsistência de vídeo no exercício "${exName || eIdx + 1}".`,
              });
            }
          }
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Busca o plano de treino ativo para um aluno específico dentro do contexto da consultoria.
 * Apenas leitura (read-only), sem queries N+1, tenant-scoped e fail-closed.
 */
export async function getActiveTrainingPlanForStudent(
  userId: number,
  consultancySlug: string
): Promise<TrainingPlanDto | null> {
  if (
    !userId ||
    typeof userId !== "number" ||
    userId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !consultancySlug.trim()
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context || (!context.roles.includes("STUDENT") && !context.roles.includes("INFLUENCER"))) {
    return null;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    // 1. Buscar o plano ativo do aluno neste tenant
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tp.id,
        tp.public_id,
        tp.title,
        tp.subtitle,
        tp.description,
        tp.status,
        DATE_FORMAT(tp.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(tp.ends_on, '%Y-%m-%d') AS ends_on,
        tp.activated_at,
        tp.archived_at
       FROM training_plans tp
       WHERE tp.consultancy_id = ?
         AND tp.student_membership_id = ?
         AND tp.status = 'ACTIVE'
         AND tp.deleted_at IS NULL
       ORDER BY tp.activated_at DESC, tp.id DESC
       LIMIT 1;`,
      [context.consultancyId, context.membershipId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return null;
    }

    const planRow = planRows[0];
    const planId = Number(planRow.id);

    // 2. Buscar toda a hierarquia do plano em uma query única e determinística
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tw.id AS workout_id,
        tw.public_id AS workout_public_id,
        tw.title AS workout_title,
        tw.subtitle AS workout_subtitle,
        tw.scheduled_weekday AS workout_scheduled_weekday,
        tw.sort_order AS workout_sort_order,
        tw.notes AS workout_notes,

        tws.id AS section_id,
        tws.public_id AS section_public_id,
        tws.title AS section_title,
        tws.description AS section_description,
        tws.sort_order AS section_sort_order,

        twb.id AS block_id,
        twb.public_id AS block_public_id,
        twb.block_type AS block_type,
        twb.title AS block_title,
        twb.rounds AS block_rounds,
        twb.rest_between_exercises_seconds AS block_rest_between_exercises_seconds,
        twb.rest_after_block_seconds AS block_rest_after_block_seconds,
        twb.instructions AS block_instructions,
        twb.sort_order AS block_sort_order,

        twbe.id AS exercise_item_id,
        twbe.public_id AS exercise_item_public_id,
        te.public_id AS catalog_exercise_public_id,
        twbe.sort_order AS exercise_sort_order,
        twbe.exercise_name_snapshot,
        twbe.description_snapshot,
        twbe.muscle_group_snapshot,
        twbe.equipment_snapshot,
        twbe.instructions_snapshot,
        twbe.sets,
        twbe.repetitions_text,
        twbe.rest_seconds,
        twbe.load_guidance,
        twbe.technique,
        twbe.notes AS exercise_notes,
        twbe.video_url,
        twbe.video_provider,
        twbe.video_external_id
       FROM training_workouts tw
       LEFT JOIN training_workout_sections tws
         ON tws.workout_id = tw.id AND tws.deleted_at IS NULL
       LEFT JOIN training_workout_blocks twb
         ON twb.section_id = tws.id AND twb.deleted_at IS NULL
       LEFT JOIN training_workout_block_exercises twbe
         ON twbe.block_id = twb.id AND twbe.deleted_at IS NULL
       LEFT JOIN training_exercises te
         ON te.id = twbe.exercise_id AND te.deleted_at IS NULL
       WHERE tw.training_plan_id = ?
         AND tw.deleted_at IS NULL
       ORDER BY
         tw.sort_order ASC, tw.id ASC,
         tws.sort_order ASC, tws.id ASC,
         twb.sort_order ASC, twb.id ASC,
         twbe.sort_order ASC, twbe.id ASC;`,
      [planId]
    );

    return assemblePlanTree(planRow, itemRows, context.consultancyPublicId);
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Helper para estruturar a árvore hierárquica do plano na memória a partir das rows do banco.
 */
function assemblePlanTree(
  planRow: RowDataPacket,
  itemRows: RowDataPacket[],
  consultancyPublicId: string
): TrainingPlanDto {
  const workoutsMap = new Map<number, TrainingWorkoutDto>();
  const sectionsMap = new Map<number, TrainingWorkoutSectionDto>();
  const blocksMap = new Map<number, TrainingWorkoutBlockDto>();

  for (const row of itemRows) {
    if (row.workout_id === null) continue;
    const workoutId = Number(row.workout_id);
    if (!workoutsMap.has(workoutId)) {
      workoutsMap.set(workoutId, {
        publicId: String(row.workout_public_id),
        title: String(row.workout_title),
        subtitle: row.workout_subtitle ? String(row.workout_subtitle) : null,
        scheduledWeekday:
          row.workout_scheduled_weekday !== null
            ? Number(row.workout_scheduled_weekday)
            : null,
        sortOrder: Number(row.workout_sort_order),
        notes: row.workout_notes ? String(row.workout_notes) : null,
        sections: [],
      });
    }
    const workout = workoutsMap.get(workoutId)!;

    if (row.section_id !== null) {
      const sectionId = Number(row.section_id);
      if (!sectionsMap.has(sectionId)) {
        const section: TrainingWorkoutSectionDto = {
          publicId: String(row.section_public_id),
          title: String(row.section_title),
          description: row.section_description
            ? String(row.section_description)
            : null,
          sortOrder: Number(row.section_sort_order),
          blocks: [],
        };
        sectionsMap.set(sectionId, section);
        workout.sections.push(section);
      }
      const section = sectionsMap.get(sectionId)!;

      if (row.block_id !== null) {
        const blockId = Number(row.block_id);
        if (!blocksMap.has(blockId)) {
          const block: TrainingWorkoutBlockDto = {
            publicId: String(row.block_public_id),
            blockType: String(row.block_type),
            title: row.block_title ? String(row.block_title) : null,
            rounds:
              row.block_rounds !== null ? Number(row.block_rounds) : null,
            restBetweenExercisesSeconds:
              row.block_rest_between_exercises_seconds !== null
                ? Number(row.block_rest_between_exercises_seconds)
                : null,
            restAfterBlockSeconds:
              row.block_rest_after_block_seconds !== null
                ? Number(row.block_rest_after_block_seconds)
                : null,
            instructions: row.block_instructions
              ? String(row.block_instructions)
              : null,
            sortOrder: Number(row.block_sort_order),
            exercises: [],
          };
          blocksMap.set(blockId, block);
          section.blocks.push(block);
        }
        const block = blocksMap.get(blockId)!;

        if (row.exercise_item_id !== null) {
          block.exercises.push({
            publicId: String(row.exercise_item_public_id),
            exercisePublicId: row.catalog_exercise_public_id
              ? String(row.catalog_exercise_public_id)
              : null,
            sortOrder: Number(row.exercise_sort_order),
            exerciseName: String(row.exercise_name_snapshot),
            description: row.description_snapshot
              ? String(row.description_snapshot)
              : null,
            muscleGroup: row.muscle_group_snapshot
              ? String(row.muscle_group_snapshot)
              : null,
            equipment: row.equipment_snapshot
              ? String(row.equipment_snapshot)
              : null,
            instructions: row.instructions_snapshot
              ? String(row.instructions_snapshot)
              : null,
            sets: row.sets !== null ? Number(row.sets) : null,
            repetitionsText: row.repetitions_text
              ? String(row.repetitions_text)
              : null,
            restSeconds:
              row.rest_seconds !== null ? Number(row.rest_seconds) : null,
            loadGuidance: row.load_guidance
              ? String(row.load_guidance)
              : null,
            technique: row.technique ? String(row.technique) : null,
            notes: row.exercise_notes ? String(row.exercise_notes) : null,
            videoUrl: row.video_url ? String(row.video_url) : null,
            videoProvider: row.video_provider
              ? String(row.video_provider)
              : null,
            videoExternalId: row.video_external_id
              ? String(row.video_external_id)
              : null,
          });
        }
      }
    }
  }

  return {
    publicId: String(planRow.public_id),
    consultancyPublicId,
    title: String(planRow.title),
    subtitle: planRow.subtitle ? String(planRow.subtitle) : null,
    description: planRow.description ? String(planRow.description) : null,
    status: String(planRow.status),
    startsOn: planRow.starts_on ? String(planRow.starts_on) : null,
    endsOn: planRow.ends_on ? String(planRow.ends_on) : null,
    activatedAt: planRow.activated_at ? new Date(planRow.activated_at) : null,
    archivedAt: planRow.archived_at ? new Date(planRow.archived_at) : null,
    workouts: Array.from(workoutsMap.values()),
  };
}

/**
 * Lista planos de treino criados pelo PERSONAL no tenant filtrados por status (DRAFT, ACTIVE, ARCHIVED).
 */
export async function listPersonalTrainingPlans(params: {
  actorUserId: number;
  consultancySlug: string;
  statusFilter?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  page?: number;
  pageSize?: number;
}): Promise<{
  items: PersonalTrainingPlanItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} | null> {
  const {
    actorUserId,
    consultancySlug,
    statusFilter = "DRAFT",
    page = 1,
    pageSize = 25,
  } = params;

  if (!actorUserId || !consultancySlug) return null;

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("PERSONAL")) return null;

  const validStatus =
    statusFilter === "ACTIVE" || statusFilter === "ARCHIVED"
      ? statusFilter
      : "DRAFT";

  const validPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const validPageSize =
    Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100
      ? pageSize
      : 25;
  const offset = (validPage - 1) * validPageSize;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM training_plans tp
       WHERE tp.consultancy_id = ?
         AND tp.created_by_user_id = ?
         AND tp.status = ?
         AND tp.deleted_at IS NULL;`,
      [context.consultancyId, actorUserId, validStatus]
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tp.public_id,
        tp.title,
        tp.subtitle,
        tp.description,
        tp.status,
        DATE_FORMAT(tp.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(tp.ends_on, '%Y-%m-%d') AS ends_on,
        tp.activated_at,
        tp.archived_at,
        tp.created_at,
        tp.updated_at,
        u.full_name AS student_name,
        u.email AS student_email,
        cm.public_id AS student_membership_public_id
       FROM training_plans tp
       INNER JOIN consultancy_members cm ON cm.id = tp.student_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE tp.consultancy_id = ?
         AND tp.created_by_user_id = ?
         AND tp.status = ?
         AND tp.deleted_at IS NULL
       ORDER BY tp.updated_at DESC, tp.public_id ASC
       LIMIT ? OFFSET ?;`,
      [
        context.consultancyId,
        actorUserId,
        validStatus,
        String(validPageSize),
        String(offset),
      ]
    );

    const items: PersonalTrainingPlanItemDto[] = rows.map((r) => ({
      publicId: String(r.public_id),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      description: r.description ? String(r.description) : null,
      status: String(r.status),
      startsOn: r.starts_on ? String(r.starts_on) : null,
      endsOn: r.ends_on ? String(r.ends_on) : null,
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
      studentMembershipPublicId: String(r.student_membership_public_id),
      activatedAt: r.activated_at ? new Date(r.activated_at) : null,
      archivedAt: r.archived_at ? new Date(r.archived_at) : null,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));

    const totalPages = Math.ceil(total / validPageSize) || 1;

    return {
      items,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Alias compatível para listagem de planos em rascunho.
 */
export async function listDraftTrainingPlansForPersonal(params: {
  actorUserId: number;
  consultancySlug: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: DraftTrainingPlanItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} | null> {
  return listPersonalTrainingPlans({ ...params, statusFilter: "DRAFT" });
}

/**
 * Lista alunos ativos do tenant para seleção pelo Personal.
 */
export async function listStudentsForPersonal(params: {
  actorUserId: number;
  consultancySlug: string;
  search?: string;
  limit?: number;
}): Promise<StudentOptionDto[] | null> {
  const { actorUserId, consultancySlug, search = "", limit = 25 } = params;
  if (!actorUserId || !consultancySlug) return null;

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("PERSONAL")) return null;

  const validLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const rawSearch = (search || "").trim().normalize("NFC");
  const hasSearch = rawSearch.length > 0;
  const escapedSearch = rawSearch.replace(/[%_\\]/g, "\\$&");
  const searchPattern = `%${escapedSearch}%`;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const whereConditions = [
      "cm.consultancy_id = ?",
      "cm.status = 'ACTIVE'",
      "u.status = 'ACTIVE'",
      "u.deleted_at IS NULL",
      "cmr.role IN ('STUDENT', 'INFLUENCER')",
    ];
    const queryParams: (string | number)[] = [context.consultancyId];

    if (hasSearch) {
      whereConditions.push("(u.full_name LIKE ? OR u.email LIKE ?)");
      queryParams.push(searchPattern, searchPattern);
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT
        cm.public_id AS membership_public_id,
        u.full_name AS student_name,
        u.email AS student_email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE ${whereConditions.join(" AND ")}
       ORDER BY u.full_name ASC, u.id ASC
       LIMIT ?;`,
      [...queryParams, String(validLimit)]
    );

    return rows.map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
    }));
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Busca a árvore completa de um plano DRAFT para o editor do PERSONAL criador.
 */
export async function getDraftTrainingPlanForEditor(params: {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
}): Promise<DraftTrainingPlanEditorDto | null> {
  const { actorUserId, consultancySlug, planPublicId } = params;
  if (!actorUserId || !consultancySlug || !planPublicId) return null;

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("PERSONAL")) return null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tp.id,
        tp.public_id,
        tp.title,
        tp.subtitle,
        tp.description,
        tp.status,
        DATE_FORMAT(tp.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(tp.ends_on, '%Y-%m-%d') AS ends_on,
        tp.activated_at,
        tp.archived_at,
        u.full_name AS student_name,
        u.email AS student_email,
        cm.public_id AS student_membership_public_id
       FROM training_plans tp
       INNER JOIN consultancy_members cm ON cm.id = tp.student_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE tp.public_id = ?
         AND tp.consultancy_id = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tp.deleted_at IS NULL
       LIMIT 1;`,
      [planPublicId.trim(), context.consultancyId, actorUserId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return null;
    }

    const planRow = planRows[0];
    const planId = Number(planRow.id);

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tw.id AS workout_id,
        tw.public_id AS workout_public_id,
        tw.title AS workout_title,
        tw.subtitle AS workout_subtitle,
        tw.scheduled_weekday AS workout_scheduled_weekday,
        tw.sort_order AS workout_sort_order,
        tw.notes AS workout_notes,

        tws.id AS section_id,
        tws.public_id AS section_public_id,
        tws.title AS section_title,
        tws.description AS section_description,
        tws.sort_order AS section_sort_order,

        twb.id AS block_id,
        twb.public_id AS block_public_id,
        twb.block_type AS block_type,
        twb.title AS block_title,
        twb.rounds AS block_rounds,
        twb.rest_between_exercises_seconds AS block_rest_between_exercises_seconds,
        twb.rest_after_block_seconds AS block_rest_after_block_seconds,
        twb.instructions AS block_instructions,
        twb.sort_order AS block_sort_order,

        twbe.id AS exercise_item_id,
        twbe.public_id AS exercise_item_public_id,
        te.public_id AS catalog_exercise_public_id,
        twbe.sort_order AS exercise_sort_order,
        twbe.exercise_name_snapshot,
        twbe.description_snapshot,
        twbe.muscle_group_snapshot,
        twbe.equipment_snapshot,
        twbe.instructions_snapshot,
        twbe.sets,
        twbe.repetitions_text,
        twbe.rest_seconds,
        twbe.load_guidance,
        twbe.technique,
        twbe.notes AS exercise_notes,
        twbe.video_url,
        twbe.video_provider,
        twbe.video_external_id
       FROM training_workouts tw
       LEFT JOIN training_workout_sections tws
         ON tws.workout_id = tw.id AND tws.deleted_at IS NULL
       LEFT JOIN training_workout_blocks twb
         ON twb.section_id = tws.id AND twb.deleted_at IS NULL
       LEFT JOIN training_workout_block_exercises twbe
         ON twbe.block_id = twb.id AND twbe.deleted_at IS NULL
       LEFT JOIN training_exercises te
         ON te.id = twbe.exercise_id AND te.deleted_at IS NULL
       WHERE tw.training_plan_id = ?
         AND tw.deleted_at IS NULL
       ORDER BY
         tw.sort_order ASC, tw.id ASC,
         tws.sort_order ASC, tws.id ASC,
         twb.sort_order ASC, twb.id ASC,
         twbe.sort_order ASC, twbe.id ASC;`,
      [planId]
    );

    const basePlan = assemblePlanTree(
      planRow,
      itemRows,
      context.consultancyPublicId
    );

    return {
      ...basePlan,
      studentName: String(planRow.student_name),
      studentEmail: String(planRow.student_email),
      studentMembershipPublicId: String(planRow.student_membership_public_id),
    };
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Preflight de validação de prontidão para ativação de um Training Plan.
 */
export async function checkTrainingPlanActivationReadiness(params: {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
}): Promise<
  | {
      success: true;
      valid: boolean;
      issues: ValidationIssue[];
      planTitle: string;
      studentName: string;
    }
  | { success: false; error: string }
> {
  const { actorUserId, consultancySlug, planPublicId } = params;

  if (!actorUserId || !consultancySlug || !planPublicId) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const plan = await getDraftTrainingPlanForEditor({
    actorUserId,
    consultancySlug,
    planPublicId,
  });

  if (!plan) {
    return {
      success: false,
      error: "Plano de treino em rascunho não encontrado ou sem permissão de acesso.",
    };
  }

  const validation = validateTrainingPlanForActivation(plan);

  return {
    success: true,
    valid: validation.valid,
    issues: validation.issues,
    planTitle: plan.title,
    studentName: plan.studentName,
  };
}

/**
 * Ativação transacional e atômica de um Training Plan (DRAFT -> ACTIVE).
 * Arquiva o plano ACTIVE anterior do aluno caso exista (ACTIVE -> ARCHIVED).
 * Garante unicidade lógica de exatamente 1 plano ACTIVE por aluno/consultoria.
 */
export async function activateTrainingPlan(params: {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
}): Promise<
  | {
      success: true;
      alreadyActive?: boolean;
      activatedPlanPublicId: string;
      studentMembershipPublicId: string;
      studentName: string;
    }
  | { success: false; error: string; issues?: ValidationIssue[] }
> {
  const { actorUserId, consultancySlug, planPublicId } = params;

  if (!actorUserId || !consultancySlug || !planPublicId) {
    return { success: false, error: "Parâmetros obrigatórios ausentes." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Revalidar consultoria
    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria indisponível." };
    }
    const consultancyId = Number(cRows[0].id);
    const consultancyPublicId = String(cRows[0].public_id);

    // 2. Lock & revalidar actor membership com role PERSONAL
    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente para ativar planos de treino." };
    }

    // 3. Lock target plan
    const [pRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tp.id,
        tp.public_id,
        tp.student_membership_id,
        tp.created_by_user_id,
        tp.status,
        tp.title,
        tp.subtitle,
        tp.description,
        DATE_FORMAT(tp.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(tp.ends_on, '%Y-%m-%d') AS ends_on,
        tp.activated_at,
        tp.archived_at
       FROM training_plans tp
       WHERE tp.public_id = ?
         AND tp.consultancy_id = ?
         AND tp.created_by_user_id = ?
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [planPublicId.trim(), consultancyId, actorUserId]
    );

    if (!Array.isArray(pRows) || pRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano de treino não encontrado ou não pertence a você." };
    }

    const targetPlan = pRows[0];
    const targetPlanId = Number(targetPlan.id);
    const targetStatus = String(targetPlan.status);
    const studentMembershipId = Number(targetPlan.student_membership_id);

    // 4. Lock target student membership (serialização lógica por aluno)
    const [stRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, u.full_name, u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
       WHERE cm.id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [studentMembershipId, consultancyId]
    );

    if (!Array.isArray(stRows) || stRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Aluno vinculado ao plano não está ativo nesta consultoria." };
    }
    const student = stRows[0];

    // Idempotência / Double submit check
    if (targetStatus === "ACTIVE") {
      const [curActiveCheck] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM training_plans
         WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
        [consultancyId, studentMembershipId]
      );
      if (
        Array.isArray(curActiveCheck) &&
        curActiveCheck.length === 1 &&
        Number(curActiveCheck[0].id) === targetPlanId
      ) {
        await connection.rollback();
        return {
          success: true,
          alreadyActive: true,
          activatedPlanPublicId: String(targetPlan.public_id),
          studentMembershipPublicId: String(student.public_id),
          studentName: String(student.full_name),
        };
      }
    }

    if (targetStatus === "ARCHIVED") {
      await connection.rollback();
      return { success: false, error: "Não é possível ativar um plano que já foi arquivado." };
    }

    if (targetStatus !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser ativados." };
    }

    // 5. Recarregar árvore completa do plano sob Lock e revalidar completude
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        tw.id AS workout_id,
        tw.public_id AS workout_public_id,
        tw.title AS workout_title,
        tw.subtitle AS workout_subtitle,
        tw.scheduled_weekday AS workout_scheduled_weekday,
        tw.sort_order AS workout_sort_order,
        tw.notes AS workout_notes,

        tws.id AS section_id,
        tws.public_id AS section_public_id,
        tws.title AS section_title,
        tws.description AS section_description,
        tws.sort_order AS section_sort_order,

        twb.id AS block_id,
        twb.public_id AS block_public_id,
        twb.block_type AS block_type,
        twb.title AS block_title,
        twb.rounds AS block_rounds,
        twb.rest_between_exercises_seconds AS block_rest_between_exercises_seconds,
        twb.rest_after_block_seconds AS block_rest_after_block_seconds,
        twb.instructions AS block_instructions,
        twb.sort_order AS block_sort_order,

        twbe.id AS exercise_item_id,
        twbe.public_id AS exercise_item_public_id,
        te.public_id AS catalog_exercise_public_id,
        twbe.sort_order AS exercise_sort_order,
        twbe.exercise_name_snapshot,
        twbe.description_snapshot,
        twbe.muscle_group_snapshot,
        twbe.equipment_snapshot,
        twbe.instructions_snapshot,
        twbe.sets,
        twbe.repetitions_text,
        twbe.rest_seconds,
        twbe.load_guidance,
        twbe.technique,
        twbe.notes AS exercise_notes,
        twbe.video_url,
        twbe.video_provider,
        twbe.video_external_id
       FROM training_workouts tw
       LEFT JOIN training_workout_sections tws
         ON tws.workout_id = tw.id AND tws.deleted_at IS NULL
       LEFT JOIN training_workout_blocks twb
         ON twb.section_id = tws.id AND twb.deleted_at IS NULL
       LEFT JOIN training_workout_block_exercises twbe
         ON twbe.block_id = twb.id AND twbe.deleted_at IS NULL
       LEFT JOIN training_exercises te
         ON te.id = twbe.exercise_id AND te.deleted_at IS NULL
       WHERE tw.training_plan_id = ?
         AND tw.deleted_at IS NULL
       ORDER BY
         tw.sort_order ASC, tw.id ASC,
         tws.sort_order ASC, tws.id ASC,
         twb.sort_order ASC, twb.id ASC,
         twbe.sort_order ASC, twbe.id ASC;`,
      [targetPlanId]
    );

    const assembledPlan = assemblePlanTree(
      targetPlan,
      itemRows,
      consultancyPublicId
    );

    // Validação estrita de completude
    const validation = validateTrainingPlanForActivation(assembledPlan);
    if (!validation.valid) {
      await connection.rollback();
      return {
        success: false,
        error: "O plano de treino não está completo para ser disponibilizado.",
        issues: validation.issues,
      };
    }

    // 6. Verificar se há referências a exercícios de outro tenant (cross-tenant check)
    const [foreignExRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_exercises te ON te.id = twbe.exercise_id
       WHERE tw.training_plan_id = ?
         AND twbe.exercise_id IS NOT NULL
         AND te.consultancy_id != ?
         AND twbe.deleted_at IS NULL;`,
      [targetPlanId, consultancyId]
    );
    if (Number(foreignExRows[0]?.total || 0) > 0) {
      await connection.rollback();
      return { success: false, error: "Exercício de outra consultoria detectado no plano." };
    }

    // 7. Lock nos planos ACTIVE atuais deste aluno no tenant
    const [currentActivePlans] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, activated_at
       FROM training_plans
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [consultancyId, studentMembershipId]
    );

    // Se houver mais de 1 ACTIVE -> fail-closed (inconsistência crítica)
    if (currentActivePlans.length > 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Inconsistência de integridade detectada: múltiplos planos ativos para o mesmo aluno.",
      };
    }

    // Se houver 1 ACTIVE anterior diferente do target -> arquivá-lo
    if (currentActivePlans.length === 1) {
      const prevActivePlan = currentActivePlans[0];
      if (Number(prevActivePlan.id) !== targetPlanId) {
        const [archiveRes] = await connection.execute<ResultSetHeader>(
          `UPDATE training_plans
           SET status = 'ARCHIVED',
               archived_at = UTC_TIMESTAMP(3),
               updated_at = UTC_TIMESTAMP(3)
           WHERE id = ? AND status = 'ACTIVE';`,
          [prevActivePlan.id]
        );

        if (archiveRes.affectedRows !== 1) {
          await connection.rollback();
          return { success: false, error: "Falha ao arquivar o plano de treino anterior." };
        }

        // Auditoria do plano arquivado
        await connection.execute<ResultSetHeader>(
          `INSERT INTO audit_events (
            public_id,
            actor_user_id,
            consultancy_id,
            action,
            target_type,
            target_public_id,
            metadata_json,
            created_at
          ) VALUES (UUID(), ?, ?, 'TRAINING_PLAN_ARCHIVED', 'TRAINING_PLAN', ?, NULL, UTC_TIMESTAMP(3));`,
          [actorUserId, consultancyId, String(prevActivePlan.public_id)]
        );
      }
    }

    // 8. Promover target DRAFT -> ACTIVE
    const [activateRes] = await connection.execute<ResultSetHeader>(
      `UPDATE training_plans
       SET status = 'ACTIVE',
           activated_at = UTC_TIMESTAMP(3),
           archived_at = NULL,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND status = 'DRAFT';`,
      [targetPlanId]
    );

    if (activateRes.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível ativar o plano de treino." };
    }

    // Auditoria do novo plano ativado
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_PLAN_ACTIVATED', 'TRAINING_PLAN', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, String(targetPlan.public_id)]
    );

    // 9. Assert defensivo final antes do commit: exatamente 1 ACTIVE para este aluno no tenant
    const [finalActiveCount] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM training_plans
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL;`,
      [consultancyId, studentMembershipId]
    );

    if (Number(finalActiveCount[0]?.total) !== 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Falha na garantia de unicidade: o aluno deve ter exatamente 1 plano ativo.",
      };
    }

    await connection.commit();

    return {
      success: true,
      activatedPlanPublicId: String(targetPlan.public_id),
      studentMembershipPublicId: String(student.public_id),
      studentName: String(student.full_name),
    };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao ativar o plano de treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Cria um novo plano em rascunho (DRAFT) para um aluno da consultoria.
 */
export async function createDraftTrainingPlan(params: {
  actorUserId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
}): Promise<
  | { success: true; planPublicId: string }
  | { success: false; error: string }
> {
  const { actorUserId, consultancySlug, studentMembershipPublicId } = params;

  if (!actorUserId || !consultancySlug || !studentMembershipPublicId) {
    return { success: false, error: "Parâmetros obrigatórios ausentes." };
  }

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título do plano é obrigatório (máximo 255 caracteres)." };
  }

  const subtitle = (params.subtitle || "").trim().normalize("NFC") || null;
  if (subtitle && subtitle.length > 255) {
    return { success: false, error: "O subtítulo deve ter no máximo 255 caracteres." };
  }

  const description = (params.description || "").trim().normalize("NFC") || null;

  const startsOn = (params.startsOn || "").trim() || null;
  const endsOn = (params.endsOn || "").trim() || null;

  if (startsOn && endsOn && endsOn < startsOn) {
    return { success: false, error: "A data final deve ser posterior ou igual à data inicial." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Revalidar consultoria
    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    // 2. Lock & revalidar actor membership com role PERSONAL
    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente para criar planos de treino." };
    }

    // 3. Lock & revalidar target student membership
    const [stRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [studentMembershipPublicId.trim(), consultancyId]
    );
    if (!Array.isArray(stRows) || stRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Aluno selecionado não foi encontrado nesta consultoria." };
    }
    const studentMembershipId = Number(stRows[0].id);

    // 4. Inserir plano DRAFT
    const planPublicId = crypto.randomUUID();
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO training_plans (
        public_id,
        consultancy_id,
        student_membership_id,
        created_by_user_id,
        title,
        subtitle,
        description,
        status,
        starts_on,
        ends_on,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [
        planPublicId,
        consultancyId,
        studentMembershipId,
        actorUserId,
        title,
        subtitle,
        description,
        startsOn,
        endsOn,
      ]
    );

    if (insertResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Erro ao criar plano." };
    }

    // 5. Auditoria de criação
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_PLAN_CREATED', 'TRAINING_PLAN', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, planPublicId]
    );

    await connection.commit();
    return { success: true, planPublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao criar plano de treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Helper interno para travar e validar o plano DRAFT editável pelo PERSONAL criador.
 */
async function lockEditableDraftPlan(
  connection: PoolConnection,
  actorUserId: number,
  consultancySlug: string,
  planPublicId: string
): Promise<
  | { success: true; consultancyId: number; planId: number }
  | { success: false; error: string }
> {
  const [cRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
    [consultancySlug.trim()]
  );
  if (!Array.isArray(cRows) || cRows.length === 0) {
    return { success: false, error: "Consultoria indisponível." };
  }
  const consultancyId = Number(cRows[0].id);

  // Lock actor membership com role PERSONAL
  const [mRows] = await connection.execute<RowDataPacket[]>(
    `SELECT cm.id
     FROM consultancy_members cm
     INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
     WHERE cm.user_id = ?
       AND cm.consultancy_id = ?
       AND cm.status = 'ACTIVE'
     LIMIT 1
     FOR UPDATE;`,
    [actorUserId, consultancyId]
  );
  if (!Array.isArray(mRows) || mRows.length === 0) {
    return { success: false, error: "Permissão insuficiente para editar este plano." };
  }

  // Lock plano DRAFT pertencente ao PERSONAL
  const [pRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id, status
     FROM training_plans
     WHERE public_id = ?
       AND consultancy_id = ?
       AND created_by_user_id = ?
       AND status = 'DRAFT'
       AND deleted_at IS NULL
     LIMIT 1
     FOR UPDATE;`,
    [planPublicId.trim(), consultancyId, actorUserId]
  );
  if (!Array.isArray(pRows) || pRows.length === 0) {
    return { success: false, error: "Plano de treino em rascunho não encontrado ou não pertence a você." };
  }

  return { success: true, consultancyId, planId: Number(pRows[0].id) };
}

/**
 * Atualiza metadados do plano DRAFT (com detecção de no-op e auditoria).
 */
export async function updateDraftTrainingPlanMetadata(params: {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
}): Promise<
  | { success: true; updated: boolean; message?: string }
  | { success: false; error: string }
> {
  const { actorUserId, consultancySlug, planPublicId } = params;

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título do plano é obrigatório (máximo 255 caracteres)." };
  }
  const subtitle = (params.subtitle || "").trim().normalize("NFC") || null;
  if (subtitle && subtitle.length > 255) {
    return { success: false, error: "O subtítulo deve ter no máximo 255 caracteres." };
  }
  const description = (params.description || "").trim().normalize("NFC") || null;
  const startsOn = (params.startsOn || "").trim() || null;
  const endsOn = (params.endsOn || "").trim() || null;

  if (startsOn && endsOn && endsOn < startsOn) {
    return { success: false, error: "A data final deve ser posterior ou igual à data inicial." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const lockRes = await lockEditableDraftPlan(
      connection,
      actorUserId,
      consultancySlug,
      planPublicId
    );
    if (!lockRes.success) {
      await connection.rollback();
      return { success: false, error: lockRes.error };
    }

    // Verificar dados atuais para detecção de no-op
    const [curRows] = await connection.execute<RowDataPacket[]>(
      `SELECT title, subtitle, description,
              DATE_FORMAT(starts_on, '%Y-%m-%d') AS starts_on,
              DATE_FORMAT(ends_on, '%Y-%m-%d') AS ends_on
       FROM training_plans WHERE id = ? LIMIT 1;`,
      [lockRes.planId]
    );
    const cur = curRows[0];
    const isIdentical =
      String(cur.title) === title &&
      (cur.subtitle || null) === subtitle &&
      (cur.description || null) === description &&
      (cur.starts_on || null) === startsOn &&
      (cur.ends_on || null) === endsOn;

    if (isIdentical) {
      await connection.rollback();
      return { success: true, updated: false, message: "Nenhuma alteração necessária." };
    }

    const [updateRes] = await connection.execute<ResultSetHeader>(
      `UPDATE training_plans
       SET title = ?, subtitle = ?, description = ?, starts_on = ?, ends_on = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [title, subtitle, description, startsOn, endsOn, lockRes.planId]
    );

    if (updateRes.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Erro ao atualizar metadados do plano." };
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json, created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_PLAN_DRAFT_UPDATED', 'TRAINING_PLAN', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, lockRes.consultancyId, planPublicId.trim()]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao atualizar metadados do plano." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Cria um novo Workout (Dia/Sessão) em um plano DRAFT.
 */
export async function createTrainingWorkout(params: {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  title: string;
  subtitle?: string | null;
  scheduledWeekday?: number | null;
  notes?: string | null;
}): Promise<{ success: true; workoutPublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, planPublicId } = params;

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título do treino é obrigatório (máximo 255 caracteres)." };
  }
  const subtitle = (params.subtitle || "").trim().normalize("NFC") || null;
  const notes = (params.notes || "").trim().normalize("NFC") || null;

  let weekday: number | null = null;
  if (params.scheduledWeekday !== undefined && params.scheduledWeekday !== null) {
    const parsedWk = Number(params.scheduledWeekday);
    if (!Number.isInteger(parsedWk) || parsedWk < 1 || parsedWk > 7) {
      return { success: false, error: "Dia da semana deve ser entre 1 (Segunda) e 7 (Domingo)." };
    }
    weekday = parsedWk;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const lockRes = await lockEditableDraftPlan(
      connection,
      actorUserId,
      consultancySlug,
      planPublicId
    );
    if (!lockRes.success) {
      await connection.rollback();
      return { success: false, error: lockRes.error };
    }

    const [sortRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM training_workouts
       WHERE training_plan_id = ? AND deleted_at IS NULL;`,
      [lockRes.planId]
    );
    const nextSort = Number(sortRows[0].next_sort);

    const workoutPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO training_workouts (
        public_id, training_plan_id, title, subtitle, scheduled_weekday, sort_order, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [workoutPublicId, lockRes.planId, title, subtitle, weekday, nextSort, notes]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [lockRes.planId]
    );

    await connection.commit();
    return { success: true, workoutPublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao criar treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Atualiza um Workout existente.
 */
export async function updateTrainingWorkout(params: {
  actorUserId: number;
  consultancySlug: string;
  workoutPublicId: string;
  title: string;
  subtitle?: string | null;
  scheduledWeekday?: number | null;
  notes?: string | null;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, workoutPublicId } = params;

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título do treino é obrigatório (máximo 255 caracteres)." };
  }
  const subtitle = (params.subtitle || "").trim().normalize("NFC") || null;
  const notes = (params.notes || "").trim().normalize("NFC") || null;

  let weekday: number | null = null;
  if (params.scheduledWeekday !== undefined && params.scheduledWeekday !== null) {
    const parsedWk = Number(params.scheduledWeekday);
    if (!Number.isInteger(parsedWk) || parsedWk < 1 || parsedWk > 7) {
      return { success: false, error: "Dia da semana inválido." };
    }
    weekday = parsedWk;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tw.id, tw.training_plan_id
       FROM training_workouts tw
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tw.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, workoutPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(wRows) || wRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Treino não encontrado ou sem permissão." };
    }

    const workoutId = Number(wRows[0].id);
    const planId = Number(wRows[0].training_plan_id);

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workouts
       SET title = ?, subtitle = ?, scheduled_weekday = ?, notes = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [title, subtitle, weekday, notes, workoutId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao atualizar treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Reordena um Workout (Move UP / DOWN).
 */
export async function moveTrainingWorkout(params: {
  actorUserId: number;
  consultancySlug: string;
  workoutPublicId: string;
  direction: "UP" | "DOWN";
}): Promise<{ success: true; moved: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, workoutPublicId, direction } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tw.id, tw.training_plan_id, tw.sort_order
       FROM training_workouts tw
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tw.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, workoutPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(wRows) || wRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Treino não encontrado." };
    }

    const currentWorkout = wRows[0];
    const planId = Number(currentWorkout.training_plan_id);

    const [allSiblings] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sort_order FROM training_workouts
       WHERE training_plan_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [planId]
    );

    const index = allSiblings.findIndex((s: RowDataPacket) => Number(s.id) === Number(currentWorkout.id));
    if (index === -1) {
      await connection.rollback();
      return { success: false, error: "Erro ao localizar treino." };
    }

    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allSiblings.length) {
      await connection.rollback();
      return { success: true, moved: false };
    }

    const targetSibling = allSiblings[targetIndex];

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workouts SET sort_order = -1 WHERE id = ?;`,
      [currentWorkout.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workouts SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [currentWorkout.sort_order, targetSibling.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workouts SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [targetSibling.sort_order, currentWorkout.id]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, moved: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao reordenar treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Remove (Soft delete) um Workout e todos os seus descendentes em cascata.
 */
export async function removeTrainingWorkout(params: {
  actorUserId: number;
  consultancySlug: string;
  workoutPublicId: string;
}): Promise<{ success: true; removed: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, workoutPublicId } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tw.id, tw.training_plan_id
       FROM training_workouts tw
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tw.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, workoutPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(wRows) || wRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Treino não encontrado ou sem permissão." };
    }

    const workoutId = Number(wRows[0].id);
    const planId = Number(wRows[0].training_plan_id);

    // Soft delete exercises
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       SET twbe.deleted_at = UTC_TIMESTAMP(3)
       WHERE tws.workout_id = ? AND twbe.deleted_at IS NULL;`,
      [workoutId]
    );

    // Soft delete blocks
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       SET twb.deleted_at = UTC_TIMESTAMP(3)
       WHERE tws.workout_id = ? AND twb.deleted_at IS NULL;`,
      [workoutId]
    );

    // Soft delete sections
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE workout_id = ? AND deleted_at IS NULL;`,
      [workoutId]
    );

    // Soft delete workout
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workouts
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND deleted_at IS NULL;`,
      [workoutId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, removed: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao remover treino." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Cria uma Section dentro de um Workout.
 */
export async function createTrainingWorkoutSection(params: {
  actorUserId: number;
  consultancySlug: string;
  workoutPublicId: string;
  title: string;
  description?: string | null;
}): Promise<{ success: true; sectionPublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, workoutPublicId } = params;

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título da seção é obrigatório (máximo 255 caracteres)." };
  }
  const description = (params.description || "").trim().normalize("NFC") || null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tw.id, tw.training_plan_id
       FROM training_workouts tw
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tw.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, workoutPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(wRows) || wRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Treino não encontrado ou sem permissão." };
    }

    const workoutId = Number(wRows[0].id);
    const planId = Number(wRows[0].training_plan_id);

    const [sortRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM training_workout_sections
       WHERE workout_id = ? AND deleted_at IS NULL;`,
      [workoutId]
    );
    const nextSort = Number(sortRows[0].next_sort);

    const sectionPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO training_workout_sections (
        public_id, workout_id, title, description, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [sectionPublicId, workoutId, title, description, nextSort]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, sectionPublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao criar seção." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Atualiza uma Section.
 */
export async function updateTrainingWorkoutSection(params: {
  actorUserId: number;
  consultancySlug: string;
  sectionPublicId: string;
  title: string;
  description?: string | null;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, sectionPublicId } = params;

  const title = (params.title || "").trim().normalize("NFC");
  if (!title || title.length > 255) {
    return { success: false, error: "O título da seção é obrigatório (máximo 255 caracteres)." };
  }
  const description = (params.description || "").trim().normalize("NFC") || null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [sRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tws.id, tp.id AS plan_id
       FROM training_workout_sections tws
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tws.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, sectionPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(sRows) || sRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada ou sem permissão." };
    }

    const sectionId = Number(sRows[0].id);
    const planId = Number(sRows[0].plan_id);

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections
       SET title = ?, description = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [title, description, sectionId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao atualizar seção." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Reordena uma Section dentro do mesmo Workout (Move UP / DOWN).
 */
export async function moveTrainingWorkoutSection(params: {
  actorUserId: number;
  consultancySlug: string;
  sectionPublicId: string;
  direction: "UP" | "DOWN";
}): Promise<{ success: true; moved: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, sectionPublicId, direction } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [sRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tws.id, tws.workout_id, tws.sort_order, tp.id AS plan_id
       FROM training_workout_sections tws
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tws.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, sectionPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(sRows) || sRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada." };
    }

    const currentSection = sRows[0];
    const workoutId = Number(currentSection.workout_id);
    const planId = Number(currentSection.plan_id);

    const [allSiblings] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sort_order FROM training_workout_sections
       WHERE workout_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [workoutId]
    );

    const index = allSiblings.findIndex((s: RowDataPacket) => Number(s.id) === Number(currentSection.id));
    if (index === -1) {
      await connection.rollback();
      return { success: false, error: "Erro ao localizar seção." };
    }

    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allSiblings.length) {
      await connection.rollback();
      return { success: true, moved: false };
    }

    const targetSibling = allSiblings[targetIndex];

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections SET sort_order = -1 WHERE id = ?;`,
      [currentSection.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [currentSection.sort_order, targetSibling.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [targetSibling.sort_order, currentSection.id]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, moved: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao reordenar seção." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Remove (Soft delete) uma Section e seus blocos/exercícios descendentes.
 */
export async function removeTrainingWorkoutSection(params: {
  actorUserId: number;
  consultancySlug: string;
  sectionPublicId: string;
}): Promise<{ success: true; removed: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, sectionPublicId } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [sRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tws.id, tp.id AS plan_id
       FROM training_workout_sections tws
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tws.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, sectionPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(sRows) || sRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada ou sem permissão." };
    }

    const sectionId = Number(sRows[0].id);
    const planId = Number(sRows[0].plan_id);

    // Soft delete exercises
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       SET twbe.deleted_at = UTC_TIMESTAMP(3)
       WHERE twb.section_id = ? AND twbe.deleted_at IS NULL;`,
      [sectionId]
    );

    // Soft delete blocks
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE section_id = ? AND deleted_at IS NULL;`,
      [sectionId]
    );

    // Soft delete section
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_sections
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND deleted_at IS NULL;`,
      [sectionId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, removed: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao remover seção." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Cria um Block dentro de uma Section (SINGLE, BI_SET, TRI_SET, SUPERSET, CIRCUIT).
 */
export async function createTrainingWorkoutBlock(params: {
  actorUserId: number;
  consultancySlug: string;
  sectionPublicId: string;
  blockType: TrainingBlockType;
  title?: string | null;
  rounds?: number | null;
  restBetweenExercisesSeconds?: number | null;
  restAfterBlockSeconds?: number | null;
  instructions?: string | null;
}): Promise<{ success: true; blockPublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, sectionPublicId, blockType } = params;

  if (!ALLOWED_BLOCK_TYPES.includes(blockType)) {
    return { success: false, error: "Tipo de bloco inválido." };
  }

  const title = (params.title || "").trim().normalize("NFC") || null;
  const instructions = (params.instructions || "").trim().normalize("NFC") || null;
  const rounds = params.rounds !== undefined && params.rounds !== null ? Math.max(1, Number(params.rounds)) : null;
  const restBetween =
    params.restBetweenExercisesSeconds !== undefined && params.restBetweenExercisesSeconds !== null
      ? Math.max(0, Number(params.restBetweenExercisesSeconds))
      : null;
  const restAfter =
    params.restAfterBlockSeconds !== undefined && params.restAfterBlockSeconds !== null
      ? Math.max(0, Number(params.restAfterBlockSeconds))
      : null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [sRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tws.id, tp.id AS plan_id
       FROM training_workout_sections tws
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE tws.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, sectionPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(sRows) || sRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada ou sem permissão." };
    }

    const sectionId = Number(sRows[0].id);
    const planId = Number(sRows[0].plan_id);

    const [sortRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM training_workout_blocks
       WHERE section_id = ? AND deleted_at IS NULL;`,
      [sectionId]
    );
    const nextSort = Number(sortRows[0].next_sort);

    const blockPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO training_workout_blocks (
        public_id, section_id, block_type, title, rounds, rest_between_exercises_seconds, rest_after_block_seconds, instructions, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [
        blockPublicId,
        sectionId,
        blockType,
        title,
        rounds,
        restBetween,
        restAfter,
        instructions,
        nextSort,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, blockPublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao criar bloco." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Atualiza um Block existente.
 */
export async function updateTrainingWorkoutBlock(params: {
  actorUserId: number;
  consultancySlug: string;
  blockPublicId: string;
  blockType: TrainingBlockType;
  title?: string | null;
  rounds?: number | null;
  restBetweenExercisesSeconds?: number | null;
  restAfterBlockSeconds?: number | null;
  instructions?: string | null;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockPublicId, blockType } = params;

  if (!ALLOWED_BLOCK_TYPES.includes(blockType)) {
    return { success: false, error: "Tipo de bloco inválido." };
  }

  const title = (params.title || "").trim().normalize("NFC") || null;
  const instructions = (params.instructions || "").trim().normalize("NFC") || null;
  const rounds = params.rounds !== undefined && params.rounds !== null ? Math.max(1, Number(params.rounds)) : null;
  const restBetween =
    params.restBetweenExercisesSeconds !== undefined && params.restBetweenExercisesSeconds !== null
      ? Math.max(0, Number(params.restBetweenExercisesSeconds))
      : null;
  const restAfter =
    params.restAfterBlockSeconds !== undefined && params.restAfterBlockSeconds !== null
      ? Math.max(0, Number(params.restAfterBlockSeconds))
      : null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twb.id, tp.id AS plan_id
       FROM training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twb.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(bRows) || bRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Bloco não encontrado ou sem permissão." };
    }

    const blockId = Number(bRows[0].id);
    const planId = Number(bRows[0].plan_id);

    // Validar contagem atual de exercícios vs novo tipo de bloco
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM training_workout_block_exercises WHERE block_id = ? AND deleted_at IS NULL;`,
      [blockId]
    );
    const currentExercisesCount = Number(countRows[0].total);

    if (blockType === "SINGLE" && currentExercisesCount > 1) {
      await connection.rollback();
      return { success: false, error: `Não é possível mudar para Exercício Normal (SINGLE) pois o bloco já contém ${currentExercisesCount} exercícios.` };
    }
    if (blockType === "BI_SET" && currentExercisesCount > 2) {
      await connection.rollback();
      return { success: false, error: `Não é possível mudar para Bi-Set pois o bloco já contém ${currentExercisesCount} exercícios (máximo 2).` };
    }
    if (blockType === "TRI_SET" && currentExercisesCount > 3) {
      await connection.rollback();
      return { success: false, error: `Não é possível mudar para Tri-Set pois o bloco já contém ${currentExercisesCount} exercícios (máximo 3).` };
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks
       SET block_type = ?, title = ?, rounds = ?, rest_between_exercises_seconds = ?, rest_after_block_seconds = ?, instructions = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [blockType, title, rounds, restBetween, restAfter, instructions, blockId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao atualizar bloco." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Reordena um Block dentro da Section.
 */
export async function moveTrainingWorkoutBlock(params: {
  actorUserId: number;
  consultancySlug: string;
  blockPublicId: string;
  direction: "UP" | "DOWN";
}): Promise<{ success: true; moved: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockPublicId, direction } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twb.id, twb.section_id, twb.sort_order, tp.id AS plan_id
       FROM training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twb.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(bRows) || bRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Bloco não encontrado." };
    }

    const currentBlock = bRows[0];
    const sectionId = Number(currentBlock.section_id);
    const planId = Number(currentBlock.plan_id);

    const [allSiblings] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sort_order FROM training_workout_blocks
       WHERE section_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [sectionId]
    );

    const index = allSiblings.findIndex((s: RowDataPacket) => Number(s.id) === Number(currentBlock.id));
    if (index === -1) {
      await connection.rollback();
      return { success: false, error: "Erro ao localizar bloco." };
    }

    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allSiblings.length) {
      await connection.rollback();
      return { success: true, moved: false };
    }

    const targetSibling = allSiblings[targetIndex];

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks SET sort_order = -1 WHERE id = ?;`,
      [currentBlock.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [currentBlock.sort_order, targetSibling.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [targetSibling.sort_order, currentBlock.id]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, moved: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao reordenar bloco." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Remove (Soft delete) um Block e seus exercícios.
 */
export async function removeTrainingWorkoutBlock(params: {
  actorUserId: number;
  consultancySlug: string;
  blockPublicId: string;
}): Promise<{ success: true; removed: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockPublicId } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twb.id, tp.id AS plan_id
       FROM training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twb.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(bRows) || bRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Bloco não encontrado ou sem permissão." };
    }

    const blockId = Number(bRows[0].id);
    const planId = Number(bRows[0].plan_id);

    // Soft delete exercises
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE block_id = ? AND deleted_at IS NULL;`,
      [blockId]
    );

    // Soft delete block
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_blocks
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND deleted_at IS NULL;`,
      [blockId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, removed: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao remover bloco." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Adiciona um exercício da biblioteca ACTIVE ao Block copiando snapshot.
 */
export async function addTrainingBlockExerciseFromLibrary(params: {
  actorUserId: number;
  consultancySlug: string;
  blockPublicId: string;
  exercisePublicId: string;
  sets?: number | null;
  repetitionsText?: string | null;
  restSeconds?: number | null;
  loadGuidance?: string | null;
  technique?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}): Promise<{ success: true; blockExercisePublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockPublicId, exercisePublicId } = params;

  let parsedVideo: ParsedVideo;
  try {
    parsedVideo = parseVideoUrl(params.videoUrl);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "URL de vídeo inválida." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Lock block & hierarchy
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twb.id, twb.block_type, tp.id AS plan_id, c.id AS consultancy_id
       FROM training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twb.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(bRows) || bRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Bloco não encontrado ou sem permissão." };
    }

    const blockId = Number(bRows[0].id);
    const blockType = String(bRows[0].block_type);
    const planId = Number(bRows[0].plan_id);
    const consultancyId = Number(bRows[0].consultancy_id);

    // Validar limites do bloco
    const [cntRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM training_workout_block_exercises WHERE block_id = ? AND deleted_at IS NULL FOR UPDATE;`,
      [blockId]
    );
    const count = Number(cntRows[0].total);

    if (blockType === "SINGLE" && count >= 1) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Exercício Normal (SINGLE) aceita no máximo 1 exercício." };
    }
    if (blockType === "BI_SET" && count >= 2) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Bi-Set aceita no máximo 2 exercícios." };
    }
    if (blockType === "TRI_SET" && count >= 3) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Tri-Set aceita no máximo 3 exercícios." };
    }

    // Buscar exercício ACTIVE na biblioteca do tenant
    const [exRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name, description, muscle_group, equipment, instructions
       FROM training_exercises
       WHERE public_id = ?
         AND consultancy_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [exercisePublicId.trim(), consultancyId]
    );
    if (!Array.isArray(exRows) || exRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado ou inativo na biblioteca." };
    }
    const catalogExercise = exRows[0];

    const [sortRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM training_workout_block_exercises
       WHERE block_id = ? AND deleted_at IS NULL;`,
      [blockId]
    );
    const nextSort = Number(sortRows[0].next_sort);

    const blockExercisePublicId = crypto.randomUUID();
    const sets = params.sets !== undefined && params.sets !== null ? Math.max(1, Number(params.sets)) : null;
    const restSec = params.restSeconds !== undefined && params.restSeconds !== null ? Math.max(0, Number(params.restSeconds)) : null;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO training_workout_block_exercises (
        public_id,
        block_id,
        exercise_id,
        sort_order,
        exercise_name_snapshot,
        description_snapshot,
        muscle_group_snapshot,
        equipment_snapshot,
        instructions_snapshot,
        sets,
        repetitions_text,
        rest_seconds,
        load_guidance,
        technique,
        notes,
        video_url,
        video_provider,
        video_external_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [
        blockExercisePublicId,
        blockId,
        catalogExercise.id,
        nextSort,
        catalogExercise.name,
        catalogExercise.description,
        catalogExercise.muscle_group,
        catalogExercise.equipment,
        catalogExercise.instructions,
        sets,
        (params.repetitionsText || "").trim().normalize("NFC") || null,
        restSec,
        (params.loadGuidance || "").trim().normalize("NFC") || null,
        (params.technique || "").trim().normalize("NFC") || null,
        (params.notes || "").trim().normalize("NFC") || null,
        parsedVideo.videoUrl,
        parsedVideo.videoProvider,
        parsedVideo.videoExternalId,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, blockExercisePublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao adicionar exercício ao bloco." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Adiciona um exercício personalizado (custom) ao Block com exercise_id = NULL.
 */
export async function addCustomTrainingBlockExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  blockPublicId: string;
  name: string;
  description?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  instructions?: string | null;
  sets?: number | null;
  repetitionsText?: string | null;
  restSeconds?: number | null;
  loadGuidance?: string | null;
  technique?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}): Promise<{ success: true; blockExercisePublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockPublicId } = params;

  const name = (params.name || "").trim().normalize("NFC");
  if (!name || name.length > 255) {
    return { success: false, error: "O nome do exercício é obrigatório (máximo 255 caracteres)." };
  }

  let parsedVideo: ParsedVideo;
  try {
    parsedVideo = parseVideoUrl(params.videoUrl);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "URL de vídeo inválida." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twb.id, twb.block_type, tp.id AS plan_id
       FROM training_workout_blocks twb
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twb.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockPublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(bRows) || bRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Bloco não encontrado ou sem permissão." };
    }

    const blockId = Number(bRows[0].id);
    const blockType = String(bRows[0].block_type);
    const planId = Number(bRows[0].plan_id);

    const [cntRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM training_workout_block_exercises WHERE block_id = ? AND deleted_at IS NULL FOR UPDATE;`,
      [blockId]
    );
    const count = Number(cntRows[0].total);

    if (blockType === "SINGLE" && count >= 1) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Exercício Normal (SINGLE) aceita no máximo 1 exercício." };
    }
    if (blockType === "BI_SET" && count >= 2) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Bi-Set aceita no máximo 2 exercícios." };
    }
    if (blockType === "TRI_SET" && count >= 3) {
      await connection.rollback();
      return { success: false, error: "Bloco do tipo Tri-Set aceita no máximo 3 exercícios." };
    }

    const [sortRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
       FROM training_workout_block_exercises
       WHERE block_id = ? AND deleted_at IS NULL;`,
      [blockId]
    );
    const nextSort = Number(sortRows[0].next_sort);

    const blockExercisePublicId = crypto.randomUUID();
    const sets = params.sets !== undefined && params.sets !== null ? Math.max(1, Number(params.sets)) : null;
    const restSec = params.restSeconds !== undefined && params.restSeconds !== null ? Math.max(0, Number(params.restSeconds)) : null;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO training_workout_block_exercises (
        public_id,
        block_id,
        exercise_id,
        sort_order,
        exercise_name_snapshot,
        description_snapshot,
        muscle_group_snapshot,
        equipment_snapshot,
        instructions_snapshot,
        sets,
        repetitions_text,
        rest_seconds,
        load_guidance,
        technique,
        notes,
        video_url,
        video_provider,
        video_external_id,
        created_at,
        updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [
        blockExercisePublicId,
        blockId,
        nextSort,
        name,
        (params.description || "").trim().normalize("NFC") || null,
        (params.muscleGroup || "").trim().normalize("NFC") || null,
        (params.equipment || "").trim().normalize("NFC") || null,
        (params.instructions || "").trim().normalize("NFC") || null,
        sets,
        (params.repetitionsText || "").trim().normalize("NFC") || null,
        restSec,
        (params.loadGuidance || "").trim().normalize("NFC") || null,
        (params.technique || "").trim().normalize("NFC") || null,
        (params.notes || "").trim().normalize("NFC") || null,
        parsedVideo.videoUrl,
        parsedVideo.videoProvider,
        parsedVideo.videoExternalId,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, blockExercisePublicId };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao adicionar exercício personalizado." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Atualiza um exercício prescrito (snapshots + campos de prescrição).
 */
export async function updateTrainingBlockExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  blockExercisePublicId: string;
  nameSnapshot: string;
  descriptionSnapshot?: string | null;
  muscleGroupSnapshot?: string | null;
  equipmentSnapshot?: string | null;
  instructionsSnapshot?: string | null;
  sets?: number | null;
  repetitionsText?: string | null;
  restSeconds?: number | null;
  loadGuidance?: string | null;
  technique?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockExercisePublicId } = params;

  const name = (params.nameSnapshot || "").trim().normalize("NFC");
  if (!name || name.length > 255) {
    return { success: false, error: "O nome do exercício é obrigatório (máximo 255 caracteres)." };
  }

  let parsedVideo: ParsedVideo;
  try {
    parsedVideo = parseVideoUrl(params.videoUrl);
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "URL de vídeo inválida." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twbe.id, tp.id AS plan_id
       FROM training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twbe.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twbe.deleted_at IS NULL
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockExercisePublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado ou sem permissão." };
    }

    const exerciseItemId = Number(eRows[0].id);
    const planId = Number(eRows[0].plan_id);

    const sets = params.sets !== undefined && params.sets !== null ? Math.max(1, Number(params.sets)) : null;
    const restSec = params.restSeconds !== undefined && params.restSeconds !== null ? Math.max(0, Number(params.restSeconds)) : null;

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises
       SET exercise_name_snapshot = ?,
           description_snapshot = ?,
           muscle_group_snapshot = ?,
           equipment_snapshot = ?,
           instructions_snapshot = ?,
           sets = ?,
           repetitions_text = ?,
           rest_seconds = ?,
           load_guidance = ?,
           technique = ?,
           notes = ?,
           video_url = ?,
           video_provider = ?,
           video_external_id = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [
        name,
        (params.descriptionSnapshot || "").trim().normalize("NFC") || null,
        (params.muscleGroupSnapshot || "").trim().normalize("NFC") || null,
        (params.equipmentSnapshot || "").trim().normalize("NFC") || null,
        (params.instructionsSnapshot || "").trim().normalize("NFC") || null,
        sets,
        (params.repetitionsText || "").trim().normalize("NFC") || null,
        restSec,
        (params.loadGuidance || "").trim().normalize("NFC") || null,
        (params.technique || "").trim().normalize("NFC") || null,
        (params.notes || "").trim().normalize("NFC") || null,
        parsedVideo.videoUrl,
        parsedVideo.videoProvider,
        parsedVideo.videoExternalId,
        exerciseItemId,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao atualizar exercício." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Reordena um exercício dentro do mesmo Block.
 */
export async function moveTrainingBlockExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  blockExercisePublicId: string;
  direction: "UP" | "DOWN";
}): Promise<{ success: true; moved: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockExercisePublicId, direction } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twbe.id, twbe.block_id, twbe.sort_order, tp.id AS plan_id
       FROM training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twbe.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twbe.deleted_at IS NULL
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockExercisePublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado." };
    }

    const currentExercise = eRows[0];
    const blockId = Number(currentExercise.block_id);
    const planId = Number(currentExercise.plan_id);

    const [allSiblings] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sort_order FROM training_workout_block_exercises
       WHERE block_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [blockId]
    );

    const index = allSiblings.findIndex((s: RowDataPacket) => Number(s.id) === Number(currentExercise.id));
    if (index === -1) {
      await connection.rollback();
      return { success: false, error: "Erro ao localizar exercício." };
    }

    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allSiblings.length) {
      await connection.rollback();
      return { success: true, moved: false };
    }

    const targetSibling = allSiblings[targetIndex];

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises SET sort_order = -1 WHERE id = ?;`,
      [currentExercise.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [currentExercise.sort_order, targetSibling.id]
    );
    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises SET sort_order = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [targetSibling.sort_order, currentExercise.id]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, moved: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao reordenar exercício." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Remove (Soft delete) um exercício do bloco.
 */
export async function removeTrainingBlockExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  blockExercisePublicId: string;
}): Promise<{ success: true; removed: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, blockExercisePublicId } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT twbe.id, tp.id AS plan_id
       FROM training_workout_block_exercises twbe
       INNER JOIN training_workout_blocks twb ON twb.id = twbe.block_id
       INNER JOIN training_workout_sections tws ON tws.id = twb.section_id
       INNER JOIN training_workouts tw ON tw.id = tws.workout_id
       INNER JOIN training_plans tp ON tp.id = tw.training_plan_id
       INNER JOIN consultancies c ON c.id = tp.consultancy_id
       INNER JOIN consultancy_members cm ON cm.user_id = ? AND cm.consultancy_id = c.id AND cm.status = 'ACTIVE'
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE twbe.public_id = ?
         AND c.slug = ?
         AND tp.created_by_user_id = ?
         AND tp.status = 'DRAFT'
         AND twbe.deleted_at IS NULL
         AND twb.deleted_at IS NULL
         AND tws.deleted_at IS NULL
         AND tw.deleted_at IS NULL
         AND tp.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, blockExercisePublicId.trim(), consultancySlug.trim(), actorUserId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado ou sem permissão." };
    }

    const exerciseItemId = Number(eRows[0].id);
    const planId = Number(eRows[0].plan_id);

    await connection.execute<ResultSetHeader>(
      `UPDATE training_workout_block_exercises
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND deleted_at IS NULL;`,
      [exerciseItemId]
    );

    await connection.execute<ResultSetHeader>(
      `UPDATE training_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, removed: true };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro ao remover exercício." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Lista exercícios da biblioteca para um PERSONAL da consultoria.
 * Suporta busca server-side (name, muscle_group, equipment), filtro de status e paginação.
 */
export async function listTrainingExercisesForPersonal(params: {
  actorUserId: number;
  consultancySlug: string;
  search?: string;
  statusFilter?: "ALL" | "ACTIVE" | "INACTIVE";
  page?: number;
  pageSize?: number;
}): Promise<ListTrainingExercisesResult | null> {
  const {
    actorUserId,
    consultancySlug,
    search = "",
    statusFilter = "ALL",
    page = 1,
    pageSize = 25,
  } = params;

  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !consultancySlug.trim()
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("PERSONAL")) {
    return null;
  }

  const validPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const validPageSize =
    Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100
      ? pageSize
      : 25;
  const offset = (validPage - 1) * validPageSize;

  const validStatus =
    statusFilter === "ACTIVE" || statusFilter === "INACTIVE"
      ? statusFilter
      : "ALL";

  const rawSearch = (search || "").trim().normalize("NFC");
  const hasSearch = rawSearch.length > 0;
  const escapedSearch = rawSearch.replace(/[%_\\]/g, "\\$&");
  const searchPattern = `%${escapedSearch}%`;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const whereConditions: string[] = [
      "consultancy_id = ?",
      "deleted_at IS NULL",
    ];
    const queryParams: (string | number)[] = [context.consultancyId];

    if (validStatus !== "ALL") {
      whereConditions.push("status = ?");
      queryParams.push(validStatus);
    }

    if (hasSearch) {
      whereConditions.push(
        "(name LIKE ? OR muscle_group LIKE ? OR equipment LIKE ?)"
      );
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.join(" AND ");

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM training_exercises WHERE ${whereClause};`,
      queryParams
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id,
        name,
        description,
        muscle_group,
        equipment,
        instructions,
        status,
        created_at,
        updated_at
       FROM training_exercises
       WHERE ${whereClause}
       ORDER BY name ASC, public_id ASC
       LIMIT ? OFFSET ?;`,
      [...queryParams, String(validPageSize), String(offset)]
    );

    const items: TrainingExerciseItemDto[] = rows.map((row) => ({
      publicId: String(row.public_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      muscleGroup: row.muscle_group ? String(row.muscle_group) : null,
      equipment: row.equipment ? String(row.equipment) : null,
      instructions: row.instructions ? String(row.instructions) : null,
      status: String(row.status) as TrainingExerciseStatus,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));

    const totalPages = Math.ceil(total / validPageSize) || 1;

    return {
      items,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Busca um exercício específico da biblioteca para o PERSONAL.
 */
export async function getTrainingExerciseForPersonal(params: {
  actorUserId: number;
  consultancySlug: string;
  exercisePublicId: string;
}): Promise<TrainingExerciseItemDto | null> {
  const { actorUserId, consultancySlug, exercisePublicId } = params;

  if (
    !actorUserId ||
    !consultancySlug ||
    !exercisePublicId ||
    typeof exercisePublicId !== "string"
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("PERSONAL")) {
    return null;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id,
        name,
        description,
        muscle_group,
        equipment,
        instructions,
        status,
        created_at,
        updated_at
       FROM training_exercises
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1;`,
      [exercisePublicId.trim(), context.consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      publicId: String(row.public_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      muscleGroup: row.muscle_group ? String(row.muscle_group) : null,
      equipment: row.equipment ? String(row.equipment) : null,
      instructions: row.instructions ? String(row.instructions) : null,
      status: String(row.status) as TrainingExerciseStatus,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Cria um novo exercício na biblioteca da consultoria (PERSONAL obrigatório, status ACTIVE).
 */
export async function createTrainingExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  name: string;
  description?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  instructions?: string | null;
}): Promise<
  { success: true; exercisePublicId: string } | { success: false; error: string }
> {
  const { actorUserId, consultancySlug } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }

  const name = (params.name || "").trim().normalize("NFC");
  if (!name || name.length > 255) {
    return { success: false, error: "O nome do exercício é obrigatório (máximo 255 caracteres)." };
  }

  const description = (params.description || "").trim().normalize("NFC") || null;
  const muscleGroup = (params.muscleGroup || "").trim().normalize("NFC") || null;
  if (muscleGroup && muscleGroup.length > 100) {
    return { success: false, error: "O grupo muscular deve ter no máximo 100 caracteres." };
  }

  const equipment = (params.equipment || "").trim().normalize("NFC") || null;
  if (equipment && equipment.length > 100) {
    return { success: false, error: "O equipamento deve ter no máximo 100 caracteres." };
  }

  const instructions = (params.instructions || "").trim().normalize("NFC") || null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    const [uRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [actorUserId]
    );
    if (!Array.isArray(uRows) || uRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Usuário inválido ou inativo." };
    }

    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr
         ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente. Apenas Personal Trainers podem cadastrar exercícios." };
    }

    const exercisePublicId = crypto.randomUUID();
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO training_exercises (
        public_id,
        consultancy_id,
        name,
        description,
        muscle_group,
        equipment,
        instructions,
        status,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
      [
        exercisePublicId,
        consultancyId,
        name,
        description,
        muscleGroup,
        equipment,
        instructions,
        actorUserId,
      ]
    );

    if (insertResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Erro ao cadastrar exercício." };
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_EXERCISE_CREATED', 'TRAINING_EXERCISE', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, exercisePublicId]
    );

    await connection.commit();
    return { success: true, exercisePublicId };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro interno ao processar cadastro do exercício." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Atualiza os dados de um exercício da biblioteca (PERSONAL obrigatório, no-op detectado).
 */
export async function updateTrainingExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  exercisePublicId: string;
  name: string;
  description?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  instructions?: string | null;
}): Promise<
  | { success: true; updated: boolean; message?: string }
  | { success: false; error: string }
> {
  const { actorUserId, consultancySlug, exercisePublicId } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!exercisePublicId || typeof exercisePublicId !== "string" || !exercisePublicId.trim()) {
    return { success: false, error: "Identificador do exercício inválido." };
  }

  const name = (params.name || "").trim().normalize("NFC");
  if (!name || name.length > 255) {
    return { success: false, error: "O nome do exercício é obrigatório (máximo 255 caracteres)." };
  }

  const description = (params.description || "").trim().normalize("NFC") || null;
  const muscleGroup = (params.muscleGroup || "").trim().normalize("NFC") || null;
  if (muscleGroup && muscleGroup.length > 100) {
    return { success: false, error: "O grupo muscular deve ter no máximo 100 caracteres." };
  }

  const equipment = (params.equipment || "").trim().normalize("NFC") || null;
  if (equipment && equipment.length > 100) {
    return { success: false, error: "O equipamento deve ter no máximo 100 caracteres." };
  }

  const instructions = (params.instructions || "").trim().normalize("NFC") || null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr
         ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente para editar exercícios." };
    }

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name, description, muscle_group, equipment, instructions, status
       FROM training_exercises
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [exercisePublicId.trim(), consultancyId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado nesta consultoria." };
    }

    const current = eRows[0];
    const status = String(current.status);
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      await connection.rollback();
      return { success: false, error: "Estado do exercício inválido para edição." };
    }

    const currentName = String(current.name);
    const currentDesc = current.description ? String(current.description) : null;
    const currentMuscle = current.muscle_group ? String(current.muscle_group) : null;
    const currentEquip = current.equipment ? String(current.equipment) : null;
    const currentInst = current.instructions ? String(current.instructions) : null;

    const isIdentical =
      currentName === name &&
      currentDesc === description &&
      currentMuscle === muscleGroup &&
      currentEquip === equipment &&
      currentInst === instructions;

    if (isIdentical) {
      await connection.rollback();
      return { success: true, updated: false, message: "Nenhuma alteração necessária." };
    }

    const exerciseId = Number(current.id);
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE training_exercises
       SET name = ?,
           description = ?,
           muscle_group = ?,
           equipment = ?,
           instructions = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [name, description, muscleGroup, equipment, instructions, exerciseId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível atualizar o exercício." };
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_EXERCISE_UPDATED', 'TRAINING_EXERCISE', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, exercisePublicId.trim()]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro interno ao atualizar o exercício." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Desativa um exercício da biblioteca (ACTIVE -> INACTIVE, idempotente).
 */
export async function deactivateTrainingExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  exercisePublicId: string;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, exercisePublicId } = params;

  if (!actorUserId || !consultancySlug || !exercisePublicId) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr
         ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente para desativar exercícios." };
    }

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM training_exercises
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [exercisePublicId.trim(), consultancyId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado nesta consultoria." };
    }

    const currentStatus = String(eRows[0].status);
    if (currentStatus === "INACTIVE") {
      await connection.rollback();
      return { success: true, updated: false };
    }
    if (currentStatus !== "ACTIVE") {
      await connection.rollback();
      return { success: false, error: "Estado do exercício inválido para desativação." };
    }

    const exerciseId = Number(eRows[0].id);
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE training_exercises
       SET status = 'INACTIVE',
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND status = 'ACTIVE';`,
      [exerciseId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível desativar o exercício." };
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_EXERCISE_DEACTIVATED', 'TRAINING_EXERCISE', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, exercisePublicId.trim()]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro interno ao desativar o exercício." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Reativa um exercício da biblioteca (INACTIVE -> ACTIVE, idempotente).
 */
export async function reactivateTrainingExercise(params: {
  actorUserId: number;
  consultancySlug: string;
  exercisePublicId: string;
}): Promise<{ success: true; updated: boolean } | { success: false; error: string }> {
  const { actorUserId, consultancySlug, exercisePublicId } = params;

  if (!actorUserId || !consultancySlug || !exercisePublicId) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [consultancySlug.trim()]
    );
    if (!Array.isArray(cRows) || cRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    const [mRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr
         ON cmr.member_id = cm.id AND cmr.role = 'PERSONAL'
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [actorUserId, consultancyId]
    );
    if (!Array.isArray(mRows) || mRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Permissão insuficiente para reativar exercícios." };
    }

    const [eRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM training_exercises
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [exercisePublicId.trim(), consultancyId]
    );
    if (!Array.isArray(eRows) || eRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Exercício não encontrado nesta consultoria." };
    }

    const currentStatus = String(eRows[0].status);
    if (currentStatus === "ACTIVE") {
      await connection.rollback();
      return { success: true, updated: false };
    }
    if (currentStatus !== "INACTIVE") {
      await connection.rollback();
      return { success: false, error: "Estado do exercício inválido para reativação." };
    }

    const exerciseId = Number(eRows[0].id);
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE training_exercises
       SET status = 'ACTIVE',
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND status = 'INACTIVE';`,
      [exerciseId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível reativar o exercício." };
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (UUID(), ?, ?, 'TRAINING_EXERCISE_REACTIVATED', 'TRAINING_EXERCISE', ?, NULL, UTC_TIMESTAMP(3));`,
      [actorUserId, consultancyId, exercisePublicId.trim()]
    );

    await connection.commit();
    return { success: true, updated: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro interno ao reativar o exercício." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
