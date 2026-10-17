"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsultancyPhotoEditor } from "@/components/consultancies/consultancy-photo-editor";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";
import {
  DuotoneOperationsIcon,
  DuotoneStudentsIcon,
  DuotoneFinanceIcon,
  DuotoneActivityIcon,
  DuotoneSubscriptionIcon,
  DuotoneAiIcon,
  DuotoneMissionsIcon,
  DuotoneReferralsIcon,
} from "@/components/ui/icons/duotone-icons";

export interface DashboardAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  consultancyLogoUrl?: string | null;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  hideRoleBadge?: boolean;
}

// Canonical route assertion compatibility: href: `/consultoria/${consultancySlug}/financeiro`

// Inline SVGs for crisp, zero-dependency visual styling
function CameraIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function DashboardAdminView({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  overview,
  platformAccess,
}: DashboardAdminViewProps) {
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;
  const isInGrace = platformAccess && platformAccess.effectiveStatus === "GRACE";

  const activeMembersCount =
    overview?.activeMembers !== undefined && overview?.activeMembers !== null
      ? overview.activeMembers
      : "—";

  const subscriptionStatusLabel =
    platformAccess?.effectiveStatus === "ACTIVE"
      ? "Ativa"
      : platformAccess?.effectiveStatus === "GRACE"
      ? "Carência"
      : "Gerenciar";

  return (
    <div className="w-full space-y-5 sm:space-y-6 pb-12 select-none animate-in fade-in duration-150">
      {/* 1. Alertas Críticos de Assinatura da Plataforma (se houver) */}
      {isSuspendedOrCanceled ? (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="danger" size="sm">Operação Bloqueada</Badge>
                <h3 className="text-sm font-bold text-red-900 dark:text-white">Assinatura Suspensa</h3>
              </div>
              <p className="text-xs text-red-700 dark:text-[#C2C8CF] mt-1">
                A assinatura da consultoria na plataforma Trevo One está pendente.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`}>
              <Button variant="danger" size="sm" className="font-semibold rounded-xl min-h-[44px]">
                Regularizar Assinatura →
              </Button>
            </Link>
          </div>
        </div>
      ) : isInGrace ? (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">Carência</Badge>
                <h3 className="text-sm font-bold text-amber-950 dark:text-white">Período de Carência Ativo</h3>
              </div>
              <p className="text-xs text-amber-700 dark:text-[#C2C8CF] mt-0.5">
                Regularize sua fatura para manter os recursos e as cotas de IA ativas.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/assinatura`}>
              <button
                type="button"
                className="font-semibold text-xs rounded-xl px-4 py-2 bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] border border-amber-500/30 dark:border-[#303238] text-amber-950 dark:text-white transition-all cursor-pointer min-h-[44px]"
              >
                Ver Fatura →
              </button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* 2. CABEÇALHO ÚNICO COM RESUMO INTEGRADO (No mesmo padrão do Treinador) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Identidade da Consultoria */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Avatar / Logo da Consultoria */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-[#1B1D21] border border-[#303238] shrink-0 shadow-xs flex items-center justify-center">
              {consultancyLogoUrl ? (
                <Image
                  src={consultancyLogoUrl}
                  alt={consultancyName || "Consultoria"}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <span className="font-heading font-black text-xl sm:text-2xl text-[#10B981]">
                  {((consultancyName || "C").trim().charAt(0) || "C").toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                  Administração · Painel Executivo
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate font-sans">
                {consultancyName || "Administração Geral"}
              </h1>

              {/* Ação discreta para foto da consultoria */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPhotoEditorOpen(!isPhotoEditorOpen)}
                  className="text-xs font-semibold text-[#10B981] hover:text-emerald-300 hover:underline inline-flex items-center gap-1.5 cursor-pointer min-h-[28px]"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  <span>
                    {isPhotoEditorOpen
                      ? "Fechar editor de foto"
                      : consultancyLogoUrl
                      ? "Alterar foto da consultoria"
                      : "Adicionar foto da consultoria"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Ações Primárias (Operações + Convidar Membro) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <Link
              href={`/consultoria/${consultancySlug}/operacoes`}
              prefetch={false}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm flex-1 sm:flex-initial"
            >
              <DuotoneOperationsIcon className="w-4 h-4" aria-hidden="true" />
              <span>Operações</span>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              prefetch={false}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none flex-1 sm:flex-initial"
            >
              <DuotoneStudentsIcon className="w-4 h-4" variant="monochrome" aria-hidden="true" />
              <span>+ Convidar Membro</span>
            </Link>
          </div>
        </div>

        {/* Editor de Foto Integrado (expansível) */}
        {isPhotoEditorOpen && (
          <div className="mt-4 pt-4 border-t border-[#303238] animate-in fade-in duration-200">
            <ConsultancyPhotoEditor
              consultancySlug={consultancySlug}
              consultancyName={consultancyName || "Consultoria"}
              currentLogoUrl={consultancyLogoUrl}
              variant="embedded"
              onClose={() => setIsPhotoEditorOpen(false)}
            />
          </div>
        )}

        {/* Resumo Administrativo Compacto Integrado (4 Células) */}
        <div className="mt-5 pt-4 border-t border-[#303238] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Célula 1: Membros da equipe */}
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-blue-500/50 flex items-center justify-center shrink-0">
              <DuotoneStudentsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors font-mono tabular-nums">
                  {activeMembersCount}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">membros na equipe</span>
              </div>
              <span className="text-[11px] text-blue-400 group-hover:underline block truncate font-medium">
                Gerenciar equipe →
              </span>
            </div>
          </Link>

          {/* Célula 2: Financeiro */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-teal-500/50 flex items-center justify-center shrink-0">
              <DuotoneFinanceIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white group-hover:text-teal-400 transition-colors font-sans truncate">
                  Faturas
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">Cobranças & Pix</span>
              </div>
              <span className="text-[11px] text-teal-400 group-hover:underline block truncate font-medium">
                Acessar financeiro →
              </span>
            </div>
          </Link>

          {/* Célula 3: Consumo de IA */}
          <Link
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer lg:border-l lg:border-[#303238]/60 lg:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-emerald-500/50 flex items-center justify-center shrink-0">
              <DuotoneAiIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-400 transition-colors font-sans truncate">
                  Cotas
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">Importações Studio</span>
              </div>
              <span className="text-[11px] text-emerald-400 group-hover:underline block truncate font-medium">
                Ver consumo de IA →
              </span>
            </div>
          </Link>

          {/* Célula 4: Assinatura */}
          <Link
            href={`/consultoria/${consultancySlug}/assinatura`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-indigo-500/50 flex items-center justify-center shrink-0">
              <DuotoneSubscriptionIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white group-hover:text-indigo-400 transition-colors font-sans truncate">
                  {subscriptionStatusLabel}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">Plano Trevo One</span>
              </div>
              <span className="text-[11px] text-indigo-400 group-hover:underline block truncate font-medium">
                Ver assinatura →
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. GESTÃO DA CONSULTORIA — PAINEL CLARO SÓLIDO (Grafite no modo escuro) */}
      <section aria-label="Gestão da consultoria" className="w-full space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight font-sans">
            Gestão da consultoria
          </h2>
          <span className="text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium">
            Atalhos centrais da operação
          </span>
        </div>

        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs divide-y md:divide-y-0 divide-[#E5E7EB] dark:divide-[#303238] md:grid md:grid-cols-2">
          {/* Acesso 1: Membros e Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            prefetch={false}
            className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors group cursor-pointer md:border-b md:border-r border-[#E5E7EB] dark:border-[#303238] min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneStudentsIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Membros e Alunos
                </span>
                <span className="block text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Controle de acessos, convites de equipe e alunos vinculados
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0">
              Gerenciar →
            </span>
          </Link>

          {/* Acesso 2: Central de Atividades */}
          <Link
            href={`/consultoria/${consultancySlug}/atividades`}
            prefetch={false}
            className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors group cursor-pointer md:border-b border-[#E5E7EB] dark:border-[#303238] min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneActivityIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Central de Atividades
                </span>
                <span className="block text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Trilha de auditoria em tempo real de treinos, dietas e acessos
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0">
              Ver trilha →
            </span>
          </Link>

          {/* Acesso 3: IA e Cotas */}
          <Link
            href={`/consultoria/${consultancySlug}/configuracoes/ia`}
            prefetch={false}
            className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors group cursor-pointer md:border-r border-[#E5E7EB] dark:border-[#303238] min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneAiIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  IA e Cotas
                </span>
                <span className="block text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Saldo e limites das ferramentas de importação da equipe
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0">
              Configurar →
            </span>
          </Link>

          {/* Acesso 4: Formulários e Anamneses */}
          <Link
            href={`/consultoria/${consultancySlug}/operacoes`}
            prefetch={false}
            className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors group cursor-pointer min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneOperationsIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="block text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Formulários e Anamneses
                </span>
                <span className="block text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Configuração de questionários personalizados e onboarding
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0">
              Acessar →
            </span>
          </Link>
        </div>
      </section>

      {/* 4. PARCERIAS E GESTÃO VIP (Afiliados e Missões em superfícies claras sólidas) */}
      <section aria-label="Afiliados e Missões" className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Programa de Afiliados & Indicações */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            prefetch={false}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] hover:border-emerald-500/40 transition-all flex items-center justify-between group shadow-xs cursor-pointer min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneReferralsIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Programa de Afiliados & Indicações
                </h3>
                <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Configure comissões, regras de repasse e aprove pagamentos PIX
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0 ml-2">
              Gerenciar →
            </span>
          </Link>

          {/* Gestão de Missões VIP */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes/gestao`}
            prefetch={false}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] hover:border-emerald-500/40 transition-all flex items-center justify-between group shadow-xs cursor-pointer min-h-[56px]"
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center shrink-0">
                <DuotoneMissionsIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-sm font-bold text-[#17191D] dark:text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                  Gestão de Missões VIP
                </h3>
                <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF] line-clamp-1">
                  Crie desafios, prazos e aprove comprovações enviadas pelos embaixadores
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-[#10B981] group-hover:translate-x-1 transition-transform shrink-0 ml-2">
              Acessar →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
