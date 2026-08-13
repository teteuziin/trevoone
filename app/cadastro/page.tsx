import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function CadastroPage() {
  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="Comece sua jornada no Trevo One."
    >
      <RegisterForm />
    </AuthShell>
  );
}
