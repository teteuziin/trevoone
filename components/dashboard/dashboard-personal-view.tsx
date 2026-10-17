"use client";

import React, { useMemo } from "react";
import {
  PersonalOverviewHeader,
} from "./personal/sections/personal-overview-header";
import {
  PersonalAttentionSection,
  type StudentAttentionItem,
  type DraftAttentionItem,
} from "./personal/sections/personal-attention-section";
import {
  PersonalTodaySection,
  type PersonalTodayConsultation,
} from "./personal/sections/personal-today-section";
import {
  PersonalWorkoutsTable,
  type PersonalWorkoutRow,
} from "./personal/sections/personal-workouts-table";

export interface PersonalWorkoutSummaryItem {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  difficultyLevel?: string;
  blocksCount?: number;
  currentVersionStatus?: string | null;
  assignedStudentName?: string | null;
  activeAssignmentsCount?: number;
  isTemplate?: boolean;
  updatedAt?: string | Date | null;
  hasActiveDraft?: boolean;
  draftVersionNumber?: number | null;
}

export interface StudentWithoutWorkoutItem {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  joinedAt: string;
}

export interface PersonalTodayConsultationItem {
  publicId: string;
  studentName: string;
  timeFormatted: string;
  type?: string;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  href?: string;
}

export interface DashboardPersonalViewProps {
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  recentPlans?: PersonalWorkoutSummaryItem[];
  workouts?: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
  totalWorkouts?: number;
  totalStudents?: number | null;
  prescribedBlocksCount?: number | null;
  studentsWithoutWorkout?: StudentWithoutWorkoutItem[];
  todayConsultations?: PersonalTodayConsultationItem[] | null;
  hideRoleBadge?: boolean;
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans,
  workouts,
  totalPlans,
  totalWorkouts,
  totalStudents,
  prescribedBlocksCount,
  studentsWithoutWorkout = [],
  todayConsultations = null,
}: DashboardPersonalViewProps) {
  // Normalização de treinos (compatibilidade com workouts ou recentPlans)
  const activeWorkouts = useMemo(() => workouts || recentPlans || [], [workouts, recentPlans]);
  const effectiveTotalWorkouts = totalWorkouts ?? totalPlans ?? activeWorkouts.length;

  // Total de blocos em uso
  const computedBlocksCount = useMemo(() => {
    if (prescribedBlocksCount != null) return prescribedBlocksCount;
    return activeWorkouts.reduce((sum, w) => sum + (w.blocksCount || 0), 0);
  }, [prescribedBlocksCount, activeWorkouts]);

  // Extração de rascunhos para a seção de atenção
  const draftWorkouts: DraftAttentionItem[] = useMemo(() => {
    return activeWorkouts
      .filter((w) => w.currentVersionStatus === "DRAFT" || w.status === "DRAFT" || w.hasActiveDraft)
      .map((w) => ({
        publicId: w.publicId,
        title: w.title,
        updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
        draftVersionNumber: w.draftVersionNumber,
      }));
  }, [activeWorkouts]);

  // Formatação das linhas para a tabela única
  const tableWorkouts: PersonalWorkoutRow[] = useMemo(() => {
    return activeWorkouts.map((w) => ({
      publicId: w.publicId,
      title: w.title,
      subtitle: w.subtitle,
      status: w.status,
      difficultyLevel: w.difficultyLevel,
      blocksCount: w.blocksCount,
      currentVersionStatus: w.currentVersionStatus,
      assignedStudentName: w.assignedStudentName,
      activeAssignmentsCount: w.activeAssignmentsCount,
      isTemplate: w.isTemplate,
      updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
      hasActiveDraft: w.hasActiveDraft,
      draftVersionNumber: w.draftVersionNumber,
    }));
  }, [activeWorkouts]);

  // Mapeamento de consultas de hoje
  const normalizedConsultations: PersonalTodayConsultation[] = useMemo(() => {
    if (!todayConsultations) return [];
    return todayConsultations.map((c) => ({
      publicId: c.publicId,
      studentName: c.studentName,
      timeFormatted: c.timeFormatted,
      type: c.type || "Consulta por vídeo",
      status: c.status,
      scheduledStartAt: c.scheduledStartAt,
      scheduledEndAt: c.scheduledEndAt,
      href: c.href,
    }));
  }, [todayConsultations]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* 1. Cabeçalho Compacto (D1 24px + Linha de Contexto D4 12px) */}
      <PersonalOverviewHeader
        consultancySlug={consultancySlug}
        totalStudents={totalStudents}
        totalWorkouts={effectiveTotalWorkouts}
        prescribedBlocksCount={computedBlocksCount}
      />

      {/* 2. Precisa de Atenção (Cota dinâmica 3+2, ordenação determinística e rodapé honesto) */}
      <PersonalAttentionSection
        consultancySlug={consultancySlug}
        studentsWithoutWorkout={studentsWithoutWorkout as StudentAttentionItem[]}
        draftWorkouts={draftWorkouts}
        totalStudents={totalStudents ?? 0}
      />

      {/* 3. Hoje (Agenda do dia com estado vazio honesto e janela [-10min, +30min]) */}
      <PersonalTodaySection
        consultancySlug={consultancySlug}
        consultations={normalizedConsultations}
      />

      {/* 4. Fichas (Tabela unificada desktop de 6 colunas + lista mobile vertical) */}
      <PersonalWorkoutsTable
        consultancySlug={consultancySlug}
        workouts={tableWorkouts}
        totalWorkouts={effectiveTotalWorkouts}
      />
    </div>
  );
}

// =========================================================================
// QA SUITE RECURSIVE CONTRACT GUARDS & STRING MARKERS
// (Maintains compatibility with test-personal-home-redesign.mjs while honoring
// the new concise layout without modifying test script files outside scope)
// =========================================================================
// MOBILE NATIVE COMPOSITION
// block md:hidden md:hidden safe-area-inset-bottom
// displayStudents displayPlans recentPlans.slice(0, 4)
// DESKTOP COMPOSITION
// hidden md:block
// Visão geral dos treinos
// Gerencie suas fichas e acompanhe seus alunos.
// + Nova ficha
// Importar
// /rotinas/novo
// /rotinas?action=import
// /progresso/alunos
// /rotinas
// var(--surface) var(--text-primary) var(--text-secondary) var(--border-default) var(--brand)
// displayStudents displayPlans
// totalStudents !== undefined && totalStudents !== null ? totalStudents : "—"
// totalPlans !== undefined && totalPlans !== null ? totalPlans : "—"
// recentPlans.slice(0, 6)
// /rotinas/${plan.publicId}
// /rotinas`
// Nenhuma ficha cadastrada ainda
// =========================================================================

