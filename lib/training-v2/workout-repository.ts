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
  WorkoutStatus,
  WorkoutVersionStatus,
  CardioMethodConfig,
  WarmupMethodConfig,
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
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM workout_blocks WHERE workout_version_id = ?;`,
        [v.id]
      );
      sortOrder = Number(orderRows[0]?.next_order ?? 0);
    }

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
      `SELECT wb.id, wb.block_type, wv.status, w.consultancy_id
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

    // 1.1 Method cardinality enforcement
    const [itemCountRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS item_count FROM workout_block_items WHERE block_id = ?;`,
      [b.id]
    );
    const currentItemCount = Number(itemCountRows[0]?.item_count || 0);
    const blockType = b.block_type as WorkoutBlockType;

    if (["SINGLE", "DROP_SET", "REST_PAUSE", "CARDIO"].includes(blockType) && currentItemCount >= 1) {
      throw new TrainingAuthorizationError(
        `Blocos do tipo ${blockType} suportam exatamente 1 exercício (já possui ${currentItemCount}).`,
        "CARDINALITY_EXCEEDED",
        400
      );
    }
    if (["BI_SET", "SUPER_SET"].includes(blockType) && currentItemCount >= 2) {
      throw new TrainingAuthorizationError(
        `Blocos do tipo ${blockType} suportam no máximo 2 exercícios (já possui ${currentItemCount}).`,
        "CARDINALITY_EXCEEDED",
        400
      );
    }
    if (blockType === "TRI_SET" && currentItemCount >= 3) {
      throw new TrainingAuthorizationError(
        `Blocos do tipo TRI_SET suportam no máximo 3 exercícios (já possui ${currentItemCount}).`,
        "CARDINALITY_EXCEEDED",
        400
      );
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

    const [itemRes] = await connection.execute<ResultSetHeader>(
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
    const itemId = itemRes.insertId;

    const pinnedMedia: BlockItemMediaDto[] = [];
    if (exerciseId) {
      // Pin current approved exercise media into workout_block_item_media
      const [mediaRows] = await connection.execute<RowDataPacket[]>(
        `SELECT em.media_asset_id, em.role, em.sort_order,
                ma.public_id AS media_public_id, ma.scope, ma.visibility,
                ma.media_type, ma.storage_provider, ma.mime_type,
                ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
                ma.created_at
         FROM exercise_media em
         INNER JOIN media_assets ma ON ma.id = em.media_asset_id
         WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
         ORDER BY em.sort_order ASC;`,
        [exerciseId]
      );
      for (const m of mediaRows) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order)
           VALUES (?, ?, ?, ?);`,
          [itemId, m.media_asset_id, m.role, m.sort_order]
        );
        pinnedMedia.push({
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
        });
      }
    }

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
      pinnedMedia,
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

// ============================================================================
// PRODUCT01-E1 EXTENSIONS: BUILDER CRUD, LIST & SET FOUNDATION
// ============================================================================

export type WorkoutListItemDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  estimatedDurationMinutes: number | null;
  difficultyLevel: string;
  isTemplate: boolean;
  status: WorkoutStatus;
  currentVersionPublicId: string | null;
  currentVersionNumber: number | null;
  currentVersionStatus: WorkoutVersionStatus | null;
  blocksCount: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Lists workouts for an authorized professional in the consultancy.
 * Personal trainers only view their own authored workouts.
 * Consultancy admins can view all workouts in the consultancy.
 */
export async function listWorkoutsForProfessional(
  ctx: TrainingAccessContext,
  options?: {
    query?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "ALL";
    page?: number;
    limit?: number;
  }
): Promise<{ items: WorkoutListItemDto[]; total: number; page: number; limit: number }> {
  assertCanAuthorTraining(ctx);

  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(Math.max(1, options?.limit || 20), 50);
  const offset = (page - 1) * limit;

  let connection;
  try {
    connection = await getDbConnection();

    const whereClauses: string[] = ["w.consultancy_id = ?", "w.deleted_at IS NULL"];
    const params: (string | number)[] = [ctx.consultancyId!];

    if (!ctx.canManageConsultancy) {
      whereClauses.push("w.created_by_membership_id = ?");
      params.push(ctx.membershipId!);
    }

    if (options?.query?.trim()) {
      whereClauses.push("(w.title LIKE ? OR wv.title LIKE ?)");
      const q = `%${options.query.trim()}%`;
      params.push(q, q);
    }

    if (options?.status && options.status !== "ALL") {
      if (options.status === "DRAFT") {
        whereClauses.push("wv.status = 'DRAFT'");
      } else if (options.status === "PUBLISHED") {
        whereClauses.push("wv.status = 'PUBLISHED'");
      } else if (options.status === "ARCHIVED") {
        whereClauses.push("(w.status = 'ARCHIVED' OR wv.status = 'ARCHIVED')");
      }
    }

    const whereSql = whereClauses.join(" AND ");

    // Count
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT w.id) AS total
       FROM workouts w
       LEFT JOIN workout_versions wv ON wv.workout_id = w.id
            AND wv.id = (
               SELECT wv2.id FROM workout_versions wv2
               WHERE wv2.workout_id = w.id
               ORDER BY (wv2.status = 'DRAFT') DESC, wv2.version_number DESC
               LIMIT 1
            )
       WHERE ${whereSql};`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // Items
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.id, w.public_id, w.title, w.subtitle, w.objective,
              w.estimated_duration_minutes, w.difficulty_level, w.is_template,
              w.status, w.created_at, w.updated_at,
              wv.public_id AS current_version_public_id,
              wv.version_number AS current_version_number,
              wv.status AS current_version_status,
              wv.title AS current_version_title,
              wv.difficulty_level AS current_version_difficulty,
              wv.estimated_duration_minutes AS current_version_duration,
              wv.updated_at AS current_version_updated_at,
              (SELECT COUNT(*) FROM workout_blocks wb WHERE wb.workout_version_id = wv.id) AS blocks_count
       FROM workouts w
       LEFT JOIN workout_versions wv ON wv.workout_id = w.id
            AND wv.id = (
               SELECT wv2.id FROM workout_versions wv2
               WHERE wv2.workout_id = w.id
               ORDER BY (wv2.status = 'DRAFT') DESC, wv2.version_number DESC
               LIMIT 1
            )
       WHERE ${whereSql}
       ORDER BY COALESCE(wv.updated_at, w.updated_at) DESC
       LIMIT ? OFFSET ?;`,
      [...params, limit, offset]
    );

    const items: WorkoutListItemDto[] = (rows || []).map((r) => ({
      publicId: String(r.public_id),
      title: r.current_version_title ? String(r.current_version_title) : String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      objective: r.objective ? String(r.objective) : null,
      estimatedDurationMinutes: r.current_version_duration != null ? Number(r.current_version_duration) : (r.estimated_duration_minutes != null ? Number(r.estimated_duration_minutes) : null),
      difficultyLevel: r.current_version_difficulty ? String(r.current_version_difficulty) : String(r.difficulty_level),
      isTemplate: Boolean(r.is_template),
      status: r.status as WorkoutStatus,
      currentVersionPublicId: r.current_version_public_id ? String(r.current_version_public_id) : null,
      currentVersionNumber: r.current_version_number != null ? Number(r.current_version_number) : null,
      currentVersionStatus: r.current_version_status as WorkoutVersionStatus | null,
      blocksCount: Number(r.blocks_count || 0),
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.current_version_updated_at || r.updated_at),
    }));

    return { items, total, page, limit };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Retrieves a workout root and its active DRAFT version tree for builder editing.
 * If no draft version exists (e.g. only published), returns { workout, draftVersion: null }.
 */
export async function getWorkoutWithDraft(
  ctx: TrainingAccessContext,
  workoutPublicId: string
): Promise<{ workout: WorkoutRootDto; draftVersion: WorkoutVersionDto | null } | null> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, created_by_membership_id, title, subtitle,
              objective, estimated_duration_minutes, difficulty_level, is_template, status,
              created_at, updated_at
       FROM workouts
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL
       LIMIT 1;`,
      [workoutPublicId, ctx.consultancyId!]
    );

    if (!wRows || wRows.length === 0) return null;
    const w = wRows[0];

    const isCreator = ctx.membershipId && Number(w.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso negado a este treino.", "FORBIDDEN", 403);
    }

    const workoutDto: WorkoutRootDto = {
      publicId: String(w.public_id),
      consultancyPublicId: ctx.consultancyPublicId!,
      title: String(w.title),
      subtitle: w.subtitle ? String(w.subtitle) : null,
      objective: w.objective ? String(w.objective) : null,
      estimatedDurationMinutes: w.estimated_duration_minutes != null ? Number(w.estimated_duration_minutes) : null,
      difficultyLevel: String(w.difficulty_level),
      isTemplate: Boolean(w.is_template),
      status: w.status as WorkoutStatus,
      currentPublishedVersion: null,
      createdAt: new Date(w.created_at),
      updatedAt: new Date(w.updated_at),
    };

    // Find active DRAFT version
    const [draftRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id FROM workout_versions
       WHERE workout_id = ? AND status = 'DRAFT'
       ORDER BY version_number DESC
       LIMIT 1;`,
      [w.id]
    );

    if (!draftRows || draftRows.length === 0) {
      return { workout: workoutDto, draftVersion: null };
    }

    const draftVersion = await getWorkoutVersionTree(ctx, String(draftRows[0].public_id));
    return { workout: workoutDto, draftVersion };
  } finally {
    if (connection) connection.release();
  }
}

export type UpdateWorkoutDraftMetadataInput = {
  title?: string;
  subtitle?: string | null;
  objective?: string | null;
  estimatedDurationMinutes?: number | null;
  difficultyLevel?: string | null;
  notes?: string | null;
};

/**
 * Updates presentation snapshot metadata on an active DRAFT version.
 * Preserves stable root identity and student historical fidelity.
 */
export async function updateWorkoutDraftMetadata(
  ctx: TrainingAccessContext,
  versionPublicId: string,
  input: UpdateWorkoutDraftMetadataInput
): Promise<WorkoutVersionDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.workout_id, wv.status, w.consultancy_id, w.created_by_membership_id
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
    const isCreator = ctx.membershipId && Number(v.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar este treino.", "FORBIDDEN", 403);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Apenas versões em rascunho (DRAFT) podem ter metadados editados.", "IMMUTABLE_VERSION", 400);
    }

    if (input.title !== undefined && !input.title.trim()) {
      throw new TrainingAuthorizationError("O título do treino não pode ser vazio.", "VALIDATION_FAILED", 400);
    }

    // Update version-owned presentation snapshot only (preserves workouts root stability)
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_versions
       SET title = COALESCE(?, title),
           subtitle = ?,
           objective = ?,
           estimated_duration_minutes = ?,
           difficulty_level = COALESCE(?, difficulty_level),
           notes = ?,
           updated_at = NOW(3)
       WHERE id = ? AND status = 'DRAFT';`,
      [
        input.title?.trim() || null,
        input.subtitle !== undefined ? (input.subtitle?.trim() || null) : null,
        input.objective !== undefined ? (input.objective?.trim() || null) : null,
        input.estimatedDurationMinutes !== undefined ? (input.estimatedDurationMinutes ?? null) : null,
        input.difficultyLevel !== undefined ? (input.difficultyLevel || null) : null,
        input.notes !== undefined ? (input.notes?.trim() || null) : null,
        v.id,
      ]
    );

    const updated = await getWorkoutVersionTree(ctx, versionPublicId);
    return updated!;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Duplicates a block within the draft version with independent child rows,
 * snapshots, remapped parent sets, and pinned media references.
 */
export async function duplicateBlockInDraft(
  ctx: TrainingAccessContext,
  blockPublicId: string
): Promise<WorkoutBlockDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify source block belongs to an active DRAFT version in current tenancy
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wb.block_type, wb.title, wb.sort_order, wb.rounds,
              wb.rest_between_items_seconds, wb.rest_between_rounds_seconds,
              wb.rest_after_block_seconds, wb.instructions,
              wv.status, wv.public_id AS version_public_id,
              w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [blockPublicId]
    );

    if (!bRows || bRows.length === 0) {
      throw new TrainingAuthorizationError("Bloco de treino não encontrado.", "NOT_FOUND", 404);
    }
    const sourceBlock = bRows[0];

    if (Number(sourceBlock.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(sourceBlock.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem duplicar blocos.", "FORBIDDEN", 403);
    }
    if (sourceBlock.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido duplicar blocos de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Determine new sort_order = MAX(sort_order) + 1
    const [maxRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
       FROM workout_blocks
       WHERE workout_version_id = ?;`,
      [sourceBlock.workout_version_id]
    );
    const newSortOrder = Number(maxRows[0]?.next_order || 0);

    const newBlockPublicId = crypto.randomUUID();
    const duplicatedTitle = sourceBlock.title ? `${sourceBlock.title} (Cópia)` : null;

    const [bRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_blocks (
        public_id, workout_version_id, block_type, title, sort_order, rounds,
        rest_between_items_seconds, rest_between_rounds_seconds, rest_after_block_seconds, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newBlockPublicId,
        sourceBlock.workout_version_id,
        sourceBlock.block_type,
        duplicatedTitle,
        newSortOrder,
        sourceBlock.rounds,
        sourceBlock.rest_between_items_seconds,
        sourceBlock.rest_between_rounds_seconds,
        sourceBlock.rest_after_block_seconds,
        sourceBlock.instructions,
      ]
    );
    const newBlockId = bRes.insertId;

    // 2. Fetch and duplicate items
    const [sourceItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id, exercise_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
              equipment_snapshot, instructions_snapshot, prescription_mode,
              target_cadence, target_rpe, target_rir, method_config_json,
              custom_video_url, notes
       FROM workout_block_items
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [sourceBlock.id]
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

      // Duplicate pinned media associations
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

      // Duplicate sets with parent_set_id remapping
      const [sourceSets] = await connection.execute<RowDataPacket[]>(
        `SELECT id, set_number, set_type, parent_set_id, target_reps, target_reps_max,
                target_load_kg, target_duration_seconds, target_distance_meters,
                target_rest_seconds, intensity_indicator
         FROM workout_item_sets
         WHERE block_item_id = ?
         ORDER BY set_number ASC;`,
        [item.id]
      );

      const setIdMap = new Map<number, number>();
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

      // Remap parent_set_id
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

    await connection.commit();

    // Fetch new block tree
    const tree = await getWorkoutVersionTree(ctx, String(sourceBlock.version_public_id));
    const duplicatedBlock = tree?.blocks.find((b) => b.publicId === newBlockPublicId);
    if (!duplicatedBlock) throw new Error("Falha ao carregar bloco duplicado.");
    return duplicatedBlock;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reorders blocks in a DRAFT version transactionally using safe temporary ordering.
 */
export async function reorderBlocksInDraft(
  ctx: TrainingAccessContext,
  versionPublicId: string,
  blockPublicIdsInOrder: string[]
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.status, w.consultancy_id, w.created_by_membership_id
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
    const isCreator = ctx.membershipId && Number(v.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem reordenar blocos.", "FORBIDDEN", 403);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido reordenar blocos de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Fetch existing blocks in this version
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id FROM workout_blocks WHERE workout_version_id = ?;`,
      [v.id]
    );

    if (bRows.length !== blockPublicIdsInOrder.length) {
      throw new TrainingAuthorizationError("A lista de blocos para reordenação deve conter todos os blocos existentes da versão.", "VALIDATION_FAILED", 400);
    }

    const blockMap = new Map<string, number>();
    for (const b of bRows) {
      blockMap.set(String(b.public_id), Number(b.id));
    }

    for (const pubId of blockPublicIdsInOrder) {
      if (!blockMap.has(pubId)) {
        throw new TrainingAuthorizationError("Bloco estrangeiro ou inexistente informado na reordenação.", "VALIDATION_FAILED", 400);
      }
    }

    // Step 1: Assign safe negative temporary sort orders to avoid any collision
    for (let i = 0; i < blockPublicIdsInOrder.length; i++) {
      const bId = blockMap.get(blockPublicIdsInOrder[i])!;
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_blocks SET sort_order = ? WHERE id = ?;`,
        [-1 * (i + 1), bId]
      );
    }

    // Step 2: Assign final sequential sort orders (0, 1, 2, ...)
    for (let i = 0; i < blockPublicIdsInOrder.length; i++) {
      const bId = blockMap.get(blockPublicIdsInOrder[i])!;
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_blocks SET sort_order = ?, updated_at = NOW(3) WHERE id = ?;`,
        [i, bId]
      );
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Removes a block and its dependent items, pinned media, and sets from a DRAFT version.
 */
export async function removeBlockFromDraft(
  ctx: TrainingAccessContext,
  blockPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(b.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem remover blocos.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido remover blocos de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Safe dependency order removal: sets -> item media -> items -> block
    await connection.execute<ResultSetHeader>(
      `DELETE wis FROM workout_item_sets wis
       INNER JOIN workout_block_items wbi ON wbi.id = wis.block_item_id
       WHERE wbi.block_id = ?;`,
      [b.id]
    );

    await connection.execute<ResultSetHeader>(
      `DELETE wbim FROM workout_block_item_media wbim
       INNER JOIN workout_block_items wbi ON wbi.id = wbim.block_item_id
       WHERE wbi.block_id = ?;`,
      [b.id]
    );

    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_block_items WHERE block_id = ?;`,
      [b.id]
    );

    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_blocks WHERE id = ?;`,
      [b.id]
    );

    // Normalize sort_order of remaining blocks in this version
    const [remaining] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM workout_blocks WHERE workout_version_id = ? ORDER BY sort_order ASC;`,
      [b.workout_version_id]
    );
    for (let i = 0; i < remaining.length; i++) {
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_blocks SET sort_order = ? WHERE id = ?;`,
        [i, remaining[i].id]
      );
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Removes an item and its associated sets and pinned media from a draft block.
 */
const METHOD_MIN_ITEMS: Record<WorkoutBlockType, number> = {
  SINGLE: 1,
  BI_SET: 2,
  TRI_SET: 3,
  SUPER_SET: 2,
  CIRCUIT: 2,
  DROP_SET: 1,
  REST_PAUSE: 1,
  COMBINED_SET: 2,
  WARMUP: 1,
  CARDIO: 1,
  CUSTOM: 1,
};

const METHOD_FRIENDLY_NAMES: Record<WorkoutBlockType, string> = {
  SINGLE: "Único",
  BI_SET: "Bi-Set",
  TRI_SET: "Tri-Set",
  SUPER_SET: "Super-Set",
  CIRCUIT: "Circuito",
  DROP_SET: "Drop-Set",
  REST_PAUSE: "Rest-Pause",
  COMBINED_SET: "Série Combinada",
  WARMUP: "Aquecimento",
  CARDIO: "Cardio",
  CUSTOM: "Personalizado",
};

/**
 * Removes an item from a draft block, enforcing lower-bound cardinality guards per method type.
 */
export async function removeItemFromDraft(
  ctx: TrainingAccessContext,
  itemPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.block_id, wb.block_type, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [itemPublicId]
    );

    if (!iRows || iRows.length === 0) {
      throw new TrainingAuthorizationError("Item de treino não encontrado.", "NOT_FOUND", 404);
    }
    const item = iRows[0];

    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem remover itens.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido remover itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Enforce lower-bound item cardinality per method type
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(id) AS cnt FROM workout_block_items WHERE block_id = ? FOR UPDATE;`,
      [item.block_id]
    );
    const currentCount = Number(countRows[0]?.cnt || 0);
    const remainingCount = currentCount - 1;
    const blockType = item.block_type as WorkoutBlockType;
    const minRequired = METHOD_MIN_ITEMS[blockType] ?? 1;

    if (remainingCount < minRequired) {
      const friendlyName = METHOD_FRIENDLY_NAMES[blockType] || blockType;
      if (minRequired > 1) {
        throw new TrainingAuthorizationError(
          `O método ${friendlyName} exige pelo menos ${minRequired} exercício(s). Para remover este exercício, exclua o bloco inteiro ou altere a estrutura.`,
          "VALIDATION_FAILED",
          400
        );
      } else {
        throw new TrainingAuthorizationError(
          `Este método exige pelo menos 1 exercício. Para removê-lo, exclua o bloco inteiro.`,
          "VALIDATION_FAILED",
          400
        );
      }
    }

    // Delete sets and media associations for this item
    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_block_item_media WHERE block_item_id = ?;`,
      [item.id]
    );

    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_block_items WHERE id = ?;`,
      [item.id]
    );

    // Normalize remaining items' sort_order in this block
    const [remaining] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM workout_block_items WHERE block_id = ? ORDER BY sort_order ASC;`,
      [item.block_id]
    );
    for (let i = 0; i < remaining.length; i++) {
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_block_items SET sort_order = ? WHERE id = ?;`,
        [i, remaining[i].id]
      );
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reorders items within a draft block using safe temporary ordering.
 */
export async function reorderItemsInDraft(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  itemPublicIdsInOrder: string[]
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(b.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem reordenar itens.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido reordenar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id FROM workout_block_items WHERE block_id = ?;`,
      [b.id]
    );

    if (iRows.length !== itemPublicIdsInOrder.length) {
      throw new TrainingAuthorizationError("A lista de itens para reordenação deve conter todos os itens do bloco.", "VALIDATION_FAILED", 400);
    }

    const itemMap = new Map<string, number>();
    for (const item of iRows) {
      itemMap.set(String(item.public_id), Number(item.id));
    }

    for (const pubId of itemPublicIdsInOrder) {
      if (!itemMap.has(pubId)) {
        throw new TrainingAuthorizationError("Item estrangeiro ou inexistente informado na reordenação.", "VALIDATION_FAILED", 400);
      }
    }

    // Step 1: Assign safe negative temporary sort orders
    for (let i = 0; i < itemPublicIdsInOrder.length; i++) {
      const iId = itemMap.get(itemPublicIdsInOrder[i])!;
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_block_items SET sort_order = ? WHERE id = ?;`,
        [-1 * (i + 1), iId]
      );
    }

    // Step 2: Assign final sequential sort orders
    for (let i = 0; i < itemPublicIdsInOrder.length; i++) {
      const iId = itemMap.get(itemPublicIdsInOrder[i])!;
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_block_items SET sort_order = ?, updated_at = NOW(3) WHERE id = ?;`,
        [i, iId]
      );
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type SimpleNormalSetInput = {
  setNumber: number;
  targetReps?: number | null;
  targetRepsMax?: number | null;
  targetLoadKg?: number | null;
  targetDurationSeconds?: number | null;
  targetRestSeconds?: number | null;
  intensityIndicator?: string | null;
};

/**
 * Replaces normal sets for an item in a DRAFT version.
 * Strictly guards against flattening advanced set structures (drop sets, rest-pause).
 */
export async function replaceNormalSetsForDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  sets: SimpleNormalSetInput[]
): Promise<WorkoutItemSetDto[]> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar séries.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // MANDATORY GUARD (Section 13): Check if item already contains advanced structures
    const [existingSets] = await connection.execute<RowDataPacket[]>(
      `SELECT id, set_type, parent_set_id FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    for (const s of existingSets) {
      if (s.set_type === "DROP_STAGE" || s.set_type === "REST_PAUSE_MINI" || s.parent_set_id != null) {
        throw new TrainingAuthorizationError(
          "Não é permitido substituir séries de um item contendo estruturas avançadas (drop sets, rest-pause) pelo editor simples.",
          "ADVANCED_SETS_PRESERVED",
          400
        );
      }
    }

    // Delete existing simple sets
    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    const resultSets: WorkoutItemSetDto[] = [];

    // Insert new normal sets
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      const setNum = s.setNumber || (i + 1);

      await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, parent_set_id, target_reps,
          target_reps_max, target_load_kg, target_duration_seconds,
          target_distance_meters, target_rest_seconds, intensity_indicator
        ) VALUES (?, ?, 'NORMAL', NULL, ?, ?, ?, ?, NULL, ?, ?);`,
        [
          item.id,
          setNum,
          s.targetReps ?? null,
          s.targetRepsMax ?? null,
          s.targetLoadKg ?? null,
          s.targetDurationSeconds ?? null,
          s.targetRestSeconds ?? null,
          s.intensityIndicator?.trim() || null,
        ]
      );

      resultSets.push({
        setNumber: setNum,
        setType: "NORMAL",
        parentSetNumber: null,
        targetReps: s.targetReps ?? null,
        targetRepsMax: s.targetRepsMax ?? null,
        targetLoadKg: s.targetLoadKg ?? null,
        targetDurationSeconds: s.targetDurationSeconds ?? null,
        targetDistanceMeters: null,
        targetRestSeconds: s.targetRestSeconds ?? null,
        intensityIndicator: s.intensityIndicator?.trim() || null,
      });
    }

    await connection.commit();
    return resultSets;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Updates title and optional instructions of a block in a DRAFT version.
 */
export async function updateBlockTitleInDraft(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  title: string | null,
  instructions?: string | null
): Promise<WorkoutBlockDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wv.status, wv.public_id AS version_public_id, w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(b.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar blocos.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar blocos de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE workout_blocks
       SET title = ?,
           instructions = COALESCE(?, instructions),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [title?.trim() || null, instructions !== undefined ? (instructions?.trim() || null) : null, b.id]
    );

    const tree = await getWorkoutVersionTree(ctx, String(b.version_public_id));
    const updatedBlock = tree?.blocks.find((blk) => blk.publicId === blockPublicId);
    return updatedBlock!;
  } finally {
    if (connection) connection.release();
  }
}

export type UpdateBlockConfigurationInput = {
  title?: string | null;
  instructions?: string | null;
  rounds?: number | null;
  restBetweenItemsSeconds?: number | null;
  restBetweenRoundsSeconds?: number | null;
  restAfterBlockSeconds?: number | null;
  blockType?: WorkoutBlockType;
};

/**
 * Updates full configuration parameters for a block in a DRAFT version.
 * Supports circuit rounds, rest intervals, instructions, and block type conversion with cardinality checks.
 */
export async function updateBlockConfigurationInDraft(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  input: UpdateBlockConfigurationInput
): Promise<WorkoutBlockDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wb.block_type, wv.status, wv.public_id AS version_public_id,
              w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(b.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar blocos.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar blocos de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // If changing blockType, verify existing items do not violate new cardinality
    const targetBlockType = input.blockType || (b.block_type as WorkoutBlockType);
    if (input.blockType && input.blockType !== b.block_type) {
      const [itemCountRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS item_count FROM workout_block_items WHERE block_id = ?;`,
        [b.id]
      );
      const currentItemCount = Number(itemCountRows[0]?.item_count || 0);

      if (["SINGLE", "DROP_SET", "REST_PAUSE", "CARDIO"].includes(targetBlockType) && currentItemCount > 1) {
        throw new TrainingAuthorizationError(
          `Não é possível converter para ${targetBlockType}: o bloco possui ${currentItemCount} exercícios (máximo permitido é 1).`,
          "CARDINALITY_EXCEEDED",
          400
        );
      }
      if (["BI_SET", "SUPER_SET"].includes(targetBlockType) && currentItemCount > 2) {
        throw new TrainingAuthorizationError(
          `Não é possível converter para ${targetBlockType}: o bloco possui ${currentItemCount} exercícios (máximo permitido é 2).`,
          "CARDINALITY_EXCEEDED",
          400
        );
      }
      if (targetBlockType === "TRI_SET" && currentItemCount > 3) {
        throw new TrainingAuthorizationError(
          `Não é possível converter para TRI_SET: o bloco possui ${currentItemCount} exercícios (máximo permitido é 3).`,
          "CARDINALITY_EXCEEDED",
          400
        );
      }
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE workout_blocks
       SET block_type = ?,
           title = ?,
           instructions = ?,
           rounds = ?,
           rest_between_items_seconds = ?,
           rest_between_rounds_seconds = ?,
           rest_after_block_seconds = ?,
           updated_at = NOW(3)
       WHERE id = ?;`,
      [
        targetBlockType,
        input.title !== undefined ? (input.title?.trim() || null) : null,
        input.instructions !== undefined ? (input.instructions?.trim() || null) : null,
        input.rounds !== undefined ? (input.rounds ?? null) : null,
        input.restBetweenItemsSeconds !== undefined ? (input.restBetweenItemsSeconds ?? null) : null,
        input.restBetweenRoundsSeconds !== undefined ? (input.restBetweenRoundsSeconds ?? null) : null,
        input.restAfterBlockSeconds !== undefined ? (input.restAfterBlockSeconds ?? null) : null,
        b.id,
      ]
    );

    const tree = await getWorkoutVersionTree(ctx, String(b.version_public_id));
    const updatedBlock = tree?.blocks.find((blk) => blk.publicId === blockPublicId);
    return updatedBlock!;
  } finally {
    if (connection) connection.release();
  }
}

export type DropSetStageInput = {
  targetReps?: number | null;
  targetRepsMax?: number | null;
  targetLoadKg?: number | null;
  intensityIndicator?: string | null;
};

export type ReplaceDropSetStructureInput = {
  initialSet: {
    targetReps?: number | null;
    targetRepsMax?: number | null;
    targetLoadKg?: number | null;
    targetRestSeconds?: number | null;
    intensityIndicator?: string | null;
  };
  dropStages: DropSetStageInput[];
};

/**
 * Replaces sets for a DROP_SET item, linking each DROP_STAGE to the initial NORMAL set.
 */
export async function replaceDropSetStructureForDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: ReplaceDropSetStructureInput
): Promise<WorkoutItemSetDto[]> {
  assertCanAuthorTraining(ctx);

  if (!input.dropStages || input.dropStages.length === 0) {
    throw new TrainingAuthorizationError(
      "O método Drop-Set exige ao menos uma etapa de redução de carga (DROP_STAGE).",
      "VALIDATION_FAILED",
      400
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar séries.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Delete existing sets for this item
    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    // 1. Insert Initial Top Set (NORMAL, parent_set_id = NULL)
    const [topRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_sets (
        block_item_id, set_number, set_type, parent_set_id, target_reps,
        target_reps_max, target_load_kg, target_duration_seconds,
        target_distance_meters, target_rest_seconds, intensity_indicator
      ) VALUES (?, 1, 'NORMAL', NULL, ?, ?, ?, NULL, NULL, ?, ?);`,
      [
        item.id,
        input.initialSet.targetReps ?? null,
        input.initialSet.targetRepsMax ?? null,
        input.initialSet.targetLoadKg ?? null,
        input.initialSet.targetRestSeconds ?? null,
        input.initialSet.intensityIndicator?.trim() || null,
      ]
    );
    const parentSetId = topRes.insertId;

    const resultSets: WorkoutItemSetDto[] = [
      {
        setNumber: 1,
        setType: "NORMAL",
        parentSetNumber: null,
        targetReps: input.initialSet.targetReps ?? null,
        targetRepsMax: input.initialSet.targetRepsMax ?? null,
        targetLoadKg: input.initialSet.targetLoadKg ?? null,
        targetDurationSeconds: null,
        targetDistanceMeters: null,
        targetRestSeconds: input.initialSet.targetRestSeconds ?? null,
        intensityIndicator: input.initialSet.intensityIndicator?.trim() || null,
      },
    ];

    // 2. Insert Drop Stages linked to the parent set
    for (let i = 0; i < input.dropStages.length; i++) {
      const drop = input.dropStages[i];
      const setNum = i + 2;

      await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, parent_set_id, target_reps,
          target_reps_max, target_load_kg, target_duration_seconds,
          target_distance_meters, target_rest_seconds, intensity_indicator
        ) VALUES (?, ?, 'DROP_STAGE', ?, ?, ?, ?, NULL, NULL, 0, ?);`,
        [
          item.id,
          setNum,
          parentSetId,
          drop.targetReps ?? null,
          drop.targetRepsMax ?? null,
          drop.targetLoadKg ?? null,
          drop.intensityIndicator?.trim() || `Drop ${i + 1}`,
        ]
      );

      resultSets.push({
        setNumber: setNum,
        setType: "DROP_STAGE",
        parentSetNumber: 1,
        targetReps: drop.targetReps ?? null,
        targetRepsMax: drop.targetRepsMax ?? null,
        targetLoadKg: drop.targetLoadKg ?? null,
        targetDurationSeconds: null,
        targetDistanceMeters: null,
        targetRestSeconds: 0,
        intensityIndicator: drop.intensityIndicator?.trim() || `Drop ${i + 1}`,
      });
    }

    await connection.commit();
    return resultSets;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type RestPauseMiniSetInput = {
  targetReps?: number | null;
  targetLoadKg?: number | null;
  intensityIndicator?: string | null;
};

export type ReplaceRestPauseStructureInput = {
  config: {
    intraPauseSeconds?: number | null;
    targetTotalReps?: number | null;
  };
  initialSet: {
    targetReps?: number | null;
    targetLoadKg?: number | null;
    targetRestSeconds?: number | null;
    intensityIndicator?: string | null;
  };
  miniSets: RestPauseMiniSetInput[];
};

/**
 * Replaces sets for a REST_PAUSE item, saving method config and linking REST_PAUSE_MINI sets to the parent set.
 */
export async function replaceRestPauseStructureForDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: ReplaceRestPauseStructureInput
): Promise<WorkoutItemSetDto[]> {
  assertCanAuthorTraining(ctx);

  if (!input.miniSets || input.miniSets.length === 0) {
    throw new TrainingAuthorizationError(
      "O método Rest-Pause exige ao menos uma mini-série (REST_PAUSE_MINI).",
      "VALIDATION_FAILED",
      400
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar séries.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Save RestPauseMethodConfig in method_config_json
    const configJson = JSON.stringify({
      intraPauseSeconds: input.config.intraPauseSeconds ?? 15,
      targetTotalReps: input.config.targetTotalReps ?? null,
    });
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_block_items SET method_config_json = ?, updated_at = NOW(3) WHERE id = ?;`,
      [configJson, item.id]
    );

    // Delete existing sets for this item
    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    // 1. Insert Initial Set (NORMAL, parent_set_id = NULL)
    const [initRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_sets (
        block_item_id, set_number, set_type, parent_set_id, target_reps,
        target_reps_max, target_load_kg, target_duration_seconds,
        target_distance_meters, target_rest_seconds, intensity_indicator
      ) VALUES (?, 1, 'NORMAL', NULL, ?, NULL, ?, NULL, NULL, ?, ?);`,
      [
        item.id,
        input.initialSet.targetReps ?? null,
        input.initialSet.targetLoadKg ?? null,
        input.initialSet.targetRestSeconds ?? null,
        input.initialSet.intensityIndicator?.trim() || "Falha inicial",
      ]
    );
    const parentSetId = initRes.insertId;

    const resultSets: WorkoutItemSetDto[] = [
      {
        setNumber: 1,
        setType: "NORMAL",
        parentSetNumber: null,
        targetReps: input.initialSet.targetReps ?? null,
        targetRepsMax: null,
        targetLoadKg: input.initialSet.targetLoadKg ?? null,
        targetDurationSeconds: null,
        targetDistanceMeters: null,
        targetRestSeconds: input.initialSet.targetRestSeconds ?? null,
        intensityIndicator: input.initialSet.intensityIndicator?.trim() || "Falha inicial",
      },
    ];

    // 2. Insert Mini Sets linked to the parent set
    const intraPause = input.config.intraPauseSeconds ?? 15;
    for (let i = 0; i < input.miniSets.length; i++) {
      const mini = input.miniSets[i];
      const setNum = i + 2;

      await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, parent_set_id, target_reps,
          target_reps_max, target_load_kg, target_duration_seconds,
          target_distance_meters, target_rest_seconds, intensity_indicator
        ) VALUES (?, ?, 'REST_PAUSE_MINI', ?, ?, NULL, ?, NULL, NULL, ?, ?);`,
        [
          item.id,
          setNum,
          parentSetId,
          mini.targetReps ?? null,
          mini.targetLoadKg ?? null,
          intraPause,
          mini.intensityIndicator?.trim() || `Mini ${i + 1} (${intraPause}s)`,
        ]
      );

      resultSets.push({
        setNumber: setNum,
        setType: "REST_PAUSE_MINI",
        parentSetNumber: 1,
        targetReps: mini.targetReps ?? null,
        targetRepsMax: null,
        targetLoadKg: mini.targetLoadKg ?? null,
        targetDurationSeconds: null,
        targetDistanceMeters: null,
        targetRestSeconds: intraPause,
        intensityIndicator: mini.intensityIndicator?.trim() || `Mini ${i + 1} (${intraPause}s)`,
      });
    }

    await connection.commit();
    return resultSets;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type UpdateCardioConfigurationInput = {
  prescriptionMode?: PrescriptionMode;
  config: CardioMethodConfig;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRestSeconds?: number | null;
  notes?: string | null;
};

/**
 * Updates CARDIO configuration on a draft block item and writes a single target metric set.
 */
export async function updateCardioConfigurationForDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: UpdateCardioConfigurationInput
): Promise<{ config: CardioMethodConfig; sets: WorkoutItemSetDto[] }> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar séries.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    const configJson = JSON.stringify(input.config);
    const mode = input.prescriptionMode || "TIME";

    await connection.execute<ResultSetHeader>(
      `UPDATE workout_block_items
       SET prescription_mode = ?,
           method_config_json = ?,
           notes = COALESCE(?, notes),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [mode, configJson, input.notes !== undefined ? (input.notes?.trim() || null) : null, item.id]
    );

    // Delete existing sets for this cardio item
    await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_item_sets WHERE block_item_id = ?;`,
      [item.id]
    );

    // Insert target cardio set
    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_sets (
        block_item_id, set_number, set_type, parent_set_id, target_reps,
        target_reps_max, target_load_kg, target_duration_seconds,
        target_distance_meters, target_rest_seconds, intensity_indicator
      ) VALUES (?, 1, 'NORMAL', NULL, NULL, NULL, NULL, ?, ?, ?, ?);`,
      [
        item.id,
        input.targetDurationSeconds ?? null,
        input.targetDistanceMeters ?? null,
        input.targetRestSeconds ?? null,
        input.config.intensityLabel?.trim() || (input.config.heartRateZone ? `Zona ${input.config.heartRateZone}` : null),
      ]
    );

    const resultSets: WorkoutItemSetDto[] = [
      {
        setNumber: 1,
        setType: "NORMAL",
        parentSetNumber: null,
        targetReps: null,
        targetRepsMax: null,
        targetLoadKg: null,
        targetDurationSeconds: input.targetDurationSeconds ?? null,
        targetDistanceMeters: input.targetDistanceMeters ?? null,
        targetRestSeconds: input.targetRestSeconds ?? null,
        intensityIndicator: input.config.intensityLabel?.trim() || (input.config.heartRateZone ? `Zona ${input.config.heartRateZone}` : null),
      },
    ];

    await connection.commit();
    return { config: input.config, sets: resultSets };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type UpdateWarmupConfigurationInput = {
  config: WarmupMethodConfig;
  targetCadence?: string | null;
  notes?: string | null;
};

/**
 * Updates WARMUP configuration on a draft block item.
 */
export async function updateWarmupConfigurationForDraftItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: UpdateWarmupConfigurationInput
): Promise<WarmupMethodConfig> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
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
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar séries.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar séries de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    const configJson = input.config ? JSON.stringify(input.config) : null;

    await connection.execute<ResultSetHeader>(
      `UPDATE workout_block_items
       SET method_config_json = ?,
           target_cadence = COALESCE(?, target_cadence),
           notes = COALESCE(?, notes),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [
        configJson,
        input.targetCadence !== undefined ? (input.targetCadence?.trim() || null) : null,
        input.notes !== undefined ? (input.notes?.trim() || null) : null,
        item.id,
      ]
    );

    return input.config;
  } finally {
    if (connection) connection.release();
  }
}

