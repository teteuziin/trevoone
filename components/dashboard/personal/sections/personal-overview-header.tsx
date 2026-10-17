import React from "react";
import Link from "next/link";

export interface PersonalOverviewHeaderProps {
  consultancySlug: string;
  totalStudents?: number | null;
  totalWorkouts?: number | null;
  prescribedBlocksCount?: number | null;
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

  return (
    <header className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-[var(--cockpit-border-default)]">
      {/* Lado Esquerdo: Título (D1) + Linha de Contexto (D4) */}
      <div className="flex flex-col">
        <h1 className="text-2xl font-semibold text-[var(--cockpit-text-primary)] leading-tight tracking-tight">
          Visão geral
        </h1>
        <p className="text-xs text-[var(--cockpit-text-secondary)] mt-1 font-normal select-none">
          {studentsCount} {studentsCount === 1 ? "aluno ativo" : "alunos ativos"} · {workoutsCount}{" "}
          {workoutsCount === 1 ? "ficha" : "fichas"} ·{" "}
          {workoutsCount > 50
            ? `${blocksCount} blocos nas 50 fichas mais recentes`
            : `${blocksCount} ${blocksCount === 1 ? "bloco em uso" : "blocos em uso"}`}
        </p>
      </div>

      {/* Lado Direito: Ações Desktop (D3 - 14px) */}
      <div className="flex items-center gap-2.5">
        <Link
          href={`/consultoria/${consultancySlug}/rotinas?action=import`}
          prefetch={false}
          className="inline-flex items-center justify-center px-3.5 h-[40px] text-sm font-medium text-[var(--cockpit-text-primary)] bg-[var(--cockpit-surface-default)] hover:bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] rounded-md transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
        >
          Importar treino
        </Link>
        <Link
          href={`/consultoria/${consultancySlug}/rotinas/novo`}
          prefetch={false}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 h-[40px] text-sm font-semibold text-white bg-[var(--cockpit-action-primary)] hover:bg-[var(--cockpit-action-hover)] active:bg-[var(--cockpit-action-active)] border border-[var(--cockpit-action-primary)] rounded-md transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)] focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nova ficha</span>
        </Link>
      </div>

      {/* Botão Fixo Mobile (+ Nova ficha acima da barra inferior) */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        prefetch={false}
        aria-label="Criar nova ficha de treino"
        className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 min-h-[48px] px-4 rounded-full bg-[var(--cockpit-action-primary)] text-white font-semibold text-sm flex items-center justify-center gap-2 border border-[var(--cockpit-action-primary)] select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)] focus:ring-offset-2 active:scale-95 transition-transform"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nova ficha</span>
      </Link>
    </header>
  );
}
