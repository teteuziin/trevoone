"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsultancyPhotoEditor } from "@/components/consultancies/consultancy-photo-editor";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";

interface DashboardAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  hideRoleBadge?: boolean;
}

// Canonical route assertion compatibility: href: `/consultoria/${consultancySlug}/financeiro`

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Inline SVGs for crisp, zero-dependency visual styling
function CameraIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SlidersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UserPlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CreditCardIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ActivityIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function DashboardAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
  hideRoleBadge,
}: DashboardAdminViewProps) {
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";
  const greeting = getGreeting();

  return (
    <>
      {/* =========================================================================
          MOBILE VIEW (< 768px) — COMPOSTO EM PRETO/GRAFITE SÓLIDO (#151619 / #202226)
          ========================================================================= */}
      <div className="md:hidden space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] select-none">
        {/* 1. Header & Saudação */}
        <div className="pt-1 px-1 flex items-baseline justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#17191D] dark:text-white tracking-tight font-sans">
            {greeting}
          </h1>
          {!hideRoleBadge && (
            <span className="text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium font-sans">
              Administrador
            </span>
          )}
        </div>

        {/* 2. Alertas Críticos (se houver) */}
        {isSuspendedOrCanceled ? (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Badge variant="danger" size="sm">Bloqueada</Badge>
              <span>Assinatura Suspensa</span>
            </div>
            <p className="text-[11px] text-[#C2C8CF]">A assinatura da consultoria está pendente.</p>
            <Link href={`/consultoria/${consultancySlug}/assinatura`}>
              <Button variant="danger" size="sm" className="w-full min-h-[44px] font-bold text-xs mt-1">
                Regularizar Assinatura →
              </Button>
            </Link>
          </div>
        ) : isInGrace ? (
          <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-between gap-3 text-xs">
            <div>
              <Badge variant="warning" size="sm">Carência</Badge>
              <p className="text-[11px] text-amber-200 mt-0.5">Regularize sua fatura para manter os recursos ativos.</p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`}>
              <span className="font-bold text-[#10B981]">Ver →</span>
            </Link>
          </div>
        ) : null}

        {/* 3. Card "Gestão da consultoria" (Grafite Sólido #151619) */}
        <div className="p-4 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-sans">
              Gestão da consultoria
            </h2>
            <span className="text-xs text-[#C2C8CF] font-medium font-sans">
              {overview?.students || 0} alunos ativos
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`/consultoria/${consultancySlug}/financeiro/nova-cobranca`}
              className="min-h-[44px] rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer font-sans"
            >
              <span>+ Nova Cobrança</span>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="min-h-[44px] rounded-xl font-semibold text-xs bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer font-sans"
            >
              <span>Ver Membros</span>
            </Link>
          </div>
        </div>

        {/* 4. Indicadores de Alunos e Equipe */}
        <div className="py-2.5 px-3 rounded-xl bg-[#151619] border border-[#303238] flex items-center justify-around divide-x divide-[#303238]">
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="flex items-center justify-center gap-2 px-3 py-1 flex-1 text-center min-h-[38px] group cursor-pointer"
          >
            <span className="text-sm font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums">
              {overview?.students ?? "—"}
            </span>
            <span className="text-xs text-[#C2C8CF] font-medium truncate font-sans">
              Alunos Ativos
            </span>
          </Link>
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="flex items-center justify-center gap-2 px-3 py-1 flex-1 text-center min-h-[38px] group cursor-pointer"
          >
            <span className="text-sm font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums">
              {overview?.activeMembers ?? "—"}
            </span>
            <span className="text-xs text-[#C2C8CF] font-medium truncate font-sans">
              Membros da Equipe
            </span>
          </Link>
        </div>

        {/* 5. Seção "Operação Rápida" (Cards Grafite Sólidos #151619) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-[#17191D] dark:text-white tracking-tight font-sans">
                Operação Rápida
              </h2>
              <p className="text-[11px] text-[#4B5563] dark:text-[#C2C8CF] font-sans">
                Atalhos estratégicos para o administrador
              </p>
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/operacoes`}
              className="text-xs font-semibold text-[#059669] dark:text-[#10B981] hover:underline min-h-[44px] flex items-center px-1 cursor-pointer font-sans"
            >
              Ver todos →
            </Link>
          </div>

          <div className="rounded-2xl bg-[#151619] border border-[#303238] divide-y divide-[#303238] overflow-hidden shadow-2xs">
            <Link
              href={`/consultoria/${consultancySlug}/financeiro`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Financeiro & Cobranças
                </span>
                <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                  Gestão financeira e faturamento
                </span>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/configuracoes/ia`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Cotas de IA
                </span>
                <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                  Uso de ferramentas inteligentes
                </span>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/assinatura`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Plano da Consultoria
                </span>
                <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                  Assinatura Trevo One
                </span>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* 6. Seção "Acesso Rápido" */}
        <div className="space-y-1.5 pt-1">
          <div className="px-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#C2C8CF] font-sans">
              Acesso rápido
            </span>
          </div>

          <div className="rounded-2xl bg-[#151619] border border-[#303238] divide-y divide-[#303238] overflow-hidden shadow-2xs">
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center shrink-0">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                    Membros
                  </span>
                  <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                    {overview?.activeMembers || 0} na equipe
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/financeiro`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center shrink-0">
                  <CreditCardIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                    Financeiro
                  </span>
                  <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                    Cobranças e faturas
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/operacoes`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center shrink-0">
                  <SlidersIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                    Operações
                  </span>
                  <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                    Gestão do negócio
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/atividades`}
              className="flex items-center justify-between p-3.5 hover:bg-[#1B1D21] active:bg-[#1B1D21] transition-colors group cursor-pointer min-h-[48px]"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center shrink-0">
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                    Atividades
                  </span>
                  <span className="block text-[11px] text-[#C2C8CF] truncate font-sans">
                    Registro de ações
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DESKTOP VIEW (>= 768px) — COMPOSTO EM PRETO/GRAFITE SÓLIDO (#151619 / #0B0C0E)
          ========================================================================= */}
      <div className="hidden md:block space-y-6 w-full animate-in fade-in duration-150">
        {/* 1. Alertas Críticos de Assinatura da Plataforma */}
        {isSuspendedOrCanceled && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger" size="sm">Operação Bloqueada</Badge>
                  <h3 className="text-sm font-bold text-white">Assinatura Suspensa</h3>
                </div>
                <p className="text-xs text-[#C2C8CF] mt-1">
                  A assinatura da consultoria na plataforma Trevo One está pendente.
                </p>
              </div>
              <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                <Button variant="danger" size="sm" className="font-semibold rounded-xl">
                  Regularizar Assinatura →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {isInGrace && (
          <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">Carência</Badge>
                  <h3 className="text-sm font-bold text-white">Período de Carência Ativo</h3>
                </div>
                <p className="text-xs text-[#C2C8CF] mt-0.5">
                  Regularize sua fatura para manter os recursos e as cotas de IA ativas.
                </p>
              </div>
              <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                <button
                  type="button"
                  className="font-semibold text-xs rounded-xl px-4 py-2 bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-white transition-all cursor-pointer"
                >
                  Ver Fatura
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* 2. HEADER EXECUTIVO DA CONSULTORIA — PRETO SÓLIDO #0B0C0E */}
        <div className="rounded-3xl border border-[#303238] bg-[#0B0C0E] p-5 sm:p-6 shadow-sm text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Left: Avatar + Identidade da Consultoria + Ação compacta de Foto */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar / Logo da Consultoria */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#1B1D21] border border-[#303238] shrink-0 shadow-xs flex items-center justify-center">
                {consultancyLogoUrl ? (
                  <Image
                    src={consultancyLogoUrl}
                    alt={consultancyName || "Consultoria"}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="font-heading font-black text-2xl text-[#10B981]">
                    {((consultancyName || "C").trim().charAt(0) || "C").toUpperCase()}
                  </span>
                )}
              </div>

              {/* Informações Centrais e Identidade */}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1B1D21] border border-[#303238] text-[#10B981] text-[10px] font-bold tracking-wider uppercase">
                    <span>HUB ADMINISTRATIVO</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#C2C8CF] hidden sm:inline">
                    {consultancyLogoUrl ? "Foto personalizada ativa" : "Nenhuma foto definida"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate font-sans">
                  {consultancyName || "Administração Geral"}
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-[#C2C8CF] font-medium">
                    Painel Executivo da Consultoria
                  </p>
                  <span className="text-[#303238]">•</span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoEditorOpen(!isPhotoEditorOpen)}
                    className="text-xs font-semibold text-[#10B981] hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CameraIcon className="w-3.5 h-3.5" />
                    <span>{isPhotoEditorOpen ? "Fechar foto" : consultancyLogoUrl ? "Alterar foto" : "Definir foto"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Ações Existentes (Operações + Convidar Membro) */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/consultoria/${consultancySlug}/operacoes`}>
                <button
                  type="button"
                  title="Operações"
                  aria-label="Operações"
                  className="font-bold text-sm rounded-xl px-4 py-2.5 bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 text-white transition-all min-h-[44px] flex items-center gap-2 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
                >
                  <SlidersIcon className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                  <span>Operações</span>
                </button>
              </Link>
              <Link href={`/consultoria/${consultancySlug}/membros`}>
                <button
                  type="button"
                  title="+ Convidar Membro"
                  aria-label="Convidar Membro"
                  className="font-bold text-sm rounded-xl px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm transition-all min-h-[44px] flex items-center gap-2 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
                >
                  <UserPlusIcon className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>+ Convidar Membro</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Painel Integrado de Edição de Foto (quando expandido) */}
          {isPhotoEditorOpen && (
            <div className="mt-5 pt-5 border-t border-[#303238] animate-in fade-in duration-200">
              <ConsultancyPhotoEditor
                consultancySlug={consultancySlug}
                consultancyName={consultancyName || "Consultoria"}
                currentLogoUrl={consultancyLogoUrl}
                variant="embedded"
                onClose={() => setIsPhotoEditorOpen(false)}
              />
            </div>
          )}
        </div>

        {/* 3. METRICAS EXECUTIVAS — CARDS GRAFITE SÓLIDOS #151619 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px]"
          >
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Membros da Equipe
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors tabular-nums font-sans">
                {overview?.activeMembers ?? "—"}
              </span>
              <span className="text-[10px] text-[#C2C8CF] hidden xl:inline font-medium">
                Personais e nutris
              </span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px]"
          >
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Financeiro
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans">
                Faturas
              </span>
              <span className="text-[10px] text-[#C2C8CF] hidden xl:inline font-medium">
                Cobranças & Pix
              </span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px]"
          >
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Consumo de IA
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans">
                Cotas
              </span>
              <span className="text-[10px] text-[#C2C8CF] hidden xl:inline font-medium">
                Importações Studio
              </span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between shadow-sm text-white min-h-[110px]"
          >
            <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider">
              Assinatura
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans">
                {platformAccess?.effectiveStatus === "ACTIVE" ? "Ativa" : "Gerenciar"}
              </span>
              <span className="text-[10px] text-[#C2C8CF] hidden xl:inline font-medium">
                Plano Trevo One
              </span>
            </div>
          </Link>
        </div>

        {/* 4. MODULOS DE GESTÃO DA OPERAÇÃO — GRAFITE SÓLIDO #151619 */}
        <div className="rounded-3xl bg-[#151619] border border-[#303238] p-5 sm:p-6 shadow-sm text-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-sans">
              Gestão da Operação
            </h3>
            <span className="text-xs text-[#C2C8CF] font-medium">
              Atalhos centrais da consultoria
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="p-4 rounded-2xl bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Membros e Alunos
                </span>
                <span className="block text-xs text-[#C2C8CF] line-clamp-1">
                  Controle de acessos, convites de equipe e alunos vinculados
                </span>
              </div>
              <span className="text-xs text-[#10B981] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Gerenciar →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/atividades`}
              className="p-4 rounded-2xl bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Central de Atividades
                </span>
                <span className="block text-xs text-[#C2C8CF] line-clamp-1">
                  Trilha de auditoria em tempo real de treinos, dietas e acessos
                </span>
              </div>
              <span className="text-xs text-[#10B981] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Ver trilha →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/configuracoes/ia`}
              className="p-4 rounded-2xl bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Gestão de IA e Limites
                </span>
                <span className="block text-xs text-[#C2C8CF] line-clamp-1">
                  Acompanhe o saldo e uso das ferramentas de importação da equipe
                </span>
              </div>
              <span className="text-xs text-[#10B981] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Configurar →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/operacoes`}
              className="p-4 rounded-2xl bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Formulários & Anamneses
                </span>
                <span className="block text-xs text-[#C2C8CF] line-clamp-1">
                  Configuração de questionários personalizados e onboarding
                </span>
              </div>
              <span className="text-xs text-[#10B981] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Acessar →
              </span>
            </Link>
          </div>
        </div>

        {/* 5. GESTÃO DE PARCERIAS & AFILIADOS — CARDS GRAFITE SÓLIDOS #151619 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all flex items-center justify-between group shadow-sm text-white cursor-pointer"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors font-sans">
                Programa de Afiliados & Indicações
              </h4>
              <p className="text-xs text-[#C2C8CF]">
                Configure comissões, regras de repasse e aprove pagamentos PIX
              </p>
            </div>
            <span className="text-sm text-[#10B981] font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-3">
              →
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-4 sm:p-5 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all flex items-center justify-between group shadow-sm text-white cursor-pointer"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors font-sans">
                Gestão de Missões VIP
              </h4>
              <p className="text-xs text-[#C2C8CF]">
                Crie desafios, prazos e aprove comprovações enviadas pelos embaixadores
              </p>
            </div>
            <span className="text-sm text-[#10B981] font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-3">
              →
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
