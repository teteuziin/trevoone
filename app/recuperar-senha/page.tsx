import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Informe o e-mail associado à sua conta."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
