import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { Badge } from "@/components/ui/badge";

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
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
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
      tag: "Organizações & Tenants",
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
        "Gerenciamento da biblioteca global de movimentos, especificações biomecânicas, níveis de dificuldade e mídias de instrução.",
      href: "/admin/exercicios",
      cta: "Gerenciar exercícios",
      icon: <ExercisesIcon className="w-6 h-6" />,
    },
    {
      id: "foods",
      title: "Banco Oficial de Alimentos",
      tag: "Nutrição Global",
      badgeVariant: "neutral" as const,
      description:
        "Base autoritativa de composição nutricional, porções canônicas de referência e macronutrientes para toda a plataforma.",
      href: "/admin/alimentos",
      cta: "Gerenciar alimentos",
      icon: <FoodsIcon className="w-6 h-6" />,
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Governance Control Plane Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                Governança Global
              </span>
              <span className="text-xs text-[var(--border-strong)]">•</span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                Super Administrador
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {firstName ? `Painel de Controle, ${firstName}` : "Painel de Governança Global"}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
              Visão consolidada da infraestrutura, operações financeiras e bibliotecas canônicas do Trevo One.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Badge variant="brand" size="sm" className="font-semibold">
              Plataforma Ativa
            </Badge>
          </div>
        </div>

        {/* Real Operational Modules Grid (Stripe / Linear enterprise card style) */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Módulos Operacionais da Plataforma ({operationalModules.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {operationalModules.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="group relative flex flex-col justify-between rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all focus-visible:outline-[var(--brand)] depth-interactive"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] group-hover:text-[var(--brand)] group-hover:border-[var(--brand-soft-border)] flex items-center justify-center transition-colors">
                      {m.icon}
                    </div>
                    <Badge variant={m.badgeVariant} size="sm" className="font-semibold text-[10px]">
                      {m.tag}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
                  <span>{m.cta}</span>
                  <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
