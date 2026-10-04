"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section, CompactCard, ListRow } from "@/components/ui/design-system";
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
}

export function DashboardAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
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
          consultancyName={consultancyName}
          urgentAlert={
            isSuspendedOrCanceled ? (
              <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 space-y-2">
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
              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-between gap-3 text-xs">
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
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand)]">
                  Painel de Gestão
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                  {overview?.students || 0} alunos ativos
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Visão Geral da Consultoria
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Gerencie alunos, equipe profissional e cobranças.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href={`/consultoria/${consultancySlug}/financeiro/nova-cobranca`}
                  className="min-h-[48px] rounded-xl font-bold text-xs bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span>+ Nova Cobrança</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/membros`}
                  className="min-h-[48px] rounded-xl font-bold text-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              subtitle: "Personais e nutricionistas",
              href: `/consultoria/${consultancySlug}/membros`,
            },
          ]}
          recentSection={{
            title: "Módulos Administrativos",
            subtitle: "Configurações da consultoria",
            viewAllHref: `/consultoria/${consultancySlug}/operacoes`,
            items: [
              {
                id: "membros",
                title: "Equipe e Alunos",
                subtitle: `${overview?.students || 0} alunos vinculados`,
                href: `/consultoria/${consultancySlug}/membros`,
              },
              {
                id: "financeiro",
                title: "Cobranças e Recebíveis",
                subtitle: "Histórico financeiro completo",
                href: `/consultoria/${consultancySlug}/financeiro`,
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

      {/* DESKTOP VIEW (>= 768px) — 100% PRESERVED */}
      <div className="hidden md:block space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
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
              <Button variant="danger" size="sm">
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
              <Button variant="secondary" size="sm">
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
            <div className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wider">
              Painel de Gestão
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              {consultancyName || "Administração Geral"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/consultoria/${consultancySlug}/operacoes`}>
            <Button variant="secondary" size="sm">
              Operações
            </Button>
          </Link>
          <Link href={`/consultoria/${consultancySlug}/membros`}>
            <Button variant="primary" size="sm">
              + Convidar Membro
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. METRICAS EXECUTIVAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <CompactCard
          title="Membros da Equipe"
          value={overview?.activeMembers ?? "—"}
          subtitle="Personais e nutricionistas"
          href={`/consultoria/${consultancySlug}/membros`}
          icon={
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Financeiro"
          value="Faturas"
          subtitle="Cobranças e recebíveis"
          href={`/consultoria/${consultancySlug}/financeiro`}
          icon={
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Consumo de IA"
          value="Cotas"
          subtitle="Importações e limites"
          href={`/consultoria/${consultancySlug}/configuracoes/ia`}
          icon={
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <CompactCard
          title="Assinatura"
          value={platformAccess?.effectiveStatus === "ACTIVE" ? "Ativa" : "Gerenciar"}
          subtitle="Plano Trevo One"
          href={`/consultoria/${consultancySlug}/assinatura`}
          icon={
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* 4. MODULOS DE GESTÃO DA OPERAÇÃO */}
      <Section
        title="Gestão da Operação"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <ListRow
            title="Membros e Alunos"
            subtitle="Controle de acessos, convites de equipe e alunos vinculados"
            href={`/consultoria/${consultancySlug}/membros`}
            trailing={<span className="text-xs text-[var(--brand)] font-semibold">Gerenciar →</span>}
          />
          <ListRow
            title="Central de Atividades"
            subtitle="Trilha de auditoria em tempo real de treinos, dietas e acessos"
            href={`/consultoria/${consultancySlug}/atividades`}
            trailing={<span className="text-xs text-[var(--brand)] font-semibold">Ver trilha →</span>}
          />
          <ListRow
            title="Gestão de IA e Limites"
            subtitle="Acompanhe o saldo e uso das ferramentas de importação da equipe"
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            trailing={<span className="text-xs text-[var(--brand)] font-semibold">Configurar →</span>}
          />
          <ListRow
            title="Formulários & Anamneses"
            subtitle="Configuração de questionários personalizados e onboarding de novos alunos"
            href={`/consultoria/${consultancySlug}/operacoes`}
            trailing={<span className="text-xs text-[var(--brand)] font-semibold">Acessar →</span>}
          />
        </div>
      </Section>

      {/* 5. GESTÃO DE PARCERIAS & AFILIADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/consultoria/${consultancySlug}/indicacoes`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              Programa de Afiliados & Indicações
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Configure comissões, regras de repasse e aprove pagamentos PIX
            </p>
          </div>
          <span className="text-sm text-[var(--brand)] font-bold">→</span>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/missoes/gestao`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              Gestão de Missões VIP
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Crie desafios, prazos e aprove comprovações enviadas pelos embaixadores
            </p>
          </div>
          <span className="text-sm text-[var(--brand)] font-bold">→</span>
        </Link>
      </div>
      </div>
    </>
  );
}
