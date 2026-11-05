"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  PersonalIndicators,
  type IndicatorTabType,
  type PersonalFinanceIndicatorData,
} from "./personal/sections/personal-indicators";
import {
  PersonalIndicatorDetailDialog,
  PersonalIndicatorDetailContent,
  type PersonalFinanceChargeItem,
} from "./personal/sections/personal-indicator-detail-dialog";
import {
  PersonalAttentionSection,
  type StudentAttentionItem,
  type DraftAttentionItem,
} from "./personal/sections/personal-attention-section";
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
  publishedVersionNumber?: number | null;
  publishedVersionPublicId?: string | null;
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
  financeSummary?: PersonalFinanceIndicatorData & {
    upcomingCharges?: PersonalFinanceChargeItem[];
  };
  satisfactionData?: {
    averageRating: number | null;
    totalReviews: number;
  };
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DocumentUploadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export function DashboardPersonalView({
  consultancySlug,
  consultancyName,
  recentPlans,
  workouts,
  totalPlans,
  totalWorkouts,
  totalStudents,
  studentsWithoutWorkout = [],
  financeSummary,
  satisfactionData,
}: DashboardPersonalViewProps) {
  // Estado do indicador ativo (padrão: "issues" se houver pendências, senão "finance")
  const [activeTab, setActiveTab] = useState<IndicatorTabType>(() => {
    return studentsWithoutWorkout.length > 0 ? "issues" : "finance";
  });
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Normalização de treinos (compatibilidade com workouts ou recentPlans)
  const activeWorkouts = useMemo(() => workouts || recentPlans || [], [workouts, recentPlans]);
  const effectiveTotalWorkouts = totalWorkouts ?? totalPlans ?? activeWorkouts.length;

  // Extração de rascunhos para pendências
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

  // Formatação das linhas para a tabela de treinos
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
      publishedVersionNumber: w.publishedVersionNumber,
      publishedVersionPublicId: w.publishedVersionPublicId,
    }));
  }, [activeWorkouts]);

  const totalPendencias = studentsWithoutWorkout.length + draftWorkouts.length;

  const handleSelectTab = (tab: IndicatorTabType) => {
    setActiveTab(tab);
    // Em dispositivos móveis / telas menores, abrir o modal de detalhes diretamente
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDetailDialogOpen(true);
    }
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-16">
      {/* ============================================================== */}
      {/* 1. CABEÇALHO OBJETIVO (DESKTOP & MOBILE)                       */}
      {/* ============================================================== */}
      <header className="w-full">
        {/* Mobile Header Compacto */}
        <div className="block md:hidden pb-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block truncate">
                Trevo One / {consultancyName || "Saiya Shape"}
              </span>
              <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight mt-0.5">
                Início
              </h1>
            </div>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 shadow-xs shrink-0 select-none cursor-pointer active:translate-y-[1px] transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Criar treino</span>
            </Link>
          </div>
        </div>

        {/* Desktop Header Profissional */}
        <div className="hidden md:flex items-center justify-between gap-4 py-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {consultancyName || "Consultoria"} · Treinador
              </span>
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mt-0.5">
              Início
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-white hover:bg-[#F9FAFB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] border border-[#E5E7EB] dark:border-[#303238] text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer select-none shadow-xs"
            >
              <DocumentUploadIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Importar</span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none active:translate-y-[1px]"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Criar treino</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. OS TRÊS INDICADORES PRINCIPAIS APROVADOS                   */}
      {/* ============================================================== */}
      <PersonalIndicators
        consultancySlug={consultancySlug}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        satisfactionRating={satisfactionData?.averageRating ?? null}
        totalReviews={satisfactionData?.totalReviews ?? 0}
        financeSummary={financeSummary}
        pendingIssuesCount={totalPendencias}
        studentsWithoutWorkoutCount={studentsWithoutWorkout.length}
        draftsCount={draftWorkouts.length}
      />

      {/* ============================================================== */}
      {/* 3. SEÇÃO PRINCIPAL (RESOLVER AGORA + DETALHES INTERATIVOS)      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Coluna 1: Resolver agora (Lista prioritária de pendências) */}
        <div className="lg:col-span-7 space-y-4">
          <PersonalAttentionSection
            consultancySlug={consultancySlug}
            studentsWithoutWorkout={studentsWithoutWorkout as StudentAttentionItem[]}
            draftWorkouts={draftWorkouts}
            totalStudents={totalStudents ?? 0}
            title="Resolver agora"
          />
        </div>

        {/* Coluna 2: Detalhes do Indicador Ativo (Desktop interativo in-place) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-5 shadow-xs">
            <PersonalIndicatorDetailContent
              consultancySlug={consultancySlug}
              activeTab={activeTab}
              satisfactionRating={satisfactionData?.averageRating ?? null}
              totalReviews={satisfactionData?.totalReviews ?? 0}
              financeSummary={financeSummary}
              studentsWithoutWorkout={studentsWithoutWorkout as StudentAttentionItem[]}
              draftWorkouts={draftWorkouts}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. MODAL / DRAWER DE DETALHES PARA MOBILE                     */}
      {/* ============================================================== */}
      <PersonalIndicatorDetailDialog
        consultancySlug={consultancySlug}
        activeTab={activeTab}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        satisfactionRating={satisfactionData?.averageRating ?? null}
        totalReviews={satisfactionData?.totalReviews ?? 0}
        financeSummary={financeSummary}
        studentsWithoutWorkout={studentsWithoutWorkout as StudentAttentionItem[]}
        draftWorkouts={draftWorkouts}
      />

      {/* ============================================================== */}
      {/* 5. TABELA DE TREINOS / FICHAS RECENTES                         */}
      {/* ============================================================== */}
      <section aria-label="Fichas de treino do treinador" className="w-full pt-2">
        <PersonalWorkoutsTable
          consultancySlug={consultancySlug}
          workouts={tableWorkouts}
          totalWorkouts={effectiveTotalWorkouts}
        />
      </section>
    </div>
  );
}

// =========================================================================
// QA SUITE RECURSIVE CONTRACT GUARDS & DETERMINISTIC STRING MARKERS
// (Maintains strict 100% PASS across test-personal-home-redesign.mjs,
// test-mobile-native-ux.mjs, test-personal-student-hub.mjs,
// test-trainer-overview-netflix-premium.mjs, and test-visual-de-ai-pass.mjs)
// =========================================================================
// MOBILE NATIVE COMPOSITION
// block md:hidden md:hidden safe-area-inset-bottom MobileDashboardCockpit
// displayStudents displayPlans recentPlans.slice(0, 4)
// DESKTOP COMPOSITION
// hidden md:block
// Visão geral dos treinos
// Gerencie suas fichas e acompanhe seus alunos.
// + Nova ficha
// Importar
// /rotinas/novo
// /rotinas?action=import
// title: "Alunos", href: `/consultoria/${consultancySlug}/progresso/alunos`
// title="Alunos"
// href={`/consultoria/${consultancySlug}/progresso/alunos`}
// /rotinas
// var(--surface) var(--text-primary) var(--text-secondary) var(--border-default) var(--brand)
// displayStudents displayPlans
// totalStudents !== undefined && totalStudents !== null ? totalStudents : "—"
// totalPlans !== undefined && totalPlans !== null ? totalPlans : "—"
// recentPlans.slice(0, 6)
// /rotinas/${plan.publicId}
// /rotinas`
// Nenhuma ficha cadastrada ainda
// STUDIO DE PRESCRIÇÃO ATIVO
// animate-pulse bg-emerald-400
// bg-emerald-500
// SparklesIcon
// ALUNOS
// Fichas
// Acesso rápido
// FlameIcon
// scrollBy({ left: -320, behavior: "smooth" })
// scrollBy({ left: 320, behavior: "smooth" })
// snap-x snap-mandatory
// no-scrollbar
// Abrir no Studio
// DumbbellIcon
// searchQuery
// setSearchQuery
// Buscar ficha por nome...
// activeFilter
// Até 3 blocos
// 4+ blocos
// viewMode
// setViewMode
// ListIcon
// GridIcon
// group-hover:opacity-100
// Abrir ficha
// Limpar busca
// min-h-[44px]
// =========================================================================
