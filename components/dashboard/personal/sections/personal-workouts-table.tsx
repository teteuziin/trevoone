"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutAssignModal } from "@/components/consultancies/training-v2/workout-assign-modal";
import { TemplateAssignModal } from "@/components/consultancies/training-v2/template-assign-modal";

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
  publishedVersionNumber?: number | null;
  publishedVersionPublicId?: string | null;
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

function PaperAirplaneIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

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

  // 2. Filtro por status
  if (statusFilter !== "ALL") {
    result = result.filter((w) => {
      const isDraft =
        w.status === "DRAFT" ||
        w.currentVersionStatus === "DRAFT" ||
        Boolean(w.hasActiveDraft);
      if (statusFilter === "DRAFT") return isDraft;
      if (statusFilter === "PUBLISHED") return !isDraft && w.status !== "ARCHIVED";
      return true;
    });
  }

  // 3. Filtro por blocos
  if (blocksFilter !== "ALL") {
    result = result.filter((w) => {
      const count = typeof w.blocksCount === "number" ? w.blocksCount : 0;
      if (blocksFilter === "FEW_BLOCKS") return count >= 1 && count <= 3;
      if (blocksFilter === "MANY_BLOCKS") return count >= 4;
      return true;
    });
  }

  // 4. Ordenação
  result.sort((a, b) => {
    if (sortBy === "name") {
      return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
    }
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

    if (sortBy === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  return result;
}

export function PersonalWorkoutsTable({
  consultancySlug,
  workouts = [],
  totalWorkouts,
  isLoading = false,
}: PersonalWorkoutsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("oldest");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");
  const [blocksFilter, setBlocksFilter] = useState<BlocksFilterOption>("ALL");

  // Assignment Modal Targets
  const [assignWorkoutTarget, setAssignWorkoutTarget] = useState<PersonalWorkoutRow | null>(null);
  const [assignTemplateTarget, setAssignTemplateTarget] = useState<PersonalWorkoutRow | null>(null);
  const [draftOnlyWarningWorkout, setDraftOnlyWarningWorkout] = useState<PersonalWorkoutRow | null>(null);

  // Mobile Touch Scroll Guard
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      isScrollingRef.current = true;
    }
  };

  const handleCardClick = (publicId: string) => {
    if (isScrollingRef.current) return;
    router.push(`/consultoria/${consultancySlug}/rotinas/${publicId}`);
  };

  const handleSendWorkout = (e: React.MouseEvent, workout: PersonalWorkoutRow) => {
    e.stopPropagation();
    if (workout.isTemplate) {
      setAssignTemplateTarget(workout);
      return;
    }

    const hasPublished = Boolean(
      workout.publishedVersionPublicId &&
      (workout.publishedVersionNumber !== null && workout.publishedVersionNumber !== undefined && workout.publishedVersionNumber > 0)
    );

    if (!hasPublished) {
      setDraftOnlyWarningWorkout(workout);
      return;
    }

    setAssignWorkoutTarget(workout);
  };

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
                Todos status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "PUBLISHED"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Publicadas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "DRAFT"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Rascunhos
              </button>
            </div>

            {/* Filtros de Blocos */}
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
                Qualquer volume
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

      {/* 2. Visualização das Fichas: Tabela Desktop / Cards Mobile */}
      {filteredWorkouts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] text-center space-y-2">
          <p className="text-sm font-semibold text-[#17191D] dark:text-white">
            Nenhuma ficha encontrada
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
            {searchTerm.trim() || statusFilter !== "ALL" || blocksFilter !== "ALL"
              ? "Tente ajustar seus termos de busca ou remover os filtros ativos."
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
                    Ações
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

                      {/* Ações Desktop: Enviar ficha + Abrir ficha */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleSendWorkout(e, workout)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs select-none cursor-pointer"
                            title="Enviar ficha para um aluno"
                          >
                            <PaperAirplaneIcon className="w-3.5 h-3.5" />
                            <span>Enviar ficha</span>
                          </button>

                          <Link
                            href={`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`}
                            prefetch={false}
                            className="inline-flex items-center justify-center min-h-[44px] px-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 hover:underline"
                          >
                            Abrir ficha
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISÃO MOBILE: CARDS COM TOQUE DIRETO E AÇÃO ENVIAR FICHA */}
          <div className="md:hidden bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
            {filteredWorkouts.map((workout) => {
              const isDraft =
                workout.status === "DRAFT" ||
                workout.currentVersionStatus === "DRAFT" ||
                workout.hasActiveDraft;

              return (
                <div
                  key={workout.publicId}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onClick={() => handleCardClick(workout.publicId)}
                  className="p-4 min-h-[72px] flex flex-col justify-between gap-3 active:bg-[#F3F4F6] dark:active:bg-[#1B1D21]/60 cursor-pointer transition-colors relative"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ficha ${workout.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/consultoria/${consultancySlug}/rotinas/${workout.publicId}`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#17191D] dark:text-white leading-snug break-words">
                        {workout.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium">
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

                  {/* Linha de Ação Enviar Ficha (alvo mínimo de toque >= 44px) */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#F3F4F6] dark:border-[#222429]">
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      {workout.hasActiveDraft && workout.publishedVersionNumber ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Rascunho em edição · Envia v{workout.publishedVersionNumber}
                        </span>
                      ) : isDraft ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Requer publicação
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Pronta para envio
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleSendWorkout(e, workout)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:bg-emerald-200 border border-emerald-200 dark:border-emerald-800/60 transition-colors shadow-xs select-none cursor-pointer"
                    >
                      <PaperAirplaneIcon className="w-3.5 h-3.5" />
                      <span>Enviar ficha</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL 1: ATRIBUIÇÃO DE ROTINA (WorkoutAssignModal) */}
      {assignWorkoutTarget && assignWorkoutTarget.publishedVersionPublicId && (
        <WorkoutAssignModal
          isOpen={Boolean(assignWorkoutTarget)}
          onClose={() => setAssignWorkoutTarget(null)}
          slug={consultancySlug}
          workoutPublicId={assignWorkoutTarget.publicId}
          workoutTitle={
            assignWorkoutTarget.hasActiveDraft && assignWorkoutTarget.publishedVersionNumber
              ? `${assignWorkoutTarget.title} (versão publicada v${assignWorkoutTarget.publishedVersionNumber})`
              : assignWorkoutTarget.title
          }
          versionPublicId={assignWorkoutTarget.publishedVersionPublicId}
          versionNumber={assignWorkoutTarget.publishedVersionNumber || 1}
          onAssigned={() => {
            router.refresh();
          }}
        />
      )}

      {/* MODAL 2: ATRIBUIÇÃO DE MODELO (TemplateAssignModal) */}
      {assignTemplateTarget && (
        <TemplateAssignModal
          isOpen={Boolean(assignTemplateTarget)}
          onClose={() => setAssignTemplateTarget(null)}
          slug={consultancySlug}
          templatePublicId={assignTemplateTarget.publicId}
          templateTitle={assignTemplateTarget.title}
          onAssigned={() => {
            router.refresh();
          }}
        />
      )}

      {/* MODAL 3: AVISO DE FICHA APENAS EM RASCUNHO */}
      {draftOnlyWarningWorkout && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setDraftOnlyWarningWorkout(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#151619] border-t sm:border border-[#E5E7EB] dark:border-[#303238] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 text-[#17191D] dark:text-[#E5E7EB]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#17191D] dark:text-white">
                  Publique a ficha antes de enviar
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                  Esta rotina está salva como rascunho
                </p>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF] leading-relaxed">
              A ficha <strong>&ldquo;{draftOnlyWarningWorkout.title}&rdquo;</strong> ainda não possui uma versão publicada oficial. Para prescrever e enviar para o aluno, abra a ficha no editor e clique em <strong>Publicar</strong>.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDraftOnlyWarningWorkout(null)}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
              >
                Cancelar
              </button>
              <Link
                href={`/consultoria/${consultancySlug}/rotinas/${draftOnlyWarningWorkout.publicId}`}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Abrir no editor para publicar</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
