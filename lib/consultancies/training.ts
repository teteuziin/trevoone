import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
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
  updatedAt?: Date;
};

export type ListTrainingExercisesResult = {
  items: TrainingExerciseItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  // Escapar caracteres especiais do LIKE (% e _)
  const escapedSearch = rawSearch.replace(/[%_\\]/g, "\\$&");
  const searchPattern = `%${escapedSearch}%`;

  let connection;
  try {
    connection = await getDbConnection();

    // Montar filtros dinâmicos parametrizados
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

    // 1. Contagem total
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM training_exercises WHERE ${whereClause};`,
      queryParams
    );
    const total = Number(countRows[0]?.total || 0);

    // 2. Registros paginados
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

  // Normalização defensiva dos campos
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

  let connection;
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
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    // 2. Revalidar actor user
    const [uRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1;`,
      [actorUserId]
    );
    if (!Array.isArray(uRows) || uRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Usuário inválido ou inativo." };
    }

    // 3. Lock & revalidar actor membership com role PERSONAL
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

    // 4. Inserir exercício na biblioteca
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

    // 5. Registrar evento de auditoria
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

  let connection;
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
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    // 2. Lock & revalidar actor membership com role PERSONAL
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

    // 3. Lock & revalidar exercício tenant-scoped
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

    // 4. Detecção de no-op
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

    // 5. UPDATE dos dados cadastrais
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

    // 6. Registrar auditoria de update
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

  let connection;
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
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    // 2. Lock & revalidar actor membership com role PERSONAL
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

    // 3. Lock exercício
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
      // Idempotente
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

    // Auditoria de desativação
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

  let connection;
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
      return { success: false, error: "Consultoria inválida ou indisponível." };
    }
    const consultancyId = Number(cRows[0].id);

    // 2. Lock & revalidar actor membership com role PERSONAL
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

    // 3. Lock exercício
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
      // Idempotente
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

    // Auditoria de reativação
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
