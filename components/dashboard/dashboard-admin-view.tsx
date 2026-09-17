import React from "react";
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

// =========================================================================
// EXECUTIVE SAAS ICONS (Linear, Sharp Geometric, Executive Tone)
// =========================================================================

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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DashboardAdminView({
  consultancySlug,
  overview,
  platformAccess,
}: DashboardAdminViewProps) {
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";

  return (
    <div className="space-y-7 sm:space-y-9 overflow-x-clip">
      {/* 1. Alertas P0 de Assinatura da Plataforma */}
      {isSuspendedOrCanceled && (
        <div className="p-4.5 sm:p-5 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="danger" size="sm">
                  {platformAccess.effectiveStatus === "CANCELED"
                    ? "Assinatura Cancelada"
                    : "Serviços Suspensos"}
                </Badge>
                <span className="text-xs font-bold text-[var(--danger-foreground)]">
                  Acesso operacional restrito
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--danger-foreground)] opacity-95 leading-relaxed">
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
              <Button variant="danger" size="sm" className="min-h-[44px] font-bold">
                Regularizar Assinatura →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isInGrace && (
        <div className="p-4.5 sm:p-5 rounded-3xl border border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  Carência de Pagamento
                </Badge>
                <span className="text-xs font-bold text-[var(--warning-foreground)]">
                  Fatura da consultoria pendente
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--warning-foreground)] opacity-95 leading-relaxed">
                Há uma fatura da consultoria com período de carência ativo. Realize o pagamento para
                evitar a suspensão automática dos serviços.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="secondary" size="sm" className="min-h-[44px] font-bold">
                Ver Fatura & Pix →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE HERO: Gestão de Equipe & Operação */}
      {overview ? (
        <div className="relative rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-7 md:p-8 shadow-xs depth-surface space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--brand)] text-white shadow-2xs">
                  Executive SaaS
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Administrador da Consultoria
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  Cockpit de Gestão & Equipe
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                  Acompanhe a capacidade operacional da equipe, gerencie matrículas de alunos, receitas e conformidade de assinaturas.
                </p>
              </div>

              {/* Total Members Highlight & Role Breakdown Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <div className="flex items-baseline gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                  <span className="font-heading text-xl font-extrabold text-[var(--text-primary)]">
                    {overview.activeMembers}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {overview.activeMembers === 1 ? "membro ativo" : "membros ativos"}
                  </span>
                </div>

                <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.students}</strong>{" "}
                  {overview.students === 1 ? "Aluno" : "Alunos"}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.personals}</strong>{" "}
                  {overview.personals === 1 ? "Personal" : "Personais"}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.nutritionists}</strong>{" "}
                  {overview.nutritionists === 1 ? "Nutricionista" : "Nutricionistas"}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
                  <strong className="text-[var(--text-primary)] font-bold">{overview.admins}</strong>{" "}
                  {overview.admins === 1 ? "Admin" : "Admins"}
                </span>
              </div>
            </div>

            {/* Protagonist CTA */}
            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
              <Link href={`/consultoria/${consultancySlug}/membros`} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2">
                  <TeamLinearIcon className="w-4 h-4" />
                  <span>Gerenciar Membros</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] text-center text-xs text-[var(--text-secondary)]">
          Dados da equipe indisponíveis no momento.
        </div>
      )}

      {/* 3. OPERATIONAL CENTRAL MODULES (84vw Snap Cards on Mobile, 3-column on Desktop) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Central Operacional da Consultoria
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Gestão financeira, influenciadores e plataforma
          </span>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {/* Module 1: Financeiro dos Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4 depth-surface min-h-[190px]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <FinanceLinearIcon className="w-5 h-5" />
                </div>
                <Badge variant="brand" size="sm">
                  Receita
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Financeiro dos Alunos
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Controle de mensalidades, cobranças Pix, faturas em aberto e conciliação de comprovantes.
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-[var(--brand)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span>Acessar financeiro</span>
              <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 2: Missões de Influenciadores */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4 depth-surface min-h-[190px]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <MissionsLinearIcon className="w-5 h-5" />
                </div>
                <Badge variant="neutral" size="sm">
                  Influenciadores
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Missões VIP & Embaixadores
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Atribuição de missões a embaixadores, upload de comprovações e revisão das entregas de marketing.
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-[var(--brand)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span>Gerenciar missões</span>
              <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 3: Assinatura Trevo One */}
          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4 depth-surface min-h-[190px]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <SubscriptionLinearIcon className="w-5 h-5" />
                </div>
                <Badge variant="brand" size="sm">
                  Plataforma
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Assinatura Trevo One
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  Gestão do plano SaaS da consultoria, faturas institucionais e controle de carência operacional.
                </p>
              </div>
            </div>

            <div className="text-xs font-bold text-[var(--brand)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span>Ver faturas & plano</span>
              <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* 4. GOVERNANCE & SECURITY AUDIT FOOTER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">🛡️</span>
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Segregação Multi-Tenant & LGPD
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Todos os dados de alunos, rotinas, cardápios e histórico financeiro são restritos e isolados para esta consultoria.
          </p>
        </div>
        <div className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          Isolamento Seguro
        </div>
      </div>
    </div>
  );
}
