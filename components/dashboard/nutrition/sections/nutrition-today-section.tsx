"use client";

import React from "react";
import Link from "next/link";

export interface NutritionTodayConsultation {
  publicId: string;
  patientName: string;
  timeFormatted: string;
  type?: string;
  status: string;
  statusLabel?: string;
  canJoinNow?: boolean;
  href?: string;
}

export interface NutritionTodaySectionProps {
  consultancySlug: string;
  consultations?: NutritionTodayConsultation[] | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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

export function NutritionTodayBanner({
  consultancySlug,
}: {
  consultancySlug: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-2xs text-xs sm:text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500/80 shrink-0" aria-hidden="true" />
        <span className="font-semibold text-[#17191D] dark:text-white shrink-0">Hoje:</span>
        <span className="text-[#4B5563] dark:text-[#C2C8CF] truncate">nenhuma consulta agendada.</span>
      </div>
      <Link
        href={`/consultoria/${consultancySlug}/consultas`}
        prefetch={false}
        className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 transition-colors shrink-0 ml-3"
      >
        Ver agenda →
      </Link>
    </div>
  );
}

export function NutritionTodaySection({
  consultancySlug,
  consultations = [],
  isLoading = false,
  isError = false,
  onRetry,
}: NutritionTodaySectionProps) {
  if (isLoading) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-1/4" />
          <div className="h-10 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
        <div className="bg-white dark:bg-[#151619] border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-red-600 dark:text-red-300">
            Não foi possível carregar a agenda de hoje.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F4F6] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border border-[#E5E7EB] dark:border-[#303238] hover:border-red-500/40 cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  const items = consultations || [];

  if (items.length === 0) {
    return <NutritionTodayBanner consultancySlug={consultancySlug} />;
  }

  return (
    <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
      <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs">
        {/* Cabeçalho da Faixa */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#6B7280] dark:text-[#8E95A2]" />
            <h2 className="text-sm font-bold text-[#17191D] dark:text-white">
              Hoje
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {items.length} {items.length === 1 ? "compromisso" : "compromissos"}
            </span>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            prefetch={false}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 hover:underline transition-colors shrink-0"
          >
            Ver agenda →
          </Link>
        </div>

        {/* Lista Vertical Compacta de Compromissos (sem carrossel) */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#303238]">
          {items.map((consultation) => {
            const targetHref = consultation.href || `/consultoria/${consultancySlug}/consultas`;

            return (
              <div
                key={consultation.publicId}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-10 rounded-xl bg-[#F0F1F3] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center text-xs font-bold font-mono text-emerald-700 dark:text-[#10B981] shrink-0 tabular-nums">
                    {consultation.timeFormatted}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#17191D] dark:text-white break-words">
                      {consultation.patientName}
                    </p>
                    <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF] mt-0.5 truncate">
                      {consultation.type || "Consulta agendada"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:shrink-0 pt-1 sm:pt-0">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] text-[#4B5563] dark:text-[#C2C8CF] shrink-0">
                    {consultation.statusLabel || consultation.status}
                  </span>

                  <Link
                    href={targetHref}
                    prefetch={false}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs select-none cursor-pointer"
                  >
                    <span>Abrir consulta</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
