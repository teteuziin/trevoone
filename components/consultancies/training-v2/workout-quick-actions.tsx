"use client";

import React from "react";
import Link from "next/link";

export interface WorkoutQuickActionsProps {
  consultancySlug: string;
  latestDraft?: {
    publicId: string;
    title: string;
    updatedAt: string | Date;
    blocksCount?: number;
  } | null;
  activeTab?: string;
  onOpenAiModal?: () => void;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function WorkoutQuickActions({
  consultancySlug,
  latestDraft,
  activeTab = "routines",
  onOpenAiModal,
}: WorkoutQuickActionsProps) {
  return (
    <div className="w-full font-sans space-y-3">
      {/* SE HOUVER RASCUNHO REAL: Card compacto "Continuar treino" com 1 toque */}
      {latestDraft && activeTab === "routines" && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0F2F24] text-white border border-[#163E27] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center shrink-0 border border-white/10">
              <span className="text-base leading-none">⚡</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  Treino em andamento
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-md bg-white/15 text-white/90 font-medium">
                  Em elaboração
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white truncate leading-tight mt-0.5">
                {latestDraft.title}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/${latestDraft.publicId}/editor`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#EBF3ED] hover:bg-white text-[#0F2F24] transition-all cursor-pointer min-h-[38px] shadow-xs"
            >
              <span>Continuar treino</span>
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      )}

      {/* ATALHOS RÁPIDOS COMPACTOS (SEM CARDS GIGANTES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Criar novo treino */}
        <Link
          href={`/consultoria/${consultancySlug}/rotinas/novo`}
          className="group p-3 rounded-2xl bg-white border border-[#E5E8E2] hover:border-[#CCD5CB] shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 min-h-[52px]"
        >
          <span className="w-8 h-8 rounded-xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PlusIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors leading-tight">
              Criar treino
            </p>
            <p className="text-[10px] text-[#6B7870] truncate mt-0.5">
              Nova ficha do zero
            </p>
          </div>
        </Link>

        {/* 2. Modelos prontos */}
        <Link
          href={`/consultoria/${consultancySlug}/rotinas?tab=templates`}
          className={`group p-3 rounded-2xl bg-white border shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 min-h-[52px] ${
            activeTab === "templates" ? "border-[#176B49] bg-[#F7FAF8]" : "border-[#E5E8E2] hover:border-[#CCD5CB]"
          }`}
        >
          <span className="w-8 h-8 rounded-xl bg-[#F4EFFC] text-[#6B46C1] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LayersIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#6B46C1] transition-colors leading-tight">
              Modelos prontos
            </p>
            <p className="text-[10px] text-[#6B7870] truncate mt-0.5">
              Fichas reutilizáveis
            </p>
          </div>
        </Link>

        {/* 3. Treinos dos alunos */}
        <Link
          href={`/consultoria/${consultancySlug}/rotinas?tab=assignments`}
          className={`group p-3 rounded-2xl bg-white border shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 min-h-[52px] ${
            activeTab === "assignments" ? "border-[#176B49] bg-[#F7FAF8]" : "border-[#E5E8E2] hover:border-[#CCD5CB]"
          }`}
        >
          <span className="w-8 h-8 rounded-xl bg-[#EDF3F7] text-[#2B6CB0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UsersIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#2B6CB0] transition-colors leading-tight">
              Treinos dos alunos
            </p>
            <p className="text-[10px] text-[#6B7870] truncate mt-0.5">
              Atribuídos e ativos
            </p>
          </div>
        </Link>

        {/* 4. Criar com IA */}
        <button
          type="button"
          onClick={onOpenAiModal}
          className="group p-3 rounded-2xl bg-white border border-[#E5E8E2] hover:border-[#CCD5CB] shadow-2xs hover:shadow-xs transition-all flex items-center gap-2.5 min-h-[52px] text-left cursor-pointer"
        >
          <span className="w-8 h-8 rounded-xl bg-[#EDF8F4] text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <SparklesIcon />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors leading-tight">
              Criar com IA
            </p>
            <p className="text-[10px] text-[#6B7870] truncate mt-0.5">
              Montagem inteligente
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
