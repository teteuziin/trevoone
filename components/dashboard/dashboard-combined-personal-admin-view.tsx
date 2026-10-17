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
      {/* Alternador de Modo (Desktop no topo da área principal) */}
      <div className="hidden lg:flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#303238]">
        <CockpitRoleModeSwitcher
          consultancySlug={consultancySlug}
          currentMode={activeTab === "coach" ? "PERSONAL" : "ADMIN"}
          onSwitch={(mode) => setActiveTab(mode === "PERSONAL" ? "coach" : "admin")}
        />
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
