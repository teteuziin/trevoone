"use server";

import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/auth/password";

export type ForgotPasswordFormState = {
  success: boolean;
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

  // Under E2 infrastructure (no email delivery configured yet),
  // no token is generated or persisted to avoid creating undeliverable records.
  // Delivery will be connected in T099B.
  return {
    success: true,
    message:
      "A recuperação de senha por e-mail ainda não está disponível. Tente novamente após a ativação deste recurso.",
  };
}
