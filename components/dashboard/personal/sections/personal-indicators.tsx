"use client";

import React from "react";

export type IndicatorTabType = "satisfaction" | "finance" | "issues";

export interface PersonalFinanceIndicatorData {
  hasAccess: boolean;
  toReceiveCents: number;
  overdueCount: number;
  upcomingChargesCount: number;
}

export interface PersonalIndicatorsProps {
  consultancySlug: string;
  activeTab: IndicatorTabType;
  onSelectTab: (tab: IndicatorTabType) => void;
  satisfactionRating?: number | null;
  totalReviews?: number;
  financeSummary?: PersonalFinanceIndicatorData;
  pendingIssuesCount: number;
  studentsWithoutWorkoutCount: number;
  draftsCount: number;
  className?: string;
}

function StarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function CurrencyDollarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertChecklistIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function PersonalIndicators({
  activeTab,
  onSelectTab,
  satisfactionRating,
  totalReviews = 0,
  financeSummary,
  pendingIssuesCount,
  studentsWithoutWorkoutCount,
  draftsCount,
  className = "",
}: PersonalIndicatorsProps) {
  const hasFinanceAccess = financeSummary?.hasAccess ?? false;
  const toReceiveBrl = (financeSummary?.toReceiveCents || 0) / 100;
  const toReceiveFormatted = `R$ ${toReceiveBrl.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const upcomingCount = financeSummary?.upcomingChargesCount || 0;
  const overdueCount = financeSummary?.overdueCount || 0;

  return (
    <section aria-label="Indicadores principais do treinador" className={`w-full ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* ============================================================== */}
        {/* INDICADOR 1 — SATISFAÇÃO                                      */}
        {/* ============================================================== */}
        <button
          type="button"
          onClick={() => onSelectTab("satisfaction")}
          aria-pressed={activeTab === "satisfaction"}
          aria-label="Indicador de Satisfação dos Alunos"
          className={`group w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 min-h-[92px] sm:min-h-[104px] flex flex-col justify-between cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "satisfaction"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  activeTab === "satisfaction"
                    ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#047857] dark:text-[#10B981]"
                    : "bg-[#F3F4F6] dark:bg-[#1B1D21] border-[#E5E7EB] dark:border-[#303238] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                <StarIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
                Satisfação
              </span>
            </div>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] border border-[#E5E7EB] dark:border-[#303238] shrink-0">
              {totalReviews > 0 ? `${totalReviews} ${totalReviews === 1 ? "avaliação" : "avaliações"}` : "Sem notas"}
            </span>
          </div>

          <div className="mt-2 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight">
                {satisfactionRating != null ? `${satisfactionRating.toFixed(1).replace(".", ",")}/5` : "Sem avaliações"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-medium">
              {satisfactionRating != null
                ? "Média baseada em avaliações reais"
                : "Coleta ainda não iniciada"}
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-[#E5E7EB]/80 dark:border-[#303238]/60 flex items-center justify-between text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            <span>Ver detalhes</span>
            <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* ============================================================== */}
        {/* INDICADOR 2 — FINANCEIRO                                      */}
        {/* ============================================================== */}
        <button
          type="button"
          onClick={() => onSelectTab("finance")}
          aria-pressed={activeTab === "finance"}
          aria-label="Indicador Financeiro da Consultoria"
          className={`group w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 min-h-[92px] sm:min-h-[104px] flex flex-col justify-between cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "finance"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  activeTab === "finance"
                    ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#047857] dark:text-[#10B981]"
                    : "bg-[#F3F4F6] dark:bg-[#1B1D21] border-[#E5E7EB] dark:border-[#303238] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                <CurrencyDollarIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
                Financeiro
              </span>
            </div>

            {hasFinanceAccess ? (
              overdueCount > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shrink-0">
                  {overdueCount} {overdueCount === 1 ? "atrasado" : "atrasados"}
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  Em dia
                </span>
              )
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] border border-[#E5E7EB] dark:border-[#303238] shrink-0">
                Restrito
              </span>
            )}
          </div>

          <div className="mt-2 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight">
                {hasFinanceAccess ? `${toReceiveFormatted} a receber` : "Acesso restrito"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-medium">
              {hasFinanceAccess
                ? `${upcomingCount} ${upcomingCount === 1 ? "vencimento próximo" : "vencimentos próximos"}${
                    overdueCount > 0 ? ` · ${overdueCount} em atraso` : ""
                  }`
                : "Visualização restrita ao administrador"}
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-[#E5E7EB]/80 dark:border-[#303238]/60 flex items-center justify-between text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            <span>{hasFinanceAccess ? "Ver cobranças" : "Saiba mais"}</span>
            <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* ============================================================== */}
        {/* INDICADOR 3 — PRECISA RESOLVER                                */}
        {/* ============================================================== */}
        <button
          type="button"
          onClick={() => onSelectTab("issues")}
          aria-pressed={activeTab === "issues"}
          aria-label="Indicador de Pendências e Resolução"
          className={`group w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 min-h-[92px] sm:min-h-[104px] flex flex-col justify-between cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "issues"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  activeTab === "issues"
                    ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#047857] dark:text-[#10B981]"
                    : "bg-[#F3F4F6] dark:bg-[#1B1D21] border-[#E5E7EB] dark:border-[#303238] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                <AlertChecklistIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
                Precisa resolver
              </span>
            </div>

            {pendingIssuesCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                {pendingIssuesCount} {pendingIssuesCount === 1 ? "pendência" : "pendências"}
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Tudo em dia
              </span>
            )}
          </div>

          <div className="mt-2 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight">
                {pendingIssuesCount > 0
                  ? `${studentsWithoutWorkoutCount > 0 ? `${studentsWithoutWorkoutCount} ${studentsWithoutWorkoutCount === 1 ? "aluno" : "alunos"}` : `${pendingIssuesCount} pendências`}`
                  : "Tudo resolvido"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-medium">
              {pendingIssuesCount > 0
                ? `${studentsWithoutWorkoutCount} sem ficha ativa${
                    draftsCount > 0 ? ` · ${draftsCount} rascunhos` : ""
                  }`
                : "Nenhum aluno sem treino ativo"}
            </p>
          </div>

          <div className="mt-2 pt-2 border-t border-[#E5E7EB]/80 dark:border-[#303238]/60 flex items-center justify-between text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            <span>{pendingIssuesCount > 0 ? "Resolver agora" : "Ver alunos"}</span>
            <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </section>
  );
}
