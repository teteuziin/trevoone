import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { validateInvitationReturnTo } from "@/lib/auth/invitation-return-to";

type PageProps = {
  searchParams: Promise<{
    returnTo?: string;
    "senha-redefinida"?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { returnTo, "senha-redefinida": senhaRedefinida } = await searchParams;
  const safeReturnTo = validateInvitationReturnTo(returnTo);
  const resetSuccess = senhaRedefinida === "1";

  const session = await getCurrentSession();

  if (session) {
    if (safeReturnTo) {
      redirect(safeReturnTo);
    }
    redirect("/selecionar-consultoria");
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta para continuar."
    >
      <LoginForm
        returnTo={safeReturnTo || undefined}
        resetSuccess={resetSuccess}
      />
    </AuthShell>
  );

}
