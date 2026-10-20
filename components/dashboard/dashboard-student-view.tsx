"use client";

import React, { useMemo } from "react";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { StudentOverviewHeader } from "./student/sections/student-overview-header";
import { StudentFocusSection } from "./student/sections/student-focus-section";
import {
  StudentPendingSection,
  type StudentPendingItem,
} from "./student/sections/student-pending-section";
import {
  StudentConsultationsChatSection,
  type StudentConsultationItem,
  type StudentChatItem,
} from "./student/sections/student-consultations-chat-section";
import {
  StudentEvolutionSection,
  type StudentProgressEntry,
} from "./student/sections/student-evolution-section";
import { StudentBenefitsSection } from "./student/sections/student-benefits-section";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { CheckinRequestDetailDto } from "@/lib/nutrition-v2/checkin-types";
import type { StudentPendingRequestDto } from "@/lib/consultancies/student-requests";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { ReferrerDashboardData } from "./dashboard-combined-student-vip-view";

export interface StudentWorkoutRoutineSummary {
  publicId?: string;
  title: string;
  subtitle?: string | null;
  blockCount?: number;
  estimatedDurationMinutes?: number | null;
  difficultyLevel?: string | null;
}

export interface StudentActiveTrainingSummary {
  title: string;
  subtitle?: string | null;
  workoutCount?: number;
  totalExercises?: number;
  blockCount?: number;
  hasActiveSession?: boolean;
  activeSessionAssignmentPublicId?: string | null;
  workouts?: StudentWorkoutRoutineSummary[];
}

export interface StudentActiveNutritionMealSummary {
  publicId?: string;
  title: string;
  scheduledTime?: string | null;
  itemsCount?: number;
}

export interface StudentActiveNutritionSummary {
  title: string;
  subtitle?: string | null;
  mealsCount?: number;
  firstMealTime?: string | null;
  meals?: StudentActiveNutritionMealSummary[];
}

export interface StudentOnboardingInfo {
  applicable: boolean;
  isComplete: boolean;
  confirmedRequirements: number;
  totalRequirements: number;
}

export interface DashboardStudentViewProps {
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  onboarding: StudentOnboardingInfo | null;
  activeTrainingPlan: StudentActiveTrainingSummary | null;
  activeNutritionPlan: StudentActiveNutritionSummary | null;
  latestProgress: StudentProgressEntry | null;
  previousProgress?: StudentProgressEntry | null;
  pendingPhotoEvaluation?: boolean;
  todayCheckin?: DailyCheckinRecord | null;
  pendingNutritionCheckin?: CheckinRequestDetailDto | null;
  studentPendingRequests?: StudentPendingRequestDto[];
  upcomingConsultations?: StudentConsultationItem[];
  chatConversations?: StudentChatItem[];
  isInfluencer?: boolean;
  isVip?: boolean;
  missions?: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
}

export function DashboardStudentView({
  consultancySlug,
  consultancyName = "Consultoria",
  userName = "Aluno",
  onboarding,
  activeTrainingPlan,
  activeNutritionPlan,
  latestProgress,
  previousProgress,
  pendingPhotoEvaluation = false,
  todayCheckin,
  pendingNutritionCheckin,
  studentPendingRequests = [],
  upcomingConsultations = [],
  chatConversations = [],
  isInfluencer = false,
  isVip = false,
  missions = [],
  totalMissions = 0,
  referrerData = null,
}: DashboardStudentViewProps) {
  // =========================================================================
  // AGREGAÇÃO UNIFICADA DE PENDÊNCIAS (SEÇÃO C: "PARA RESPONDER")
  // =========================================================================
  const pendingItems: StudentPendingItem[] = useMemo(() => {
    const list: StudentPendingItem[] = [];

    // 1. Check-in de acompanhamento nutricional com prazo real
    if (pendingNutritionCheckin && pendingNutritionCheckin.derivedState === "PENDING") {
      list.push({
        id: `nutrition-checkin-${pendingNutritionCheckin.publicId}`,
        type: "CHECKIN",
        title: "Check-in de acompanhamento nutricional",
        subtitle: "Conte para sua nutricionista como foi seu período alimentar recente.",
        dueAtFormatted: pendingNutritionCheckin.dueAt
          ? new Date(pendingNutritionCheckin.dueAt).toLocaleDateString("pt-BR")
          : null,
        ctaLabel: "Responder",
        href: `/consultoria/${consultancySlug}/nutricao/checkin/${pendingNutritionCheckin.publicId}`,
      });
    }

    // 2. Anamnese pendente
    if (onboarding && onboarding.applicable && !onboarding.isComplete) {
      list.push({
        id: "onboarding-pending",
        type: "ANAMNESIS",
        title: `Anamnese pendente (${onboarding.confirmedRequirements || 0}/${
          onboarding.totalRequirements || 0
        } etapas)`,
        subtitle: "Complete suas respostas para que sua prescrição seja personalizada.",
        ctaLabel: "Preencher",
        href: `/consultoria/${consultancySlug}/onboarding`,
      });
    }

    // 3. Avaliação física e fotos
    if (pendingPhotoEvaluation) {
      list.push({
        id: "photo-evaluation-pending",
        type: "PHOTO_EVALUATION",
        title: "Avaliação física & fotos",
        subtitle: "Envie as fotos nas poses solicitadas pelo seu treinador.",
        ctaLabel: "Preencher",
        href: `/consultoria/${consultancySlug}/progresso`,
      });
    }

    // 4. Solicitações e formulários adicionais
    for (const req of studentPendingRequests) {
      list.push({
        id: `req-${req.publicId}`,
        type:
          req.type === "PHOTOS"
            ? "PHOTO_EVALUATION"
            : req.type === "ANAMNESIS"
            ? "ANAMNESIS"
            : "FORM",
        title: req.title,
        subtitle: req.description,
        requestedByName: req.requestedByName,
        requestedAtFormatted: req.requestedAt
          ? new Date(req.requestedAt).toLocaleDateString("pt-BR")
          : null,
        ctaLabel: "Preencher",
        href: req.deepLink,
      });
    }

    return list;
  }, [
    consultancySlug,
    onboarding,
    pendingNutritionCheckin,
    pendingPhotoEvaluation,
    studentPendingRequests,
  ]);

  const workoutRoutinesCount =
    activeTrainingPlan?.workoutCount || activeTrainingPlan?.workouts?.length || 0;
  const nutritionMealsCount =
    activeNutritionPlan?.mealsCount || activeNutritionPlan?.meals?.length || 0;

  const nextConsultation = upcomingConsultations[0] || null;

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* ===================================================================== */}
      {/* A. CABEÇALHO COMPACTO PRETO/GRAFITE ("Meu acompanhamento")              */}
      {/* ===================================================================== */}
      <StudentOverviewHeader
        consultancySlug={consultancySlug}
        consultancyName={consultancyName}
        userName={userName}
        isInfluencer={isInfluencer}
        isVip={isVip}
        activeWorkoutTitle={activeTrainingPlan?.title || null}
        workoutRoutinesCount={workoutRoutinesCount}
        activeNutritionTitle={activeNutritionPlan?.title || null}
        nutritionMealsCount={nutritionMealsCount}
        pendingRequestsCount={pendingItems.length}
        nextConsultationFormatted={nextConsultation?.timeFormatted || null}
        nextConsultationTitle={nextConsultation?.professionalName || null}
      />

      {/* ===================================================================== */}
      {/* B. TREINO E ALIMENTAÇÃO COMO FOCO PRINCIPAL                           */}
      {/* ===================================================================== */}
      <StudentFocusSection
        consultancySlug={consultancySlug}
        activeTraining={activeTrainingPlan}
        hasActiveSession={activeTrainingPlan?.hasActiveSession || false}
        activeSessionAssignmentPublicId={activeTrainingPlan?.activeSessionAssignmentPublicId || null}
        activeNutrition={activeNutritionPlan}
      />

      {/* ===================================================================== */}
      {/* C. PENDÊNCIAS COMPACTAS E ACIONÁVEIS ("Para responder")               */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        {/* Widget de Check-in Diário */}
        <DailyCheckinWidget
          consultancySlug={consultancySlug}
          todayCheckin={todayCheckin || null}
        />

        {/* Lista de Solicitações e Anamneses Pendentes */}
        <StudentPendingSection
          consultancySlug={consultancySlug}
          items={pendingItems}
        />
      </div>

      {/* ===================================================================== */}
      {/* D. CONSULTAS E TREVO CHAT ("Consultas e conversas")                   */}
      {/* ===================================================================== */}
      <StudentConsultationsChatSection
        consultancySlug={consultancySlug}
        upcomingConsultations={upcomingConsultations}
        chatConversations={chatConversations}
      />

      {/* ===================================================================== */}
      {/* E. EVOLUÇÃO ("Minha evolução")                                        */}
      {/* ===================================================================== */}
      <StudentEvolutionSection
        consultancySlug={consultancySlug}
        latestProgress={latestProgress}
        previousProgress={previousProgress}
      />

      {/* ===================================================================== */}
      {/* F. RECURSOS VIP / INFLUENCIADOR (QUANDO AUTORIZADOS)                  */}
      {/* ===================================================================== */}
      {(isInfluencer || isVip) && (
        <StudentBenefitsSection
          consultancySlug={consultancySlug}
          isInfluencer={isInfluencer}
          isVip={isVip}
          missions={missions}
          totalMissions={totalMissions}
          referrerData={referrerData}
        />
      )}
    </div>
  );
}
