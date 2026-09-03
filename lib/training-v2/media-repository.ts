/**
 * TREVO ONE — TRAINING V2 MEDIA REPOSITORY
 * Metadata operations and authorization rules for exercise media and pinned workout version media.
 * Does NOT perform physical file storage, Range streaming, or upload processing.
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
  MediaAssetDto,
  MediaScope,
  MediaVisibility,
  MediaType,
  MediaRole,
  StorageProvider,
} from "./types";

export type RegisterMediaAssetInput = {
  scope: MediaScope;
  visibility: MediaVisibility;
  mediaType: MediaType;
  storageProvider?: StorageProvider;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
};

export type MediaAccessAuthorizationResult = {
  authorized: boolean;
  reason?: string;
  mediaAsset?: MediaAssetDto;
};

/**
 * Registers metadata for an uploaded media asset (Platform Admin for Global, Coach for Consultancy).
 */
export async function registerMediaAsset(
  ctx: TrainingAccessContext,
  input: RegisterMediaAssetInput
): Promise<MediaAssetDto> {
  let consultancyId: number | null = null;
  let membershipId: number | null = null;

  if (input.scope === "GLOBAL") {
    assertCanManageGlobal(ctx);
    if (input.visibility !== "GLOBAL") {
      throw new TrainingAuthorizationError("Mídias de escopo GLOBAL devem possuir visibilidade GLOBAL.", "INVALID_VISIBILITY", 400);
    }
  } else if (input.scope === "CONSULTANCY") {
    assertCanAuthorTraining(ctx);
    consultancyId = ctx.consultancyId!;
    membershipId = ctx.membershipId!;
    if (input.visibility === "GLOBAL") {
      throw new TrainingAuthorizationError("Mídias de consultoria não podem ter visibilidade GLOBAL.", "INVALID_VISIBILITY", 400);
    }
  }

  const publicId = crypto.randomUUID();
  const storageProvider = input.storageProvider || "HOSTINGER_LOCAL";

  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO media_assets (
        public_id, scope, visibility, consultancy_id, media_type, storage_provider,
        storage_key, mime_type, file_size_bytes, duration_seconds, width, height,
        created_by_user_id, created_by_membership_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        publicId,
        input.scope,
        input.visibility,
        consultancyId,
        input.mediaType,
        storageProvider,
        input.storageKey,
        input.mimeType,
        input.fileSizeBytes,
        input.durationSeconds ?? null,
        input.width ?? null,
        input.height ?? null,
        ctx.userId,
        membershipId,
      ]
    );

    const asset = await getMediaAssetByPublicId(ctx, publicId);
    if (!asset) throw new Error("Falha ao registrar ativo de mídia.");
    return asset;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Retrieves a media asset metadata by public_id, evaluating actor visibility.
 */
export async function getMediaAssetByPublicId(
  ctx: TrainingAccessContext,
  publicId: string
): Promise<MediaAssetDto | null> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ma.id,
        ma.public_id,
        ma.scope,
        ma.visibility,
        ma.consultancy_id,
        c.public_id AS consultancy_public_id,
        ma.created_by_membership_id,
        ma.media_type,
        ma.storage_provider,
        ma.mime_type,
        ma.file_size_bytes,
        ma.duration_seconds,
        ma.width,
        ma.height,
        ma.created_at
      FROM media_assets ma
      LEFT JOIN consultancies c ON c.id = ma.consultancy_id
      WHERE ma.public_id = ? AND ma.deleted_at IS NULL
      LIMIT 1;`,
      [publicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];

    // Authorization checks
    if (r.scope === "GLOBAL") {
      // Global media is accessible to platform admins and active consultancy professionals
      if (!ctx.isPlatformAdmin && !ctx.canAuthorTraining) {
        return null;
      }
    } else if (r.scope === "CONSULTANCY") {
      if (!ctx.consultancyId || Number(r.consultancy_id) !== ctx.consultancyId) {
        return null; // Cross-tenant isolation
      }
      if (r.visibility === "CREATOR_ONLY") {
        const isCreator = ctx.membershipId && Number(r.created_by_membership_id) === ctx.membershipId;
        if (!isCreator && !ctx.canManageConsultancy) {
          return null; // Creator-only isolation
        }
      }
    }

    return {
      publicId: String(r.public_id),
      scope: r.scope as MediaScope,
      visibility: r.visibility as MediaVisibility,
      consultancyPublicId: r.consultancy_public_id ? String(r.consultancy_public_id) : null,
      mediaType: r.media_type as MediaType,
      storageProvider: r.storage_provider as StorageProvider,
      mimeType: String(r.mime_type),
      fileSizeBytes: Number(r.file_size_bytes),
      durationSeconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
      width: r.width != null ? Number(r.width) : null,
      height: r.height != null ? Number(r.height) : null,
      createdAt: new Date(r.created_at),
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Authorizes playback/access for a media asset, with support for student assignment grants.
 * If assignmentPublicId is provided, grants access if the media asset is pinned to that student's assigned workout version.
 */
export async function authorizeMediaAssetAccess(
  ctx: TrainingAccessContext,
  assetPublicId: string,
  options?: { assignmentPublicId?: string }
): Promise<MediaAccessAuthorizationResult> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch the raw asset record
    const [assetRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ma.id,
        ma.public_id,
        ma.scope,
        ma.visibility,
        ma.consultancy_id,
        c.public_id AS consultancy_public_id,
        ma.created_by_membership_id,
        ma.media_type,
        ma.storage_provider,
        ma.mime_type,
        ma.file_size_bytes,
        ma.duration_seconds,
        ma.width,
        ma.height,
        ma.created_at
      FROM media_assets ma
      LEFT JOIN consultancies c ON c.id = ma.consultancy_id
      WHERE ma.public_id = ? AND ma.deleted_at IS NULL
      LIMIT 1;`,
      [assetPublicId]
    );

    if (!Array.isArray(assetRows) || assetRows.length === 0) {
      return { authorized: false, reason: "Mídia não encontrada." };
    }

    const r = assetRows[0];
    const mediaAsset: MediaAssetDto = {
      publicId: String(r.public_id),
      scope: r.scope as MediaScope,
      visibility: r.visibility as MediaVisibility,
      consultancyPublicId: r.consultancy_public_id ? String(r.consultancy_public_id) : null,
      mediaType: r.media_type as MediaType,
      storageProvider: r.storage_provider as StorageProvider,
      mimeType: String(r.mime_type),
      fileSizeBytes: Number(r.file_size_bytes),
      durationSeconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
      width: r.width != null ? Number(r.width) : null,
      height: r.height != null ? Number(r.height) : null,
      createdAt: new Date(r.created_at),
    };

    // 2. Student assignment grant check
    if (options?.assignmentPublicId) {
      const [assignRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wa.id,
          wa.consultancy_id,
          wa.student_membership_id,
          wa.workout_version_id
        FROM workout_assignments wa
        WHERE wa.public_id = ? AND wa.deleted_at IS NULL
        LIMIT 1;`,
        [options.assignmentPublicId]
      );

      if (Array.isArray(assignRows) && assignRows.length > 0) {
        const a = assignRows[0];
        const isStudentOwner = ctx.membershipId && Number(a.student_membership_id) === ctx.membershipId;
        const isConsultancyCoach = ctx.consultancyId && Number(a.consultancy_id) === ctx.consultancyId && ctx.canAuthorTraining;

        if (isStudentOwner || isConsultancyCoach) {
          // Check if this exact media_asset_id is pinned to any item in this assigned workout version
          const [pinnedRows] = await connection.execute<RowDataPacket[]>(
            `SELECT wbim.id
             FROM workout_block_item_media wbim
             INNER JOIN workout_block_items wbi ON wbi.id = wbim.block_item_id
             INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
             WHERE wb.workout_version_id = ? AND wbim.media_asset_id = ?
             LIMIT 1;`,
            [a.workout_version_id, r.id]
          );

          if (Array.isArray(pinnedRows) && pinnedRows.length > 0) {
            // Access granted through immutable assignment pin!
            return { authorized: true, mediaAsset };
          }
        }
      }
    }

    // 3. Fallback: ordinary library visibility for professionals/admins
    if (r.scope === "GLOBAL") {
      if (ctx.isPlatformAdmin || ctx.canAuthorTraining) {
        return { authorized: true, mediaAsset };
      }
      return { authorized: false, reason: "Acesso a mídias globais é restrito a profissionais autorizados ou prescrições ativas." };
    }

    if (r.scope === "CONSULTANCY") {
      if (!ctx.consultancyId || Number(r.consultancy_id) !== ctx.consultancyId) {
        return { authorized: false, reason: "Acesso negado: mídia de outra consultoria." };
      }
      if (r.visibility === "CREATOR_ONLY") {
        const isCreator = ctx.membershipId && Number(r.created_by_membership_id) === ctx.membershipId;
        if (isCreator || ctx.canManageConsultancy) {
          return { authorized: true, mediaAsset };
        }
        return { authorized: false, reason: "Mídia de visibilidade privada pertencente a outro profissional." };
      }
      return { authorized: true, mediaAsset };
    }

    return { authorized: false, reason: "Acesso não autorizado." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Attaches a media asset to an exercise with a specific role, validating compatibility rules.
 */
export async function attachMediaToExercise(
  ctx: TrainingAccessContext,
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole,
  sortOrder: number = 0
): Promise<void> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch exercise
    const [exRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, visibility, created_by_membership_id FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [exercisePublicId]
    );
    if (!exRows || exRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const ex = exRows[0];

    // 2. Fetch media
    const [maRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, visibility, created_by_membership_id FROM media_assets WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [mediaPublicId]
    );
    if (!maRows || maRows.length === 0) {
      throw new TrainingAuthorizationError("Ativo de mídia não encontrado.", "NOT_FOUND", 404);
    }
    const ma = maRows[0];

    // 3. Authorization & Compatibility Validation
    if (ex.scope === "GLOBAL") {
      assertCanManageGlobal(ctx);
      if (ma.scope !== "GLOBAL" || ma.visibility !== "GLOBAL") {
        throw new TrainingAuthorizationError(
          "Exercícios globais só podem vincular mídias globais com visibilidade GLOBAL.",
          "INCOMPATIBLE_MEDIA_SCOPE",
          400
        );
      }
    } else if (ex.scope === "CONSULTANCY") {
      assertCanAuthorTraining(ctx);
      if (Number(ex.consultancy_id) !== ctx.consultancyId || Number(ma.consultancy_id) !== ctx.consultancyId) {
        throw new TrainingAuthorizationError("Exercício e mídia devem pertencer à mesma consultoria.", "TENANT_MISMATCH", 403);
      }
      const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
      if (!isCreator && !ctx.canManageConsultancy) {
        throw new TrainingAuthorizationError("Sem permissão para modificar mídias deste exercício.", "FORBIDDEN", 403);
      }
      if (ex.visibility === "CONSULTANCY" && ma.visibility === "CREATOR_ONLY") {
        throw new TrainingAuthorizationError(
          "Não é permitido vincular mídia de visibilidade privada (CREATOR_ONLY) a um exercício compartilhado com a consultoria.",
          "INCOMPATIBLE_MEDIA_VISIBILITY",
          400
        );
      }
    }

    // 4. Upsert / Insert association
    await connection.execute<ResultSetHeader>(
      `INSERT INTO exercise_media (exercise_id, media_asset_id, role, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE media_asset_id = VALUES(media_asset_id);`,
      [ex.id, ma.id, role, sortOrder]
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Detaches a media asset from an exercise.
 */
export async function detachMediaFromExercise(
  ctx: TrainingAccessContext,
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<boolean> {
  let connection;
  try {
    connection = await getDbConnection();
    const [exRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id, created_by_membership_id FROM exercises WHERE public_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [exercisePublicId]
    );
    if (!exRows || exRows.length === 0) return false;
    const ex = exRows[0];

    if (ex.scope === "GLOBAL") {
      assertCanManageGlobal(ctx);
    } else {
      assertCanAuthorTraining(ctx);
      if (Number(ex.consultancy_id) !== ctx.consultancyId) return false;
      const isCreator = ctx.membershipId && Number(ex.created_by_membership_id) === ctx.membershipId;
      if (!isCreator && !ctx.canManageConsultancy) return false;
    }

    const [maRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM media_assets WHERE public_id = ? LIMIT 1;`,
      [mediaPublicId]
    );
    if (!maRows || maRows.length === 0) return false;
    const maId = maRows[0].id;

    const [res] = await connection.execute<ResultSetHeader>(
      `DELETE FROM exercise_media WHERE exercise_id = ? AND media_asset_id = ? AND role = ?;`,
      [ex.id, maId, role]
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Pins a media asset to a workout block item in an immutable draft version.
 */
export async function pinMediaToBlockItem(
  ctx: TrainingAccessContext,
  blockItemPublicId: string,
  mediaPublicId: string,
  role: MediaRole,
  sortOrder: number = 0
): Promise<void> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify block item parent version is DRAFT and belongs to ctx.consultancyId
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [blockItemPublicId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Item de treino não encontrado.", "NOT_FOUND", 404);
    }

    const item = itemRows[0];
    if (Number(item.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado ao treino de outra consultoria.", "FORBIDDEN", 403);
    }
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido modificar mídias de uma versão já publicada ou arquivada.", "IMMUTABLE_VERSION", 400);
    }

    // 2. Verify media asset access
    const mediaAuth = await authorizeMediaAssetAccess(ctx, mediaPublicId);
    if (!mediaAuth.authorized || !mediaAuth.mediaAsset) {
      throw new TrainingAuthorizationError(mediaAuth.reason || "Mídia inacessível para fixação.", "FORBIDDEN", 403);
    }

    const [maRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM media_assets WHERE public_id = ? LIMIT 1;`,
      [mediaPublicId]
    );
    const mediaAssetId = maRows[0].id;

    // 3. Insert or update pinned media
    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_block_item_media (block_item_id, media_asset_id, role, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE media_asset_id = VALUES(media_asset_id);`,
      [item.id, mediaAssetId, role, sortOrder]
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Unpins a media asset from a workout block item in DRAFT.
 */
export async function unpinMediaFromBlockItem(
  ctx: TrainingAccessContext,
  blockItemPublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wbi.id, wv.status, w.consultancy_id
       FROM workout_block_items wbi
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wbi.public_id = ?
       LIMIT 1;`,
      [blockItemPublicId]
    );

    if (!itemRows || itemRows.length === 0) return false;
    const item = itemRows[0];
    if (Number(item.consultancy_id) !== ctx.consultancyId) return false;
    if (item.status !== "DRAFT") {
      throw new TrainingAuthorizationError("Não é permitido alterar itens de versão já publicada.", "IMMUTABLE_VERSION", 400);
    }

    const [maRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM media_assets WHERE public_id = ? LIMIT 1;`,
      [mediaPublicId]
    );
    if (!maRows || maRows.length === 0) return false;

    const [res] = await connection.execute<ResultSetHeader>(
      `DELETE FROM workout_block_item_media WHERE block_item_id = ? AND media_asset_id = ? AND role = ?;`,
      [item.id, maRows[0].id, role]
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
