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

        {/* 2. HEADER DA CONSULTORIA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3.5">
            <ConsultancyPhotoEditor
              consultancySlug={consultancySlug}
              currentLogoUrl={consultancyLogoUrl}
              consultancyName={consultancyName || "Consultoria"}
            />
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {consultancyName || "Administração Geral"}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Painel Executivo da Consultoria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/consultoria/${consultancySlug}/operacoes`}>
              <Button variant="secondary" size="sm" className="font-semibold rounded-lg">
                Operações
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/membros`}>
              <Button variant="primary" size="sm" className="font-semibold rounded-lg">
                + Convidar Membro
              </Button>
            </Link>
          </div>
        </div>

        {/* 3. METRICAS EXECUTIVAS (CompactCard clean grid-cols-2 sm:grid-cols-4 summary strip) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Membros da Equipe</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {overview?.activeMembers ?? "—"}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Personais e nutricionistas</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Financeiro</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Faturas
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Cobranças e recebíveis</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Consumo de IA</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Cotas
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Importações e limites</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Assinatura</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {platformAccess?.effectiveStatus === "ACTIVE" ? "Ativa" : "Gerenciar"}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Plano Trevo One</span>
            </div>
          </Link>
        </div>

        {/* 4. MODULOS DE GESTÃO DA OPERAÇÃO: Lista sem card-in-card */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Gestão da Operação
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            <div className="divide-y divide-[var(--border-subtle)]">
              <Link
                href={`/consultoria/${consultancySlug}/membros`}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
              >
                <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Membros e Alunos
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    Controle de acessos, convites de equipe e alunos vinculados
                  </span>
                </div>
                <span className="text-xs text-[var(--brand)] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                  Gerenciar →
                </span>
              </Link>
              <Link
                href={`/consultoria/${consultancySlug}/atividades`}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
              >
                <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Central de Atividades
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    Trilha de auditoria em tempo real de treinos, dietas e acessos
                  </span>
                </div>
                <span className="text-xs text-[var(--brand)] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                  Ver trilha →
                </span>
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <Link
                href={`/consultoria/${consultancySlug}/configuracoes/ia`}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
              >
                <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Gestão de IA e Limites
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    Acompanhe o saldo e uso das ferramentas de importação da equipe
                  </span>
                </div>
                <span className="text-xs text-[var(--brand)] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                  Configurar →
                </span>
              </Link>
              <Link
                href={`/consultoria/${consultancySlug}/operacoes`}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
              >
                <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                  <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                    Formulários & Anamneses
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    Configuração de questionários personalizados e onboarding
                  </span>
                </div>
                <span className="text-xs text-[var(--brand)] font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
                  Acessar →
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* 5. GESTÃO DE PARCERIAS & AFILIADOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Programa de Afiliados & Indicações
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Configure comissões, regras de repasse e aprove pagamentos PIX
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Gestão de Missões VIP
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Crie desafios, prazos e aprove comprovações enviadas pelos embaixadores
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
