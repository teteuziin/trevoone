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

  // 2. Filtro de status (dimensão independente)
  if (statusFilter !== "ALL") {
    result = result.filter((w) => {
      const isDraft = w.currentVersionStatus === "DRAFT" || w.status === "DRAFT" || w.hasActiveDraft;
      if (statusFilter === "DRAFT") return isDraft;
      if (statusFilter === "PUBLISHED") return !isDraft && w.status !== "ARCHIVED";
      return true;
    });
  }

  // 3. Filtro por quantidade de blocos (dimensão independente combinável)
  if (blocksFilter !== "ALL") {
    result = result.filter((w) => {
      // Se a contagem for ausente (null ou undefined), não categoriza em faixa específica
      if (w.blocksCount === undefined || w.blocksCount === null || typeof w.blocksCount !== "number" || isNaN(w.blocksCount)) {
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

    // Tratamento definido para datas ausentes: ficam ao final
    if (!timeA && timeB) return 1;
    if (timeA && !timeB) return -1;
    if (!timeA && !timeB) return a.title.localeCompare(b.title, "pt-BR");

    if (sortBy === "oldest") {
      return timeA - timeB; // Atualizações mais antigas primeiro (ordenação padrão)
    }
    return timeB - timeA; // Mais recentes primeiro
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
        <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)]">Fichas</h2>
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-5 space-y-3 animate-pulse">
          <div className="h-10 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
          <div className="h-12 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
          <div className="h-12 bg-[var(--cockpit-surface-subtle)] rounded w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="fichas" aria-label="Fichas de treino" className="w-full space-y-4">
      {/* Cabeçalho da Seção com Título D2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-[var(--cockpit-text-primary)] leading-tight">
            Fichas
          </h2>
          <span className="text-xs text-[var(--cockpit-text-secondary)] font-normal tabular-nums">
            ({totalWorkouts || workouts.length})
          </span>
        </div>

        {/* Filtros e Ordenação */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Seletor de Ordenação */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--cockpit-text-secondary)] shrink-0">
            <span className="hidden sm:inline">Ordem:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="min-h-[44px] px-2.5 bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-md text-xs font-medium text-[var(--cockpit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)] cursor-pointer"
              aria-label="Critério de ordenação das fichas"
            >
              <option value="oldest">Atualizações mais antigas</option>
              <option value="recent">Atualizações mais recentes</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>

          {/* Filtros Rápidos de Status (Alvos >= 44px) */}
          <div className="inline-flex flex-wrap rounded-md p-0.5 bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                statusFilter === "ALL"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                statusFilter === "DRAFT"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              Rascunhos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                statusFilter === "PUBLISHED"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              Publicadas
            </button>
          </div>

          {/* Filtros por Quantidade de Blocos (Alvos >= 44px com quebra responsiva no celular) */}
          <div className="inline-flex flex-wrap rounded-md p-0.5 bg-[var(--cockpit-surface-subtle)] border border-[var(--cockpit-border-default)] max-w-full">
            <button
              type="button"
              onClick={() => setBlocksFilter("ALL")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                blocksFilter === "ALL"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              Todos os blocos
            </button>
            <button
              type="button"
              onClick={() => setBlocksFilter("FEW_BLOCKS")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                blocksFilter === "FEW_BLOCKS"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              Até 3 blocos
            </button>
            <button
              type="button"
              onClick={() => setBlocksFilter("MANY_BLOCKS")}
              className={`px-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded transition-colors select-none ${
                blocksFilter === "MANY_BLOCKS"
                  ? "bg-[var(--cockpit-surface-default)] text-[var(--cockpit-text-primary)] font-semibold shadow-xs"
                  : "text-[var(--cockpit-text-secondary)] hover:text-[var(--cockpit-text-primary)]"
              }`}
            >
              4+ blocos
            </button>
          </div>
        </div>
      </div>

      {/* Campo de Busca Harmonizado (h-[44px]) com Botão de Limpar Busca Integral */}
      <div className="w-full">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da ficha ou aluno..."
            className="w-full h-[44px] pl-9 pr-12 text-sm font-normal bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-md text-[var(--cockpit-text-primary)] placeholder:text-[var(--cockpit-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
          />
          <svg
            className="w-4 h-4 text-[var(--cockpit-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {searchTerm.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Limpar busca"
              className="absolute right-0 top-0 h-full w-[44px] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-r-md text-[var(--cockpit-text-tertiary)] hover:text-[var(--cockpit-text-primary)] hover:bg-[var(--cockpit-surface-subtle)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--cockpit-accent-brand)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: Tabela (Desktop) ou Lista Vertical (Mobile) */}
      {filteredWorkouts.length === 0 ? (
        <div className="bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[var(--cockpit-text-secondary)]">
            {searchTerm.trim() || statusFilter !== "ALL" || blocksFilter !== "ALL"
              ? "Nenhuma ficha encontrada para os filtros aplicados."
              : "Nenhuma ficha cadastrada ainda."}
          </p>
          {!searchTerm.trim() && statusFilter === "ALL" && blocksFilter === "ALL" && (
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="inline-flex items-center justify-center min-h-[44px] px-4 text-sm font-semibold text-white bg-[var(--cockpit-action-primary)] hover:bg-[var(--cockpit-action-hover)] rounded-md transition-colors select-none"
            >
              Criar primeira ficha
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* 1. VISÃO DESKTOP: TABELA DE 6 COLUNAS */}
          <div className="hidden md:block bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--cockpit-surface-subtle)] border-b border-[var(--cockpit-border-default)]">
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)]">
                    Aluno
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)]">
                    Ficha
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)]">
                    Blocos
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)]">
                    Atualizada em
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)]">
                    Status
                  </th>
                  <th scope="col" className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--cockpit-text-tertiary)] text-right">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cockpit-border-default)]">
                {filteredWorkouts.map((workout) => (
                  <tr
                    key={workout.publicId}
                    className="h-[48px] hover:bg-[var(--cockpit-surface-subtle)] transition-colors"
                  >
                    {/* Aluno */}
                    <td className="py-2.5 px-4 text-sm font-medium text-[var(--cockpit-text-primary)]">
                      {resolveStudentDisplay(workout)}
                    </td>

                    {/* Ficha */}
                    <td className="py-2.5 px-4 text-sm font-semibold text-[var(--cockpit-text-primary)] max-w-xs truncate">
                      {workout.title}
                    </td>

                    {/* Blocos (Preserva 0 real e exibe traço quando ausente) */}
                    <td className="py-2.5 px-4 text-xs font-normal text-[var(--cockpit-text-secondary)] tabular-nums">
                      {formatBlocksCount(workout.blocksCount)}
                    </td>

                    {/* Atualizada em */}
                    <td className="py-2.5 px-4 text-xs font-normal text-[var(--cockpit-text-secondary)] tabular-nums">
                      {formatDate(workout.updatedAt)}
                    </td>

                    {/* Status (Badge Neutro) */}
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[var(--cockpit-status-neutral-text)] bg-[var(--cockpit-status-neutral-bg)] border border-[var(--cockpit-border-default)] select-none">
                        {resolveStatusLabel(workout)}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`}
                        prefetch={false}
                        className="inline-flex items-center text-sm font-semibold text-[var(--cockpit-action-primary)] hover:underline"
                      >
                        Abrir ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. VISÃO MOBILE: LISTA VERTICAL DE LINHAS */}
          <div className="md:hidden bg-[var(--cockpit-surface-default)] border border-[var(--cockpit-border-default)] rounded-lg divide-y divide-[var(--cockpit-border-default)] overflow-hidden">
            {filteredWorkouts.map((workout) => (
              <div
                key={workout.publicId}
                onClick={() => router.push(`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`)}
                className="p-4 min-h-[64px] flex flex-col justify-center gap-1.5 active:bg-[var(--cockpit-surface-subtle)] cursor-pointer transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    router.push(`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--cockpit-text-primary)] leading-snug">
                    {workout.title}
                  </p>
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[var(--cockpit-status-neutral-text)] bg-[var(--cockpit-status-neutral-bg)] border border-[var(--cockpit-border-default)] shrink-0">
                    {resolveStatusLabel(workout)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--cockpit-text-secondary)] font-normal">
                  <span className="font-medium text-[var(--cockpit-text-primary)]">
                    {resolveStudentDisplay(workout)}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {formatBlocksCount(workout.blocksCount)}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">{formatDate(workout.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
