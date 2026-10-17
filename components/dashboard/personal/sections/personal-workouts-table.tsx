"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PersonalWorkoutRow {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: string; // "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED"
  difficultyLevel?: string;
  blocksCount?: number;
  currentVersionStatus?: string | null;
  assignedStudentName?: string | null;
  activeAssignmentsCount?: number;
  isTemplate?: boolean;
  updatedAt?: string | null;
  hasActiveDraft?: boolean;
  draftVersionNumber?: number | null;
}

export interface PersonalWorkoutsTableProps {
  consultancySlug: string;
  workouts?: PersonalWorkoutRow[];
  totalWorkouts?: number;
  isLoading?: boolean;
}

export type SortOption = "oldest" | "recent" | "name";
export type StatusFilterOption = "ALL" | "DRAFT" | "PUBLISHED";
export type BlocksFilterOption = "ALL" | "FEW_BLOCKS" | "MANY_BLOCKS";

export function formatDate(isoString?: string | null): string {
  if (!isoString) return "Não disponível";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Não disponível";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Não disponível";
  }
}

export function resolveStudentDisplay(w: PersonalWorkoutRow): string {
  if (w.isTemplate) return "Modelo";
  if (w.activeAssignmentsCount && w.activeAssignmentsCount > 1) {
    return `Múltiplos alunos (${w.activeAssignmentsCount})`;
  }
  if (w.assignedStudentName && w.assignedStudentName.trim()) {
    return w.assignedStudentName.trim();
  }
  return "Sem aluno";
}

export function resolveStatusLabel(w: PersonalWorkoutRow): string {
  if (w.currentVersionStatus === "DRAFT" || w.status === "DRAFT" || w.hasActiveDraft) {
    return "Rascunho";
  }
  if (w.status === "ARCHIVED" || w.currentVersionStatus === "ARCHIVED") {
    return "Arquivada";
  }
  return "Publicada";
}

export function formatBlocksCount(blocksCount?: number | null): string {
  if (typeof blocksCount === "number" && !isNaN(blocksCount)) {
    return `${blocksCount} ${blocksCount === 1 ? "bloco" : "blocos"}`;
  }
  return "—";
}

export interface FilterAndSortWorkoutsParams {
  workouts: PersonalWorkoutRow[];
  searchTerm: string;
  statusFilter: StatusFilterOption;
  blocksFilter: BlocksFilterOption;
  sortBy: SortOption;
}

export function filterAndSortWorkouts({
  workouts,
  searchTerm,
  statusFilter,
  blocksFilter,
  sortBy,
}: FilterAndSortWorkoutsParams): PersonalWorkoutRow[] {
  let result = [...workouts];

  // 1. Busca textual (nome da ficha ou aluno)
  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    result = result.filter((w) => {
      const titleMatch = w.title.toLowerCase().includes(q);
      const student = resolveStudentDisplay(w).toLowerCase();
      const studentMatch = student.includes(q);
      return titleMatch || studentMatch;
    });
  }

  // 2. Filtro de Status
  if (statusFilter !== "ALL") {
    result = result.filter((w) => {
      const isDraft =
        w.status === "DRAFT" ||
        w.currentVersionStatus === "DRAFT" ||
        w.hasActiveDraft;
      if (statusFilter === "DRAFT") return isDraft;
      if (statusFilter === "PUBLISHED") return !isDraft;
      return true;
    });
  }

  // 3. Filtro por Quantidade de Blocos
  if (blocksFilter !== "ALL") {
    result = result.filter((w) => {
      if (typeof w.blocksCount !== "number" || isNaN(w.blocksCount)) {
        return false;
      }
      if (blocksFilter === "FEW_BLOCKS") return w.blocksCount <= 3;
      if (blocksFilter === "MANY_BLOCKS") return w.blocksCount >= 4;
      return true;
    });
  }

  // 4. Ordenação
  result.sort((a, b) => {
    if (sortBy === "name") {
      return a.title.localeCompare(b.title, "pt-BR");
    }
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (sortBy === "recent") {
      return timeB - timeA;
    }
    return timeA - timeB; // oldest
  });

  return result;
}

export function PersonalWorkoutsTable({
  consultancySlug,
  workouts = [],
  totalWorkouts = 0,
  isLoading = false,
}: PersonalWorkoutsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("oldest");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");
  const [blocksFilter, setBlocksFilter] = useState<BlocksFilterOption>("ALL");

  // Filtro e Ordenação Determinística
  const filteredWorkouts = useMemo(() => {
    return filterAndSortWorkouts({
      workouts,
      searchTerm,
      statusFilter,
      blocksFilter,
      sortBy,
    });
  }, [workouts, searchTerm, statusFilter, blocksFilter, sortBy]);

  if (isLoading) {
    return (
      <section aria-label="Fichas de treino" className="w-full space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white">Fichas</h2>
        <div className="bg-[#151619] border border-[#303238] rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="h-10 bg-[#1B1D21] rounded w-full" />
          <div className="h-12 bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="fichas" aria-label="Fichas de treino" className="w-full space-y-3.5">
      {/* 1. Header e Controles da Seção Fichas */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
              Fichas
            </h2>
            <span className="text-xs text-[#6B7280] dark:text-[#8E95A2] font-semibold tabular-nums font-mono">
              ({totalWorkouts || workouts.length})
            </span>
          </div>

          {/* Filtros e Ordenação */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#8E95A2] shrink-0 font-medium">
              <span className="hidden sm:inline">Ordem:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[44px] px-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981] cursor-pointer"
                aria-label="Critério de ordenação das fichas"
              >
                <option value="oldest">Atualizações mais antigas</option>
                <option value="recent">Atualizações mais recentes</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>

            {/* Filtros Rápidos de Status */}
            <div className="inline-flex flex-wrap rounded-xl p-1 bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "DRAFT"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Rascunhos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "PUBLISHED"
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Publicadas
              </button>
            </div>

            {/* Filtros por Quantidade de Blocos */}
            <div className="inline-flex flex-wrap rounded-xl p-1 bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] max-w-full">
              <button
                type="button"
                onClick={() => setBlocksFilter("ALL")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  blocksFilter === "ALL"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Todos os blocos
              </button>
              <button
                type="button"
                onClick={() => setBlocksFilter("FEW_BLOCKS")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  blocksFilter === "FEW_BLOCKS"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Até 3 blocos
              </button>
              <button
                type="button"
                onClick={() => setBlocksFilter("MANY_BLOCKS")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  blocksFilter === "MANY_BLOCKS"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                4+ blocos
              </button>
            </div>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="w-full">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome da ficha ou aluno..."
              className="w-full h-[44px] pl-9 pr-12 text-xs sm:text-sm font-medium bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
            <svg
              className="w-4 h-4 text-[#9CA3AF] dark:text-[#8E95A2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-0 h-full w-[44px] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-r-xl text-[#9CA3AF] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tabela Desktop ou Lista Mobile */}
      {filteredWorkouts.length === 0 ? (
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <p className="text-sm font-medium text-[#6B7280] dark:text-[#8E95A2]">
            {searchTerm.trim() || statusFilter !== "ALL" || blocksFilter !== "ALL"
              ? "Nenhuma ficha encontrada para os filtros aplicados."
              : "Nenhuma ficha cadastrada ainda."}
          </p>
          {!searchTerm.trim() && statusFilter === "ALL" && blocksFilter === "ALL" && (
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="inline-flex mt-2 px-5 min-h-[44px] items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:translate-y-[1px] transition-colors cursor-pointer"
            >
              + Nova ficha
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP: TABELA DE 6 COLUNAS */}
          <div className="hidden md:block bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F9FAFB] dark:bg-[#1B1D21] border-b border-[#E5E7EB] dark:border-[#303238]">
                <tr>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Aluno
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Ficha
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Blocos
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Atualizada em
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider text-right">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#303238]">
                {filteredWorkouts.map((workout) => {
                  const isDraft =
                    workout.status === "DRAFT" ||
                    workout.currentVersionStatus === "DRAFT" ||
                    workout.hasActiveDraft;

                  return (
                    <tr
                      key={workout.publicId}
                      className="h-auto min-h-[52px] hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors"
                    >
                      {/* Aluno */}
                      <td className="py-3.5 px-4 text-sm font-semibold text-[#17191D] dark:text-white break-words">
                        {resolveStudentDisplay(workout)}
                      </td>

                      {/* Ficha */}
                      <td className="py-3.5 px-4 text-sm font-bold text-[#17191D] dark:text-white max-w-xs break-words">
                        {workout.title}
                      </td>

                      {/* Blocos */}
                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-700 dark:text-[#10B981] tabular-nums font-mono">
                        {formatBlocksCount(workout.blocksCount)}
                      </td>

                      {/* Atualizada em */}
                      <td className="py-3.5 px-4 text-xs font-normal text-[#4B5563] dark:text-[#C2C8CF] tabular-nums font-mono">
                        {formatDate(workout.updatedAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isDraft ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 select-none">
                            Rascunho
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 select-none">
                            Publicada
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`}
                          prefetch={false}
                          className="inline-flex items-center min-h-[44px] text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 hover:underline"
                        >
                          Abrir ficha
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISÃO MOBILE: LISTA VERTICAL */}
          <div className="md:hidden bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
            {filteredWorkouts.map((workout) => {
              const isDraft =
                workout.status === "DRAFT" ||
                workout.currentVersionStatus === "DRAFT" ||
                workout.hasActiveDraft;

              return (
                <div
                  key={workout.publicId}
                  onClick={() =>
                    router.push(`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`)
                  }
                  className="p-4 min-h-[64px] flex flex-col justify-center gap-1.5 active:bg-[#F3F4F6] dark:active:bg-[#1B1D21]/50 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(
                        `/consultoria/${consultancySlug}/rotinas/${workout.publicId}`
                      );
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#17191D] dark:text-white leading-snug break-words">
                      {workout.title}
                    </p>
                    {isDraft ? (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 shrink-0 select-none">
                        Rascunho
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 shrink-0 select-none">
                        Publicada
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium">
                    <span className="font-semibold text-[#17191D] dark:text-white break-words">
                      {resolveStudentDisplay(workout)}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums font-bold text-emerald-700 dark:text-[#10B981] font-mono">
                      {formatBlocksCount(workout.blocksCount)}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums font-mono">{formatDate(workout.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
