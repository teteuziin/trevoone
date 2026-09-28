"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { MemberPayoutProfile, CommissionStatus } from "@/lib/referrals/service";

export interface InfluencerPlanSummary {
  title: string;
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

interface DashboardInfluencerViewProps {
  consultancySlug: string;
  userName?: string | null;
  isStudent?: boolean;
  todayCheckin?: DailyCheckinRecord | null;
  missions: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
  activeTrainingPlan?: InfluencerPlanSummary | null;
  activeNutritionPlan?: InfluencerPlanSummary | null;
}

const MISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REVISION_REQUESTED: "Revisão",
  CANCELED: "Cancelada",
};

const MISSION_STATUS_VARIANTS: Record<string, "brand" | "warning" | "success" | "neutral" | "danger"> = {
  PENDING: "brand",
  IN_PROGRESS: "warning",
  SUBMITTED: "brand",
  APPROVED: "success",
  REVISION_REQUESTED: "danger",
  CANCELED: "neutral",
};

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  PAID: "Paga",
  CANCELED: "Cancelada",
};

const COMMISSION_STATUS_VARIANTS: Record<string, "warning" | "success" | "brand" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "brand",
  PAID: "success",
  CANCELED: "neutral",
};

// ============================================================================
// SVG ICONS & PATTERNS
// ============================================================================

function TrevoPatternBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="trevo-pattern-vip" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M24 16 C22 12, 16 12, 16 16 C16 20, 20 22, 24 24 C20 26, 16 28, 16 32 C16 36, 22 36, 24 32 C26 36, 32 36, 32 32 C32 28, 28 26, 24 24 C28 22, 32 20, 32 16 C32 12, 26 12, 24 16 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#trevo-pattern-vip)" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShareIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function UsersGroupIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

function DollarWalletIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="16" cy="15" r="1.5" />
    </svg>
  );
}

function TrendingUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function PixKeyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 1-2.83 0l-.84-.84a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 0 0-2.83l-1-1" />
      <path d="m3 3 1 1a2 2 0 0 0 2.83 0l2.5-2.5a2 2 0 0 1 2.83 0l.84.84a2 2 0 0 1 0 2.83l-2.5 2.5a2 2 0 0 0 0 2.83l1 1" />
    </svg>
  );
}

function AppleNutritionIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
      <path d="M12 2c2.5 2.5 3 6 1 8.5" />
      <path d="M18 11c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
      <path d="M12 2v4" />
    </svg>
  );
}

function ChartLineIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function StarEmblemIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function maskPixKey(key?: string | null): string {
  if (!key) return "Não cadastrada";
  const trimmed = key.trim();
  if (trimmed.length <= 6) return "***";
  return trimmed.slice(0, 3) + "••••" + trimmed.slice(-3);
}

function getFirstName(fullName?: string | null): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

export function DashboardInfluencerView({
  consultancySlug,
  userName,
  isStudent = false,
  todayCheckin,
  missions = [],
  totalMissions,
  referrerData,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  const [copied, setCopied] = useState(false);
  const firstName = getFirstName(userName);

  const referralCode = referrerData?.code || "";
  const referralUrl = referrerData?.referralUrl || "";

  const registrationsCount = referrerData?.registrationsCount || 0;
  const conversionsCount = referrerData?.conversionsCount || 0;
  const pendingAmount = referrerData?.pendingAmount || 0;
  const approvedAmount = referrerData?.approvedAmount || 0;
  const paidAmount = referrerData?.paidAmount || 0;

  const pendingMissionsCount = missions.filter(
    (m) => m.status === "PENDING" || m.status === "IN_PROGRESS"
  ).length;

  const conversionRate =
    registrationsCount > 0
      ? Math.round((conversionsCount / registrationsCount) * 100)
      : 0;

  const recentMissions = missions.slice(0, 3);
  const recentCommissions = (referrerData?.commissions || []).slice(0, 3);

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

  async function handleShare(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trevo One - Acesso Exclusivo",
          text: `Acesse a consultoria com meu link exclusivo: ${referralCode}`,
          url: referralUrl,
        });
      } catch {
        // Ignored fallback
      }
    } else {
      handleCopyLink();
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* 1. HERO VIP (2 COLUNAS DESKTOP / COMPACTO MOBILE)                    */}
      {/* ==================================================================== */}
      <section
        aria-label="Painel VIP Hero"
        className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] p-5 sm:p-7 lg:p-8 shadow-sm transition-all"
      >
        <div className="absolute inset-0 pointer-events-none opacity-5 text-emerald-500">
          <TrevoPatternBackground />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Lado Esquerdo: Texto & Boas-Vindas */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3.5 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <StarEmblemIcon className="w-3.5 h-3.5" />
                <span>PARCERIA VIP</span>
              </span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                Embaixador Oficial
              </span>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text-primary)] font-heading tracking-tight">
                {firstName ? `Olá, ${firstName}` : "Painel do Embaixador VIP"}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                Monitore suas missões ativas, acompanhe novas indicações e gerencie suas comissões em tempo real.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                className="font-bold flex items-center gap-2 min-h-[42px] px-4"
              >
                {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                <span>{copied ? "Link Copiado!" : "Copiar meu link VIP"}</span>
              </Button>

              <Link href={`/consultoria/${consultancySlug}/missoes`}>
                <Button variant="secondary" size="sm" className="font-semibold min-h-[42px] px-4">
                  Ver missões
                </Button>
              </Link>
            </div>
          </div>

          {/* Lado Direito: Composição Visual VIP */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-[var(--surface-subtle)] to-[var(--surface)] p-4 sm:p-5 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                    VIP
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Link de Parceria
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1 font-semibold p-1"
                  title="Compartilhar"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </button>
              </div>

              <div className="pt-3 space-y-2">
                <span className="text-[11px] font-medium text-[var(--text-tertiary)] block">
                  Seu código exclusivo:
                </span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)]">
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[var(--brand)] tracking-wider truncate">
                    {referralCode || "NÃO CONFIGURADO"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    title="Copiar código"
                  >
                    {copied ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                  <span>✓</span> Comissões automáticas para cada matrícula confirmada
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. KPIs (4 CARDS: 1 LINHA NO DESKTOP, 2X2 MOBILE/TABLET)             */}
      {/* ==================================================================== */}
      <section aria-label="Indicadores principais" className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* KPI 1: Missões */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Missões
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] text-[var(--brand)] flex items-center justify-center">
                <TargetIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {pendingMissionsCount}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                {totalMissions || missions.length} cadastradas
              </p>
            </div>
          </Link>

          {/* KPI 2: Indicações */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Indicações
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] text-sky-500 flex items-center justify-center">
                <UsersGroupIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {registrationsCount}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Cadastros iniciados
              </p>
            </div>
          </Link>

          {/* KPI 3: Conversões */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Conversões
              </span>
              <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] text-emerald-500 flex items-center justify-center">
                <UserCheckIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {conversionsCount}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                {conversionRate}% de conversão
              </p>
            </div>
          </Link>

          {/* KPI 4: Comissão */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Comissão
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <DollarWalletIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-bold text-emerald-500 font-heading tabular-nums">
                R$ {approvedAmount.toFixed(0)}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Aprovada para saque
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. GRID PRINCIPAL (2 COLUNAS DESKTOP / EMPILHADO MOBILE)             */}
      {/* Col 1: Link de Indicação + Desempenho                                */}
      {/* Col 2: Financeiro Unificado + Check-in Compacto (se STUDENT)         */}
      {/* ==================================================================== */}
      <section aria-label="Grid Principal" className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
        {/* COLUNA 1: LINK + DESEMPENHO */}
        <div className="space-y-5">
          {/* Card Meu link de indicação */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)] font-heading uppercase tracking-wider">
                Meu Link de Indicação
              </h2>
              <span className="text-[11px] font-semibold text-[var(--brand)]">
                Oficial
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Compartilhe seu link exclusivo com alunos e seguidores. Cada inscrição via seu link vincula automaticamente o aluno a você.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                <input
                  type="text"
                  readOnly
                  value={referralUrl || "Link em geração..."}
                  className="bg-transparent text-xs text-[var(--text-primary)] font-mono flex-1 outline-none px-1 truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer shrink-0"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] px-1">
                <span>Código: <strong className="font-mono text-[var(--text-secondary)]">{referralCode || "—"}</strong></span>
                <button
                  type="button"
                  onClick={handleShare}
                  className="hover:text-[var(--text-primary)] hover:underline cursor-pointer"
                >
                  Compartilhar direto
                </button>
              </div>
            </div>
          </div>

          {/* Card Meu desempenho */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4 text-[var(--brand)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)] font-heading uppercase tracking-wider">
                  Meu Desempenho
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-500 tabular-nums">
                {conversionRate}% conversão
              </span>
            </div>

            {/* Metricas compactas */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Cadastros</span>
                <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading tabular-nums">{registrationsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Conversões</span>
                <span className="text-base sm:text-lg font-bold text-emerald-500 font-heading tabular-nums">{conversionsCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Taxa</span>
                <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading tabular-nums">{conversionRate}%</span>
              </div>
            </div>

            {/* Visual progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, conversionRate))}%` }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                {conversionsCount > 0
                  ? `${conversionsCount} de ${registrationsCount} pessoas que clicaram no seu link já são alunas ativas.`
                  : "Divulgue seu link para começar a gerar suas primeiras conversões."}
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA 2: FINANCEIRO UNIFICADO + CHECK-IN */}
        <div className="space-y-5">
          {/* Card Financeiro + PIX (Unificado) */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <DollarWalletIcon className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-[var(--text-primary)] font-heading uppercase tracking-wider">
                  Financeiro &amp; PIX
                </h2>
              </div>
              <Link
                href={`/consultoria/${consultancySlug}/indicacoes`}
                className="text-xs font-semibold text-[var(--brand)] hover:underline flex items-center gap-0.5"
              >
                <span>Ver histórico</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3 Saldos Financeiros */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500 uppercase font-bold block">Aprovado</span>
                <span className="text-base sm:text-lg font-bold text-emerald-500 font-heading tabular-nums">
                  R$ {approvedAmount.toFixed(0)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Pendente</span>
                <span className="text-base sm:text-lg font-bold text-[var(--text-secondary)] font-heading tabular-nums">
                  R$ {pendingAmount.toFixed(0)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Total Pago</span>
                <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading tabular-nums">
                  R$ {paidAmount.toFixed(0)}
                </span>
              </div>
            </div>

            {/* PIX Mascarado & Gerenciamento */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--surface)] text-[var(--brand)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                  <PixKeyIcon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Chave PIX</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate block">
                    {maskPixKey(referrerData?.pixProfile?.pixKey)}
                  </span>
                </div>
              </div>

              <Link href={`/consultoria/${consultancySlug}/indicacoes`}>
                <Button variant="secondary" size="sm" className="text-xs font-semibold px-3 py-1.5 min-h-[36px]">
                  Gerenciar PIX
                </Button>
              </Link>
            </div>
          </div>

          {/* Check-in Diário Compacto (Se também for Aluno) */}
          {isStudent && (
            <div className="space-y-2">
              <DailyCheckinWidget
                consultancySlug={consultancySlug}
                todayCheckin={todayCheckin || null}
              />
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. MISSÕES RECENTES + INDICAÇÕES RECENTES (2 COLUNAS DESKTOP)        */}
      {/* ==================================================================== */}
      <section aria-label="Atividades Recentes" className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Missões Recentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
              Missões Recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/missoes`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMissions.length > 0 ? (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
              {recentMissions.map((mission) => (
                <div key={mission.publicId} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                      {mission.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-500">
                        Prazo: {mission.formattedDueAt || "Em aberto"}
                      </span>
                      {mission.isLate && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          Atrasada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge variant={MISSION_STATUS_VARIANTS[mission.status] || "neutral"} size="sm">
                      {MISSION_STATUS_LABELS[mission.status] || mission.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2 shadow-xs">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Nenhuma missão pendente
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Novas missões aparecerão aqui conforme as campanhas forem lançadas.
              </p>
              <Link href={`/consultoria/${consultancySlug}/missoes`}>
                <Button variant="secondary" size="sm" className="text-xs font-semibold mt-1">
                  Ver histórico
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Indicações Recentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
              Indicações Recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/indicacoes`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCommissions.length > 0 ? (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
              {recentCommissions.map((comm) => (
                <div key={comm.publicId} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        R$ {comm.amount.toFixed(2)}
                      </span>
                      <Badge variant={COMMISSION_STATUS_VARIANTS[comm.status] || "neutral"} size="sm">
                        {COMMISSION_STATUS_LABELS[comm.status] || comm.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Registrada em {new Date(comm.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    #{comm.publicId.slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2 shadow-xs">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Nenhuma indicação registrada
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Compartilhe seu link exclusivo para gerar conversões automáticas.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs font-semibold mt-1"
              >
                {copied ? "Link Copiado!" : "Copiar meu link"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. ACOMPANHAMENTO PESSOAL (SOMENTE SE TAMBÉM FOR ALUNO)               */}
      {/* Requirement 4: 3 compact horizontal cards, NO duplicated homepage!   */}
      {/* ==================================================================== */}
      {isStudent && (
        <section aria-label="Acompanhamento Pessoal do Aluno" className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
          <div className="px-1 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
                Seu Acompanhamento
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Acesse suas prescrições ativas e histórico biométrico.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--brand-soft)]">
              Aluno + VIP
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Treinos */}
            <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                  <DumbbellIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                    Treinos
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {activeTrainingPlan?.title || "Aguardando treino"}
                  </p>
                </div>
              </div>

              <Link href={`/consultoria/${consultancySlug}/treinos`} className="w-full">
                <Button variant="secondary" size="sm" fullWidth className="text-xs font-semibold min-h-[36px]">
                  Abrir treinos →
                </Button>
              </Link>
            </div>

            {/* Nutrição */}
            <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <AppleNutritionIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                    Nutrição
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {activeNutritionPlan?.title || "Aguardando plano"}
                  </p>
                </div>
              </div>

              <Link href={`/consultoria/${consultancySlug}/nutricao`} className="w-full">
                <Button variant="secondary" size="sm" fullWidth className="text-xs font-semibold min-h-[36px]">
                  Abrir nutrição →
                </Button>
              </Link>
            </div>

            {/* Evolução */}
            <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <ChartLineIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                    Evolução
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Medidas e peso
                  </p>
                </div>
              </div>

              <Link href={`/consultoria/${consultancySlug}/progresso`} className="w-full">
                <Button variant="secondary" size="sm" fullWidth className="text-xs font-semibold min-h-[36px]">
                  Abrir evolução →
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
