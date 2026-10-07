/**
 * TREVO ONE — TRAINING V2 WORKOUT REPOSITORY
 * Routine management, immutable versions, block/item/set composition, deep cloning, and transactional publishing.
 */

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertCanAuthorTraining,
} from "./access";
import {
  workoutBlockTypeSchema,
  inspectWorkoutVersionForPublish,
  sanitizeVideoUrl,
} from "./validation";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  WorkoutCombinationType,
  WorkoutItemSetDto,
  WorkoutSubBlockDto,
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
  subBlockPublicId?: string | null;
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
  durationUnit?: "SECONDS" | "MINUTES" | string | null;
  methodConfig?: Record<string, unknown> | null;
  customVideoUrl?: string | null;
  notes?: string | null;
  sortOrder?: number;
};

export type AddSetInput = {
  setNumber?: number;
  setType?: WorkoutSetType;
  parentSetNumber?: number | null;
  targetReps?: number | null;
  targetRepsMax?: number | null;
  targetLoadKg?: number | null;
  targetDurationSeconds?: number | null;
  durationUnit?: "SECONDS" | "MINUTES" | string | null;
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

    await recordConsultancyActivity({
      consultancyId: ctx.consultancyId!,
      actorUserId: ctx.userId,
      actorMembershipId: ctx.membershipId,
      actorRole: ctx.roles.includes("PERSONAL") ? "PERSONAL" : (ctx.roles[0] || "PERSONAL"),
      action: "WORKOUT_CREATED",
      module: "PERSONAL",
      resourceType: "workout",
      resourcePublicId: workoutPublicId,
      summary: `Treino "${input.title.trim()}" criado`,
      metadata: {
        title: input.title.trim(),
        objective: input.objective?.trim() || null,
        isTemplate: Boolean(input.isTemplate),
      },
      connection,
    }).catch(() => {});

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

    // Fetch sub-blocks for all blocks
    const [subBlockRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, block_id, title, sort_order
       FROM workout_sub_blocks
       WHERE block_id IN (${blockIds.map(() => "?").join(",")})
       ORDER BY sort_order ASC;`,
      blockIds
    );

    // Fetch combinations for all blocks
    const [combinationRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, block_id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit, created_at, updated_at
       FROM workout_item_combinations
       WHERE block_id IN (${blockIds.map(() => "?").join(",")})
       ORDER BY sort_order ASC;`,
      blockIds
    );

    // 3. Fetch items for all blocks
    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.public_id, wbi.block_id, wbi.sub_block_id, wbi.combination_id, wbi.sort_order,
              wbi.exercise_name_snapshot, wbi.muscle_group_snapshot,
              wbi.equipment_snapshot, wbi.instructions_snapshot,
              wbi.prescription_mode, wbi.target_cadence, wbi.target_rpe,
              wbi.target_rir, wbi.duration_unit, wbi.method_config_json, wbi.custom_video_url,
              wbi.notes, wbi.exercise_id, wbi.custom_exercise_id,
              e.public_id AS exercise_public_id, e.scope AS exercise_scope,
              ce.public_id AS custom_exercise_public_id,
              wsb.public_id AS sub_block_public_id, wsb.title AS sub_block_title,
              wic.public_id AS combination_public_id, wic.combination_type
       FROM workout_block_items wbi
       LEFT JOIN exercises e ON e.id = wbi.exercise_id
       LEFT JOIN exercises ce ON ce.id = wbi.custom_exercise_id
       LEFT JOIN workout_sub_blocks wsb ON wsb.id = wbi.sub_block_id
       LEFT JOIN workout_item_combinations wic ON wic.id = wbi.combination_id
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
                wis.target_duration_seconds, wis.duration_unit, wis.target_distance_meters,
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

      // Authoritative fallback: for any items with an exercise_id or custom_exercise_id that have no pinned media,
      // fall back to the exercise's approved media so previews never disappear in draft, student view, or preview mode
      const itemsWithoutMedia = iRows.filter(
        (i) => (i.exercise_id || i.custom_exercise_id) && !mRows.some((m) => m.block_item_id === i.id)
      );
      if (itemsWithoutMedia.length > 0) {
        const uniqueExerciseIds = Array.from(
          new Set(itemsWithoutMedia.map((i) => i.exercise_id || i.custom_exercise_id))
        );
        const [exerciseMedia] = await connection.execute<RowDataPacket[]>(
          `SELECT em.exercise_id, em.role, em.sort_order,
                  ma.public_id AS media_public_id, ma.scope, ma.visibility,
                  ma.media_type, ma.storage_provider, ma.mime_type,
                  ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
                  ma.created_at
           FROM exercise_media em
           INNER JOIN media_assets ma ON ma.id = em.media_asset_id
           WHERE em.exercise_id IN (${uniqueExerciseIds.map(() => "?").join(",")}) AND ma.deleted_at IS NULL
           ORDER BY em.sort_order ASC;`,
          uniqueExerciseIds
        );

        for (const item of itemsWithoutMedia) {
          const matchedTargetId = item.exercise_id || item.custom_exercise_id;
          const exMedias = exerciseMedia.filter((em) => em.exercise_id === matchedTargetId);
          for (const em of exMedias) {
            mRows.push({
              block_item_id: item.id,
              role: em.role,
              sort_order: em.sort_order,
              media_public_id: em.media_public_id,
              scope: em.scope,
              visibility: em.visibility,
              media_type: em.media_type,
              storage_provider: em.storage_provider,
              mime_type: em.mime_type,
              file_size_bytes: em.file_size_bytes,
              duration_seconds: em.duration_seconds,
              width: em.width,
              height: em.height,
              created_at: em.created_at,
            } as unknown as RowDataPacket);
          }
        }
      }
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
            durationUnit: s.duration_unit ? String(s.duration_unit) : null,
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

        const effectiveExPublicId = item.exercise_public_id
          ? String(item.exercise_public_id)
          : item.custom_exercise_public_id
          ? String(item.custom_exercise_public_id)
          : null;
        const isCustom = Boolean(
          item.custom_exercise_id ||
          item.custom_exercise_public_id ||
          item.exercise_scope === "CONSULTANCY"
        );

        return {
          publicId: String(item.public_id),
          exercisePublicId: effectiveExPublicId,
          customExercisePublicId: item.custom_exercise_public_id
            ? String(item.custom_exercise_public_id)
            : (isCustom ? effectiveExPublicId : null),
          isCustomExercise: isCustom,
          combinationPublicId: item.combination_public_id ? String(item.combination_public_id) : null,
          combinationType: item.combination_type ? (item.combination_type as WorkoutCombinationType) : null,
          subBlockPublicId: item.sub_block_public_id ? String(item.sub_block_public_id) : null,
          subBlockTitle: item.sub_block_title ? String(item.sub_block_title) : null,
          sortOrder: Number(item.sort_order),
          exerciseNameSnapshot: String(item.exercise_name_snapshot),
          muscleGroupSnapshot: item.muscle_group_snapshot ? String(item.muscle_group_snapshot) : null,
          equipmentSnapshot: item.equipment_snapshot ? String(item.equipment_snapshot) : null,
          instructionsSnapshot: item.instructions_snapshot ? String(item.instructions_snapshot) : null,
          prescriptionMode: item.prescription_mode as PrescriptionMode,
          targetCadence: item.target_cadence ? String(item.target_cadence) : null,
          targetRpe: item.target_rpe != null ? Number(item.target_rpe) : null,
          targetRir: item.target_rir != null ? Number(item.target_rir) : null,
          durationUnit: item.duration_unit ? String(item.duration_unit) : null,
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

      const blockCombinations: WorkoutItemCombinationDto[] = (combinationRows || [])
        .filter((c) => c.block_id === b.id)
        .map((c) => {
          const matchingSb = (subBlockRows || []).find((sb) => sb.id === c.sub_block_id);
          return {
            publicId: String(c.public_id),
            blockPublicId: String(b.public_id),
            subBlockPublicId: matchingSb ? String(matchingSb.public_id) : null,
            combinationType: c.combination_type as WorkoutCombinationType,
            title: c.title ? String(c.title) : null,
            sortOrder: Number(c.sort_order),
            rounds: c.rounds != null ? Number(c.rounds) : null,
            restAfterSeconds: Number(c.rest_after_seconds),
            restAfterUnit: String(c.rest_after_unit || "SECONDS"),
            items: items.filter((it) => it.combinationPublicId === c.public_id),
            createdAt: c.created_at ? new Date(c.created_at) : new Date(),
            updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
          };
        });

      const blockSubBlocks: WorkoutSubBlockDto[] = (subBlockRows || [])
        .filter((sb) => sb.block_id === b.id)
        .map((sb) => ({
          publicId: String(sb.public_id),
          blockPublicId: String(b.public_id),
          title: String(sb.title),
          sortOrder: Number(sb.sort_order),
          items: items.filter((it) => it.subBlockPublicId === sb.public_id),
          combinations: blockCombinations.filter((c) => c.subBlockPublicId === sb.public_id),
          createdAt: sb.created_at ? new Date(sb.created_at) : new Date(),
          updatedAt: sb.updated_at ? new Date(sb.updated_at) : new Date(),
        }));

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
        subBlocks: blockSubBlocks,
        combinations: blockCombinations,
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

    const parsedBlockType = workoutBlockTypeSchema.safeParse(input.blockType);
    if (!parsedBlockType.success) {
      throw new TrainingAuthorizationError(
        "Método de bloco inválido.",
        "VALIDATION_FAILED",
        400
      );
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
        parsedBlockType.data,
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
      blockType: parsedBlockType.data,
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

    // In Training V2 simplified architecture, categories support unlimited exercises
    if (b.block_type !== "CUSTOM") {
      await connection.execute(
        "UPDATE workout_blocks SET block_type = 'CUSTOM' WHERE id = ?;",
        [b.id]
      );
      b.block_type = "CUSTOM";
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
      const trimmedMuscle = input.customSnapshot.muscleGroup?.trim() || null;
      if (trimmedMuscle && trimmedMuscle.length > 100) {
        throw new TrainingAuthorizationError("O grupo muscular não pode exceder 100 caracteres.", "VALIDATION_FAILED", 400);
      }
      const trimmedEquip = input.customSnapshot.equipment?.trim() || null;
      if (trimmedEquip && trimmedEquip.length > 100) {
        throw new TrainingAuthorizationError("O equipamento não pode exceder 100 caracteres.", "VALIDATION_FAILED", 400);
      }
      nameSnapshot = input.customSnapshot.exerciseName.trim();
      muscleSnapshot = trimmedMuscle;
      equipSnapshot = trimmedEquip;
      instSnapshot = input.customSnapshot.instructions?.trim() || null;
    }

    let subBlockId: number | null = null;
    let subBlockTitle: string | null = null;
    if (input.subBlockPublicId) {
      const [sbRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, title FROM workout_sub_blocks WHERE public_id = ? AND block_id = ? LIMIT 1;`,
        [input.subBlockPublicId, b.id]
      );
      if (sbRows.length > 0) {
        subBlockId = sbRows[0].id;
        subBlockTitle = String(sbRows[0].title);
      }
    }

    const itemPublicId = crypto.randomUUID();
    const sortOrder = input.sortOrder ?? 0;
    const configJson = input.methodConfig ? JSON.stringify(input.methodConfig) : null;

    const [itemRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_block_items (
        public_id, block_id, sub_block_id, exercise_id, sort_order, exercise_name_snapshot,
        muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
        prescription_mode, target_cadence, target_rpe, target_rir, duration_unit,
        method_config_json, custom_video_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        itemPublicId,
        b.id,
        subBlockId,
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
        input.durationUnit || null,
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
      subBlockPublicId: input.subBlockPublicId || null,
      subBlockTitle,
      sortOrder,
      exerciseNameSnapshot: nameSnapshot,
      muscleGroupSnapshot: muscleSnapshot,
      equipmentSnapshot: equipSnapshot,
      instructionsSnapshot: instSnapshot,
      prescriptionMode: input.prescriptionMode || "SETS",
      targetCadence: input.targetCadence?.trim() || null,
      targetRpe: input.targetRpe ?? null,
      targetRir: input.targetRir ?? null,
      durationUnit: input.durationUnit || null,
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

    const setType = input.setType || "NORMAL";
    let setNumber = input.setNumber;
    if (setNumber == null) {
      const [maxRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COALESCE(MAX(set_number), 0) + 1 AS next_set_number FROM workout_item_sets WHERE block_item_id = ?;`,
        [item.id]
      );
      setNumber = Number(maxRows[0]?.next_set_number || 1);
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
      if (setType === "DROP_STAGE" || setType === "REST_PAUSE_MINI") {
        throw new TrainingAuthorizationError(
          `Séries do tipo ${setType} exigem obrigatoriamente a indicação da série principal (parentSetNumber).`,
          "MISSING_PARENT_SET",
          400
        );
      }
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_sets (
        block_item_id, set_number, set_type, parent_set_id, target_reps,
        target_reps_max, target_load_kg, target_duration_seconds, duration_unit,
        target_distance_meters, target_rest_seconds, intensity_indicator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        setNumber,
        setType,
        parentSetId,
        input.targetReps ?? null,
        input.targetRepsMax ?? null,
        input.targetLoadKg ?? null,
        input.targetDurationSeconds ?? null,
        input.durationUnit || null,
        input.targetDistanceMeters ?? null,
        input.targetRestSeconds ?? null,
        input.intensityIndicator?.trim() || null,
      ]
    );

    return {
      setNumber,
      setType,
      parentSetNumber: input.parentSetNumber ?? null,
      targetReps: input.targetReps ?? null,
      targetRepsMax: input.targetRepsMax ?? null,
      targetLoadKg: input.targetLoadKg ?? null,
      targetDurationSeconds: input.targetDurationSeconds ?? null,
      durationUnit: input.durationUnit || null,
      targetDistanceMeters: input.targetDistanceMeters ?? null,
      targetRestSeconds: input.targetRestSeconds ?? null,
      intensityIndicator: input.intensityIndicator?.trim() || null,
    };
  } finally {
    if (connection) connection.release();
  }
}

export type WorkoutVersionSummaryDto = {
  publicId: string;
  versionNumber: number;
  status: WorkoutVersionStatus;
  title: string;
  subtitle: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  blocksCount: number;
};

/**
 * Authoritative server-side validation for publishing a workout version.
 * Requires at least 1 block and complete structural validity of all 11 methods.
 * Tolerant to optional/secondary fields (e.g. invalid video URL, empty observations).
 */
export function validateWorkoutVersionForPublish(tree: WorkoutVersionDto): { warnings: string[] } {
  if (!tree.blocks || tree.blocks.length === 0) {
    throw new TrainingAuthorizationError(
      "O treino deve conter ao menos 1 bloco de exercícios para ser publicado.",
      "VALIDATION_FAILED",
      400
    );
  }

  // Guard against unresolved / unmatched exercises
  let unresolvedCount = 0;
  for (const block of tree.blocks || []) {
    for (const item of block.items || []) {
      const isCustom = Boolean(item.customExercisePublicId || item.isCustomExercise);
      const isLibrary = Boolean(item.exercisePublicId && !item.isCustomExercise);
      if (!isCustom && !isLibrary) {
        unresolvedCount++;
      }
    }
  }
  if (unresolvedCount > 0) {
    throw new TrainingAuthorizationError(
      `${unresolvedCount} exercício(s) precisa(m) ser revisado(s) antes da publicação.`,
      "UNRESOLVED_EXERCISES",
      400
    );
  }

  const inspection = inspectWorkoutVersionForPublish(tree);
  if (inspection.fatalErrors.length > 0) {
    throw new TrainingAuthorizationError(
      `Estrutura do treino inválida para publicação: ${inspection.fatalErrors.join(" | ")}`,
      "VALIDATION_FAILED",
      400
    );
  }
  return { warnings: inspection.warnings };
}

/**
 * Generic deep-clone helper for Training V2 version trees.
 * Deep-clones all blocks, sub-blocks, items, snapshots, method configurations, pinned media associations,
 * and normalized sets with parent_set_id remapping (for DROP_STAGE and REST_PAUSE_MINI).
 *
 * CRITICAL RULE: Generates brand new identities (public_id) for all cloned mutable rows.
 * Reuses media_asset_id references directly without duplicating media files.
 */
async function cloneVersionTree(
  connection: import("mysql2/promise").PoolConnection,
  sourceVersionId: number,
  targetVersionId: number
): Promise<void> {
  // 1. Fetch source blocks ordered by sort_order
  const [sourceBlocks] = await connection.execute<RowDataPacket[]>(
    `SELECT id, block_type, title, sort_order, rounds, rest_between_items_seconds,
            rest_between_rounds_seconds, rest_after_block_seconds, instructions
     FROM workout_blocks
     WHERE workout_version_id = ?
     ORDER BY sort_order ASC;`,
    [sourceVersionId]
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
        targetVersionId,
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

    // 1b. Fetch and clone sub-blocks of this block
    const [sourceSubBlocks] = await connection.execute<RowDataPacket[]>(
      `SELECT id, title, sort_order FROM workout_sub_blocks WHERE block_id = ? ORDER BY sort_order ASC;`,
      [b.id]
    );
    const subBlockIdMap = new Map<number, number>(); // oldSubBlockId -> newSubBlockId
    for (const sb of sourceSubBlocks) {
      const newSubBlockPublicId = crypto.randomUUID();
      const [sbRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_sub_blocks (public_id, block_id, title, sort_order) VALUES (?, ?, ?, ?);`,
        [newSubBlockPublicId, newBlockId, sb.title, sb.sort_order]
      );
      subBlockIdMap.set(Number(sb.id), sbRes.insertId);
    }

    // 1c. Fetch and clone combinations of this block
    const [sourceCombinations] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
       FROM workout_item_combinations
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [b.id]
    );
    const combinationIdMap = new Map<number, number>(); // oldCombinationId -> newCombinationId
    for (const sc of sourceCombinations) {
      const newCombPublicId = crypto.randomUUID();
      const targetSubBlockId =
        sc.sub_block_id != null && subBlockIdMap.has(Number(sc.sub_block_id))
          ? subBlockIdMap.get(Number(sc.sub_block_id))
          : null;
      const [combRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_combinations (
          public_id, block_id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newCombPublicId,
          newBlockId,
          targetSubBlockId,
          sc.combination_type,
          sc.title,
          sc.sort_order,
          sc.rounds,
          sc.rest_after_seconds,
          sc.rest_after_unit,
        ]
      );
      combinationIdMap.set(Number(sc.id), combRes.insertId);
    }

    // 2. Fetch source items of this block
    const [sourceItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sub_block_id, combination_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
              equipment_snapshot, instructions_snapshot, prescription_mode,
              target_cadence, target_rpe, target_rir, duration_unit, method_config_json,
              custom_video_url, notes
       FROM workout_block_items
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [b.id]
    );

    for (const item of sourceItems) {
      const newItemPublicId = crypto.randomUUID();
      const targetSubBlockId =
        item.sub_block_id != null && subBlockIdMap.has(Number(item.sub_block_id))
          ? subBlockIdMap.get(Number(item.sub_block_id))
          : null;
      const targetCombinationId =
        item.combination_id != null && combinationIdMap.has(Number(item.combination_id))
          ? combinationIdMap.get(Number(item.combination_id))
          : null;
      const methodConfigValue =
        item.method_config_json != null
          ? typeof item.method_config_json === "object"
            ? JSON.stringify(item.method_config_json)
            : item.method_config_json
          : null;

      const [iRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_block_items (
          public_id, block_id, sub_block_id, combination_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot,
          muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
          prescription_mode, target_cadence, target_rpe, target_rir,
          duration_unit, method_config_json, custom_video_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newItemPublicId,
          newBlockId,
          targetSubBlockId,
          targetCombinationId,
          item.exercise_id,
          item.custom_exercise_id,
          item.sort_order,
          item.exercise_name_snapshot,
          item.muscle_group_snapshot,
          item.equipment_snapshot,
          item.instructions_snapshot,
          item.prescription_mode,
          item.target_cadence,
          item.target_rpe,
          item.target_rir,
          item.duration_unit || null,
          methodConfigValue,
          item.custom_video_url,
          item.notes,
        ]
      );
      const newItemId = iRes.insertId;

      // 3. Clone pinned media associations (reusing immutable media_asset_id)
      const [pinnedMedia] = await connection.execute<RowDataPacket[]>(
        `SELECT media_asset_id, role, sort_order FROM workout_block_item_media WHERE block_item_id = ? ORDER BY sort_order ASC;`,
        [item.id]
      );
      for (const pm of pinnedMedia) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [newItemId, pm.media_asset_id, pm.role, pm.sort_order]
        );
      }

      // 4. Clone sets with parent_set_id remapping
      const [sourceSets] = await connection.execute<RowDataPacket[]>(
        `SELECT id, set_number, set_type, parent_set_id, target_reps, target_reps_max,
                target_load_kg, target_duration_seconds, duration_unit, target_distance_meters,
                target_rest_seconds, intensity_indicator
         FROM workout_item_sets
         WHERE block_item_id = ?
         ORDER BY set_number ASC;`,
        [item.id]
      );

      const setIdMap = new Map<number, number>(); // oldSetId -> newSetId

      // Pass 1: Insert sets with parent_set_id = NULL
      for (const s of sourceSets) {
        const [sRes] = await connection.execute<ResultSetHeader>(
          `INSERT INTO workout_item_sets (
            block_item_id, set_number, set_type, parent_set_id, target_reps,
            target_reps_max, target_load_kg, target_duration_seconds,
            duration_unit, target_distance_meters, target_rest_seconds, intensity_indicator
          ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            newItemId,
            s.set_number,
            s.set_type,
            s.target_reps,
            s.target_reps_max,
            s.target_load_kg,
            s.target_duration_seconds,
            s.duration_unit || null,
            s.target_distance_meters,
            s.target_rest_seconds,
            s.intensity_indicator,
          ]
        );
        setIdMap.set(Number(s.id), sRes.insertId);
      }

      // Pass 2: Remap parent_set_id for DROP_STAGE and REST_PAUSE_MINI
      for (const s of sourceSets) {
        if (s.parent_set_id != null && setIdMap.has(Number(s.parent_set_id))) {
          const remappedParentId = setIdMap.get(Number(s.parent_set_id));
          const currentNewSetId = setIdMap.get(Number(s.id));
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
}

/**
 * Publishes a DRAFT workout version.
 * Transactional: locks rows, validates complete persisted version tree (all 11 block types, at least 1 block),
 * archives prior published version, marks current version as PUBLISHED.
 */
export async function publishWorkoutVersion(
  ctx: TrainingAccessContext,
  versionPublicId: string,
  options?: { autoConvertUnresolved?: boolean }
): Promise<WorkoutVersionDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock version row and workout root FOR UPDATE
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.workout_id, wv.version_number, wv.status,
              w.consultancy_id, w.created_by_membership_id, w.status AS workout_status, w.is_template
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ? AND w.deleted_at IS NULL
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
    if (!ctx.canManageConsultancy && Number(v.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do treino.", "FORBIDDEN", 403);
    }
    if (v.workout_status === "ARCHIVED") {
      throw new TrainingAuthorizationError("Não é permitido publicar versões de um treino arquivado.", "INVALID_STATUS", 400);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Apenas versões em rascunho (DRAFT) podem ser publicadas.", "INVALID_STATUS", 400);
    }

    // 2. Load complete persisted version tree
    const tree = await getWorkoutVersionTree(ctx, versionPublicId);
    if (!tree) {
      throw new TrainingAuthorizationError("Falha ao carregar estrutura persistida do treino.", "INTERNAL_ERROR", 500);
    }

    // 2.4 Explicit professional one-click batch conversion:
    // If autoConvertUnresolved is enabled by explicit professional confirmation, convert all items
    // where exercise_id IS NULL AND custom_exercise_id IS NULL to tenant-scoped CUSTOM exercises.
    // 100% of sets, reps, weight, duration, rest, method, method_config_json, notes, instructions,
    // order, and combinations are preserved without alteration.
    if (options?.autoConvertUnresolved) {
      const [unresolvedDbItems] = await connection.execute<RowDataPacket[]>(
        `SELECT wbi.id, wbi.public_id, wbi.exercise_name_snapshot,
                wbi.muscle_group_snapshot, wbi.equipment_snapshot, wbi.instructions_snapshot
         FROM workout_block_items wbi
         INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
         WHERE wb.workout_version_id = ?
           AND wbi.exercise_id IS NULL
           AND wbi.custom_exercise_id IS NULL
         ORDER BY wbi.id ASC;`,
        [v.id]
      );

      for (const item of unresolvedDbItems) {
        const rawName = (item.exercise_name_snapshot || "").trim();
        const cleanName = rawName.length > 0 ? rawName : "Exercício Personalizado";
        const muscleGroup = item.muscle_group_snapshot?.trim() || "Geral";
        const equipment = item.equipment_snapshot?.trim() || "Outro";
        const instructions = item.instructions_snapshot?.trim() || null;
        const customExPublicId = crypto.randomUUID();

        // 1. Insert into exercises table (scoped to consultancy)
        const [exRes] = await connection.execute<ResultSetHeader>(
          `INSERT INTO exercises (
             public_id, consultancy_id, name, muscle_group_primary,
             equipment, instructions, status, scope,
             created_by_user_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, 'PUBLISHED', 'CONSULTANCY', ?, NOW(3), NOW(3));`,
          [
            customExPublicId,
            v.consultancy_id,
            cleanName,
            muscleGroup,
            equipment,
            instructions,
            ctx.userId || null,
          ]
        );

        const customExerciseId = exRes.insertId;

        // 2. Update item with custom_exercise_id (PRESERVING all sets, method_config, notes, order, combinations)
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_block_items
           SET exercise_id = NULL,
               custom_exercise_id = ?,
               exercise_name_snapshot = ?,
               muscle_group_snapshot = COALESCE(muscle_group_snapshot, ?),
               equipment_snapshot = COALESCE(equipment_snapshot, ?),
               updated_at = NOW(3)
           WHERE id = ?;`,
          [customExerciseId, cleanName, muscleGroup, equipment, item.id]
        );

        // Update in-memory tree item so validateWorkoutVersionForPublish passes
        for (const block of tree.blocks || []) {
          for (const it of block.items || []) {
            if (it.publicId === item.public_id) {
              it.isCustomExercise = true;
              it.customExercisePublicId = customExPublicId;
              it.exercisePublicId = customExPublicId;
              it.exerciseNameSnapshot = cleanName;
            }
          }
        }
      }
    }

    // 2.5 Tolerant sanitization of optional fields before publish
    for (const block of tree.blocks || []) {
      for (const item of block.items || []) {
        if (item.customVideoUrl) {
          const sanitized = sanitizeVideoUrl(item.customVideoUrl);
          if (sanitized !== item.customVideoUrl) {
            item.customVideoUrl = sanitized;
            await connection.execute<ResultSetHeader>(
              `UPDATE workout_block_items SET custom_video_url = ? WHERE public_id = ?;`,
              [sanitized, item.publicId]
            );
          }
        }
        if (item.notes) {
          const trimmed = item.notes.trim();
          item.notes = trimmed.length > 0 ? trimmed : null;
        }
      }
    }

    // 2.8 Authoritative server-side publish guard directly against DB:
    // Rejects publication if any item in this version has exercise_id IS NULL AND custom_exercise_id IS NULL.
    // LIBRARY and CUSTOM items are publishable; UNRESOLVED items are strictly forbidden.
    const [unresolvedDbRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS unresolved_count
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       WHERE wb.workout_version_id = ?
         AND wbi.exercise_id IS NULL
         AND wbi.custom_exercise_id IS NULL;`,
      [v.id]
    );
    const dbUnresolvedCount = Number(unresolvedDbRows[0]?.unresolved_count || 0);
    if (dbUnresolvedCount > 0) {
      throw new TrainingAuthorizationError(
        `${dbUnresolvedCount} exercício(s) precisa(m) ser revisado(s) antes da publicação.`,
        "UNRESOLVED_EXERCISES",
        400
      );
    }

    // 3. Domain validation for publishing (at least 1 block + 11 methods validation; tolerant to optional fields)
    validateWorkoutVersionForPublish(tree);

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
 * Publishes a DRAFT workout version, automatically converting any remaining
 * UNRESOLVED exercises to tenant-scoped CUSTOM exercises with 100% prescription fidelity.
 * Requires explicit human action from the professional.
 */
export async function publishWorkoutWithAutoCustomConversion(
  ctx: TrainingAccessContext,
  versionPublicId: string
): Promise<WorkoutVersionDto> {
  return publishWorkoutVersion(ctx, versionPublicId, { autoConvertUnresolved: true });
}

/**
 * Creates a new DRAFT version (vN+1) from an immutable PUBLISHED version.
 * Clones version metadata, blocks, items, pinned media associations, and normalized sets with parent_set_id remapping.
 * Idempotent: If an active DRAFT already exists, returns the existing draft.
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
      `SELECT id, consultancy_id, created_by_membership_id, status FROM workouts WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE;`,
      [workoutPublicId]
    );
    if (!wRows || wRows.length === 0) {
      throw new TrainingAuthorizationError("Treino não encontrado.", "NOT_FOUND", 404);
    }
    const workout = wRows[0];
    if (Number(workout.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (!ctx.canManageConsultancy && Number(workout.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do treino.", "FORBIDDEN", 403);
    }
    if (workout.status === "ARCHIVED") {
      throw new TrainingAuthorizationError("Não é permitido criar versões em um treino arquivado.", "INVALID_STATUS", 400);
    }

    // 2. Canonical idempotent behavior: if active DRAFT already exists, return existing draft!
    const [draftRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id FROM workout_versions WHERE workout_id = ? AND status = 'DRAFT' LIMIT 1;`,
      [workout.id]
    );
    if (draftRows.length > 0) {
      await connection.commit();
      const existingDraft = await getWorkoutVersionTree(ctx, String(draftRows[0].public_id));
      return existingDraft!;
    }

    // 3. Find latest published version to clone from
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

    // 4. Concurrency-safe calculation of MAX(version_number) + 1 under locked workout root
    const [maxRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(version_number), 0) AS max_v FROM workout_versions WHERE workout_id = ?;`,
      [workout.id]
    );
    const newVersionNumber = Number(maxRows[0].max_v) + 1;
    const newVersionPublicId = crypto.randomUUID();

    // 5. Insert new DRAFT version
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

    // 6. Deep clone tree via cloneVersionTree
    await cloneVersionTree(connection, Number(sourceVer.id), newVersionId);

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
 * Duplicates a complete workout routine from an explicit source version into a NEW workout root.
 * Generates brand new IDs for all mutable rows and creates Version 1 DRAFT.
 */
export async function duplicateWorkout(
  ctx: TrainingAccessContext,
  sourceWorkoutPublicId: string,
  sourceVersionPublicId: string,
  options?: { title?: string; isTemplate?: boolean }
): Promise<{ workout: WorkoutRootDto; version: WorkoutVersionDto }> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolve source workout and source version with strict combination check
    const [sourceRows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.id AS workout_id, w.consultancy_id, w.created_by_membership_id, w.status AS workout_status, w.is_template,
              wv.id AS version_id, wv.version_number, wv.status AS version_status,
              wv.title AS version_title, wv.subtitle AS version_subtitle,
              wv.objective AS version_objective, wv.estimated_duration_minutes AS version_duration,
              wv.difficulty_level AS version_difficulty, wv.notes AS version_notes
       FROM workouts w
       INNER JOIN workout_versions wv ON wv.workout_id = w.id
       WHERE w.public_id = ? AND wv.public_id = ? AND w.deleted_at IS NULL
       FOR UPDATE;`,
      [sourceWorkoutPublicId, sourceVersionPublicId]
    );

    if (!sourceRows || sourceRows.length === 0) {
      throw new TrainingAuthorizationError("Treino ou versão de origem não encontrados.", "NOT_FOUND", 404);
    }
    const source = sourceRows[0];

    // Tenancy check
    if (Number(source.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    // Professional ownership check
    if (!ctx.canManageConsultancy && Number(source.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do treino.", "FORBIDDEN", 403);
    }

    const newWorkoutPublicId = crypto.randomUUID();
    const newVersionPublicId = crypto.randomUUID();
    const newTitle = options?.title?.trim() || `Cópia de ${source.version_title}`;
    const targetIsTemplate =
      options?.isTemplate !== undefined
        ? Boolean(options.isTemplate)
        : Boolean(source.is_template);

    // 2. Insert new workout root (is_template preserved from source or override)
    const [wRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, subtitle,
        objective, estimated_duration_minutes, difficulty_level, is_template, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE');`,
      [
        newWorkoutPublicId,
        ctx.consultancyId!,
        ctx.membershipId!,
        newTitle,
        source.version_subtitle,
        source.version_objective,
        source.version_duration,
        source.version_difficulty || "INTERMEDIATE",
        targetIsTemplate ? 1 : 0,
      ]
    );
    const newWorkoutId = wRes.insertId;

    // 3. Insert new Version 1 DRAFT
    const [vRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', NULL, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newVersionPublicId,
        newWorkoutId,
        newTitle,
        source.version_subtitle,
        source.version_objective,
        source.version_duration,
        source.version_difficulty || "INTERMEDIATE",
        source.version_notes,
        ctx.membershipId!,
      ]
    );
    const newVersionId = vRes.insertId;

    // 4. Deep clone tree from source.version_id
    await cloneVersionTree(connection, Number(source.version_id), newVersionId);

    await connection.commit();

    const newVersionTree = await getWorkoutVersionTree(ctx, newVersionPublicId);

    const workoutDto: WorkoutRootDto = {
      publicId: newWorkoutPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      title: newTitle,
      subtitle: source.version_subtitle,
      objective: source.version_objective,
      estimatedDurationMinutes: source.version_duration != null ? Number(source.version_duration) : null,
      difficultyLevel: source.version_difficulty || "INTERMEDIATE",
      isTemplate: targetIsTemplate,
      status: "ACTIVE",
      currentPublishedVersion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { workout: workoutDto, version: newVersionTree! };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Saves a workout routine as a Template (is_template = true) from an explicit source version.
 * Template lifecycle rule:
 * - If source was PUBLISHED -> creates template with Version 1 PUBLISHED (selectable for routine creation).
 * - If source was DRAFT -> creates template with Version 1 DRAFT (must be published before use).
 */
export async function saveWorkoutAsTemplate(
  ctx: TrainingAccessContext,
  sourceWorkoutPublicId: string,
  sourceVersionPublicId: string,
  options?: { title?: string }
): Promise<{ workout: WorkoutRootDto; version: WorkoutVersionDto }> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolve source workout and source version with strict combination check
    const [sourceRows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.id AS workout_id, w.consultancy_id, w.created_by_membership_id, w.status AS workout_status,
              wv.id AS version_id, wv.version_number, wv.status AS version_status,
              wv.title AS version_title, wv.subtitle AS version_subtitle,
              wv.objective AS version_objective, wv.estimated_duration_minutes AS version_duration,
              wv.difficulty_level AS version_difficulty, wv.notes AS version_notes
       FROM workouts w
       INNER JOIN workout_versions wv ON wv.workout_id = w.id
       WHERE w.public_id = ? AND wv.public_id = ? AND w.deleted_at IS NULL
       FOR UPDATE;`,
      [sourceWorkoutPublicId, sourceVersionPublicId]
    );

    if (!sourceRows || sourceRows.length === 0) {
      throw new TrainingAuthorizationError("Treino ou versão de origem não encontrados.", "NOT_FOUND", 404);
    }
    const source = sourceRows[0];

    // Tenancy check
    if (Number(source.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    // Professional ownership check
    if (!ctx.canManageConsultancy && Number(source.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do treino.", "FORBIDDEN", 403);
    }

    const newTemplatePublicId = crypto.randomUUID();
    const newVersionPublicId = crypto.randomUUID();
    const newTitle = options?.title?.trim() || `${source.version_title} (Modelo)`;

    const isSourcePublished = source.version_status === "PUBLISHED";
    const targetStatus = isSourcePublished ? "PUBLISHED" : "DRAFT";

    // 2. Insert new template root (is_template = true)
    const [wRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, subtitle,
        objective, estimated_duration_minutes, difficulty_level, is_template, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE');`,
      [
        newTemplatePublicId,
        ctx.consultancyId!,
        ctx.membershipId!,
        newTitle,
        source.version_subtitle,
        source.version_objective,
        source.version_duration,
        source.version_difficulty || "INTERMEDIATE",
      ]
    );
    const newTemplateId = wRes.insertId;

    // 3. Insert Version 1
    const [vRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, 1, ?, ${isSourcePublished ? "NOW(3)" : "NULL"}, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newVersionPublicId,
        newTemplateId,
        targetStatus,
        newTitle,
        source.version_subtitle,
        source.version_objective,
        source.version_duration,
        source.version_difficulty || "INTERMEDIATE",
        source.version_notes,
        ctx.membershipId!,
      ]
    );
    const newVersionId = vRes.insertId;

    // 4. Deep clone tree from source.version_id
    await cloneVersionTree(connection, Number(source.version_id), newVersionId);

    await connection.commit();

    const newVersionTree = await getWorkoutVersionTree(ctx, newVersionPublicId);

    const workoutDto: WorkoutRootDto = {
      publicId: newTemplatePublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      title: newTitle,
      subtitle: source.version_subtitle,
      objective: source.version_objective,
      estimatedDurationMinutes: source.version_duration != null ? Number(source.version_duration) : null,
      difficultyLevel: source.version_difficulty || "INTERMEDIATE",
      isTemplate: true,
      status: "ACTIVE",
      currentPublishedVersion: isSourcePublished ? newVersionTree : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { workout: workoutDto, version: newVersionTree! };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Creates a NEW normal workout routine (is_template = false, Version 1 DRAFT) from a PUBLISHED template.
 * Deep-clones the template version tree into the new routine root.
 */
export async function createWorkoutFromTemplate(
  ctx: TrainingAccessContext,
  templatePublicId: string,
  options?: { title?: string; targetStudentMembershipPublicId?: string }
): Promise<{ workout: WorkoutRootDto; version: WorkoutVersionDto }> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolve template root
    const [tRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, created_by_membership_id, title, subtitle,
              objective, estimated_duration_minutes, difficulty_level
       FROM workouts
       WHERE public_id = ? AND is_template = 1 AND deleted_at IS NULL
       FOR UPDATE;`,
      [templatePublicId]
    );

    if (!tRows || tRows.length === 0) {
      throw new TrainingAuthorizationError("Modelo de treino não encontrado.", "NOT_FOUND", 404);
    }
    const t = tRows[0];

    // Tenancy check
    if (Number(t.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao modelo de outra consultoria.", "FORBIDDEN", 403);
    }
    // Access check: creator or consultancy admin
    if (!ctx.canManageConsultancy && Number(t.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do modelo.", "FORBIDDEN", 403);
    }

    // 2. Resolve template's current PUBLISHED version
    const [pubRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, subtitle, objective, estimated_duration_minutes,
              difficulty_level, notes
       FROM workout_versions
       WHERE workout_id = ? AND status = 'PUBLISHED'
       ORDER BY version_number DESC
       LIMIT 1;`,
      [t.id]
    );

    if (!pubRows || pubRows.length === 0) {
      throw new TrainingAuthorizationError(
        "O modelo selecionado precisa estar publicado para gerar novos treinos.",
        "TEMPLATE_NOT_PUBLISHED",
        400
      );
    }
    const templateVer = pubRows[0];

    const newWorkoutPublicId = crypto.randomUUID();
    const newVersionPublicId = crypto.randomUUID();
    const newTitle = options?.title?.trim() || templateVer.title;

    // 3. Insert NEW normal workout root (is_template = false)
    const [wRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, subtitle,
        objective, estimated_duration_minutes, difficulty_level, is_template, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE');`,
      [
        newWorkoutPublicId,
        ctx.consultancyId!,
        ctx.membershipId!,
        newTitle,
        templateVer.subtitle,
        templateVer.objective,
        templateVer.estimated_duration_minutes,
        templateVer.difficulty_level || "INTERMEDIATE",
      ]
    );
    const newWorkoutId = wRes.insertId;

    // 4. Insert Version 1 DRAFT
    const [vRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', NULL, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newVersionPublicId,
        newWorkoutId,
        newTitle,
        templateVer.subtitle,
        templateVer.objective,
        templateVer.estimated_duration_minutes,
        templateVer.difficulty_level || "INTERMEDIATE",
        templateVer.notes,
        ctx.membershipId!,
      ]
    );
    const newVersionId = vRes.insertId;

    // 5. Deep clone tree from template version
    await cloneVersionTree(connection, Number(templateVer.id), newVersionId);

    await connection.commit();

    const newVersionTree = await getWorkoutVersionTree(ctx, newVersionPublicId);

    const workoutDto: WorkoutRootDto = {
      publicId: newWorkoutPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      title: newTitle,
      subtitle: templateVer.subtitle,
      objective: templateVer.objective,
      estimatedDurationMinutes: templateVer.estimated_duration_minutes != null ? Number(templateVer.estimated_duration_minutes) : null,
      difficultyLevel: templateVer.difficulty_level || "INTERMEDIATE",
      isTemplate: false,
      status: "ACTIVE",
      currentPublishedVersion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { workout: workoutDto, version: newVersionTree! };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type AssignTemplateToStudentInput = {
  startsOn?: string;
  endsOn?: string | null;
  notesForStudent?: string | null;
  customTitle?: string;
};

/**
 * Assigns a PUBLISHED workout template directly to a student.
 *
 * CORE CONTRACT (COPY-ON-ASSIGN):
 * 1. Creates a brand NEW normal workout root (is_template = false) for the student.
 * 2. Creates Version 1 PUBLISHED on that workout root.
 * 3. Deep-clones the complete template tree (blocks, combinations, items, media, sets) into the new version.
 * 4. Links the student to this independent copy in workout_assignments.
 * 5. The template and the student copy are 100% ISOLATED:
 *    - Future edits to the student's copy NEVER alter the template or other students.
 *    - Future edits to the template NEVER alter existing student assignments.
 */
export async function assignTemplateToStudent(
  ctx: TrainingAccessContext,
  templatePublicId: string,
  studentMembershipPublicId: string,
  options?: AssignTemplateToStudentInput
): Promise<{
  workout: WorkoutRootDto;
  version: WorkoutVersionDto;
  assignmentPublicId: string;
}> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolve template root
    const [tRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, created_by_membership_id, title, subtitle,
              objective, estimated_duration_minutes, difficulty_level
       FROM workouts
       WHERE public_id = ? AND is_template = 1 AND deleted_at IS NULL
       FOR UPDATE;`,
      [templatePublicId]
    );

    if (!tRows || tRows.length === 0) {
      throw new TrainingAuthorizationError("Modelo de treino não encontrado.", "NOT_FOUND", 404);
    }
    const t = tRows[0];

    // Tenancy check
    if (Number(t.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao modelo de outra consultoria.", "FORBIDDEN", 403);
    }
    // Access check: creator or consultancy admin
    if (!ctx.canManageConsultancy && Number(t.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do modelo.", "FORBIDDEN", 403);
    }

    // 2. Resolve template's current PUBLISHED version
    const [pubRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, subtitle, objective, estimated_duration_minutes,
              difficulty_level, notes, version_number
       FROM workout_versions
       WHERE workout_id = ? AND status = 'PUBLISHED'
       ORDER BY version_number DESC
       LIMIT 1;`,
      [t.id]
    );

    if (!pubRows || pubRows.length === 0) {
      throw new TrainingAuthorizationError(
        "O modelo selecionado precisa estar publicado para ser atribuído a alunos.",
        "TEMPLATE_NOT_PUBLISHED",
        400
      );
    }
    const templateVer = pubRows[0];

    // 3. Resolve and lock student membership in consultancy
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       LIMIT 1
       FOR UPDATE;`,
      [studentMembershipPublicId, ctx.consultancyId!]
    );

    if (!studentRows || studentRows.length === 0) {
      throw new TrainingAuthorizationError(
        "Aluno não encontrado ou não pertence a esta consultoria.",
        "STUDENT_NOT_FOUND",
        404
      );
    }
    const student = studentRows[0];

    const newWorkoutPublicId = crypto.randomUUID();
    const newVersionPublicId = crypto.randomUUID();
    const assignmentPublicId = crypto.randomUUID();
    const newTitle = options?.customTitle?.trim() || templateVer.title;

    // 4. Insert NEW normal workout root (is_template = false)
    const [wRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, subtitle,
        objective, estimated_duration_minutes, difficulty_level, is_template, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE');`,
      [
        newWorkoutPublicId,
        ctx.consultancyId!,
        ctx.membershipId!,
        newTitle,
        templateVer.subtitle,
        templateVer.objective,
        templateVer.estimated_duration_minutes,
        templateVer.difficulty_level || "INTERMEDIATE",
      ]
    );
    const newWorkoutId = wRes.insertId;

    // 5. Insert Version 1 PUBLISHED (ready for student execution)
    const [vRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, published_at,
        title, subtitle, objective, estimated_duration_minutes, difficulty_level,
        notes, created_by_membership_id
      ) VALUES (?, ?, 1, 'PUBLISHED', NOW(3), ?, ?, ?, ?, ?, ?, ?);`,
      [
        newVersionPublicId,
        newWorkoutId,
        newTitle,
        templateVer.subtitle,
        templateVer.objective,
        templateVer.estimated_duration_minutes,
        templateVer.difficulty_level || "INTERMEDIATE",
        templateVer.notes,
        ctx.membershipId!,
      ]
    );
    const newVersionId = vRes.insertId;

    // 6. Deep clone tree from template version into newVersionId
    await cloneVersionTree(connection, Number(templateVer.id), newVersionId);

    // 7. Insert workout assignment
    const startsOn = options?.startsOn?.trim() || new Date().toISOString().slice(0, 10);
    const endsOn = options?.endsOn?.trim() || null;
    const notesForStudent = options?.notesForStudent?.trim() || null;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_assignments (
        public_id, consultancy_id, student_membership_id, workout_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?);`,
      [
        assignmentPublicId,
        ctx.consultancyId!,
        student.id,
        newVersionId,
        ctx.membershipId!,
        startsOn,
        endsOn,
        notesForStudent,
      ]
    );

    // 8. Record audit activity
    await recordConsultancyActivity({
      consultancyId: ctx.consultancyId!,
      actorUserId: ctx.userId,
      actorMembershipId: ctx.membershipId,
      actorRole: ctx.roles.includes("PERSONAL") ? "PERSONAL" : (ctx.roles[0] || "PERSONAL"),
      action: "WORKOUT_ASSIGNED",
      module: "PERSONAL",
      resourceType: "workout",
      resourcePublicId: newWorkoutPublicId,
      summary: `Plano "${newTitle}" atribuído ao aluno a partir do modelo "${templateVer.title}"`,
      metadata: {
        templatePublicId,
        templateVersionNumber: Number(templateVer.version_number),
        studentMembershipPublicId,
        assignmentPublicId,
      },
      connection,
    }).catch(() => {});

    await connection.commit();

    const newVersionTree = await getWorkoutVersionTree(ctx, newVersionPublicId);

    const workoutDto: WorkoutRootDto = {
      publicId: newWorkoutPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      title: newTitle,
      subtitle: templateVer.subtitle,
      objective: templateVer.objective,
      estimatedDurationMinutes: templateVer.estimated_duration_minutes != null ? Number(templateVer.estimated_duration_minutes) : null,
      difficultyLevel: templateVer.difficulty_level || "INTERMEDIATE",
      isTemplate: false,
      status: "ACTIVE",
      currentPublishedVersion: newVersionTree,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { workout: workoutDto, version: newVersionTree!, assignmentPublicId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type TemplatePreviewBlockSummary = {
  title: string;
  itemsCount: number;
};

export type TemplatePreviewDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  difficultyLevel: string;
  estimatedDurationMinutes: number | null;
  publishedVersionNumber: number;
  blocks: TemplatePreviewBlockSummary[];
  categoryCount: number;
  totalExercises: number;
  notes: string | null;
  updatedAt: Date;
};

/**
 * Retrieves a lightweight preview summary of a published template's structure.
 * Used for pre-assignment modal preview (Section 32).
 */
export async function getTemplatePreview(
  ctx: TrainingAccessContext,
  templatePublicId: string
): Promise<TemplatePreviewDto | null> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve template root and latest published version
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.public_id, wv.id AS version_id, wv.title, wv.subtitle, wv.objective,
              wv.difficulty_level, wv.estimated_duration_minutes, wv.notes,
              wv.version_number, wv.updated_at
       FROM workouts w
       INNER JOIN workout_versions wv ON wv.workout_id = w.id
            AND wv.id = (
               SELECT wv2.id FROM workout_versions wv2
               WHERE wv2.workout_id = w.id AND wv2.status = 'PUBLISHED'
               ORDER BY wv2.version_number DESC
               LIMIT 1
            )
       WHERE w.public_id = ? AND w.consultancy_id = ? AND w.is_template = 1 AND w.deleted_at IS NULL
       LIMIT 1;`,
      [templatePublicId, ctx.consultancyId!]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    // 2. Fetch blocks summary with item counts
    const [blockRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.title,
              (SELECT COUNT(*) FROM workout_block_items wbi WHERE wbi.block_id = wb.id) AS items_count
       FROM workout_blocks wb
       WHERE wb.workout_version_id = ?
       ORDER BY wb.sort_order ASC;`,
      [r.version_id]
    );

    const blocks: TemplatePreviewBlockSummary[] = (blockRows || []).map((b, idx) => ({
      title: String(b.title || `Categoria ${idx + 1}`),
      itemsCount: Number(b.items_count || 0),
    }));

    const totalExercises = blocks.reduce((acc, b) => acc + b.itemsCount, 0);

    return {
      publicId: String(r.public_id),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      objective: r.objective ? String(r.objective) : null,
      difficultyLevel: String(r.difficulty_level || "INTERMEDIATE"),
      estimatedDurationMinutes: r.estimated_duration_minutes != null ? Number(r.estimated_duration_minutes) : null,
      publishedVersionNumber: Number(r.version_number),
      blocks,
      categoryCount: blocks.length,
      totalExercises,
      notes: r.notes ? String(r.notes) : null,
      updatedAt: new Date(r.updated_at),
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Lists all historical and active versions for a workout routine.
 */
export async function listWorkoutVersions(
  ctx: TrainingAccessContext,
  workoutPublicId: string
): Promise<WorkoutVersionSummaryDto[]> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify workout root tenancy and authorization
    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, created_by_membership_id FROM workouts WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [workoutPublicId]
    );

    if (!wRows || wRows.length === 0) {
      throw new TrainingAuthorizationError("Treino não encontrado.", "NOT_FOUND", 404);
    }
    const w = wRows[0];

    if (Number(w.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (!ctx.canManageConsultancy && Number(w.created_by_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador do treino.", "FORBIDDEN", 403);
    }

    // 2. Fetch all versions ordered by version_number DESC
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.public_id, wv.version_number, wv.status, wv.title, wv.subtitle,
              wv.created_at, wv.published_at,
              (SELECT COUNT(*) FROM workout_blocks wb WHERE wb.workout_version_id = wv.id) AS blocks_count
       FROM workout_versions wv
       WHERE wv.workout_id = ?
       ORDER BY wv.version_number DESC;`,
      [w.id]
    );

    return (vRows || []).map((r) => ({
      publicId: String(r.public_id),
      versionNumber: Number(r.version_number),
      status: r.status as WorkoutVersionStatus,
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      createdAt: new Date(r.created_at),
      publishedAt: r.published_at ? new Date(r.published_at) : null,
      blocksCount: Number(r.blocks_count || 0),
    }));
  } finally {
    if (connection) connection.release();
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
  hasActiveDraft?: boolean;
  draftVersionNumber?: number | null;
  publishedVersionNumber?: number | null;
  activeAssignmentsCount?: number;
  assignedStudentName?: string | null;
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
    isTemplate?: boolean;
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

    if (options?.isTemplate !== undefined) {
      whereClauses.push("w.is_template = ?");
      params.push(options.isTemplate ? 1 : 0);
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
              (SELECT COUNT(*) FROM workout_blocks wb WHERE wb.workout_version_id = wv.id) AS blocks_count,
              (SELECT wv_d.version_number FROM workout_versions wv_d WHERE wv_d.workout_id = w.id AND wv_d.status = 'DRAFT' LIMIT 1) AS draft_version_number,
              (SELECT wv_p.version_number FROM workout_versions wv_p WHERE wv_p.workout_id = w.id AND wv_p.status = 'PUBLISHED' ORDER BY wv_p.version_number DESC LIMIT 1) AS published_version_number,
              (SELECT COUNT(*) FROM workout_assignments wa JOIN workout_versions wv_all ON wv_all.id = wa.workout_version_id WHERE wv_all.workout_id = w.id AND wa.status = 'ACTIVE' AND wa.deleted_at IS NULL) AS active_assignments_count,
              (SELECT u.full_name FROM workout_assignments wa JOIN workout_versions wv_all ON wv_all.id = wa.workout_version_id JOIN consultancy_members cm ON cm.id = wa.student_membership_id JOIN users u ON u.id = cm.user_id WHERE wv_all.workout_id = w.id AND wa.status = 'ACTIVE' AND wa.deleted_at IS NULL ORDER BY wa.id DESC LIMIT 1) AS assigned_student_name
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
      hasActiveDraft: r.draft_version_number != null,
      draftVersionNumber: r.draft_version_number != null ? Number(r.draft_version_number) : null,
      publishedVersionNumber: r.published_version_number != null ? Number(r.published_version_number) : null,
      activeAssignmentsCount: Number(r.active_assignments_count || 0),
      assignedStudentName: r.assigned_student_name ? String(r.assigned_student_name) : null,
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

/**
 * Retrieves a workout root and a specific version tree (or defaults to active DRAFT / latest PUBLISHED).
 * Returns all versions summary for navigation and version history drawer.
 */
export async function getWorkoutWithSpecificVersion(
  ctx: TrainingAccessContext,
  workoutPublicId: string,
  versionPublicId?: string
): Promise<{
  workout: WorkoutRootDto;
  version: WorkoutVersionDto | null;
  isDraft: boolean;
  allVersions: WorkoutVersionSummaryDto[];
} | null> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve workout root
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

    // 2. Fetch all versions summary
    const allVersions = await listWorkoutVersions(ctx, workoutPublicId);

    // 3. Resolve target version
    let targetVersionPublicId: string | null = null;
    let isDraft = false;

    if (versionPublicId) {
      // If specific version is requested, verify it strictly belongs to this workout root!
      const matching = allVersions.find((v) => v.publicId === versionPublicId);
      if (!matching) {
        throw new TrainingAuthorizationError(
          "A versão solicitada não pertence a este treino ou não existe.",
          "NOT_FOUND",
          404
        );
      }
      targetVersionPublicId = matching.publicId;
      isDraft = matching.status === "DRAFT";
    } else {
      // Default: if active DRAFT exists, select DRAFT; else latest PUBLISHED / version
      const activeDraft = allVersions.find((v) => v.status === "DRAFT");
      if (activeDraft) {
        targetVersionPublicId = activeDraft.publicId;
        isDraft = true;
      } else {
        const publishedVer = allVersions.find((v) => v.status === "PUBLISHED") || allVersions[0];
        if (publishedVer) {
          targetVersionPublicId = publishedVer.publicId;
          isDraft = false;
        }
      }
    }

    if (!targetVersionPublicId) {
      return { workout: workoutDto, version: null, isDraft: false, allVersions };
    }

    const versionTree = await getWorkoutVersionTree(ctx, targetVersionPublicId);
    return {
      workout: workoutDto,
      version: versionTree,
      isDraft,
      allVersions,
    };
  } finally {
    if (connection) connection.release();
  }
}

export type TemplatePickerItemDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  difficultyLevel: string;
  estimatedDurationMinutes: number | null;
  publishedVersionNumber: number;
  blocksCount: number;
  updatedAt: Date;
};

/**
 * Lists published templates in the current consultancy for the Template Picker.
 * Only templates with a PUBLISHED version are returned.
 */
export async function listPublishedTemplatesForPicker(
  ctx: TrainingAccessContext,
  query?: string
): Promise<TemplatePickerItemDto[]> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const whereClauses: string[] = [
      "w.consultancy_id = ?",
      "w.is_template = 1",
      "w.deleted_at IS NULL",
      "w.status = 'ACTIVE'",
      "wv.status = 'PUBLISHED'",
    ];
    const params: (string | number)[] = [ctx.consultancyId!];

    if (!ctx.canManageConsultancy) {
      whereClauses.push("w.created_by_membership_id = ?");
      params.push(ctx.membershipId!);
    }

    if (query?.trim()) {
      whereClauses.push("(w.title LIKE ? OR wv.title LIKE ?)");
      const q = `%${query.trim()}%`;
      params.push(q, q);
    }

    const whereSql = whereClauses.join(" AND ");

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.public_id, wv.title, wv.subtitle, wv.objective,
              wv.difficulty_level, wv.estimated_duration_minutes,
              wv.version_number, wv.updated_at,
              (SELECT COUNT(*) FROM workout_blocks wb WHERE wb.workout_version_id = wv.id) AS blocks_count
       FROM workouts w
       INNER JOIN workout_versions wv ON wv.workout_id = w.id
            AND wv.id = (
               SELECT wv2.id FROM workout_versions wv2
               WHERE wv2.workout_id = w.id AND wv2.status = 'PUBLISHED'
               ORDER BY wv2.version_number DESC
               LIMIT 1
            )
       WHERE ${whereSql}
       ORDER BY wv.updated_at DESC
       LIMIT 50;`,
      params
    );

    return (rows || []).map((r) => ({
      publicId: String(r.public_id),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      objective: r.objective ? String(r.objective) : null,
      difficultyLevel: String(r.difficulty_level || "INTERMEDIATE"),
      estimatedDurationMinutes: r.estimated_duration_minutes != null ? Number(r.estimated_duration_minutes) : null,
      publishedVersionNumber: Number(r.version_number),
      blocksCount: Number(r.blocks_count || 0),
      updatedAt: new Date(r.updated_at),
    }));
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

    // 2. Fetch and duplicate sub-blocks of this block
    const [sourceSubBlocks] = await connection.execute<RowDataPacket[]>(
      `SELECT id, title, sort_order FROM workout_sub_blocks WHERE block_id = ? ORDER BY sort_order ASC;`,
      [sourceBlock.id]
    );
    const subBlockIdMap = new Map<number, number>();
    for (const sb of sourceSubBlocks) {
      const newSubBlockPublicId = crypto.randomUUID();
      const [sbRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_sub_blocks (public_id, block_id, title, sort_order) VALUES (?, ?, ?, ?);`,
        [newSubBlockPublicId, newBlockId, sb.title, sb.sort_order]
      );
      subBlockIdMap.set(Number(sb.id), sbRes.insertId);
    }

    // 3. Fetch and duplicate combinations of this block
    const [sourceCombinations] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
       FROM workout_item_combinations
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [sourceBlock.id]
    );
    const combinationIdMap = new Map<number, number>();
    for (const sc of sourceCombinations) {
      const newCombPublicId = crypto.randomUUID();
      const targetSubBlockId =
        sc.sub_block_id != null && subBlockIdMap.has(Number(sc.sub_block_id))
          ? subBlockIdMap.get(Number(sc.sub_block_id))
          : null;
      const [combRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_combinations (
          public_id, block_id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newCombPublicId,
          newBlockId,
          targetSubBlockId,
          sc.combination_type,
          sc.title,
          sc.sort_order,
          sc.rounds,
          sc.rest_after_seconds,
          sc.rest_after_unit,
        ]
      );
      combinationIdMap.set(Number(sc.id), combRes.insertId);
    }

    // 4. Fetch and duplicate items
    const [sourceItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sub_block_id, combination_id, exercise_id, custom_exercise_id, sort_order,
              exercise_name_snapshot, muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
              prescription_mode, target_cadence, target_rpe, target_rir, duration_unit, method_config_json,
              custom_video_url, notes
       FROM workout_block_items
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [sourceBlock.id]
    );

    for (const item of sourceItems) {
      const newItemPublicId = crypto.randomUUID();
      const targetSubBlockId =
        item.sub_block_id != null && subBlockIdMap.has(Number(item.sub_block_id))
          ? subBlockIdMap.get(Number(item.sub_block_id))
          : null;
      const targetCombinationId =
        item.combination_id != null && combinationIdMap.has(Number(item.combination_id))
          ? combinationIdMap.get(Number(item.combination_id))
          : null;
      const methodConfigValue =
        item.method_config_json != null
          ? typeof item.method_config_json === "object"
            ? JSON.stringify(item.method_config_json)
            : item.method_config_json
          : null;

      const [iRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_block_items (
          public_id, block_id, sub_block_id, combination_id, exercise_id, custom_exercise_id,
          sort_order, exercise_name_snapshot, muscle_group_snapshot, equipment_snapshot,
          instructions_snapshot, prescription_mode, target_cadence, target_rpe, target_rir,
          duration_unit, method_config_json, custom_video_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newItemPublicId,
          newBlockId,
          targetSubBlockId,
          targetCombinationId,
          item.exercise_id,
          item.custom_exercise_id,
          item.sort_order,
          item.exercise_name_snapshot,
          item.muscle_group_snapshot,
          item.equipment_snapshot,
          item.instructions_snapshot,
          item.prescription_mode,
          item.target_cadence,
          item.target_rpe,
          item.target_rir,
          item.duration_unit,
          methodConfigValue,
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

      // Duplicate sets with parent_set_id remapping and duration_unit preservation
      const [sourceSets] = await connection.execute<RowDataPacket[]>(
        `SELECT id, set_number, set_type, parent_set_id, target_reps, target_reps_max,
                target_load_kg, target_duration_seconds, duration_unit, target_distance_meters,
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
            target_reps_max, target_load_kg, target_duration_seconds, duration_unit,
            target_distance_meters, target_rest_seconds, intensity_indicator
          ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            newItemId,
            s.set_number,
            s.set_type,
            s.target_reps,
            s.target_reps_max,
            s.target_load_kg,
            s.target_duration_seconds,
            s.duration_unit,
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

    // Step 3: Keep workout_item_combinations sort_order in sync with min(sort_order) of their items
    await connection.execute(
      `UPDATE workout_item_combinations wic
       JOIN (
         SELECT combination_id, MIN(sort_order) AS min_order
         FROM workout_block_items
         WHERE block_id = ? AND combination_id IS NOT NULL
         GROUP BY combination_id
       ) items_agg ON items_agg.combination_id = wic.id
       SET wic.sort_order = items_agg.min_order, wic.updated_at = NOW(3);`,
      [b.id]
    );

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

// ============================================================================
// SIMPLIFIED TRAINING MONTADOR FUNCTIONS (CATEGORIAS & EXERCÍCIOS)
// ============================================================================

export type QuickConfigInput = {
  seriesCount: number;
  reps?: number | null;
  targetRepsMax?: number | null;
  targetDurationSeconds?: number | null;
  durationUnit?: "SECONDS" | "MINUTES" | string | null;
  restSeconds: number;
  loadKg?: number | null;
  notes?: string | null;
  customVideoUrl?: string | null;
  saveToExerciseLibrary?: boolean;
};

/**
 * Duplicates an exercise item and all its sets within the same draft category.
 */
export async function duplicateItemInDraft(
  ctx: TrainingAccessContext,
  itemPublicId: string
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.block_id, wbi.sub_block_id, wbi.exercise_id, wbi.custom_exercise_id,
              wbi.sort_order, wbi.exercise_name_snapshot,
              wbi.muscle_group_snapshot, wbi.equipment_snapshot, wbi.instructions_snapshot,
              wbi.prescription_mode, wbi.target_cadence, wbi.target_rpe, wbi.target_rir,
              wbi.duration_unit, wbi.method_config_json, wbi.custom_video_url, wbi.notes,
              wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [itemPublicId]
    );

    if (!iRows || iRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const sourceItem = iRows[0];

    if (Number(sourceItem.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(sourceItem.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem duplicar exercícios.", "FORBIDDEN", 403);
    }
    if (sourceItem.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido duplicar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Shift following items
    await connection.execute(
      `UPDATE workout_block_items
       SET sort_order = sort_order + 1
       WHERE block_id = ? AND sort_order > ?;`,
      [sourceItem.block_id, sourceItem.sort_order]
    );

    const newSortOrder = Number(sourceItem.sort_order) + 1;
    const newItemPublicId = crypto.randomUUID();

    const [iRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_block_items (
        public_id, block_id, sub_block_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot,
        muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
        prescription_mode, target_cadence, target_rpe, target_rir,
        duration_unit, method_config_json, custom_video_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newItemPublicId,
        sourceItem.block_id,
        sourceItem.sub_block_id,
        sourceItem.exercise_id,
        sourceItem.custom_exercise_id,
        newSortOrder,
        sourceItem.exercise_name_snapshot,
        sourceItem.muscle_group_snapshot,
        sourceItem.equipment_snapshot,
        sourceItem.instructions_snapshot,
        sourceItem.prescription_mode,
        sourceItem.target_cadence,
        sourceItem.target_rpe,
        sourceItem.target_rir,
        sourceItem.duration_unit,
        sourceItem.method_config_json,
        sourceItem.custom_video_url,
        sourceItem.notes,
      ]
    );
    const newItemId = iRes.insertId;

    // Duplicate pinned media
    const [mediaRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbim.media_asset_id, wbim.role, wbim.sort_order,
              ma.public_id AS media_public_id, ma.scope, ma.visibility,
              ma.media_type, ma.storage_provider, ma.mime_type,
              ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
              ma.created_at
       FROM workout_block_item_media wbim
       INNER JOIN media_assets ma ON ma.id = wbim.media_asset_id
       WHERE wbim.block_item_id = ? AND ma.deleted_at IS NULL
       ORDER BY wbim.sort_order ASC;`,
      [sourceItem.id]
    );

    const pinnedMediaDtos: BlockItemMediaDto[] = [];

    if (mediaRows.length > 0) {
      for (const m of mediaRows) {
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [newItemId, m.media_asset_id, m.role, m.sort_order]
        );
        pinnedMediaDtos.push({
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
    } else if (sourceItem.exercise_id) {
      // Fallback: pin from exercise_media
      const [exMedia] = await connection.execute<RowDataPacket[]>(
        `SELECT em.media_asset_id, em.role, em.sort_order,
                ma.public_id AS media_public_id, ma.scope, ma.visibility,
                ma.media_type, ma.storage_provider, ma.mime_type,
                ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
                ma.created_at
         FROM exercise_media em
         INNER JOIN media_assets ma ON ma.id = em.media_asset_id
         WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
         ORDER BY em.sort_order ASC;`,
        [sourceItem.exercise_id]
      );
      for (const m of exMedia) {
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [newItemId, m.media_asset_id, m.role, m.sort_order]
        );
        pinnedMediaDtos.push({
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

    // Duplicate sets
    const [sourceSets] = await connection.execute<RowDataPacket[]>(
      `SELECT set_number, set_type, target_reps, target_reps_max,
              target_load_kg, target_duration_seconds, duration_unit, target_distance_meters,
              target_rest_seconds, intensity_indicator
       FROM workout_item_sets
       WHERE block_item_id = ?
       ORDER BY set_number ASC;`,
      [sourceItem.id]
    );

    const resultSets: WorkoutItemSetDto[] = [];
    for (const s of sourceSets) {
      await connection.execute(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, parent_set_id, target_reps,
          target_reps_max, target_load_kg, target_duration_seconds, duration_unit,
          target_distance_meters, target_rest_seconds, intensity_indicator
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newItemId,
          s.set_number,
          s.set_type,
          s.target_reps,
          s.target_reps_max,
          s.target_load_kg,
          s.target_duration_seconds,
          s.duration_unit,
          s.target_distance_meters,
          s.target_rest_seconds,
          s.intensity_indicator,
        ]
      );
      resultSets.push({
        setNumber: Number(s.set_number),
        setType: s.set_type,
        parentSetNumber: null,
        targetReps: s.target_reps != null ? Number(s.target_reps) : null,
        targetRepsMax: s.target_reps_max != null ? Number(s.target_reps_max) : null,
        targetLoadKg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
        targetDurationSeconds: s.target_duration_seconds != null ? Number(s.target_duration_seconds) : null,
        durationUnit: s.duration_unit ? String(s.duration_unit) : null,
        targetDistanceMeters: s.target_distance_meters != null ? Number(s.target_distance_meters) : null,
        targetRestSeconds: s.target_rest_seconds != null ? Number(s.target_rest_seconds) : null,
        intensityIndicator: s.intensity_indicator || null,
      });
    }

    let exercisePublicId: string | null = null;
    let customExercisePublicId: string | null = null;
    if (sourceItem.exercise_id) {
      const [exRow] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id FROM exercises WHERE id = ? LIMIT 1;`,
        [sourceItem.exercise_id]
      );
      if (exRow.length > 0) {
        exercisePublicId = String(exRow[0].public_id);
      }
    }
    if (sourceItem.custom_exercise_id) {
      const [cexRow] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id FROM exercises WHERE id = ? LIMIT 1;`,
        [sourceItem.custom_exercise_id]
      );
      if (cexRow.length > 0) {
        customExercisePublicId = String(cexRow[0].public_id);
      }
    }

    await connection.commit();

    return {
      publicId: newItemPublicId,
      exercisePublicId,
      customExercisePublicId,
      isCustomExercise: !!sourceItem.custom_exercise_id,
      combinationPublicId: null,
      combinationType: null,
      sortOrder: newSortOrder,
      exerciseNameSnapshot: sourceItem.exercise_name_snapshot,
      muscleGroupSnapshot: sourceItem.muscle_group_snapshot,
      equipmentSnapshot: sourceItem.equipment_snapshot,
      instructionsSnapshot: sourceItem.instructions_snapshot,
      prescriptionMode: sourceItem.prescription_mode,
      targetCadence: sourceItem.target_cadence,
      targetRpe: sourceItem.target_rpe != null ? Number(sourceItem.target_rpe) : null,
      targetRir: sourceItem.target_rir != null ? Number(sourceItem.target_rir) : null,
      durationUnit: sourceItem.duration_unit ? String(sourceItem.duration_unit) : null,
      methodConfig: sourceItem.method_config_json ? JSON.parse(sourceItem.method_config_json) : null,
      customVideoUrl: sourceItem.custom_video_url,
      notes: sourceItem.notes,
      pinnedMedia: pinnedMediaDtos,
      sets: resultSets,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Moves an exercise item from one category to another in the draft version.
 */
export async function moveItemToBlockInDraft(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  targetBlockPublicId: string
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.block_id, wbi.sort_order,
              wb.workout_version_id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [itemPublicId]
    );
    if (!iRows || iRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = iRows[0];

    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, workout_version_id, block_type
       FROM workout_blocks
       WHERE public_id = ?
       LIMIT 1;`,
      [targetBlockPublicId]
    );
    if (!bRows || bRows.length === 0) {
      throw new TrainingAuthorizationError("Categoria de destino não encontrada.", "NOT_FOUND", 404);
    }
    const targetBlock = bRows[0];

    if (item.workout_version_id !== targetBlock.workout_version_id) {
      throw new TrainingAuthorizationError("A categoria de destino pertence a outra ficha.", "BAD_REQUEST", 400);
    }
    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    if (item.block_id === targetBlock.id) {
      await connection.commit();
      return;
    }

    if (targetBlock.block_type !== "CUSTOM") {
      await connection.execute("UPDATE workout_blocks SET block_type = 'CUSTOM' WHERE id = ?;", [targetBlock.id]);
    }

    const [maxOrderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM workout_block_items
       WHERE block_id = ?;`,
      [targetBlock.id]
    );
    const newSortOrder = Number(maxOrderRows[0]?.next_order || 0);

    await connection.execute(
      `UPDATE workout_block_items
       SET block_id = ?, sort_order = ?, updated_at = NOW(3)
       WHERE id = ?;`,
      [targetBlock.id, newSortOrder, item.id]
    );

    // Re-index previous block
    const [remainingItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM workout_block_items
       WHERE block_id = ?
       ORDER BY sort_order ASC;`,
      [item.block_id]
    );
    for (let i = 0; i < remainingItems.length; i++) {
      await connection.execute(
        "UPDATE workout_block_items SET sort_order = ? WHERE id = ?;",
        [i, remainingItems[i].id]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Updates quick configuration of an exercise: series count, reps, rest, load, and notes.
 */
export async function updateItemQuickConfigInDraft(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  input: QuickConfigInput
): Promise<WorkoutItemSetDto[]> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.exercise_id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [itemPublicId]
    );

    if (!iRows || iRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = iRows[0];

    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar exercícios.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Update notes, duration_unit, and custom_video_url (item-level execution media override)
    if (input.customVideoUrl !== undefined) {
      await connection.execute(
        "UPDATE workout_block_items SET notes = ?, duration_unit = ?, custom_video_url = ?, updated_at = NOW(3) WHERE id = ?;",
        [
          input.notes !== undefined ? (input.notes?.trim() || null) : null,
          input.durationUnit || null,
          input.customVideoUrl ? input.customVideoUrl.trim() : null,
          item.id,
        ]
      );
    } else {
      await connection.execute(
        "UPDATE workout_block_items SET notes = ?, duration_unit = ?, updated_at = NOW(3) WHERE id = ?;",
        [
          input.notes !== undefined ? (input.notes?.trim() || null) : null,
          input.durationUnit || null,
          item.id,
        ]
      );
    }

    // Optional safe propagation: only if requested, exercise exists, belongs to this tenancy, and media is local asset
    if (input.saveToExerciseLibrary && input.customVideoUrl && item.exercise_id) {
      const [exRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id, scope, consultancy_id FROM exercises WHERE id = ? AND deleted_at IS NULL LIMIT 1;",
        [item.exercise_id]
      );
      if (exRows && exRows.length > 0) {
        const ex = exRows[0];
        if (ex.scope === "CONSULTANCY" && Number(ex.consultancy_id) === ctx.consultancyId) {
          const match = input.customVideoUrl.match(/\/api\/training-v2\/media\/([a-zA-Z0-9_-]+)/);
          if (match) {
            const mediaPublicId = match[1];
            const [maRows] = await connection.execute<RowDataPacket[]>(
              "SELECT id FROM media_assets WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;",
              [mediaPublicId]
            );
            if (maRows && maRows.length > 0) {
              const maId = maRows[0].id;
              await connection.execute(
                "DELETE FROM exercise_media WHERE exercise_id = ? AND role = 'EXECUTION_VIDEO';",
                [ex.id]
              );
              await connection.execute(
                "INSERT INTO exercise_media (exercise_id, media_asset_id, role, sort_order) VALUES (?, ?, 'EXECUTION_VIDEO', 0);",
                [ex.id, maId]
              );
            }
          }
        }
      }
    }

    // Delete existing sets
    await connection.execute("DELETE FROM workout_item_sets WHERE block_item_id = ?;", [item.id]);

    const resultSets: WorkoutItemSetDto[] = [];
    const count = Math.max(1, Math.min(20, input.seriesCount || 3));
    const isDuration = input.targetDurationSeconds != null && input.targetDurationSeconds > 0;
    const reps = isDuration ? null : Math.max(1, input.reps || 10);
    const repsMax = (isDuration || !reps || input.targetRepsMax == null)
      ? null
      : Math.max(reps, Math.round(Number(input.targetRepsMax)));
    const duration = isDuration ? Math.max(1, input.targetDurationSeconds!) : null;
    const durationUnit = isDuration ? (input.durationUnit || "SECONDS") : null;
    const rest = Math.max(0, input.restSeconds ?? 60);
    const load = input.loadKg != null && !isNaN(Number(input.loadKg)) ? Number(input.loadKg) : null;

    for (let setNum = 1; setNum <= count; setNum++) {
      await connection.execute(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, parent_set_id, target_reps,
          target_reps_max, target_load_kg, target_duration_seconds, duration_unit,
          target_distance_meters, target_rest_seconds, intensity_indicator
        ) VALUES (?, ?, 'NORMAL', NULL, ?, ?, ?, ?, ?, NULL, ?, NULL);`,
        [item.id, setNum, reps, repsMax, load, duration, durationUnit, rest]
      );

      resultSets.push({
        setNumber: setNum,
        setType: "NORMAL",
        parentSetNumber: null,
        targetReps: reps,
        targetRepsMax: repsMax,
        targetLoadKg: load,
        targetDurationSeconds: duration,
        durationUnit,
        targetDistanceMeters: null,
        targetRestSeconds: rest,
        intensityIndicator: null,
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

// ============================================================================
// TRAINING BUILDER V3: SUB-BLOCKS, EXERCISE RESOLUTION & WORKOUT DELETION
// ============================================================================

export type { WorkoutSubBlockDto } from "./types";


/**
 * Creates a new Sub-block (Grupo) inside a draft block (Treino/Dia).
 */
export async function createWorkoutSubBlock(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  input: { title: string }
): Promise<WorkoutSubBlockDto> {
  assertCanAuthorTraining(ctx);

  const cleanTitle = input.title?.trim();
  if (!cleanTitle) {
    throw new TrainingAuthorizationError("O nome do grupo é obrigatório.", "VALIDATION_FAILED", 400);
  }

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
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(b.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador ou administrador.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    const [maxRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM workout_sub_blocks WHERE block_id = ?;`,
      [b.id]
    );
    const nextOrder = Number(maxRows[0]?.next_order || 0);
    const subBlockPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO workout_sub_blocks (public_id, block_id, title, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(3), NOW(3));`,
      [subBlockPublicId, b.id, cleanTitle, nextOrder]
    );

    await connection.commit();

    return {
      publicId: subBlockPublicId,
      title: cleanTitle,
      sortOrder: nextOrder,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Renames a Sub-block (Grupo).
 */
export async function renameWorkoutSubBlock(
  ctx: TrainingAccessContext,
  subBlockPublicId: string,
  newTitle: string
): Promise<WorkoutSubBlockDto> {
  assertCanAuthorTraining(ctx);

  const cleanTitle = newTitle?.trim();
  if (!cleanTitle) {
    throw new TrainingAuthorizationError("O nome do grupo é obrigatório.", "VALIDATION_FAILED", 400);
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sbRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wsb.id, wsb.sort_order, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_sub_blocks wsb
       INNER JOIN workout_blocks wb ON wb.id = wsb.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wsb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [subBlockPublicId]
    );

    if (!sbRows || sbRows.length === 0) {
      throw new TrainingAuthorizationError("Grupo não encontrado.", "NOT_FOUND", 404);
    }
    const sb = sbRows[0];

    if (Number(sb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(sb.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador ou administrador.", "FORBIDDEN", 403);
    }
    if (sb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    await connection.execute(
      `UPDATE workout_sub_blocks SET title = ?, updated_at = NOW(3) WHERE id = ?;`,
      [cleanTitle, sb.id]
    );

    await connection.commit();

    return {
      publicId: subBlockPublicId,
      title: cleanTitle,
      sortOrder: Number(sb.sort_order),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reorders Sub-blocks (Grupos) inside a block.
 */
export async function reorderWorkoutSubBlocks(
  ctx: TrainingAccessContext,
  blockPublicId: string,
  orderedPublicIds: string[]
): Promise<void> {
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
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    for (let i = 0; i < orderedPublicIds.length; i++) {
      await connection.execute(
        `UPDATE workout_sub_blocks SET sort_order = ?, updated_at = NOW(3) WHERE public_id = ? AND block_id = ?;`,
        [i, orderedPublicIds[i], b.id]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Deletes a Sub-block (Grupo).
 * If deleteItemsWithGroup is true: deletes all exercises inside this sub-block.
 * Otherwise: moves exercises to block root (sub_block_id = NULL).
 */
export async function deleteWorkoutSubBlock(
  ctx: TrainingAccessContext,
  subBlockPublicId: string,
  deleteItemsWithGroup: boolean = true
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sbRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wsb.id, wsb.block_id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_sub_blocks wsb
       INNER JOIN workout_blocks wb ON wb.id = wsb.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wsb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [subBlockPublicId]
    );

    if (!sbRows || sbRows.length === 0) {
      throw new TrainingAuthorizationError("Grupo não encontrado.", "NOT_FOUND", 404);
    }
    const sb = sbRows[0];

    if (Number(sb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(sb.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador ou administrador.", "FORBIDDEN", 403);
    }
    if (sb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    if (deleteItemsWithGroup) {
      // Find items in this sub-block
      const [items] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM workout_block_items WHERE sub_block_id = ?;`,
        [sb.id]
      );
      for (const item of items) {
        await connection.execute(`DELETE FROM workout_item_sets WHERE block_item_id = ?;`, [item.id]);
        await connection.execute(`DELETE FROM workout_block_item_media WHERE block_item_id = ?;`, [item.id]);
        await connection.execute(`DELETE FROM workout_block_items WHERE id = ?;`, [item.id]);
      }
    } else {
      // Unlink items from sub-block
      await connection.execute(
        `UPDATE workout_block_items SET sub_block_id = NULL, updated_at = NOW(3) WHERE sub_block_id = ?;`,
        [sb.id]
      );
    }

    // Delete sub-block
    await connection.execute(`DELETE FROM workout_sub_blocks WHERE id = ?;`, [sb.id]);

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
 * Duplicates a Sub-block (Grupo) and all its exercises inside the same block.
 */
export async function duplicateWorkoutSubBlock(
  ctx: TrainingAccessContext,
  subBlockPublicId: string
): Promise<WorkoutSubBlockDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sbRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wsb.id, wsb.block_id, wsb.title, wsb.sort_order, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_sub_blocks wsb
       INNER JOIN workout_blocks wb ON wb.id = wsb.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wsb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [subBlockPublicId]
    );

    if (!sbRows || sbRows.length === 0) {
      throw new TrainingAuthorizationError("Grupo não encontrado.", "NOT_FOUND", 404);
    }
    const sb = sbRows[0];

    if (Number(sb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (sb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const [maxOrderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM workout_sub_blocks WHERE block_id = ?;`,
      [sb.block_id]
    );
    const nextOrder = Number(maxOrderRows[0]?.next_order || 0);

    const newSubBlockPublicId = crypto.randomUUID();
    const newTitle = `${sb.title} (Cópia)`;

    const [newSbRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_sub_blocks (public_id, block_id, title, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(3), NOW(3));`,
      [newSubBlockPublicId, sb.block_id, newTitle, nextOrder]
    );
    const newSubBlockId = newSbRes.insertId;

    // Clone combinations of this sub-block
    const [sourceCombinations] = await connection.execute<RowDataPacket[]>(
      `SELECT id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
       FROM workout_item_combinations
       WHERE sub_block_id = ?
       ORDER BY sort_order ASC;`,
      [sb.id]
    );
    const combinationIdMap = new Map<number, number>();
    for (const sc of sourceCombinations) {
      const newCombPublicId = crypto.randomUUID();
      const [combRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_item_combinations (
          public_id, block_id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newCombPublicId,
          sb.block_id,
          newSubBlockId,
          sc.combination_type,
          sc.title,
          sc.sort_order,
          sc.rounds,
          sc.rest_after_seconds,
          sc.rest_after_unit,
        ]
      );
      combinationIdMap.set(Number(sc.id), combRes.insertId);
    }

    // Fetch items of this sub-block
    const [sourceItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id, combination_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
              equipment_snapshot, instructions_snapshot, prescription_mode,
              target_cadence, target_rpe, target_rir, duration_unit, method_config_json,
              custom_video_url, notes
       FROM workout_block_items
       WHERE sub_block_id = ?
       ORDER BY sort_order ASC;`,
      [sb.id]
    );

    for (const item of sourceItems) {
      const newItemPublicId = crypto.randomUUID();
      const targetCombId =
        item.combination_id != null && combinationIdMap.has(Number(item.combination_id))
          ? combinationIdMap.get(Number(item.combination_id))
          : null;

      const [iRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_block_items (
          public_id, block_id, sub_block_id, combination_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot,
          muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
          prescription_mode, target_cadence, target_rpe, target_rir,
          duration_unit, method_config_json, custom_video_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newItemPublicId,
          sb.block_id,
          newSubBlockId,
          targetCombId,
          item.exercise_id,
          item.custom_exercise_id,
          item.sort_order,
          item.exercise_name_snapshot,
          item.muscle_group_snapshot,
          item.equipment_snapshot,
          item.instructions_snapshot,
          item.prescription_mode,
          item.target_cadence,
          item.target_rpe,
          item.target_rir,
          item.duration_unit || null,
          item.method_config_json,
          item.custom_video_url,
          item.notes,
        ]
      );
      const newItemId = iRes.insertId;

      // Clone media
      const [mediaRows] = await connection.execute<RowDataPacket[]>(
        `SELECT media_asset_id, role, sort_order FROM workout_block_item_media WHERE block_item_id = ?;`,
        [item.id]
      );
      for (const m of mediaRows) {
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [newItemId, m.media_asset_id, m.role, m.sort_order]
        );
      }

      // Clone sets
      const [sets] = await connection.execute<RowDataPacket[]>(
        `SELECT set_number, set_type, target_reps, target_reps_max, target_load_kg,
                target_duration_seconds, duration_unit, target_distance_meters,
                target_rest_seconds, intensity_indicator
         FROM workout_item_sets
         WHERE block_item_id = ?
         ORDER BY set_number ASC;`,
        [item.id]
      );
      for (const s of sets) {
        await connection.execute(
          `INSERT INTO workout_item_sets (
            block_item_id, set_number, set_type, parent_set_id, target_reps,
            target_reps_max, target_load_kg, target_duration_seconds,
            duration_unit, target_distance_meters, target_rest_seconds, intensity_indicator
          ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            newItemId,
            s.set_number,
            s.set_type,
            s.target_reps,
            s.target_reps_max,
            s.target_load_kg,
            s.target_duration_seconds,
            s.duration_unit || null,
            s.target_distance_meters,
            s.target_rest_seconds,
            s.intensity_indicator,
          ]
        );
      }
    }

    await connection.commit();

    return {
      publicId: newSubBlockPublicId,
      title: newTitle,
      sortOrder: nextOrder,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Resolves an unmatched or needs-review exercise item in a draft by associating a real library exercise.
 * Preserves all prescribed sets, reps, load, duration, and notes!
 */
export async function resolveUnmatchedExerciseItem(
  ctx: TrainingAccessContext,
  itemPublicId: string,
  exercisePublicId: string
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.block_id, wbi.sub_block_id, wv.status, wv.public_id AS version_public_id, w.consultancy_id, w.created_by_membership_id
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
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(item.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao criador ou administrador.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Apenas rascunhos podem ter exercícios resolvidos.", "IMMUTABLE_VERSION", 400);
    }

    // Fetch library exercise
    const [exRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, name, muscle_group_primary, equipment, instructions, scope, consultancy_id, visibility, created_by_membership_id
       FROM exercises
       WHERE public_id = ? AND deleted_at IS NULL AND status = 'PUBLISHED'
       LIMIT 1;`,
      [exercisePublicId]
    );

    if (!exRows || exRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício da biblioteca não encontrado.", "EXERCISE_NOT_FOUND", 404);
    }
    const realEx = exRows[0];

    if (realEx.scope === "CONSULTANCY") {
      if (Number(realEx.consultancy_id) !== ctx.consultancyId) {
        throw new TrainingAuthorizationError("Exercício pertence a outra consultoria.", "TENANT_MISMATCH", 403);
      }
      if (realEx.visibility === "CREATOR_ONLY") {
        const isExCreator = ctx.membershipId && Number(realEx.created_by_membership_id) === ctx.membershipId;
        if (!isExCreator && !ctx.canManageConsultancy) {
          throw new TrainingAuthorizationError("Exercício privado de outro profissional.", "FORBIDDEN", 403);
        }
      }
    }

    // Update item exercise_id and snapshot while preserving prescription
    await connection.execute(
      `UPDATE workout_block_items
       SET exercise_id = ?,
           exercise_name_snapshot = ?,
           muscle_group_snapshot = COALESCE(muscle_group_snapshot, ?),
           equipment_snapshot = COALESCE(equipment_snapshot, ?),
           instructions_snapshot = COALESCE(instructions_snapshot, ?),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [
        realEx.id,
        realEx.name,
        realEx.muscle_group_primary,
        realEx.equipment,
        realEx.instructions,
        item.id,
      ]
    );

    // If item has no pinned media, pin exercise media
    const [existingMedia] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM workout_block_item_media WHERE block_item_id = ? LIMIT 1;`,
      [item.id]
    );
    if (!existingMedia || existingMedia.length === 0) {
      const [exMedia] = await connection.execute<RowDataPacket[]>(
        `SELECT em.media_asset_id, em.role, em.sort_order
         FROM exercise_media em
         INNER JOIN media_assets ma ON ma.id = em.media_asset_id
         WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
         ORDER BY em.sort_order ASC;`,
        [realEx.id]
      );
      for (const m of exMedia) {
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [item.id, m.media_asset_id, m.role, m.sort_order]
        );
      }
    }

    await connection.commit();

    // Return updated item DTO
    const tree = await getWorkoutVersionTree(ctx, String(item.version_public_id));
    // Find item in tree
    const targetItem = tree?.blocks
      .flatMap((b) => b.items)
      .find((i) => i.publicId === itemPublicId);

    if (targetItem) return targetItem;

    return {
      publicId: itemPublicId,
      exercisePublicId: String(realEx.public_id),
      sortOrder: 0,
      exerciseNameSnapshot: String(realEx.name),
      muscleGroupSnapshot: realEx.muscle_group_primary ? String(realEx.muscle_group_primary) : null,
      equipmentSnapshot: realEx.equipment ? String(realEx.equipment) : null,
      instructionsSnapshot: realEx.instructions ? String(realEx.instructions) : null,
      prescriptionMode: "SETS",
      targetCadence: null,
      targetRpe: null,
      targetRir: null,
      methodConfig: null,
      customVideoUrl: null,
      notes: null,
      pinnedMedia: [],
      sets: [],
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Deletes or archives a workout root (Ficha).
 * Validates tenant, author/admin capability, and preserves student completed execution history!
 */
export async function deleteWorkout(
  ctx: TrainingAccessContext,
  workoutPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [wRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, created_by_membership_id, status, title
       FROM workouts
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL
       FOR UPDATE;`,
      [workoutPublicId, ctx.consultancyId!]
    );

    if (!wRows || wRows.length === 0) {
      throw new TrainingAuthorizationError("Treino não encontrado.", "NOT_FOUND", 404);
    }
    const w = wRows[0];

    const isCreator = ctx.membershipId && Number(w.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao autor ou administrador.", "FORBIDDEN", 403);
    }

    // 1. Archive any active assignments
    await connection.execute(
      `UPDATE workout_assignments wa
       JOIN workout_versions wv ON wv.id = wa.workout_version_id
       SET wa.status = 'ARCHIVED', wa.updated_at = NOW(3)
       WHERE wv.workout_id = ? AND wa.status = 'ACTIVE';`,
      [w.id]
    );

    // 2. Soft-delete workout
    await connection.execute(
      `UPDATE workouts
       SET status = 'ARCHIVED', deleted_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [w.id]
    );

    await recordConsultancyActivity({
      consultancyId: ctx.consultancyId!,
      actorUserId: ctx.userId,
      actorMembershipId: ctx.membershipId,
      actorRole: ctx.roles.includes("PERSONAL") ? "PERSONAL" : (ctx.roles[0] || "PERSONAL"),
      action: "WORKOUT_ARCHIVED",
      module: "PERSONAL",
      resourceType: "workout",
      resourcePublicId: workoutPublicId,
      summary: `Treino "${w.title}" excluído/arquivado`,
      metadata: { workoutPublicId, title: w.title },
      connection,
    }).catch(() => {});

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
 * Deletes a draft version of a workout.
 * If the workout has no other published versions, soft-deletes the workout root entirely.
 */
export async function deleteWorkoutDraft(
  ctx: TrainingAccessContext,
  versionPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.workout_id, wv.status, w.consultancy_id, w.created_by_membership_id, w.public_id AS workout_public_id, w.title
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ? AND w.deleted_at IS NULL
       FOR UPDATE;`,
      [versionPublicId]
    );

    if (!vRows || vRows.length === 0) {
      throw new TrainingAuthorizationError("Versão de treino não encontrada.", "NOT_FOUND", 404);
    }
    const v = vRows[0];

    if (Number(v.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isCreator = ctx.membershipId && Number(v.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Acesso restrito ao autor ou administrador.", "FORBIDDEN", 403);
    }
    if (v.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Apenas rascunhos podem ser excluídos por esta ação.", "INVALID_STATUS", 400);
    }

    // Check if other published versions exist
    const [otherVersions] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status FROM workout_versions WHERE workout_id = ? AND id != ? AND status = 'PUBLISHED';`,
      [v.workout_id, v.id]
    );

    if (!otherVersions || otherVersions.length === 0) {
      // It's a draft-only workout (e.g. from an import or newly created). Soft delete the whole workout!
      await connection.execute(
        `UPDATE workouts SET status = 'ARCHIVED', deleted_at = NOW(3), updated_at = NOW(3) WHERE id = ?;`,
        [v.workout_id]
      );
      await connection.execute(
        `UPDATE workout_versions SET status = 'ARCHIVED', updated_at = NOW(3) WHERE id = ?;`,
        [v.id]
      );
    } else {
      // A published version exists. Just archive this draft version.
      await connection.execute(
        `UPDATE workout_versions SET status = 'ARCHIVED', updated_at = NOW(3) WHERE id = ?;`,
        [v.id]
      );
    }

    await recordConsultancyActivity({
      consultancyId: ctx.consultancyId!,
      actorUserId: ctx.userId,
      actorMembershipId: ctx.membershipId,
      actorRole: ctx.roles.includes("PERSONAL") ? "PERSONAL" : (ctx.roles[0] || "PERSONAL"),
      action: "WORKOUT_DRAFT_DELETED",
      module: "PERSONAL",
      resourceType: "workout",
      resourcePublicId: String(v.workout_public_id),
      summary: `Rascunho de treino "${v.title}" excluído`,
      metadata: { workoutPublicId: v.workout_public_id, versionPublicId },
      connection,
    }).catch(() => {});

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ============================================================================
// TRAINING BUILDER V3.1 — COMBINATIONS (BI-SET, TRI-SET, GIANT SET, CIRCUIT)
// ============================================================================

export type CreateCombinationInput = {
  blockPublicId: string;
  subBlockPublicId?: string | null;
  combinationType: WorkoutCombinationType;
  title?: string | null;
  itemPublicIds: string[];
  restAfterSeconds?: number;
  restAfterUnit?: "SECONDS" | "MINUTES" | string;
};

export type UpdateCombinationInput = {
  combinationType?: WorkoutCombinationType;
  title?: string | null;
  restAfterSeconds?: number;
  restAfterUnit?: "SECONDS" | "MINUTES" | string;
};

export async function createWorkoutItemCombination(
  ctx: TrainingAccessContext,
  input: CreateCombinationInput
): Promise<WorkoutItemCombinationDto> {
  assertCanAuthorTraining(ctx);

  if (!input.itemPublicIds || input.itemPublicIds.length < 2) {
    throw new TrainingAuthorizationError(
      "Uma combinação precisa de pelo menos 2 exercícios.",
      "VALIDATION_FAILED",
      400
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch and validate block & draft status
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wv.status, w.consultancy_id, w.created_by_membership_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [input.blockPublicId]
    );

    if (!bRows || bRows.length === 0) {
      throw new TrainingAuthorizationError("Categoria não encontrada.", "NOT_FOUND", 404);
    }
    const b = bRows[0];

    if (Number(b.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // 2. Fetch subBlockId if provided
    let subBlockId: number | null = null;
    let effectiveSubBlockPublicId: string | null = input.subBlockPublicId || null;
    if (input.subBlockPublicId) {
      const [sbRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM workout_sub_blocks WHERE public_id = ? AND block_id = ? LIMIT 1;`,
        [input.subBlockPublicId, b.id]
      );
      if (sbRows.length > 0) {
        subBlockId = sbRows[0].id;
      }
    }

    // 3. Fetch items to group
    const [items] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sub_block_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
              equipment_snapshot, instructions_snapshot, prescription_mode, duration_unit, notes
       FROM workout_block_items
       WHERE public_id IN (${input.itemPublicIds.map(() => "?").join(",")}) AND block_id = ?;`,
      [...input.itemPublicIds, b.id]
    );

    if (items.length !== input.itemPublicIds.length) {
      throw new TrainingAuthorizationError(
        "Um ou mais exercícios selecionados não pertencem a este treino.",
        "VALIDATION_FAILED",
        400
      );
    }

    // If subBlockId was not explicitly given, check if all selected items belong to a sub-block
    if (!subBlockId) {
      const itemWithSb = items.find((i) => i.sub_block_id != null);
      if (itemWithSb && itemWithSb.sub_block_id) {
        subBlockId = Number(itemWithSb.sub_block_id);
        const [sbPubRows] = await connection.execute<RowDataPacket[]>(
          `SELECT public_id FROM workout_sub_blocks WHERE id = ? LIMIT 1;`,
          [subBlockId]
        );
        if (sbPubRows.length > 0) {
          effectiveSubBlockPublicId = String(sbPubRows[0].public_id);
        }
      }
    }

    // Determine sort_order: minimum sort_order of selected items
    const minSortOrder = Math.min(...items.map((i) => Number(i.sort_order)));

    const combinationPublicId = crypto.randomUUID();
    const restAfter = input.restAfterSeconds ?? (input.combinationType === "TRI_SET" ? 90 : 60);
    const restUnit = input.restAfterUnit || "SECONDS";

    // 4. Insert combination
    const [combRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_combinations (
        public_id, block_id, sub_block_id, combination_type, title, sort_order, rest_after_seconds, rest_after_unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
      [
        combinationPublicId,
        b.id,
        subBlockId,
        input.combinationType,
        input.title?.trim() || null,
        minSortOrder,
        restAfter,
        restUnit,
      ]
    );
    const combinationId = combRes.insertId;

    // 5. Update items to point to combination_id, contiguous sort_order, and sub_block_id
    for (let idx = 0; idx < input.itemPublicIds.length; idx++) {
      const pId = input.itemPublicIds[idx];
      const it = items.find((i) => i.public_id === pId);
      if (it) {
        await connection.execute(
          `UPDATE workout_block_items
           SET combination_id = ?, sort_order = ?, sub_block_id = ?, updated_at = NOW(3)
           WHERE id = ?;`,
          [combinationId, minSortOrder + idx, subBlockId, it.id]
        );
      }
    }

    await connection.commit();

    const mappedItems: WorkoutBlockItemDto[] = input.itemPublicIds
      .map((pId, idx) => {
        const it = items.find((i) => i.public_id === pId);
        if (!it) return null;
        return {
          publicId: String(it.public_id),
          exercisePublicId: null,
          customExercisePublicId: null,
          combinationPublicId,
          combinationType: input.combinationType,
          subBlockPublicId: effectiveSubBlockPublicId,
          sortOrder: minSortOrder + idx,
          exerciseNameSnapshot: String(it.exercise_name_snapshot),
          muscleGroupSnapshot: it.muscle_group_snapshot ? String(it.muscle_group_snapshot) : null,
          equipmentSnapshot: it.equipment_snapshot ? String(it.equipment_snapshot) : null,
          instructionsSnapshot: it.instructions_snapshot ? String(it.instructions_snapshot) : null,
          prescriptionMode: it.prescription_mode as PrescriptionMode,
          durationUnit: it.duration_unit ? String(it.duration_unit) : null,
          targetCadence: null,
          targetRpe: null,
          targetRir: null,
          methodConfig: null,
          customVideoUrl: null,
          notes: it.notes ? String(it.notes) : null,
          pinnedMedia: [],
          sets: [],
        };
      })
      .filter(Boolean) as WorkoutBlockItemDto[];

    return {
      publicId: combinationPublicId,
      blockPublicId: input.blockPublicId,
      subBlockPublicId: effectiveSubBlockPublicId,
      combinationType: input.combinationType,
      title: input.title?.trim() || null,
      sortOrder: minSortOrder,
      rounds: null,
      restAfterSeconds: restAfter,
      restAfterUnit: restUnit,
      items: mappedItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function updateWorkoutItemCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  input: UpdateCombinationInput
): Promise<WorkoutItemCombinationDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wic.public_id, wic.block_id, wic.sub_block_id, wic.combination_type, wic.title,
              wic.sort_order, wic.rounds, wic.rest_after_seconds, wic.rest_after_unit,
              wb.public_id AS block_public_id, wsb.public_id AS sub_block_public_id,
              wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       LEFT JOIN workout_sub_blocks wsb ON wsb.id = wic.sub_block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const updates: string[] = ["updated_at = NOW(3)"];
    const params: (string | number | null)[] = [];

    if (input.combinationType !== undefined) {
      updates.push("combination_type = ?");
      params.push(input.combinationType);
    }
    if (input.title !== undefined) {
      updates.push("title = ?");
      params.push(input.title?.trim() || null);
    }
    if (input.restAfterSeconds !== undefined) {
      updates.push("rest_after_seconds = ?");
      params.push(Number(input.restAfterSeconds));
    }
    if (input.restAfterUnit !== undefined) {
      updates.push("rest_after_unit = ?");
      params.push(input.restAfterUnit);
    }

    params.push(comb.id);
    await connection.execute(
      `UPDATE workout_item_combinations SET ${updates.join(", ")} WHERE id = ?;`,
      params
    );

    await connection.commit();

    return {
      publicId: comb.public_id,
      blockPublicId: String(comb.block_public_id),
      subBlockPublicId: comb.sub_block_public_id ? String(comb.sub_block_public_id) : null,
      combinationType: input.combinationType || (comb.combination_type as WorkoutCombinationType),
      title: input.title !== undefined ? (input.title?.trim() || null) : comb.title,
      sortOrder: Number(comb.sort_order),
      rounds: comb.rounds != null ? Number(comb.rounds) : null,
      restAfterSeconds: input.restAfterSeconds !== undefined ? Number(input.restAfterSeconds) : Number(comb.rest_after_seconds),
      restAfterUnit: input.restAfterUnit !== undefined ? input.restAfterUnit : comb.rest_after_unit,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function ungroupWorkoutItemCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // Ungroup: set combination_id = NULL on all items
    await connection.execute(
      `UPDATE workout_block_items SET combination_id = NULL, updated_at = NOW(3) WHERE combination_id = ?;`,
      [comb.id]
    );

    // Delete combination
    await connection.execute(`DELETE FROM workout_item_combinations WHERE id = ?;`, [comb.id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function deleteWorkoutItemCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  deleteItems: boolean = false
): Promise<void> {
  if (!deleteItems) {
    return ungroupWorkoutItemCombination(ctx, combinationPublicId);
  }

  assertCanAuthorTraining(ctx);
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // Find items
    const [items] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM workout_block_items WHERE combination_id = ?;`,
      [comb.id]
    );

    if (items.length > 0) {
      const itemIds = items.map((i) => i.id);
      await connection.execute(
        `DELETE FROM workout_item_sets WHERE block_item_id IN (${itemIds.map(() => "?").join(",")});`,
        itemIds
      );
      await connection.execute(
        `DELETE FROM workout_block_item_media WHERE block_item_id IN (${itemIds.map(() => "?").join(",")});`,
        itemIds
      );
      await connection.execute(
        `DELETE FROM workout_block_items WHERE id IN (${itemIds.map(() => "?").join(",")});`,
        itemIds
      );
    }

    await connection.execute(`DELETE FROM workout_item_combinations WHERE id = ?;`, [comb.id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function addItemToCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  itemPublicId: string
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wic.block_id, wic.sub_block_id, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, block_id, sub_block_id FROM workout_block_items WHERE public_id = ? LIMIT 1;`,
      [itemPublicId]
    );
    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = itemRows[0];

    if (item.block_id !== comb.block_id) {
      throw new TrainingAuthorizationError("O exercício deve pertencer ao mesmo treino.", "INVALID_TARGET", 400);
    }

    await connection.execute(
      `UPDATE workout_block_items SET combination_id = ?, sub_block_id = ?, updated_at = NOW(3) WHERE id = ?;`,
      [comb.id, comb.sub_block_id, item.id]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function removeItemFromCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  itemPublicId: string
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // Set combination_id = NULL on the item
    await connection.execute(
      `UPDATE workout_block_items SET combination_id = NULL, updated_at = NOW(3) WHERE public_id = ? AND combination_id = ?;`,
      [itemPublicId, comb.id]
    );

    // Check remaining items count
    const [remainingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM workout_block_items WHERE combination_id = ?;`,
      [comb.id]
    );
    const remaining = Number(remainingRows[0]?.total || 0);

    // If 1 or 0 items left, automatically ungroup the rest
    if (remaining <= 1) {
      await connection.execute(
        `UPDATE workout_block_items SET combination_id = NULL, updated_at = NOW(3) WHERE combination_id = ?;`,
        [comb.id]
      );
      await connection.execute(`DELETE FROM workout_item_combinations WHERE id = ?;`, [comb.id]);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function reorderWorkoutItemCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  direction: "UP" | "DOWN"
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wic.block_id, wic.sub_block_id, wic.sort_order, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // Find all combinations in the same block/sub-block
    const [allCombs] = await connection.execute<RowDataPacket[]>(
      `SELECT id, sort_order
       FROM workout_item_combinations
       WHERE block_id = ? AND ${comb.sub_block_id ? "sub_block_id = ?" : "sub_block_id IS NULL"}
       ORDER BY sort_order ASC;`,
      comb.sub_block_id ? [comb.block_id, comb.sub_block_id] : [comb.block_id]
    );

    const idx = allCombs.findIndex((c) => c.id === comb.id);
    if (idx === -1) return;

    const swapIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allCombs.length) return;

    const currentOrder = allCombs[idx].sort_order;
    const swapOrder = allCombs[swapIdx].sort_order;

    await connection.execute(`UPDATE workout_item_combinations SET sort_order = ? WHERE id = ?;`, [swapOrder, allCombs[idx].id]);
    await connection.execute(`UPDATE workout_item_combinations SET sort_order = ? WHERE id = ?;`, [currentOrder, allCombs[swapIdx].id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function moveItemInCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string,
  itemPublicId: string,
  direction: "UP" | "DOWN"
): Promise<void> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const [items] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM workout_block_items
       WHERE combination_id = ?
       ORDER BY sort_order ASC;`,
      [comb.id]
    );

    const idx = items.findIndex((i) => i.public_id === itemPublicId);
    if (idx === -1) return;

    const swapIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const currentOrder = items[idx].sort_order;
    const swapOrder = items[swapIdx].sort_order;

    await connection.execute(`UPDATE workout_block_items SET sort_order = ? WHERE id = ?;`, [swapOrder, items[idx].id]);
    await connection.execute(`UPDATE workout_block_items SET sort_order = ? WHERE id = ?;`, [currentOrder, items[swapIdx].id]);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function duplicateWorkoutItemCombination(
  ctx: TrainingAccessContext,
  combinationPublicId: string
): Promise<WorkoutItemCombinationDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [combRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wic.id, wic.block_id, wic.sub_block_id, wic.combination_type, wic.title,
              wic.sort_order, wic.rounds, wic.rest_after_seconds, wic.rest_after_unit,
              wb.public_id AS block_public_id, wsb.public_id AS sub_block_public_id,
              wv.status, w.consultancy_id
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       LEFT JOIN workout_sub_blocks wsb ON wsb.id = wic.sub_block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wic.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [combinationPublicId]
    );

    if (!combRows || combRows.length === 0) {
      throw new TrainingAuthorizationError("Combinação não encontrada.", "NOT_FOUND", 404);
    }
    const comb = combRows[0];

    if (Number(comb.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (comb.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const [maxOrderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM workout_item_combinations
       WHERE block_id = ? AND ${comb.sub_block_id ? "sub_block_id = ?" : "sub_block_id IS NULL"};`,
      comb.sub_block_id ? [comb.block_id, comb.sub_block_id] : [comb.block_id]
    );
    const nextOrder = Number(maxOrderRows[0]?.next_order || 0);

    const newCombPublicId = crypto.randomUUID();
    const newTitle = comb.title ? `${comb.title} (Cópia)` : null;

    const [combRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_item_combinations (
        public_id, block_id, sub_block_id, combination_type, title, sort_order, rounds, rest_after_seconds, rest_after_unit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
      [
        newCombPublicId,
        comb.block_id,
        comb.sub_block_id,
        comb.combination_type,
        newTitle,
        nextOrder,
        comb.rounds,
        comb.rest_after_seconds,
        comb.rest_after_unit,
      ]
    );
    const newCombId = combRes.insertId;

    // Fetch items
    const [sourceItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot, muscle_group_snapshot,
              equipment_snapshot, instructions_snapshot, prescription_mode,
              target_cadence, target_rpe, target_rir, duration_unit, method_config_json,
              custom_video_url, notes
       FROM workout_block_items
       WHERE combination_id = ?
       ORDER BY sort_order ASC;`,
      [comb.id]
    );

    for (const item of sourceItems) {
      const newItemPublicId = crypto.randomUUID();
      const [iRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_block_items (
          public_id, block_id, sub_block_id, combination_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot,
          muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
          prescription_mode, target_cadence, target_rpe, target_rir,
          duration_unit, method_config_json, custom_video_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          newItemPublicId,
          comb.block_id,
          comb.sub_block_id,
          newCombId,
          item.exercise_id,
          item.custom_exercise_id,
          item.sort_order,
          item.exercise_name_snapshot,
          item.muscle_group_snapshot,
          item.equipment_snapshot,
          item.instructions_snapshot,
          item.prescription_mode,
          item.target_cadence,
          item.target_rpe,
          item.target_rir,
          item.duration_unit || null,
          item.method_config_json,
          item.custom_video_url,
          item.notes,
        ]
      );
      const newItemId = iRes.insertId;

      // Clone media
      const [mediaRows] = await connection.execute<RowDataPacket[]>(
        `SELECT media_asset_id, role, sort_order FROM workout_block_item_media WHERE block_item_id = ?;`,
        [item.id]
      );
      for (const m of mediaRows) {
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?);`,
          [newItemId, m.media_asset_id, m.role, m.sort_order]
        );
      }

      // Clone sets
      const [setRows] = await connection.execute<RowDataPacket[]>(
        `SELECT set_number, set_type, target_reps, target_reps_max, target_load_kg,
                target_duration_seconds, duration_unit, target_distance_meters,
                target_rest_seconds, intensity_indicator
         FROM workout_item_sets WHERE block_item_id = ? ORDER BY set_number ASC;`,
        [item.id]
      );
      for (const s of setRows) {
        await connection.execute(
          `INSERT INTO workout_item_sets (
            block_item_id, set_number, set_type, target_reps, target_reps_max, target_load_kg,
            target_duration_seconds, duration_unit, target_distance_meters, target_rest_seconds,
            intensity_indicator, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
          [
            newItemId,
            s.set_number,
            s.set_type,
            s.target_reps,
            s.target_reps_max,
            s.target_load_kg,
            s.target_duration_seconds,
            s.duration_unit,
            s.target_distance_meters,
            s.target_rest_seconds,
            s.intensity_indicator,
          ]
        );
      }
    }

    await connection.commit();

    return {
      publicId: newCombPublicId,
      blockPublicId: String(comb.block_public_id),
      subBlockPublicId: comb.sub_block_public_id ? String(comb.sub_block_public_id) : null,
      combinationType: comb.combination_type as WorkoutCombinationType,
      title: newTitle,
      sortOrder: nextOrder,
      rounds: comb.rounds != null ? Number(comb.rounds) : null,
      restAfterSeconds: Number(comb.rest_after_seconds),
      restAfterUnit: comb.rest_after_unit,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ============================================================================
// TRAINING BUILDER V3.1 — CUSTOM EXERCISES (OUTSIDE GLOBAL LIBRARY)
// ============================================================================

function normalizeExerciseNameHelper(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type CreateCustomExerciseInput = {
  categoryPublicId: string;
  subBlockPublicId?: string | null;
  name: string;
  description?: string | null;
  muscleGroupPrimary?: string | null;
  equipment?: string | null;
  instructions?: string | null;
  prescriptionMode?: PrescriptionMode;
  durationUnit?: "SECONDS" | "MINUTES" | string | null;
  customVideoUrl?: string | null;
  mediaAssetPublicId?: string | null;
  notes?: string | null;
  sets?: AddSetInput[];
  saveToLibrary?: boolean;
  isSequence?: boolean;
  sequenceMovements?: string[];
};

export async function createCustomExerciseInWorkout(
  ctx: TrainingAccessContext,
  input: CreateCustomExerciseInput
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  if (!input.name || !input.name.trim()) {
    throw new TrainingAuthorizationError("O nome do exercício é obrigatório.", "VALIDATION_FAILED", 400);
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch category (block) and verify tenancy and DRAFT status
    const [bRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.workout_version_id, wv.status, w.consultancy_id
       FROM workout_blocks wb
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wb.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [input.categoryPublicId]
    );

    if (!bRows || bRows.length === 0) {
      throw new TrainingAuthorizationError("Treino não encontrado.", "NOT_FOUND", 404);
    }
    const b = bRows[0];

    if (Number(b.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (b.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // 2. Fetch subBlockId if provided
    let subBlockId: number | null = null;
    let subBlockTitle: string | null = null;
    if (input.subBlockPublicId) {
      const [sbRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, title FROM workout_sub_blocks WHERE public_id = ? AND block_id = ? LIMIT 1;`,
        [input.subBlockPublicId, b.id]
      );
      if (sbRows.length > 0) {
        subBlockId = sbRows[0].id;
        subBlockTitle = String(sbRows[0].title);
      }
    }

    // 3. Insert into exercises table with scope = 'CONSULTANCY'
    const exercisePublicId = crypto.randomUUID();
    const cleanName = input.name.trim();
    const normName = normalizeExerciseNameHelper(cleanName);
    const muscleGroup = input.muscleGroupPrimary?.trim() || "Geral";
    const equipment = input.equipment?.trim() || "Livre";
    const visibility = input.saveToLibrary ? "CONSULTANCY" : "CREATOR_ONLY";

    const [exRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO exercises (
        public_id, scope, consultancy_id, visibility, created_by_user_id, created_by_membership_id,
        name, normalized_name, description, muscle_group_primary, equipment,
        instructions, status, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', NOW(3), NOW(3));`,
      [
        exercisePublicId,
        ctx.consultancyId!,
        visibility,
        ctx.userId,
        ctx.membershipId!,
        cleanName,
        normName,
        input.description?.trim() || null,
        muscleGroup,
        equipment,
        input.instructions?.trim() || null,
      ]
    );
    const exerciseId = exRes.insertId;

    // 4. Attach media asset if provided
    let pinnedMediaAsset: BlockItemMediaDto[] = [];
    if (input.mediaAssetPublicId) {
      const [maRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, scope, visibility, media_type, storage_provider, mime_type, file_size_bytes, duration_seconds, width, height, created_at
         FROM media_assets
         WHERE public_id = ? AND deleted_at IS NULL AND (scope = 'GLOBAL' OR consultancy_id = ?)
         LIMIT 1;`,
        [input.mediaAssetPublicId, ctx.consultancyId!]
      );
      if (maRows && maRows.length > 0) {
        const ma = maRows[0];
        await connection.execute(
          `INSERT INTO exercise_media (exercise_id, media_asset_id, role, sort_order) VALUES (?, ?, 'EXECUTION_VIDEO', 0);`,
          [exerciseId, ma.id]
        );
      }
    }

    // 5. Determine sort_order in block
    const [orderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM workout_block_items WHERE block_id = ?;`,
      [b.id]
    );
    const nextItemOrder = Number(orderRows[0]?.next_order || 0);

    const itemPublicId = crypto.randomUUID();

    // 6. Insert workout_block_item with custom_exercise_id set and exercise_id = NULL
    const methodConfig = input.isSequence
      ? {
          isSequence: true,
          customSequence: {
            isSequence: true,
            movements: (input.sequenceMovements || []).map((m) => (typeof m === "string" ? m.trim() : "")).filter(Boolean),
          },
        }
      : null;
    const methodConfigJson = methodConfig ? JSON.stringify(methodConfig) : null;

    const [iRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_block_items (
        public_id, block_id, sub_block_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot,
        muscle_group_snapshot, equipment_snapshot, instructions_snapshot,
        prescription_mode, duration_unit, custom_video_url, notes, method_config_json, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
      [
        itemPublicId,
        b.id,
        subBlockId,
        exerciseId,
        nextItemOrder,
        cleanName,
        muscleGroup,
        equipment,
        input.instructions?.trim() || null,
        input.prescriptionMode || "SETS",
        input.durationUnit || null,
        input.customVideoUrl?.trim() || null,
        input.notes?.trim() || null,
        methodConfigJson,
      ]
    );
    const itemId = iRes.insertId;

    // Pin media asset to block item if provided
    if (input.mediaAssetPublicId) {
      const [maRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, scope, visibility, media_type, storage_provider, mime_type, file_size_bytes, duration_seconds, width, height, created_at
         FROM media_assets
         WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
        [input.mediaAssetPublicId]
      );
      if (maRows && maRows.length > 0) {
        const ma = maRows[0];
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order) VALUES (?, ?, 'EXECUTION_VIDEO', 0);`,
          [itemId, ma.id]
        );
        pinnedMediaAsset = [
          {
            role: "EXECUTION_VIDEO",
            sortOrder: 0,
            mediaAsset: {
              publicId: String(ma.public_id),
              scope: ma.scope,
              visibility: ma.visibility,
              consultancyPublicId: null,
              mediaType: ma.media_type,
              storageProvider: ma.storage_provider,
              mimeType: String(ma.mime_type),
              fileSizeBytes: Number(ma.file_size_bytes),
              durationSeconds: ma.duration_seconds != null ? Number(ma.duration_seconds) : null,
              width: ma.width != null ? Number(ma.width) : null,
              height: ma.height != null ? Number(ma.height) : null,
              createdAt: new Date(ma.created_at),
            },
          },
        ];
      }
    }

    // 7. Insert sets
    const defaultSets = input.sets && input.sets.length > 0 ? input.sets : [
      { setNumber: 1, setType: "NORMAL" as WorkoutSetType, targetReps: 10, targetRestSeconds: 60 },
      { setNumber: 2, setType: "NORMAL" as WorkoutSetType, targetReps: 10, targetRestSeconds: 60 },
      { setNumber: 3, setType: "NORMAL" as WorkoutSetType, targetReps: 10, targetRestSeconds: 60 },
    ];

    const insertedSets: WorkoutItemSetDto[] = [];
    for (let s = 0; s < defaultSets.length; s++) {
      const sInput = defaultSets[s];
      const setNum = sInput.setNumber || s + 1;
      await connection.execute(
        `INSERT INTO workout_item_sets (
          block_item_id, set_number, set_type, target_reps, target_reps_max, target_load_kg,
          target_duration_seconds, duration_unit, target_rest_seconds, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          itemId,
          setNum,
          sInput.setType || "NORMAL",
          sInput.targetReps ?? null,
          sInput.targetRepsMax ?? null,
          sInput.targetLoadKg ?? null,
          sInput.targetDurationSeconds ?? null,
          sInput.durationUnit || input.durationUnit || null,
          sInput.targetRestSeconds ?? 60,
        ]
      );
      insertedSets.push({
        setNumber: setNum,
        setType: (sInput.setType as WorkoutSetType) || "NORMAL",
        targetReps: sInput.targetReps ?? null,
        targetRepsMax: sInput.targetRepsMax ?? null,
        targetLoadKg: sInput.targetLoadKg ?? null,
        targetDurationSeconds: sInput.targetDurationSeconds ?? null,
        durationUnit: sInput.durationUnit || input.durationUnit || null,
        targetRestSeconds: sInput.targetRestSeconds ?? 60,
      });
    }

    await connection.commit();

    return {
      publicId: itemPublicId,
      exercisePublicId: exercisePublicId,
      customExercisePublicId: exercisePublicId,
      isCustomExercise: true,
      combinationPublicId: null,
      combinationType: null,
      subBlockPublicId: input.subBlockPublicId || null,
      subBlockTitle,
      sortOrder: nextItemOrder,
      exerciseNameSnapshot: cleanName,
      muscleGroupSnapshot: muscleGroup,
      equipmentSnapshot: equipment,
      instructionsSnapshot: input.instructions?.trim() || null,
      prescriptionMode: input.prescriptionMode || "SETS",
      targetCadence: null,
      targetRpe: null,
      targetRir: null,
      durationUnit: input.durationUnit || null,
      methodConfig,
      customVideoUrl: input.customVideoUrl?.trim() || null,
      notes: input.notes?.trim() || null,
      pinnedMedia: pinnedMediaAsset,
      sets: insertedSets,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type ConvertUnresolvedInput = {
  itemPublicId: string;
  name: string;
  description?: string | null;
  muscleGroupPrimary?: string | null;
  equipment?: string | null;
  instructions?: string | null;
  customVideoUrl?: string | null;
  mediaAssetPublicId?: string | null;
  saveToLibrary?: boolean;
  notes?: string | null;
  isSequence?: boolean;
  sequenceMovements?: string[];
};

export async function convertUnresolvedToCustomExercise(
  ctx: TrainingAccessContext,
  input: ConvertUnresolvedInput
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  if (!input.name || !input.name.trim()) {
    throw new TrainingAuthorizationError("O nome do exercício é obrigatório.", "VALIDATION_FAILED", 400);
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch item and verify ownership & DRAFT status
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.block_id, wbi.sub_block_id, wbi.combination_id, wbi.sort_order, wbi.prescription_mode,
              wbi.target_cadence, wbi.target_rpe, wbi.target_rir,
              wbi.duration_unit, wbi.notes, wbi.instructions_snapshot, wbi.method_config_json,
              wsb.public_id AS sub_block_public_id, wsb.title AS sub_block_title,
              wic.public_id AS combination_public_id, wic.combination_type,
              wv.status, w.consultancy_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       LEFT JOIN workout_sub_blocks wsb ON wsb.id = wbi.sub_block_id
       LEFT JOIN workout_item_combinations wic ON wic.id = wbi.combination_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [input.itemPublicId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = itemRows[0];

    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar uma versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    // 2. Create custom exercise in exercises table
    const exercisePublicId = crypto.randomUUID();
    const cleanName = input.name.trim();
    const normName = normalizeExerciseNameHelper(cleanName);
    const muscleGroup = input.muscleGroupPrimary?.trim() || "Geral";
    const equipment = input.equipment?.trim() || "Livre";
    const visibility = input.saveToLibrary ? "CONSULTANCY" : "CREATOR_ONLY";

    const [exRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO exercises (
        public_id, scope, consultancy_id, visibility, created_by_user_id, created_by_membership_id,
        name, normalized_name, description, muscle_group_primary, equipment,
        instructions, status, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', NOW(3), NOW(3));`,
      [
        exercisePublicId,
        ctx.consultancyId!,
        visibility,
        ctx.userId,
        ctx.membershipId!,
        cleanName,
        normName,
        input.description?.trim() || null,
        muscleGroup,
        equipment,
        input.instructions?.trim() || null,
      ]
    );
    const exerciseId = exRes.insertId;

    // 3. Attach media asset if provided
    let pinnedMediaAsset: BlockItemMediaDto[] = [];
    if (input.mediaAssetPublicId) {
      const [maRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, scope, visibility, media_type, storage_provider, mime_type, file_size_bytes, duration_seconds, width, height, created_at
         FROM media_assets
         WHERE public_id = ? AND deleted_at IS NULL AND (scope = 'GLOBAL' OR consultancy_id = ?)
         LIMIT 1;`,
        [input.mediaAssetPublicId, ctx.consultancyId!]
      );
      if (maRows && maRows.length > 0) {
        const ma = maRows[0];
        await connection.execute(
          `INSERT INTO exercise_media (exercise_id, media_asset_id, role, sort_order) VALUES (?, ?, 'EXECUTION_VIDEO', 0);`,
          [exerciseId, ma.id]
        );
        await connection.execute(
          `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order)
           VALUES (?, ?, 'EXECUTION_VIDEO', 0)
           ON DUPLICATE KEY UPDATE media_asset_id = VALUES(media_asset_id);`,
          [item.id, ma.id]
        );
        pinnedMediaAsset = [
          {
            role: "EXECUTION_VIDEO",
            sortOrder: 0,
            mediaAsset: {
              publicId: String(ma.public_id),
              scope: ma.scope,
              visibility: ma.visibility,
              consultancyPublicId: null,
              mediaType: ma.media_type,
              storageProvider: ma.storage_provider,
              mimeType: String(ma.mime_type),
              fileSizeBytes: Number(ma.file_size_bytes),
              durationSeconds: ma.duration_seconds != null ? Number(ma.duration_seconds) : null,
              width: ma.width != null ? Number(ma.width) : null,
              height: ma.height != null ? Number(ma.height) : null,
              createdAt: new Date(ma.created_at),
            },
          },
        ];
      }
    }

    // 4. Update item: set custom_exercise_id = exerciseId, exercise_id = NULL, update snapshots, PRESERVE PRESCRIPTION
    let existingConfig: Record<string, unknown> = {};
    if (item.method_config_json) {
      try {
        existingConfig =
          typeof item.method_config_json === "string"
            ? JSON.parse(item.method_config_json)
            : typeof item.method_config_json === "object" && item.method_config_json !== null
            ? { ...(item.method_config_json as Record<string, unknown>) }
            : {};
      } catch {
        existingConfig = {};
      }
    }

    let methodConfig: Record<string, unknown> | null =
      Object.keys(existingConfig).length > 0 ? { ...existingConfig } : null;

    if (input.isSequence) {
      const cleanMovements = (input.sequenceMovements || [])
        .map((m) => (typeof m === "string" ? m.trim() : ""))
        .filter(Boolean);

      methodConfig = {
        ...(methodConfig || {}),
        isSequence: true,
        customSequence: {
          isSequence: true,
          movements: cleanMovements,
        },
      };
    }
    const methodConfigJson = methodConfig ? JSON.stringify(methodConfig) : null;
    const effectiveNotes = input.notes !== undefined ? (input.notes?.trim() || null) : (item.notes ? String(item.notes) : null);
    const effectiveInstructions = input.instructions !== undefined ? (input.instructions?.trim() || null) : (item.instructions_snapshot ? String(item.instructions_snapshot) : null);

    await connection.execute(
      `UPDATE workout_block_items
       SET exercise_id = NULL,
           custom_exercise_id = ?,
           exercise_name_snapshot = ?,
           muscle_group_snapshot = ?,
           equipment_snapshot = ?,
           instructions_snapshot = ?,
           notes = ?,
           custom_video_url = COALESCE(?, custom_video_url),
           method_config_json = ?,
           updated_at = NOW(3)
       WHERE id = ?;`,
      [
        exerciseId,
        cleanName,
        muscleGroup,
        equipment,
        effectiveInstructions,
        effectiveNotes,
        input.customVideoUrl?.trim() || null,
        methodConfigJson,
        item.id,
      ]
    );

    // 5. Fetch existing sets with complete fidelity
    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wis.id, wis.set_number, wis.set_type, wis.parent_set_id, p.set_number AS parent_set_number,
              wis.target_reps, wis.target_reps_max, wis.target_load_kg,
              wis.target_duration_seconds, wis.duration_unit, wis.target_distance_meters,
              wis.target_rest_seconds, wis.intensity_indicator
       FROM workout_item_sets wis
       LEFT JOIN workout_item_sets p ON p.id = wis.parent_set_id
       WHERE wis.block_item_id = ?
       ORDER BY wis.set_number ASC;`,
      [item.id]
    );

    const sets: WorkoutItemSetDto[] = setRows.map((s) => ({
      setNumber: Number(s.set_number),
      setType: s.set_type as WorkoutSetType,
      parentSetNumber: s.parent_set_number != null ? Number(s.parent_set_number) : null,
      targetReps: s.target_reps != null ? Number(s.target_reps) : null,
      targetRepsMax: s.target_reps_max != null ? Number(s.target_reps_max) : null,
      targetLoadKg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
      targetDurationSeconds: s.target_duration_seconds != null ? Number(s.target_duration_seconds) : null,
      durationUnit: s.duration_unit ? String(s.duration_unit) : null,
      targetDistanceMeters: s.target_distance_meters != null ? Number(s.target_distance_meters) : null,
      targetRestSeconds: s.target_rest_seconds != null ? Number(s.target_rest_seconds) : null,
      intensityIndicator: s.intensity_indicator ? String(s.intensity_indicator) : null,
    }));

    await connection.commit();

    return {
      publicId: input.itemPublicId,
      exercisePublicId: exercisePublicId,
      customExercisePublicId: exercisePublicId,
      isCustomExercise: true,
      combinationPublicId: item.combination_public_id ? String(item.combination_public_id) : null,
      combinationType: item.combination_type ? (item.combination_type as WorkoutCombinationType) : null,
      subBlockPublicId: item.sub_block_public_id ? String(item.sub_block_public_id) : null,
      subBlockTitle: item.sub_block_title ? String(item.sub_block_title) : null,
      sortOrder: Number(item.sort_order),
      exerciseNameSnapshot: cleanName,
      muscleGroupSnapshot: muscleGroup,
      equipmentSnapshot: equipment,
      instructionsSnapshot: effectiveInstructions,
      prescriptionMode: item.prescription_mode as PrescriptionMode,
      targetCadence: item.target_cadence ? String(item.target_cadence) : null,
      targetRpe: item.target_rpe != null ? Number(item.target_rpe) : null,
      targetRir: item.target_rir != null ? Number(item.target_rir) : null,
      durationUnit: item.duration_unit ? String(item.duration_unit) : null,
      methodConfig,
      customVideoUrl: input.customVideoUrl?.trim() || null,
      notes: effectiveNotes,
      pinnedMedia: pinnedMediaAsset,
      sets,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type UpdateItemCustomSequenceInput = {
  itemPublicId: string;
  isSequence: boolean;
  rawText?: string | null;
  movements: Array<{
    order: number;
    label: string;
    exerciseId?: number | null;
    exercisePublicId?: string | null;
    repsText?: string | null;
    durationText?: string | null;
    customVideoUrl?: string | null;
    instructionsSnapshot?: string | null;
    muscleGroupSnapshot?: string | null;
    equipmentSnapshot?: string | null;
  }>;
  overrideMediaUrl?: string | null;
};

/**
 * Updates a custom exercise item with structured sequence movements.
 * Preserves 100% of prescription, sets, notes, cadence, and existing method config.
 * Performs a safe merge in method_config_json.
 */
export async function updateItemCustomSequence(
  ctx: TrainingAccessContext,
  input: UpdateItemCustomSequenceInput
): Promise<WorkoutBlockItemDto> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [iRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wbi.public_id, wbi.block_id, wbi.sub_block_id, wbi.combination_id,
              wbi.exercise_id, wbi.custom_exercise_id, wbi.sort_order, wbi.exercise_name_snapshot,
              wbi.muscle_group_snapshot, wbi.equipment_snapshot, wbi.instructions_snapshot,
              wbi.prescription_mode, wbi.target_cadence, wbi.target_rpe, wbi.target_rir,
              wbi.duration_unit, wbi.method_config_json, wbi.custom_video_url, wbi.notes,
              wb.workout_version_id, wv.public_id AS version_public_id, wv.status,
              w.consultancy_id, w.created_by_membership_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [input.itemPublicId]
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
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar a sequência.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar itens de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // Merge safely into method_config_json preserving all existing fields (method, cadence, dropset, etc.)
    let existingConfig: Record<string, unknown> = {};
    if (item.method_config_json) {
      try {
        existingConfig =
          typeof item.method_config_json === "string"
            ? JSON.parse(item.method_config_json)
            : typeof item.method_config_json === "object" && item.method_config_json !== null
            ? { ...(item.method_config_json as Record<string, unknown>) }
            : {};
      } catch {
        existingConfig = {};
      }
    }

    // Enrich movements with library exercise metadata if exercisePublicId is provided
    const enrichedMovements = await Promise.all(
      (input.movements || []).map(async (m) => {
        let exId = m.exerciseId ?? null;
        let muscle = m.muscleGroupSnapshot || null;
        let equip = m.equipmentSnapshot || null;
        let instr = m.instructionsSnapshot || null;

        if (m.exercisePublicId && !exId) {
          const [exRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, muscle_group_primary, equipment, instructions FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
            [m.exercisePublicId]
          );
          if (exRows.length > 0) {
            exId = Number(exRows[0].id);
            if (!muscle && exRows[0].muscle_group_primary) muscle = String(exRows[0].muscle_group_primary);
            if (!equip && exRows[0].equipment) equip = String(exRows[0].equipment);
            if (!instr && exRows[0].instructions) instr = String(exRows[0].instructions);
          }
        }

        return {
          order: m.order,
          label: m.label.trim(),
          exerciseId: exId,
          exercisePublicId: m.exercisePublicId || null,
          repsText: m.repsText || null,
          durationText: m.durationText || null,
          customVideoUrl: m.customVideoUrl || null,
          instructionsSnapshot: instr,
          muscleGroupSnapshot: muscle,
          equipmentSnapshot: equip,
        };
      })
    );

    const mergedConfig = {
      ...existingConfig,
      isSequence: Boolean(input.isSequence),
      customSequence: {
        isSequence: Boolean(input.isSequence),
        rawText: input.rawText || item.exercise_name_snapshot,
        movements: enrichedMovements,
        overrideMediaUrl: input.overrideMediaUrl || null,
      },
    };

    const configJson = JSON.stringify(mergedConfig);

    await connection.execute(
      `UPDATE workout_block_items SET method_config_json = ?, updated_at = NOW(3) WHERE id = ?;`,
      [configJson, item.id]
    );

    await connection.commit();

    // Re-read item tree snapshot
    const updatedVersionTree = await getWorkoutVersionTree(ctx, String(item.version_public_id));
    for (const b of updatedVersionTree?.blocks || []) {
      const found = b.items.find((it) => it.publicId === input.itemPublicId);
      if (found) return found;
    }

    throw new TrainingAuthorizationError("Item atualizado não encontrado na árvore.", "NOT_FOUND", 404);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}


