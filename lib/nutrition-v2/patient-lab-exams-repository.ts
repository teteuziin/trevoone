/**
 * TREVO ONE — NUTRITION V2 PATIENT LAB EXAMS REPOSITORY
 * Multi-tenant clinical laboratory exams storage, retrieval and validation.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import type { PatientLabExamRecord, LabExamResultItem } from "./clinical-measurements-catalog";
import { parseLabResultRaw, evaluateLabResultAgainstReference } from "./clinical-measurements-catalog";
import { getOrCreatePatientRecord } from "./patient-record-repository";

export interface SaveLabExamInput {
  publicId?: string | null;
  collectionDate: string; // YYYY-MM-DD
  laboratoryName?: string | null;
  method?: string | null;
  notes?: string | null;
  attachmentStorageKey?: string | null;
  attachmentOriginalName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  isSharedWithPatient?: boolean;
  results: Array<{
    id?: string;
    name: string;
    canonicalKey?: string | null;
    resultRaw: string;
    unit: string;
    referenceText?: string | null;
    referenceMin?: number | null;
    referenceMax?: number | null;
    method?: string | null;
    isMeasuredDirectly?: boolean | null;
    notes?: string | null;
  }>;
}

export type SavePatientLabExamInput = SaveLabExamInput;

function mapRowToLabExamRecord(row: RowDataPacket): PatientLabExamRecord {
  let results: LabExamResultItem[] = [];
  if (row.results_json) {
    try {
      const parsed = typeof row.results_json === "string" ? JSON.parse(row.results_json) : row.results_json;
      if (Array.isArray(parsed)) {
        results = parsed.map((item: Record<string, unknown>, idx: number) => {
          const raw = String(item.resultRaw || item.value || "").trim();
          const { numericValue } = parseLabResultRaw(raw);
          const refMin = item.referenceMin !== null && item.referenceMin !== undefined ? Number(item.referenceMin) : null;
          const refMax = item.referenceMax !== null && item.referenceMax !== undefined ? Number(item.referenceMax) : null;
          const refText = item.referenceText ? String(item.referenceText) : null;
          const evalResult = evaluateLabResultAgainstReference(raw, refMin, refMax, refText);

          return {
            id: String(item.id || `exam-${idx + 1}`),
            name: String(item.name || "Exame"),
            canonicalKey: item.canonicalKey ? String(item.canonicalKey) : null,
            resultRaw: raw,
            resultNumeric: numericValue,
            unit: String(item.unit || ""),
            referenceText: refText,
            referenceMin: refMin,
            referenceMax: refMax,
            method: item.method ? String(item.method) : null,
            isMeasuredDirectly: item.isMeasuredDirectly !== undefined ? Boolean(item.isMeasuredDirectly) : null,
            isOutOfRange: evalResult.status === "OUT_OF_RANGE",
            notes: item.notes ? String(item.notes) : null,
          };
        });
      }
    } catch {
      results = [];
    }
  }

  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    patientRecordId: Number(row.patient_record_id),
    collectionDate: typeof row.collection_date === "string"
      ? row.collection_date
      : new Date(row.collection_date).toISOString().slice(0, 10),
    laboratoryName: row.laboratory_name ? String(row.laboratory_name) : null,
    method: row.method ? String(row.method) : null,
    notes: row.notes ? String(row.notes) : null,
    attachmentStorageKey: row.attachment_storage_key ? String(row.attachment_storage_key) : null,
    attachmentOriginalName: row.attachment_original_name ? String(row.attachment_original_name) : null,
    attachmentMimeType: row.attachment_mime_type ? String(row.attachment_mime_type) : null,
    attachmentSizeBytes: row.attachment_size_bytes != null ? Number(row.attachment_size_bytes) : null,
    isSharedWithPatient: Boolean(row.is_shared_with_patient),
    results,
    createdByMembershipId: Number(row.created_by_membership_id),
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export async function listPatientLabExams(
  consultancyId: number,
  studentMembershipId: number
): Promise<PatientLabExamRecord[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ple.*,
        u_cr.full_name AS created_by_name
       FROM nutrition_v2_patient_lab_exams ple
       INNER JOIN nutrition_v2_patient_records pr ON pr.id = ple.patient_record_id
       LEFT JOIN consultancy_members cm_cr ON cm_cr.id = ple.created_by_membership_id
       LEFT JOIN users u_cr ON u_cr.id = cm_cr.user_id
       WHERE ple.consultancy_id = ?
         AND pr.student_membership_id = ?
         AND ple.deleted_at IS NULL
       ORDER BY ple.collection_date DESC, ple.id DESC;`,
      [consultancyId, studentMembershipId]
    );

    return (Array.isArray(rows) ? rows : []).map(mapRowToLabExamRecord);
  } catch (err: unknown) {
    const isMissingTable =
      (err as { code?: string })?.code === "ER_NO_SUCH_TABLE" ||
      String(err).includes("doesn't exist");
    if (isMissingTable) {
      const missingErr = new Error("Tabela de exames laboratoriais (nutrition_v2_patient_lab_exams) não encontrada no banco de dados.");
      (missingErr as unknown as { code: string }).code = "ER_NO_SUCH_TABLE";
      throw missingErr;
    }
    throw err;
  } finally {
    connection.release();
  }
}

export async function savePatientLabExam(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: SaveLabExamInput
): Promise<PatientLabExamRecord> {
  const connection = await getDbConnection();
  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    const publicId = input.publicId && input.publicId.trim() ? input.publicId.trim() : crypto.randomUUID();

    // Sanitize and evaluate results
    const processedResults = (input.results || []).map((r, i) => {
      const raw = String(r.resultRaw || "").trim();
      const { numericValue } = parseLabResultRaw(raw);
      const evalResult = evaluateLabResultAgainstReference(raw, r.referenceMin, r.referenceMax, r.referenceText);

      return {
        id: r.id || `res-${i + 1}-${Date.now()}`,
        name: r.name.trim(),
        canonicalKey: r.canonicalKey || null,
        resultRaw: raw,
        resultNumeric: numericValue,
        unit: (r.unit || "").trim(),
        referenceText: r.referenceText ? r.referenceText.trim() : null,
        referenceMin: r.referenceMin != null ? Number(r.referenceMin) : null,
        referenceMax: r.referenceMax != null ? Number(r.referenceMax) : null,
        method: r.method ? r.method.trim() : null,
        isMeasuredDirectly: r.isMeasuredDirectly != null ? Boolean(r.isMeasuredDirectly) : null,
        isOutOfRange: evalResult.status === "OUT_OF_RANGE",
        notes: r.notes ? r.notes.trim() : null,
      };
    });

    const resultsJson = JSON.stringify(processedResults);

    await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_patient_lab_exams (
        public_id,
        consultancy_id,
        patient_record_id,
        collection_date,
        laboratory_name,
        method,
        notes,
        attachment_storage_key,
        attachment_original_name,
        attachment_mime_type,
        attachment_size_bytes,
        is_shared_with_patient,
        results_json,
        created_by_membership_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        collection_date = VALUES(collection_date),
        laboratory_name = VALUES(laboratory_name),
        method = VALUES(method),
        notes = VALUES(notes),
        attachment_storage_key = VALUES(attachment_storage_key),
        attachment_original_name = VALUES(attachment_original_name),
        attachment_mime_type = VALUES(attachment_mime_type),
        attachment_size_bytes = VALUES(attachment_size_bytes),
        is_shared_with_patient = VALUES(is_shared_with_patient),
        results_json = VALUES(results_json),
        updated_at = CURRENT_TIMESTAMP(3);`,
      [
        publicId,
        consultancyId,
        record.id,
        input.collectionDate,
        input.laboratoryName ? input.laboratoryName.trim() : null,
        input.method ? input.method.trim() : null,
        input.notes ? input.notes.trim() : null,
        input.attachmentStorageKey || null,
        input.attachmentOriginalName || null,
        input.attachmentMimeType || null,
        input.attachmentSizeBytes != null ? input.attachmentSizeBytes : null,
        Boolean(input.isSharedWithPatient),
        resultsJson,
        authorMembershipId,
      ]
    );

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ple.*,
        u_cr.full_name AS created_by_name
       FROM nutrition_v2_patient_lab_exams ple
       LEFT JOIN consultancy_members cm_cr ON cm_cr.id = ple.created_by_membership_id
       LEFT JOIN users u_cr ON u_cr.id = cm_cr.user_id
       WHERE ple.public_id = ?;`,
      [publicId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return mapRowToLabExamRecord(rows[0]);
    }

    // In-memory fallback if immediate select fails
    return {
      id: 0,
      publicId,
      patientRecordId: record.id,
      collectionDate: input.collectionDate,
      laboratoryName: input.laboratoryName || null,
      method: input.method || null,
      notes: input.notes || null,
      isSharedWithPatient: Boolean(input.isSharedWithPatient),
      results: processedResults,
      createdByMembershipId: authorMembershipId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    connection.release();
  }
}

export async function deletePatientLabExam(
  consultancyId: number,
  studentMembershipId: number,
  publicId: string
): Promise<{ success: boolean }> {
  const connection = await getDbConnection();
  try {
    await connection.execute(
      `UPDATE nutrition_v2_patient_lab_exams ple
       INNER JOIN nutrition_v2_patient_records pr ON pr.id = ple.patient_record_id
       SET ple.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE ple.public_id = ?
         AND ple.consultancy_id = ?
         AND pr.student_membership_id = ?;`,
      [publicId, consultancyId, studentMembershipId]
    );
    return { success: true };
  } catch {
    return { success: false };
  } finally {
    connection.release();
  }
}
