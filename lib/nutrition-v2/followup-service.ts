/**
 * TREVO ONE — PATIENT FOLLOW-UP SERVICE
 *
 * Handles file validation, private storage writes with rollback on DB failure,
 * streaming authorization, and unified domain orchestration.
 */

import {
  writePrivateFile,
  deletePrivateFile,
  readVerifiedPrivateFile,
  detectReceiptFileType,
} from "../storage/private-files";
import {
  type FollowupMealType,
  type FollowupEventRowDto,
  type PatientFollowupHubSummaryDto,
  ALLOWED_FOOD_PHOTO_MIME_TYPES,
  MAX_FOOD_PHOTO_SIZE_BYTES,
} from "./followup-types";
import {
  createFoodPhotoFollowupEvent,
  createPatientNoteFollowupEvent,
  getFollowupEventByPublicId,
  getPatientFollowupTimeline,
} from "./followup-repository";
import { getDbConnection } from "../db/mysql";
import type { RowDataPacket } from "mysql2/promise";

export interface RecordFoodPhotoParams {
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  buffer: Buffer;
  originalFileName: string;
  clientMimeType?: string;
  occurredAt?: string | Date;
  mealType?: FollowupMealType | null;
  caption?: string | null;
}

export interface RecordPatientNoteParams {
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  occurredAt?: string | Date;
  caption: string;
}

/**
 * Validates and saves a food photo file buffer into private storage.
 * Strictly forbids PDFs, SVGs, or executable payloads.
 */
export async function saveFollowupPhotoFile(
  buffer: Buffer,
  originalFileName: string,
  clientMimeType?: string
) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Arquivo da foto está vazio.");
  }
  if (buffer.length > MAX_FOOD_PHOTO_SIZE_BYTES) {
    throw new Error("A foto excede o limite máximo permitido de 5 MB.");
  }

  const detection = detectReceiptFileType(buffer, clientMimeType);
  if (!detection.valid || !detection.mimeType || !detection.extension) {
    throw new Error(detection.error || "Formato de arquivo não suportado.");
  }

  if (
    !ALLOWED_FOOD_PHOTO_MIME_TYPES.includes(
      detection.mimeType as (typeof ALLOWED_FOOD_PHOTO_MIME_TYPES)[number]
    )
  ) {
    throw new Error(
      "Formato de imagem inválido. Fotos de alimentação devem ser enviadas em JPG, PNG ou WEBP (PDF não é permitido)."
    );
  }

  const writeResult = await writePrivateFile({
    buffer,
    extension: detection.extension,
    originalFileName,
    namespace: "nutrition-followup",
  });

  return {
    ...writeResult,
    mimeType: detection.mimeType,
  };
}

/**
 * Registers a student food photo with orphan file cleanup protection.
 * If DB insertion fails, the written private file is automatically deleted.
 */
export async function recordStudentFoodPhoto(
  params: RecordFoodPhotoParams
): Promise<FollowupEventRowDto> {
  const fileResult = await saveFollowupPhotoFile(
    params.buffer,
    params.originalFileName,
    params.clientMimeType
  );

  try {
    const event = await createFoodPhotoFollowupEvent({
      consultancyId: params.consultancyId,
      studentMembershipId: params.studentMembershipId,
      authorMembershipId: params.authorMembershipId,
      occurredAt: params.occurredAt,
      mealType: params.mealType,
      caption: params.caption,
      photoStorageKey: fileResult.fileStorageKey,
      photoSha256: fileResult.fileSha256,
      photoSizeBytes: fileResult.sizeBytes,
      photoMimeType: fileResult.mimeType,
    });

    return event;
  } catch (dbError) {
    // DB INSERT FAILED: Cleanup newly written private file to prevent orphan storage leaks
    await deletePrivateFile(fileResult.fileStorageKey).catch(() => {});
    throw dbError;
  }
}

/**
 * Registers a student patient observation note.
 */
export async function recordStudentPatientNote(
  params: RecordPatientNoteParams
): Promise<FollowupEventRowDto> {
  return createPatientNoteFollowupEvent({
    consultancyId: params.consultancyId,
    studentMembershipId: params.studentMembershipId,
    authorMembershipId: params.authorMembershipId,
    occurredAt: params.occurredAt,
    caption: params.caption,
  });
}

/**
 * Authorizes and retrieves the verified private image buffer for a follow-up event.
 * Enforces strict multi-tenancy and RBAC:
 * - Student owner: ALLOW
 * - Authorized consultancy nutritionists / admins: ALLOW
 * - Other student: DENY
 * - Other tenant: DENY
 */
export async function getFollowupPhotoStream(params: {
  userId: number;
  consultancySlug: string;
  eventPublicId: string;
}) {
  const connection = await getDbConnection();
  try {
    // 1. Resolve tenancy and caller memberships in this consultancy
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.consultancy_id, cm.role, c.slug, c.id AS tenant_id
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE c.slug = ? AND cm.user_id = ? AND cm.status = 'ACTIVE';`,
      [params.consultancySlug, params.userId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Acesso não autorizado.", statusCode: 403 };
    }

    const tenancyId = Number(memberRows[0].tenant_id);
    const callerRoles = memberRows.map((r) => String(r.role));
    const callerMembershipIds = memberRows.map((r) => Number(r.membership_id));

    // 2. Fetch event under this tenancy
    const event = await getFollowupEventByPublicId(tenancyId, params.eventPublicId);
    if (!event || event.eventType !== "FOOD_PHOTO" || !event.photoStorageKey) {
      return { success: false, error: "Registro de foto não encontrado.", statusCode: 404 };
    }

    // 3. RBAC authorization check
    const isOwnerStudent = callerMembershipIds.includes(event.studentMembershipId);
    const isProfessional =
      callerRoles.includes("NUTRITIONIST") ||
      callerRoles.includes("CONSULTANCY_ADMIN") ||
      callerRoles.includes("PERSONAL");

    if (!isOwnerStudent && !isProfessional) {
      return { success: false, error: "Acesso negado à imagem privada.", statusCode: 403 };
    }

    // 4. Read verified file from persistent storage
    const readResult = await readVerifiedPrivateFile({
      fileStorageKey: event.photoStorageKey,
      expectedSizeBytes: event.photoSizeBytes || 0,
      expectedFileSha256: event.photoSha256 || "",
      expectedMimeType: event.photoMimeType || "image/jpeg",
    });

    if (!readResult.success || !readResult.buffer) {
      return {
        success: false,
        error: readResult.error || "Falha ao carregar arquivo de foto.",
        statusCode: 404,
      };
    }

    return {
      success: true,
      buffer: readResult.buffer,
      mimeType: event.photoMimeType || "image/jpeg",
      sizeBytes: event.photoSizeBytes,
    };
  } finally {
    connection.release();
  }
}

/**
 * Loads the complete unified followup timeline for the Patient Hub.
 */
export async function getFollowupTimelineForPatient(
  consultancyId: number,
  studentMembershipId: number
): Promise<PatientFollowupHubSummaryDto> {
  return getPatientFollowupTimeline(consultancyId, studentMembershipId);
}
