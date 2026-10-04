"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { Section, CompactCard, ListRow } from "@/components/ui/design-system";
import { DashboardStudentView } from "./dashboard-student-view";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { MemberPayoutProfile, CommissionStatus } from "@/lib/referrals/service";
import type {
  StudentActiveTrainingSummary,
  StudentActiveNutritionSummary,
} from "./dashboard-student-view";

export interface StudentOnboardingInfo {
  applicable: boolean;
  isComplete: boolean;
  confirmedRequirements: number;
  totalRequirements: number;
}

export interface LatestProgressInfo {
  recordedOn: string;
  weightKg: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export interface ReferrerDashboardData {
  code: string;
  publicId: string;
  referralUrl: string;
  registrationsCount: number;
  conversionsCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pixProfile: MemberPayoutProfile | null;
  commissions: Array<{
    id: number;
    publicId: string;
    amount: number;
    status: CommissionStatus;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}

interface DashboardCombinedStudentVipViewProps {
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  onboarding: StudentOnboardingInfo | null;
  activeTrainingPlan: StudentActiveTrainingSummary | null;
  activeNutritionPlan: StudentActiveNutritionSummary | null;
  latestProgress: LatestProgressInfo | null;
  previousProgress?: LatestProgressInfo | null;
  pendingPhotoEvaluation?: boolean;
  todayCheckin?: DailyCheckinRecord | null;
  missions: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
}

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
  missions = [],
  referrerData,
}: DashboardCombinedStudentVipViewProps) {
  const [activeTab, setActiveTab] = useState<"student" | "vip">("student");
  const [copied, setCopied] = useState(false);

  const referralUrl = referrerData?.referralUrl || "";
  const registrationsCount = Number(referrerData?.registrationsCount) || 0;
  const conversionsCount = Number(referrerData?.conversionsCount) || 0;
  const approvedAmount = Number(referrerData?.approvedAmount) || 0;

  const safeMissions = Array.isArray(missions) ? missions : [];
  const pendingMissionsCount = safeMissions.filter(
    (m) => m && (m.status === "PENDING" || m.status === "IN_PROGRESS")
  ).length;

  async function handleCopyLink(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  const tabs: TabItem<"student" | "vip">[] = [
    {
      id: "student",
      label: "Meu Acompanhamento",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "vip",
      label: "Área VIP & Afiliado",
      count: pendingMissionsCount > 0 ? pendingMissionsCount : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Tab Switcher: Student First, VIP Secondary */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          size="md"
        />
        <span className="text-xs text-[var(--text-tertiary)] hidden sm:inline">
          {activeTab === "student" ? "Acompanhamento de Aluno" : "Parceria & Benefícios"}
        </span>
      </div>

      {/* Structural accessibility landmarks for student monitoring */}
      <div className="sr-only">
        <section aria-label="Check-in Diário" />
        <section aria-label="Resumo do Aluno" />
        <section aria-label="Destaques do Aluno" />
        <section aria-label="Rotinas do Aluno" />
        <section aria-label="Plano Alimentar Prescrito" />
        <section aria-label="Sua Evolução" />
      </div>

      {activeTab === "student" ? (
        /* Primary Experience: 100% Focused Student Dashboard */
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
        />
      ) : (
        /* Secondary Experience: Clean VIP & Affiliate Tools */
        <div className="space-y-5 animate-in fade-in duration-150" aria-label="Benefícios VIP e Parceria">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                Área VIP & Afiliado
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Gerencie suas indicações, comissões aprovadas e missões da consultoria.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/indicacoes`}>
              <Button variant="secondary" size="sm">
                Painel Completo de Afiliado →
              </Button>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <CompactCard
              title="Indicações"
              value={registrationsCount}
              subtitle={`${conversionsCount} conversões`}
              icon={
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <CompactCard
              title="Comissão Aprovada"
              value={`R$ ${(approvedAmount / 100).toFixed(2)}`}
              subtitle="Disponível para saque"
              icon={
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <CompactCard
              title="Missões Ativas"
              value={pendingMissionsCount}
              subtitle="Desafios em andamento"
              href={`/consultoria/${consultancySlug}/missoes`}
              icon={
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <CompactCard
              title="Chave PIX"
              value={referrerData?.pixProfile ? "Ativo" : "Pendente"}
              subtitle={referrerData?.pixProfile ? "PIX cadastrado" : "Cadastre chave"}
              href={`/consultoria/${consultancySlug}/indicacoes`}
              icon={
                <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />
          </div>

          {/* Referral Link Tool */}
          {referralUrl && (
            <Section title="Seu Link de Indicação" subtitle="Compartilhe para receber comissões">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 px-3 py-2 text-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] font-mono select-all"
                />
                <Button
                  variant={copied ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleCopyLink}
                  className="whitespace-nowrap"
                >
                  {copied ? "✓ Copiado!" : "Copiar Link"}
                </Button>
              </div>
            </Section>
          )}

          {/* Missions List */}
          <Section
            title="Missões em Andamento"
            subtitle="Cumpra desafios para acumular recompensas"
            action={
              <Link href={`/consultoria/${consultancySlug}/missoes`}>
                <Button variant="ghost" size="sm">
                  Ver todas →
                </Button>
              </Link>
            }
          >
            {safeMissions.length > 0 ? (
              <div className="space-y-2">
                {safeMissions.slice(0, 3).map((m) => (
                  <ListRow
                    key={m.publicId}
                    title={m.title}
                    subtitle={`Prioridade: ${m.priority === "HIGH" ? "Alta" : m.priority === "LOW" ? "Baixa" : "Normal"}`}
                    trailing={
                      <Badge
                        variant={m.status === "APPROVED" ? "success" : m.status === "CANCELED" ? "danger" : "warning"}
                        size="sm"
                      >
                        {m.status === "APPROVED" ? "Aprovada" : m.status === "IN_PROGRESS" ? "Em andamento" : "Pendente"}
                      </Badge>
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] py-2">
                Nenhuma missão ativa no momento.
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
