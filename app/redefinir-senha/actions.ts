"use server";

import { redirect } from "next/navigation";
import { consumePasswordReset } from "@/lib/auth/password-reset";

export type ResetPasswordFormState = {
  success: boolean;
  error?: string;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const rawToken = formData.get("token")?.toString() || "";
  const newPassword = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirm_password")?.toString() || "";

  if (!rawToken) {
    return {
      success: false,
      error: "Este link é inválido ou expirou. Solicite uma nova recuperação de senha.",
    };
  }

  const result = await consumePasswordReset({
    rawToken,
    newPassword,
    confirmPassword,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Não foi possível redefinir a senha agora.",
    };
  }

  // Redirect to login with success indicator
  redirect("/login?senha-redefinida=1");
}
