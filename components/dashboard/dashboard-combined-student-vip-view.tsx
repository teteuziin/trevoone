"use client";

import React from "react";
import {
  DashboardStudentView,
  type StudentOnboardingInfo,
  type StudentActiveTrainingSummary,
  type StudentActiveNutritionSummary,
} from "./dashboard-student-view";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { CheckinRequestDetailDto } from "@/lib/nutrition-v2/checkin-types";
import type { StudentPendingRequestDto } from "@/lib/consultancies/student-requests";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type {
  StudentConsultationItem,
  StudentChatItem,
} from "./student/sections/student-consultations-chat-section";
import type { StudentProgressEntry } from "./student/sections/student-evolution-section";
import type { DailyWorkoutResolution } from "@/lib/training-v2/daily-workout-resolver";
import type { getReferrerDashboardData } from "@/lib/referrals/service";

export type ReferrerDashboardData = Awaited<ReturnType<typeof getReferrerDashboardData>>;

export interface DashboardCombinedStudentVipViewProps {
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
  missions?: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
  dailyWorkoutResolution?: DailyWorkoutResolution | null;
}

/**
 * Experiência Integrada para Alunos que possuem benefícios VIP e Parceria (Influenciador).
 * Prioridade absoluta ao Acompanhamento de Aluno (Treino e Alimentação no topo),
 * com os recursos VIP/Afiliados integrados na seção de Benefícios sem ocultar o treino.
 */
export function DashboardCombinedStudentVipView({
  consultancySlug,
  consultancyName,
  userName,
  onboarding,
  activeTrainingPlan,
  activeNutritionPlan,
  latestProgress,
  previousProgress,
  pendingPhotoEvaluation,
  todayCheckin,
  pendingNutritionCheckin,
  studentPendingRequests = [],
  upcomingConsultations = [],
  chatConversations = [],
  missions = [],
  totalMissions = 0,
  referrerData = null,
  dailyWorkoutResolution = null,
}: DashboardCombinedStudentVipViewProps) {
  return (
    <DashboardStudentView
      consultancySlug={consultancySlug}
      consultancyName={consultancyName}
      userName={userName}
      onboarding={onboarding}
      activeTrainingPlan={activeTrainingPlan}
      activeNutritionPlan={activeNutritionPlan}
      latestProgress={latestProgress}
      previousProgress={previousProgress}
      pendingPhotoEvaluation={pendingPhotoEvaluation}
      todayCheckin={todayCheckin}
      pendingNutritionCheckin={pendingNutritionCheckin}
      studentPendingRequests={studentPendingRequests}
      upcomingConsultations={upcomingConsultations}
      chatConversations={chatConversations}
      isInfluencer={true}
      isVip={true}
      missions={missions}
      totalMissions={totalMissions}
      referrerData={referrerData}
      dailyWorkoutResolution={dailyWorkoutResolution}
    />
  );
}
