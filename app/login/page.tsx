import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para acessar o Trevo One."
    >
      <LoginForm />
    </AuthShell>
  );
}
