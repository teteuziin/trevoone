import { redirect } from "next/navigation";
import { LoginShellV2 } from "@/components/auth/login-shell-v2";
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
    <LoginShellV2
      returnTo={safeReturnTo || undefined}
      resetSuccess={resetSuccess}
    />
  );
}
