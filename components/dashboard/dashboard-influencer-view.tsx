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
  REVISION_REQUESTED: "Revisão solicitada",
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
        <pattern id="trevo-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M24 16 C22 12, 16 12, 16 16 C16 20, 20 22, 24 24 C20 26, 16 28, 16 32 C16 36, 22 36, 24 32 C26 36, 32 36, 32 32 C32 28, 28 26, 24 24 C28 22, 32 20, 32 16 C32 12, 26 12, 24 16 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#trevo-grid)" />
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

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
      <path d="M7 11.5L12 16.5L17 11.5M12 7.5V16" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function SparklesVipIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function TrainingSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="infl-t-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="infl-t-brand" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
        <linearGradient id="infl-t-metal" x1="16" y1="20" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop stopColor="#64748b" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#infl-t-bg)" />
      <g transform="rotate(-30 24 24)">
        <rect x="14" y="22" width="20" height="4" rx="2" fill="url(#infl-t-metal)" />
        <rect x="10" y="16" width="4" height="16" rx="2" fill="url(#infl-t-brand)" />
        <rect x="34" y="16" width="4" height="16" rx="2" fill="url(#infl-t-brand)" />
      </g>
    </svg>
  );
}

function NutritionSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="infl-n-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="infl-n-plate" x1="12" y1="14" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
        <linearGradient id="infl-n-leaf" x1="18" y1="12" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#infl-n-bg)" />
      <circle cx="24" cy="25" r="14" fill="url(#infl-n-plate)" stroke="var(--border-default)" strokeWidth="1.5" />
      <circle cx="24" cy="25" r="9" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="1" />
      <path d="M24 19 C24 16 28 15 29.5 15 C29.5 16.5 28.5 19.5 26 19.5 C25 19.5 24 19.2 24 19 Z" fill="url(#infl-n-leaf)" />
    </svg>
  );
}

function ProgressSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="infl-p-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#infl-p-bg)" />
      <polyline points="14 30 20 22 28 26 34 16" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="16" r="3" fill="#3b82f6" />
    </svg>
  );
}

export function DashboardInfluencerView({
  consultancySlug,
  isStudent = false,
  todayCheckin,
  missions,
  totalMissions,
  referrerData,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const referralUrl = referrerData?.referralUrl || "";
  const fullReferralUrl = typeof window !== "undefined" && referralUrl
    ? `${window.location.origin}${referralUrl}`
    : referralUrl ? `https://trevoone.com${referralUrl}` : "";

  const handleCopyLink = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!fullReferralUrl) return;
    try {
      await navigator.clipboard.writeText(fullReferralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareLink = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!fullReferralUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "TREVO ONE",
          text: "Participe da TREVO ONE através do meu link exclusivo:",
          url: fullReferralUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyLink();
  };

  // Metrics (100% Real, zero fake estimates)
  const registrationsCount = referrerData?.registrationsCount ?? 0;
  const conversionsCount = referrerData?.conversionsCount ?? 0;
  const pendingAmount = referrerData?.pendingAmount ?? 0;
  const approvedAmount = referrerData?.approvedAmount ?? 0;
  const paidAmount = referrerData?.paidAmount ?? 0;
  const conversionRate = registrationsCount > 0
    ? ((conversionsCount / registrationsCount) * 100).toFixed(1)
    : "0";

  const pendingMissionsCount = totalMissions ?? missions.filter(
    (m) => m.status === "PENDING" || m.status === "IN_PROGRESS"
  ).length;

  const recentMissions = missions.slice(0, 3);
  const recentCommissions = referrerData?.commissions?.slice(0, 3) || [];
  const maskedPix = referrerData?.pixProfile?.pixKeyMasked || (referrerData?.pixProfile ? "***" : null);

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-clip text-[var(--text-primary)]">
      {/* ==================================================================== */}
      {/* 1. HERO PRINCIPAL: TREVO ONE VIP                                     */}
      {/* ==================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] p-6 sm:p-8 md:p-9 shadow-xs">
        {/* Subtle Clover Watermark Pattern */}
        <div className="absolute inset-0 pointer-events-none text-emerald-500/[0.04] dark:text-emerald-400/[0.025]">
          <TrevoPatternBackground className="w-full h-full" />
        </div>

        {/* Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs">
                TREVO ONE
              </span>
              <Badge variant="brand" size="sm" className="font-semibold text-xs">
                Painel VIP
              </Badge>
              <span className="text-xs font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                <SparklesVipIcon className="w-3.5 h-3.5 text-amber-500" />
                Central de Parceria
              </span>
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Transforme sua audiência em resultados reais
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Participe das nossas missões, indique novos alunos e receba comissões. Você cresce, sua audiência evolui e a Trevo One cresce junto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link
              href={`/consultoria/${consultancySlug}/missoes`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto font-bold min-h-[46px] px-6 shadow-sm text-xs sm:text-sm"
              >
                Ver missões disponíveis <ChevronRightIcon className="w-4 h-4 ml-1 inline-block" />
              </Button>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/indicacoes`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto font-semibold min-h-[46px] px-5 text-xs sm:text-sm"
              >
                Minhas Indicações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. 4 KPIS PRINCIPAIS (Cards Horizontais)                              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
        {/* KPI 1: MISSÕES ATIVAS */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-2 min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">
            <span>Missões Ativas</span>
            <TargetIcon className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {pendingMissionsCount}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">Em aberto / atribuídas</p>
          </div>
        </div>

        {/* KPI 2: INDICAÇÕES */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-2 min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">
            <span>Indicações</span>
            <UsersGroupIcon className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {registrationsCount}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">Cadastros vinculados</p>
          </div>
        </div>

        {/* KPI 3: CADASTROS CONFIRMADOS */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-2 min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">
            <span>Cadastros Confirmados</span>
            <UserCheckIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {conversionsCount}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">Alunos convertidos</p>
          </div>
        </div>

        {/* KPI 4: COMISSÃO */}
        <div className="p-4.5 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-2 min-h-[110px] sm:min-h-[118px]">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">
            <span>Comissão Aprovada</span>
            <DollarWalletIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              R$ {approvedAmount.toFixed(2)}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium">
              R$ {pendingAmount.toFixed(2)} pendentes
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. OPERATIONAL GRID: LINK | COMISSÕES & PIX | DESEMPENHO            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* CARD 1: MEU LINK DE INDICAÇÃO */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Divulgação VIP
              </span>
              <Badge variant="brand" size="sm">Link Ativo</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Meu link de indicação
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Compartilhe seu link exclusivo e acompanhe suas indicações.
              </p>
            </div>

            {/* Link Preview Box */}
            <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 overflow-hidden">
              <span className="text-xs font-mono text-[var(--text-primary)] truncate">
                {fullReferralUrl || (referrerData?.code ? `/r/${referrerData.code}` : "Link disponível após registro")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => handleCopyLink(e)}
              className="flex-1 font-bold min-h-[42px] text-xs"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-1.5 text-white" />
                  Copiado!
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4 mr-1.5" />
                  Copiar Link
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => handleShareLink(e)}
              className="font-semibold min-h-[42px] px-3.5 text-xs"
              title="Compartilhar link"
            >
              {shared ? (
                <CheckIcon className="w-4 h-4 text-emerald-500" />
              ) : (
                <ShareIcon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* CARD 2: COMISSÕES E PAGAMENTOS & PIX */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Financeiro
              </span>
              <Link
                href={`/consultoria/${consultancySlug}/indicacoes`}
                className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
              >
                <span>Ver histórico</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Comissões e pagamentos
              </h3>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-xs text-[var(--text-secondary)]">Saldo aprovado:</span>
                <span className="font-heading text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  R$ {approvedAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Pendente:</span>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  R$ {pendingAmount.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Pago:</span>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  R$ {paidAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* PIX Mascarado */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <PixKeyIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">PIX cadastrado</span>
              </div>
              <p className="text-xs font-mono text-[var(--text-secondary)] truncate">
                {maskedPix || "Nenhuma chave cadastrada"}
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/indicacoes`}>
              <Button variant="ghost" size="sm" className="text-xs font-bold text-[var(--brand)] shrink-0 min-h-[36px]">
                {referrerData?.pixProfile ? "Alterar" : "Cadastrar"}
              </Button>
            </Link>
          </div>
        </div>

        {/* CARD 3: MEU DESEMPENHO */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Desempenho Real
              </span>
              <TrendingUpIcon className="w-4 h-4 text-[var(--brand)]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Meu desempenho
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Métricas calculadas sobre suas indicações diretas.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Taxa de Conversão:</span>
                <span className="font-bold text-[var(--text-primary)]">{conversionRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className="h-full bg-[var(--brand)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Number(conversionRate), 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Cadastros:</span>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{registrationsCount}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Convertidos:</span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{conversionsCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)]">
            Atualizado em tempo real conforme adesão dos indicados.
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. CONTENT GRID: MISSÕES & ATIVIDADES | INDICAÇÕES RECENTES          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* SEÇÃO: MISSÕES & ATIVIDADES */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Missões & Atividades
              </h2>
              {missions && missions.length > 0 && (
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  ({missions.length})
                </span>
              )}
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/missoes`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
            >
              <span>Ver todas</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMissions.length > 0 ? (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
              {recentMissions.map((mission) => (
                <Link
                  key={mission.publicId}
                  href={`/consultoria/${consultancySlug}/missoes`}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                        {mission.title}
                      </span>
                      <Badge
                        variant={MISSION_STATUS_VARIANTS[mission.status] || "neutral"}
                        size="sm"
                      >
                        {MISSION_STATUS_LABELS[mission.status] || mission.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Prazo de entrega: {mission.formattedDueAt}
                    </p>
                  </div>

                  <div className="shrink-0 text-xs font-bold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                    <span>Ver missão</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--brand)]">
                <TargetIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                  Nenhuma missão pendente
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Novas missões aparecerão aqui quando forem atribuídas pela consultoria.
                </p>
              </div>
              <Link href={`/consultoria/${consultancySlug}/missoes`}>
                <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                  Acessar histórico de missões
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* SEÇÃO: INDICAÇÕES RECENTES */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Indicações Recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/indicacoes`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
            >
              <span>Ver todas</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentCommissions.length > 0 ? (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
              {recentCommissions.map((comm) => (
                <div
                  key={comm.publicId}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        R$ {comm.amount.toFixed(2)}
                      </span>
                      <Badge
                        variant={COMMISSION_STATUS_VARIANTS[comm.status] || "neutral"}
                        size="sm"
                      >
                        {COMMISSION_STATUS_LABELS[comm.status] || comm.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Registrada em {new Date(comm.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] font-mono">
                    #{comm.publicId.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--brand)]">
                <UsersGroupIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                  Você ainda não possui indicações
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Compartilhe seu link exclusivo com amigos e seguidores para gerar conversões automáticas.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleCopyLink(e)}
                className="font-semibold min-h-[44px]"
              >
                {copied ? "Link Copiado!" : "Copiar meu link"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. CHECK-IN DIÁRIO (Exclusivo para membros com papel STUDENT)        */}
      {/* ==================================================================== */}
      {isStudent && (
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3.5">
          <div className="px-1">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Check-in de Hoje
            </h2>
          </div>

          <DailyCheckinWidget
            consultancySlug={consultancySlug}
            todayCheckin={todayCheckin || null}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. SEU ACOMPANHAMENTO PESSOAL (Exclusivo para membros com STUDENT)   */}
      {/* ==================================================================== */}
      {isStudent && (
        <div className="space-y-3.5">
          <div className="px-1 space-y-0.5">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Seu Acompanhamento Pessoal
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Acesse suas prescrições ativas e histórico biométrico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Treinos */}
            <Link
              href={`/consultoria/${consultancySlug}/treinos`}
              className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
            >
              <div className="shrink-0">
                <TrainingSupportVolumetricIcon className="w-10 h-10" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Treinos
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  {activeTrainingPlan ? activeTrainingPlan.title : "Rotinas prescritas"}
                </p>
              </div>
            </Link>

            {/* Nutrição */}
            <Link
              href={`/consultoria/${consultancySlug}/nutricao`}
              className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
            >
              <div className="shrink-0">
                <NutritionSupportVolumetricIcon className="w-10 h-10" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Nutrição
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  {activeNutritionPlan ? activeNutritionPlan.title : "Plano alimentar"}
                </p>
              </div>
            </Link>

            {/* Evolução */}
            <Link
              href={`/consultoria/${consultancySlug}/progresso`}
              className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
            >
              <div className="shrink-0">
                <ProgressSupportVolumetricIcon className="w-10 h-10" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Evolução
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  Medidas e histórico
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
