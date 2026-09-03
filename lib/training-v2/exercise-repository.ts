/**
 * TREVO ONE — TRAINING V2 EXERCISE REPOSITORY
 * Unified catalog operations for Global and Consultancy exercises with tenant isolation.
 */

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertCanAuthorTraining,
  assertCanManageGlobal,
} from "./access";
import type {
  ExerciseItemDto,
  ExerciseMediaDto,
  ExerciseScope,
  ExerciseVisibility,
  ExerciseStatus,
  MovementPattern,
  DifficultyLevel,
  MediaRole,
  MediaType,
  StorageProvider,
} from "./types";

export type ListExercisesFilter = {
  query?: string;
  muscleGroup?: string;
  equipment?: string;
  scope?: "ALL" | "GLOBAL" | "CONSULTANCY";
  status?: ExerciseStatus;
  page?: number;
  pageSize?: number;
};

export type ListExercisesResult = {
  items: ExerciseItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreateExerciseInput = {
  name: string;
  muscleGroupPrimary: string;
  muscleGroupsSecondary?: string[] | null;
  equipment: string;
  movementPattern?: MovementPattern | string | null;
  difficultyLevel?: DifficultyLevel | string;
  description?: string | null;
  instructions?: string | null;
  executionTips?: string | null;
  commonMistakes?: string | null;
  progressions?: string | null;
  regressions?: string | null;
  rightsNotes?: string | null;
  visibility?: ExerciseVisibility;
  status?: ExerciseStatus;
};

export type UpdateExerciseInput = Partial<CreateExerciseInput>;

function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Lists exercises accessible to the professional within their trusted context.
 */
export async function listExercisesForProfessional(
  ctx: TrainingAccessContext,
  filter: ListExercisesFilter = {}
): Promise<ListExercisesResult> {
  const page = Math.max(1, Number(filter.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filter.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ["e.deleted_at IS NULL"];
  const params: (string | number)[] = [];

  // Tenancy and scope conditions
  if (ctx.isPlatformAdmin && filter.scope === "GLOBAL") {
    // Platform admin explicitly managing global catalog
    conditions.push("e.scope = 'GLOBAL'");
    if (filter.status) {
      conditions.push("e.status = ?");
      params.push(filter.status);
    }
  } else if (ctx.canAuthorTraining && ctx.consultancyId) {
    if (filter.scope === "GLOBAL") {
      conditions.push("e.scope = 'GLOBAL' AND e.status = 'PUBLISHED'");
    } else if (filter.scope === "CONSULTANCY") {
      conditions.push("e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED'");
      params.push(ctx.consultancyId);

      if (!ctx.canManageConsultancy) {
        // Regular personal trainer: sees shared consultancy exercises OR own creator-only
        conditions.push("(e.visibility = 'CONSULTANCY' OR (e.visibility = 'CREATOR_ONLY' AND e.created_by_membership_id = ?))");
        params.push(ctx.membershipId!);
      }
    } else {
      // Default 'ALL': global published OR authorized consultancy
      if (ctx.canManageConsultancy) {
        conditions.push(
          "((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED'))"
        );
        params.push(ctx.consultancyId);
      } else {
        conditions.push(
          `((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR 
            (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED' AND 
             (e.visibility = 'CONSULTANCY' OR (e.visibility = 'CREATOR_ONLY' AND e.created_by_membership_id = ?))))`
        );
        params.push(ctx.consultancyId, ctx.membershipId!);
      }
    }
  } else {
    // Caller lacks training authoring capabilities
    return { items: [], total: 0, page, pageSize, totalPages: 0 };
  }

  // Filters
  if (filter.query && filter.query.trim()) {
    conditions.push("(e.normalized_name LIKE ? OR e.name LIKE ?)");
    const norm = `%${normalizeExerciseName(filter.query)}%`;
    const raw = `%${filter.query.trim()}%`;
    params.push(norm, raw);
  }

  if (filter.muscleGroup && filter.muscleGroup.trim()) {
    conditions.push("e.muscle_group_primary = ?");
    params.push(filter.muscleGroup.trim());
  }

  if (filter.equipment && filter.equipment.trim()) {
    conditions.push("e.equipment = ?");
    params.push(filter.equipment.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Total count
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM exercises e ${whereClause};`,
      params
    );
    const total = Number(countRows[0]?.total) || 0;
    const totalPages = Math.ceil(total / pageSize);

    if (total === 0) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // 2. Paginated rows
    const queryParams = [...params, pageSize, offset];
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        e.id,
        e.public_id,
        e.scope,
        e.visibility,
        c.public_id AS consultancy_public_id,
        e.name,
        e.normalized_name,
        e.description,
        e.muscle_group_primary,
        e.muscle_groups_secondary,
        e.equipment,
        e.movement_pattern,
        e.difficulty_level,
        e.instructions,
        e.execution_tips,
        e.common_mistakes,
        e.progressions,
        e.regressions,
        e.rights_notes,
        e.status,
        e.created_at,
        e.updated_at
      FROM exercises e
      LEFT JOIN consultancies c ON c.id = e.consultancy_id
      ${whereClause}
      ORDER BY e.scope ASC, e.name ASC
      LIMIT ? OFFSET ?;`,
      queryParams
    );

    const items: ExerciseItemDto[] = rows.map((r) => ({
      publicId: String(r.public_id),
      scope: r.scope as ExerciseScope,
      visibility: r.visibility as ExerciseVisibility,
      consultancyPublicId: r.consultancy_public_id ? String(r.consultancy_public_id) : null,
      name: String(r.name),
      normalizedName: String(r.normalized_name),
      description: r.description ? String(r.description) : null,
      muscleGroupPrimary: String(r.muscle_group_primary),
      muscleGroupsSecondary: r.muscle_groups_secondary
        ? typeof r.muscle_groups_secondary === "string"
          ? JSON.parse(r.muscle_groups_secondary)
          : r.muscle_groups_secondary
        : null,
      equipment: String(r.equipment),
      movementPattern: r.movement_pattern ? String(r.movement_pattern) : null,
      difficultyLevel: String(r.difficulty_level),
      instructions: r.instructions ? String(r.instructions) : null,
      executionTips: r.execution_tips ? String(r.execution_tips) : null,
      commonMistakes: r.common_mistakes ? String(r.common_mistakes) : null,
      progressions: r.progressions ? String(r.progressions) : null,
      regressions: r.regressions ? String(r.regressions) : null,
      rightsNotes: r.rights_notes ? String(r.rights_notes) : null,
      status: r.status as ExerciseStatus,
      media: [], // Media is loaded lazily or on single item fetch
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));

    return { items, total, page, pageSize, totalPages };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Gets a single exercise by id or public_id, verifying caller access and attaching media.
 */
export async function getExerciseByIdOrPublicId(
  ctx: TrainingAccessContext,
  identifier: { id?: number; publicId?: string }
): Promise<ExerciseItemDto | null> {
  const { id, publicId } = identifier;
  if (!id && !publicId) return null;

  let connection;
  try {
    connection = await getDbConnection();
    const queryCol = id !== undefined ? "e.id = ?" : "e.public_id = ?";
    const queryVal = id !== undefined ? id : publicId!;

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        e.id,
        e.public_id,
        e.scope,
        e.visibility,
        e.consultancy_id,
        c.public_id AS consultancy_public_id,
        e.created_by_membership_id,
        e.name,
        e.normalized_name,
        e.description,
        e.muscle_group_primary,
        e.muscle_groups_secondary,
        e.equipment,
        e.movement_pattern,
        e.difficulty_level,
        e.instructions,
        e.execution_tips,
        e.common_mistakes,
        e.progressions,
        e.regressions,
        e.rights_notes,
        e.status,
        e.created_at,
        e.updated_at
      FROM exercises e
      LEFT JOIN consultancies c ON c.id = e.consultancy_id
      WHERE ${queryCol} AND e.deleted_at IS NULL
      LIMIT 1;`,
      [queryVal]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];

    // Authorization verification
    if (r.scope === "GLOBAL") {
      if (r.status !== "PUBLISHED" && !ctx.isPlatformAdmin) {
        return null;
      }
    } else if (r.scope === "CONSULTANCY") {
      if (!ctx.consultancyId || Number(r.consultancy_id) !== ctx.consultancyId) {
        // Strict cross-tenant rejection
        return null;
      }
      if (r.visibility === "CREATOR_ONLY") {
        const isCreator = ctx.membershipId && Number(r.created_by_membership_id) === ctx.membershipId;
        if (!isCreator && !ctx.canManageConsultancy) {
          // Creator-only isolation
          return null;
        }
      }
    }

    // Fetch attached media
    const [mediaRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        em.role,
        em.sort_order,
        ma.public_id AS media_public_id,
        ma.scope,
        ma.visibility,
        ma.media_type,
        ma.storage_provider,
        ma.mime_type,
        ma.file_size_bytes,
        ma.duration_seconds,
        ma.width,
        ma.height,
        ma.created_at
      FROM exercise_media em
      INNER JOIN media_assets ma ON ma.id = em.media_asset_id
      WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
      ORDER BY em.sort_order ASC;`,
      [r.id]
    );

    const media: ExerciseMediaDto[] = mediaRows.map((m) => ({
      role: m.role as MediaRole,
      sortOrder: Number(m.sort_order),
      mediaAsset: {
        publicId: String(m.media_public_id),
        scope: m.scope,
        visibility: m.visibility,
        consultancyPublicId: r.consultancy_public_id ? String(r.consultancy_public_id) : null,
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
      publicId: String(r.public_id),
      scope: r.scope as ExerciseScope,
      visibility: r.visibility as ExerciseVisibility,
      consultancyPublicId: r.consultancy_public_id ? String(r.consultancy_public_id) : null,
      name: String(r.name),
      normalizedName: String(r.normalized_name),
      description: r.description ? String(r.description) : null,
      muscleGroupPrimary: String(r.muscle_group_primary),
      muscleGroupsSecondary: r.muscle_groups_secondary
        ? typeof r.muscle_groups_secondary === "string"
          ? JSON.parse(r.muscle_groups_secondary)
          : r.muscle_groups_secondary
        : null,
      equipment: String(r.equipment),
      movementPattern: r.movement_pattern ? String(r.movement_pattern) : null,
      difficultyLevel: String(r.difficulty_level),
      instructions: r.instructions ? String(r.instructions) : null,
      executionTips: r.execution_tips ? String(r.execution_tips) : null,
      commonMistakes: r.common_mistakes ? String(r.common_mistakes) : null,
      progressions: r.progressions ? String(r.progressions) : null,
      regressions: r.regressions ? String(r.regressions) : null,
      rightsNotes: r.rights_notes ? String(r.rights_notes) : null,
      status: r.status as ExerciseStatus,
      media,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Creates a Global exercise (Platform Admin only).
 */
export async function createGlobalExercise(
  ctx: TrainingAccessContext,
  input: CreateExerciseInput
): Promise<ExerciseItemDto> {
  assertCanManageGlobal(ctx);

  const publicId = crypto.randomUUID();
  const normalizedName = normalizeExerciseName(input.name);
  const secondaryJson = input.muscleGroupsSecondary ? JSON.stringify(input.muscleGroupsSecondary) : null;
  const status = input.status || "PUBLISHED";

  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO exercises (
        public_id, scope, consultancy_id, visibility, created_by_user_id, created_by_membership_id,
        name, normalized_name, description, muscle_group_primary, muscle_groups_secondary,
        equipment, movement_pattern, difficulty_level, instructions, execution_tips,
        common_mistakes, progressions, regressions, rights_notes, status
      ) VALUES (?, 'GLOBAL', NULL, 'GLOBAL', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        publicId,
        ctx.userId,
        input.name.trim(),
        normalizedName,
        input.description?.trim() || null,
        input.muscleGroupPrimary.trim(),
        secondaryJson,
        input.equipment.trim(),
        input.movementPattern || null,
        input.difficultyLevel || "INTERMEDIATE",
        input.instructions?.trim() || null,
        input.executionTips?.trim() || null,
        input.commonMistakes?.trim() || null,
        input.progressions?.trim() || null,
        input.regressions?.trim() || null,
        input.rightsNotes?.trim() || null,
        status,
      ]
    );

    const created = await getExerciseByIdOrPublicId(ctx, { publicId });
    if (!created) throw new Error("Falha ao recuperar exercício global criado.");
    return created;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Creates a Consultancy exercise (Personal Trainer or Consultancy Admin).
 */
export async function createConsultancyExercise(
  ctx: TrainingAccessContext,
  input: CreateExerciseInput
): Promise<ExerciseItemDto> {
  assertCanAuthorTraining(ctx);

  const publicId = crypto.randomUUID();
  const normalizedName = normalizeExerciseName(input.name);
  const secondaryJson = input.muscleGroupsSecondary ? JSON.stringify(input.muscleGroupsSecondary) : null;
  const visibility = input.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY";
  const status = input.status || "PUBLISHED";

  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO exercises (
        public_id, scope, consultancy_id, visibility, created_by_user_id, created_by_membership_id,
        name, normalized_name, description, muscle_group_primary, muscle_groups_secondary,
        equipment, movement_pattern, difficulty_level, instructions, execution_tips,
        common_mistakes, progressions, regressions, rights_notes, status
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        publicId,
        ctx.consultancyId!,
        visibility,
        ctx.userId,
        ctx.membershipId!,
        input.name.trim(),
        normalizedName,
        input.description?.trim() || null,
        input.muscleGroupPrimary.trim(),
        secondaryJson,
        input.equipment.trim(),
        input.movementPattern || null,
        input.difficultyLevel || "INTERMEDIATE",
        input.instructions?.trim() || null,
        input.executionTips?.trim() || null,
        input.commonMistakes?.trim() || null,
        input.progressions?.trim() || null,
        input.regressions?.trim() || null,
        input.rightsNotes?.trim() || null,
        status,
      ]
    );

    const created = await getExerciseByIdOrPublicId(ctx, { publicId });
    if (!created) throw new Error("Falha ao recuperar exercício de consultoria criado.");
    return created;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Updates an exercise, enforcing tenant isolation and ownership rules.
 */
export async function updateExercise(
  ctx: TrainingAccessContext,
  publicId: string,
  input: UpdateExerciseInput
): Promise<ExerciseItemDto> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id, visibility FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [publicId]
    );
    if (!rows || rows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const ex = rows[0];

    if (ex.scope === "GLOBAL") {
      assertCanManageGlobal(ctx);
    } else if (ex.scope === "CONSULTANCY") {
      assertCanAuthorTraining(ctx);
      if (Number(ex.consultancy_id) !== ctx.consultancyId) {
        throw new TrainingAuthorizationError("Exercício não encontrado nesta consultoria.", "NOT_FOUND", 404);
      }
      const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
      if (!isCreator && !ctx.canManageConsultancy) {
        throw new TrainingAuthorizationError("Apenas o autor ou administrador podem editar este exercício.", "FORBIDDEN", 403);
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?", "normalized_name = ?");
      values.push(input.name.trim(), normalizeExerciseName(input.name));
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description?.trim() || null);
    }
    if (input.muscleGroupPrimary !== undefined) {
      updates.push("muscle_group_primary = ?");
      values.push(input.muscleGroupPrimary.trim());
    }
    if (input.muscleGroupsSecondary !== undefined) {
      updates.push("muscle_groups_secondary = ?");
      values.push(input.muscleGroupsSecondary ? JSON.stringify(input.muscleGroupsSecondary) : null);
    }
    if (input.equipment !== undefined) {
      updates.push("equipment = ?");
      values.push(input.equipment.trim());
    }
    if (input.movementPattern !== undefined) {
      updates.push("movement_pattern = ?");
      values.push(input.movementPattern || null);
    }
    if (input.difficultyLevel !== undefined) {
      updates.push("difficulty_level = ?");
      values.push(input.difficultyLevel || "INTERMEDIATE");
    }
    if (input.instructions !== undefined) {
      updates.push("instructions = ?");
      values.push(input.instructions?.trim() || null);
    }
    if (input.executionTips !== undefined) {
      updates.push("execution_tips = ?");
      values.push(input.executionTips?.trim() || null);
    }
    if (input.commonMistakes !== undefined) {
      updates.push("common_mistakes = ?");
      values.push(input.commonMistakes?.trim() || null);
    }
    if (input.progressions !== undefined) {
      updates.push("progressions = ?");
      values.push(input.progressions?.trim() || null);
    }
    if (input.regressions !== undefined) {
      updates.push("regressions = ?");
      values.push(input.regressions?.trim() || null);
    }
    if (input.rightsNotes !== undefined) {
      updates.push("rights_notes = ?");
      values.push(input.rightsNotes?.trim() || null);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (updates.length === 0) {
      const current = await getExerciseByIdOrPublicId(ctx, { publicId });
      return current!;
    }

    values.push(ex.id);
    await connection.execute<ResultSetHeader>(
      `UPDATE exercises SET ${updates.join(", ")}, updated_at = NOW(3) WHERE id = ?;`,
      values
    );

    const updated = await getExerciseByIdOrPublicId(ctx, { publicId });
    return updated!;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Changes visibility between CREATOR_ONLY and CONSULTANCY.
 * Validates media compatibility before sharing.
 */
export async function changeExerciseVisibility(
  ctx: TrainingAccessContext,
  publicId: string,
  newVisibility: "CREATOR_ONLY" | "CONSULTANCY"
): Promise<ExerciseItemDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id, visibility FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [publicId]
    );
    if (!rows || rows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const ex = rows[0];

    if (ex.scope !== "CONSULTANCY" || Number(ex.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Operação inválida para este exercício.", "FORBIDDEN", 403);
    }

    const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
    if (!isCreator && !ctx.canManageConsultancy) {
      throw new TrainingAuthorizationError("Apenas o autor ou administrador podem alterar a visibilidade.", "FORBIDDEN", 403);
    }

    if (newVisibility === "CONSULTANCY") {
      // Check attached media: if any attached media is CREATOR_ONLY, reject to prevent broken shared exercises
      const [mediaRows] = await connection.execute<RowDataPacket[]>(
        `SELECT ma.id, ma.visibility
         FROM exercise_media em
         INNER JOIN media_assets ma ON ma.id = em.media_asset_id
         WHERE em.exercise_id = ? AND ma.visibility = 'CREATOR_ONLY';`,
        [ex.id]
      );
      if (Array.isArray(mediaRows) && mediaRows.length > 0) {
        throw new TrainingAuthorizationError(
          "Não é possível compartilhar este exercício com a consultoria enquanto houver mídias de visibilidade privada (CREATOR_ONLY) vinculadas.",
          "INCOMPATIBLE_MEDIA_VISIBILITY",
          400
        );
      }
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE exercises SET visibility = ?, updated_at = NOW(3) WHERE id = ?;`,
      [newVisibility, ex.id]
    );

    const updated = await getExerciseByIdOrPublicId(ctx, { publicId });
    return updated!;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Archives an exercise (soft archive: sets status = 'ARCHIVED', deleted_at = NOW()).
 * Never hard-deletes.
 */
export async function archiveExercise(
  ctx: TrainingAccessContext,
  publicId: string
): Promise<boolean> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [publicId]
    );
    if (!rows || rows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const ex = rows[0];

    if (ex.scope === "GLOBAL") {
      assertCanManageGlobal(ctx);
    } else if (ex.scope === "CONSULTANCY") {
      assertCanAuthorTraining(ctx);
      if (Number(ex.consultancy_id) !== ctx.consultancyId) {
        throw new TrainingAuthorizationError("Exercício não encontrado nesta consultoria.", "NOT_FOUND", 404);
      }
      const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
      if (!isCreator && !ctx.canManageConsultancy) {
        throw new TrainingAuthorizationError("Apenas o autor ou administrador podem arquivar este exercício.", "FORBIDDEN", 403);
      }
    }

    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE exercises SET status = 'ARCHIVED', deleted_at = NOW(3), updated_at = NOW(3) WHERE id = ?;`,
      [ex.id]
    );
    return res.affectedRows === 1;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
