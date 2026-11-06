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

function StarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function CurrencyDollarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertChecklistIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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
      {/* Grid responsivo: 3 colunas em qualquer tela, super compacto no mobile (sem cards verticais gigantes) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        {/* ============================================================== */}
        {/* INDICADOR 1 — SATISFAÇÃO                                      */}
        {/* ============================================================== */}
        <button
          type="button"
          onClick={() => onSelectTab("satisfaction")}
          aria-pressed={activeTab === "satisfaction"}
          aria-label="Indicador de Satisfação dos Alunos"
          className={`group w-full text-left p-2.5 sm:p-4 rounded-xl border transition-all duration-150 min-h-[58px] sm:min-h-[82px] flex flex-col justify-center cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "satisfaction"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs ring-1 ring-[#10B981]"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/50 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span
              className={`p-1 rounded-md shrink-0 transition-colors ${
                activeTab === "satisfaction"
                  ? "bg-[#10B981]/15 text-[#047857] dark:text-[#10B981]"
                  : "bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              }`}
            >
              <StarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
              Satisfação
            </span>
          </div>

          <div className="mt-1 sm:mt-1.5 min-w-0">
            <span className="text-xs sm:text-lg font-black text-[var(--text-primary)] tracking-tight block truncate">
              {satisfactionRating != null ? `${satisfactionRating.toFixed(1).replace(".", ",")}/5` : "Sem avaliações"}
            </span>
            <span className="hidden sm:block text-[11px] text-[var(--text-secondary)] truncate font-medium mt-0.5">
              {totalReviews > 0 ? `${totalReviews} avaliações reais` : "Coleta não iniciada"}
            </span>
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
          className={`group w-full text-left p-2.5 sm:p-4 rounded-xl border transition-all duration-150 min-h-[58px] sm:min-h-[82px] flex flex-col justify-center cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "finance"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs ring-1 ring-[#10B981]"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/50 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span
              className={`p-1 rounded-md shrink-0 transition-colors ${
                activeTab === "finance"
                  ? "bg-[#10B981]/15 text-[#047857] dark:text-[#10B981]"
                  : "bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              }`}
            >
              <CurrencyDollarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
              Financeiro
            </span>
          </div>

          <div className="mt-1 sm:mt-1.5 min-w-0">
            <span className="text-xs sm:text-lg font-black text-[var(--text-primary)] tracking-tight block truncate">
              {hasFinanceAccess ? `${toReceiveFormatted}` : "Acesso restrito"}
            </span>
            <span className="hidden sm:block text-[11px] text-[var(--text-secondary)] truncate font-medium mt-0.5">
              {hasFinanceAccess
                ? `${upcomingCount} ${upcomingCount === 1 ? "vencimento" : "vencimentos"}${
                    overdueCount > 0 ? ` · ${overdueCount} em atraso` : ""
                  }`
                : "Restrito ao administrador"}
            </span>
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
          className={`group w-full text-left p-2.5 sm:p-4 rounded-xl border transition-all duration-150 min-h-[58px] sm:min-h-[82px] flex flex-col justify-center cursor-pointer select-none relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
            activeTab === "issues"
              ? "bg-[#F3F4F6] dark:bg-[#1C1E23] border-[#10B981] shadow-xs ring-1 ring-[#10B981]"
              : "bg-white dark:bg-[#151619] border-[#E5E7EB] dark:border-[#303238] hover:border-[#10B981]/50 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span
              className={`p-1 rounded-md shrink-0 transition-colors ${
                activeTab === "issues"
                  ? "bg-[#10B981]/15 text-[#047857] dark:text-[#10B981]"
                  : "bg-[#F3F4F6] dark:bg-[#1B1D21] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              }`}
            >
              <AlertChecklistIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider truncate">
              Resolver
            </span>
          </div>

          <div className="mt-1 sm:mt-1.5 min-w-0">
            <span className="text-xs sm:text-lg font-black text-[var(--text-primary)] tracking-tight block truncate">
              {pendingIssuesCount > 0
                ? `${studentsWithoutWorkoutCount} ${studentsWithoutWorkoutCount === 1 ? "aluno" : "alunos"}`
                : "Tudo em dia"}
            </span>
            <span className="hidden sm:block text-[11px] text-[var(--text-secondary)] truncate font-medium mt-0.5">
              {pendingIssuesCount > 0
                ? `${studentsWithoutWorkoutCount} sem ficha${draftsCount > 0 ? ` · ${draftsCount} rascunhos` : ""}`
                : "Nenhum aluno sem treino"}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}
