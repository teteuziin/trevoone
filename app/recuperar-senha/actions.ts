"use server";

import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/auth/password";
import { dispatchPasswordResetRecovery } from "@/lib/email/password-reset-email";

export type ForgotPasswordFormState = {
  success: boolean;
  status?: "COMPLETED" | "UNAVAILABLE";
  message?: string;
  error?: string;
};

export async function requestPasswordRecovery(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const emailRaw = formData.get("email")?.toString() || "";
  const email = normalizeAuthEmail(emailRaw);

  if (!email) {
    return {
      success: false,
      error: "Informe seu e-mail.",
    };
  }

  if (!isValidAuthEmail(email)) {
    return {
      success: false,
      error: "Informe um e-mail válido.",
    };
  }

  const result = await dispatchPasswordResetRecovery(email);

  if (result.status === "UNAVAILABLE") {
    return {
      success: true,
      status: "UNAVAILABLE",
      message:
        "A recuperação de senha por e-mail ainda não está disponível. Tente novamente após a ativação deste recurso.",
    };
  }

  return {
    success: true,
    status: "COMPLETED",
    message:
      "Se existir uma conta associada a este e-mail, você receberá uma mensagem com as instruções para redefinir sua senha.",
  };
}
