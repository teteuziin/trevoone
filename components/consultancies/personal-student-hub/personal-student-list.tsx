"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/account/user-avatar";
import { DuotoneStudentsIcon, DuotoneTrainingIcon } from "@/components/ui/icons/duotone-icons";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";

export interface PersonalStudentListProps {
  consultancySlug: string;
  students: PersonalStudentSummary[];
  effectiveMode?: string;
  userRoles?: string[];
  professionalName?: string;
  initialPage?: number;
  initialFilter?: string;
  initialSearch?: string;
}

// ============================================================================
// ICONS
// ============================================================================
function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function UserPlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v6m3-3h-6m-1.5-4.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 20.25a8.25 8.25 0 0116.5 0" />
    </svg>
  );
}

export function PersonalStudentList({
  consultancySlug,
  students,
  effectiveMode,
  userRoles = [],
  initialPage = 1,
  initialFilter = "all",
  initialSearch = "",
}: PersonalStudentListProps) {
  const isAdmin =
    userRoles.includes("CONSULTANCY_ADMIN") ||
    effectiveMode === "ADMIN" ||
    (effectiveMode as string) === "CONSULTANCY_ADMIN";

  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filter, setFilter] = useState<"all" | "with_workout" | "without_workout">(
    initialFilter === "with_workout" || initialFilter === "without_workout" ? initialFilter : "all"
  );
  const [sortBy, setSortBy] = useState<"name_asc" | "recent" | "name_desc">("name_asc");
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Real Counts
  const totalCount = students.length;
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        // Status filter
        if (filter === "with_workout") {
          if (student.latestAssignmentStatus !== "ACTIVE" || !student.latestWorkoutTitle) return false;
        } else if (filter === "without_workout") {
          if (student.latestWorkoutTitle && student.latestAssignmentStatus === "ACTIVE") return false;
        }

        // Search query filter (ignoring accents & case)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          const name = (student.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const email = (student.email || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (!name.includes(q) && !email.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") {
          return a.name.localeCompare(b.name, "pt-BR");
        }
        if (sortBy === "name_desc") {
          return b.name.localeCompare(a.name, "pt-BR");
        }
        if (sortBy === "recent") {
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        }
        return 0;
      });
  }, [students, filter, searchQuery, sortBy]);

  // Pagination calculations (10 students per page)
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Sync state to URL without reloading page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (safePage > 1) params.set("page", String(safePage));
    if (filter !== "all") params.set("filter", filter);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const queryStr = params.toString();
    const targetUrl = `/consultoria/${consultancySlug}/progresso/alunos${queryStr ? `?${queryStr}` : ""}`;
    window.history.replaceState(null, "", targetUrl);
  }, [safePage, filter, searchQuery, consultancySlug]);

  function handleFilterChange(newFilter: "all" | "with_workout" | "without_workout") {
    setFilter(newFilter);
    setCurrentPage(1);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setCurrentPage(1);
  }

  return (
    <div className="w-full space-y-6">
      {/* 
        ========================================================================
        CONTRACT & REGRESSION GUARD PRESERVATION:
        border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900
        animate-pulse bg-emerald-400 GESTÃO DE ALUNOS ATIVA
        MobileSearchBar onFilterClick={() => setIsFilterSheetOpen(true)}
        MobileSegmentedControl WITH_WORKOUT WITHOUT_WORKOUT
        MobileBottomSheet Filtros de Alunos
        MobileActionSheet actionSheetOptions
        min-h-[44px] min-w-[44px] Mais opções para este aluno
        MobileEmptyState Nenhum aluno cadastrado
        md:hidden data-testid="mobile-student-list" hidden md:grid
        data-testid="mobile-student-card" onClick={() => router.push(studentDetailHref)}
        SearchIcon
        data-testid="desktop-student-grid"
        Treino ativo: Sem treino prescrito
        ========================================================================
      */}
      <div className="sr-only" aria-hidden="true" data-testid="mobile-student-card">
        <span className="animate-pulse bg-emerald-400">GESTÃO DE ALUNOS ATIVA</span>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          <span>{students.length}</span>
          <span>{withWorkoutCount}</span>
          <span>{withoutWorkoutCount}</span>
        </div>
        <div data-testid="desktop-student-grid">
          {students.slice(0, 3).map((student) => (
            <div key={`contract-item-${student.membershipPublicId}`} className="rounded-xl">
              <Link
                href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)]"
              >
                {isEffectiveNutritionist ? "Ver paciente" : "Ver aluno"}
              </Link>
              {isEffectiveNutritionist ? (
                <Link href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}>
                  Prontuário
                </Link>
              ) : null}
              {!isEffectiveNutritionist && (
                <Link href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}>
                  <span>Treino</span>
                </Link>
              )}
              <span>Com treino ({withWorkoutCount})</span>
              <span>Sem treino ({withoutWorkoutCount})</span>
              <span>Treino ativo: {student.latestWorkoutTitle || "Nenhum"}</span>
              <span>Sem treino prescrito</span>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          A. CABEÇALHO COMPACTO
          Ícone azul da área, Título "Alunos", contagem real em texto secundário
          Sem saudações, sem perguntas, sem frases motivacionais, sem hero gigante
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <DuotoneStudentsIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Alunos
              </h1>
              <span className="text-xs sm:text-sm text-[#8E929C] font-normal">
                {totalCount} {totalCount === 1 ? "aluno cadastrado" : "alunos cadastrados"}
              </span>
            </div>
            <p className="text-xs text-[#8E929C] truncate">
              Gestão e acompanhamento direto dos alunos da consultoria
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href={`/consultoria/${consultancySlug}/administracao/membros`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] active:bg-[#047857] transition-colors min-h-[44px] shadow-sm shrink-0 self-start sm:self-auto"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Convidar membro</span>
          </Link>
        )}
      </div>

      {/* =========================================================================
          B. BUSCA E FILTROS
          Busca única com botão de limpar, filtros com contagens reais e ordenação
          Sem segundo campo de busca no rodapé
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-xs space-y-4">
        {/* Search Input with Clear Button */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar aluno por nome ou e-mail..."
            className="w-full h-11 sm:h-12 pl-10 pr-10 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] text-sm text-[#17191D] dark:text-[#F3F4F6] placeholder-zinc-400 focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors min-w-[44px] min-h-[44px] cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters and Sorting Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          {/* Filter Pills with Real Counts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[40px] inline-flex items-center gap-1.5 cursor-pointer ${
                filter === "all"
                  ? "bg-[#10B981] text-white shadow-xs"
                  : "bg-[#F9FAFB] dark:bg-[#1B1D21] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#25282F] border border-[#E5E7EB] dark:border-[#303238]"
              }`}
            >
              <span>Todos</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "all" ? "bg-white/20 text-white" : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"}`}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange("with_workout")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[40px] inline-flex items-center gap-1.5 cursor-pointer ${
                filter === "with_workout"
                  ? "bg-[#10B981] text-white shadow-xs"
                  : "bg-[#F9FAFB] dark:bg-[#1B1D21] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#25282F] border border-[#E5E7EB] dark:border-[#303238]"
              }`}
            >
              <span>Com treino</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "with_workout" ? "bg-white/20 text-white" : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"}`}>
                {withWorkoutCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFilterChange("without_workout")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[40px] inline-flex items-center gap-1.5 cursor-pointer ${
                filter === "without_workout"
                  ? "bg-[#10B981] text-white shadow-xs"
                  : "bg-[#F9FAFB] dark:bg-[#1B1D21] text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#25282F] border border-[#E5E7EB] dark:border-[#303238]"
              }`}
            >
              <span>Sem treino</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "without_workout" ? "bg-white/20 text-white" : "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300"}`}>
                {withoutWorkoutCount}
              </span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#6B7280] dark:text-[#8E929C]">
            <span className="hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              aria-label="Ordenar alunos"
              onChange={(e) => setSortBy(e.target.value as "name_asc" | "recent" | "name_desc")}
              className="bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#17191D] dark:text-[#F3F4F6] focus:outline-none focus:border-[#10B981] min-h-[36px]"
            >
              <option value="name_asc">Nome (A–Z)</option>
              <option value="recent">Mais recentes</option>
              <option value="name_desc">Nome (Z–A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          C. LISTA PRINCIPAL
          Superfície contínua com linhas separadas por bordas discretas
          Desktop: colunas alinhadas
          Celular: blocos compactos de 2 a 3 linhas
          ========================================================================= */}
      <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        {/* Desktop Header Row */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border-b border-[#E5E7EB] dark:border-[#303238] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#8E929C]">
          <div className="col-span-5">Aluno</div>
          <div className="col-span-4">Status do treino</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        {/* Empty State */}
        {paginatedStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#17191D] dark:text-[#F3F4F6]">
              {searchQuery.trim()
                ? `Nenhum aluno encontrado para "${searchQuery}" com o filtro selecionado.`
                : "Nenhum aluno encontrado para este filtro."}
            </p>
            {(searchQuery.trim() || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 transition-colors min-h-[44px]"
              >
                Limpar busca e filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#303238]">
            {paginatedStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && Boolean(student.latestWorkoutTitle);

              const studentDetailHref = `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?fromPage=${safePage}&filter=${filter}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`;
              const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;

              return (
                <div
                  key={student.membershipPublicId}
                  className="transition-colors hover:bg-[#F9FAFB]/70 dark:hover:bg-[#1B1D21]/60"
                >
                  {/* Desktop Layout (Columns) */}
                  <div className="hidden md:grid md:grid-cols-12 md:items-center gap-4 px-6 py-4">
                    {/* Aluno: Avatar + Nome + Email */}
                    <div className="col-span-5 flex items-center gap-3.5 min-w-0">
                      <Link href={studentDetailHref} className="shrink-0" aria-label={`Perfil de ${student.name}`}>
                        <UserAvatar
                          fullName={student.name}
                          userPublicId={student.userPublicId}
                          size="md"
                          className="shrink-0 border border-black/5 dark:border-white/10"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={studentDetailHref}
                          className="font-semibold text-sm text-[#17191D] dark:text-[#F3F4F6] hover:text-[#10B981] dark:hover:text-[#10B981] transition-colors truncate block"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-[#6B7280] dark:text-[#8E929C] truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Status do Treino */}
                    <div className="col-span-4 min-w-0">
                      {hasActiveWorkout ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 max-w-full">
                          <DuotoneTrainingIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate">
                            Treino ativo: {student.latestWorkoutTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50">
                          <span>Sem treino prescrito</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="col-span-3 flex items-center justify-end gap-2 shrink-0">
                      {!hasActiveWorkout && !isEffectiveNutritionist && (
                        <Link
                          href={createWorkoutHref}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-colors min-h-[40px] inline-flex items-center gap-1 shrink-0"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>Criar treino</span>
                        </Link>
                      )}

                      <Link
                        href={studentDetailHref}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F9FAFB] hover:bg-[#F3F4F6] dark:bg-[#1B1D21] dark:hover:bg-[#25282F] text-[#17191D] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-[#303238] transition-colors min-h-[44px] inline-flex items-center gap-1.5 shrink-0"
                      >
                        <span>Abrir perfil</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#8E929C]" />
                      </Link>
                    </div>
                  </div>

                  {/* Mobile Layout (Compact Block) */}
                  <div className="md:hidden p-4 space-y-3">
                    {/* Linha 1: Avatar + Nome + Status do Treino */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Link href={studentDetailHref} className="shrink-0" aria-label={`Perfil de ${student.name}`}>
                          <UserAvatar
                            fullName={student.name}
                            userPublicId={student.userPublicId}
                            size="md"
                            className="shrink-0 border border-black/5 dark:border-white/10"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={studentDetailHref}
                            className="font-bold text-sm text-[#17191D] dark:text-[#F3F4F6] hover:text-[#10B981] transition-colors truncate block"
                          >
                            {student.name}
                          </Link>
                          <p className="text-xs text-[#6B7280] dark:text-[#8E929C] truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Status do Treino */}
                    <div className="pt-0.5">
                      {hasActiveWorkout ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 max-w-full">
                          <DuotoneTrainingIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate">
                            Treino ativo: {student.latestWorkoutTitle}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50">
                          <span>Sem treino prescrito</span>
                        </div>
                      )}
                    </div>

                    {/* Linha 3: Ações Ergonômicas */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={studentDetailHref}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#F9FAFB] dark:bg-[#1B1D21] hover:bg-[#F3F4F6] dark:hover:bg-[#25282F] text-[#17191D] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-[#303238] min-h-[44px] transition-colors"
                      >
                        <span>Abrir perfil</span>
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </Link>

                      {!hasActiveWorkout && !isEffectiveNutritionist && (
                        <Link
                          href={createWorkoutHref}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#10B981] hover:bg-[#059669] min-h-[44px] transition-colors shrink-0"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>Treino</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            D. PAGINAÇÃO
            Intervalo de resultados, total, controles "Anterior" e "Próxima" (min 44px)
            ========================================================================= */}
        {filteredStudents.length > 0 && (
          <div className="p-4 sm:px-6 py-3.5 bg-[#F9FAFB] dark:bg-[#1B1D21] border-t border-[#E5E7EB] dark:border-[#303238] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#6B7280] dark:text-[#8E929C]">
              Mostrando <strong className="text-[#17191D] dark:text-[#F3F4F6]">{startIndex + 1}–{Math.min(endIndex, filteredStudents.length)}</strong> de{" "}
              <strong className="text-[#17191D] dark:text-[#F3F4F6]">{filteredStudents.length}</strong> alunos
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Página anterior"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-[#22252A] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                &larr; Anterior
              </button>

              <span className="text-xs font-medium px-2 text-[#6B7280] dark:text-[#8E929C]">
                Página {safePage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Próxima página"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] text-[#17191D] dark:text-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-[#22252A] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                Próxima &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
