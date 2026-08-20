import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
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
  const firstName = session.fullName ? session.fullName.split(" ")[0] : "";

  const activeModules = [
    {
      title: "Consultorias",
      description:
        "Gestão centralizada de consultorias parceiras, criação e configurações de tenant.",
      status: "Acessar módulo",
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
        "Faturamento das consultorias, controle Pix, carência de inadimplência e conciliação de comprovantes.",
      status: "Acessar módulo",
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
  ];

  const futureModules = [
    {
      title: "Usuários",
      description: "Visão global de contas e acessos administrativos na plataforma.",
    },
    {
      title: "Auditoria",
      description: "Registro de eventos administrativos e trilha de auditoria do sistema.",
    },
    {
      title: "Configurações",
      description: "Parâmetros globais da infraestrutura e integrações da plataforma.",
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
        {/* Context Header Compacto */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {firstName ? `Olá, ${firstName}` : "Administração da plataforma"}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Painel de Governança Global • Trevo One
            </p>
          </div>

          <Badge variant="brand" size="sm" className="self-start sm:self-auto">
            Super Administrador
          </Badge>
        </div>

        {/* 1. Módulos Operacionais Ativos (P0) */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Operação da Plataforma
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeModules.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand)] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:bg-[var(--surface-hover)] focus-visible:outline-[var(--brand)]"
              >
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    {m.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
                  <span>{m.status}</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. Módulos em Preparação (Demotados em lista secundária sutil) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Módulos Futuros
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {futureModules.map((m) => (
              <div
                key={m.title}
                className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] opacity-75 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                    {m.title}
                  </h4>
                  <Badge variant="neutral" size="sm">
                    Em breve
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
