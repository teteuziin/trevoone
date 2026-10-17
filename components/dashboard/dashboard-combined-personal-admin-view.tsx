"use client";

import React, { useState } from "react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  DashboardPersonalView,
  type PersonalWorkoutSummaryItem,
  type StudentWithoutWorkoutItem,
  type PersonalTodayConsultationItem,
} from "./dashboard-personal-view";
import { DashboardAdminView } from "./dashboard-admin-view";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

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
}: DashboardCombinedPersonalAdminViewProps) {
  const [activeTab, setActiveTab] = useState<"coach" | "admin">("coach");

  const tabs: TabItem<"coach" | "admin">[] = [
    {
      id: "coach",
      label: "Treinador",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "admin",
      label: "Administração",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-in fade-in duration-150">
      {/* 1. Cabeçalho compacto da consultoria (Mobile) */}
      {consultancyName && (
        <div className="block md:hidden px-1 flex items-center justify-between text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium font-sans">
          <span className="truncate max-w-[200px]">{consultancyName}</span>
        </div>
      )}

      {/* 2. Alternância Treinador / Administração */}
      <div className="flex items-center justify-between pb-1 border-b border-[#C5CBD3] dark:border-[#303238]">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          variant="dark"
          size="md"
        />
        <span className="text-xs text-[#4B5563] dark:text-[#C2C8CF] hidden sm:inline font-medium">
          {activeTab === "coach" ? "Prescrição de Treinos" : "Operação & Finanças"}
        </span>
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
