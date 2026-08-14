import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { validateInvitationReturnTo } from "@/lib/auth/invitation-return-to";

type PageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { returnTo } = await searchParams;
  const safeReturnTo = validateInvitationReturnTo(returnTo);

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
      subtitle="Entre na sua conta para acessar o Trevo One."
    >
      <LoginForm returnTo={safeReturnTo || undefined} />
    </AuthShell>
  );
}
