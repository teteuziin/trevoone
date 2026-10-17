"use client";

import React, { useState } from "react";
import { CockpitRoleModeSwitcher } from "./cockpit-role-mode-switcher";
import {
  DashboardPersonalView,
  type PersonalWorkoutSummaryItem,
  type StudentWithoutWorkoutItem,
  type PersonalTodayConsultationItem,
} from "./dashboard-personal-view";
import { DashboardAdminView } from "./dashboard-admin-view";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";
import type { ConsultancyPresentationMode } from "@/lib/consultancies/view-mode";

interface DashboardCombinedPersonalAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  userName?: string;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  recentPlans?: PersonalWorkoutSummaryItem[];
  workouts?: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
  totalWorkouts?: number;
  totalStudents?: number | null;
  prescribedBlocksCount?: number | null;
  studentsWithoutWorkout?: StudentWithoutWorkoutItem[];
  todayConsultations?: PersonalTodayConsultationItem[] | null;
  activeRoleMode?: ConsultancyPresentationMode;
}

export function DashboardCombinedPersonalAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  userName,
  overview,
  platformAccess,
  recentPlans = [],
  workouts,
  totalPlans = 0,
  totalWorkouts,
  totalStudents,
  prescribedBlocksCount,
  studentsWithoutWorkout = [],
  todayConsultations = null,
  activeRoleMode,
}: DashboardCombinedPersonalAdminViewProps) {
  const isInitialAdmin = activeRoleMode === "ADMIN";
  const [activeTab, setActiveTab] = useState<"coach" | "admin">(isInitialAdmin ? "admin" : "coach");

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-in fade-in duration-150">
      {/* 1. Cabeçalho compacto da consultoria (Mobile) */}
      {consultancyName && (
        <div className="block md:hidden px-1 flex items-center justify-between text-xs text-[#8E95A2] font-semibold">
          <span className="truncate max-w-[200px]">{consultancyName}</span>
        </div>
      )}

      {/* 2. Alternador de Modo 3D Físico (Treinador vs Administração) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#303238]/60">
        <CockpitRoleModeSwitcher
          consultancySlug={consultancySlug}
          currentMode={activeTab === "coach" ? "PERSONAL" : "ADMIN"}
          onSwitch={(mode) => setActiveTab(mode === "PERSONAL" ? "coach" : "admin")}
        />
        <div className="text-xs text-[#8E95A2] flex items-center gap-2 font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "coach" ? "bg-[#10B981]" : "bg-[#3B82F6]"}`} />
          <span>{activeTab === "coach" ? "Modo Ativo: Prescrição de Treinos" : "Modo Ativo: Gestão & Administração"}</span>
        </div>
      </div>

      {activeTab === "coach" ? (
        <DashboardPersonalView
          consultancySlug={consultancySlug}
          consultancyName={consultancyName}
          userName={userName}
          recentPlans={recentPlans}
          workouts={workouts}
          totalPlans={totalPlans}
          totalWorkouts={totalWorkouts}
          totalStudents={totalStudents ?? overview?.students}
          prescribedBlocksCount={prescribedBlocksCount}
          studentsWithoutWorkout={studentsWithoutWorkout}
          todayConsultations={todayConsultations}
          hideRoleBadge={true}
        />
      ) : (
        <DashboardAdminView
          consultancySlug={consultancySlug}
          consultancyName={consultancyName}
          consultancyLogoUrl={consultancyLogoUrl}
          overview={overview}
          platformAccess={platformAccess}
          hideRoleBadge={true}
        />
      )}
    </div>
  );
}
