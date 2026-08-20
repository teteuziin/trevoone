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

export function DashboardAdminView({
  consultancySlug,
  overview,
  platformAccess,
}: DashboardAdminViewProps) {
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";

  return (
    <div className="space-y-6">
      {/* 1. Alertas de Assinatura da Plataforma */}
      {isSuspendedOrCanceled && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="danger" size="sm">
                  {platformAccess.effectiveStatus === "CANCELED" ? "Assinatura Cancelada" : "Serviços Suspensos"}
                </Badge>
                <span className="text-xs font-semibold text-[var(--danger-foreground)]">
                  Acesso operacional bloqueado
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--danger-foreground)] opacity-90">
                {platformAccess.effectiveStatus === "CANCELED"
                  ? "A assinatura desta consultoria foi cancelada. Entre em contato com o suporte da plataforma."
                  : platformAccess.effectiveReason === "NONPAYMENT"
                  ? "O acesso aos módulos operacionais foi suspenso devido a faturas em atraso além do período de carência."
                  : `A consultoria foi suspensa administrativamente: ${platformAccess.manualSuspensionReason || "Sem motivo informado."}`}
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="danger" size="sm">
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
                  Fatura da consultoria vencida
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--warning-foreground)] opacity-90">
                Há uma fatura em aberto com período de carência ativo. Regularize o pagamento para evitar a suspensão dos serviços.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`} className="shrink-0">
              <Button variant="secondary" size="sm">
                Ver Fatura e Pix →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Faixa Consolidada de Métricas de Membros */}
      {overview && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 font-bold text-base">
              {overview.activeMembers}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Membros Ativos
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Total de usuários cadastrados e vinculados à consultoria
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)]">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">{overview.students}</strong> {overview.students === 1 ? "Aluno" : "Alunos"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">{overview.personals}</strong> {overview.personals === 1 ? "Personal" : "Personais"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">{overview.nutritionists}</strong> {overview.nutritionists === 1 ? "Nutricionista" : "Nutricionistas"}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">{overview.admins}</strong> {overview.admins === 1 ? "Admin" : "Admins"}
            </span>
          </div>
        </div>
      )}

      {/* 3. Hub de Gestão da Consultoria (Grid 2x2 de Ações Operacionais) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Central de Gestão
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Membros & Convites */}
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Membros & Convites
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Consulte, convide e gerencie todos os alunos, profissionais e gestores da consultoria.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Gerenciar membros</span>
              <span>→</span>
            </div>
          </Link>

          {/* Missões (Influenciadores / VIP) */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Missões (Influenciadores)
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Crie, acompanhe e revise as entregas de missões dos influenciadores parceiros.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Gerenciar missões</span>
              <span>→</span>
            </div>
          </Link>

          {/* Financeiro dos Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Financeiro dos Alunos
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Controle de mensalidades, cobranças Pix e regularização de alunos.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Acessar financeiro</span>
              <span>→</span>
            </div>
          </Link>

          {/* Assinatura da Consultoria */}
          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Assinatura Trevo One
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Gestão do plano da sua consultoria, faturas e controle de carência.
              </p>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Ver assinatura</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
