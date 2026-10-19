/**
 * TREVO ONE — TRAINING V2 EXERCISE REPOSITORY
 * Unified catalog operations for Global and Consultancy exercises with tenant isolation.
 */

import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
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
import {
  rankExercises,
  tokenizeSearchText,
  normalizeSearchQuery,
  getSearchExpansionTerms,
} from "./exercise-search";

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
  aliases?: string[] | null;
};

export type UpdateExerciseInput = Partial<CreateExerciseInput>;

function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


async function loadMediaForExerciseIds(
  connection: PoolConnection,
  exerciseIds: number[]
): Promise<Map<number, ExerciseMediaDto[]>> {
  const mediaByExerciseId = new Map<number, ExerciseMediaDto[]>();
  if (exerciseIds.length === 0) return mediaByExerciseId;

  const [mediaRows] = await connection.query<RowDataPacket[]>(
    `SELECT
      em.exercise_id,
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
      ma.created_at,
      c.public_id AS consultancy_public_id
    FROM exercise_media em
    INNER JOIN media_assets ma ON ma.id = em.media_asset_id
    LEFT JOIN consultancies c ON c.id = ma.consultancy_id
    WHERE em.exercise_id IN (?) AND ma.deleted_at IS NULL
    ORDER BY em.sort_order ASC;`,
    [exerciseIds]
  );

  for (const m of mediaRows) {
    const exId = Number(m.exercise_id);
    const list = mediaByExerciseId.get(exId) || [];
    list.push({
      role: m.role as MediaRole,
      sortOrder: Number(m.sort_order),
      mediaAsset: {
        publicId: String(m.media_public_id),
        scope: m.scope,
        visibility: m.visibility,
        consultancyPublicId: m.consultancy_public_id ? String(m.consultancy_public_id) : null,
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
    mediaByExerciseId.set(exId, list);
  }

  return mediaByExerciseId;
}

async function loadAliasesForExerciseIds(
  connection: PoolConnection,
  exerciseIds: number[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (exerciseIds.length === 0) return map;
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT e.public_id, ea.alias
       FROM exercise_aliases ea
       INNER JOIN exercises e ON e.id = ea.exercise_id
       WHERE ea.exercise_id IN (?)`,
      [exerciseIds]
    );
    for (const r of rows) {
      const pubId = String(r.public_id);
      const list = map.get(pubId) || [];
      list.push(String(r.alias));
      map.set(pubId, list);
    }
  } catch {
    // If table doesn't exist yet, gracefully return empty map
  }
  return map;
}

/**
 * Synchronizes custom search aliases for an exercise in exercise_aliases table.
 */
export async function syncExerciseAliases(
  connection: PoolConnection,
  exerciseId: number,
  aliases: string[],
  scope: ExerciseScope,
  consultancyId: number | null
): Promise<void> {
  try {
    await connection.execute(`DELETE FROM exercise_aliases WHERE exercise_id = ?`, [exerciseId]);

    const trimmed = Array.from(
      new Set(
        aliases
          .map((a) => (typeof a === "string" ? a.trim() : ""))
          .filter(Boolean)
      )
    );

    for (const alias of trimmed) {
      const norm = normalizeSearchQuery(alias);
      if (norm) {
        await connection.execute(
          `INSERT INTO exercise_aliases (exercise_id, alias, normalized_alias, scope, consultancy_id)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE updated_at = NOW(3)`,
          [exerciseId, alias, norm, scope, consultancyId]
        );
      }
    }
  } catch (err) {
    // If table doesn't exist yet, gracefully catch without breaking primary exercise save
    console.warn("syncExerciseAliases warning (table may not exist yet):", err);
  }
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

  const hasQuery = Boolean(filter.query && filter.query.trim());

  if (hasQuery) {
    const rawQ = filter.query!.trim();
    const normQ = normalizeSearchQuery(rawQ);
    const tokens = tokenizeSearchText(normQ);
    const expansions = getSearchExpansionTerms(rawQ);

    const orClauses: string[] = [
      "e.normalized_name LIKE ?",
      "e.name LIKE ?",
      "e.equipment LIKE ?",
      "e.muscle_group_primary LIKE ?",
    ];
    params.push(`%${normQ}%`, `%${rawQ}%`, `%${rawQ}%`, `%${rawQ}%`);

    for (const t of tokens) {
      if (t.length >= 3) {
        orClauses.push("e.normalized_name LIKE ?");
        params.push(`%${t}%`);
        if (t.length >= 4) {
          orClauses.push("e.normalized_name LIKE ?");
          params.push(`%${t.slice(0, 3)}%`);
        }
      }
    }

    // Expand through popular fitness nicknames & canonical forms
    for (const exp of expansions) {
      orClauses.push("e.normalized_name LIKE ?");
      params.push(`%${exp}%`);
    }

    // Match exercise_aliases table via EXISTS
    orClauses.push(`EXISTS (
      SELECT 1 FROM exercise_aliases ea 
      WHERE ea.exercise_id = e.id AND (ea.normalized_alias LIKE ? OR ea.alias LIKE ?)
    )`);
    params.push(`%${normQ}%`, `%${rawQ}%`);

    for (const exp of expansions) {
      orClauses.push(`EXISTS (
        SELECT 1 FROM exercise_aliases ea 
        WHERE ea.exercise_id = e.id AND (ea.normalized_alias LIKE ? OR ea.alias LIKE ?)
      )`);
      params.push(`%${exp}%`, `%${exp}%`);
    }

    conditions.push(`(${orClauses.join(" OR ")})`);
  }

  if (filter.muscleGroup && filter.muscleGroup.trim() && filter.muscleGroup !== "Todos os Músculos") {
    conditions.push("e.muscle_group_primary = ?");
    params.push(filter.muscleGroup.trim());
  }

  if (filter.equipment && filter.equipment.trim() && filter.equipment !== "Todos os Equipamentos") {
    conditions.push("e.equipment = ?");
    params.push(filter.equipment.trim());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let connection;
  try {
    connection = await getDbConnection();

    if (hasQuery) {
      // 1. Fetch candidate matches across entire authorized catalog
      let candidateRows: RowDataPacket[] = [];
      try {
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
          LIMIT 500;`,
          params
        );
        candidateRows = rows;
      } catch {
        // Fallback without exercise_aliases table if not created yet
        const fallbackConditions = conditions.filter((c) => !c.includes("EXISTS"));
        const fallbackWhere = fallbackConditions.length > 0 ? `WHERE ${fallbackConditions.join(" AND ")}` : "";
        const fallbackParams = params.slice(0, -2); // remove 2 params from EXISTS
        const [fallbackRows] = await connection.execute<RowDataPacket[]>(
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
          ${fallbackWhere}
          ORDER BY e.scope ASC, e.name ASC
          LIMIT 500;`,
          fallbackParams
        );
        candidateRows = fallbackRows;
      }

      if (candidateRows.length === 0) {
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      }

      // Convert rows to Dto without media for quick ranking
      const candidateDtos: ExerciseItemDto[] = candidateRows.map((r) => ({
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
        media: [],
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));

      // Load aliases for candidates
      const candidateDbIds = candidateRows.map((r) => Number(r.id));
      const aliasesMap = await loadAliasesForExerciseIds(connection, candidateDbIds);

      // Score and rank using deterministic multi-tier ranking engine
      const ranked = rankExercises(candidateDtos, filter.query!, aliasesMap);
      const total = ranked.length;
      const totalPages = Math.ceil(total / pageSize);

      if (total === 0) {
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      }

      const pagedRanked = ranked.slice(offset, offset + pageSize);
      const idByPublicId = new Map(candidateRows.map((r) => [String(r.public_id), Number(r.id)]));
      const pagedDbIds = pagedRanked
        .map((r) => idByPublicId.get(r.exercise.publicId))
        .filter((id): id is number => typeof id === "number");

      // Batch load attached media for the paged results only
      const mediaByExerciseId = await loadMediaForExerciseIds(connection, pagedDbIds);

      const items: ExerciseItemDto[] = pagedRanked.map((r) => {
        const dbId = idByPublicId.get(r.exercise.publicId);
        return {
          ...r.exercise,
          media: (dbId ? mediaByExerciseId.get(dbId) : []) || [],
          matchedAlias: r.matchedAlias,
          matchReason: r.matchReason,
        };
      });

      return { items, total, page, pageSize, totalPages };
    }

    // Standard Non-Query Flow: exact count and LIMIT/OFFSET
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM exercises e ${whereClause};`,
      params
    );
    const total = Number(countRows[0]?.total) || 0;
    const totalPages = Math.ceil(total / pageSize);

    if (total === 0) {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }

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

    const exerciseIds = rows.map((r) => Number(r.id));
    const mediaByExerciseId = await loadMediaForExerciseIds(connection, exerciseIds);

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
      media: mediaByExerciseId.get(Number(r.id)) || [],
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

    let aliases: string[] = [];
    try {
      const [aliasRows] = await connection.execute<RowDataPacket[]>(
        `SELECT alias FROM exercise_aliases WHERE exercise_id = ? ORDER BY id ASC`,
        [r.id]
      );
      if (Array.isArray(aliasRows)) {
        aliases = aliasRows.map((a) => String(a.alias));
      }
    } catch {
      // Table may not exist yet or no aliases
    }

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
      aliases,
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
 * Canonical validator for exercise taxonomy fields (muscle_group_primary and equipment).
 * Enforces non-empty, logical trim, and MySQL VARCHAR(100) length boundary.
 */
export function validateTaxonomyLength(
  muscleGroupPrimary?: string | null,
  equipment?: string | null
): void {
  if (muscleGroupPrimary !== undefined && muscleGroupPrimary !== null) {
    const trimmed = muscleGroupPrimary.trim();
    if (!trimmed) {
      throw new TrainingAuthorizationError(
        "O grupo muscular principal é obrigatório.",
        "VALIDATION_FAILED",
        400
      );
    }
    if (trimmed.length > 100) {
      throw new TrainingAuthorizationError(
        "O grupo muscular principal não pode exceder 100 caracteres.",
        "VALIDATION_FAILED",
        400
      );
    }
  }

  if (equipment !== undefined && equipment !== null) {
    const trimmed = equipment.trim();
    if (!trimmed) {
      throw new TrainingAuthorizationError(
        "O equipamento é obrigatório.",
        "VALIDATION_FAILED",
        400
      );
    }
    if (trimmed.length > 100) {
      throw new TrainingAuthorizationError(
        "O equipamento não pode exceder 100 caracteres.",
        "VALIDATION_FAILED",
        400
      );
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
  validateTaxonomyLength(input.muscleGroupPrimary, input.equipment);

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
  validateTaxonomyLength(input.muscleGroupPrimary, input.equipment);

  const publicId = crypto.randomUUID();
  const normalizedName = normalizeExerciseName(input.name);
  const secondaryJson = input.muscleGroupsSecondary ? JSON.stringify(input.muscleGroupsSecondary) : null;
  const visibility = input.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY";
  const status = input.status || "PUBLISHED";

  let connection;
  try {
    connection = await getDbConnection();
    const [insertResult] = await connection.execute<ResultSetHeader>(
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

    const exerciseId = insertResult.insertId;
    if (input.aliases && Array.isArray(input.aliases)) {
      await syncExerciseAliases(connection, exerciseId, input.aliases, "CONSULTANCY", ctx.consultancyId!);
    }

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

    if (input.muscleGroupPrimary !== undefined || input.equipment !== undefined) {
      validateTaxonomyLength(input.muscleGroupPrimary, input.equipment);
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

    if (updates.length > 0) {
      values.push(ex.id);
      await connection.execute<ResultSetHeader>(
        `UPDATE exercises SET ${updates.join(", ")}, updated_at = NOW(3) WHERE id = ?;`,
        values
      );
    }

    if (input.aliases !== undefined && Array.isArray(input.aliases)) {
      await syncExerciseAliases(
        connection,
        Number(ex.id),
        input.aliases,
        ex.scope as ExerciseScope,
        ex.consultancy_id ? Number(ex.consultancy_id) : null
      );
    }

    const updated = await getExerciseByIdOrPublicId(ctx, { publicId });
    return updated!;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type ChangeExerciseVisibilityOptions = {
  promoteAttachedMedia?: boolean;
};

/**
 * Changes visibility between CREATOR_ONLY and CONSULTANCY atomically.
 * When promoting to CONSULTANCY:
 * - Locks exercise and attached media assets deterministically.
 * - Validates actor permissions, tenancy, and media compatibility.
 * - Promotes private attached media to CONSULTANCY if requested.
 * - Changes exercise visibility to CONSULTANCY.
 * - Rolls back entirely on any error, ensuring no partial state.
 */
export async function changeExerciseVisibility(
  ctx: TrainingAccessContext,
  publicId: string,
  newVisibility: "CREATOR_ONLY" | "CONSULTANCY",
  options?: ChangeExerciseVisibilityOptions
): Promise<ExerciseItemDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Fetch and row-lock exercise
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id, visibility, status
       FROM exercises
       WHERE public_id = ? AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
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
      // 2. Fetch and lock attached media assets in deterministic order (by id ASC)
      const [mediaRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           em.id AS em_id,
           em.role,
           em.sort_order,
           ma.id AS ma_id,
           ma.public_id AS ma_public_id,
           ma.scope AS ma_scope,
           ma.visibility AS ma_visibility,
           ma.consultancy_id AS ma_consultancy_id,
           ma.created_by_membership_id AS ma_created_by_membership_id,
           ma.media_type AS ma_media_type
         FROM exercise_media em
         INNER JOIN media_assets ma ON ma.id = em.media_asset_id
         WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
         ORDER BY ma.id ASC
         FOR UPDATE;`,
        [ex.id]
      );

      const attachedMedia = Array.isArray(mediaRows) ? mediaRows : [];

      // Validate tenancy and role <-> media_type compatibility
      for (const item of attachedMedia) {
        if (item.ma_scope !== "CONSULTANCY" || Number(item.ma_consultancy_id) !== ctx.consultancyId) {
          throw new TrainingAuthorizationError(
            "Mídia vinculada inválida ou de outra consultoria.",
            "TENANT_MISMATCH",
            403
          );
        }

        if (
          (item.role === "START_IMAGE" || item.role === "VIDEO_POSTER" || item.role === "ALTERNATE_IMAGE") &&
          item.ma_media_type !== "IMAGE"
        ) {
          throw new TrainingAuthorizationError(
            "Apenas ativos de imagem podem ser vinculados para esta função de mídia.",
            "INCOMPATIBLE_MEDIA_ROLE_TYPE",
            400
          );
        }

        if (
          (item.role === "EXECUTION_VIDEO" || item.role === "ALTERNATE_VIDEO") &&
          item.ma_media_type !== "VIDEO"
        ) {
          throw new TrainingAuthorizationError(
            "Apenas ativos de vídeo podem ser vinculados para esta função de mídia.",
            "INCOMPATIBLE_MEDIA_ROLE_TYPE",
            400
          );
        }
      }

      // 3. Find attached media requiring promotion (CREATOR_ONLY)
      const mediaNeedingPromotion = attachedMedia.filter((m) => m.ma_visibility === "CREATOR_ONLY");

      if (mediaNeedingPromotion.length > 0) {
        // Validate promotion authorization for each asset: must be creator or consultancy admin
        for (const item of mediaNeedingPromotion) {
          const isMediaCreator =
            ctx.membershipId && Number(item.ma_created_by_membership_id) === ctx.membershipId;
          if (!isMediaCreator && !ctx.canManageConsultancy) {
            throw new TrainingAuthorizationError(
              "Apenas o autor ou administrador da consultoria podem compartilhar esta mídia vinculada.",
              "FORBIDDEN",
              403
            );
          }
        }

        if (!options?.promoteAttachedMedia) {
          throw new TrainingAuthorizationError(
            "Para compartilhar este exercício, as mídias privadas vinculadas também precisam ser compartilhadas com a consultoria.",
            "REQUIRES_MEDIA_PROMOTION",
            400
          );
        }

        // Atomically promote all required media assets in this transaction
        const mediaIdsToPromote = mediaNeedingPromotion.map((m) => m.ma_id);
        await connection.query(
          `UPDATE media_assets SET visibility = 'CONSULTANCY', updated_at = NOW(3) WHERE id IN (?);`,
          [mediaIdsToPromote]
        );
      }

      // 4. Primary media safety check (Section 15):
      // If exercise is PUBLISHED, verify execution video is attached
      if (ex.status === "PUBLISHED") {
        const hasExecutionVideo = attachedMedia.some((m) => m.role === "EXECUTION_VIDEO");
        if (!hasExecutionVideo) {
          throw new TrainingAuthorizationError(
            "Exercício publicado requer vídeo de execução técnica.",
            "MISSING_REQUIRED_MEDIA",
            400
          );
        }
      }
    }

    // 5. Update exercise visibility
    await connection.execute<ResultSetHeader>(
      `UPDATE exercises SET visibility = ?, updated_at = NOW(3) WHERE id = ?;`,
      [newVisibility, ex.id]
    );

    await connection.commit();
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }

  const updated = await getExerciseByIdOrPublicId(ctx, { publicId });
  return updated!;
}

/**
 * Archives an exercise (soft archive: sets status = 'ARCHIVED', deleted_at = NOW(3)).
 * Never hard-deletes. Preserves tenant isolation, ownership and idempotency.
 */
export async function archiveExercise(
  ctx: TrainingAccessContext,
  publicId: string,
  expectedScope?: "GLOBAL" | "CONSULTANCY"
): Promise<boolean> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id, status, deleted_at FROM exercises WHERE public_id = ? LIMIT 1;`,
      [publicId]
    );
    if (!rows || rows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const ex = rows[0];

    if (expectedScope && ex.scope !== expectedScope) {
      throw new TrainingAuthorizationError(
        expectedScope === "CONSULTANCY"
          ? "Exercício não encontrado nesta consultoria."
          : "Exercício não encontrado no catálogo global.",
        "NOT_FOUND",
        404
      );
    }

    if (ex.scope === "GLOBAL") {
      assertCanManageGlobal(ctx);
    } else if (ex.scope === "CONSULTANCY") {
      assertCanAuthorTraining(ctx);
      if (Number(ex.consultancy_id) !== ctx.consultancyId) {
        throw new TrainingAuthorizationError("Exercício não encontrado nesta consultoria.", "NOT_FOUND", 404);
      }
      const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
      if (!isCreator && !ctx.canManageConsultancy) {
        throw new TrainingAuthorizationError("Apenas o autor ou administrador podem excluir este exercício.", "FORBIDDEN", 403);
      }
    } else {
      throw new TrainingAuthorizationError("Escopo de exercício inválido.", "BAD_REQUEST", 400);
    }

    // Idempotency: if already archived, return true safely without error
    if (ex.status === "ARCHIVED" || ex.deleted_at !== null) {
      return true;
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

// ============================================================================
// DYNAMIC EXERCISE TAXONOMY SUGGESTIONS
// ============================================================================

export const DEFAULT_SUGGESTED_MUSCLE_GROUPS: readonly string[] = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço / Pegada",
  "Quadríceps",
  "Posterior de Coxa",
  "Glúteos",
  "Adutores / Quadril",
  "Panturrilhas",
  "Abdômen / Core",
  "Lombar",
  "Corpo Inteiro",
  "Cardio",
  "Mobilidade",
  "Funcional",
  "Aquecimento",
] as const;

export const DEFAULT_SUGGESTED_EQUIPMENT: readonly string[] = [
  "Barra",
  "Halteres",
  "Peso Corporal",
  "Polia / Cabo",
  "Máquina",
  "Barra EZ",
  "Kettlebell",
  "Elástico / Faixa",
  "Banco",
  "Smith Machine",
  "Leg Press",
  "Hack Squat",
  "Esteira",
  "Bicicleta Ergométrica",
  "Elíptico",
  "Remo Ergométrico",
  "Escada Ergométrica",
  "Air Bike",
  "Corda",
  "Sled",
  "Medicine Ball",
  "Battle Rope",
  "Outro",
] as const;

/**
 * Retrieves distinct primary muscle groups (categories) from authorized exercises,
 * merged with default baseline suggestions and sorted alphabetically.
 */
export async function listExerciseMuscleGroups(
  ctx: TrainingAccessContext
): Promise<string[]> {
  const conditions: string[] = [
    "e.deleted_at IS NULL",
    "e.muscle_group_primary IS NOT NULL",
    "TRIM(e.muscle_group_primary) != ''",
  ];
  const params: (string | number)[] = [];

  if (ctx.isPlatformAdmin && !ctx.consultancyId) {
    conditions.push("e.scope = 'GLOBAL'");
  } else if (ctx.canAuthorTraining && ctx.consultancyId) {
    if (ctx.canManageConsultancy) {
      conditions.push(
        "((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED'))"
      );
      params.push(ctx.consultancyId);
    } else {
      conditions.push(
        "((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED' AND (e.visibility = 'CONSULTANCY' OR (e.visibility = 'CREATOR_ONLY' AND e.created_by_membership_id = ?))))"
      );
      params.push(ctx.consultancyId, ctx.membershipId!);
    }
  } else {
    // Unprivileged or student context: only global published
    conditions.push("e.scope = 'GLOBAL' AND e.status = 'PUBLISHED'");
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT TRIM(e.muscle_group_primary) AS val
       FROM exercises e
       WHERE ${conditions.join(" AND ")}
       ORDER BY val ASC;`,
      params
    );

    const fromDb = rows.map((r) => String(r.val).trim()).filter(Boolean);

    const set = new Set<string>();
    const result: string[] = [];

    const addVal = (val: string) => {
      const lower = val.toLowerCase();
      if (!set.has(lower)) {
        set.add(lower);
        result.push(val);
      }
    };

    fromDb.forEach(addVal);
    DEFAULT_SUGGESTED_MUSCLE_GROUPS.forEach(addVal);

    return result.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Retrieves distinct equipment from authorized exercises,
 * merged with default baseline suggestions and sorted alphabetically.
 */
export async function listExerciseEquipment(
  ctx: TrainingAccessContext
): Promise<string[]> {
  const conditions: string[] = [
    "e.deleted_at IS NULL",
    "e.equipment IS NOT NULL",
    "TRIM(e.equipment) != ''",
  ];
  const params: (string | number)[] = [];

  if (ctx.isPlatformAdmin && !ctx.consultancyId) {
    conditions.push("e.scope = 'GLOBAL'");
  } else if (ctx.canAuthorTraining && ctx.consultancyId) {
    if (ctx.canManageConsultancy) {
      conditions.push(
        "((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED'))"
      );
      params.push(ctx.consultancyId);
    } else {
      conditions.push(
        "((e.scope = 'GLOBAL' AND e.status = 'PUBLISHED') OR (e.scope = 'CONSULTANCY' AND e.consultancy_id = ? AND e.status != 'ARCHIVED' AND (e.visibility = 'CONSULTANCY' OR (e.visibility = 'CREATOR_ONLY' AND e.created_by_membership_id = ?))))"
      );
      params.push(ctx.consultancyId, ctx.membershipId!);
    }
  } else {
    conditions.push("e.scope = 'GLOBAL' AND e.status = 'PUBLISHED'");
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT TRIM(e.equipment) AS val
       FROM exercises e
       WHERE ${conditions.join(" AND ")}
       ORDER BY val ASC;`,
      params
    );

    const fromDb = rows.map((r) => String(r.val).trim()).filter(Boolean);

    const set = new Set<string>();
    const result: string[] = [];

    const addVal = (val: string) => {
      const lower = val.toLowerCase();
      if (!set.has(lower)) {
        set.add(lower);
        result.push(val);
      }
    };

    fromDb.forEach(addVal);
    DEFAULT_SUGGESTED_EQUIPMENT.forEach(addVal);

    return result.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
