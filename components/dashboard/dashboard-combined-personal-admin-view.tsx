"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { CockpitRoleModeSwitcher } from "./cockpit-role-mode-switcher";
import type {
  PersonalWorkoutSummaryItem,
  StudentWithoutWorkoutItem,
  PersonalTodayConsultationItem,
} from "./dashboard-personal-view";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";
import type { ConsultancyPresentationMode } from "@/lib/consultancies/view-mode";

const DashboardPersonalView = dynamic(
  () => import("./dashboard-personal-view").then((m) => m.DashboardPersonalView)
);
const DashboardAdminView = dynamic(
  () => import("./dashboard-admin-view").then((m) => m.DashboardAdminView)
);

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
  const [optimisticTab, setOptimisticTab] = useState<"coach" | "admin" | null>(null);
  const [prevActiveRoleMode, setPrevActiveRoleMode] = useState(activeRoleMode);

  if (prevActiveRoleMode !== activeRoleMode) {
    setPrevActiveRoleMode(activeRoleMode);
    setOptimisticTab(null);
  }

  // Synchronize immediately on view-mode custom events across components
  React.useEffect(() => {
    const handleModeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: ConsultancyPresentationMode }>).detail;
      if (detail?.mode === "ADMIN") setOptimisticTab("admin");
      else if (detail?.mode === "PERSONAL") setOptimisticTab("coach");
    };
    window.addEventListener("trevo-view-mode-change", handleModeChange);
    return () => window.removeEventListener("trevo-view-mode-change", handleModeChange);
  }, []);

  const activeTab = optimisticTab ?? (activeRoleMode === "ADMIN" ? "admin" : "coach");

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-in fade-in duration-150">
      {/* Alternador de Modo (Desktop no topo da área principal) */}
      <div className="hidden lg:flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#303238]">
        <CockpitRoleModeSwitcher
          consultancySlug={consultancySlug}
          currentMode={activeTab === "coach" ? "PERSONAL" : "ADMIN"}
          onSwitch={(mode) => setOptimisticTab(mode === "PERSONAL" ? "coach" : "admin")}
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
