/**
 * TREVO ONE — TRAINING V2 WORKOUT REPOSITORY
 * Routine management, immutable versions, block/item/set composition, deep cloning, and transactional publishing.
 */

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertCanAuthorTraining,
} from "./access";
import { workoutVersionSchema } from "./validation";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemSetDto,
  BlockItemMediaDto,
  WorkoutBlockType,
  PrescriptionMode,
  WorkoutSetType,
  MediaRole,
  MediaType,
  StorageProvider,
  DifficultyLevel,
} from "./types";

export type CreateWorkoutInput = {
  title: string;
  subtitle?: string | null;
  objective?: string | null;
  estimatedDurationMinutes?: number | null;
  difficultyLevel?: DifficultyLevel | string;
  isTemplate?: boolean;
  notes?: string | null;
};

export type AddBlockInput = {
  blockType: WorkoutBlockType;
  title?: string | null;
  rounds?: number | null;
  restBetweenItemsSeconds?: number | null;
  restBetweenRoundsSeconds?: number | null;
  restAfterBlockSeconds?: number | null;
  instructions?: string | null;
  sortOrder?: number;
};

export type AddItemInput = {
  exercisePublicId?: string | null;
  customSnapshot?: {
    exerciseName: string;
    muscleGroup?: string | null;
    equipment?: string | null;
    instructions?: string | null;
  };
  prescriptionMode?: PrescriptionMode;
  targetCadence?: string | null;
  targetRpe?: number | null;
  targetRir?: number | null;
  methodConfig?: Record<string, unknown> | null;
  customVideoUrl?: string | null;
  notes?: string | null;
  sortOrder?: number;
};

export type AddSetInput = {
  setNumber: number;
  setType: WorkoutSetType;
  parentSetNumber?: number | null;
  targetReps?: number | null;
  targetRepsMax?: number | null;
  targetLoadKg?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRestSeconds?: number | null;
  intensityIndicator?: string | null;
};

/**
 * Creates a new Workout routine root and its initial DRAFT Version (v1).
 */
export async function createWorkout(
  ctx: TrainingAccessContext,
  input: CreateWorkoutInput
): Promise<{ workout: WorkoutRootDto; version: WorkoutVersionDto }> {
  assertCanAuthorTraining(ctx);

  const workoutPublicId = crypto.randomUUID();
  const versionPublicId = crypto.randomUUID();
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert workout root
    const [wRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, subtitle,
        objective, estimated_duration_minutes, difficulty_level, is_template, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE');`,
      [
        workoutPublicId,
        ctx.consultancyId!,
        ctx.membershipId!,
        input.title.trim(),
        input.subtitle?.trim() || null,
        input.objective?.trim() || null,
        input.estimatedDurationMinutes ?? null,
        input.difficultyLevel || "INTERMEDIATE",
        input.isTemplate ? 1 : 0,
      ]
    );
    const workoutId = wRes.insertId;

    // 2. Insert initial draft version (v1) with version-level metadata snapshot
    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', NULL, ?, ?, ?, ?, ?, ?, ?);`,
      [
        versionPublicId,
        workoutId,
        input.title.trim(),
        input.subtitle?.trim() || null,
        input.objective?.trim() || null,
        input.estimatedDurationMinutes ?? null,
        input.difficultyLevel || "INTERMEDIATE",
        input.notes?.trim() || null,
        ctx.membershipId!,
      ]
    );

    await connection.commit();

    const workoutDto: WorkoutRootDto = {
      publicId: workoutPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      objective: input.objective?.trim() || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      difficultyLevel: input.difficultyLevel || "INTERMEDIATE",
      isTemplate: Boolean(input.isTemplate),
      status: "ACTIVE",
      currentPublishedVersion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const versionDto: WorkoutVersionDto = {
      publicId: versionPublicId,
      workoutPublicId,
      versionNumber: 1,
      status: "DRAFT",
      publishedAt: null,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      objective: input.objective?.trim() || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      difficultyLevel: input.difficultyLevel || "INTERMEDIATE",
      notes: input.notes?.trim() || null,
      blocks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { workout: workoutDto, version: versionDto };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves the complete immutable version tree for a workout version.
 */
export async function getWorkoutVersionTree(
  ctx: TrainingAccessContext,
  versionPublicId: string
): Promise<WorkoutVersionDto | null> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch version row
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wv.id,
        wv.public_id,
        wv.version_number,
        wv.status,
        wv.published_at,
        wv.title,
        wv.subtitle,
        wv.objective,
        wv.estimated_duration_minutes,
        wv.difficulty_level,
        wv.notes,
        wv.created_at,
        wv.updated_at,
        w.public_id AS workout_public_id,
        w.consultancy_id
      FROM workout_versions wv
      INNER JOIN workouts w ON w.id = wv.workout_id
      WHERE wv.public_id = ? AND w.deleted_at IS NULL
      LIMIT 1;`,
      [versionPublicId]
    );

    if (!Array.isArray(vRows) || vRows.length === 0) return null;
    const v = vRows[0];

    // Verify tenancy: must match active consultancy unless user is assigned student
    if (ctx.consultancyId && Number(v.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // 2. Fetch blocks
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, block_type, title, sort_order, rounds,
              rest_between_items_seconds, rest_between_rounds_seconds,
              rest_after_block_seconds, instructions
       FROM workout_blocks
       WHERE workout_version_id = ?
       ORDER BY sort_order ASC;`,
      [v.id]
    );

    if (bRows.length === 0) {
      return {
        publicId: String(v.public_id),
        workoutPublicId: String(v.workout_public_id),
        versionNumber: Number(v.version_number),
        status: v.status,
        publishedAt: v.published_at ? new Date(v.published_at) : null,
        title: String(v.title),
        subtitle: v.subtitle ? String(v.subtitle) : null,
        objective: v.objective ? String(v.objective) : null,
        estimatedDurationMinutes: v.estimated_duration_minutes != null ? Number(v.estimated_duration_minutes) : null,
        difficultyLevel: v.difficulty_level ? String(v.difficulty_level) : null,
        notes: v.notes ? String(v.notes) : null,
        blocks: [],
        createdAt: new Date(v.created_at),
        updatedAt: new Date(v.updated_at),
      };
    }

    const blockIds = bRows.map((b) => b.id);

    // 3. Fetch items for all blocks
    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.public_id, wbi.block_id, wbi.sort_order,
              wbi.exercise_name_snapshot, wbi.muscle_group_snapshot,
              wbi.equipment_snapshot, wbi.instructions_snapshot,
              wbi.prescription_mode, wbi.target_cadence, wbi.target_rpe,
              wbi.target_rir, wbi.method_config_json, wbi.custom_video_url,
              wbi.notes, e.public_id AS exercise_public_id
       FROM workout_block_items wbi
       LEFT JOIN exercises e ON e.id = wbi.exercise_id
       WHERE wbi.block_id IN (${blockIds.map(() => "?").join(",")})
       ORDER BY wbi.sort_order ASC;`,
      blockIds
    );

    const itemIds = iRows.map((i) => i.id);

    // 4. Fetch sets and pinned media if items exist
    let sRows: RowDataPacket[] = [];
    let mRows: RowDataPacket[] = [];

    if (itemIds.length > 0) {
      const [sets] = await connection.execute<RowDataPacket[]>(
        `SELECT wis.id, wis.block_item_id, wis.set_number, wis.set_type,
                wis.parent_set_id, p.set_number AS parent_set_number,
                wis.target_reps, wis.target_reps_max, wis.target_load_kg,
                wis.target_duration_seconds, wis.target_distance_meters,
                wis.target_rest_seconds, wis.intensity_indicator
         FROM workout_item_sets wis
         LEFT JOIN workout_item_sets p ON p.id = wis.parent_set_id
         WHERE wis.block_item_id IN (${itemIds.map(() => "?").join(",")})
         ORDER BY wis.set_number ASC;`,
        itemIds
      );
      sRows = sets;

      const [media] = await connection.execute<RowDataPacket[]>(
        `SELECT wbim.block_item_id, wbim.role, wbim.sort_order,
                ma.public_id AS media_public_id, ma.scope, ma.visibility,
                ma.media_type, ma.storage_provider, ma.mime_type,
                ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
                ma.created_at
         FROM workout_block_item_media wbim
         INNER JOIN media_assets ma ON ma.id = wbim.media_asset_id
         WHERE wbim.block_item_id IN (${itemIds.map(() => "?").join(",")}) AND ma.deleted_at IS NULL
         ORDER BY wbim.sort_order ASC;`,
        itemIds
      );
      mRows = media;
    }

    // Assemble the tree
    const blocks: WorkoutBlockDto[] = bRows.map((b) => {
      const blockItems = iRows.filter((i) => i.block_id === b.id);
      const items: WorkoutBlockItemDto[] = blockItems.map((item) => {
        const itemSets: WorkoutItemSetDto[] = sRows
          .filter((s) => s.block_item_id === item.id)
          .map((s) => ({
            setNumber: Number(s.set_number),
            setType: s.set_type as WorkoutSetType,
            parentSetNumber: s.parent_set_number != null ? Number(s.parent_set_number) : null,
            targetReps: s.target_reps != null ? Number(s.target_reps) : null,
            targetRepsMax: s.target_reps_max != null ? Number(s.target_reps_max) : null,
            targetLoadKg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
            targetDurationSeconds: s.target_duration_seconds != null ? Number(s.target_duration_seconds) : null,
            targetDistanceMeters: s.target_distance_meters != null ? Number(s.target_distance_meters) : null,
            targetRestSeconds: s.target_rest_seconds != null ? Number(s.target_rest_seconds) : null,
            intensityIndicator: s.intensity_indicator ? String(s.intensity_indicator) : null,
          }));

        const pinnedMedia: BlockItemMediaDto[] = mRows
          .filter((m) => m.block_item_id === item.id)
          .map((m) => ({
            role: m.role as MediaRole,
            sortOrder: Number(m.sort_order),
            mediaAsset: {
              publicId: String(m.media_public_id),
              scope: m.scope,
              visibility: m.visibility,
              consultancyPublicId: null,
              mediaType: m.media_type as MediaType,
              storageProvider: m.storage_provider as StorageProvider,
              mimeType: String(m.mime_type),
              fileSizeBytes: Number(m.file_size_bytes),
              durationSeconds: m.duration_seconds != null ? Number(m.duration_seconds) : null,
              width: m.width != null ? Number(m.width) : null,
              height: m.height != null ? Number(m.height) : null,
              createdAt: new Date(m.created_at),
            },
          }));

        return {
          publicId: String(item.public_id),
          exercisePublicId: item.exercise_public_id ? String(item.exercise_public_id) : null,
          sortOrder: Number(item.sort_order),
          exerciseNameSnapshot: String(item.exercise_name_snapshot),
          muscleGroupSnapshot: item.muscle_group_snapshot ? String(item.muscle_group_snapshot) : null,
          equipmentSnapshot: item.equipment_snapshot ? String(item.equipment_snapshot) : null,
          instructionsSnapshot: item.instructions_snapshot ? String(item.instructions_snapshot) : null,
          prescriptionMode: item.prescription_mode as PrescriptionMode,
          targetCadence: item.target_cadence ? String(item.target_cadence) : null,
          targetRpe: item.target_rpe != null ? Number(item.target_rpe) : null,
          targetRir: item.target_rir != null ? Number(item.target_rir) : null,
          methodConfig: item.method_config_json
            ? typeof item.method_config_json === "string"
              ? JSON.parse(item.method_config_json)
              : item.method_config_json
            : null,
          customVideoUrl: item.custom_video_url ? String(item.custom_video_url) : null,
          notes: item.notes ? String(item.notes) : null,
          pinnedMedia,
          sets: itemSets,
        };
      });

      return {
        publicId: String(b.public_id),
        blockType: b.block_type as WorkoutBlockType,
        title: b.title ? String(b.title) : null,
        sortOrder: Number(b.sort_order),
        rounds: b.rounds != null ? Number(b.rounds) : null,
        restBetweenItemsSeconds: b.rest_between_items_seconds != null ? Number(b.rest_between_items_seconds) : null,
        restBetweenRoundsSeconds: b.rest_between_rounds_seconds != null ? Number(b.rest_between_rounds_seconds) : null,
        restAfterBlockSeconds: b.rest_after_block_seconds != null ? Number(b.rest_after_block_seconds) : null,
        instructions: b.instructions ? String(b.instructions) : null,
        items,
      };
    });

    return {
      publicId: String(v.public_id),
      workoutPublicId: String(v.workout_public_id),
      versionNumber: Number(v.version_number),
      status: v.status,
      publishedAt: v.published_at ? new Date(v.published_at) : null,
      title: String(v.title),
      subtitle: v.subtitle ? String(v.subtitle) : null,
      objective: v.objective ? String(v.objective) : null,
      estimatedDurationMinutes: v.estimated_duration_minutes != null ? Number(v.estimated_duration_minutes) : null,
      difficultyLevel: v.difficulty_level ? String(v.difficulty_level) : null,
      notes: v.notes ? String(v.notes) : null,
      blocks,
      createdAt: new Date(v.created_at),
      updatedAt: new Date(v.updated_at),
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Adds a new block to a DRAFT workout version. Enforces immutability.
 */
export async function addBlockToDraft(
  ctx: TrainingAccessContext,
  versionPublicId: string,
  input: AddBlockInput
): Promise<WorkoutBlockDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // Verify version is DRAFT and in tenancy
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.status, w.consultancy_id
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [versionPublicId]
    );

    if (!vRows || vRows.length === 0) {
      throw new TrainingAuthorizationError("Versão de treino não encontrada.", "NOT_FOUND", 404);
    }
    const v = vRows[0];
    if (Number(v.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido adicionar blocos a uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    const blockPublicId = crypto.randomUUID();
    const sortOrder = input.sortOrder ?? 0;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_blocks (
        public_id, workout_version_id, block_type, title, sort_order, rounds,
        rest_between_items_seconds, rest_between_rounds_seconds, rest_after_block_seconds, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        blockPublicId,
        v.id,
        input.blockType,
        input.title?.trim() || null,
        sortOrder,
        input.rounds ?? null,
        input.restBetweenItemsSeconds ?? null,
        input.restBetweenRoundsSeconds ?? null,
        input.restAfterBlockSeconds ?? null,
        input.instructions?.trim() || null,
      ]
    );

    return {
      publicId: blockPublicId,
      blockType: input.blockType,
      title: input.title?.trim() || null,
      sortOrder,
      rounds: input.rounds ?? null,
      restBetweenItemsSeconds: input.restBetweenItemsSeconds ?? null,
      restBetweenRoundsSeconds: input.restBetweenRoundsSeconds ?? null,
      restAfterBlockSeconds: input.restAfterBlockSeconds ?? null,
      instructions: input.instructions?.trim() || null,
      items: [],
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Adds an item to a draft block.
 * Automatically generates frozen snapshots from the trusted DB exercise if exercisePublicId is provided.
 */
export async function addItemToDraftBlock(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  input: AddItemInput
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify parent block and version status
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wv.status, w.consultancy_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ?
       LIMIT 1;`,
      [blockPublicId]
    );

    if (!bRows || bRows.length === 0) {
      throw new TrainingAuthorizationError("Bloco de treino não encontrado.", "NOT_FOUND", 404);
    }
    const b = bRows[0];
    if (Number(b.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    let exerciseId: number | null = null;
    let nameSnapshot: string = "";
    let muscleSnapshot: string | null = null;
    let equipSnapshot: string | null = null;
    let instSnapshot: string | null = null;

    if (input.exercisePublicId) {
      // Library-backed: fetch authorized exercise directly from DB
      const [exRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, name, muscle_group_primary, equipment, instructions, scope, consultancy_id, visibility, created_by_membership_id
         FROM exercises
         WHERE public_id = ? AND deleted_at IS NULL AND status = 'PUBLISHED'
         LIMIT 1;`,
        [input.exercisePublicId]
      );

      if (!exRows || exRows.length === 0) {
        throw new TrainingAuthorizationError("Exercício da biblioteca não encontrado ou inativo.", "EXERCISE_NOT_FOUND", 404);
      }
      const ex = exRows[0];

      if (ex.scope === "CONSULTANCY") {
        if (Number(ex.consultancy_id) !== ctx.consultancyId) {
          throw new TrainingAuthorizationError("Exercício pertence a outra consultoria.", "TENANT_MISMATCH", 403);
        }
        if (ex.visibility === "CREATOR_ONLY") {
          const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
          if (!isCreator && !ctx.canManageConsultancy) {
            throw new TrainingAuthorizationError("Exercício privado de outro profissional.", "FORBIDDEN", 403);
          }
        }
      }

      exerciseId = ex.id;
      nameSnapshot = ex.name;
      muscleSnapshot = ex.muscle_group_primary;
      equipSnapshot = ex.equipment;
      instSnapshot = ex.instructions;
    } else {
      // Custom inline: use validated custom input
      if (!input.customSnapshot || !input.customSnapshot.exerciseName.trim()) {
        throw new TrainingAuthorizationError("Nome do exercício personalizado é obrigatório.", "VALIDATION_FAILED", 400);
      }
      nameSnapshot = input.customSnapshot.exerciseName.trim();
      muscleSnapshot = input.customSnapshot.muscleGroup?.trim() || null;
      equipSnapshot = input.customSnapshot.equipment?.trim() || null;
      instSnapshot = input.customSnapshot.instructions?.trim() || null;
    }

    const itemPublicId = crypto.randomUUID();
    const sortOrder = input.sortOrder ?? 0;
    const configJson = input.methodConfig ? JSON.stringify(input.methodConfig) : null;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_block_items (
        public_id, block_id, exercise_id, sort_order, exercise_name_snapshot,
        muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
        prescription_mode, target_cadence, target_rpe, target_rir,
        method_config_json, custom_video_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        itemPublicId,
        b.id,
        exerciseId,
        sortOrder,
        nameSnapshot,
        muscleSnapshot,
        equipSnapshot,
        instSnapshot,
        input.prescriptionMode || "SETS",
        input.targetCadence?.trim() || null,
        input.targetRpe ?? null,
        input.targetRir ?? null,
        configJson,
        input.customVideoUrl?.trim() || null,
        input.notes?.trim() || null,
      ]
    );

    return {
      publicId: itemPublicId,
      exercisePublicId: input.exercisePublicId || null,
      sortOrder,
      exerciseNameSnapshot: nameSnapshot,
      muscleGroupSnapshot: muscleSnapshot,
      equipmentSnapshot: equipSnapshot,
      instructionsSnapshot: instSnapshot,
      prescriptionMode: input.prescriptionMode || "SETS",
      targetCadence: input.targetCadence?.trim() || null,
      targetRpe: input.targetRpe ?? null,
      targetRir: input.targetRir ?? null,
      methodConfig: input.methodConfig || null,
      customVideoUrl: input.customVideoUrl?.trim() || null,
      notes: input.notes?.trim() || null,
      pinnedMedia: [],
      sets: [],
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Adds a set to a draft item.
 * Enforces set parent integrity: parent must belong to the SAME block item and cannot be a drop/mini set.
 */
export async function addSetToDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: AddSetInput
): Promise<WorkoutItemSetDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify item belongs to a DRAFT version in current consultancy
    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [itemPublicId]
    );

    if (!iRows || iRows.length === 0) {
      throw new TrainingAuthorizationError("Item de treino não encontrado.", "NOT_FOUND", 404);
    }
    const item = iRows[0];
    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // 2. Parent set integrity check
    let parentSetId: number | null = null;
    if (input.parentSetNumber != null) {
      const [pRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, block_item_id, set_type FROM workout_item_sets WHERE block_item_id = ? AND set_number = ? LIMIT 1;`,
        [item.id, input.parentSetNumber]
      );
      if (!pRows || pRows.length === 0) {
        throw new TrainingAuthorizationError(
          `A série pai #${input.parentSetNumber} não existe dentro do mesmo exercício.`,
          "PARENT_SET_NOT_FOUND",
          400
        );
      }
      const parent = pRows[0];
      if (parent.set_type === "DROP_STAGE" || parent.set_type === "REST_PAUSE_MINI") {
        throw new TrainingAuthorizationError(
          "Uma série pai não pode ser do tipo DROP_STAGE ou REST_PAUSE_MINI.",
          "INVALID_PARENT_SET_TYPE",
          400
        );
      }
      parentSetId = parent.id;
    } else {
      if (input.setType === "DROP_STAGE" || input.setType === "REST_PAUSE_MINI") {
        throw new TrainingAuthorizationError(
          `Séries do tipo ${input.setType} exigem obrigatoriamente a indicação da série principal (parentSetNumber).`,
          "MISSING_PARENT_SET",
          400
        );
      }
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_sets (
        block_item_id, set_number, set_type, parent_set_id, target_reps,
        target_reps_max, target_load_kg, target_duration_seconds,
        target_distance_meters, target_rest_seconds, intensity_indicator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        input.setNumber,
        input.setType,
        parentSetId,
        input.targetReps ?? null,
        input.targetRepsMax ?? null,
        input.targetLoadKg ?? null,
        input.targetDurationSeconds ?? null,
        input.targetDistanceMeters ?? null,
        input.targetRestSeconds ?? null,
        input.intensityIndicator?.trim() || null,
      ]
    );

    return {
      setNumber: input.setNumber,
      setType: input.setType,
      parentSetNumber: input.parentSetNumber ?? null,
      targetReps: input.targetReps ?? null,
      targetRepsMax: input.targetRepsMax ?? null,
      targetLoadKg: input.targetLoadKg ?? null,
      targetDurationSeconds: input.targetDurationSeconds ?? null,
      targetDistanceMeters: input.targetDistanceMeters ?? null,
      targetRestSeconds: input.targetRestSeconds ?? null,
      intensityIndicator: input.intensityIndicator?.trim() || null,
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Publishes a DRAFT workout version.
 * Transactional: locks rows, validates complete version tree with Zod (all 11 block types),
 * archives prior published version, marks current version as PUBLISHED.
 */
export async function publishWorkoutVersion(
  ctx: TrainingAccessContext,
  versionPublicId: string
): Promise<WorkoutVersionDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock version row FOR UPDATE
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.workout_id, wv.version_number, wv.status, w.consultancy_id
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ?
       FOR UPDATE;`,
      [versionPublicId]
    );

    if (!vRows || vRows.length === 0) {
      throw new TrainingAuthorizationError("Versão de treino não encontrada.", "NOT_FOUND", 404);
    }
    const v = vRows[0];

    if (Number(v.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Apenas versões em rascunho (DRAFT) podem ser publicadas.", "INVALID_STATUS", 400);
    }

    // 2. Load complete version tree
    const tree = await getWorkoutVersionTree(ctx, versionPublicId);
    if (!tree) {
      throw new TrainingAuthorizationError("Falha ao inspecionar estrutura do treino.", "INTERNAL_ERROR", 500);
    }

    // 3. Domain validation with Zod
    const validationResult = workoutVersionSchema.safeParse(tree);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.issues.map((i) => i.message).join(" | ");
      throw new TrainingAuthorizationError(
        `Estrutura do treino inválida para publicação: ${errorDetails}`,
        "VALIDATION_FAILED",
        400
      );
    }

    // 4. Archive any prior PUBLISHED version of this workout
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_versions
       SET status = 'ARCHIVED', updated_at = NOW(3)
       WHERE workout_id = ? AND status = 'PUBLISHED';`,
      [v.workout_id]
    );

    // 5. Transition current version to PUBLISHED
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_versions
       SET status = 'PUBLISHED', published_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [v.id]
    );

    await connection.commit();

    const published = await getWorkoutVersionTree(ctx, versionPublicId);
    return published!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Deep clones an immutable PUBLISHED version into a new DRAFT version (vN+1).
 * Clones version metadata, blocks, items, pinned media associations, and normalized sets with parent_set_id remapping.
 */
export async function createNewDraftVersionFromPublished(
  ctx: TrainingAccessContext,
  workoutPublicId: string
): Promise<WorkoutVersionDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock workout row FOR UPDATE
    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id FROM workouts WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE;`,
      [workoutPublicId]
    );
    if (!wRows || wRows.length === 0) {
      throw new TrainingAuthorizationError("Treino não encontrado.", "NOT_FOUND", 404);
    }
    const workout = wRows[0];
    if (Number(workout.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }

    // 2. Verify no active DRAFT already exists (enforces 1 draft rule)
    const [draftRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id FROM workout_versions WHERE workout_id = ? AND status = 'DRAFT' LIMIT 1;`,
      [workout.id]
    );
    if (draftRows.length > 0) {
      throw new TrainingAuthorizationError(
        "Já existe uma versão em rascunho aberta para este treino. Conclua ou descarte o rascunho existente antes de clonar.",
        "DRAFT_ALREADY_EXISTS",
        409
      );
    }

    // 3. Find latest published version
    const [pubRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, version_number, title, subtitle, objective,
              estimated_duration_minutes, difficulty_level, notes
       FROM workout_versions
       WHERE workout_id = ? AND status IN ('PUBLISHED', 'ARCHIVED')
       ORDER BY version_number DESC
       LIMIT 1;`,
      [workout.id]
    );
    if (!pubRows || pubRows.length === 0) {
      throw new TrainingAuthorizationError("Nenhuma versão publicada encontrada para clonagem.", "NOT_FOUND", 404);
    }
    const sourceVer = pubRows[0];
    const newVersionNumber = Number(sourceVer.version_number) + 1;
    const newVersionPublicId = crypto.randomUUID();

    // 4. Insert new DRAFT version
    const [vRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, ?, 'DRAFT', NULL, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newVersionPublicId,
        workout.id,
        newVersionNumber,
        sourceVer.title,
        sourceVer.subtitle,
        sourceVer.objective,
        sourceVer.estimated_duration_minutes,
        sourceVer.difficulty_level,
        sourceVer.notes,
        ctx.membershipId!,
      ]
    );
    const newVersionId = vRes.insertId;

    // 5. Deep clone blocks, items, sets, and pinned media
    const [sourceBlocks] = await connection.execute<RowDataPacket[]>(
      `SELECT id, block_type, title, sort_order, rounds, rest_between_items_seconds,
              rest_between_rounds_seconds, rest_after_block_seconds, instructions
       FROM workout_blocks
       WHERE workout_version_id = ?
       ORDER BY sort_order ASC;`,
      [sourceVer.id]
    );

    for (const b of sourceBlocks) {
      const newBlockPublicId = crypto.randomUUID();
      const [bRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_blocks (
          public_id, workout_version_id, block_type, title, sort_order, rounds,
          rest_between_items_seconds, rest_between_rounds_seconds, rest_after_block_seconds, instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newBlockPublicId,
          newVersionId,
          b.block_type,
          b.title,
          b.sort_order,
          b.rounds,
          b.rest_between_items_seconds,
          b.rest_between_rounds_seconds,
          b.rest_after_block_seconds,
          b.instructions,
        ]
      );
      const newBlockId = bRes.insertId;

      // Clone items of this block
      const [sourceItems] = await connection.execute<RowDataPacket[]>(
        `SELECT id, exercise_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
                equipment_snapshot, instructions_snapshot, prescription_mode,
                target_cadence, target_rpe, target_rir, method_config_json,
                custom_video_url, notes
         FROM workout_block_items
         WHERE block_id = ?
         ORDER BY sort_order ASC;`,
        [b.id]
      );

      for (const item of sourceItems) {
        const newItemPublicId = crypto.randomUUID();
        const [iRes] = await connection.execute<ResultSetHeader>(
          `INSERT INTO workout_block_items (
            public_id, block_id, exercise_id, sort_order, exercise_name_snapshot,
            muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
            prescription_mode, target_cadence, target_rpe, target_rir,
            method_config_json, custom_video_url, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            newItemPublicId,
            newBlockId,
            item.exercise_id,
            item.sort_order,
            item.exercise_name_snapshot,
            item.muscle_group_snapshot,
            item.equipment_snapshot,
            item.instructions_snapshot,
            item.prescription_mode,
            item.target_cadence,
            item.target_rpe,
            item.target_rir,
            item.method_config_json,
            item.custom_video_url,
            item.notes,
          ]
        );
        const newItemId = iRes.insertId;

        // Clone pinned media associations
        const [pinnedMedia] = await connection.execute<RowDataPacket[]>(
          `SELECT media_asset_id, role, sort_order FROM workout_block_item_media WHERE block_item_id = ?;`,
          [item.id]
        );
        for (const pm of pinnedMedia) {
          await connection.execute<ResultSetHeader>(
            `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
            [newItemId, pm.media_asset_id, pm.role, pm.sort_order]
          );
        }

        // Clone sets with parent_set_id remapping
        const [sourceSets] = await connection.execute<RowDataPacket[]>(
          `SELECT id, set_number, set_type, parent_set_id, target_reps, target_reps_max,
                  target_load_kg, target_duration_seconds, target_distance_meters,
                  target_rest_seconds, intensity_indicator
           FROM workout_item_sets
           WHERE block_item_id = ?
           ORDER BY set_number ASC;`,
          [item.id]
        );

        const setIdMap = new Map<number, number>(); // oldSetId -> newSetId

        // Pass 1: Insert all sets without parent links
        for (const s of sourceSets) {
          const [sRes] = await connection.execute<ResultSetHeader>(
            `INSERT INTO workout_item_sets (
              block_item_id, set_number, set_type, parent_set_id, target_reps,
              target_reps_max, target_load_kg, target_duration_seconds,
              target_distance_meters, target_rest_seconds, intensity_indicator
            ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?);`,
            [
              newItemId,
              s.set_number,
              s.set_type,
              s.target_reps,
              s.target_reps_max,
              s.target_load_kg,
              s.target_duration_seconds,
              s.target_distance_meters,
              s.target_rest_seconds,
              s.intensity_indicator,
            ]
          );
          setIdMap.set(s.id, sRes.insertId);
        }

        // Pass 2: Remap parent_set_id for DROP_STAGE and REST_PAUSE_MINI
        for (const s of sourceSets) {
          if (s.parent_set_id != null && setIdMap.has(s.parent_set_id)) {
            const remappedParentId = setIdMap.get(s.parent_set_id);
            const currentNewSetId = setIdMap.get(s.id);
            if (remappedParentId !== undefined && currentNewSetId !== undefined) {
              await connection.execute<ResultSetHeader>(
                `UPDATE workout_item_sets SET parent_set_id = ? WHERE id = ?;`,
                [remappedParentId, currentNewSetId]
              );
            }
          }
        }
      }
    }

    await connection.commit();

    const cloned = await getWorkoutVersionTree(ctx, newVersionPublicId);
    return cloned!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Archives a workout root (soft delete).
 */
export async function archiveWorkout(
  ctx: TrainingAccessContext,
  workoutPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE workouts
       SET status = 'ARCHIVED', deleted_at = NOW(3), updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL;`,
      [workoutPublicId, ctx.consultancyId!]
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) connection.release();
  }
}
