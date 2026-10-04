"use client";

import React, { useState } from "react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DashboardNutritionistView, type NutritionistPlanSummaryItem } from "./dashboard-nutritionist-view";
import { DashboardAdminView } from "./dashboard-admin-view";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

interface DashboardCombinedNutritionistAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  recentPlans: NutritionistPlanSummaryItem[];
  totalPlans?: number;
}

export function DashboardCombinedNutritionistAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
  recentPlans,
  totalPlans = 0,
}: DashboardCombinedNutritionistAdminViewProps) {
  const [activeTab, setActiveTab] = useState<"nutri" | "admin">("nutri");

  const tabs: TabItem<"nutri" | "admin">[] = [
    {
      id: "nutri",
      label: "Área de Nutrição",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2c2.5 2.5 3 6 1 8.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 11c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
        </svg>
      ),
    },
    {
      id: "admin",
      label: "Gestão Administrativa",
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
      {/* Role Switcher */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          size="md"
        />
        <span className="text-xs text-[var(--text-tertiary)] hidden sm:inline">
          {activeTab === "nutri" ? "Prescrição Nutricional" : "Operação & Finanças"}
        </span>
      </div>

      {activeTab === "nutri" ? (
        <DashboardNutritionistView
          consultancySlug={consultancySlug}
          recentPlans={recentPlans}
          totalPlans={totalPlans}
          totalStudents={overview?.students}
        />
      ) : (
        <DashboardAdminView
          consultancySlug={consultancySlug}
          consultancyName={consultancyName}
          consultancyLogoUrl={consultancyLogoUrl}
          overview={overview}
          platformAccess={platformAccess}
        />
      )}
    </div>
  );
}
