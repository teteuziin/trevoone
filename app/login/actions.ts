"use server";

import type { RowDataPacket } from "mysql2/promise";
import { revalidatePath } from "next/cache";
import { getDbConnection } from "../../lib/db/mysql";
import { verifyPassword, DUMMY_SCRYPT_HASH } from "../../lib/auth/password";
import { createSession, revokeCurrentSession } from "../../lib/auth/session";

export type LoginFormErrors = {
  email?: string;
  password?: string;
};

export type LoginFormState = {
  success: boolean;
  message?: string;
  errors?: LoginFormErrors;
};

export async function loginAccount(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const emailRaw = formData.get("email")?.toString() || "";
  const passwordRaw = formData.get("password")?.toString() || "";
  const rememberMeRaw = formData.get("remember_me");

  const rememberMe =
    rememberMeRaw === "on" ||
    rememberMeRaw === "true" ||
    rememberMeRaw === "1" ||
    Boolean(rememberMeRaw);

  const errors: LoginFormErrors = {};

  const email = emailRaw.trim().normalize("NFC").toLowerCase();
  const emailParts = email.split("@");

  if (!email) {
    errors.email = "Informe seu e-mail.";
  } else if (
    email.length > 254 ||
    emailParts.length !== 2 ||
    !emailParts[0] ||
    !emailParts[1] ||
    !emailParts[1].includes(".")
  ) {
    errors.email = "Digite um e-mail válido.";
  }

  const password = passwordRaw.normalize("NFC");
  if (!password) {
    errors.password = "Informe sua senha.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  let user: {
    id: number;
    password_hash: string;
    status: string;
    deleted_at: Date | null;
  } | null = null;

  // 1. Connection A: Fetch user and RELEASE immediately before scrypt
  try {
    const connection = await getDbConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, password_hash, status, deleted_at
         FROM users
         WHERE email = ?
         LIMIT 1;`,
        [email]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        user = {
          id: Number(rows[0].id),
          password_hash: String(rows[0].password_hash),
          status: String(rows[0].status),
          deleted_at: rows[0].deleted_at ? new Date(rows[0].deleted_at) : null,
        };
      }
    } finally {
      connection.release();
    }
  } catch {
    return {
      success: false,
      message: "Não foi possível realizar o login agora. Tente novamente.",
    };
  }

  // 2. Verify password with NO active DB connection
  if (!user) {
    await verifyPassword(password, DUMMY_SCRYPT_HASH);
    return {
      success: false,
      message: "E-mail ou senha inválidos.",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);

  if (!isPasswordValid || user.status !== "ACTIVE" || user.deleted_at !== null) {
    return {
      success: false,
      message: "E-mail ou senha inválidos.",
    };
  }

  // 3. Connection B: Create session and set cookie
  const sessionCreated = await createSession(user.id, rememberMe);

  if (!sessionCreated) {
    return {
      success: false,
      message: "Não foi possível realizar o login agora. Tente novamente.",
    };
  }

  try {
    revalidatePath("/login");
  } catch {
    // Ignorado fora do contexto de requisição HTTP do Next.js
  }

  return {
    success: true,
    message: "Login realizado com sucesso.",
  };
}

export async function logoutAccount(): Promise<void> {
  await revokeCurrentSession();
  try {
    revalidatePath("/login");
  } catch {
    // Ignorado fora do contexto de requisição HTTP do Next.js
  }
}
