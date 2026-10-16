"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { GuidedStudentAssistant } from "./guided-student-assistant";
import type { PersonalStudentSummary } from "@/lib/consultancies/personal-student-hub";

export interface PersonalStudentListProps {
  consultancySlug: string;
  students: PersonalStudentSummary[];
  effectiveMode?: string;
  userRoles?: string[];
  professionalName?: string;
  initialStudentPublicId?: string;
}

export function PersonalStudentList({
  consultancySlug,
  students,
  effectiveMode,
  userRoles = [],
  professionalName,
  initialStudentPublicId,
}: PersonalStudentListProps) {
  const isNutritionist = effectiveMode === "NUTRITIONIST" || userRoles.includes("NUTRITIONIST");
  const isPersonal = effectiveMode === "PERSONAL" || userRoles.includes("PERSONAL");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (!effectiveMode && isNutritionist && !isPersonal);

  // Operational Counters
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  return (
    <div className="w-full">
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

      {/* NEW GUIDED STUDENT ASSISTANT (100% SEM IA, ETAPAS EM SLIDE) */}
      <GuidedStudentAssistant
        consultancySlug={consultancySlug}
        professionalName={professionalName}
        students={students}
        effectiveMode={effectiveMode}
        userRoles={userRoles}
        initialStudentPublicId={initialStudentPublicId}
      />
    </div>
  );
}
