"use client";

import React, { useState } from "react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { DashboardPersonalView, type PersonalWorkoutSummaryItem } from "./dashboard-personal-view";
import { DashboardAdminView } from "./dashboard-admin-view";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

interface DashboardCombinedPersonalAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  recentPlans: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
}

export function DashboardCombinedPersonalAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
  recentPlans,
  totalPlans = 0,
}: DashboardCombinedPersonalAdminViewProps) {
  const [activeTab, setActiveTab] = useState<"coach" | "admin">("coach");

  const tabs: TabItem<"coach" | "admin">[] = [
    {
      id: "coach",
      label: "Área do Treinador",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
          {activeTab === "coach" ? "Prescrição de Treinos" : "Operação & Finanças"}
        </span>
      </div>

      {activeTab === "coach" ? (
        <DashboardPersonalView
          consultancySlug={consultancySlug}
          recentPlans={recentPlans}
          totalPlans={totalPlans}
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
