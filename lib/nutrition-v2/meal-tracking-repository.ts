/**
 * TREVO ONE — NUTRITION V2 MEAL TRACKING REPOSITORY
 *
 * Etapa 12: Acompanhamento das Refeições
 *
 * Implements:
 * - Upsert of meal tracking logs (create or edit on same day).
 * - Preservation of snapshot fields (meal_title, meal_scheduled_time, plan_version_number).
 * - Daily logs retrieval for patient cockpit.
 * - Multi-day period summary with non-punitive adherence calculation for nutritionist view.
 * - Resilient database query handling.
 */

import { getDbConnection } from "../db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import crypto from "node:crypto";
import type {
  MealTrackingStatus,
  MealNotDoneReason,
  MealTrackingLogDto,
  MealTrackingSubstitutionItem,
  MealTrackingDayGroupDto,
  MealTrackingPeriodSummaryDto,
  MealTrackingDayItemDto,
} from "./meal-tracking-types";
import {
  MEAL_TRACKING_STATUS_LABELS,
  MEAL_NOT_DONE_REASON_LABELS,
} from "./meal-tracking-types";
import type { ValidatedMealTrackingInput } from "./meal-tracking-validation";
import { deleteMealTrackingPhoto } from "./meal-tracking-storage";
import { NutritionAuthorizationError } from "./access";

export interface UpsertMealTrackingParams {
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  consultancySlug: string;
  input: ValidatedMealTrackingInput;
  photoData?: {
    fileStorageKey: string;
    fileSha256: string;
    sizeBytes: number;
    mimeType: string;
  } | null;
  removePhoto?: boolean;
}

function mapRowToDto(row: RowDataPacket, consultancySlug: string): MealTrackingLogDto {
  let substitutions: MealTrackingSubstitutionItem[] = [];
  try {
    if (typeof row.selected_substitutions_json === "string") {
      substitutions = JSON.parse(row.selected_substitutions_json);
    } else if (Array.isArray(row.selected_substitutions_json)) {
      substitutions = row.selected_substitutions_json;
    }
  } catch {
    substitutions = [];
  }

  const hasPhoto = Boolean(row.photo_storage_key);
  const status = row.status as MealTrackingStatus;
  const notDoneReason = (row.not_done_reason as MealNotDoneReason) || null;

  return {
    publicId: String(row.public_id),
    mealDate: String(row.meal_date).slice(0, 10),
    mealPublicId: String(row.meal_public_id),
    mealTitle: String(row.meal_title),
    mealScheduledTime: row.meal_scheduled_time ? String(row.meal_scheduled_time) : null,
    status,
    statusLabel: MEAL_TRACKING_STATUS_LABELS[status] || status,
    notDoneReason,
    notDoneReasonLabel: notDoneReason ? MEAL_NOT_DONE_REASON_LABELS[notDoneReason] || notDoneReason : null,
    consumedAtTime: row.consumed_at_time ? String(row.consumed_at_time) : null,
    notes: row.notes ? String(row.notes) : null,
    substitutions,
    hasPhoto,
    photoUrl: hasPhoto
      ? `/api/consultancies/${consultancySlug}/nutricao/refeicoes/fotos/${row.public_id}`
      : null,
    photoSizeBytes: row.photo_size_bytes ? Number(row.photo_size_bytes) : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Upserts a meal tracking log.
 * If a record already exists for (consultancy_id, student_membership_id, meal_date, meal_public_id),
 * updates it in-place and safely cleans up old photo file if replaced/removed.
 */
export async function upsertMealTrackingLog(
  params: UpsertMealTrackingParams
): Promise<MealTrackingLogDto> {
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    // 1. Check existing log
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status, not_done_reason, consumed_at_time, notes, substitutions_json, photo_storage_key, updated_at
       FROM nutrition_v2_meal_tracking_logs
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND meal_date = ?
         AND meal_public_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [
        params.consultancyId,
        params.studentMembershipId,
        params.input.mealDate,
        params.input.mealPublicId,
      ]
    );

    const substitutionsJson =
      params.input.substitutions.length > 0
        ? JSON.stringify(params.input.substitutions)
        : null;

    let targetPublicId: string;

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // UPDATE existing log
      const existing = existingRows[0];
      targetPublicId = String(existing.public_id);

      // Concurrency & Out-of-Order protection:
      // If client supplied expectedUpdatedAt, compare against authoritative database revision.
      const existingUpdatedAtMs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const expectedUpdatedAtMs = params.input.expectedUpdatedAt ? new Date(params.input.expectedUpdatedAt).getTime() : null;

      if (expectedUpdatedAtMs !== null && !isNaN(expectedUpdatedAtMs) && Math.abs(existingUpdatedAtMs - expectedUpdatedAtMs) > 1000) {
        // Check idempotency:
        const sameStatus = existing.status === params.input.status;
        const sameReason = (existing.not_done_reason || null) === (params.input.notDoneReason || null);
        const sameTime = (existing.consumed_at_time || null) === (params.input.consumedAtTime || null);
        const sameNotes = (existing.notes || null) === (params.input.notes || null);
        const sameSubs = (existing.substitutions_json || null) === substitutionsJson;
        const noNewPhoto = !params.photoData && !params.removePhoto;

        if (sameStatus && sameReason && sameTime && sameNotes && sameSubs && noNewPhoto) {
          // Idempotent retry: commit and return existing state without duplicate write
          await connection.commit();
          const [freshRows] = await connection.execute<RowDataPacket[]>(
            `SELECT * FROM nutrition_v2_meal_tracking_logs WHERE id = ? LIMIT 1;`,
            [existing.id]
          );
          if (Array.isArray(freshRows) && freshRows.length > 0) {
            return mapRowToDto(freshRows[0], params.consultancySlug);
          }
          return mapRowToDto(existing, params.consultancySlug);
        }

        // True concurrent conflict:
        await connection.rollback();
        throw new NutritionAuthorizationError(
          "Este registro de refeição foi alterado em outra sessão. Suas alterações foram preservadas na tela; verifique antes de salvar novamente.",
          "CONCURRENT_MODIFICATION",
          409
        );
      }

      const oldPhotoKey = existing.photo_storage_key ? String(existing.photo_storage_key) : null;

      let newPhotoKey = oldPhotoKey;
      let newPhotoSha = null;
      let newPhotoSize = null;
      let newPhotoMime = null;

      if (params.photoData) {
        newPhotoKey = params.photoData.fileStorageKey;
        newPhotoSha = params.photoData.fileSha256;
        newPhotoSize = params.photoData.sizeBytes;
        newPhotoMime = params.photoData.mimeType;

        // Delete old photo if different
        if (oldPhotoKey && oldPhotoKey !== newPhotoKey) {
          await deleteMealTrackingPhoto(oldPhotoKey);
        }
      } else if (params.removePhoto) {
        newPhotoKey = null;
        if (oldPhotoKey) {
          await deleteMealTrackingPhoto(oldPhotoKey);
        }
      }

      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_meal_tracking_logs
         SET author_membership_id = ?,
             meal_title = ?,
             meal_scheduled_time = ?,
             status = ?,
             not_done_reason = ?,
             consumed_at_time = ?,
             notes = ?,
             selected_substitutions_json = ?,
             photo_storage_key = COALESCE(?, photo_storage_key),
             photo_sha256 = CASE WHEN ? IS NOT NULL THEN ? ELSE photo_sha256 END,
             photo_size_bytes = CASE WHEN ? IS NOT NULL THEN ? ELSE photo_size_bytes END,
             photo_mime_type = CASE WHEN ? IS NOT NULL THEN ? ELSE photo_mime_type END,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [
          params.authorMembershipId,
          params.input.mealTitle,
          params.input.mealScheduledTime,
          params.input.status,
          params.input.notDoneReason,
          params.input.consumedAtTime,
          params.input.notes,
          substitutionsJson,
          params.removePhoto ? null : newPhotoKey,
          params.removePhoto ? null : newPhotoSha,
          newPhotoSha,
          params.removePhoto ? null : newPhotoSize,
          newPhotoSize,
          params.removePhoto ? null : newPhotoMime,
          newPhotoMime,
          existing.id,
        ]
      );

      if (params.removePhoto) {
        await connection.execute(
          `UPDATE nutrition_v2_meal_tracking_logs
           SET photo_storage_key = NULL, photo_sha256 = NULL, photo_size_bytes = NULL, photo_mime_type = NULL
           WHERE id = ?;`,
          [existing.id]
        );
      }
    } else {
      // INSERT new log
      targetPublicId = crypto.randomUUID();

      await connection.execute<ResultSetHeader>(
        `INSERT INTO nutrition_v2_meal_tracking_logs (
           public_id,
           consultancy_id,
           student_membership_id,
           author_membership_id,
           meal_date,
           plan_id,
           plan_version_id,
           plan_version_number,
           meal_id,
           meal_public_id,
           meal_title,
           meal_scheduled_time,
           status,
           not_done_reason,
           consumed_at_time,
           notes,
           selected_substitutions_json,
           photo_storage_key,
           photo_sha256,
           photo_size_bytes,
           photo_mime_type,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          targetPublicId,
          params.consultancyId,
          params.studentMembershipId,
          params.authorMembershipId,
          params.input.mealDate,
          params.input.planId,
          params.input.planVersionId,
          params.input.planVersionNumber,
          params.input.mealId,
          params.input.mealPublicId,
          params.input.mealTitle,
          params.input.mealScheduledTime,
          params.input.status,
          params.input.notDoneReason,
          params.input.consumedAtTime,
          params.input.notes,
          substitutionsJson,
          params.photoData?.fileStorageKey || null,
          params.photoData?.fileSha256 || null,
          params.photoData?.sizeBytes || null,
          params.photoData?.mimeType || null,
        ]
      );
    }

    await connection.commit();

    // Fetch the updated row to return authoritative DTO
    const [savedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_meal_tracking_logs WHERE public_id = ? LIMIT 1;`,
      [targetPublicId]
    );

    return mapRowToDto(savedRows[0], params.consultancySlug);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Returns all meal tracking logs for a specific student and date.
 */
export async function getMealTrackingLogsForStudentAndDate(
  consultancyId: number,
  studentMembershipId: number,
  mealDate: string,
  consultancySlug: string
): Promise<MealTrackingLogDto[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT *
       FROM nutrition_v2_meal_tracking_logs
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND meal_date = ?
         AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      [consultancyId, studentMembershipId, mealDate]
    );

    return (rows as RowDataPacket[]).map((r) => mapRowToDto(r, consultancySlug));
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "ER_NO_SUCH_TABLE") {
      return [];
    }
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Returns a single meal tracking log by its public ID.
 */
export async function getMealTrackingLogByPublicId(
  consultancyId: number,
  logPublicId: string,
  consultancySlug: string
): Promise<MealTrackingLogDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT *
       FROM nutrition_v2_meal_tracking_logs
       WHERE consultancy_id = ?
         AND public_id = ?
         AND deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, logPublicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRowToDto(rows[0], consultancySlug);
  } finally {
    connection.release();
  }
}

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDatePtBr(ymd: string): string {
  try {
    const [year, month, day] = ymd.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
    const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capWeekday}, ${dayMonth}`;
  } catch {
    return ymd;
  }
}

/**
 * Calculates adherence and compiles the meal tracking summary for a student over a period.
 *
 * NON-PUNITIVE ADHERENCE RULES:
 * - Days without active plan are NOT counted in the denominator.
 * - Future days and future meals today without logs are NOT penalized.
 * - "Não fiz" reasons are captured.
 * - Both COMPLETED and COMPLETED_WITH_CHANGES count as adhered meals.
 */
export async function getMealTrackingSummaryForStudent(
  consultancyId: number,
  studentMembershipId: number,
  consultancySlug: string,
  startDateStr: string,
  endDateStr: string
): Promise<MealTrackingPeriodSummaryDto> {
  const connection = await getDbConnection();
  try {
    const todayYmd = formatDateToYMD(new Date());

    // 1. Fetch all assignments active during or overlapping the range
    const [assignmentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT a.id, a.nutrition_plan_version_id, a.starts_on, a.ends_on,
              pv.title AS plan_title, pv.version_number
       FROM nutrition_v2_assignments a
       JOIN nutrition_v2_plan_versions pv ON pv.id = a.nutrition_plan_version_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'ACTIVE'
         AND a.deleted_at IS NULL
         AND a.starts_on <= ?
         AND (a.ends_on IS NULL OR a.ends_on >= ?)
       ORDER BY a.starts_on DESC, a.id DESC;`,
      [consultancyId, studentMembershipId, endDateStr, startDateStr]
    );

    // 2. Fetch meals and structured items for the relevant plan versions
    const versionIds = (assignmentRows as RowDataPacket[]).map((r) => Number(r.nutrition_plan_version_id));
    const mealsByVersionId = new Map<
      number,
      {
        id: number;
        publicId: string;
        title: string;
        scheduledTime: string | null;
        sortOrder: number;
        itemsDescription: string[];
        substitutionsAvailable: {
          originalFoodName: string;
          options: { foodName: string; quantityFormatted?: string }[];
        }[];
      }[]
    >();

    if (versionIds.length > 0) {
      const placeholders = versionIds.map(() => "?").join(",");
      const [mealRows] = await connection.execute<RowDataPacket[]>(
        `SELECT m.id, m.public_id, m.nutrition_plan_version_id, m.title, m.scheduled_time, m.sort_order
         FROM nutrition_v2_meals m
         WHERE m.nutrition_plan_version_id IN (${placeholders})
           AND m.deleted_at IS NULL
         ORDER BY m.nutrition_plan_version_id, m.sort_order ASC;`,
        versionIds
      );

      // Fetch meal items and their substitutions
      const mealIds = (mealRows as RowDataPacket[]).map((m) => Number(m.id));
      const itemsByMealId = new Map<number, string[]>();
      const substitutionsByMealId = new Map<
        number,
        {
          originalFoodName: string;
          options: { foodName: string; quantityFormatted?: string }[];
        }[]
      >();

      if (mealIds.length > 0) {
        const mealPlaceholders = mealIds.map(() => "?").join(",");
        const [itemRows] = await connection.execute<RowDataPacket[]>(
          `SELECT mi.id, mi.meal_id, mi.food_name_snapshot, mi.prescribed_quantity, mi.prescribed_unit_label
           FROM nutrition_v2_meal_items mi
           WHERE mi.meal_id IN (${mealPlaceholders})
             AND mi.deleted_at IS NULL
           ORDER BY mi.meal_id, mi.sort_order ASC;`,
          mealIds
        );

        for (const it of itemRows as RowDataPacket[]) {
          const mId = Number(it.meal_id);
          const desc = it.prescribed_quantity
            ? `${it.food_name_snapshot} (${it.prescribed_quantity} ${it.prescribed_unit_label || ""})`.trim()
            : String(it.food_name_snapshot);

          if (!itemsByMealId.has(mId)) {
            itemsByMealId.set(mId, []);
          }
          itemsByMealId.get(mId)!.push(desc);
        }

        const itemIds = (itemRows as RowDataPacket[]).map((it) => Number(it.id));
        if (itemIds.length > 0) {
          const itemPlaceholders = itemIds.map(() => "?").join(",");
          const [subRows] = await connection.execute<RowDataPacket[]>(
            `SELECT sub.meal_item_id, sub.food_name_snapshot, sub.prescribed_quantity, sub.prescribed_unit_label,
                    mi.meal_id, mi.food_name_snapshot AS original_food_name
             FROM nutrition_v2_item_substitutions sub
             JOIN nutrition_v2_meal_items mi ON mi.id = sub.meal_item_id
             WHERE sub.meal_item_id IN (${itemPlaceholders})
               AND sub.deleted_at IS NULL
             ORDER BY sub.sort_order ASC;`,
            itemIds
          );

          for (const sub of subRows as RowDataPacket[]) {
            const mId = Number(sub.meal_id);
            if (!substitutionsByMealId.has(mId)) {
              substitutionsByMealId.set(mId, []);
            }
            const existingGroup = substitutionsByMealId
              .get(mId)!
              .find((g) => g.originalFoodName === String(sub.original_food_name));

            const opt = {
              foodName: String(sub.food_name_snapshot),
              quantityFormatted: sub.prescribed_quantity
                ? `${sub.prescribed_quantity} ${sub.prescribed_unit_label || ""}`.trim()
                : undefined,
            };

            if (existingGroup) {
              existingGroup.options.push(opt);
            } else {
              substitutionsByMealId.get(mId)!.push({
                originalFoodName: String(sub.original_food_name),
                options: [opt],
              });
            }
          }
        }
      }

      for (const m of mealRows as RowDataPacket[]) {
        const vId = Number(m.nutrition_plan_version_id);
        if (!mealsByVersionId.has(vId)) {
          mealsByVersionId.set(vId, []);
        }
        mealsByVersionId.get(vId)!.push({
          id: Number(m.id),
          publicId: String(m.public_id),
          title: String(m.title),
          scheduledTime: m.scheduled_time ? String(m.scheduled_time).slice(0, 5) : null,
          sortOrder: Number(m.sort_order),
          itemsDescription: itemsByMealId.get(Number(m.id)) || [],
          substitutionsAvailable: substitutionsByMealId.get(Number(m.id)) || [],
        });
      }
    }

    // 3. Fetch tracking logs within the date range
    let logs: RowDataPacket[] = [];
    try {
      const [lRows] = await connection.execute<RowDataPacket[]>(
        `SELECT *
         FROM nutrition_v2_meal_tracking_logs
         WHERE consultancy_id = ?
           AND student_membership_id = ?
           AND meal_date BETWEEN ? AND ?
           AND deleted_at IS NULL
         ORDER BY meal_date DESC, created_at ASC;`,
        [consultancyId, studentMembershipId, startDateStr, endDateStr]
      );
      logs = lRows as RowDataPacket[];
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== "ER_NO_SUCH_TABLE") {
        throw e;
      }
    }

    // Map logs by "date:meal_public_id"
    const logsByDateAndMeal = new Map<string, MealTrackingLogDto>();
    for (const logRow of logs) {
      const d = String(logRow.meal_date).slice(0, 10);
      const mPublicId = String(logRow.meal_public_id);
      const dto = mapRowToDto(logRow, consultancySlug);
      logsByDateAndMeal.set(`${d}:${mPublicId}`, dto);
    }

    // 4. Build day-by-day array from endDate down to startDate
    const days: MealTrackingDayGroupDto[] = [];
    const curDate = new Date(`${endDateStr}T12:00:00Z`);
    const minDate = new Date(`${startDateStr}T12:00:00Z`);

    let totalDaysWithPlan = 0;
    let totalExpectedMeals = 0;
    let totalCompleted = 0;
    let totalCompletedWithChanges = 0;
    let totalNotDone = 0;
    let totalUnregistered = 0;

    while (curDate >= minDate) {
      const ymd = formatDateToYMD(curDate);
      const isFutureDay = ymd > todayYmd;

      // Find which assignment covers this day
      const activeAssign = (assignmentRows as RowDataPacket[]).find((a) => {
        const start = String(a.starts_on).slice(0, 10);
        const end = a.ends_on ? String(a.ends_on).slice(0, 10) : null;
        return start <= ymd && (!end || end >= ymd);
      });

      const dayMeals: MealTrackingDayItemDto[] = [];
      let dayCompleted = 0;
      let dayCompletedWithChanges = 0;
      let dayNotDone = 0;
      let dayUnregistered = 0;

      if (activeAssign) {
        if (!isFutureDay) {
          totalDaysWithPlan++;
        }
        const vId = Number(activeAssign.nutrition_plan_version_id);
        const mealsList = mealsByVersionId.get(vId) || [];

        for (const m of mealsList) {
          const log = logsByDateAndMeal.get(`${ymd}:${m.publicId}`) || null;

          if (log) {
            if (log.status === "COMPLETED") {
              dayCompleted++;
              if (!isFutureDay) totalCompleted++;
            } else if (log.status === "COMPLETED_WITH_CHANGES") {
              dayCompletedWithChanges++;
              if (!isFutureDay) totalCompletedWithChanges++;
            } else if (log.status === "NOT_DONE") {
              dayNotDone++;
              if (!isFutureDay) totalNotDone++;
            }
          } else {
            // Unregistered
            if (!isFutureDay) {
              dayUnregistered++;
              totalUnregistered++;
            }
          }

          if (!isFutureDay) {
            totalExpectedMeals++;
          }

          dayMeals.push({
            mealPublicId: m.publicId,
            mealTitle: m.title,
            mealScheduledTime: m.scheduledTime,
            itemsDescription: m.itemsDescription,
            substitutionsAvailable: m.substitutionsAvailable,
            tracking: log,
          });
        }
      }

      const dayAdhered = dayCompleted + dayCompletedWithChanges;
      const dayTotalValid = dayCompleted + dayCompletedWithChanges + dayNotDone + dayUnregistered;
      const dayAdherenceRate = dayTotalValid > 0 ? Math.round((dayAdhered / dayTotalValid) * 100) : 100;

      days.push({
        date: ymd,
        dateFormatted: formatDatePtBr(ymd),
        hasActivePlan: Boolean(activeAssign),
        planTitle: activeAssign ? String(activeAssign.plan_title) : null,
        planVersionNumber: activeAssign ? Number(activeAssign.version_number) : null,
        meals: dayMeals,
        adherenceRate: dayAdherenceRate,
        completedCount: dayCompleted,
        completedWithChangesCount: dayCompletedWithChanges,
        notDoneCount: dayNotDone,
        unregisteredCount: dayUnregistered,
      });

      curDate.setDate(curDate.getDate() - 1);
    }

    const totalAdheredMeals = totalCompleted + totalCompletedWithChanges;
    const adherencePercentage =
      totalExpectedMeals > 0 ? Math.round((totalAdheredMeals / totalExpectedMeals) * 100) : 100;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalDaysWithPlan,
      totalExpectedMeals,
      totalCompleted,
      totalCompletedWithChanges,
      totalNotDone,
      totalUnregistered,
      totalAdheredMeals,
      adherencePercentage,
      hasSufficientData: totalDaysWithPlan > 0 && totalExpectedMeals > 0,
      days,
    };
  } finally {
    connection.release();
  }
}
