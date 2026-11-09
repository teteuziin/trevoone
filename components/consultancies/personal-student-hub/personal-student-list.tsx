"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { DuotoneTrainingIcon, DuotoneNutritionIcon } from "@/components/ui/icons/duotone-icons";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";
import {
  NutritionPlanChoiceModal,
  type NutritionPlanCreationChoice,
} from "../nutrition-v2/nutrition-plan-choice-modal";
import { NutritionAiGenerateModal } from "../nutrition-v2/nutrition-ai-generate-modal";
import { NutritionAiImportModal } from "../nutrition-v2/nutrition-ai-import-modal";
import { NutritionTemplatePickerModal } from "../nutrition-v2/nutrition-template-picker-modal";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7 7l-7-7 7-7" />
    </svg>
  );
}

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

function MoreDotsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
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
  const router = useRouter();
  const isAdmin =
    userRoles.includes("CONSULTANCY_ADMIN") ||
    effectiveMode === "ADMIN" ||
    (effectiveMode as string) === "CONSULTANCY_ADMIN";

  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filter, setFilter] = useState<string>(initialFilter || "all");
  const [sortBy, setSortBy] = useState<"name_asc" | "recent" | "name_desc">("name_asc");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [openMenuStudentId, setOpenMenuStudentId] = useState<string | null>(null);

  // Selected student for NutritionPlanChoiceModal
  const [selectedStudentForPlan, setSelectedStudentForPlan] = useState<PersonalStudentSummary | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGenerateAiOpen, setIsGenerateAiOpen] = useState(false);
  const [isImportAiOpen, setIsImportAiOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleOpenPlanCreation = (student: PersonalStudentSummary) => {
    setSelectedStudentForPlan(student);
    setIsChoiceModalOpen(true);
  };

  const handleSelectPlanChoice = (choice: NutritionPlanCreationChoice) => {
    setIsChoiceModalOpen(false);
    if (!selectedStudentForPlan) return;
    const studentPubId = selectedStudentForPlan.membershipPublicId;
    if (choice === "manual") {
      router.push(`/consultoria/${consultancySlug}/planos-v2/novo?student=${studentPubId}&studentId=${studentPubId}`);
    } else if (choice === "ai-scratch") {
      setIsGenerateAiOpen(true);
    } else if (choice === "ai-import") {
      setIsImportAiOpen(true);
    } else if (choice === "template") {
      setIsTemplatePickerOpen(true);
    }
  };

  // Real Counts
  const totalCount = students.length;
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && Boolean(s.latestWorkoutTitle)).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );
  const withPlanCount = useMemo(
    () => students.filter((s) => Boolean(s.hasActiveNutritionPlan)).length,
    [students]
  );
  const withoutPlanCount = useMemo(
    () => students.filter((s) => !s.hasActiveNutritionPlan).length,
    [students]
  );

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        // Status filter
        if (isEffectiveNutritionist) {
          if (filter === "with_plan" || filter === "with_workout" || filter === "active") {
            if (!student.hasActiveNutritionPlan) return false;
          } else if (filter === "without_plan" || filter === "without_workout") {
            if (student.hasActiveNutritionPlan) return false;
          }
        } else {
          if (filter === "with_workout" || filter === "active") {
            if (student.latestAssignmentStatus !== "ACTIVE" || !student.latestWorkoutTitle) return false;
          } else if (filter === "without_workout") {
            if (student.latestWorkoutTitle && student.latestAssignmentStatus === "ACTIVE") return false;
          }
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
  }, [students, filter, searchQuery, sortBy, isEffectiveNutritionist]);

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

  function handleFilterChange(newFilter: "all" | "with_workout" | "without_workout" | "with_plan" | "without_plan") {
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
    <div className="w-full space-y-4">
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
          A. CABEÇALHO COMPACTO ALUNOS 4.0
          Alunos + total real + Adicionar aluno (sem caixas grandes)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <Link
            href={`/consultoria/${consultancySlug}`}
            aria-label="Voltar"
            className="w-9 h-9 rounded-xl bg-white border border-[#E5E8E2] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center shadow-xs transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#102E23] tracking-tight">
                {isEffectiveNutritionist ? "Pacientes" : "Alunos"}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-[#5A6660]">
              {totalCount} {isEffectiveNutritionist ? (totalCount === 1 ? "paciente cadastrado" : "pacientes cadastrados") : (totalCount === 1 ? "aluno cadastrado" : "alunos cadastrados")}
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[40px] shadow-xs self-start sm:self-auto shrink-0"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>{isEffectiveNutritionist ? "Convidar paciente" : "+ Adicionar aluno"}</span>
          </Link>
        )}
      </div>

      {/* =========================================================================
          B. BUSCA VISÍVEL & TRÊS FILTROS (Composição Limpa)
          ========================================================================= */}
      <div className="space-y-2.5">
        {/* Campo de Busca Visível */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6660]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={isEffectiveNutritionist ? "Buscar paciente por nome ou contato..." : "Buscar aluno por nome ou contato..."}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:border-[#176B49] focus:ring-1 focus:ring-[#176B49] shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-[#5A6660] hover:text-[#102E23] transition-colors min-w-[40px] min-h-[40px] cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Três Filtros Claros */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer ${
                filter === "all"
                  ? "bg-[#176B49] text-white shadow-xs"
                  : "bg-white text-[#5A6660] hover:bg-[#F5F5F0] border border-[#E5E8E2]"
              }`}
            >
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filter === "all" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                {totalCount}
              </span>
            </button>

            {isEffectiveNutritionist ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFilterChange("with_plan")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "with_plan" || filter === "with_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-white text-[#5A6660] hover:bg-[#F5F5F0] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Com plano</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${(filter === "with_plan" || filter === "with_workout") ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withPlanCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange("without_plan")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "without_plan" || filter === "without_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-white text-[#5A6660] hover:bg-[#F5F5F0] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Sem plano</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${(filter === "without_plan" || filter === "without_workout") ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withoutPlanCount}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFilterChange("with_workout")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "with_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-white text-[#5A6660] hover:bg-[#F5F5F0] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Com treino</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filter === "with_workout" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withWorkoutCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange("without_workout")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "without_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-white text-[#5A6660] hover:bg-[#F5F5F0] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Sem treino</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${filter === "without_workout" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withoutWorkoutCount}
                  </span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#5A6660]">
            <span className="hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              aria-label="Ordenar alunos"
              onChange={(e) => setSortBy(e.target.value as "name_asc" | "recent" | "name_desc")}
              className="bg-white border border-[#E5E8E2] rounded-xl px-2 py-1 text-xs font-semibold text-[#102E23] focus:outline-none focus:border-[#176B49] min-h-[32px] cursor-pointer"
            >
              <option value="name_asc">A–Z</option>
              <option value="recent">Recentes</option>
              <option value="name_desc">Z–A</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          C. LISTA COMPACTA DE ALUNOS 4.0
          Foto + Nome + Situação + UMA ÚNICA AÇÃO PRINCIPAL
          Tocar no card abre o perfil. Menu de 3 pontos para ações secundárias.
          SEM botões redundantes "Ver aluno" / "Abrir perfil" em cada linha!
          ========================================================================= */}
      <div className="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden">
        {paginatedStudents.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-[#102E23]">
              {searchQuery.trim()
                ? `Nenhum ${isEffectiveNutritionist ? "paciente" : "aluno"} encontrado para "${searchQuery}".`
                : `Nenhum ${isEffectiveNutritionist ? "paciente" : "aluno"} encontrado.`}
            </p>
            {(searchQuery.trim() || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E5E8E2]">
            {paginatedStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && Boolean(student.latestWorkoutTitle);
              const hasActiveNutrition = Boolean(student.hasActiveNutritionPlan && student.activeNutritionPlanTitle);

              const studentDetailHref = isEffectiveNutritionist
                ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
                : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?fromPage=${safePage}&filter=${filter}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`;

              const openWorkoutHref = student.latestWorkoutPublicId
                ? `/consultoria/${consultancySlug}/rotinas/${student.latestWorkoutPublicId}`
                : student.latestAssignmentPublicId
                ? `/consultoria/${consultancySlug}/treinos/${student.latestAssignmentPublicId}`
                : studentDetailHref;

              const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;
              const openPlanHref = student.activeNutritionPlanPublicId
                ? `/consultoria/${consultancySlug}/planos-v2/${student.activeNutritionPlanPublicId}?student=${student.membershipPublicId}`
                : null;

              const isMenuOpen = openMenuStudentId === student.membershipPublicId;

              return (
                <div
                  key={student.membershipPublicId}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button, a, select, input")) return;
                    router.push(studentDetailHref);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a, select, input")) return;
                      e.preventDefault();
                      router.push(studentDetailHref);
                    }
                  }}
                  className="p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] active:bg-[#F5F5F0] transition-colors cursor-pointer select-none"
                  aria-label={`Ver perfil de ${student.name}`}
                >
                  {/* Lado Esquerdo: Foto + Nome + Contato */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      fullName={student.name}
                      userPublicId={student.userPublicId}
                      size="md"
                      className="shrink-0 border border-[#E5E8E2]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#102E23] truncate hover:text-[#176B49] transition-colors">
                          {student.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6660] truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>

                  {/* Centro: Situação do Treino (Em desktop ou comprimido no mobile) */}
                  <div className="hidden sm:flex items-center shrink-0">
                    {isEffectiveNutritionist ? (
                      hasActiveNutrition ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-[200px] truncate">
                          <DuotoneNutritionIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                          <span className="truncate">{student.activeNutritionPlanTitle}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                          Sem plano ativo
                        </span>
                      )
                    ) : (
                      hasActiveWorkout ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-[220px] truncate">
                          <DuotoneTrainingIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                          <span className="truncate">{student.latestWorkoutTitle}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                          Sem treino prescrito
                        </span>
                      )
                    )}
                  </div>

                  {/* Lado Direito: Apenas UMA Ação Principal + Menu 3 Pontos */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEffectiveNutritionist ? (
                      hasActiveNutrition && openPlanHref ? (
                        <Link
                          href={openPlanHref}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[36px] inline-flex items-center shadow-xs"
                        >
                          Abrir plano
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPlanCreation(student);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[36px] inline-flex items-center shadow-xs cursor-pointer"
                        >
                          + Criar plano
                        </button>
                      )
                    ) : (
                      hasActiveWorkout ? (
                        <Link
                          href={openWorkoutHref}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[36px] inline-flex items-center shadow-xs"
                        >
                          Abrir treino
                        </Link>
                      ) : (
                        <Link
                          href={createWorkoutHref}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[36px] inline-flex items-center shadow-xs"
                        >
                          <PlusIcon className="w-3.5 h-3.5 mr-0.5 sm:mr-1" />
                          <span>Criar treino</span>
                        </Link>
                      )
                    )}

                    {/* Menu de 3 Pontos para Ações Secundárias */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuStudentId(isMenuOpen ? null : student.membershipPublicId);
                        }}
                        aria-label="Mais opções para este aluno"
                        className="p-1.5 rounded-xl text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      >
                        <MoreDotsIcon className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuStudentId(null);
                            }}
                            aria-hidden="true"
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-44 p-1 rounded-xl bg-white border border-[#E5E8E2] shadow-xl space-y-0.5">
                            <Link
                              href={studentDetailHref}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                            >
                              Ver perfil
                            </Link>
                            <Link
                              href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=fotos`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                            >
                              Registrar foto
                            </Link>
                            <Link
                              href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=anamnese`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                            >
                              Nova anamnese
                            </Link>
                            <Link
                              href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=formularios`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                            >
                              Enviar formulário
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação Compacta */}
        {filteredStudents.length > 0 && (
          <div className="px-4 py-2.5 bg-[#FAF9F6] border-t border-[#E5E8E2] flex items-center justify-between text-xs text-[#5A6660]">
            <span>
              {startIndex + 1}–{Math.min(endIndex, filteredStudents.length)} de {filteredStudents.length} {isEffectiveNutritionist ? "pacientes" : "alunos"}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Página anterior"
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E8E2] text-[#102E23] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-colors cursor-pointer"
              >
                &larr;
              </button>

              <span className="px-2 font-medium">
                {safePage}/{totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Próxima página"
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E8E2] text-[#102E23] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-colors cursor-pointer"
              >
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Criação de Plano Nutricional */}
      <NutritionPlanChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectOption={handleSelectPlanChoice}
      />

      <NutritionAiGenerateModal
        isOpen={isGenerateAiOpen}
        onClose={() => setIsGenerateAiOpen(false)}
        consultancySlug={consultancySlug}
      />

      <NutritionAiImportModal
        isOpenControlled={isImportAiOpen}
        onCloseControlled={() => setIsImportAiOpen(false)}
        consultancySlug={consultancySlug}
        hideTrigger={true}
      />

      <NutritionTemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        consultancySlug={consultancySlug}
      />
    </div>
  );
}
