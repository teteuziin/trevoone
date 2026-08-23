"use server";

import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import {
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/auth/password";

export type ChangePasswordFormState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  // 1. Authenticate user from authoritative session
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sua sessão expirou. Faça login novamente para continuar.",
    };
  }

  const currentPasswordRaw = formData.get("current_password")?.toString() || "";
  const newPasswordRaw = formData.get("new_password")?.toString() || "";
  const confirmPasswordRaw = formData.get("confirm_password")?.toString() || "";

  // 2. Validate current password presence
  const currentPassword = currentPasswordRaw.normalize("NFC");
  if (!currentPassword) {
    return {
      success: false,
      error: "Informe sua senha atual.",
    };
  }

  // 3. Validate new password confirmation
  const newPassword = newPasswordRaw.normalize("NFC");
  const confirmPassword = confirmPasswordRaw.normalize("NFC");

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "As senhas não coincidem.",
    };
  }

  // 4. Validate new password against authoritative policy
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return {
      success: false,
      error: policyCheck.error || "A senha deve ter entre 6 e 128 caracteres.",
    };
  }

  // 5. Fetch stored password hash without holding connection during scrypt
  let storedHash: string | null = null;
  try {
    const connection = await getDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT password_hash
         FROM users
         WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
         LIMIT 1;`,
        [session.userId]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        storedHash = String(rows[0].password_hash);
      }
    } finally {
      connection.release();
    }
  } catch {
    return {
      success: false,
      error: "Não foi possível verificar seus dados agora. Tente novamente.",
    };
  }

  if (!storedHash) {
    return {
      success: false,
      error: "Conta não encontrada ou inativa.",
    };
  }

  // 6. Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, storedHash);
  if (!isCurrentPasswordValid) {
    return {
      success: false,
      error: "A senha atual está incorreta.",
    };
  }

  // 7. Compute new password hash BEFORE opening database transaction
  let newPasswordHash: string;
  try {
    newPasswordHash = await hashPassword(newPassword);
  } catch {
    return {
      success: false,
      error: "Erro ao processar nova senha. Tente novamente.",
    };
  }

  // 8. Execute atomic update: update password hash and revoke other active sessions
  let writeConnection: PoolConnection | null = null;
  try {
    writeConnection = await getDbConnection();
    await writeConnection.beginTransaction();

    // 8.1 Update user password hash
    const [userUpdateResult] = await writeConnection.execute<ResultSetHeader>(
      `UPDATE users
       SET password_hash = ?
       WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
      [newPasswordHash, session.userId]
    );

    if (userUpdateResult.affectedRows === 0) {
      await writeConnection.rollback();
      return {
        success: false,
        error: "Não foi possível atualizar a senha.",
      };
    }

    // 8.2 Revoke all OTHER active sessions for this user while preserving current session
    await writeConnection.execute(
      `UPDATE auth_sessions
       SET revoked_at = UTC_TIMESTAMP(3)
       WHERE user_id = ?
         AND id != ?
         AND revoked_at IS NULL;`,
      [session.userId, session.sessionId]
    );

    await writeConnection.commit();

    return {
      success: true,
      message: "Senha alterada com sucesso. As outras sessões da sua conta foram encerradas.",
    };
  } catch {
    if (writeConnection) {
      try {
        await writeConnection.rollback();
      } catch {}
    }
    return {
      success: false,
      error: "Não foi possível alterar sua senha agora. Tente novamente mais tarde.",
    };
  } finally {
    if (writeConnection) {
      writeConnection.release();
    }
  }
}
