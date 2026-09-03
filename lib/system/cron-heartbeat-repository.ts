import { getDbPool } from "@/lib/db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export const CRON_JOB_CONSULTATION_REMINDERS = "consultation_reminders";

export type CronHeartbeatResult = "STARTED" | "SUCCESS" | "FAILED";

export interface CronHeartbeatStats {
  processed: number;
  created: number;
  skipped: number;
}

export interface CronHeartbeatRecord {
  job_name: string;
  last_started_at: Date | null;
  last_succeeded_at: Date | null;
  last_failed_at: Date | null;
  last_result: CronHeartbeatResult;
  processed_count: number;
  created_count: number;
  skipped_count: number;
  last_error_code: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CronHeartbeatRow extends RowDataPacket {
  job_name: string;
  last_started_at: Date | null;
  last_succeeded_at: Date | null;
  last_failed_at: Date | null;
  last_result: string;
  processed_count: number;
  created_count: number;
  skipped_count: number;
  last_error_code: string | null;
  created_at: Date;
  updated_at: Date;
}

const ALLOWED_ERROR_CODES = new Set(["PROCESSING_FAILED", "HEARTBEAT_FAILED"]);

/**
 * Records the start of an authenticated cron job execution.
 * Guaranteed O(1) single-row UPSERT per job_name.
 */
export async function markCronStarted(jobName: string): Promise<void> {
  const pool = getDbPool();
  await pool.execute<ResultSetHeader>(
    `INSERT INTO system_cron_heartbeats (
       job_name,
       last_started_at,
       last_result,
       created_at,
       updated_at
     ) VALUES (
       ?,
       CURRENT_TIMESTAMP(3),
       'STARTED',
       CURRENT_TIMESTAMP(3),
       CURRENT_TIMESTAMP(3)
     )
     ON DUPLICATE KEY UPDATE
       last_started_at = CURRENT_TIMESTAMP(3),
       last_result = 'STARTED',
       updated_at = CURRENT_TIMESTAMP(3)`,
    [jobName]
  );
}

/**
 * Records the successful completion of an authenticated cron job execution.
 * Guaranteed O(1) single-row UPSERT per job_name.
 */
export async function markCronSucceeded(
  jobName: string,
  stats: CronHeartbeatStats
): Promise<void> {
  const pool = getDbPool();
  const safeProcessed = Math.max(0, Math.floor(stats.processed || 0));
  const safeCreated = Math.max(0, Math.floor(stats.created || 0));
  const safeSkipped = Math.max(0, Math.floor(stats.skipped || 0));

  await pool.execute<ResultSetHeader>(
    `INSERT INTO system_cron_heartbeats (
       job_name,
       last_succeeded_at,
       last_result,
       processed_count,
       created_count,
       skipped_count,
       last_error_code,
       created_at,
       updated_at
     ) VALUES (
       ?,
       CURRENT_TIMESTAMP(3),
       'SUCCESS',
       ?,
       ?,
       ?,
       NULL,
       CURRENT_TIMESTAMP(3),
       CURRENT_TIMESTAMP(3)
     )
     ON DUPLICATE KEY UPDATE
       last_succeeded_at = CURRENT_TIMESTAMP(3),
       last_result = 'SUCCESS',
       processed_count = VALUES(processed_count),
       created_count = VALUES(created_count),
       skipped_count = VALUES(skipped_count),
       last_error_code = NULL,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [jobName, safeProcessed, safeCreated, safeSkipped]
  );
}

/**
 * Records a failure during an authenticated cron job execution.
 * Stores only fixed, sanitized error codes (no stack traces, no PII, no messages).
 */
export async function markCronFailed(
  jobName: string,
  errorCode = "PROCESSING_FAILED"
): Promise<void> {
  const pool = getDbPool();
  const sanitizedCode = ALLOWED_ERROR_CODES.has(errorCode)
    ? errorCode
    : "PROCESSING_FAILED";

  await pool.execute<ResultSetHeader>(
    `INSERT INTO system_cron_heartbeats (
       job_name,
       last_failed_at,
       last_result,
       last_error_code,
       created_at,
       updated_at
     ) VALUES (
       ?,
       CURRENT_TIMESTAMP(3),
       'FAILED',
       ?,
       CURRENT_TIMESTAMP(3),
       CURRENT_TIMESTAMP(3)
     )
     ON DUPLICATE KEY UPDATE
       last_failed_at = CURRENT_TIMESTAMP(3),
       last_result = 'FAILED',
       last_error_code = VALUES(last_error_code),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [jobName, sanitizedCode]
  );
}

/**
 * Retrieves the current heartbeat status for a given cron job.
 */
export async function getCronHeartbeat(
  jobName: string
): Promise<CronHeartbeatRecord | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<CronHeartbeatRow[]>(
    `SELECT
       job_name,
       last_started_at,
       last_succeeded_at,
       last_failed_at,
       last_result,
       processed_count,
       created_count,
       skipped_count,
       last_error_code,
       created_at,
       updated_at
     FROM system_cron_heartbeats
     WHERE job_name = ?
     LIMIT 1`,
    [jobName]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    job_name: row.job_name,
    last_started_at: row.last_started_at ? new Date(row.last_started_at) : null,
    last_succeeded_at: row.last_succeeded_at ? new Date(row.last_succeeded_at) : null,
    last_failed_at: row.last_failed_at ? new Date(row.last_failed_at) : null,
    last_result: row.last_result as CronHeartbeatResult,
    processed_count: Number(row.processed_count || 0),
    created_count: Number(row.created_count || 0),
    skipped_count: Number(row.skipped_count || 0),
    last_error_code: row.last_error_code || null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
