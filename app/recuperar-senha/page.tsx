import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar acesso"
      subtitle="Informe seu e-mail para continuar."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

