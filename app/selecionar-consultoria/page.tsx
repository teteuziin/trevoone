import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  listUserConsultancies,
  ROLE_LABELS,
} from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoutButton } from "@/components/notifications/notification-bell";
import { logoutFromConsultancyArea } from "./actions";

export default async function SelecionarConsultoriaPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const [{ accessible, configuring }, { isPlatformAdmin }] = await Promise.all([
    listUserConsultancies(session.userId),
    getPlatformAdminAccess(session.userId),
  ]);

  // Se o usuário for PLATFORM_ADMIN
  if (isPlatformAdmin) {
    // Caso não possua consultorias acessíveis: redirect direto para o painel global
    if (accessible.length === 0) {
      redirect("/admin");
    }

    // Caso possua 1 ou mais consultorias acessíveis: exibir seletor de ambientes
    return (
      <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
        <div className="w-full max-w-[480px] mx-auto flex flex-col items-center space-y-6 my-auto">
          {/* Brand Header */}
          <div className="flex flex-col items-center space-y-2">
            <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
              <TrevoOneLogo priority showWordmark size={42} />
            </div>
          </div>

          <div className="w-full text-center space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Escolha seu ambiente
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              Selecione o ambiente que você deseja acessar neste momento.
            </p>
          </div>

          <div className="w-full space-y-3">
            {/* Card Global: Administração Trevo One */}
            <Link
              href="/admin"
              className="group block w-full p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-[var(--brand)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center shrink-0 p-1 shadow-2xs">
                    <TrevoOneLogo size={32} />
                  </div>
                  <div className="space-y-1 text-left min-w-0">
                    <h2 className="text-sm sm:base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      Administração Trevo One
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="brand" size="sm">
                        Administrador global
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all shrink-0 pl-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Cards de Consultorias acessíveis */}
            {accessible.map((item) => (
              <Link
                key={item.membershipId}
                href={`/consultoria/${item.consultancySlug}`}
                className="group block w-full p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-[var(--brand)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ConsultancyLogo
                      logoUrl={item.consultancyLogoUrl}
                      name={item.consultancyName}
                      size={44}
                    />
                    <div className="space-y-1 text-left min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                        {item.consultancyName}
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {item.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="brand"
                            size="sm"
                          >
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all shrink-0 pl-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Canonical Account Action Bar */}
          <div className="w-full pt-1 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/conta/seguranca"
              className="flex items-center justify-center flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] shadow-xs transition-colors focus-visible:outline-[var(--brand)] min-h-[44px]"
            >
              Conta e segurança
            </Link>
            <LogoutButton
              logoutAction={logoutFromConsultancyArea}
              variant="secondary"
              className="flex-1 min-h-[44px]"
              size="md"
            >
              Sair da conta
            </LogoutButton>
          </div>
        </div>
      </main>
    );
  }

  // Usuário comum (isPlatformAdmin === false)

  // 1. Caso haja exatamente 1 consultoria acessível: redirect automático
  if (accessible.length === 1) {
    redirect(`/consultoria/${accessible[0].consultancySlug}`);
  }

  // 2. Caso haja 0 consultorias acessíveis e 0 em configuração
  if (accessible.length === 0 && configuring.length === 0) {
    return (
      <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center space-y-6">
          <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
            <TrevoOneLogo priority showWordmark size={42} />
          </div>

          <EmptyState
            title="Nenhuma consultoria vinculada"
            description="Sua conta está ativa, mas você ainda não está vinculado a uma consultoria parceira no Trevo One."
            action={
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                variant="primary"
                fullWidth
                size="md"
              >
                Sair da conta
              </LogoutButton>
            }
            className="w-full bg-[var(--surface)] border-[var(--border-default)]"
          />
        </div>
      </main>
    );
  }

  // 3. Caso haja 0 consultorias acessíveis e 1+ em configuração (sem roles)
  if (accessible.length === 0 && configuring.length > 0) {
    return (
      <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
        <div className="w-full max-w-[420px] mx-auto flex flex-col items-center space-y-6">
          <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
            <TrevoOneLogo priority showWordmark size={42} />
          </div>

          <EmptyState
            title="Acesso em configuração"
            description="Seu vínculo com a consultoria existe, mas suas permissões ainda não foram definidas. Entre em contato com o administrador da consultoria."
            action={
              <LogoutButton
                logoutAction={logoutFromConsultancyArea}
                variant="primary"
                fullWidth
                size="md"
              >
                Sair da conta
              </LogoutButton>
            }
            className="w-full bg-[var(--surface)] border-[var(--border-default)]"
          />
        </div>
      </main>
    );
  }

  // 4. Caso haja 2 ou mais consultorias acessíveis para usuário comum
  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      <div className="w-full max-w-[480px] mx-auto flex flex-col items-center space-y-6 my-auto">
        <div className="flex flex-col items-center space-y-2">
          <div className="shrink-0 transition-transform duration-200 hover:scale-[1.02]">
            <TrevoOneLogo priority showWordmark size={42} />
          </div>
        </div>

        <div className="w-full text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Escolha sua consultoria
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
            Selecione a consultoria que você deseja acessar neste momento.
          </p>
        </div>

        <div className="w-full space-y-3">
          {accessible.map((item) => (
            <Link
              key={item.membershipId}
              href={`/consultoria/${item.consultancySlug}`}
              className="group block w-full p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-[var(--brand)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <ConsultancyLogo
                    logoUrl={item.consultancyLogoUrl}
                    name={item.consultancyName}
                    size={44}
                  />
                  <div className="space-y-1 text-left min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {item.consultancyName}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="brand"
                          size="sm"
                        >
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all shrink-0 pl-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Canonical Account Action Bar */}
        <div className="w-full pt-1 flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/conta/seguranca"
            className="flex items-center justify-center flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] shadow-xs transition-colors focus-visible:outline-[var(--brand)] min-h-[44px]"
          >
            Conta e segurança
          </Link>
          <LogoutButton
            logoutAction={logoutFromConsultancyArea}
            variant="secondary"
            className="flex-1 min-h-[44px]"
            size="md"
          >
            Sair da conta
          </LogoutButton>
        </div>
      </div>
    </main>
  );
}

