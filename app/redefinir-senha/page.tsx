import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { verifyPasswordResetToken } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type PageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const rawTokenParam = resolvedSearchParams.token;
  const token = Array.isArray(rawTokenParam) ? rawTokenParam[0] : rawTokenParam;

  const verification = token ? await verifyPasswordResetToken(token) : { valid: false };

  if (!verification.valid || !token) {
    return (
      <AuthShell
        title="Recuperação de senha"
        subtitle="Link inválido ou expirado."
      >
        <div className="w-full space-y-5 text-center">
          <Alert variant="danger">
            Este link é inválido ou expirou. Por motivos de segurança, solicite um novo link de recuperação de senha.
          </Alert>


          <div className="pt-2 space-y-3">
            <Link href="/recuperar-senha" className="w-full block">
              <Button fullWidth size="md" className="font-semibold">
                Solicitar novo link
              </Button>
            </Link>

            <div>
              <Link
                href="/login"
                className="inline-flex items-center text-xs sm:text-sm font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline rounded px-1 py-0.5 transition-colors"
              >
                ← Voltar para o login
              </Link>
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle="Defina sua nova senha para acessar sua conta."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
