"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// CompactCard de-template: clean unified 4-metric strip with grid-cols-2 sm:grid-cols-4
import { ConsultancyPhotoEditor } from "@/components/consultancies/consultancy-photo-editor";
import { MobileDashboardCockpit } from "./mobile-dashboard-cockpit";
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

export function DashboardAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
  hideRoleBadge,
}: DashboardAdminViewProps) {
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";

  return (
    <>
      {/* MOBILE NATIVE COCKPIT (< 768px) */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="ADMIN"
          consultancySlug={consultancySlug}
          hideRoleBadge={hideRoleBadge}
          urgentAlert={
            isSuspendedOrCanceled ? (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Badge variant="danger" size="sm">Bloqueada</Badge>
                  <span>Assinatura Suspensa</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">A assinatura da consultoria está pendente.</p>
                <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                  <Button variant="danger" size="sm" className="w-full min-h-[44px] font-bold text-xs mt-1">
                    Regularizar Assinatura →
                  </Button>
                </Link>
              </div>
            ) : isInGrace ? (
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-between gap-3 text-xs">
                <div>
                  <Badge variant="warning" size="sm">Carência</Badge>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5">Regularize sua fatura para manter os recursos ativos.</p>
                </div>
                <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                  <span className="font-bold text-[var(--brand)]">Ver →</span>
                </Link>
              </div>
            ) : null
          }
          heroActionCard={
            <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Gestão da consultoria
                </h2>
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {overview?.students || 0} alunos ativos
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/consultoria/${consultancySlug}/financeiro/nova-cobranca`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                >
                  <span>+ Nova Cobrança</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/membros`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <span>Ver Membros</span>
                </Link>
              </div>
            </div>
          }
          quickActions={[
            {
              id: "members",
              label: "Membros",
              subtitle: `${overview?.activeMembers || 0} na equipe`,
              href: `/consultoria/${consultancySlug}/membros`,
              highlight: true,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              id: "finance",
              label: "Financeiro",
              subtitle: "Cobranças e faturas",
              href: `/consultoria/${consultancySlug}/financeiro`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              id: "operations",
              label: "Operações",
              subtitle: "Gestão do negócio",
              href: `/consultoria/${consultancySlug}/operacoes`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
            {
              id: "activity",
              label: "Atividades",
              subtitle: "Registro de ações",
              href: `/consultoria/${consultancySlug}/atividades`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
          ]}
          metrics={[
            {
              title: "Alunos Ativos",
              value: overview?.students ?? 0,
              subtitle: "Total na consultoria",
              href: `/consultoria/${consultancySlug}/membros`,
            },
            {
              title: "Membros da Equipe",
              value: overview?.activeMembers ?? 0,
              subtitle: "Profissionais ativos",
              href: `/consultoria/${consultancySlug}/membros`,
            },
          ]}
          recentSection={{
            title: "Operação Rápida",
            subtitle: "Atalhos estratégicos para o administrador",
            viewAllHref: `/consultoria/${consultancySlug}/operacoes`,
            items: [
              {
                id: "financeiro",
                title: "Financeiro & Cobranças",
                subtitle: "Gestão financeira e faturamento",
                href: `/consultoria/${consultancySlug}/financeiro`,
              },
              {
                id: "ia-quotas",
                title: "Cotas de IA",
                subtitle: "Uso de ferramentas inteligentes",
                href: `/consultoria/${consultancySlug}/configuracoes/ia`,
              },
              {
                id: "assinatura",
                title: "Plano da Consultoria",
                subtitle: "Assinatura Trevo One",
                href: `/consultoria/${consultancySlug}/assinatura`,
              },
            ],
          }}
        />
      </div>

      {/* DESKTOP VIEW (>= 768px) */}
      <div className="hidden md:block space-y-6 w-full animate-in fade-in duration-150">
        {/* 1. Alertas Críticos de Assinatura da Plataforma */}
        {isSuspendedOrCanceled && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="danger" size="sm">Operação Bloqueada</Badge>
                  <h3 className="text-sm font-bold">Assinatura Suspensa</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  A assinatura da consultoria na plataforma Trevo One está pendente.
                </p>
              </div>
              <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                <Button variant="danger" size="sm" className="font-semibold rounded-lg">
                  Regularizar Assinatura →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {isInGrace && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">Carência</Badge>
                  <h3 className="text-sm font-bold">Período de Carência Ativo</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Regularize sua fatura para manter os recursos e as cotas de IA ativas.
                </p>
              </div>
              <Link href={`/consultoria/${consultancySlug}/assinatura`}>
                <Button variant="secondary" size="sm" className="font-semibold rounded-lg">
                  Ver Fatura
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 2. HEADER EXECUTIVO DA CONSULTORIA - PAINEL VERDE-ESCURO SÓLIDO */}
        <div className="rounded-3xl border border-[#1e4738] bg-[#10271F] p-5 sm:p-6 shadow-sm text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <ConsultancyPhotoEditor
                consultancySlug={consultancySlug}
                currentLogoUrl={consultancyLogoUrl}
                consultancyName={consultancyName || "Consultoria"}
              />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18352C] border border-[#234e3e] text-[#80E8B3] text-[10px] font-bold tracking-wider uppercase mb-1">
                  <span>HUB ADMINISTRATIVO</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {consultancyName || "Administração Geral"}
                </h2>
                <p className="text-xs text-[#CBDDD3] mt-0.5 font-medium">
                  Painel Executivo da Consultoria
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href={`/consultoria/${consultancySlug}/operacoes`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-bold rounded-xl px-4 py-2 bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] text-white transition-all min-h-[44px]"
                >
                  Operações
                </Button>
              </Link>
              <Link href={`/consultoria/${consultancySlug}/membros`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold rounded-xl px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm transition-all min-h-[44px]"
                >
                  + Convidar Membro
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 3. METRICAS EXECUTIVAS - CARDS VERDE-ESCUROS SÓLIDOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all group flex flex-col justify-between shadow-sm text-white"
          >
            <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider">Membros da Equipe</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors tabular-nums">
                {overview?.activeMembers ?? "—"}
              </span>
              <span className="text-[10px] text-[#CBDDD3] hidden xl:inline font-medium">Personais e nutris</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all group flex flex-col justify-between shadow-sm text-white"
          >
            <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider">Financeiro</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors">
                Faturas
              </span>
              <span className="text-[10px] text-[#CBDDD3] hidden xl:inline font-medium">Cobranças & Pix</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all group flex flex-col justify-between shadow-sm text-white"
          >
            <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider">Consumo de IA</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors">
                Cotas
              </span>
              <span className="text-[10px] text-[#CBDDD3] hidden xl:inline font-medium">Importações Studio</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all group flex flex-col justify-between shadow-sm text-white"
          >
            <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider">Assinatura</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors">
                {platformAccess?.effectiveStatus === "ACTIVE" ? "Ativa" : "Gerenciar"}
              </span>
              <span className="text-[10px] text-[#CBDDD3] hidden xl:inline font-medium">Plano Trevo One</span>
            </div>
          </Link>
        </div>

        {/* 4. MODULOS DE GESTÃO DA OPERAÇÃO - HUB VERDE-ESCURO */}
        <div className="rounded-3xl bg-[#10271F] border border-[#1e4738] p-5 sm:p-6 shadow-sm text-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Gestão da Operação
            </h3>
            <span className="text-xs text-[#CBDDD3]">Atalhos centrais da consultoria</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors truncate">
                  Membros e Alunos
                </span>
                <span className="block text-xs text-[#CBDDD3]">
                  Controle de acessos, convites de equipe e alunos vinculados
                </span>
              </div>
              <span className="text-xs text-[#80E8B3] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Gerenciar →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/atividades`}
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors truncate">
                  Central de Atividades
                </span>
                <span className="block text-xs text-[#CBDDD3]">
                  Trilha de auditoria em tempo real de treinos, dietas e acessos
                </span>
              </div>
              <span className="text-xs text-[#80E8B3] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Ver trilha →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/configuracoes/ia`}
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors truncate">
                  Gestão de IA e Limites
                </span>
                <span className="block text-xs text-[#CBDDD3]">
                  Acompanhe o saldo e uso das ferramentas de importação da equipe
                </span>
              </div>
              <span className="text-xs text-[#80E8B3] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Configurar →
              </span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/operacoes`}
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex items-center justify-between text-white cursor-pointer"
            >
              <div className="min-w-0 flex-1 space-y-0.5 pr-3">
                <span className="block text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors truncate">
                  Formulários & Anamneses
                </span>
                <span className="block text-xs text-[#CBDDD3]">
                  Configuração de questionários personalizados e onboarding
                </span>
              </div>
              <span className="text-xs text-[#80E8B3] font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                Acessar →
              </span>
            </Link>
          </div>
        </div>

        {/* 5. GESTÃO DE PARCERIAS & AFILIADOS - CARDS VERDE-ESCUROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-sm text-white"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors">
                Programa de Afiliados & Indicações
              </h4>
              <p className="text-xs text-[#CBDDD3]">
                Configure comissões, regras de repasse e aprove pagamentos PIX
              </p>
            </div>
            <span className="text-sm text-[#80E8B3] font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-3">→</span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-4 sm:p-5 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-sm text-white"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors">
                Gestão de Missões VIP
              </h4>
              <p className="text-xs text-[#CBDDD3]">
                Crie desafios, prazos e aprove comprovações enviadas pelos embaixadores
              </p>
            </div>
            <span className="text-sm text-[#80E8B3] font-bold group-hover:translate-x-1 transition-transform shrink-0 ml-3">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
