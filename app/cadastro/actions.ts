"use server";

import crypto from "node:crypto";
import { getDbConnection } from "../../lib/db/mysql";
import { hashPassword } from "../../lib/auth/password";

export type RegisterFormErrors = {
  full_name?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  terms_accepted?: string;
};

export type RegisterFormState = {
  success: boolean;
  message?: string;
  errors?: RegisterFormErrors;
};

export async function registerAccount(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  const fullNameRaw = formData.get("full_name")?.toString() || "";
  const emailRaw = formData.get("email")?.toString() || "";
  const passwordRaw = formData.get("password")?.toString() || "";
  const confirmPasswordRaw = formData.get("confirm_password")?.toString() || "";
  const termsAcceptedRaw = formData.get("terms_accepted");

  const errors: RegisterFormErrors = {};

  // 1. Normalization & Validation: full_name
  const fullName = fullNameRaw.trim().replace(/\s+/g, " ");
  const fullNameLen = [...fullName].length;

  if (fullNameLen === 0) {
    errors.full_name = "Informe seu nome completo.";
  } else if (fullNameLen > 150) {
    errors.full_name = "O nome deve ter no máximo 150 caracteres.";
  }

  // 2. Normalization & Validation: email
  const email = emailRaw.trim().normalize("NFC").toLowerCase();
  const emailParts = email.split("@");

  if (
    email.length === 0 ||
    email.length > 254 ||
    emailParts.length !== 2 ||
    !emailParts[0] ||
    !emailParts[1] ||
    !emailParts[1].includes(".")
  ) {
    errors.email = "Digite um e-mail válido.";
  }

  // 3. Normalization & Validation: password
  const password = passwordRaw.normalize("NFC");
  const passwordLen = [...password].length;

  if (passwordLen < 6) {
    errors.password = "Use pelo menos 6 caracteres na senha.";
  } else if (passwordLen > 128) {
    errors.password = "A senha pode ter no máximo 128 caracteres.";
  }

  // 4. Normalization & Validation: confirm_password
  const confirmPassword = confirmPasswordRaw.normalize("NFC");

  if (password !== confirmPassword) {
    errors.confirm_password = "As senhas não coincidem.";
  }

  // 5. Validation: terms_accepted
  const termsAccepted =
    termsAcceptedRaw === "on" ||
    termsAcceptedRaw === "true" ||
    termsAcceptedRaw === "1" ||
    Boolean(termsAcceptedRaw);

  if (!termsAccepted) {
    errors.terms_accepted = "Você precisa aceitar os termos para continuar.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
    };
  }

  let connection;

  // Hash password and insert
  try {
    const publicId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    connection = await getDbConnection();

    await connection.execute(
      `INSERT INTO users (public_id, full_name, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?);`,
      [publicId, fullName, email, passwordHash, "ACTIVE"]
    );

    return {
      success: true,
      message: "Conta criada com sucesso.",
    };
  } catch (err: unknown) {
    const errCode =
      (err as { code?: string; errno?: number })?.code ||
      (err as { errno?: number })?.errno;

    if (errCode === "ER_DUP_ENTRY" || errCode === 1062) {
      return {
        success: false,
        message:
          "Não foi possível concluir o cadastro com esses dados. Se você já possui uma conta, entre ou recupere sua senha.",
      };
    }

    return {
      success: false,
      message: "Não foi possível criar sua conta agora. Tente novamente.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
