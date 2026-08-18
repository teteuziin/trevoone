import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  hashPassword,
  isValidAuthEmail,
  normalizeAuthEmail,
  validatePasswordPolicy,
} from "./password";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_MAX_ISSUES_PER_HOUR = 5;
export const PASSWORD_RESET_RATE_WINDOW_MINUTES = 60;

// Base64url encoded 32 bytes produces 43 characters
const TOKEN_FORMAT_REGEX = /^[A-Za-z0-9_-]{40,50}$/;

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generatePasswordResetToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
}

export function validatePasswordResetTokenFormat(rawToken: unknown): string | null {
  if (typeof rawToken !== "string") {
    return null;
  }
  const trimmed = rawToken.trim();
  if (!TOKEN_FORMAT_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export type RequestPasswordResetResult = {
  success: boolean;
  rawTokenForDelivery?: string;
  userEmail?: string;
};

/**
 * Creates a password reset token for the specified email if an active user exists
 * and the per-account rate limit rules (60s cooldown, max 5 issues/hour) are satisfied.
 * Uses SELECT ... FOR UPDATE on the user row to serialize concurrent requests for the same account.
 * Returns a generic success status regardless of whether the user exists or is rate-limited to prevent enumeration.
 */
export async function requestPasswordReset(
  rawEmail: string
): Promise<RequestPasswordResetResult> {
  const email = normalizeAuthEmail(rawEmail);

  if (!isValidAuthEmail(email)) {
    return { success: true };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock the eligible user row FOR UPDATE to serialize concurrent requests for the same account
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, email, status, deleted_at
       FROM users
       WHERE email = ?
       FOR UPDATE;`,
      [email]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.commit();
      return { success: true };
    }

    const user = rows[0];
    if (user.status !== "ACTIVE" || user.deleted_at !== null) {
      await connection.commit();
      return { success: true };
    }

    const targetUserId = Number(user.id);

    // 2. Check per-account rate limit (cooldown & hourly quota)
    // Counts all non-revoked token emissions (active, used, and expired) in the rolling window.
    // Revoked tokens (e.g. failed SMTP deliveries) are excluded (revoked_at IS NULL).
    const [rateRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS hourly_count,
         SUM(CASE WHEN created_at > UTC_TIMESTAMP(3) - INTERVAL ? SECOND THEN 1 ELSE 0 END) AS cooldown_count
       FROM password_reset_tokens
       WHERE user_id = ?
         AND revoked_at IS NULL
         AND created_at > UTC_TIMESTAMP(3) - INTERVAL ? MINUTE;`,
      [
        PASSWORD_RESET_COOLDOWN_SECONDS,
        targetUserId,
        PASSWORD_RESET_RATE_WINDOW_MINUTES,
      ]
    );

    const hourlyCount = Number(rateRows[0]?.hourly_count || 0);
    const cooldownCount = Number(rateRows[0]?.cooldown_count || 0);

    // If cooldown is active or hourly limit reached, commit and return without issuing a new token
    if (cooldownCount > 0 || hourlyCount >= PASSWORD_RESET_MAX_ISSUES_PER_HOUR) {
      await connection.commit();
      return { success: true };
    }

    // 3. Rate limit passed: generate and persist the new reset token
    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, ?);`,
      [targetUserId, tokenHash, expiresAt]
    );

    await connection.commit();

    return {
      success: true,
      rawTokenForDelivery: rawToken,
      userEmail: String(user.email),
    };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return { success: true };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Revokes a specific active password reset token (e.g. if email delivery fails).
 * Matches the token by its SHA-256 hash.
 */
export async function revokePasswordResetToken(rawToken: string): Promise<boolean> {
  const token = validatePasswordResetTokenFormat(rawToken);
  if (!token) {
    return false;
  }

  const tokenHash = hashPasswordResetToken(token);

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE password_reset_tokens
       SET revoked_at = UTC_TIMESTAMP(3)
       WHERE token_hash = ?
         AND used_at IS NULL
         AND revoked_at IS NULL;`,
      [tokenHash]
    );

    return result.affectedRows > 0;
  } catch {
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type VerifyPasswordResetTokenResult = {
  valid: boolean;
  userId?: number;
  userPublicId?: string;
  email?: string;
};

/**
 * Verifies if a password reset token is currently valid (not used, not revoked, not expired, user active).
 */
export async function verifyPasswordResetToken(
  rawToken: string
): Promise<VerifyPasswordResetTokenResult> {
  const token = validatePasswordResetTokenFormat(rawToken);
  if (!token) {
    return { valid: false };
  }

  const tokenHash = hashPasswordResetToken(token);

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, prt.revoked_at,
              u.public_id, u.email, u.status, u.deleted_at
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ?
       LIMIT 1;`,
      [tokenHash]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { valid: false };
    }

    const row = rows[0];

    // Check validity
    if (row.used_at !== null || row.revoked_at !== null) {
      return { valid: false };
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() <= Date.now()) {
      return { valid: false };
    }

    if (row.status !== "ACTIVE" || row.deleted_at !== null) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: Number(row.user_id),
      userPublicId: String(row.public_id),
      email: String(row.email),
    };
  } catch {
    return { valid: false };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type ConsumePasswordResetParams = {
  rawToken: string;
  newPassword: string;
  confirmPassword: string;
};

export type ConsumePasswordResetResult = {
  success: boolean;
  error?: string;
};

/**
 * Consumes a password reset token, updates the user's password hash,
 * marks the token as used, revokes sibling tokens, and invalidates all user sessions.
 */
export async function consumePasswordReset({
  rawToken,
  newPassword,
  confirmPassword,
}: ConsumePasswordResetParams): Promise<ConsumePasswordResetResult> {
  const token = validatePasswordResetTokenFormat(rawToken);
  if (!token) {
    return {
      success: false,
      error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
    };
  }

  // 1. Password confirmation check
  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "As senhas não coincidem.",
    };
  }

  // 2. Password policy check
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return {
      success: false,
      error: policyCheck.error || "A senha não atende aos requisitos de segurança.",
    };
  }

  // 3. Compute new password hash BEFORE opening DB connection/transaction
  // This prevents holding database locks during the computationally expensive scrypt hashing.
  const newPasswordHash = await hashPassword(newPassword);
  const tokenHash = hashPasswordResetToken(token);

  // 4. Execute atomic reset transaction
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 4.1 Select and lock the token row FOR UPDATE
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, prt.revoked_at,
              u.status, u.deleted_at
       FROM password_reset_tokens prt
       INNER JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ?
       FOR UPDATE;`,
      [tokenHash]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
      };
    }

    const row = rows[0];

    if (row.used_at !== null || row.revoked_at !== null) {
      await connection.rollback();
      return {
        success: false,
        error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
      };
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() <= Date.now()) {
      await connection.rollback();
      return {
        success: false,
        error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
      };
    }

    if (row.status !== "ACTIVE" || row.deleted_at !== null) {
      await connection.rollback();
      return {
        success: false,
        error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
      };
    }

    const tokenId = Number(row.id);
    const targetUserId = Number(row.user_id);

    // 4.2 Update user password hash
    await connection.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ?;`,
      [newPasswordHash, targetUserId]
    );

    // 4.3 Mark current token as used
    await connection.execute(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [tokenId]
    );

    // 4.4 Revoke all sibling active reset tokens for this user
    await connection.execute(
      `UPDATE password_reset_tokens
       SET revoked_at = UTC_TIMESTAMP(3)
       WHERE user_id = ?
         AND id != ?
         AND used_at IS NULL
         AND revoked_at IS NULL;`,
      [targetUserId, tokenId]
    );

    // 4.5 Invalidate all active auth sessions for this user
    await connection.execute(
      `UPDATE auth_sessions
       SET revoked_at = UTC_TIMESTAMP(3)
       WHERE user_id = ?
         AND revoked_at IS NULL;`,
      [targetUserId]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return {
      success: false,
      error: "Não foi possível redefinir a senha agora. Tente novamente mais tarde.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
