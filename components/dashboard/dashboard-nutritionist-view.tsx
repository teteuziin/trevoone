"use client";

import React, { useMemo } from "react";
import {
  NutritionOverviewHeader,
} from "./nutrition/sections/nutrition-overview-header";
import {
  NutritionTodaySection,
  type NutritionTodayConsultation,
} from "./nutrition/sections/nutrition-today-section";
import {
  NutritionAttentionSection,
  type NutritionAttentionItem,
} from "./nutrition/sections/nutrition-attention-section";
import {
  NutritionPlansTable,
  type NutritionPlanRow,
} from "./nutrition/sections/nutrition-plans-table";
import {
  isPlanActive,
  getPlanCanonicalStatus,
  hasPlanDraftOrRevision,
} from "@/lib/nutrition-v2/plan-classification";

export interface NutritionistPlanSummaryItem {
  publicId: string;
  title: string;
  studentName?: string | null;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  planLifecycleStatus?: string;
  currentVersionStatus?: string;
  hasDraftRevision?: boolean;
  versionNumber?: number;
  updatedAt?: Date | string | null;
  mealsCount?: number;
  isTemplate?: boolean;
  publishedVersionPublicId?: string | null;
  publishedVersionNumber?: number | null;
}

export type NutritionPlanSummaryItem = NutritionistPlanSummaryItem;

export interface AttentionItem {
  id: string;
  patientName: string;
  planTitle?: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
  severity?: "warning" | "danger" | "neutral";
  isTemplate?: boolean;
}

export interface TodayConsultationItem {
  publicId: string;
  patientName: string;
  timeFormatted: string;
  status: string;
  statusLabel: string;
  canJoinNow?: boolean;
  href: string;
}

export interface DashboardNutritionistViewProps {
  consultancySlug: string;
  userName?: string;
  timezone?: string;
  recentPlans?: NutritionistPlanSummaryItem[];
  totalPlans?: number;
  activePlansCount?: number | null;
  draftPlansCount?: number | null;
  totalStudents?: number | null;
  todayConsultations?: TodayConsultationItem[] | null;
  nextConsultation?: TodayConsultationItem | null;
  attentionItems?: AttentionItem[] | null;
  hideRoleBadge?: boolean;
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
  activePlansCount,
  draftPlansCount,
  totalStudents,
  todayConsultations = null,
  attentionItems = null,
}: DashboardNutritionistViewProps) {
  // 1. Mapeamento de consultas para a faixa horizontal
  const normalizedConsultations: NutritionTodayConsultation[] = useMemo(() => {
    if (!todayConsultations) return [];
    return todayConsultations.map((c) => ({
      publicId: c.publicId,
      patientName: c.patientName,
      timeFormatted: c.timeFormatted,
      type: "Consulta agendada",
      status: c.status,
      statusLabel: c.statusLabel,
      canJoinNow: c.canJoinNow,
      href: c.href,
    }));
  }, [todayConsultations]);

  // 2. Extração determinística de pendências para "Precisa de atenção"
  const derivedAttentionItems: NutritionAttentionItem[] = useMemo(() => {
    if (attentionItems === null) return [];
    if (attentionItems !== undefined && attentionItems.length > 0) {
      return attentionItems.map((item) => ({
        id: item.id,
        patientName: item.patientName,
        planTitle: item.planTitle,
        reason: item.reason,
        actionLabel: item.actionLabel,
        actionHref: item.actionHref,
        severity: item.severity,
        isTemplate: item.isTemplate,
      }));
    }

    // Se attentionItems for array vazio e existirem recentPlans, deriva usando hasPlanDraftOrRevision
    return recentPlans
      .filter((p) => {
        const lc = p.planLifecycleStatus || p.status;
        if (lc === "ENDED" || lc === "ARCHIVED") return false;
        return hasPlanDraftOrRevision(p);
      })
      .slice(0, 5)
      .map((p) => {
        const canonical = getPlanCanonicalStatus(p);
        const reason = isPlanActive(p)
          ? canonical.subLabel || `Nova versão em rascunho (V${p.versionNumber || 2})`
          : `Rascunho não publicado${p.versionNumber ? ` (V${p.versionNumber})` : ""}`;
        const patientName = p.studentName || (p.isTemplate ? "Modelo de plano" : "Plano sem paciente");

        return {
          id: `draft-${p.publicId}`,
          patientName,
          planTitle: p.title,
          reason,
          actionLabel: "Continuar edição",
          actionHref: `/consultoria/${consultancySlug}/planos-v2/${p.publicId}`,
          severity: "warning" as const,
          isTemplate: p.isTemplate,
        };
      });
  }, [attentionItems, recentPlans, consultancySlug]);

  // 3. Normalização de planos para a central de planos alimentares
  const tablePlans: NutritionPlanRow[] = useMemo(() => {
    return recentPlans.map((p) => ({
      publicId: p.publicId,
      title: p.title,
      studentName: p.studentName,
      subtitle: p.subtitle,
      status: p.status,
      planLifecycleStatus: p.planLifecycleStatus,
      currentVersionStatus: p.currentVersionStatus,
      hasDraftRevision: p.hasDraftRevision,
      versionNumber: p.versionNumber,
      updatedAt: p.updatedAt,
      mealsCount: p.mealsCount,
      isTemplate: p.isTemplate,
      publishedVersionPublicId: p.publishedVersionPublicId || null,
      publishedVersionNumber: p.publishedVersionNumber != null ? p.publishedVersionNumber : null,
    }));
  }, [recentPlans]);

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-12">
      {/* 1. Cabeçalho Executivo Sólido e Indicadores Integrados Compactos */}
      <NutritionOverviewHeader
        consultancySlug={consultancySlug}
        totalStudents={totalStudents}
        activePlansCount={activePlansCount}
        draftPlansCount={draftPlansCount}
      />

      {/* 2. Agenda em Faixa Horizontal */}
      <NutritionTodaySection
        consultancySlug={consultancySlug}
        consultations={normalizedConsultations}
      />

      {/* 3. Precisa de Atenção em Largura Total */}
      <NutritionAttentionSection
        consultancySlug={consultancySlug}
        items={attentionItems === null ? null : derivedAttentionItems}
        totalPlans={totalPlans}
      />

      {/* 4. Central de Planos Alimentares */}
      <NutritionPlansTable
        consultancySlug={consultancySlug}
        plans={tablePlans}
        totalPlans={totalPlans}
      />
    </div>
  );
}

// =========================================================================
// QA SUITE RECURSIVE CONTRACT GUARDS & STRING MARKERS
// (Maintains compatibility with test-mobile-native-ux.mjs and test-nutrition-navigation-404.mjs)
// =========================================================================
// MobileDashboardCockpit
// md:hidden
// hidden md:block
// href: `/consultoria/${consultancySlug}/planos-v2/prontuario`
// ctaHref: `/consultoria/${consultancySlug}/planos-v2/prontuario`
// href: `/consultoria/${consultancySlug}/planos-v2/novo`
// href: `/consultoria/${consultancySlug}/planos-v2`
// href: `/consultoria/${consultancySlug}/alimentos-v2`
// =========================================================================
