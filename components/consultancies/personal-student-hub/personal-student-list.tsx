"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  MobileSearchBar,
  MobileBottomSheet,
  MobileActionSheet,
  MobileEmptyState,
  MobileSegmentedControl,
  type ActionSheetOption,
} from "@/components/ui/mobile";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentListProps {
  consultancySlug: string;
  students: PersonalStudentSummary[];
  effectiveMode?: string;
  userRoles?: string[];
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function MoreDotsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
    </svg>
  );
}

function ChartIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function MailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

export function PersonalStudentList({
  consultancySlug,
  students,
  effectiveMode,
  userRoles = [],
}: PersonalStudentListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [workoutFilter, setWorkoutFilter] = useState<"ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT">("ALL");
  const [selectedObjective, setSelectedObjective] = useState<string>("ALL");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [actionSheetStudent, setActionSheetStudent] = useState<PersonalStudentSummary | null>(null);

  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isAdmin = effectiveMode === "ADMIN" || effectiveMode === "CONSULTANCY_ADMIN" || userRoles.includes("CONSULTANCY_ADMIN");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);

  // Objective distinct values
  const availableObjectives = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.objective && s.objective.trim()) {
        set.add(s.objective.trim());
      }
    }
    return Array.from(set);
  }, [students]);

  // Counts for segmented controls
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  const activeFiltersCount = (workoutFilter !== "ALL" ? 1 : 0) + (selectedObjective !== "ALL" ? 1 : 0);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Search text
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesObjective = s.objective ? s.objective.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesObjective) return false;
      }

      // 2. Workout status filter
      if (workoutFilter === "WITH_WORKOUT") {
        if (!(s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle)) return false;
      } else if (workoutFilter === "WITHOUT_WORKOUT") {
        if (s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle) return false;
      }

      // 3. Objective filter
      if (selectedObjective !== "ALL") {
        if (!s.objective || s.objective.trim() !== selectedObjective) return false;
      }

      return true;
    });
  }, [students, search, workoutFilter, selectedObjective]);

  function handleResetFilters() {
    setSearch("");
    setWorkoutFilter("ALL");
    setSelectedObjective("ALL");
    setIsFilterSheetOpen(false);
  }

  // Action sheet options generator for mobile
  const actionSheetOptions: ActionSheetOption[] = useMemo(() => {
    if (!actionSheetStudent) return [];
    const student = actionSheetStudent;
    const studentProfileHref = isEffectiveNutritionist
      ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
      : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;
    const studentEvolutionHref = isEffectiveNutritionist
      ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}?tab=evolucao`
      : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;
    const newWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;
    const newPlanHref = `/consultoria/${consultancySlug}/planos-v2/novo?student=${student.membershipPublicId}`;

    const opts: ActionSheetOption[] = [
      {
        id: "view-profile",
        label: isEffectiveNutritionist ? "Ver paciente" : "Ver perfil completo",
        icon: <UserIcon className="w-5 h-5 text-[var(--brand)]" />,
        onClick: () => router.push(studentProfileHref),
      },
    ];

    if (isPersonal || isAdmin) {
      opts.push({
        id: "create-workout",
        label: "Criar treino personalizado",
        icon: <DumbbellIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
        onClick: () => router.push(newWorkoutHref),
      });
    }

    if (isNutritionist || isAdmin) {
      opts.push({
        id: "create-nutrition",
        label: "Criar plano alimentar",
        icon: <AppleIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
        onClick: () => router.push(newPlanHref),
      });
    }

    opts.push({
      id: "view-evolution",
      label: isEffectiveNutritionist ? "Evolução do paciente" : "Evolução do aluno",
      icon: <ChartIcon className="w-5 h-5 text-[var(--text-secondary)]" />,
      onClick: () => router.push(studentEvolutionHref),
    });

    if (student.email) {
      opts.push({
        id: "send-email",
        label: isEffectiveNutritionist ? "Enviar e-mail para paciente" : "Enviar e-mail para aluno",
        icon: <MailIcon className="w-5 h-5 text-[var(--text-tertiary)]" />,
        onClick: () => {
          window.location.href = `mailto:${student.email}`;
        },
      });
    }

    return opts;
  }, [actionSheetStudent, consultancySlug, isPersonal, isNutritionist, isEffectiveNutritionist, isAdmin, router]);

  // If no students in consultancy at all
  if (students.length === 0) {
    return (
      <div className="space-y-4">
        {/* Mobile-native empty state */}
        <div className="md:hidden">
          <MobileEmptyState
            title={isEffectiveNutritionist ? "Nenhum paciente cadastrado" : "Nenhum aluno cadastrado"}
            description={
              isEffectiveNutritionist
                ? "Assim que novos pacientes forem vinculados à consultoria, eles aparecerão aqui para prontuário, planos e evolução."
                : "Assim que novos alunos forem vinculados à consultoria, eles aparecerão aqui para acompanhamento, treinos e evolução."
            }
            icon={<UserIcon className="w-7 h-7 text-[var(--brand)]" />}
            action={
              isAdmin ? (
                <Link
                  href={`/consultoria/${consultancySlug}/membros`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[48px] shadow-sm depth-interactive"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>+ Convidar primeiro {isEffectiveNutritionist ? "paciente" : "aluno"}</span>
                </Link>
              ) : undefined
            }
          />
        </div>

        {/* Preserved desktop container */}
        <div className="hidden md:block p-8 sm:p-12 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="font-heading text-base font-bold text-[var(--text-primary)]">
              Nenhum {isEffectiveNutritionist ? "paciente" : "aluno"} disponível nesta consultoria
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {isEffectiveNutritionist
                ? "Assim que novos pacientes forem cadastrados ou vinculados à consultoria, eles aparecerão aqui para prontuário, planos alimentares e evolução."
                : "Assim que novos alunos forem cadastrados ou vinculados à consultoria, eles aparecerão aqui para acompanhamento e montagem de treinos."}
            </p>
          </div>
          {isAdmin && (
            <div className="pt-2">
              <Link
                href={`/consultoria/${consultancySlug}/membros`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px]"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Convidar {isEffectiveNutritionist ? "paciente" : "aluno"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* =========================================================================
          MOBILE-NATIVE SEARCH & FILTER CONTROLS (md:hidden)
          ========================================================================= */}
      <div className="md:hidden space-y-2.5">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder={isEffectiveNutritionist ? "Buscar pacientes por nome, e-mail..." : "Buscar por nome, e-mail ou objetivo..."}
          onFilterClick={() => setIsFilterSheetOpen(true)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Mobile Segmented Control for fast 1-tap thumb filtering (hidden for nutritionist) */}
        {!isEffectiveNutritionist && (
          <MobileSegmentedControl
            options={[
              { id: "ALL", label: `Todos (${students.length})` },
              { id: "WITH_WORKOUT", label: `Com treino (${withWorkoutCount})` },
              { id: "WITHOUT_WORKOUT", label: `Sem treino (${withoutWorkoutCount})` },
            ]}
            value={workoutFilter}
            onChange={(val) => setWorkoutFilter(val as "ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT")}
          />
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Filtros:</span>
            {!isEffectiveNutritionist && workoutFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setWorkoutFilter("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/30 min-h-[32px] cursor-pointer"
              >
                <span>{workoutFilter === "WITH_WORKOUT" ? "Com treino ativo" : "Sem treino prescrito"}</span>
                <span className="text-xs">✕</span>
              </button>
            )}
            {selectedObjective !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedObjective("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[32px] cursor-pointer"
              >
                <span>Objetivo: {selectedObjective}</span>
                <span className="text-xs">✕</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer min-h-[32px] flex items-center"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          DESKTOP-PRESERVED SEARCH HEADER BAR (hidden md:flex)
          ========================================================================= */}
      <div className="hidden md:flex flex-row items-center justify-between gap-3 bg-[var(--surface)] p-3 sm:p-4 rounded-xl border border-[var(--border-default)] shadow-xs depth-surface">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEffectiveNutritionist ? "Buscar pacientes por nome, e-mail..." : "Buscar por nome, e-mail ou objetivo..."}
            aria-label={isEffectiveNutritionist ? "Buscar pacientes" : "Buscar alunos"}
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-1 sm:px-0">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {filteredStudents.length}{" "}
            {isEffectiveNutritionist
              ? filteredStudents.length === 1
                ? "paciente encontrado"
                : "pacientes encontrados"
              : filteredStudents.length === 1
                ? "aluno encontrado"
                : "alunos encontrados"}
          </span>
        </div>
      </div>

      {/* =========================================================================
          EMPTY SEARCH & FILTER RESULTS (SHARED)
          ========================================================================= */}
      {filteredStudents.length === 0 ? (
        <div className="space-y-3">
          {/* Mobile empty state */}
          <div className="md:hidden">
            <MobileEmptyState
              title={isEffectiveNutritionist ? "Nenhum paciente encontrado" : "Nenhum aluno encontrado"}
              description={
                isEffectiveNutritionist
                  ? `Nenhum paciente corresponde aos filtros aplicados${search ? ` para "${search}"` : ""}.`
                  : `Nenhum aluno corresponde aos filtros aplicados${search ? ` para "${search}"` : ""}.`
              }
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleResetFilters}
                  className="w-full min-h-[44px] font-bold text-xs"
                >
                  Limpar busca e filtros
                </Button>
              }
            />
          </div>

          {/* Desktop empty state */}
          <div className="hidden md:block p-8 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2 shadow-xs depth-surface">
            <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Nenhum {isEffectiveNutritionist ? "paciente" : "aluno"} corresponde aos critérios de busca
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Verifique a grafia ou limpe o campo de busca para ver todos os {isEffectiveNutritionist ? "pacientes" : "alunos"}.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-[var(--brand)] hover:underline pt-2 inline-block cursor-pointer min-h-[44px]"
            >
              Limpar busca e filtros
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* =====================================================================
              MOBILE STUDENT CARDS (md:hidden)
              Thumb-friendly, full card tap, contextual actions, no cramped table
              ===================================================================== */}
          <div className="md:hidden space-y-3" data-testid="mobile-student-list">
            {filteredStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;
              const studentDetailHref = isEffectiveNutritionist
                ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
                : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;
              const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;
              const createPlanHref = `/consultoria/${consultancySlug}/planos-v2/novo?student=${student.membershipPublicId}`;

              return (
                <div
                  key={student.membershipPublicId}
                  data-testid="mobile-student-card"
                  onClick={() => router.push(studentDetailHref)}
                  className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3 active:scale-[0.99] transition-all cursor-pointer depth-surface select-none"
                >
                  {/* Card Top: Avatar, Name, Email, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        fullName={student.name}
                        userPublicId={student.userPublicId}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="font-heading text-sm font-bold text-[var(--text-primary)] block truncate">
                          {student.name}
                        </span>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <Badge variant="success" size="sm" className="shrink-0 font-semibold text-[10px]">
                      Ativo
                    </Badge>
                  </div>

                  {/* Contextual Info Banner: Objective + Workout */}
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                    {student.objective ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                          Foco:
                        </span>
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {student.objective}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--text-tertiary)] italic">
                        Objetivo não informado
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEffectiveNutritionist ? (
                        <>
                          <AppleIcon className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                          <span className="text-[var(--text-secondary)]">Acompanhamento nutricional</span>
                        </>
                      ) : (
                        <>
                          <DumbbellIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                          {hasActiveWorkout ? (
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Treino:
                              </span>
                              <span className="text-[var(--text-primary)] font-medium truncate">
                                {student.latestWorkoutTitle}
                              </span>
                            </div>
                          ) : student.latestWorkoutTitle ? (
                            <div className="flex items-center gap-1 min-w-0 text-[var(--text-secondary)] truncate">
                              <span className="text-[var(--text-tertiary)]">Último:</span>
                              <span className="truncate">{student.latestWorkoutTitle}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">Nenhum treino prescrito</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Primary CTA + Contextual Action + More Sheet */}
                  <div
                    className="flex items-center gap-2 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={studentDetailHref}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] depth-interactive cursor-pointer"
                    >
                      <span>{isEffectiveNutritionist ? "Ver paciente" : "Ver aluno"}</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    </Link>

                    {/* Contextual primary action by role */}
                    {isEffectiveNutritionist ? (
                      <Link
                        href={createPlanHref}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] shadow-xs cursor-pointer shrink-0"
                        title="Criar novo plano alimentar"
                      >
                        <AppleIcon className="w-3.5 h-3.5" />
                        <span>Plano</span>
                      </Link>
                    ) : (
                      <Link
                        href={createWorkoutHref}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] transition-all min-h-[44px] shadow-xs cursor-pointer shrink-0"
                        title="Criar novo treino"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Treino</span>
                      </Link>
                    )}

                    {/* Secondary Contextual Actions via ActionSheet */}
                    <button
                      type="button"
                      aria-label={isEffectiveNutritionist ? "Mais opções para este paciente" : "Mais opções para este aluno"}
                      onClick={() => setActionSheetStudent(student)}
                      className="inline-flex items-center justify-center rounded-xl p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] min-w-[44px] cursor-pointer shrink-0"
                    >
                      <MoreDotsIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =====================================================================
              DESKTOP STUDENT CARDS GRID (hidden md:grid)
              Preserved 100% for desktop users
              ===================================================================== */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {filteredStudents.map((student) => {
              const hasActiveWorkout =
                student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;
              const studentDetailHref = isEffectiveNutritionist
                ? `/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`
                : `/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`;

              return (
                <div
                  key={student.membershipPublicId}
                  className="group p-5 sm:p-5.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] shadow-xs transition-all flex flex-col justify-between space-y-4 depth-surface"
                >
                  {/* Header: Avatar, Name, Email, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar
                        fullName={student.name}
                        userPublicId={student.userPublicId}
                        size="md"
                        className="shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={studentDetailHref}
                          className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors block truncate"
                        >
                          {student.name}
                        </Link>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <Badge variant="success" size="sm" className="shrink-0 font-medium">
                      Ativo
                    </Badge>
                  </div>

                  {/* Middle: Objective & Latest Workout */}
                  <div className="space-y-2 py-1 border-y border-[var(--border-subtle)]">
                    {student.objective ? (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-tertiary)]">Objetivo:</span>
                        <span className="text-[var(--text-primary)] font-medium truncate">
                          {student.objective}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <span>Objetivo não informado</span>
                      </div>
                    )}

                    {isEffectiveNutritionist ? (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <AppleIcon className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                        <span className="text-[var(--text-secondary)]">Acompanhamento nutricional</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs">
                        <DumbbellIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                        {hasActiveWorkout ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Treino ativo:
                            </span>
                            <span className="text-[var(--text-primary)] font-medium truncate">
                              {student.latestWorkoutTitle}
                            </span>
                          </div>
                        ) : student.latestWorkoutTitle ? (
                          <div className="flex items-center gap-1.5 min-w-0 text-[var(--text-secondary)]">
                            <span className="text-[var(--text-tertiary)]">Último treino:</span>
                            <span className="truncate">{student.latestWorkoutTitle}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">Nenhum treino prescrito</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions: Ver aluno/paciente & Criar treino/plano */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={studentDetailHref}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[44px] depth-interactive cursor-pointer"
                    >
                      <span>{isEffectiveNutritionist ? "Ver paciente" : "Ver aluno"}</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    </Link>

                    {isEffectiveNutritionist ? (
                      <Link
                        href={`/consultoria/${consultancySlug}/planos-v2/novo?studentId=${student.membershipPublicId}`}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all min-h-[44px] shadow-xs depth-interactive cursor-pointer shrink-0"
                        title="Criar novo plano alimentar para este paciente"
                      >
                        <AppleIcon className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Criar plano</span>
                        <span className="xs:hidden">Plano</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all min-h-[44px] shadow-xs depth-interactive cursor-pointer shrink-0"
                        title="Criar novo treino para este aluno"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Criar treino</span>
                        <span className="xs:hidden">Treino</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* =========================================================================
          MOBILE FILTER BOTTOM SHEET
          ========================================================================= */}
      <MobileBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title={isEffectiveNutritionist ? "Filtros de Pacientes" : "Filtros de Alunos"}
        subtitle={isEffectiveNutritionist ? "Refine a lista por objetivo" : "Refine a lista por situação de treino ou objetivo"}
        footer={
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="md"
              onClick={handleResetFilters}
              className="flex-1 min-h-[48px] font-semibold text-xs"
            >
              Limpar filtros
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsFilterSheetOpen(false)}
              className="flex-1 min-h-[48px] font-bold text-xs"
            >
              Aplicar filtros
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {!isEffectiveNutritionist && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                Situação de Treino
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "ALL", label: `Todos os alunos (${students.length})` },
                  { id: "WITH_WORKOUT", label: `Com treino ativo (${withWorkoutCount})` },
                  { id: "WITHOUT_WORKOUT", label: `Sem treino prescrito (${withoutWorkoutCount})` },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWorkoutFilter(opt.id as "ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT")}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      workoutFilter === opt.id
                        ? "bg-[var(--brand)] text-[var(--text-inverse)] font-bold shadow-xs"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {workoutFilter === opt.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableObjectives.length > 0 && (
            <div className={`space-y-2 ${!isEffectiveNutritionist ? "pt-2 border-t border-[var(--border-subtle)]" : ""}`}>
              <label className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                {isEffectiveNutritionist ? "Objetivo do Paciente" : "Objetivo do Aluno"}
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedObjective("ALL")}
                  className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                    selectedObjective === "ALL"
                      ? "bg-[var(--brand)] text-[var(--text-inverse)] font-bold"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span>Todos os objetivos</span>
                  {selectedObjective === "ALL" && <span>✓</span>}
                </button>
                {availableObjectives.map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setSelectedObjective(obj)}
                    className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                      selectedObjective === obj
                        ? "bg-[var(--brand)] text-[var(--text-inverse)] font-bold"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="truncate">{obj}</span>
                    {selectedObjective === obj && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* =========================================================================
          MOBILE ACTION SHEET (••• Contextual menu per student)
          ========================================================================= */}
      <MobileActionSheet
        isOpen={!!actionSheetStudent}
        onClose={() => setActionSheetStudent(null)}
        title={actionSheetStudent ? `Ações para ${actionSheetStudent.name}` : undefined}
        options={actionSheetOptions}
      />
    </div>
  );
}
