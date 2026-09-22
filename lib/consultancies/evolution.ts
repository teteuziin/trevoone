import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "./context";
import { resolveStudentModuleAccess } from "./student-module-access";
import {
  assertProfessionalStudentRelationship,
  assertStudentMembershipInvariant,
  EVALUATION_POSES,
  POSE_LABELS,
  type PhotoEvaluationPose,
  type PhotoEvaluationStatus,
  type PhotoEvaluationImageDto,
} from "./photo-evaluations";
import type {
  EvolutionHubDataDto,
  EvolutionMilestoneDto,
  StudentProgressMetricsDto,
  MilestonePhotoEvaluationDto,
  MetricDeltaDto,
  StudentEvolutionSummaryDto,
  EvolutionChartSeriesDto,
  EvolutionComparisonDataDto,
  MetricComparisonItemDto,
  MetricChangeDirection,
} from "@/types/evolution";

// --- Date and Formatting Utilities ---

export function formatIsoDateToBr(dateStr: string | null): string {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function formatShortDateBr(dateStr: string | null): string {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  const [, m, d] = parts;
  return `${d}/${m}`;
}

export function formatMetricNumber(val: number | null, unit: string): string {
  if (val === null || val === undefined) return "—";
  return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
}

export function calculateMetricDelta(
  prev: number | null | undefined,
  curr: number | null | undefined,
  unit: string,
  isWeight = false
): MetricDeltaDto | null {
  if (prev === null || prev === undefined || curr === null || curr === undefined) {
    return null;
  }

  const diff = Math.round((curr - prev) * 100) / 100;
  let direction: MetricChangeDirection = "UNCHANGED";
  let directionLabel: "Aumentou" | "Reduziu" | "Sem alteração" = "Sem alteração";

  if (diff > 0) {
    direction = "INCREASED";
    directionLabel = "Aumentou";
  } else if (diff < 0) {
    direction = "DECREASED";
    directionLabel = "Reduziu";
  }

  const sign = diff > 0 ? "+" : "";
  const diffFormatted = `${sign}${diff.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} ${unit}`;

  let diffPercentage: number | null = null;
  let diffPercentageFormatted: string | null = null;

  if (isWeight && prev > 0) {
    diffPercentage = Math.round(((curr - prev) / prev) * 10000) / 100;
    const pctSign = diffPercentage > 0 ? "+" : "";
    diffPercentageFormatted = `${pctSign}${diffPercentage.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  }

  return {
    previousValue: prev,
    currentValue: curr,
    diff,
    diffFormatted,
    diffPercentage,
    diffPercentageFormatted,
    direction,
    directionLabel,
  };
}

// --- Target Student Resolver with Strict RBAC ---

interface ResolvedTargetStudent {
  consultancyId: number;
  consultancySlug: string;
  studentMembershipId: number;
  studentUserId: number;
  studentPublicId: string;
  studentFullName: string;
  studentEmail: string;
}

/**
 * Canonical access policy for Professional Student Evolution (List & Detail).
 *
 * Rules:
 * - ADMIN / CONSULTANCY_ADMIN: Can access any active student in current tenancy.
 * - NUTRITIONIST: Can access any active student in current tenancy according to the consultancy flow.
 * - PERSONAL: Preserves existing behavior (requires active professional-student relationship:
 *             workout assignment, training plan, or consultation).
 * - STUDENT / INFLUENCER: Forbidden from accessing other students' evolution.
 */
export async function canProfessionalAccessStudentEvolution(
  connection: PoolConnection,
  params: {
    consultancyId: number;
    studentMembershipId: number;
    professionalUserId: number;
    effectiveRole: string;
  }
): Promise<boolean> {
  const { consultancyId, studentMembershipId, professionalUserId, effectiveRole } = params;

  if (effectiveRole === "STUDENT" || effectiveRole === "INFLUENCER") {
    return false;
  }

  if (effectiveRole === "ADMIN" || effectiveRole === "CONSULTANCY_ADMIN") {
    return true;
  }

  if (effectiveRole === "NUTRITIONIST") {
    return true;
  }

  if (effectiveRole === "PERSONAL") {
    return assertProfessionalStudentRelationship(connection, {
      consultancyId,
      studentMembershipId,
      professionalUserId,
    });
  }

  return false;
}

async function resolveEvolutionTargetStudent(
  connection: PoolConnection,
  params: {
    userId: number;
    consultancySlug: string;
    studentPublicId?: string;
    effectiveRole?: string;
  }
): Promise<ResolvedTargetStudent | null> {
  const { userId, consultancySlug, studentPublicId, effectiveRole: passedEffectiveRole } = params;

  // 1. Resolve Consultancy
  const [consultancies] = await connection.execute<RowDataPacket[]>(
    `SELECT id, slug, name FROM consultancies WHERE slug = ? LIMIT 1;`,
    [consultancySlug]
  );
  if (!consultancies || consultancies.length === 0) return null;
  const consultancyId = Number(consultancies[0].id);

  if (studentPublicId && studentPublicId.trim()) {
    // Professional / Admin caller accessing a target student
    const context = await resolveConsultancyContext(userId, consultancySlug);
    if (!context) return null;

    let effectiveRole = passedEffectiveRole;
    if (!effectiveRole) {
      try {
        const { resolveEffectiveViewMode } = await import("./view-mode-server");
        const viewModeState = await resolveEffectiveViewMode(consultancySlug, context.roles);
        effectiveRole = viewModeState.effectiveMode;
      } catch {
        const { resolveDefaultPresentationMode } = await import("./view-mode");
        effectiveRole = resolveDefaultPresentationMode(context.roles);
      }
    }

    if (effectiveRole === "STUDENT" || effectiveRole === "INFLUENCER") {
      return null;
    }

    const isPersonal = effectiveRole === "PERSONAL" && context.roles.includes("PERSONAL");
    const isNutritionist = effectiveRole === "NUTRITIONIST" && context.roles.includes("NUTRITIONIST");
    const isAdmin =
      (effectiveRole === "ADMIN" || effectiveRole === "CONSULTANCY_ADMIN") &&
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isPersonal && !isNutritionist && !isAdmin) {
      return null;
    }

    // Resolve target student membership in this consultancy
    // Strictly scoped to consultancyId and status = 'ACTIVE' (zero cross-tenant)
    // Accepts cm.public_id (canonical membership publicId) or u.public_id (user publicId)
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.user_id, cm.status, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [studentPublicId.trim(), studentPublicId.trim(), consultancyId]
    );

    if (!members || members.length === 0) return null;

    const studentMembershipId = Number(members[0].id);
    const studentUserId = Number(members[0].user_id);

    // Apply the canonical evolution access policy
    const hasAccess = await canProfessionalAccessStudentEvolution(connection, {
      consultancyId,
      studentMembershipId,
      professionalUserId: userId,
      effectiveRole,
    });

    if (!hasAccess) {
      return null;
    }

    return {
      consultancyId,
      consultancySlug,
      studentMembershipId,
      studentUserId,
      studentPublicId: String(members[0].public_id),
      studentFullName: String(members[0].full_name),
      studentEmail: String(members[0].email),
    };
  } else {
    // Student caller accessing own evolution
    const access = await resolveStudentModuleAccess(userId, consultancySlug);
    if (!access.allowed || !access.context) return null;

    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.user_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [userId, consultancyId]
    );

    if (!members || members.length === 0) return null;

    return {
      consultancyId,
      consultancySlug,
      studentMembershipId: Number(members[0].id),
      studentUserId: Number(members[0].user_id),
      studentPublicId: String(members[0].public_id),
      studentFullName: String(members[0].full_name),
      studentEmail: String(members[0].email),
    };
  }
}

// --- Evolution 360 Hub Data Query ---

export async function getStudentEvolutionHubData(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId?: string;
  effectiveRole?: string;
}): Promise<EvolutionHubDataDto | null> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    const target = await resolveEvolutionTargetStudent(connection, params);
    if (!target) return null;

    const { consultancyId, consultancySlug, studentMembershipId, studentUserId, studentPublicId, studentFullName, studentEmail } = target;

    await assertStudentMembershipInvariant(connection, {
      consultancyId,
      studentMembershipId,
    });

    // 1. Fetch all student measurements
    const [progressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        spe.public_id,
        DATE_FORMAT(spe.recorded_on, '%Y-%m-%d') AS recorded_on,
        spe.weight_kg,
        spe.waist_cm,
        spe.abdomen_cm,
        spe.hip_cm,
        spe.arm_cm,
        spe.thigh_cm,
        spe.note,
        spe.created_at,
        creator.full_name AS creator_name
       FROM student_progress_entries spe
       JOIN users creator ON creator.id = spe.created_by_user_id
       WHERE spe.consultancy_id = ?
         AND spe.student_membership_id = ?
       ORDER BY spe.recorded_on DESC, spe.created_at DESC, spe.id DESC;`,
      [consultancyId, studentMembershipId]
    );

    const measurementsByDate = new Map<string, StudentProgressMetricsDto>();
    for (const r of progressRows) {
      const date = String(r.recorded_on);
      // If multiple entries on same date, keep the newest created
      if (!measurementsByDate.has(date)) {
        measurementsByDate.set(date, {
          publicId: String(r.public_id),
          recordedOn: date,
          weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
          waistCm: r.waist_cm !== null ? Number(r.waist_cm) : null,
          abdomenCm: r.abdomen_cm !== null ? Number(r.abdomen_cm) : null,
          hipCm: r.hip_cm !== null ? Number(r.hip_cm) : null,
          armCm: r.arm_cm !== null ? Number(r.arm_cm) : null,
          thighCm: r.thigh_cm !== null ? Number(r.thigh_cm) : null,
          note: r.note ? String(r.note) : null,
          createdByName: String(r.creator_name),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
        });
      }
    }

    // 2. Fetch all photo evaluation requests
    const [photoReqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id,
        r.public_id,
        r.status,
        r.instructions,
        r.due_at,
        r.submitted_at,
        r.reviewed_at,
        r.reviewer_notes,
        r.requested_changes_poses_json,
        r.created_at
       FROM student_photo_evaluation_requests r
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.student_user_id = ?
       ORDER BY r.created_at DESC, r.id DESC;`,
      [consultancyId, studentMembershipId, studentUserId]
    );

    // Fetch images for all requests
    const reqIds = photoReqRows.map((r) => r.id);
    const imagesByRequestId = new Map<number, Record<PhotoEvaluationPose, PhotoEvaluationImageDto | null>>();

    if (reqIds.length > 0) {
      const [imgRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          id,
          public_id,
          request_id,
          pose,
          mime_type,
          byte_size,
          uploaded_at,
          updated_at
         FROM student_photo_evaluation_images
         WHERE request_id IN (${reqIds.map(() => "?").join(",")});`,
        reqIds
      );

      for (const reqId of reqIds) {
        imagesByRequestId.set(Number(reqId), {
          FRONT: null,
          RIGHT_SIDE: null,
          BACK: null,
          LEFT_SIDE: null,
        });
      }

      for (const img of imgRows) {
        const reqId = Number(img.request_id);
        const pose = String(img.pose) as PhotoEvaluationPose;
        const reqPublicId = photoReqRows.find((r) => r.id === reqId)?.public_id || "";

        const map = imagesByRequestId.get(reqId);
        if (map && EVALUATION_POSES.includes(pose)) {
          map[pose] = {
            publicId: String(img.public_id),
            pose,
            poseLabel: POSE_LABELS[pose] || pose,
            mimeType: String(img.mime_type),
            byteSize: Number(img.byte_size),
            uploadedAt: new Date(img.uploaded_at).toISOString(),
            updatedAt: new Date(img.updated_at).toISOString(),
            imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${reqPublicId}/images/${pose}`,
          };
        }
      }
    }

    // Identify active pending request (PENDING or CHANGES_REQUESTED or SUBMITTED)
    let activePendingPhotoRequest: EvolutionHubDataDto["activePendingPhotoRequest"] = null;
    const pendingReq = photoReqRows.find(
      (r) => r.status === "PENDING" || r.status === "CHANGES_REQUESTED" || r.status === "SUBMITTED"
    );

    if (pendingReq) {
      const map = imagesByRequestId.get(Number(pendingReq.id));
      const completedCount = map ? EVALUATION_POSES.filter((p) => map[p] !== null).length : 0;
      let requestedChangesPoses: PhotoEvaluationPose[] = [];
      if (pendingReq.requested_changes_poses_json) {
        try {
          requestedChangesPoses = typeof pendingReq.requested_changes_poses_json === "string"
            ? JSON.parse(pendingReq.requested_changes_poses_json)
            : pendingReq.requested_changes_poses_json;
        } catch {
          requestedChangesPoses = [];
        }
      }

      const status = pendingReq.status as PhotoEvaluationStatus;
      const statusLabels: Record<PhotoEvaluationStatus, string> = {
        PENDING: "Aguardando envio",
        SUBMITTED: "Em análise",
        CHANGES_REQUESTED: "Ajustes solicitados",
        APPROVED: "Aprovada",
      };

      activePendingPhotoRequest = {
        publicId: String(pendingReq.public_id),
        status,
        statusLabel: statusLabels[status] || status,
        dueAt: pendingReq.due_at ? new Date(pendingReq.due_at).toISOString() : null,
        instructions: pendingReq.instructions ? String(pendingReq.instructions) : null,
        requestedChangesPoses,
        completedPosesCount: completedCount,
      };
    }

    // Group evaluation requests that have submission dates into milestones
    // Rule 1: EXACT DATE only. No arbitrary multi-day windows.
    // Rule 3: Historical comparison uses APPROVED by default.
    const photosByDate = new Map<string, MilestonePhotoEvaluationDto>();

    for (const r of photoReqRows) {
      // Only evaluations with a submission date or approval date represent a chronological moment
      const momentDate = r.submitted_at
        ? new Date(r.submitted_at).toISOString().split("T")[0]
        : r.created_at
        ? new Date(r.created_at).toISOString().split("T")[0]
        : null;

      if (!momentDate) continue;

      const map = imagesByRequestId.get(Number(r.id)) || {
        FRONT: null,
        RIGHT_SIDE: null,
        BACK: null,
        LEFT_SIDE: null,
      };

      const completedCount = EVALUATION_POSES.filter((p) => map[p] !== null).length;
      let requestedChangesPoses: PhotoEvaluationPose[] = [];
      if (r.requested_changes_poses_json) {
        try {
          requestedChangesPoses = typeof r.requested_changes_poses_json === "string"
            ? JSON.parse(r.requested_changes_poses_json)
            : r.requested_changes_poses_json;
        } catch {
          requestedChangesPoses = [];
        }
      }

      const status = r.status as PhotoEvaluationStatus;
      const statusLabels: Record<PhotoEvaluationStatus, string> = {
        PENDING: "Aguardando envio",
        SUBMITTED: "Em análise",
        CHANGES_REQUESTED: "Ajustes solicitados",
        APPROVED: "Aprovada",
      };

      // If multiple on same date, prefer APPROVED over SUBMITTED over CHANGES_REQUESTED
      const existing = photosByDate.get(momentDate);
      if (!existing || (r.status === "APPROVED" && existing.status !== "APPROVED")) {
        photosByDate.set(momentDate, {
          publicId: String(r.public_id),
          status,
          statusLabel: statusLabels[status] || status,
          submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
          reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
          reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
          requestedChangesPoses,
          images: map,
          completedPosesCount: completedCount,
        });
      }
    }

    // 3. Unify dates into chronological milestones
    // All unique dates from measurements and photos
    const allUniqueDates = Array.from(
      new Set([...measurementsByDate.keys(), ...photosByDate.keys()])
    ).sort((a, b) => a.localeCompare(b)); // Sort ascending for delta computation

    // Build milestones ascending to compute deltas sequentially
    const milestonesAsc: EvolutionMilestoneDto[] = [];
    let lastWeight: number | null = null;
    let lastWaist: number | null = null;
    let lastAbdomen: number | null = null;
    let lastHip: number | null = null;
    let lastArm: number | null = null;
    let lastThigh: number | null = null;

    for (const date of allUniqueDates) {
      const measurement = measurementsByDate.get(date) || null;
      const photos = photosByDate.get(date) || null;

      // Deltas against preceding valid measurement
      const weightDelta = measurement?.weightKg !== null && measurement?.weightKg !== undefined
        ? calculateMetricDelta(lastWeight, measurement.weightKg, "kg", true)
        : null;

      const waistDelta = measurement?.waistCm !== null && measurement?.waistCm !== undefined
        ? calculateMetricDelta(lastWaist, measurement.waistCm, "cm")
        : null;

      const abdomenDelta = measurement?.abdomenCm !== null && measurement?.abdomenCm !== undefined
        ? calculateMetricDelta(lastAbdomen, measurement.abdomenCm, "cm")
        : null;

      const hipDelta = measurement?.hipCm !== null && measurement?.hipCm !== undefined
        ? calculateMetricDelta(lastHip, measurement.hipCm, "cm")
        : null;

      const armDelta = measurement?.armCm !== null && measurement?.armCm !== undefined
        ? calculateMetricDelta(lastArm, measurement.armCm, "cm")
        : null;

      const thighDelta = measurement?.thighCm !== null && measurement?.thighCm !== undefined
        ? calculateMetricDelta(lastThigh, measurement.thighCm, "cm")
        : null;

      // Update state for next delta
      if (measurement?.weightKg !== null && measurement?.weightKg !== undefined) {
        lastWeight = measurement.weightKg;
      }
      if (measurement?.waistCm !== null && measurement?.waistCm !== undefined) {
        lastWaist = measurement.waistCm;
      }
      if (measurement?.abdomenCm !== null && measurement?.abdomenCm !== undefined) {
        lastAbdomen = measurement.abdomenCm;
      }
      if (measurement?.hipCm !== null && measurement?.hipCm !== undefined) {
        lastHip = measurement.hipCm;
      }
      if (measurement?.armCm !== null && measurement?.armCm !== undefined) {
        lastArm = measurement.armCm;
      }
      if (measurement?.thighCm !== null && measurement?.thighCm !== undefined) {
        lastThigh = measurement.thighCm;
      }

      milestonesAsc.push({
        id: `milestone-${date}`,
        date,
        dateDisplay: formatIsoDateToBr(date),
        hasMeasurement: measurement !== null,
        hasPhotos: photos !== null,
        measurement,
        photos,
        weightDelta,
        waistDelta,
        abdomenDelta,
        hipDelta,
        armDelta,
        thighDelta,
      });
    }

    // Timeline view presents newest first
    const milestones = [...milestonesAsc].reverse();

    // 4. Student Summary (Rule 6: NULL handling, no fake 0)
    let initialWeightKg: number | null = null;
    let currentWeightKg: number | null = null;

    const milestonesWithWeight = milestonesAsc.filter((m) => m.measurement?.weightKg !== null && m.measurement?.weightKg !== undefined);
    if (milestonesWithWeight.length > 0) {
      initialWeightKg = milestonesWithWeight[0].measurement!.weightKg;
      currentWeightKg = milestonesWithWeight[milestonesWithWeight.length - 1].measurement!.weightKg;
    }

    const totalWeightDelta = (initialWeightKg !== null && currentWeightKg !== null)
      ? calculateMetricDelta(initialWeightKg, currentWeightKg, "kg", true)
      : null;

    const totalApprovedPhotoEvaluationsCount = Array.from(photosByDate.values()).filter(
      (p) => p.status === "APPROVED"
    ).length;

    const summary: StudentEvolutionSummaryDto = {
      firstRecordedDate: milestonesAsc.length > 0 ? milestonesAsc[0].dateDisplay : null,
      latestRecordedDate: milestonesAsc.length > 0 ? milestonesAsc[milestonesAsc.length - 1].dateDisplay : null,
      initialWeightKg,
      currentWeightKg,
      totalWeightDelta,
      totalMilestonesCount: milestones.length,
      totalApprovedPhotoEvaluationsCount,
    };

    // 5. Native Chart Series (Rule 10: chronologically ordered, real points only)
    const weightSeries = milestonesAsc
      .filter((m) => m.measurement?.weightKg !== null && m.measurement?.weightKg !== undefined)
      .map((m) => ({
        date: m.date,
        dateDisplay: formatShortDateBr(m.date),
        value: m.measurement!.weightKg!,
        formattedValue: formatMetricNumber(m.measurement!.weightKg!, "kg"),
      }));

    const waistSeries = milestonesAsc
      .filter((m) => m.measurement?.waistCm !== null && m.measurement?.waistCm !== undefined)
      .map((m) => ({
        date: m.date,
        dateDisplay: formatShortDateBr(m.date),
        value: m.measurement!.waistCm!,
        formattedValue: formatMetricNumber(m.measurement!.waistCm!, "cm"),
      }));

    const abdomenSeries = milestonesAsc
      .filter((m) => m.measurement?.abdomenCm !== null && m.measurement?.abdomenCm !== undefined)
      .map((m) => ({
        date: m.date,
        dateDisplay: formatShortDateBr(m.date),
        value: m.measurement!.abdomenCm!,
        formattedValue: formatMetricNumber(m.measurement!.abdomenCm!, "cm"),
      }));

    const chartSeries: EvolutionChartSeriesDto = {
      weightSeries,
      waistSeries,
      abdomenSeries,
    };

    // 6. Eligible Comparison Dates
    const eligibleComparisonDates = milestones.map((m) => ({
      date: m.date,
      dateDisplay: m.dateDisplay,
      milestoneId: m.id,
      hasApprovedPhotos: m.photos?.status === "APPROVED",
      hasMeasurement: m.hasMeasurement,
    }));

    return {
      student: {
        publicId: studentPublicId,
        fullName: studentFullName,
        email: studentEmail,
      },
      summary,
      milestones,
      activePendingPhotoRequest,
      chartSeries,
      eligibleComparisonDates,
    };
  } finally {
    if (connection) connection.release();
  }
}

// --- Evolution 360 Multi-Date Comparison ---

export async function getEvolutionComparisonBetweenDates(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId?: string;
  beforeDate?: string;
  afterDate?: string;
  hubData?: EvolutionHubDataDto;
  effectiveRole?: string;
}): Promise<EvolutionComparisonDataDto | null> {
  const hubData = params.hubData || (await getStudentEvolutionHubData(params));
  if (!hubData) return null;

  const { milestones, student } = hubData;

  if (milestones.length < 2) {
    return {
      student,
      beforeMilestone: null,
      afterMilestone: null,
      daysBetween: null,
      metricsComparison: [],
      photoPairs: EVALUATION_POSES.map((pose) => ({
        pose,
        poseLabel: POSE_LABELS[pose] || pose,
        beforeImage: null,
        afterImage: null,
      })),
    };
  }

  // Default: before = oldest milestone, after = newest milestone
  const oldestMilestone = milestones[milestones.length - 1];
  const newestMilestone = milestones[0];

  let selectedBefore = oldestMilestone;
  let selectedAfter = newestMilestone;

  if (params.beforeDate && params.afterDate) {
    const foundBefore = milestones.find((m) => m.date === params.beforeDate);
    const foundAfter = milestones.find((m) => m.date === params.afterDate);

    if (foundBefore && foundAfter && foundBefore.date !== foundAfter.date) {
      // Enforce strict chronological order: older = before, newer = after
      if (foundBefore.date.localeCompare(foundAfter.date) <= 0) {
        selectedBefore = foundBefore;
        selectedAfter = foundAfter;
      } else {
        selectedBefore = foundAfter;
        selectedAfter = foundBefore;
      }
    }
  }

  // Compute days between
  const bTime = new Date(`${selectedBefore.date}T12:00:00Z`).getTime();
  const aTime = new Date(`${selectedAfter.date}T12:00:00Z`).getTime();
  const daysBetween = Math.round(Math.abs(aTime - bTime) / (1000 * 60 * 60 * 24));

  // Compute metrics comparison (Neutral, math-only, no judgment labels)
  const bMeas = selectedBefore.measurement;
  const aMeas = selectedAfter.measurement;

  const metricsComparison: MetricComparisonItemDto[] = [
    {
      label: "Peso Corporal",
      unit: "kg",
      beforeValue: bMeas?.weightKg ?? null,
      afterValue: aMeas?.weightKg ?? null,
      delta: calculateMetricDelta(bMeas?.weightKg, aMeas?.weightKg, "kg", true),
    },
    {
      label: "Cintura",
      unit: "cm",
      beforeValue: bMeas?.waistCm ?? null,
      afterValue: aMeas?.waistCm ?? null,
      delta: calculateMetricDelta(bMeas?.waistCm, aMeas?.waistCm, "cm"),
    },
    {
      label: "Abdômen",
      unit: "cm",
      beforeValue: bMeas?.abdomenCm ?? null,
      afterValue: aMeas?.abdomenCm ?? null,
      delta: calculateMetricDelta(bMeas?.abdomenCm, aMeas?.abdomenCm, "cm"),
    },
    {
      label: "Quadril",
      unit: "cm",
      beforeValue: bMeas?.hipCm ?? null,
      afterValue: aMeas?.hipCm ?? null,
      delta: calculateMetricDelta(bMeas?.hipCm, aMeas?.hipCm, "cm"),
    },
    {
      label: "Braço",
      unit: "cm",
      beforeValue: bMeas?.armCm ?? null,
      afterValue: aMeas?.armCm ?? null,
      delta: calculateMetricDelta(bMeas?.armCm, aMeas?.armCm, "cm"),
    },
    {
      label: "Coxa",
      unit: "cm",
      beforeValue: bMeas?.thighCm ?? null,
      afterValue: aMeas?.thighCm ?? null,
      delta: calculateMetricDelta(bMeas?.thighCm, aMeas?.thighCm, "cm"),
    },
  ];

  // Photo pairs (Rule 3: only APPROVED photos used for comparison pairs)
  const bPhotos = selectedBefore.photos?.status === "APPROVED" ? selectedBefore.photos : null;
  const aPhotos = selectedAfter.photos?.status === "APPROVED" ? selectedAfter.photos : null;

  const photoPairs = EVALUATION_POSES.map((pose) => ({
    pose,
    poseLabel: POSE_LABELS[pose] || pose,
    beforeImage: bPhotos?.images[pose] || null,
    afterImage: aPhotos?.images[pose] || null,
  }));

  return {
    student,
    beforeMilestone: {
      date: selectedBefore.date,
      dateDisplay: selectedBefore.dateDisplay,
      measurement: selectedBefore.measurement,
      photos: selectedBefore.photos,
    },
    afterMilestone: {
      date: selectedAfter.date,
      dateDisplay: selectedAfter.dateDisplay,
      measurement: selectedAfter.measurement,
      photos: selectedAfter.photos,
    },
    daysBetween,
    metricsComparison,
    photoPairs,
  };
}
