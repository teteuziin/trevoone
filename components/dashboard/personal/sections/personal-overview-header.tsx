"use client";

import React from "react";
import Link from "next/link";
import {
  DuotoneStudentsIcon,
  DuotoneTrainingIcon,
  DuotoneExercisesIcon,
} from "@/components/ui/icons/duotone-icons";

export interface PersonalOverviewHeaderProps {
  consultancySlug: string;
  totalStudents?: number | null;
  totalWorkouts?: number | null;
  prescribedBlocksCount?: number | null;
}

export function PersonalOverviewHeader({
  consultancySlug,
  totalStudents,
  totalWorkouts,
  prescribedBlocksCount = 0,
}: PersonalOverviewHeaderProps) {
  const blocksCount = prescribedBlocksCount ?? 0;

  const displayStudents =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayPlans =
    totalWorkouts !== undefined && totalWorkouts !== null ? totalWorkouts : "—";

  return (
    <div className="w-full">
      {/* 1. Header Card Sólido Executivo com Indicadores Integrados Compactos */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                Treinador · Painel de Prescrição
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Visão geral dos treinos
            </h1>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm"
            >
              <svg className="w-4 h-4 text-[#8E95A2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>Importar treino</span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nova ficha</span>
            </Link>
          </div>
        </div>

        {/* Linha de Indicadores Compactos Integrados (sem blocos gigantes separados) */}
        <div className="mt-5 pt-4 border-t border-[#303238] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-blue-500/50 flex items-center justify-center shrink-0">
              <DuotoneStudentsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors font-mono tabular-nums">
                  {displayStudents}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">alunos sob gestão</span>
              </div>
              <span className="text-[11px] text-blue-400 group-hover:underline block truncate font-medium">
                Ver alunos →
              </span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-orange-500/50 flex items-center justify-center shrink-0">
              <DuotoneTrainingIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-orange-400 transition-colors font-mono tabular-nums">
                  {displayPlans}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">fichas ativas</span>
              </div>
              <span className="text-[11px] text-orange-400 group-hover:underline block truncate font-medium">
                Ver todas →
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 p-2.5 rounded-xl sm:border-l sm:border-[#303238]/60 sm:pl-4">
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] flex items-center justify-center shrink-0">
              <DuotoneExercisesIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white font-mono tabular-nums">
                  {blocksCount}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">blocos em uso</span>
              </div>
              <span className="text-[11px] text-[#8E95A2] block truncate font-medium">
                Prescritos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Fixo Mobile (Nova ficha) */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        prefetch={false}
        aria-label="Criar nova ficha de treino"
        className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 min-h-[48px] px-5 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg select-none cursor-pointer focus:outline-none active:translate-y-[2px] transition-transform"
      >
        <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nova ficha</span>
      </Link>
    </div>
  );
}
