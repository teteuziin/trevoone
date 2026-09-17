import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { Badge } from "@/components/ui/badge";
import { SettingsIcon as Settings } from "@/components/ui/icons";

/* =========================================================================
   ENTERPRISE CONTROL PLANE ICONS (Linear / Stripe / V2 Precision Geometry)
   ========================================================================= */

function ConsultanciesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function BillingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="2.25" y="8.25" width="19.5" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12h19.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 16h4m4 0h4" />
    </svg>
  );
}

function ExercisesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function FoodsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-6-9h12" />
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

  const firstName = session.fullName ? session.fullName.split(" ")[0] : "";

  const operationalModules = [
    {
      id: "consultancies",
      title: "Gestão de Consultorias",
      tag: "Consultorias & Contas",
      badgeVariant: "neutral" as const,
      description:
        "Cadastro e administração de consultorias parceiras, definição de administradores iniciais e controle de fusos operacionais.",
      href: "/admin/consultorias",
      cta: "Acessar consultorias",
      icon: <ConsultanciesIcon className="w-6 h-6" />,
    },
    {
      id: "billing",
      title: "Cobrança da Plataforma",
      tag: "Faturamento & Pix",
      badgeVariant: "brand" as const,
      description:
        "Controle financeiro global de faturas, verificação e aprovação de comprovantes Pix, carência e gestão de acessos.",
      href: "/admin/cobranca-plataforma",
      cta: "Acessar faturamento",
      icon: <BillingIcon className="w-6 h-6" />,
    },
    {
      id: "exercises",
      title: "Biblioteca Oficial de Exercícios",
      tag: "Catálogo Global",
      badgeVariant: "neutral" as const,
      description:
        "Gerenciamento da biblioteca global de movimentos, instruções técnicas, níveis de dificuldade e mídias explicativas.",
      href: "/admin/exercicios",
      cta: "Gerenciar exercícios",
      icon: <ExercisesIcon className="w-6 h-6" />,
    },
    {
      id: "foods",
      title: "Biblioteca Global de Alimentos",
      tag: "Tabela TACO & Alimentos",
      badgeVariant: "neutral" as const,
      description:
        "Base oficial de dados nutricionais de referência (TACO 4ª edição), catálogo de marcas e gestão de novos alimentos.",
      href: "/admin/alimentos-v2",
      cta: "Gerenciar alimentos",
      icon: <FoodsIcon className="w-6 h-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Enterprise Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-200 shadow-2xs font-mono">
                ADMINISTRAÇÃO GLOBAL
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                Super Administrador Trevo One
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {firstName ? `Centro de Gestão, ${firstName}` : "Centro de Gestão Global"}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal max-w-2xl leading-relaxed">
              Supervisão consolidada de consultorias parceiras, conciliação de faturas Pix da plataforma e bibliotecas oficiais de exercícios e nutrição.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Plataforma Online</span>
            </div>
          </div>
        </div>

        {/* Dense Infrastructure Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-mono">
              Arquitetura
            </span>
            <p className="font-bold text-[var(--text-primary)]">Next.js App Router</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-mono">
              Isolamento
            </span>
            <p className="font-bold text-[var(--text-primary)]">Multi-Tenant Server-Side</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-mono">
              Persistência
            </span>
            <p className="font-bold text-[var(--text-primary)]">MySQL Connection Pool</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-mono">
              Segurança
            </span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">Zero Client DB Access</p>
          </div>
        </div>

        {/* Real Operational Modules Grid (Snap Rail on mobile: 84vw cards, 2-column on desktop) */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Módulos Operacionais Canônicos ({operationalModules.length})
            </h2>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:overflow-visible">
            {operationalModules.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="w-[84vw] max-w-[420px] shrink-0 sm:w-auto sm:max-w-none snap-center group relative flex flex-col justify-between rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all focus-visible:outline-[var(--brand)] depth-surface min-h-[220px]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] group-hover:text-[var(--brand)] group-hover:border-[var(--brand-soft-border)] flex items-center justify-center transition-colors shadow-2xs">
                      {m.icon}
                    </div>
                    <Badge variant={m.badgeVariant} size="sm" className="font-semibold text-[10px]">
                      {m.tag}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--brand)] min-h-[44px] sm:min-h-0 items-center">
                  <span>{m.cta}</span>
                  <span className="group-hover:translate-x-1.5 transition-transform" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Governance & Platform Audit Footer */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)] flex items-center justify-center border border-[var(--border-default)]">
                <Settings className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Registro de Auditoria da Plataforma
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Ações executadas nesta central administrativa afetam globalmente o catálogo de exercícios, tabelas nutricionais e regras de faturamento da plataforma.
            </p>
          </div>
          <div className="shrink-0 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1.5 rounded-xl border border-[var(--border-default)] font-mono">
            Audit Log Ativo
          </div>
        </div>
      </div>
    </div>
  );
}
