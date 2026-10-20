"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DuotoneReferralsIcon,
  DuotoneMissionsIcon,
} from "@/components/ui/icons/duotone-icons";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { ReferrerDashboardData } from "@/components/dashboard/dashboard-combined-student-vip-view";

export interface StudentBenefitsSectionProps {
  consultancySlug: string;
  isInfluencer?: boolean;
  isVip?: boolean;
  missions?: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
}

export function StudentBenefitsSection({
  consultancySlug,
  isVip = false,
  missions = [],
  referrerData,
}: StudentBenefitsSectionProps) {
  const [copied, setCopied] = useState(false);

  const referralUrl = referrerData?.referralUrl || "";
  const referralCode = referrerData?.code || "";
  const registrationsCount = Number(referrerData?.registrationsCount) || 0;
  const conversionsCount = Number(referrerData?.conversionsCount) || 0;
  const approvedAmount = Number(referrerData?.approvedAmount) || 0;

  const safeMissions = Array.isArray(missions) ? missions : [];
  const pendingMissions = safeMissions.filter(
    (m) => m && (m.status === "PENDING" || m.status === "IN_PROGRESS")
  );

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

  return (
    <section className="w-full space-y-3 pt-2">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
            {isVip ? "Meus benefícios VIP" : "Área do influenciador"}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Parceria
          </span>
        </div>
        <Link
          href={`/consultoria/${consultancySlug}/indicacoes`}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          Painel de afiliados →
        </Link>
      </div>

      <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 space-y-4 transition-colors">
        {/* Link / Código de Afiliado */}
        {referralUrl ? (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                Seu link de indicação
              </span>
              <p className="text-xs text-zinc-500 dark:text-[#8E95A2] font-mono truncate">
                {referralUrl}
              </p>
              {referralCode && (
                <p className="text-[11px] text-zinc-500 dark:text-[#6B7280]">
                  Código: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{referralCode}</strong>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{copied ? "Link copiado!" : "Copiar link"}</span>
            </button>
          </div>
        ) : null}

        {/* Métricas Reais do Afiliado */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-[#8E95A2] text-xs">
              <DuotoneReferralsIcon className="w-4 h-4 text-emerald-500" />
              <span>Indicações</span>
            </div>
            <span className="text-lg font-black text-zinc-900 dark:text-white block mt-1">
              {registrationsCount}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-[#6B7280]">
              {conversionsCount} conversões
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-[#8E95A2] text-xs">
              <span className="text-emerald-500 font-bold text-sm">R$</span>
              <span>Comissão Aprovada</span>
            </div>
            <span className="text-lg font-black text-zinc-900 dark:text-white block mt-1">
              R$ {(approvedAmount / 100).toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-[#6B7280]">
              Disponível para saque
            </span>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60 hover:border-emerald-500 transition-colors col-span-2 sm:col-span-1 block"
          >
            <div className="flex items-center gap-2 text-zinc-500 dark:text-[#8E95A2] text-xs">
              <DuotoneMissionsIcon className="w-4 h-4 text-amber-500" />
              <span>Missões Ativas</span>
            </div>
            <span className="text-lg font-black text-zinc-900 dark:text-white block mt-1">
              {pendingMissions.length}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Ver missões →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
