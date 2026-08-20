import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { validateInvitationReturnTo } from "@/lib/auth/invitation-return-to";

type PageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function CadastroPage({ searchParams }: PageProps) {
  const { returnTo } = await searchParams;
  const safeReturnTo = validateInvitationReturnTo(returnTo);

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Comece seu acesso ao Trevo One."
    >
      <RegisterForm returnTo={safeReturnTo || undefined} />
    </AuthShell>
  );
}

