"use client";

import React from "react";
import Link from "next/link";

export interface NutritionAttentionItem {
  id: string;
  patientName: string;
  planTitle?: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
  severity?: "warning" | "danger" | "neutral";
  isTemplate?: boolean;
}

export interface NutritionAttentionSectionProps {
  consultancySlug: string;
  items?: NutritionAttentionItem[] | null;
  totalPlans?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function AlertTriangleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function DocumentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "PL";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function NutritionAttentionSection({
  consultancySlug,
  items,
  isLoading = false,
  isError = false,
  onRetry,
}: NutritionAttentionSectionProps) {
  if (isLoading) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-1/4" />
          <div className="h-12 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
          Precisa de atenção
        </h2>
        <div className="bg-white dark:bg-[#151619] border border-red-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-red-600 dark:text-red-300">
            Não foi possível carregar as pendências no momento.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F4F6] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border border-[#E5E7EB] dark:border-[#303238] hover:border-red-500/40 cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  // Tratamento de falha de carregamento upstream
  if (items === null) {
    return (
      <section aria-label="Precisa de atenção" className="w-full space-y-3">
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-5 text-center">
          <p className="text-sm font-medium text-[#4B5563] dark:text-[#C2C8CF]">
            Não foi possível verificar pacientes que precisam de atenção.
          </p>
        </div>
      </section>
    );
  }

  const attentionList = items || [];
  const totalCount = attentionList.length;
  const visibleItems = attentionList.slice(0, 5);

  return (
    <section aria-label="Precisa de atenção" className="w-full space-y-3">
      {/* Header: 2 lines on small screens if needed, 1 line on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
            Precisa de atenção
          </h2>
          {totalCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {totalCount} {totalCount === 1 ? "pendência" : "pendências"}
            </span>
          )}
        </div>

        <Link
          href={`/consultoria/${consultancySlug}/planos-v2`}
          prefetch={false}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 hover:underline transition-colors shrink-0 self-start sm:self-auto"
        >
          Ver todos os planos →
        </Link>
      </div>

      {totalCount === 0 ? (
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-5 shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] flex items-center justify-center shrink-0">
            <CheckIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#17191D] dark:text-white">
              Tudo em dia!
            </p>
            <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF]">
              Nenhum paciente ou plano alimentar requer sua atenção no momento.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
          {visibleItems.map((item) => {
            const hasPatient = Boolean(
              item.patientName &&
                item.patientName !== "Plano sem paciente" &&
                item.patientName !== "Plano individual" &&
                item.patientName !== "Modelo de plano" &&
                !item.isTemplate
            );

            const primaryTitle = hasPatient
              ? item.patientName
              : item.planTitle && item.planTitle !== "Plano sem paciente"
              ? item.planTitle
              : item.isTemplate
              ? "Modelo de plano"
              : "Plano alimentar";

            const secondaryInfo = hasPatient
              ? item.planTitle && item.planTitle !== item.patientName
                ? item.planTitle
                : null
              : item.isTemplate
              ? "Modelo de plano"
              : "Sem paciente vinculado";

            return (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21] transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {hasPatient ? (
                    <div
                      className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1B1D21] border border-slate-200 dark:border-[#303238] flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white shrink-0 shadow-2xs"
                      aria-hidden="true"
                    >
                      {getInitials(item.patientName)}
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1B1D21] border border-slate-200 dark:border-[#303238] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs"
                      aria-hidden="true"
                    >
                      <DocumentIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#17191D] dark:text-white truncate leading-snug">
                      {primaryTitle}
                    </p>
                    {secondaryInfo && (
                      <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] font-normal truncate mt-0.5 leading-snug">
                        {secondaryInfo}
                      </p>
                    )}
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1 leading-snug">
                      <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.reason}</span>
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto sm:shrink-0 pt-1 sm:pt-0">
                  <Link href={item.actionHref} prefetch={false} className="w-full sm:w-auto block">
                    <button
                      type="button"
                      className="w-full sm:w-auto px-4 min-h-[44px] rounded-xl font-bold text-xs bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] border border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-white flex items-center justify-center gap-2 cursor-pointer active:translate-y-[1px] transition-colors shadow-2xs"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#8E95A2]" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
