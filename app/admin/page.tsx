import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { NotificationBell, LogoutButton } from "@/components/notifications/notification-bell";
import { AppearanceSegmentedControl } from "@/components/consultancies/consultancy-navigation";
import { Badge } from "@/components/ui/badge";
import { getUnreadCount } from "@/services/notification-service";
import { logoutFromPlatformAdminArea } from "./actions";

/* =========================================================================
   VOLUMETRIC ICONS (Platform Governance - Local Inline SVG)
   ========================================================================= */

function VolumetricGovernanceConsultanciesIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="govGlow" cx="0%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#00A859" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#00A859" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="govBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="50%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="govHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="govSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
        </linearGradient>
        <filter id="govShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Ambient Glow */}
      <circle cx="26" cy="26" r="24" fill="url(#govGlow)" />

      {/* Background Organization Nodes */}
      <rect x="8" y="18" width="16" height="22" rx="4" fill="url(#govSecondary)" filter="url(#govShadow)" />
      <rect x="28" y="20" width="16" height="20" rx="4" fill="url(#govSecondary)" filter="url(#govShadow)" />

      {/* Main Governance Tower */}
      <rect x="16" y="10" width="20" height="32" rx="5" fill="url(#govBase)" filter="url(#govShadow)" />
      <rect x="16" y="10" width="20" height="32" rx="5" stroke="url(#govHighlight)" strokeWidth="1" />

      {/* Architectural Window Grid */}
      <rect x="20" y="15" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.75" />
      <rect x="28" y="15" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.75" />
      <rect x="20" y="22" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.75" />
      <rect x="28" y="22" width="4" height="4" rx="1" fill="#FFFFFF" fillOpacity="0.75" />

      {/* Portal Accent */}
      <path d="M23 42v-6a3 3 0 016 0v6" fill="#34D399" />
    </svg>
  );
}

function VolumetricGovernanceBillingIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="billGlow" cx="0%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#0284C7" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="billBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="50%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="billHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="billCoin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="billShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Ambient Glow */}
      <circle cx="26" cy="26" r="24" fill="url(#billGlow)" />

      {/* Ledger Back Card */}
      <rect
        x="9"
        y="12"
        width="34"
        height="24"
        rx="6"
        fill="url(#billBase)"
        fillOpacity="0.7"
        filter="url(#billShadow)"
        transform="rotate(-4 26 24)"
      />

      {/* Main Payment Card */}
      <rect x="10" y="16" width="34" height="24" rx="6" fill="url(#billBase)" filter="url(#billShadow)" />
      <rect x="10" y="16" width="34" height="24" rx="6" stroke="url(#billHighlight)" strokeWidth="1" />

      {/* Chip / Strip Accent */}
      <rect x="15" y="21" width="7" height="5" rx="1.5" fill="#FDE047" />
      <line x1="10" y1="29" x2="44" y2="29" stroke="url(#billHighlight)" strokeWidth="1" />

      {/* Verified Shield / Trevo Symbol */}
      <circle cx="36" cy="32" r="7" fill="url(#billCoin)" filter="url(#billShadow)" />
      <path
        d="M33.5 32l1.5 1.5 3.5-3.5"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================================
   PAGE COMPONENT
   ========================================================================= */

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
      title: "Gestão de Consultorias",
      badge: "Tenants & Organizações",
      description:
        "Cadastre novas consultorias parceiras, defina administradores iniciais e gerencie o ciclo de vida das organizações.",
      cta: "Abrir gestão",
      href: "/admin/consultorias",
      icon: <VolumetricGovernanceConsultanciesIcon className="w-12 h-12 shrink-0" />,
    },
    {
      title: "Cobrança & Assinaturas",
      badge: "Financeiro Global",
      description:
        "Faturamento das consultorias, controle Pix da plataforma, monitoramento de carência e conciliação de comprovantes.",
      cta: "Abrir cobrança",
      href: "/admin/cobranca-plataforma",
      icon: <VolumetricGovernanceBillingIcon className="w-12 h-12 shrink-0" />,
    },
  ];

  const planningModules = [
    {
      title: "Usuários Globais",
      description: "Visão consolidada de contas, acessos e auditoria de perfis.",
    },
    {
      title: "Trilha de Auditoria",
      description: "Registro imutável de eventos administrativos e segurança.",
    },
    {
      title: "Configurações Gerais",
      description: "Parâmetros globais de infraestrutura e integrações.",
    },
  ];

  return (
    <main className="min-h-dvh w-full bg-[var(--background)] text-[var(--text-primary)] selection:bg-[var(--brand-soft)] selection:text-[var(--brand-foreground)]">
      {/* Topbar de Governança Global */}
      <header className="sticky top-0 z-30 w-full bg-[var(--surface)] border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <TrevoOneLogo priority showWordmark size={36} />
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-[var(--border-strong)]">
              |
            </span>
            <span className="hidden sm:inline-block text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
              Governança Global
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge variant="brand" size="sm" className="hidden md:inline-flex">
              Super Administrador
            </Badge>
            <AppearanceSegmentedControl compact />
            <Link
              href="/conta/seguranca"
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
              title="Conta e segurança"
            >
              <span className="hidden sm:inline">Conta e segurança</span>
              <span className="sm:hidden">Conta</span>
            </Link>
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

      {/* Conteúdo Principal de Governança */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 sm:space-y-9">
        {/* Governance Context Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {firstName ? `Olá, ${firstName}` : "Painel de Governança"}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              Painel de Governança e Infraestrutura Global • Trevo One
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="brand" size="sm">
              Plataforma Trevo One
            </Badge>
          </div>
        </div>

        {/* 1. Portais de Governança Ativos (2 Módulos Reais) */}
        <div className="space-y-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Módulos Operacionais da Plataforma
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeModules.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group relative overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand)] p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-5 focus-visible:outline-[var(--brand)]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="group-hover:scale-105 transition-transform">{m.icon}</div>
                    <Badge variant="neutral" size="sm" className="font-semibold text-[11px]">
                      {m.badge}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--brand)]">
                  <span>{m.cta}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. Módulos Estruturais em Planejamento (Sutis e Informativos) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Módulos em Planejamento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {planningModules.map((m) => (
              <div
                key={m.title}
                className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 opacity-80 space-y-1.5"
                aria-disabled="true"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                    {m.title}
                  </h4>
                  <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-2">
                    Planejamento
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
