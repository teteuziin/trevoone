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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ActivityIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function PersonalOverviewHeader({
  consultancySlug,
  totalStudents = 0,
  totalWorkouts = 0,
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
      {/* 1. Header Executivo Grafite Sólido #151619 (Harmonizado com Administração) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-[#10B981] border border-emerald-500/20">
                Studio do Treinador
              </span>
              <span className="text-xs text-[#C2C8CF] hidden sm:inline select-none">
                {studentsCount} {studentsCount === 1 ? "aluno ativo" : "alunos ativos"} · {workoutsCount}{" "}
                {workoutsCount === 1 ? "ficha" : "fichas"} · {blocksCount} blocos em uso
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              Visão geral dos treinos
            </h1>

            <p className="text-xs sm:text-sm text-[#C2C8CF] font-sans">
              Gerencie suas fichas e acompanhe seus alunos.
            </p>
          </div>

          {/* Ações Rápidas de Alto Impacto */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer select-none"
            >
              <span>Importar treino</span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer select-none"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Nova ficha</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Métricas Bento Executivas (3 Cards Grafite Sólidos #151619 - Idênticos à Administração) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Alunos */}
        <Link
          href={`/consultoria/${consultancySlug}/progresso/alunos`}
          prefetch={false}
          className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Alunos Ativos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
              <UsersIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors tabular-nums font-sans">
              {displayStudents}
            </span>
            <span className="text-xs font-semibold text-[#10B981] group-hover:translate-x-0.5 transition-transform">
              Ver alunos →
            </span>
          </div>
        </Link>

        {/* Card 2: Fichas de Treino */}
        <Link
          href={`/consultoria/${consultancySlug}/rotinas`}
          prefetch={false}
          className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Fichas de Treino
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
              <DumbbellIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors tabular-nums font-sans">
              {displayPlans}
            </span>
            <span className="text-xs font-semibold text-[#10B981] group-hover:translate-x-0.5 transition-transform">
              Ver todas →
            </span>
          </div>
        </Link>

        {/* Card 3: Blocos em Uso */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] transition-all flex flex-col justify-between shadow-sm text-white min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Blocos Prescritos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
              <ActivityIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums font-sans">
              {blocksCount}
            </span>
            <span className="text-xs text-[#C2C8CF] font-medium">
              Volume em uso
            </span>
          </div>
        </div>
      </div>

      {/* Botão Fixo Mobile (+ Nova ficha na barra inferior) */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        prefetch={false}
        aria-label="Criar nova ficha de treino"
        className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 min-h-[48px] px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg border border-emerald-400/40 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 active:scale-95 transition-transform"
      >
        <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nova ficha</span>
      </Link>
    </div>
  );
}
