import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

interface DashboardAdminViewProps {
  consultancySlug: string;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
}

/* =========================================================================
   LINEAR SAAS ICONS (Global UI Direction V2 — Clean, Geometric, Sharp)
   ========================================================================= */

function TeamLinearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function FinanceLinearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 10h19" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15h3m4 0h5" />
    </svg>
  );
}

function MissionsLinearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}

function SubscriptionLinearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

/* =========================================================================
   MAIN VIEW
   ========================================================================= */

export function DashboardAdminView({
  consultancySlug,
  overview,
  platformAccess,
}: DashboardAdminViewProps) {
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";
  const hasSubscriptionP0 = isSuspendedOrCanceled || isInGrace;

  return (
    <div className="space-y-6">
      {/* 1. Alertas P0 de Assinatura da Plataforma */}
      {isSuspendedOrCanceled && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="danger" size="sm">
                  {platformAccess.effectiveStatus === "CANCELED"
                    ? "Assinatura Cancelada"
                    : "Serviços Suspensos"}
                </Badge>
                <span className="text-xs font-semibold text-[var(--danger-foreground)]">
                  Acesso operacional bloqueado
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--danger-foreground)] opacity-90">
                {platformAccess.effectiveStatus === "CANCELED"
                  ? "A assinatura desta consultoria foi cancelada. Regularize ou entre em contato com o suporte da plataforma."
                  : platformAccess.effectiveReason === "NONPAYMENT"
                  ? "O acesso aos módulos operacionais foi suspenso devido a faturas em atraso além do período de carência."
                  : `A consultoria foi suspensa administrativamente: ${
                      platformAccess.manualSuspensionReason || "Sem motivo informado."
                    }`}
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="danger" size="sm" className="min-h-[44px]">
                Gerenciar Assinatura →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isInGrace && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  Carência de Pagamento
                </Badge>
                <span className="text-xs font-semibold text-[var(--warning-foreground)]">
                  Fatura da consultoria pendente
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--warning-foreground)] opacity-90">
                Há uma fatura da consultoria com período de carência ativo. Realize o pagamento para
                evitar a suspensão dos serviços.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="secondary" size="sm" className="min-h-[44px]">
                Ver Fatura e Pix →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. PROTAGONISTA OPERACIONAL: Equipe da Consultoria */}
      {overview ? (
        <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] p-5 sm:p-6 shadow-xs transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] flex items-center justify-center shrink-0 shadow-2xs">
                  <TeamLinearIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                    Operação & Equipe
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      {overview.activeMembers}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                      {overview.activeMembers === 1 ? "membro ativo" : "membros ativos"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Composition Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.students}</strong>{" "}
                  {overview.students === 1 ? "Aluno" : "Alunos"}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.personals}</strong>{" "}
                  {overview.personals === 1 ? "Personal" : "Personais"}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">
                    {overview.nutritionists}
                  </strong>{" "}
                  {overview.nutritionists === 1 ? "Nutricionista" : "Nutricionistas"}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.admins}</strong>{" "}
                  {overview.admins === 1 ? "Admin" : "Admins"}
                </span>
              </div>
            </div>

            {/* Protagonist CTA */}
            <div className="shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
              <Link href={`/consultoria/${consultancySlug}/membros`}>
                <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold shadow-xs">
                  Gerenciar Membros →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] text-center text-xs text-[var(--text-secondary)]">
          Dados da equipe indisponíveis no momento.
        </div>
      )}

      {/* 3. MÓDULOS OPERACIONAIS DE SUPORTE */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Central Operacional
        </h3>

        <div
          className={`grid gap-4 ${
            hasSubscriptionP0
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* Financeiro dos Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-all group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)]"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-soft)] group-hover:border-[var(--brand-soft-border)] transition-colors">
                  <FinanceLinearIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Financeiro dos Alunos
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Controle de mensalidades, cobranças Pix e conciliação de pagamentos.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
              <span>Acessar financeiro</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>

          {/* Missões (Influenciadores / VIP) */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-all group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)]"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-soft)] group-hover:border-[var(--brand-soft-border)] transition-colors">
                  <MissionsLinearIcon className="w-5 h-5" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Missões (Influenciadores)
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                Criação, acompanhamento e revisão de entregas dos influenciadores VIP.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
              <span>Gerenciar missões</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </Link>

          {/* Assinatura Trevo One (Omitido se houver P0 ativo para evitar duplicação) */}
          {!hasSubscriptionP0 && (
            <Link
              href={`/consultoria/${consultancySlug}/assinatura`}
              className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] hover:bg-[var(--surface-hover)] transition-all group flex flex-col justify-between space-y-4 focus-visible:outline-[var(--brand)] sm:col-span-2 lg:col-span-1"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-soft)] group-hover:border-[var(--brand-soft-border)] transition-colors">
                    <SubscriptionLinearIcon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                    Assinatura Trevo One
                  </h4>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Gestão do plano da consultoria, faturas da plataforma e controle de carência.
                </p>
              </div>
              <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1 pt-1">
                <span>Ver assinatura</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
