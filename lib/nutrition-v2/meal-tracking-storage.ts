/**
 * TREVO ONE — NUTRITION V2 MEAL TRACKING STORAGE
 *
 * Etapa 12: Acompanhamento das Refeições
 *
 * - Private file storage under namespace 'nutrition-meal-tracking'.
 * - Automatic EXIF rotation and sanitization (strips GPS and private device metadata).
 * - Authoritative multi-tenancy and RBAC streaming.
 */

import {
  writePrivateFile,
  deletePrivateFile,
  readVerifiedPrivateFile,
} from "../storage/private-files";
import { validateMealPhotoBuffer } from "./meal-tracking-validation";
import { getDbConnection } from "../db/mysql";
import type { RowDataPacket } from "mysql2/promise";

export interface SaveMealPhotoResult {
  fileStorageKey: string;
  fileSha256: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Validates, rotates, sanitizes EXIF and stores a meal photo in private storage.
 */
export async function saveMealTrackingPhoto(
  buffer: Buffer,
  originalFileName: string,
  clientMimeType?: string
): Promise<SaveMealPhotoResult> {
  const { mimeType, extension } = validateMealPhotoBuffer(buffer, clientMimeType);

  let finalBuffer = buffer;
  try {
    const sharp = (await import("sharp")).default;
    // .rotate() auto-orients from EXIF orientation tag and strips EXIF tags (e.g. GPS coordinates)
    finalBuffer = await sharp(buffer).rotate().toBuffer();
  } catch {
    // Graceful fallback to verified original buffer if sharp fails
    finalBuffer = buffer;
  }

  const writeResult = await writePrivateFile({
    buffer: finalBuffer,
    extension,
    originalFileName,
    namespace: "nutrition-meal-tracking",
  });

  return {
    fileStorageKey: writeResult.fileStorageKey,
    fileSha256: writeResult.fileSha256,
    sizeBytes: writeResult.sizeBytes,
    mimeType,
  };
}

/**
 * Safely removes a private meal tracking photo.
 */
export async function deleteMealTrackingPhoto(fileStorageKey: string | null | undefined): Promise<void> {
  if (!fileStorageKey) return;
  try {
    await deletePrivateFile(fileStorageKey);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Authorizes and retrieves the verified private meal photo stream.
 * Access rules:
 * - Patient owner: ALLOW
 * - Consultancy nutritionist or admin: ALLOW
 * - Cross-tenant or unauthorized caller: DENY (403/404)
 */
export async function getMealTrackingPhotoStream(params: {
  userId: number;
  consultancySlug: string;
  logPublicId: string;
}): Promise<
  | { success: true; buffer: Buffer; mimeType: string }
  | { success: false; error: string; statusCode: number }
> {
  const connection = await getDbConnection();
  try {
    // 1. Resolve consultancy and caller memberships
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.consultancy_id, cm.role, c.slug, c.id AS tenant_id
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE c.slug = ? AND cm.user_id = ? AND cm.status = 'ACTIVE';`,
      [params.consultancySlug, params.userId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Acesso não autorizado à consultoria.", statusCode: 403 };
    }

    const tenancyId = Number(memberRows[0].tenant_id);
    const callerRoles = memberRows.map((r) => String(r.role));
    const callerMembershipIds = memberRows.map((r) => Number(r.membership_id));

    // 2. Fetch the meal tracking log under this tenancy
    const [logRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, student_membership_id,
              photo_storage_key, photo_sha256, photo_size_bytes, photo_mime_type
       FROM nutrition_v2_meal_tracking_logs
       WHERE consultancy_id = ? AND public_id = ? AND deleted_at IS NULL
       LIMIT 1;`,
      [tenancyId, params.logPublicId]
    );

    if (!Array.isArray(logRows) || logRows.length === 0) {
      return { success: false, error: "Registro de refeição não encontrado.", statusCode: 404 };
    }

    const log = logRows[0];
    if (!log.photo_storage_key) {
      return { success: false, error: "Esta refeição não possui foto anexada.", statusCode: 404 };
    }

    // 3. RBAC authorization
    const isStudentOwner = callerMembershipIds.includes(Number(log.student_membership_id));
    const isAuthorizedProfessional =
      callerRoles.includes("NUTRITIONIST") ||
      callerRoles.includes("CONSULTANCY_ADMIN") ||
      callerRoles.includes("PLATFORM_ADMIN");

    if (!isStudentOwner && !isAuthorizedProfessional) {
      return { success: false, error: "Acesso negado à foto da refeição.", statusCode: 403 };
    }

    // 4. Read verified file from persistent private storage
    const readResult = await readVerifiedPrivateFile({
      fileStorageKey: String(log.photo_storage_key),
      expectedSizeBytes: Number(log.photo_size_bytes) || 0,
      expectedFileSha256: String(log.photo_sha256) || "",
      expectedMimeType: String(log.photo_mime_type) || "image/jpeg",
    });

    if (!readResult.success || !readResult.buffer) {
      return {
        success: false,
        error: readResult.error || "Erro ao carregar imagem privada.",
        statusCode: 404,
      };
    }

    return {
      success: true,
      buffer: readResult.buffer,
      mimeType: String(log.photo_mime_type) || "image/jpeg",
    };
  } finally {
    connection.release();
  }
}
