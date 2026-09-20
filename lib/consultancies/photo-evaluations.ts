import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "./context";
import { resolveStudentModuleAccess } from "./student-module-access";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";
import {
  writePrivateFile,
  readVerifiedPrivateFile,
  deletePrivateFile,
} from "@/lib/storage/private-files";

// ============================================================================
// DOMAIN TYPES & CONSTANTS (Re-exported from pure types file)
// ============================================================================

export * from "@/types/photo-evaluations";
import {
  EVALUATION_POSES,
  POSE_LABELS,
  STATUS_LABELS,
  MAX_EVALUATION_PHOTO_SIZE_BYTES,
  type PhotoEvaluationPose,
  type PhotoEvaluationStatus,
  type SupportedPhotoMime,
  type PhotoEvaluationImageDto,
  type PhotoEvaluationRequestDto,
  type PhotoEvaluationComparisonPairDto,
  type PhotoEvaluationComparisonDto,
} from "@/types/photo-evaluations";

// ============================================================================
// MIME & BINARY MAGIC BYTES DETECTION
// ============================================================================

export function detectPhotoMimeType(buffer: Buffer): {
  valid: boolean;
  mimeType?: SupportedPhotoMime;
  extension?: string;
  error?: string;
} {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio não permitido." };
  }

  if (buffer.length > MAX_EVALUATION_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: "O arquivo excede o limite máximo permitido de 10 MB.",
    };
  }

  // 1. JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valid: true, mimeType: "image/jpeg", extension: ".jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", extension: ".png" };
  }

  // 3. WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", extension: ".webp" };
  }

  return {
    valid: false,
    error: "Formato de imagem não suportado. Utilize arquivos JPG, PNG ou WEBP.",
  };
}

// ============================================================================
// INVARIANT VALIDATION (User Instruction 2)
// ============================================================================

export async function assertStudentMembershipInvariant(
  connection: PoolConnection,
  params: {
    consultancyId: number;
    studentMembershipId: number;
  }
): Promise<{
  membershipId: number;
  userId: number;
  consultancyId: number;
  studentName: string;
  studentEmail: string;
}> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT cm.id AS membership_id, cm.user_id, cm.consultancy_id, cm.status, u.full_name, u.email
     FROM consultancy_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.id = ? AND cm.consultancy_id = ?
     LIMIT 1;`,
    [params.studentMembershipId, params.consultancyId]
  );

  if (!rows || rows.length === 0) {
    throw new Error("Vínculo de aluno não encontrado nesta consultoria.");
  }

  const row = rows[0];
  if (row.status !== "ACTIVE") {
    throw new Error("O aluno não possui matrícula ativa nesta consultoria.");
  }

  if (Number(row.consultancy_id) !== params.consultancyId) {
    throw new Error("Inconsistência de consultoria detectada.");
  }

  return {
    membershipId: Number(row.membership_id),
    userId: Number(row.user_id),
    consultancyId: Number(row.consultancy_id),
    studentName: String(row.full_name),
    studentEmail: String(row.email),
  };
}

export async function assertProfessionalStudentRelationship(
  connection: PoolConnection,
  params: {
    consultancyId: number;
    studentMembershipId: number;
    professionalUserId: number;
  }
): Promise<boolean> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT 1 FROM (
      -- Active workout assignment (V2)
      SELECT 1 FROM workout_assignments wa
      JOIN consultancy_members coach ON coach.id = wa.assigned_by_membership_id
      WHERE wa.consultancy_id = ? AND wa.student_membership_id = ? AND coach.user_id = ? AND wa.status = 'ACTIVE' AND wa.deleted_at IS NULL
      UNION
      -- Active training plan (V1)
      SELECT 1 FROM training_plans tp
      WHERE tp.consultancy_id = ? AND tp.student_membership_id = ? AND tp.created_by_user_id = ? AND tp.status = 'ACTIVE' AND tp.deleted_at IS NULL
      UNION
      -- Active nutrition assignment (V2)
      SELECT 1 FROM nutrition_v2_assignments na
      JOIN consultancy_members coach ON coach.id = na.assigned_by_membership_id
      WHERE na.consultancy_id = ? AND na.student_membership_id = ? AND coach.user_id = ? AND na.status = 'ACTIVE' AND na.deleted_at IS NULL
      UNION
      -- Active nutrition plan (V1)
      SELECT 1 FROM nutrition_plans np
      JOIN consultancy_members coach ON coach.id = np.nutritionist_membership_id
      WHERE np.consultancy_id = ? AND np.student_membership_id = ? AND coach.user_id = ? AND np.status = 'ACTIVE' AND np.deleted_at IS NULL
      UNION
      -- Scheduled or in-progress consultation
      SELECT 1 FROM consultations c
      JOIN consultancy_members coach ON coach.id = c.professional_membership_id
      WHERE c.consultancy_id = ? AND c.student_membership_id = ? AND coach.user_id = ? AND c.status IN ('SCHEDULED', 'IN_PROGRESS')
    ) rel LIMIT 1;`,
    [
      params.consultancyId, params.studentMembershipId, params.professionalUserId,
      params.consultancyId, params.studentMembershipId, params.professionalUserId,
      params.consultancyId, params.studentMembershipId, params.professionalUserId,
      params.consultancyId, params.studentMembershipId, params.professionalUserId,
      params.consultancyId, params.studentMembershipId, params.professionalUserId,
    ]
  );
  return Array.isArray(rows) && rows.length > 0;
}

export const canProfessionalAccessStudent = assertProfessionalStudentRelationship;

// ============================================================================
// 1. CREATE REQUEST (Professional: Personal, Nutritionist, Admin)
// ============================================================================

export async function createPhotoEvaluationRequest(params: {
  professionalUserId: number;
  consultancySlug: string;
  studentPublicId: string;
  instructions?: string | null;
  dueAt?: string | null;
}): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const { professionalUserId, consultancySlug, studentPublicId, instructions, dueAt } = params;

  const context = await resolveConsultancyContext(professionalUserId, consultancySlug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const isAllowedRole =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("NUTRITIONIST") ||
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isAllowedRole) {
    return { success: false, error: "Permissão insuficiente para solicitar avaliação por fotos." };
  }

  let connection: PoolConnection | null = null;
  let notifIdToDeliver: number | null = null;

  try {
    connection = await getDbConnection();

    // 1. Resolve student membership from studentPublicId
    const [targetMembers] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, cm.consultancy_id, cm.status
       FROM consultancy_members cm
       WHERE cm.public_id = ? AND cm.consultancy_id = ?
       LIMIT 1;`,
      [studentPublicId, context.consultancyId]
    );

    if (!targetMembers || targetMembers.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const studentMembershipId = Number(targetMembers[0].id);

    // 2. Strict invariant check server-side
    const studentInfo = await assertStudentMembershipInvariant(connection, {
      consultancyId: context.consultancyId,
      studentMembershipId,
    });

    // 2.1. Professional-student assignment authorization (non-admins must have active relationship)
    const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
    if (!isAdmin) {
      const hasRelationship = await assertProfessionalStudentRelationship(connection, {
        consultancyId: context.consultancyId,
        studentMembershipId,
        professionalUserId,
      });
      if (!hasRelationship) {
        return {
          success: false,
          error: "Você só pode solicitar fotos de avaliação para alunos com prescrições ativas sob sua responsabilidade.",
        };
      }
    }

    // 3. Verify if an active pending / changes_requested evaluation already exists
    const [existingOpen] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status
       FROM student_photo_evaluation_requests
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status IN ('PENDING', 'CHANGES_REQUESTED', 'SUBMITTED')
       LIMIT 1;`,
      [context.consultancyId, studentMembershipId]
    );

    if (existingOpen && existingOpen.length > 0) {
      return {
        success: false,
        error: "Já existe uma avaliação de fotos em andamento para este aluno.",
      };
    }

    const requestPublicId = randomUUID();
    const sanitizedInstructions = instructions?.trim() ? instructions.trim().slice(0, 2000) : null;
    const sanitizedDueAt = dueAt && !isNaN(Date.parse(dueAt)) ? new Date(dueAt) : null;

    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO student_photo_evaluation_requests (
        public_id,
        consultancy_id,
        student_membership_id,
        student_user_id,
        requested_by_user_id,
        status,
        instructions,
        due_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, NOW(3), NOW(3));`,
      [
        requestPublicId,
        context.consultancyId,
        studentInfo.membershipId,
        studentInfo.userId,
        professionalUserId,
        sanitizedInstructions,
        sanitizedDueAt,
      ]
    );

    // Persist notification inside transaction (User Instruction 3)
    try {
      const notif = await createNotificationInTransaction(connection, {
        userId: studentInfo.userId,
        title: "Novas fotos de avaliação solicitadas",
        body: "Seu profissional solicitou o envio de fotos padronizadas para acompanhamento da sua evolução física.",
        eventType: "PHOTO_EVALUATION_REQUESTED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/progresso?tab=fotos`,
        dedupeKey: `photo-eval:${requestPublicId}:requested:${studentInfo.userId}`,
        sourceType: "photo_evaluation_request",
        sourcePublicId: requestPublicId,
      });
      notifIdToDeliver = notif.id;
    } catch {
      // Non-blocking notification creation
    }

    await connection.commit();

    // Deliver notification AFTER commit
    if (notifIdToDeliver) {
      await deliverNotificationAfterCommit(notifIdToDeliver);
    }

    return { success: true, requestPublicId };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    const message = err instanceof Error ? err.message : "Erro ao criar solicitação de fotos.";
    return { success: false, error: message };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 2. GET ACTIVE OR LIST REQUESTS FOR STUDENT
// ============================================================================

export async function getStudentPhotoEvaluationsData(params: {
  userId: number;
  consultancySlug: string;
}): Promise<{
  activeRequest: PhotoEvaluationRequestDto | null;
  history: PhotoEvaluationRequestDto[];
} | null> {
  const { userId, consultancySlug } = params;

  const access = await resolveStudentModuleAccess(userId, consultancySlug);
  if (!access.allowed || !access.context) {
    return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Resolve student membership
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [userId, access.context.consultancyId]
    );

    if (!members || members.length === 0) {
      return null;
    }

    const studentMembershipId = Number(members[0].id);

    // Fetch all requests for this student
    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id,
        r.public_id,
        r.status,
        r.instructions,
        r.due_at,
        r.consent_at,
        r.submitted_at,
        r.reviewed_at,
        r.reviewer_notes,
        r.requested_changes_poses_json,
        r.created_at,
        r.updated_at,
        req_user.full_name AS requested_by_name,
        rev_user.full_name AS reviewed_by_name
       FROM student_photo_evaluation_requests r
       JOIN users req_user ON req_user.id = r.requested_by_user_id
       LEFT JOIN users rev_user ON rev_user.id = r.reviewed_by_user_id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.student_user_id = ?
       ORDER BY r.created_at DESC;`,
      [access.context.consultancyId, studentMembershipId, userId]
    );

    const requestDtos: PhotoEvaluationRequestDto[] = [];

    for (const reqRow of requests) {
      const requestId = Number(reqRow.id);

      // Fetch images for this request
      const [images] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id, pose, mime_type, byte_size, uploaded_at, updated_at
         FROM student_photo_evaluation_images
         WHERE request_id = ?;`,
        [requestId]
      );

      const imageMap: Record<PhotoEvaluationPose, PhotoEvaluationImageDto | null> = {
        FRONT: null,
        RIGHT_SIDE: null,
        BACK: null,
        LEFT_SIDE: null,
      };

      for (const imgRow of images) {
        const pose = String(imgRow.pose) as PhotoEvaluationPose;
        if (EVALUATION_POSES.includes(pose)) {
          imageMap[pose] = {
            publicId: String(imgRow.public_id),
            pose,
            poseLabel: POSE_LABELS[pose] || pose,
            mimeType: String(imgRow.mime_type),
            byteSize: Number(imgRow.byte_size),
            uploadedAt: new Date(imgRow.uploaded_at).toISOString(),
            updatedAt: new Date(imgRow.updated_at).toISOString(),
            imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${reqRow.public_id}/images/${pose}`,
          };
        }
      }

      let requestedChangesPoses: PhotoEvaluationPose[] = [];
      try {
        const rawPoses = reqRow.requested_changes_poses_json;
        if (typeof rawPoses === "string") {
          requestedChangesPoses = JSON.parse(rawPoses);
        } else if (Array.isArray(rawPoses)) {
          requestedChangesPoses = rawPoses;
        }
      } catch {
        requestedChangesPoses = [];
      }

      const completedCount = EVALUATION_POSES.filter((p) => imageMap[p] !== null).length;
      const status = String(reqRow.status) as PhotoEvaluationStatus;

      requestDtos.push({
        publicId: String(reqRow.public_id),
        consultancySlug,
        consultancyName: access.context.consultancyName,
        studentPublicId: String(members[0].public_id),
        studentName: String(members[0].full_name),
        studentEmail: String(members[0].email),
        status,
        statusLabel: STATUS_LABELS[status] || status,
        instructions: reqRow.instructions ? String(reqRow.instructions) : null,
        dueAt: reqRow.due_at ? new Date(reqRow.due_at).toISOString() : null,
        consentAt: reqRow.consent_at ? new Date(reqRow.consent_at).toISOString() : null,
        submittedAt: reqRow.submitted_at ? new Date(reqRow.submitted_at).toISOString() : null,
        reviewedAt: reqRow.reviewed_at ? new Date(reqRow.reviewed_at).toISOString() : null,
        reviewerNotes: reqRow.reviewer_notes ? String(reqRow.reviewer_notes) : null,
        requestedChangesPoses,
        requestedByName: String(reqRow.requested_by_name),
        reviewedByName: reqRow.reviewed_by_name ? String(reqRow.reviewed_by_name) : null,
        createdAt: new Date(reqRow.created_at).toISOString(),
        updatedAt: new Date(reqRow.updated_at).toISOString(),
        images: imageMap,
        completedPosesCount: completedCount,
        totalPosesCount: 4,
      });
    }

    const activeRequest =
      requestDtos.find((r) => r.status === "PENDING" || r.status === "CHANGES_REQUESTED" || r.status === "SUBMITTED") ||
      null;

    const history = requestDtos.filter((r) => r.status === "APPROVED");

    return { activeRequest, history };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 3. GET EVALUATIONS DATA FOR PROFESSIONAL (By Student)
// ============================================================================

export async function getProfessionalStudentPhotoEvaluationsData(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId: string;
}): Promise<{
  student: { publicId: string; fullName: string; email: string };
  requests: PhotoEvaluationRequestDto[];
  approvedEvaluations: PhotoEvaluationRequestDto[];
} | null> {
  const { userId, consultancySlug, studentPublicId } = params;

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) return null;

  const isAllowed =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("NUTRITIONIST") ||
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isAllowed) return null;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Verify student membership in this consultancy
    const [targetMembers] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.user_id, cm.status, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.public_id = ? AND cm.consultancy_id = ?
       LIMIT 1;`,
      [studentPublicId, context.consultancyId]
    );

    if (!targetMembers || targetMembers.length === 0) return null;

    const studentMembershipId = Number(targetMembers[0].id);
    const studentUserId = Number(targetMembers[0].user_id);
    const student = {
      publicId: String(targetMembers[0].public_id),
      fullName: String(targetMembers[0].full_name),
      email: String(targetMembers[0].email),
    };

    // Strict invariant check
    await assertStudentMembershipInvariant(connection, {
      consultancyId: context.consultancyId,
      studentMembershipId,
    });

    // Professional authorization: non-admin must have active current relationship
    const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
    if (!isAdmin) {
      const hasRelationship = await assertProfessionalStudentRelationship(connection, {
        consultancyId: context.consultancyId,
        studentMembershipId,
        professionalUserId: userId,
      });
      if (!hasRelationship) {
        return null;
      }
    }

    // Fetch all requests for this student
    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id,
        r.public_id,
        r.status,
        r.instructions,
        r.due_at,
        r.consent_at,
        r.submitted_at,
        r.reviewed_at,
        r.reviewer_notes,
        r.requested_changes_poses_json,
        r.created_at,
        r.updated_at,
        req_user.full_name AS requested_by_name,
        rev_user.full_name AS reviewed_by_name
       FROM student_photo_evaluation_requests r
       JOIN users req_user ON req_user.id = r.requested_by_user_id
       LEFT JOIN users rev_user ON rev_user.id = r.reviewed_by_user_id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.student_user_id = ?
       ORDER BY r.created_at DESC;`,
      [context.consultancyId, studentMembershipId, studentUserId]
    );

    const requestDtos: PhotoEvaluationRequestDto[] = [];

    for (const reqRow of requests) {
      const requestId = Number(reqRow.id);

      const [images] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id, pose, mime_type, byte_size, uploaded_at, updated_at
         FROM student_photo_evaluation_images
         WHERE request_id = ?;`,
        [requestId]
      );

      const imageMap: Record<PhotoEvaluationPose, PhotoEvaluationImageDto | null> = {
        FRONT: null,
        RIGHT_SIDE: null,
        BACK: null,
        LEFT_SIDE: null,
      };

      for (const imgRow of images) {
        const pose = String(imgRow.pose) as PhotoEvaluationPose;
        if (EVALUATION_POSES.includes(pose)) {
          imageMap[pose] = {
            publicId: String(imgRow.public_id),
            pose,
            poseLabel: POSE_LABELS[pose] || pose,
            mimeType: String(imgRow.mime_type),
            byteSize: Number(imgRow.byte_size),
            uploadedAt: new Date(imgRow.uploaded_at).toISOString(),
            updatedAt: new Date(imgRow.updated_at).toISOString(),
            imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${reqRow.public_id}/images/${pose}`,
          };
        }
      }

      let requestedChangesPoses: PhotoEvaluationPose[] = [];
      try {
        const rawPoses = reqRow.requested_changes_poses_json;
        if (typeof rawPoses === "string") {
          requestedChangesPoses = JSON.parse(rawPoses);
        } else if (Array.isArray(rawPoses)) {
          requestedChangesPoses = rawPoses;
        }
      } catch {
        requestedChangesPoses = [];
      }

      const completedCount = EVALUATION_POSES.filter((p) => imageMap[p] !== null).length;
      const status = String(reqRow.status) as PhotoEvaluationStatus;

      requestDtos.push({
        publicId: String(reqRow.public_id),
        consultancySlug,
        consultancyName: context.consultancyName,
        studentPublicId: student.publicId,
        studentName: student.fullName,
        studentEmail: student.email,
        status,
        statusLabel: STATUS_LABELS[status] || status,
        instructions: reqRow.instructions ? String(reqRow.instructions) : null,
        dueAt: reqRow.due_at ? new Date(reqRow.due_at).toISOString() : null,
        consentAt: reqRow.consent_at ? new Date(reqRow.consent_at).toISOString() : null,
        submittedAt: reqRow.submitted_at ? new Date(reqRow.submitted_at).toISOString() : null,
        reviewedAt: reqRow.reviewed_at ? new Date(reqRow.reviewed_at).toISOString() : null,
        reviewerNotes: reqRow.reviewer_notes ? String(reqRow.reviewer_notes) : null,
        requestedChangesPoses,
        requestedByName: String(reqRow.requested_by_name),
        reviewedByName: reqRow.reviewed_by_name ? String(reqRow.reviewed_by_name) : null,
        createdAt: new Date(reqRow.created_at).toISOString(),
        updatedAt: new Date(reqRow.updated_at).toISOString(),
        images: imageMap,
        completedPosesCount: completedCount,
        totalPosesCount: 4,
      });
    }

    const approvedEvaluations = requestDtos.filter((r) => r.status === "APPROVED");

    return {
      student,
      requests: requestDtos,
      approvedEvaluations,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 4. SAVE / REPLACE EVALUATION IMAGE (Compensable, User Instruction 7)
// ============================================================================

export async function savePhotoEvaluationPoseImage(params: {
  userId: number;
  consultancySlug: string;
  requestPublicId: string;
  pose: PhotoEvaluationPose;
  buffer: Buffer;
  clientMimeType?: string;
}): Promise<{
  success: boolean;
  image?: PhotoEvaluationImageDto;
  error?: string;
}> {
  const { userId, consultancySlug, requestPublicId, pose, buffer } = params;

  if (!EVALUATION_POSES.includes(pose)) {
    return { success: false, error: "Pose inválida." };
  }

  // Detect and validate binary magic bytes
  const mimeCheck = detectPhotoMimeType(buffer);
  if (!mimeCheck.valid || !mimeCheck.mimeType || !mimeCheck.extension) {
    return { success: false, error: mimeCheck.error || "Arquivo de imagem inválido." };
  }

  let connection: PoolConnection | null = null;
  let newStorageKey: string | null = null;
  let oldStorageKey: string | null = null;

  try {
    connection = await getDbConnection();

    // Verify student ownership and request status
    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT r.id, r.consultancy_id, r.student_membership_id, r.student_user_id, r.status
       FROM student_photo_evaluation_requests r
       JOIN consultancies c ON c.id = r.consultancy_id
       WHERE r.public_id = ? AND c.slug = ?
       LIMIT 1;`,
      [requestPublicId, consultancySlug]
    );

    if (!requests || requests.length === 0) {
      return { success: false, error: "Solicitação não encontrada." };
    }

    const reqRow = requests[0];
    const requestId = Number(reqRow.id);
    const consultancyId = Number(reqRow.consultancy_id);
    const studentMembershipId = Number(reqRow.student_membership_id);
    const studentUserId = Number(reqRow.student_user_id);
    const status = String(reqRow.status);

    if (studentUserId !== userId) {
      return { success: false, error: "Acesso não autorizado para esta avaliação." };
    }

    if (status !== "PENDING" && status !== "CHANGES_REQUESTED") {
      return {
        success: false,
        error: "Esta avaliação já foi enviada ou concluída e não aceita novas imagens.",
      };
    }

    // Invariant check
    await assertStudentMembershipInvariant(connection, {
      consultancyId,
      studentMembershipId,
    });

    // 1. Write file to private storage outside web root
    const writeResult = await writePrivateFile({
      buffer,
      extension: mimeCheck.extension,
      originalFileName: `pose_${pose.toLowerCase()}`,
      namespace: "photo-evaluations",
    });

    newStorageKey = writeResult.fileStorageKey;

    await connection.beginTransaction();

    // Check existing image record for this pose
    const [existingImages] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, storage_key
       FROM student_photo_evaluation_images
       WHERE request_id = ? AND pose = ?
       FOR UPDATE;`,
      [requestId, pose]
    );

    let imagePublicId: string;
    const updatedAtDate = new Date();

    if (existingImages && existingImages.length > 0) {
      const existing = existingImages[0];
      imagePublicId = String(existing.public_id);
      oldStorageKey = String(existing.storage_key);

      await connection.execute<ResultSetHeader>(
        `UPDATE student_photo_evaluation_images
         SET storage_key = ?,
             mime_type = ?,
             byte_size = ?,
             checksum = ?,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [
          newStorageKey,
          mimeCheck.mimeType,
          writeResult.sizeBytes,
          writeResult.fileSha256,
          existing.id,
        ]
      );
    } else {
      imagePublicId = randomUUID();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO student_photo_evaluation_images (
          public_id,
          request_id,
          pose,
          storage_key,
          mime_type,
          byte_size,
          checksum,
          uploaded_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          imagePublicId,
          requestId,
          pose,
          newStorageKey,
          mimeCheck.mimeType,
          writeResult.sizeBytes,
          writeResult.fileSha256,
        ]
      );
    }

    await connection.commit();

    // Delete old file only after successful DB commit (Compensable cleanup)
    if (oldStorageKey && oldStorageKey !== newStorageKey) {
      await deletePrivateFile(oldStorageKey);
    }

    return {
      success: true,
      image: {
        publicId: imagePublicId,
        pose,
        poseLabel: POSE_LABELS[pose],
        mimeType: mimeCheck.mimeType,
        byteSize: writeResult.sizeBytes,
        uploadedAt: updatedAtDate.toISOString(),
        updatedAt: updatedAtDate.toISOString(),
        imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${requestPublicId}/images/${pose}`,
      },
    };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore
      }
    }

    // Compensation: delete newly written file on failure so no storage garbage remains
    if (newStorageKey) {
      await deletePrivateFile(newStorageKey);
    }

    const message = err instanceof Error ? err.message : "Erro ao salvar imagem.";
    return { success: false, error: message };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 5. SUBMIT EVALUATION (User Instruction 1 & 8)
// ============================================================================

export async function submitPhotoEvaluation(params: {
  userId: number;
  consultancySlug: string;
  requestPublicId: string;
  hasAgreedToGuidelines: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, consultancySlug, requestPublicId, hasAgreedToGuidelines } = params;

  if (!hasAgreedToGuidelines) {
    return {
      success: false,
      error: "É necessário confirmar o termo de consentimento para envio das fotos.",
    };
  }

  let connection: PoolConnection | null = null;
  let notifIdToDeliver: number | null = null;

  try {
    connection = await getDbConnection();

    // Verify request
    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id,
        r.public_id,
        r.consultancy_id,
        r.student_membership_id,
        r.student_user_id,
        r.requested_by_user_id,
        r.status,
        r.reviewed_at,
        r.requested_changes_poses_json,
        u_student.full_name AS student_name,
        cm.public_id AS student_membership_public_id
       FROM student_photo_evaluation_requests r
       JOIN consultancies c ON c.id = r.consultancy_id
       JOIN users u_student ON u_student.id = r.student_user_id
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       WHERE r.public_id = ? AND c.slug = ?
       LIMIT 1;`,
      [requestPublicId, consultancySlug]
    );

    if (!requests || requests.length === 0) {
      return { success: false, error: "Solicitação não encontrada." };
    }

    const req = requests[0];
    const requestId = Number(req.id);
    const consultancyId = Number(req.consultancy_id);
    const studentMembershipId = Number(req.student_membership_id);
    const studentUserId = Number(req.student_user_id);
    const requestedByUserId = Number(req.requested_by_user_id);
    const status = String(req.status);
    const studentMembershipPublicId = req.student_membership_public_id
      ? String(req.student_membership_public_id).trim()
      : null;

    if (studentUserId !== userId) {
      return { success: false, error: "Não autorizado." };
    }

    if (status !== "PENDING" && status !== "CHANGES_REQUESTED") {
      return {
        success: false,
        error: "Esta avaliação não está em estado para reenvio.",
      };
    }

    // Invariant check
    await assertStudentMembershipInvariant(connection, {
      consultancyId,
      studentMembershipId,
    });

    // 1. Fetch images and ensure all 4 poses exist
    const [images] = await connection.execute<RowDataPacket[]>(
      `SELECT pose, updated_at
       FROM student_photo_evaluation_images
       WHERE request_id = ?;`,
      [requestId]
    );

    const imageMap = new Map<PhotoEvaluationPose, { updated_at: Date }>();
    for (const img of images) {
      imageMap.set(String(img.pose) as PhotoEvaluationPose, {
        updated_at: new Date(img.updated_at),
      });
    }

    for (const requiredPose of EVALUATION_POSES) {
      if (!imageMap.has(requiredPose)) {
        return {
          success: false,
          error: `A foto da pose "${POSE_LABELS[requiredPose]}" é obrigatória para envio.`,
        };
      }
    }

    // 2. Strict Retake Enforcement (User Instruction 1)
    if (status === "CHANGES_REQUESTED" && req.reviewed_at) {
      let requestedChangesPoses: PhotoEvaluationPose[] = [];
      try {
        const rawPoses = req.requested_changes_poses_json;
        if (typeof rawPoses === "string") {
          requestedChangesPoses = JSON.parse(rawPoses);
        } else if (Array.isArray(rawPoses)) {
          requestedChangesPoses = rawPoses;
        }
      } catch {
        requestedChangesPoses = [];
      }

      const reviewedTime = new Date(req.reviewed_at).getTime();

      for (const pose of requestedChangesPoses) {
        const img = imageMap.get(pose);
        if (!img) {
          return {
            success: false,
            error: "Substitua todas as fotos marcadas para correção antes de reenviar.",
          };
        }

        const imgTime = img.updated_at.getTime();
        if (imgTime <= reviewedTime) {
          return {
            success: false,
            error: "Substitua todas as fotos marcadas para correção antes de reenviar.",
          };
        }
      }
    }

    await connection.beginTransaction();

    // Update status to SUBMITTED, set consent_at server-side to NOW(3) (User Instruction 8)
    await connection.execute<ResultSetHeader>(
      `UPDATE student_photo_evaluation_requests
       SET status = 'SUBMITTED',
           submitted_at = NOW(3),
           consent_at = NOW(3),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [requestId]
    );

    // Persist notification inside transaction (User Instruction 3)
    try {
      const deepLink = studentMembershipPublicId
        ? `/consultoria/${consultancySlug}/progresso/alunos/${studentMembershipPublicId}?tab=fotos`
        : `/consultoria/${consultancySlug}/progresso/alunos`;

      const notif = await createNotificationInTransaction(connection, {
        userId: requestedByUserId,
        title: "Fotos de avaliação enviadas",
        body: `${req.student_name} enviou as 4 fotos para avaliação física.`,
        eventType: "PHOTO_EVALUATION_SUBMITTED",
        priority: "NORMAL",
        deepLink,
        dedupeKey: `photo-eval:${requestPublicId}:submitted:${Date.now()}:${requestedByUserId}`,
        sourceType: "photo_evaluation_request",
        sourcePublicId: requestPublicId,
      });
      notifIdToDeliver = notif.id;
    } catch {
      // Non-blocking notification creation
    }

    await connection.commit();

    if (notifIdToDeliver) {
      await deliverNotificationAfterCommit(notifIdToDeliver);
    }

    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore
      }
    }
    const message = err instanceof Error ? err.message : "Erro ao enviar avaliação.";
    return { success: false, error: message };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 6. REVIEW EVALUATION (Professional: APPROVE or CHANGES_REQUESTED)
// ============================================================================

export async function reviewPhotoEvaluation(params: {
  professionalUserId: number;
  consultancySlug: string;
  requestPublicId: string;
  decision: "APPROVE" | "CHANGES_REQUESTED";
  reviewerNotes?: string | null;
  posesToRetake?: PhotoEvaluationPose[];
}): Promise<{ success: boolean; error?: string }> {
  const { professionalUserId, consultancySlug, requestPublicId, decision, reviewerNotes, posesToRetake } = params;

  const context = await resolveConsultancyContext(professionalUserId, consultancySlug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const isAllowed =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("NUTRITIONIST") ||
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isAllowed) {
    return { success: false, error: "Permissão insuficiente para avaliar fotos." };
  }

  if (decision === "CHANGES_REQUESTED") {
    if (!posesToRetake || posesToRetake.length === 0) {
      return {
        success: false,
        error: "Selecione ao menos uma pose para solicitar que seja refeita.",
      };
    }
    for (const p of posesToRetake) {
      if (!EVALUATION_POSES.includes(p)) {
        return { success: false, error: `Pose inválida selecionada: ${p}` };
      }
    }
  }

  let connection: PoolConnection | null = null;
  let notifIdToDeliver: number | null = null;

  try {
    connection = await getDbConnection();

    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT r.id, r.public_id, r.consultancy_id, r.student_membership_id, r.student_user_id, r.requested_by_user_id, r.status
       FROM student_photo_evaluation_requests r
       WHERE r.public_id = ? AND r.consultancy_id = ?
       LIMIT 1;`,
      [requestPublicId, context.consultancyId]
    );

    if (!requests || requests.length === 0) {
      return { success: false, error: "Solicitação de avaliação não encontrada." };
    }

    const req = requests[0];
    const requestId = Number(req.id);
    const studentUserId = Number(req.student_user_id);
    const studentMembershipId = Number(req.student_membership_id);

    // Invariant check
    await assertStudentMembershipInvariant(connection, {
      consultancyId: context.consultancyId,
      studentMembershipId,
    });

    // Professional authorization: non-admin must have active current relationship
    const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
    if (!isAdmin) {
      const hasRelationship = await assertProfessionalStudentRelationship(connection, {
        consultancyId: context.consultancyId,
        studentMembershipId,
        professionalUserId,
      });
      if (!hasRelationship) {
        return {
          success: false,
          error: "Você não possui vínculo ativo com este aluno para revisar fotos.",
        };
      }
    }

    if (req.status !== "SUBMITTED") {
      return {
        success: false,
        error: "Apenas avaliações no status 'Em análise' podem ser revisadas.",
      };
    }

    await connection.beginTransaction();

    const sanitizedNotes = reviewerNotes?.trim() ? reviewerNotes.trim().slice(0, 2000) : null;

    if (decision === "APPROVE") {
      await connection.execute<ResultSetHeader>(
        `UPDATE student_photo_evaluation_requests
         SET status = 'APPROVED',
             reviewed_at = NOW(3),
             reviewed_by_user_id = ?,
             reviewer_notes = ?,
             requested_changes_poses_json = NULL,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [professionalUserId, sanitizedNotes, requestId]
      );

      // Persist notification inside transaction
      try {
        const notif = await createNotificationInTransaction(connection, {
          userId: studentUserId,
          title: "Fotos de avaliação aprovadas",
          body: "Sua avaliação por fotos foi aprovada pelo seu profissional.",
          eventType: "PHOTO_EVALUATION_APPROVED",
          priority: "NORMAL",
          deepLink: `/consultoria/${consultancySlug}/progresso?tab=fotos`,
          dedupeKey: `photo-eval:${requestPublicId}:approved:${studentUserId}`,
          sourceType: "photo_evaluation_request",
          sourcePublicId: requestPublicId,
        });
        notifIdToDeliver = notif.id;
      } catch {
        // Non-blocking notification creation
      }
    } else {
      // CHANGES_REQUESTED
      const posesJson = JSON.stringify(posesToRetake);
      await connection.execute<ResultSetHeader>(
        `UPDATE student_photo_evaluation_requests
         SET status = 'CHANGES_REQUESTED',
             reviewed_at = NOW(3),
             reviewed_by_user_id = ?,
             reviewer_notes = ?,
             requested_changes_poses_json = ?,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [professionalUserId, sanitizedNotes, posesJson, requestId]
      );

      // Persist notification inside transaction
      try {
        const notif = await createNotificationInTransaction(connection, {
          userId: studentUserId,
          title: "Ajuste solicitado nas fotos de avaliação",
          body: "Seu profissional solicitou que algumas fotos sejam refeitas. Confira as orientações.",
          eventType: "PHOTO_EVALUATION_CHANGES_REQUESTED",
          priority: "NORMAL",
          deepLink: `/consultoria/${consultancySlug}/progresso?tab=fotos`,
          dedupeKey: `photo-eval:${requestPublicId}:changes:${Date.now()}:${studentUserId}`,
          sourceType: "photo_evaluation_request",
          sourcePublicId: requestPublicId,
        });
        notifIdToDeliver = notif.id;
      } catch {
        // Non-blocking notification creation
      }
    }

    await connection.commit();

    if (notifIdToDeliver) {
      await deliverNotificationAfterCommit(notifIdToDeliver);
    }

    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore
      }
    }
    const message = err instanceof Error ? err.message : "Erro ao revisar avaliação.";
    return { success: false, error: message };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 7. COMPARISON DATA QUERY (User Instruction 4)
// ============================================================================

export async function getPhotoEvaluationComparisonData(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId?: string;
  beforeEvaluationPublicId?: string;
  afterEvaluationPublicId?: string;
}): Promise<PhotoEvaluationComparisonDto | null> {
  const { userId, consultancySlug, studentPublicId, beforeEvaluationPublicId, afterEvaluationPublicId } = params;

  let professionalContext: Awaited<ReturnType<typeof resolveConsultancyContext>> = null;
  if (studentPublicId) {
    // Professional or admin accessing student
    professionalContext = await resolveConsultancyContext(userId, consultancySlug);
    if (!professionalContext) return null;

    const isAllowed =
      professionalContext.roles.includes("PERSONAL") ||
      professionalContext.roles.includes("NUTRITIONIST") ||
      professionalContext.roles.includes("CONSULTANCY_ADMIN");
    if (!isAllowed) return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Resolve consultancy
    const [consultancies] = await connection.execute<RowDataPacket[]>(
      `SELECT id, slug, name FROM consultancies WHERE slug = ? LIMIT 1;`,
      [consultancySlug]
    );
    if (!consultancies || consultancies.length === 0) return null;
    const consultancyId = Number(consultancies[0].id);

    // Determine target student
    let targetStudentMembershipId: number;
    let targetStudentUserId: number;
    let targetStudentName: string;
    let targetStudentEmail: string;
    let targetStudentPublicId: string;

    if (studentPublicId) {
      const [targetMembers] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.public_id, cm.user_id, cm.status, u.full_name, u.email
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.public_id = ? AND cm.consultancy_id = ?
         LIMIT 1;`,
        [studentPublicId, consultancyId]
      );
      if (!targetMembers || targetMembers.length === 0) return null;

      targetStudentMembershipId = Number(targetMembers[0].id);
      targetStudentUserId = Number(targetMembers[0].user_id);
      targetStudentName = String(targetMembers[0].full_name);
      targetStudentEmail = String(targetMembers[0].email);
      targetStudentPublicId = String(targetMembers[0].public_id);

      // Verify relationship for non-admin professional
      const isAdmin = professionalContext ? professionalContext.roles.includes("CONSULTANCY_ADMIN") : false;
      if (!isAdmin) {
        const hasRelationship = await assertProfessionalStudentRelationship(connection, {
          consultancyId,
          studentMembershipId: targetStudentMembershipId,
          professionalUserId: userId,
        });
        if (!hasRelationship) {
          return null;
        }
      }
    } else {
      // Student accessing own evaluations
      const [members] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.id, cm.public_id, cm.user_id, cm.status, u.full_name, u.email
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         WHERE cm.user_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         LIMIT 1;`,
        [userId, consultancyId]
      );
      if (!members || members.length === 0) return null;

      targetStudentMembershipId = Number(members[0].id);
      targetStudentUserId = Number(members[0].user_id);
      targetStudentName = String(members[0].full_name);
      targetStudentEmail = String(members[0].email);
      targetStudentPublicId = String(members[0].public_id);
    }

    // Invariant validation
    await assertStudentMembershipInvariant(connection, {
      consultancyId,
      studentMembershipId: targetStudentMembershipId,
    });

    // Fetch approved evaluations for this student in this tenancy
    const [approvedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, submitted_at, reviewed_at, reviewer_notes
       FROM student_photo_evaluation_requests
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND student_user_id = ?
         AND status = 'APPROVED'
       ORDER BY submitted_at ASC, reviewed_at ASC, id ASC;`,
      [consultancyId, targetStudentMembershipId, targetStudentUserId]
    );

    if (!approvedRows || approvedRows.length < 2) {
      return {
        student: {
          publicId: targetStudentPublicId,
          fullName: targetStudentName,
          email: targetStudentEmail,
        },
        beforeEvaluation: null,
        afterEvaluation: null,
        pairs: [],
      };
    }

    let beforeReq = approvedRows[0];
    let afterReq = approvedRows[approvedRows.length - 1];

    if (beforeEvaluationPublicId && afterEvaluationPublicId) {
      const foundBefore = approvedRows.find((r) => r.public_id === beforeEvaluationPublicId);
      const foundAfter = approvedRows.find((r) => r.public_id === afterEvaluationPublicId);
      if (foundBefore && foundAfter && foundBefore.id !== foundAfter.id) {
        // Enforce chronological ordering (older = before, newer = after)
        const bTime = new Date(foundBefore.submitted_at || foundBefore.reviewed_at).getTime();
        const aTime = new Date(foundAfter.submitted_at || foundAfter.reviewed_at).getTime();
        if (bTime <= aTime) {
          beforeReq = foundBefore;
          afterReq = foundAfter;
        } else {
          beforeReq = foundAfter;
          afterReq = foundBefore;
        }
      }
    }

    // Fetch images for beforeEvaluation
    const [beforeImages] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, pose, mime_type, byte_size, uploaded_at, updated_at
       FROM student_photo_evaluation_images
       WHERE request_id = ?;`,
      [beforeReq.id]
    );

    // Fetch images for afterEvaluation
    const [afterImages] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, pose, mime_type, byte_size, uploaded_at, updated_at
       FROM student_photo_evaluation_images
       WHERE request_id = ?;`,
      [afterReq.id]
    );

    const beforeMap = new Map<PhotoEvaluationPose, PhotoEvaluationImageDto>();
    for (const b of beforeImages) {
      const pose = String(b.pose) as PhotoEvaluationPose;
      beforeMap.set(pose, {
        publicId: String(b.public_id),
        pose,
        poseLabel: POSE_LABELS[pose] || pose,
        mimeType: String(b.mime_type),
        byteSize: Number(b.byte_size),
        uploadedAt: new Date(b.uploaded_at).toISOString(),
        updatedAt: new Date(b.updated_at).toISOString(),
        imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${beforeReq.public_id}/images/${pose}`,
      });
    }

    const afterMap = new Map<PhotoEvaluationPose, PhotoEvaluationImageDto>();
    for (const a of afterImages) {
      const pose = String(a.pose) as PhotoEvaluationPose;
      afterMap.set(pose, {
        publicId: String(a.public_id),
        pose,
        poseLabel: POSE_LABELS[pose] || pose,
        mimeType: String(a.mime_type),
        byteSize: Number(a.byte_size),
        uploadedAt: new Date(a.uploaded_at).toISOString(),
        updatedAt: new Date(a.updated_at).toISOString(),
        imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${afterReq.public_id}/images/${pose}`,
      });
    }

    // Strict pose pairing (Zero cross-pose swap, front to front, right to right, etc.)
    const pairs: PhotoEvaluationComparisonPairDto[] = EVALUATION_POSES.map((pose) => ({
      pose,
      poseLabel: POSE_LABELS[pose],
      beforeImage: beforeMap.get(pose) || null,
      afterImage: afterMap.get(pose) || null,
    }));

    return {
      student: {
        publicId: targetStudentPublicId,
        fullName: targetStudentName,
        email: targetStudentEmail,
      },
      beforeEvaluation: {
        publicId: String(beforeReq.public_id),
        submittedAt: beforeReq.submitted_at ? new Date(beforeReq.submitted_at).toISOString() : null,
        reviewedAt: beforeReq.reviewed_at ? new Date(beforeReq.reviewed_at).toISOString() : null,
        reviewerNotes: beforeReq.reviewer_notes ? String(beforeReq.reviewer_notes) : null,
      },
      afterEvaluation: {
        publicId: String(afterReq.public_id),
        submittedAt: afterReq.submitted_at ? new Date(afterReq.submitted_at).toISOString() : null,
        reviewedAt: afterReq.reviewed_at ? new Date(afterReq.reviewed_at).toISOString() : null,
        reviewerNotes: afterReq.reviewer_notes ? String(afterReq.reviewer_notes) : null,
      },
      pairs,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 8. STREAM / READ EVALUATION IMAGE BUFFER (Secure, Authenticated)
// ============================================================================

export async function getPhotoEvaluationImageBuffer(params: {
  userId: number;
  consultancySlug: string;
  requestPublicId: string;
  pose: PhotoEvaluationPose;
  variant?: "thumb" | "full";
}): Promise<{
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}> {
  const { userId, consultancySlug, requestPublicId, pose, variant = "full" } = params;

  if (!EVALUATION_POSES.includes(pose)) {
    return { success: false, error: "Pose inválida." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Query request, consultancy, image metadata
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id AS request_id,
        r.consultancy_id,
        r.student_membership_id,
        r.student_user_id,
        r.requested_by_user_id,
        img.storage_key,
        img.mime_type,
        img.byte_size,
        img.checksum
       FROM student_photo_evaluation_requests r
       JOIN consultancies c ON c.id = r.consultancy_id
       JOIN student_photo_evaluation_images img ON img.request_id = r.id AND img.pose = ?
       WHERE r.public_id = ? AND c.slug = ?
       LIMIT 1;`,
      [pose, requestPublicId, consultancySlug]
    );

    if (!rows || rows.length === 0) {
      return { success: false, error: "Imagem não encontrada." };
    }

    const row = rows[0];
    const consultancyId = Number(row.consultancy_id);
    const studentUserId = Number(row.student_user_id);
    const studentMembershipId = Number(row.student_membership_id);

    // Invariant check
    await assertStudentMembershipInvariant(connection, {
      consultancyId,
      studentMembershipId,
    });

    // Check authorization: must be either student owner OR professional/admin with active link
    if (userId !== studentUserId) {
      const context = await resolveConsultancyContext(userId, consultancySlug);
      if (!context) {
        return { success: false, error: "Acesso não autorizado à imagem." };
      }
      const isAllowed =
        context.roles.includes("PERSONAL") ||
        context.roles.includes("NUTRITIONIST") ||
        context.roles.includes("CONSULTANCY_ADMIN");
      if (!isAllowed) {
        return { success: false, error: "Acesso não autorizado à imagem." };
      }

      const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
      if (!isAdmin) {
        const hasRelationship = await assertProfessionalStudentRelationship(connection, {
          consultancyId,
          studentMembershipId,
          professionalUserId: userId,
        });
        if (!hasRelationship) {
          return { success: false, error: "Acesso não autorizado às fotos deste aluno." };
        }
      }
    }

    // Read and strictly verify private file
    const fileResult = await readVerifiedPrivateFile({
      fileStorageKey: String(row.storage_key),
      expectedSizeBytes: Number(row.byte_size),
      expectedFileSha256: String(row.checksum),
      expectedMimeType: String(row.mime_type),
    });

    if (!fileResult.success || !fileResult.buffer) {
      return { success: false, error: fileResult.error || "Erro ao ler arquivo da imagem." };
    }

    // If thumbnail variant is requested, resize to compact webp (360x480 max)
    if (variant === "thumb") {
      try {
        const sharp = (await import("sharp")).default;
        const thumbBuffer = await sharp(fileResult.buffer)
          .resize(360, 480, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        return {
          success: true,
          buffer: thumbBuffer,
          mimeType: "image/webp",
        };
      } catch {
        // Graceful fallback to original verified buffer if sharp fails on any format
      }
    }

    return {
      success: true,
      buffer: fileResult.buffer,
      mimeType: fileResult.mimeType || "image/jpeg",
    };
  } finally {
    if (connection) connection.release();
  }
}
