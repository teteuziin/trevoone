"use client";

import React, { useMemo } from "react";
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
import type { DailyWorkoutResolution } from "@/lib/training-v2/daily-workout-resolver";

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
  studentName?: string | null;
  prescriberName?: string | null;
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
  dailyWorkoutResolution?: DailyWorkoutResolution | null;
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
  dailyWorkoutResolution = null,
}: DashboardStudentViewProps) {
  // =========================================================================
  // AGREGAÇÃO UNIFICADA DE PENDÊNCIAS (SEÇÃO C: "PARA RESPONDER")
  // Sem duplicar avisos ou cards soltos na tela
  // =========================================================================
  const pendingItems: StudentPendingItem[] = useMemo(() => {
    const list: StudentPendingItem[] = [];

    // 1. Check-in diário geral (se não preenchido hoje)
    const isDailyCheckinDone = Boolean(todayCheckin && todayCheckin.id);
    if (!isDailyCheckinDone) {
      list.push({
        id: "daily-checkin-today",
        type: "CHECKIN",
        title: "Check-in de hoje",
        subtitle: "Compartilhe seu treino, dieta e disposição de hoje em 30 segundos.",
        ctaLabel: "Responder",
        href: `/consultoria/${consultancySlug}?checkin=open`,
      });
    }

    // 2. Check-in de acompanhamento nutricional com prazo real
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

    // 3. Anamnese pendente
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

    // 4. Avaliação física e fotos
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

    // 5. Solicitações e formulários adicionais
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
    todayCheckin,
    onboarding,
    pendingNutritionCheckin,
    pendingPhotoEvaluation,
    studentPendingRequests,
  ]);

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
      />

      {/* ===================================================================== */}
      {/* B. TREINO E ALIMENTAÇÃO COMO FOCO PRINCIPAL (Divisão do Dia + Ações)  */}
      {/* ===================================================================== */}
      <StudentFocusSection
        consultancySlug={consultancySlug}
        activeTraining={activeTrainingPlan}
        hasActiveSession={activeTrainingPlan?.hasActiveSession || false}
        activeSessionAssignmentPublicId={activeTrainingPlan?.activeSessionAssignmentPublicId || null}
        activeNutrition={activeNutritionPlan}
        dailyWorkoutResolution={dailyWorkoutResolution}
      />

      {/* ===================================================================== */}
      {/* C. PENDÊNCIAS COMPACTAS E ACIONÁVEIS ("Para responder")               */}
      {/* ===================================================================== */}
      <StudentPendingSection
        consultancySlug={consultancySlug}
        items={pendingItems}
      />

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
      {/* F. BENEFÍCIOS VIP / PARCERIA (Apenas para Alunos VIP ou Influenciador) */}
      {/* ===================================================================== */}
      {(isVip || isInfluencer) && (
        <StudentBenefitsSection
          consultancySlug={consultancySlug}
          isVip={isVip}
          isInfluencer={isInfluencer}
          missions={missions}
          totalMissions={totalMissions}
          referrerData={referrerData}
        />
      )}
    </div>
  );
}
