import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export type ConsumeRateLimitParams = {
  scope: string;
  identifier: string;
  maxAttempts: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  attempts: number;
  maxAttempts: number;
  resetInSeconds: number;
  degraded?: boolean;
};

let hasLoggedMissingSecretWarning = false;
let lastCleanupTime = 0;
const CLEANUP_THROTTLE_MS = 60 * 1000; // at most once every 60 seconds per process

/**
 * Derives a deterministic, privacy-preserving 64-character hex HMAC key for a given scope and identifier.
 * Uses domain separation: "trevo-one:auth-rate-limit:v1:<scope>:<identifier>".
 * Returns null if the HMAC secret is not configured in the environment.
 */
export function getRateLimitKeyHash(scope: string, identifier: string): string | null {
  const secret = process.env.AUTH_RATE_LIMIT_HMAC_SECRET;
  if (!secret || secret.trim() === "") {
    if (!hasLoggedMissingSecretWarning) {
      hasLoggedMissingSecretWarning = true;
      console.warn(
        "[AUTH_RATE_LIMIT] Configuration Warning: AUTH_RATE_LIMIT_HMAC_SECRET is not configured. Rate limiting is running in degraded fail-open mode."
      );
    }
    return null;
  }

  const message = `trevo-one:auth-rate-limit:v1:${scope}:${identifier}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Atomically consumes an attempt against a fixed-window rate limiter in MySQL.
 *
 * Fixed Window Rules:
 * 1. If no window exists or existing window expired: starts a new window (attempts = 1, expires_at = now + windowSeconds).
 * 2. If active window exists: increments attempts (capped at maxAttempts + 1) without modifying original expires_at.
 * 3. Subsequent attempts within the active window CANNOT extend expires_at.
 * 4. Fails open on operational errors to avoid global service outages.
 */
export async function consumeAuthRateLimit({
  scope,
  identifier,
  maxAttempts,
  windowSeconds,
}: ConsumeRateLimitParams): Promise<RateLimitResult> {
  const keyHash = getRateLimitKeyHash(scope, identifier);

  // If secret is missing, fail-open gracefully in degraded mode
  if (!keyHash) {
    return {
      allowed: true,
      attempts: 0,
      maxAttempts,
      resetInSeconds: 0,
      degraded: true,
    };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock existing rate limit row FOR UPDATE
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT attempts, expires_at, (expires_at <= UTC_TIMESTAMP(3)) AS is_expired
       FROM auth_rate_limits
       WHERE scope = ? AND key_hash = ?
       FOR UPDATE;`,
      [scope, keyHash]
    );

    let resultingAttempts = 1;
    let isBlocked = false;
    let resetInSeconds = windowSeconds;

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      const isExpired = Boolean(row.is_expired);
      const rowExpiresAt = new Date(row.expires_at).getTime();
      const nowMs = Date.now();

      if (isExpired || rowExpiresAt <= nowMs) {
        // Window has expired -> reset to new window
        await connection.execute(
          `UPDATE auth_rate_limits
           SET attempts = 1,
               window_start_at = UTC_TIMESTAMP(3),
               expires_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND)
           WHERE scope = ? AND key_hash = ?;`,
          [windowSeconds, scope, keyHash]
        );
        resultingAttempts = 1;
        resetInSeconds = windowSeconds;
        isBlocked = false;
      } else {
        // Window is currently ACTIVE -> increment counter up to cap, NEVER extend expires_at
        const prevAttempts = Number(row.attempts);
        const cap = maxAttempts + 1;
        resultingAttempts = Math.min(prevAttempts + 1, cap);
        resetInSeconds = Math.max(1, Math.ceil((rowExpiresAt - nowMs) / 1000));

        await connection.execute(
          `UPDATE auth_rate_limits
           SET attempts = ?
           WHERE scope = ? AND key_hash = ?;`,
          [resultingAttempts, scope, keyHash]
        );
        isBlocked = resultingAttempts > maxAttempts;
      }
    } else {
      // Row does not exist -> insert initial window
      await connection.execute(
        `INSERT INTO auth_rate_limits (scope, key_hash, attempts, window_start_at, expires_at)
         VALUES (?, ?, 1, UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND))
         ON DUPLICATE KEY UPDATE
           attempts = IF(expires_at <= UTC_TIMESTAMP(3), 1, LEAST(attempts + 1, ? + 1)),
           window_start_at = IF(expires_at <= UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), window_start_at),
           expires_at = IF(expires_at <= UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND), expires_at);`,
        [scope, keyHash, windowSeconds, maxAttempts, windowSeconds]
      );
      resultingAttempts = 1;
      resetInSeconds = windowSeconds;
      isBlocked = false;
    }

    await connection.commit();

    // Trigger non-blocking lazy cleanup for old expired records
    triggerLazyCleanup();

    return {
      allowed: !isBlocked,
      attempts: resultingAttempts,
      maxAttempts,
      resetInSeconds,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    // Fail open with sanitized server log
    console.warn(
      `[AUTH_RATE_LIMIT] Operational error in scope ${scope}:`,
      (err as Error)?.message || "DB transaction error"
    );
    return {
      allowed: true,
      attempts: 0,
      maxAttempts,
      resetInSeconds: 0,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Clears the rate limit counter for a specific scope and identifier (e.g. after successful login).
 */
export async function clearAuthRateLimit(
  scope: string,
  identifier: string
): Promise<boolean> {
  const keyHash = getRateLimitKeyHash(scope, identifier);
  if (!keyHash) {
    return false;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.execute(
      `DELETE FROM auth_rate_limits WHERE scope = ? AND key_hash = ?;`,
      [scope, keyHash]
    );
    return true;
  } catch (err) {
    console.warn(
      `[AUTH_RATE_LIMIT] Error clearing limiter for scope ${scope}:`,
      (err as Error)?.message || "DB error"
    );
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Executes a lightweight background cleanup of expired rate limit rows older than 1 day.
 * Throttled to run at most once per minute per Node worker process.
 */
function triggerLazyCleanup(): void {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_THROTTLE_MS) {
    return;
  }
  lastCleanupTime = now;

  getDbConnection()
    .then(async (cleanupConn) => {
      try {
        await cleanupConn.execute(
          `DELETE FROM auth_rate_limits
           WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)
           LIMIT 50;`
        );
      } catch {
        // Ignore background cleanup errors
      } finally {
        cleanupConn.release();
      }
    })
    .catch(() => {});
}
