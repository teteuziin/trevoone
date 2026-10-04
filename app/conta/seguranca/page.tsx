import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getMyProfile, computeEffectiveUsername } from "@/lib/account/user-profile";
import { PageHeader } from "@/components/ui/page-header";
import { MobilePageHeader } from "@/components/ui/mobile";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/account/user-avatar";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = {
  title: "Conta e Segurança | Trevo One",
  description: "Gerencie credenciais e a segurança do seu acesso.",
};

type PageProps = {
  searchParams?: Promise<{ returnTo?: string }>;
};

export default async function AccountSecurityPage({ searchParams }: PageProps) {
  const { returnTo } = (await searchParams) || {};
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await getMyProfile(
    session.userId,
    session.userPublicId,
    session.fullName,
    session.email
  );

  const effectiveUsername = profile?.effectiveUsername || computeEffectiveUsername(session.userPublicId);
  const backDestination = returnTo || "/selecionar-consultoria";
  const backText = returnTo ? "Voltar" : "Voltar aos ambientes";

  return (
    <main className="min-h-dvh w-full bg-transparent text-[var(--text-primary)] p-4 sm:p-6 lg:p-8 pt-[env(safe-area-inset-top,0px)] sm:pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Mobile-Native Top Header */}
      <div className="sm:hidden -mx-4 -mt-4 mb-4">
        <MobilePageHeader
          title="Conta e segurança"
          subtitle="Credenciais e acesso"
          backHref={backDestination}
          backLabel={backText}
        />
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href={backDestination}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-[var(--brand)] rounded-md px-1 py-0.5 -ml-1"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>{backText}</span>
          </Link>
        </div>

        {/* Desktop Page Header */}
        <div className="hidden sm:block">
          <PageHeader
            title="Conta e segurança"
            description="Gerencie as credenciais e a segurança do seu acesso ao Trevo One."
          />
        </div>

        {/* User Identity Card */}
        <section
          aria-labelledby="user-info-heading"
          className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <UserAvatar
                fullName={session.fullName}
                hasProfilePhoto={profile?.hasProfilePhoto}
                profilePhotoUpdatedAt={profile?.profilePhotoUpdatedAt}
                size="lg"
              />
              <div className="min-w-0 space-y-0.5">
                <h2 id="user-info-heading" className="text-base font-bold text-[var(--text-primary)] truncate">
                  {session.fullName}
                </h2>
                <p className="text-xs font-semibold text-[var(--brand)] truncate">
                  {effectiveUsername}
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  {session.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/conta/perfil"
                className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] rounded-xl hover:bg-[var(--brand)] hover:text-white transition-colors min-h-[44px]"
              >
                Editar perfil →
              </Link>
              <Badge variant="success" size="sm">
                Conta ativa
              </Badge>
            </div>
          </div>
        </section>

        {/* Change Password Card */}
        <section
          aria-labelledby="change-password-heading"
          className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-5"
        >
          <div className="space-y-1">
            <h2 id="change-password-heading" className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Alterar senha
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              Atualize sua senha de acesso. Ao confirmar, todas as outras sessões ativas nos seus dispositivos serão encerradas.
            </p>
          </div>

          <ChangePasswordForm />
        </section>
      </div>
    </main>
  );
}
