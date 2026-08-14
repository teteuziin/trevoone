import type { RowDataPacket } from "mysql2/promise";
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

export type TrainingExerciseItemDto = {
  publicId: string;
  name: string;
  description: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  instructions: string | null;
  status: TrainingExerciseStatus | string;
  createdAt: Date;
};

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
  if (!context || !context.roles.includes("STUDENT")) {
    return null;
  }

  let connection;
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

    // 3. Estruturar a árvore hierárquica na memória
    const workoutsMap = new Map<number, TrainingWorkoutDto>();
    const sectionsMap = new Map<number, TrainingWorkoutSectionDto>();
    const blocksMap = new Map<number, TrainingWorkoutBlockDto>();

    for (const row of itemRows) {
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
      consultancyPublicId: context.consultancyPublicId,
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
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Lista exercícios da biblioteca para um PERSONAL da consultoria.
 * Apenas leitura (read-only), tenant-scoped.
 */
export async function listTrainingExercisesForPersonal(params: {
  actorUserId: number;
  consultancySlug: string;
}): Promise<TrainingExerciseItemDto[] | null> {
  const { actorUserId, consultancySlug } = params;

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

  let connection;
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
        created_at
       FROM training_exercises
       WHERE consultancy_id = ?
         AND deleted_at IS NULL
       ORDER BY name ASC, id ASC;`,
      [context.consultancyId]
    );

    return rows.map((row) => ({
      publicId: String(row.public_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      muscleGroup: row.muscle_group ? String(row.muscle_group) : null,
      equipment: row.equipment ? String(row.equipment) : null,
      instructions: row.instructions ? String(row.instructions) : null,
      status: String(row.status),
      createdAt: new Date(row.created_at),
    }));
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
