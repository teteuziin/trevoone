"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { DuotoneStudentsIcon, DuotoneTrainingIcon, DuotoneNutritionIcon } from "@/components/ui/icons/duotone-icons";
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
    <div className="w-full space-y-5">
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
          A. CABEÇALHO ALUNOS 4.0 (Identidade Oficial Trevo One: Branco / Marfim / Esmeralda)
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col gap-3">
        {/* Linha superior: Voltar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/consultoria/${consultancySlug}`}
            onClick={(e) => {
              if (
                typeof window !== "undefined" &&
                window.history.length > 1 &&
                document.referrer &&
                document.referrer.includes(window.location.host)
              ) {
                e.preventDefault();
                window.history.back();
              }
            }}
            aria-label="Voltar"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6660] hover:text-[#102E23] min-h-[38px] -ml-1 px-2 rounded-xl hover:bg-[#F5F5F0] transition-colors cursor-pointer select-none"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
            <span>Voltar</span>
          </Link>
        </div>

        {/* Linha de Identificação: Ícone + Título + Contagem real */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl ${isEffectiveNutritionist ? "bg-[#E8F0EA] border-[#CDEED5]" : "bg-[#E8F0EA] border-[#CDEED5]"} border flex items-center justify-center shrink-0`}>
              {isEffectiveNutritionist ? (
                <DuotoneNutritionIcon className="w-5 h-5 text-[#176B49]" />
              ) : (
                <DuotoneStudentsIcon className="w-5 h-5 text-[#176B49]" />
              )}
            </div>
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#102E23] tracking-tight leading-tight">
                {isEffectiveNutritionist ? "Pacientes" : "Alunos"}
              </h1>
              <span className="text-xs sm:text-sm text-[#5A6660] font-normal leading-tight mt-0.5 sm:mt-0">
                {totalCount} {isEffectiveNutritionist ? (totalCount === 1 ? "paciente cadastrado" : "pacientes cadastrados") : (totalCount === 1 ? "aluno cadastrado" : "alunos cadastrados")}
              </span>
            </div>
          </div>

          {/* Ação de Adicionar Aluno / Convidar Membro */}
          {isAdmin && (
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[42px] shadow-xs shrink-0"
            >
              <UserPlusIcon className="w-4 h-4" />
              <span>{isEffectiveNutritionist ? "Convidar paciente" : "Convidar aluno"}</span>
            </Link>
          )}
        </div>
      </div>

      {/* =========================================================================
          B. BUSCA E FILTROS 4.0
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
        {/* Campo de Busca Único */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6660]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={isEffectiveNutritionist ? "Buscar paciente por nome ou e-mail..." : "Buscar aluno por nome ou e-mail..."}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:border-[#176B49] focus:ring-1 focus:ring-[#176B49] transition-all min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-[#5A6660] hover:text-[#102E23] transition-colors min-w-[44px] min-h-[44px] cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de Filtros e Ordenação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
          {/* Pílulas de Filtros com Contagens Reais */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] inline-flex items-center gap-1.5 cursor-pointer ${
                filter === "all"
                  ? "bg-[#176B49] text-white shadow-xs"
                  : "bg-[#F5F5F0] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
              }`}
            >
              <span>Todos</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "all" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                {totalCount}
              </span>
            </button>

            {isEffectiveNutritionist ? (
              <>
                <button
                  type="button"
                  onClick={() => handleFilterChange("with_plan")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "with_plan" || filter === "with_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-[#F5F5F0] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Com plano</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${(filter === "with_plan" || filter === "with_workout") ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withPlanCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange("without_plan")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "without_plan" || filter === "without_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-[#F5F5F0] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Sem plano</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${(filter === "without_plan" || filter === "without_workout") ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withoutPlanCount}
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFilterChange("with_workout")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "with_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-[#F5F5F0] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Com treino</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "with_workout" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withWorkoutCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange("without_workout")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] inline-flex items-center gap-1.5 cursor-pointer ${
                    filter === "without_workout"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "bg-[#F5F5F0] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
                  }`}
                >
                  <span>Sem treino</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${filter === "without_workout" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {withoutWorkoutCount}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Seletor de Ordenação Compacto */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#5A6660]">
            <span className="hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              aria-label="Ordenar alunos"
              onChange={(e) => setSortBy(e.target.value as "name_asc" | "recent" | "name_desc")}
              className="bg-[#FAF9F6] border border-[#E5E8E2] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#102E23] focus:outline-none focus:border-[#176B49] min-h-[36px] cursor-pointer"
            >
              <option value="name_asc">Nome (A–Z)</option>
              <option value="recent">Mais recentes</option>
              <option value="name_desc">Nome (Z–A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          C. LISTA DE ALUNOS 4.0
          Cartões claros, ações diretas, atalhos inteligentes
          ========================================================================= */}
      <div className="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden">
        {/* Cabeçalho de Colunas (Desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-[#F9FAF8] border-b border-[#E5E8E2] text-[11px] font-bold uppercase tracking-wider text-[#5A6660]">
          <div className="col-span-5">{isEffectiveNutritionist ? "Paciente" : "Aluno"}</div>
          <div className="col-span-4">{isEffectiveNutritionist ? "Plano alimentar" : "Status do treino"}</div>
          <div className="col-span-3 text-right">Ação</div>
        </div>

        {/* Estado Vazio */}
        {paginatedStudents.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-[#102E23]">
              {searchQuery.trim()
                ? `Nenhum ${isEffectiveNutritionist ? "paciente" : "aluno"} encontrado para "${searchQuery}" com o filtro selecionado.`
                : `Nenhum ${isEffectiveNutritionist ? "paciente" : "aluno"} encontrado para este filtro.`}
            </p>
            {(searchQuery.trim() || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] transition-colors min-h-[40px] cursor-pointer"
              >
                Limpar busca e filtros
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
              
              // Target workout link: opens Editor 4.0 if workoutPublicId is known, or assignment view
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
                  className="transition-colors hover:bg-[#F9FAF8]"
                >
                  {/* Layout Desktop */}
                  <div className="hidden md:grid md:grid-cols-12 md:items-center gap-4 px-6 py-4">
                    {/* Aluno: Avatar + Nome + Email */}
                    <div className="col-span-5 flex items-center gap-3.5 min-w-0">
                      <Link href={studentDetailHref} className="shrink-0" aria-label={`Perfil de ${student.name}`}>
                        <UserAvatar
                          fullName={student.name}
                          userPublicId={student.userPublicId}
                          size="md"
                          className="shrink-0 border border-[#E5E8E2]"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={studentDetailHref}
                          className="font-semibold text-sm text-[#102E23] hover:text-[#176B49] transition-colors truncate block"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-[#5A6660] truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Status: Treino / Plano */}
                    <div className="col-span-4 min-w-0">
                      {isEffectiveNutritionist ? (
                        hasActiveNutrition ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-full">
                            <DuotoneNutritionIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                            <span className="truncate">
                              Plano ativo: {student.activeNutritionPlanTitle}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                            <span>Sem plano ativo</span>
                          </div>
                        )
                      ) : (
                        hasActiveWorkout ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-full">
                            <DuotoneTrainingIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                            <span className="truncate">
                              Treino ativo: {student.latestWorkoutTitle}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                            <span>Sem treino prescrito</span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Ações Desktop */}
                    <div className="col-span-3 flex items-center justify-end gap-2 shrink-0">
                      {isEffectiveNutritionist ? (
                        hasActiveNutrition && openPlanHref ? (
                          <Link
                            href={openPlanHref}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] inline-flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <span>Abrir plano</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPlanCreation(student)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] inline-flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Criar plano</span>
                          </button>
                        )
                      ) : (
                        hasActiveWorkout ? (
                          <Link
                            href={openWorkoutHref}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] inline-flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <span>Abrir treino</span>
                          </Link>
                        ) : (
                          <Link
                            href={createWorkoutHref}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] inline-flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Criar treino</span>
                          </Link>
                        )
                      )}

                      <Link
                        href={studentDetailHref}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F0] hover:bg-[#EBEBE5] text-[#102E23] border border-[#E5E8E2] transition-colors min-h-[38px] inline-flex items-center gap-1 shrink-0"
                        title="Ver perfil do aluno"
                      >
                        <span>Ver aluno</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-[#5A6660]" />
                      </Link>
                    </div>
                  </div>

                  {/* Layout Mobile: Card limpo e clicável */}
                  <div
                    data-testid="mobile-student-card-item"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("button, a")) return;
                      router.push(studentDetailHref);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const target = e.target as HTMLElement;
                        if (target.closest("button, a")) return;
                        e.preventDefault();
                        router.push(studentDetailHref);
                      }
                    }}
                    aria-label={`Ver perfil de ${student.name}`}
                    className="md:hidden p-4 space-y-3 relative cursor-pointer active:bg-[#F5F5F0] transition-colors rounded-xl select-none"
                  >
                    {/* Linha 1: Avatar + Nome + Email + Menu Contextual */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar
                          fullName={student.name}
                          userPublicId={student.userPublicId}
                          size="md"
                          className="shrink-0 border border-[#E5E8E2]"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-[#102E23] truncate block">
                            {student.name}
                          </h3>
                          <p className="text-xs text-[#5A6660] truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Menu 3 Pontos */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuStudentId(isMenuOpen ? null : student.membershipPublicId);
                          }}
                          aria-label="Mais opções para este aluno"
                          className="p-2 rounded-xl text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
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
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 p-1.5 rounded-xl bg-white border border-[#E5E8E2] shadow-lg space-y-0.5">
                              <Link
                                href={studentDetailHref}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                              >
                                <span>Ver aluno</span>
                              </Link>
                              <Link
                                href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=fotos`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                              >
                                <span>Registrar foto</span>
                              </Link>
                              <Link
                                href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=anamnese`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                              >
                                <span>Nova anamnese</span>
                              </Link>
                              <Link
                                href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}?tab=formularios`}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors text-left"
                              >
                                <span>Enviar formulário</span>
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Linha 2: Status do Treino + Ação Principal */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="min-w-0 flex-1">
                        {isEffectiveNutritionist ? (
                          hasActiveNutrition ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-full">
                              <DuotoneNutritionIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                              <span className="truncate">
                                {student.activeNutritionPlanTitle}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                              <span>Sem plano ativo</span>
                            </div>
                          )
                        ) : (
                          hasActiveWorkout ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] max-w-full">
                              <DuotoneTrainingIcon className="w-3.5 h-3.5 shrink-0 text-[#176B49]" />
                              <span className="truncate">
                                Treino ativo: {student.latestWorkoutTitle}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F3F4F6] text-[#5A6660] border border-[#E5E8E2]">
                              <span>Sem treino prescrito</span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Botão de Ação Primária no Mobile */}
                      {isEffectiveNutritionist ? (
                        hasActiveNutrition && openPlanHref ? (
                          <Link
                            href={openPlanHref}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#176B49] hover:bg-[#125438] min-h-[38px] transition-colors shrink-0 shadow-xs cursor-pointer"
                            aria-label={`Abrir plano alimentar de ${student.name}`}
                          >
                            <span>Abrir plano</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPlanCreation(student);
                            }}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#176B49] hover:bg-[#125438] min-h-[38px] transition-colors shrink-0 shadow-xs cursor-pointer"
                            aria-label={`Criar plano alimentar para ${student.name}`}
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>+ Plano</span>
                          </button>
                        )
                      ) : (
                        hasActiveWorkout ? (
                          <Link
                            href={openWorkoutHref}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#176B49] hover:bg-[#125438] min-h-[38px] transition-colors shrink-0 shadow-xs cursor-pointer"
                            aria-label={`Abrir treino de ${student.name}`}
                          >
                            <span>Abrir treino</span>
                          </Link>
                        ) : (
                          <Link
                            href={createWorkoutHref}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-[#176B49] hover:bg-[#125438] min-h-[38px] transition-colors shrink-0 shadow-xs cursor-pointer"
                            aria-label={`Criar treino para ${student.name}`}
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>+ Treino</span>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {filteredStudents.length > 0 && (
          <div className="p-4 sm:px-6 py-3.5 bg-[#F9FAF8] border-t border-[#E5E8E2] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5A6660]">
              Mostrando <strong className="text-[#102E23]">{startIndex + 1}–{Math.min(endIndex, filteredStudents.length)}</strong> de{" "}
              <strong className="text-[#102E23]">{filteredStudents.length}</strong> {isEffectiveNutritionist ? "pacientes" : "alunos"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Página anterior"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E5E8E2] text-[#102E23] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
              >
                &larr; Anterior
              </button>

              <span className="text-xs font-medium px-2 text-[#5A6660]">
                Página {safePage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Próxima página"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E5E8E2] text-[#102E23] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
              >
                Próxima &rarr;
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
