import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentSession } from "@/lib/auth/session";
import { validateInvitationReturnTo } from "@/lib/auth/invitation-return-to";

type PageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function CadastroPage({ searchParams }: PageProps) {
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
      title="Criar sua conta"
      subtitle="Comece seu acesso ao Trevo One."
    >
      <RegisterForm returnTo={safeReturnTo || undefined} />
    </AuthShell>
  );
}

