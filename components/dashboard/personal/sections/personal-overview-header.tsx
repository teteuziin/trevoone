"use client";

import React from "react";
import Link from "next/link";

export interface PersonalOverviewHeaderProps {
  consultancySlug: string;
  totalStudents?: number | null;
  totalWorkouts?: number | null;
  prescribedBlocksCount?: number | null;
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l9.75 5.25 9.75-5.25-4.179-2.25m-15.321 4.5L2.25 16.5l9.75 5.25 9.75-5.25-4.179-2.25m-15.321-9L12 2.25l9.75 5.25-9.75 5.25-9.75-5.25z" />
    </svg>
  );
}

export function PersonalOverviewHeader({
  consultancySlug,
  totalStudents,
  totalWorkouts,
  prescribedBlocksCount = 0,
}: PersonalOverviewHeaderProps) {
  const studentsCount = totalStudents ?? 0;
  const workoutsCount = totalWorkouts ?? 0;
  const blocksCount = prescribedBlocksCount ?? 0;

  const displayStudents =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayPlans =
    totalWorkouts !== undefined && totalWorkouts !== null ? totalWorkouts : "—";

  return (
    <div className="w-full space-y-4">
      {/* 1. Header Tátil 3D Executivo */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#181A1F] to-[#121316] border-t border-white/[0.14] border-x border-b border-black/80 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                {studentsCount} {studentsCount === 1 ? "aluno sob gestão" : "alunos sob gestão"} · {workoutsCount}{" "}
                {workoutsCount === 1 ? "ficha ativa" : "fichas ativas"} · {blocksCount} blocos em uso
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Visão geral dos treinos
            </h1>

            <p className="text-xs sm:text-sm text-[#8E95A2] font-medium">
              Gerencie suas fichas e acompanhe seus alunos.
            </p>
          </div>

          {/* Ações Tácteis 3D Físicas */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-b from-[#24272E] to-[#16181D] hover:from-[#2B2F38] hover:to-[#1B1E24] border-t border-white/[0.18] border-b border-black/90 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-all cursor-pointer select-none"
            >
              <svg className="w-4 h-4 text-[#8E95A2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span>Importar treino</span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-b from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#10B981] text-white flex items-center justify-center gap-2 border-t border-emerald-300/40 border-b border-emerald-950/80 shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-[1px] transition-all cursor-pointer select-none"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Nova ficha</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Bento Grid 3D — Indicadores Físicos de Desempenho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Alunos */}
        <Link
          href={`/consultoria/${consultancySlug}/progresso/alunos`}
          prefetch={false}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#181A1F] to-[#121316] hover:from-[#202228] hover:to-[#16171B] border-t border-white/[0.14] border-x border-b border-black/80 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all group flex flex-col justify-between text-white min-h-[110px] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E95A2] uppercase tracking-wider">
              Alunos Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#0F1013] border border-white/[0.08] text-[#10B981] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors tabular-nums font-mono">
              {displayStudents}
            </span>
            <span className="text-xs font-semibold text-[#10B981] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Ver alunos →
            </span>
          </div>
        </Link>

        {/* Card 2: Fichas de Treino */}
        <Link
          href={`/consultoria/${consultancySlug}/rotinas`}
          prefetch={false}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#181A1F] to-[#121316] hover:from-[#202228] hover:to-[#16171B] border-t border-white/[0.14] border-x border-b border-black/80 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all group flex flex-col justify-between text-white min-h-[110px] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E95A2] uppercase tracking-wider">
              Fichas de Treino
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#0F1013] border border-white/[0.08] text-[#10B981] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <DumbbellIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors tabular-nums font-mono">
              {displayPlans}
            </span>
            <span className="text-xs font-semibold text-[#10B981] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              Ver todas →
            </span>
          </div>
        </Link>

        {/* Card 3: Blocos em Uso */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#181A1F] to-[#121316] border-t border-white/[0.14] border-x border-b border-black/80 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between text-white min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E95A2] uppercase tracking-wider">
              Blocos Prescritos
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#0F1013] border border-white/[0.08] text-[#10B981] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <LayersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums font-mono">
              {blocksCount}
            </span>
            <span className="text-xs text-[#8E95A2] font-semibold uppercase tracking-wider">
              Volume em uso
            </span>
          </div>
        </div>
      </div>

      {/* Botão Fixo Mobile (+ Nova ficha com sensação 3D) */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        prefetch={false}
        aria-label="Criar nova ficha de treino"
        className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 min-h-[48px] px-5 rounded-full bg-gradient-to-b from-[#10B981] to-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 border-t border-emerald-300/40 border-b border-emerald-950/80 shadow-[0_8px_20px_rgba(0,0,0,0.5),0_4px_14px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] select-none cursor-pointer focus:outline-none active:translate-y-[2px] transition-transform"
      >
        <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nova ficha</span>
      </Link>
    </div>
  );
}
