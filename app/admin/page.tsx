import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { getUnreadCount } from "@/services/notification-service";
import { logoutFromPlatformAdminArea } from "./actions";

export default async function AdminDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  const unreadNotificationsCount = await getUnreadCount(session.userId);

  const modules = [
    {
      title: "Consultorias",
      description:
        "Gestão centralizada de consultorias parceiras, criação e configurações de tenant.",
      status: "Disponível",
      href: "/admin/consultorias",
      icon: (
        <svg
          className="w-5 h-5 text-[var(--brand)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      title: "Cobrança & Assinaturas",
      description:
        "Faturamento das consultorias, controle Pix, carência de inadimplência e comprovantes.",
      status: "Disponível",
      href: "/admin/cobranca-plataforma",
      icon: (
        <svg
          className="w-5 h-5 text-[var(--brand)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Usuários",
      description:
        "Visão global de contas e acessos administrativos na plataforma.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[var(--text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: "Auditoria",
      description:
        "Registro de eventos administrativos e trilha de auditoria do sistema.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[var(--text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      title: "Configurações",
      description:
        "Parâmetros globais da infraestrutura e integrações da plataforma.",
      status: "Em preparação",
      icon: (
        <svg
          className="w-5 h-5 text-[var(--text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      {/* Topbar Padronizada */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <TrevoOneLogo priority showWordmark size={36} />
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-[var(--border-strong)]">
              |
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-[var(--text-secondary)]">
              Administração Global
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge variant="brand" size="sm" className="hidden md:inline-flex">
              Administrador global
            </Badge>
            <NotificationBell unreadCount={unreadNotificationsCount} />
            <LogoutButton
              logoutAction={logoutFromPlatformAdminArea}
              variant="ghost"
              size="sm"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Sair
            </LogoutButton>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <PageHeader
          title="Administração da plataforma"
          description={`Bem-vindo, ${session.fullName}. Este é o ambiente de governança global do Trevo One.`}
          actions={
            <Badge variant="brand" size="sm" className="md:hidden">
              Global
            </Badge>
          }
        />

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Módulos do sistema
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Recursos de administração e gestão da plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m) => {
              if (m.href) {
                return (
                  <Link
                    key={m.title}
                    href={m.href}
                    className="group bg-[var(--surface)] rounded-xl border border-[var(--border-default)] hover:border-[var(--brand)] p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:bg-[var(--surface-hover)] focus-visible:outline-[var(--brand)]"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        {m.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-foreground)] transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <Badge variant="success" size="sm">
                        {m.status} →
                      </Badge>
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={m.title}
                  className="bg-[var(--surface)] rounded-xl border border-[var(--border-default)] p-5 shadow-xs flex flex-col justify-between space-y-4 opacity-75"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center">
                      {m.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                        {m.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <Badge variant="neutral" size="sm">
                      {m.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

