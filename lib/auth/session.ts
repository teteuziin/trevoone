import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export const SESSION_COOKIE_NAME = "trevo_session";

export type UserSession = {
  sessionId: number;
  userId: number;
  userPublicId: string;
  fullName: string;
  email: string;
  rememberMe: boolean;
  expiresAt: Date;
};

export async function createSession(
  userId: number,
  rememberMe: boolean
): Promise<boolean> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const hours = rememberMe ? 720 : 12; // 30 days = 720 hours

  let connection;
  try {
    connection = await getDbConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO auth_sessions (user_id, token_hash, remember_me, expires_at)
       SELECT id, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? HOUR)
       FROM users
       WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
      [tokenHash, rememberMe ? 1 : 0, hours, userId]
    );

    if (result.affectedRows !== 1) {
      return false;
    }

    const cookieStore = await cookies();
    const cookieOptions: {
      httpOnly: boolean;
      sameSite: "lax";
      path: string;
      secure: boolean;
      maxAge?: number;
    } = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };

    if (rememberMe) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    }

    cookieStore.set(SESSION_COOKIE_NAME, rawToken, cookieOptions);
    return true;
  } catch {
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function getCurrentSession(): Promise<UserSession | null> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return null;
  }

  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  const tokenHash = crypto.createHash("sha256").update(cookie.value).digest("hex");

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT s.id AS session_id, s.user_id, s.remember_me, s.expires_at,
              u.public_id, u.full_name, u.email, u.status
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > UTC_TIMESTAMP(3)
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1;`,
      [tokenHash]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      sessionId: Number(row.session_id),
      userId: Number(row.user_id),
      userPublicId: String(row.public_id),
      fullName: String(row.full_name),
      email: String(row.email),
      rememberMe: Boolean(row.remember_me),
      expiresAt: new Date(row.expires_at),
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function revokeCurrentSession(): Promise<void> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return;
  }

  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (cookie?.value) {
    const tokenHash = crypto.createHash("sha256").update(cookie.value).digest("hex");
    let connection;
    try {
      connection = await getDbConnection();
      await connection.execute(
        `UPDATE auth_sessions
         SET revoked_at = UTC_TIMESTAMP(3)
         WHERE token_hash = ? AND revoked_at IS NULL;`,
        [tokenHash]
      );
    } catch {
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete({ name: "trevo_consultancy_view_mode", path: "/consultoria" });
}
