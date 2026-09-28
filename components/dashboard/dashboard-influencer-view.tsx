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
// ICONS (Precision stroke SVGs matching Trevo One Cockpit)
// ============================================================================

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

function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function LinkChainIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

function DollarWalletIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="16" cy="15" r="1.5" />
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

function ActivityHistoryIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

// Volumetric Icons for Support Modules
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
  userName,
  isStudent = false,
  todayCheckin,
  missions,
  totalMissions,
  referrerData,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  const [copied, setCopied] = useState(false);

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

  // Metrics
  const registrationsCount = referrerData?.registrationsCount ?? 0;
  const pendingAmount = referrerData?.pendingAmount ?? 0;
  const approvedAmount = referrerData?.approvedAmount ?? 0;
  const pendingMissionsCount = totalMissions ?? missions.filter(
    (m) => m.status === "PENDING" || m.status === "IN_PROGRESS"
  ).length;

  const recentMissions = missions.slice(0, 3);
  const recentCommissions = referrerData?.commissions?.slice(0, 3) || [];
  const firstName = userName ? userName.trim().split(" ")[0] : "";

  return (
    <div className="space-y-8 sm:space-y-10 overflow-x-clip">
      {/* ==================================================================== */}
      {/* 1. HERO PRINCIPAL: CENTRAL DE PARCERIA                               */}
      {/* ==================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" size="sm">
                PAINEL VIP
              </Badge>
              <span className="text-xs font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                <SparklesVipIcon className="w-3.5 h-3.5 text-amber-500" />
                Central de Parceria
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Transforme suas indicações em resultados
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {firstName ? `Olá, ${firstName}! ` : ""}Acompanhe suas missões, indicações, comissões e atividades dentro da TREVO ONE.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              href={`/consultoria/${consultancySlug}/missoes`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm"
              >
                Acessar missões →
              </Button>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/indicacoes`}
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto font-semibold min-h-[44px]"
              >
                Minhas Indicações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. RESUMO RÁPIDO (4 Métricas Principais)                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Indicações */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Indicações</span>
            <UsersGroupIcon className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {registrationsCount}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">Cadastros vinculados</p>
        </div>

        {/* Comissões Pendentes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Comissões Pendentes</span>
            <DollarWalletIcon className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            R$ {pendingAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">Aguardando aprovação</p>
        </div>

        {/* Comissões Aprovadas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Comissões Aprovadas</span>
            <DollarWalletIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            R$ {approvedAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">Prontas para saque/payout</p>
        </div>

        {/* Missões Ativas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium">
            <span>Missões Pendentes</span>
            <TargetIcon className="w-4 h-4 text-[var(--brand)]" />
          </div>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {pendingMissionsCount}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">Tarefas em aberto</p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. OPERAÇÃO RÁPIDA (Padrão Cockpit Personal)                         */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Operação Rápida
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Missões */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <TargetIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Missões
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  Acessar tarefas e diretrizes VIP
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Meu Link (com cópia rápida) */}
          <div
            onClick={(e) => handleCopyLink(e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleCopyLink(e); }}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {copied ? <CheckIcon className="w-5 h-5 text-emerald-500" /> : <LinkChainIcon className="w-5 h-5" />}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Meu Link
                  </p>
                  {copied && (
                    <Badge variant="success" size="sm">Copiado!</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  {copied ? "Link copiado para a área de transferência" : (referrerData?.code ? `Código: ${referrerData.code} (clique p/ copiar)` : "Copiar link de parceiro")}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] transition-all">
              {copied ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
            </div>
          </div>

          {/* Card 3: Indicações */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <UsersGroupIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Indicações
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  {registrationsCount} cadastros vinculados
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 4: Comissões */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <DollarWalletIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Comissões
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  Pendentes, aprovadas e pagas
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 5: Pagamento / PIX */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PixKeyIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Pagamento / PIX
                  </p>
                  {referrerData?.pixProfile && (
                    <Badge variant="success" size="sm">Ativo</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  {referrerData?.pixProfile
                    ? `Chave ${referrerData.pixProfile.pixKeyType} configurada`
                    : "Cadastrar chave para recebimento"}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 6: Histórico */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="group p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ActivityHistoryIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                  Histórico
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  Extrato de indicações e pagamentos
                </p>
              </div>
            </div>
            <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
              <ChevronRightIcon className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. MISSÕES RECENTES (Fila de Missões)                                 */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Missões Recentes
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
            <span>Ver todas as missões</span>
            <span>→</span>
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
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
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
                  <span>→</span>
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
              <p className="text-xs text-[var(--text-secondary)]">
                Novas diretrizes e metas de divulgação aparecerão aqui assim que atribuídas.
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

      {/* ==================================================================== */}
      {/* 5. INDICAÇÕES & COMISSÕES RECENTES                                   */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Suas Indicações & Comissões
            </h2>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Ver todas as indicações</span>
            <span>→</span>
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
                  {comm.publicId.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--brand)]">
              <LinkChainIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Divulgue seu link para começar
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Compartilhe seu link exclusivo com amigos e seguidores para gerar comissões automáticas.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => handleCopyLink(e)}
              className="font-semibold min-h-[44px]"
            >
              {copied ? "Link Copiado!" : "Copiar meu link agora"}
            </Button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 6. CHECK-IN DIÁRIO (Exclusivo para membros com papel STUDENT)        */}
      {/* ==================================================================== */}
      {isStudent && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
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
      {/* 7. SEU ACOMPANHAMENTO PESSOAL (Exclusivo para membros com STUDENT)   */}
      {/* ==================================================================== */}
      {isStudent && (
        <div className="space-y-3.5">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
            Seu Acompanhamento Pessoal
          </h2>

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
