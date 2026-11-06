"use client";

import React from "react";
import Link from "next/link";

export interface PersonalHeaderProps {
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl?: string | null;
  userName?: string;
  userEmail?: string;
  userPublicId?: string;
  userAvatarUrl?: string | null;
  hasProfilePhoto?: boolean;
  profilePhotoUpdatedAt?: Date | string | number | null;
  roles?: string[];
  activeRoleMode?: string;
  hasMultipleConsultancies?: boolean;
  className?: string;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function PersonalHeader({
  consultancyName = "Saiya Shape",
  consultancySlug,
  userName = "Treinador",
  className = "",
}: PersonalHeaderProps) {
  return (
    <header className={`w-full ${className}`}>
      {/* ============================================================== */}
      {/* 1. VERSÃO MOBILE (< 768px): COMPACTO E SEM DUPLICAÇÕES          */}
      {/* O topo da tela (barra fixa) já contém o logo da consultoria,    */}
      {/* seletor de acesso e notificações. Aqui focamos no título e CTA. */}
      {/* ============================================================== */}
      <div className="block md:hidden pb-1">
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-[#047857] tracking-tight leading-none">
              Início
            </h1>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo`}
            prefetch={false}
            className="min-h-[44px] px-4 rounded-xl font-bold text-xs bg-[#047857] hover:bg-[#065F46] text-white flex items-center justify-center gap-1.5 shadow-xs shrink-0 select-none cursor-pointer active:translate-y-[1px] transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Criar treino</span>
          </Link>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. VERSÃO DESKTOP (>= 768px): SAAS EDITORIAL PREMIUM           */}
      {/* Nível superior: Breadcrumb com alto contraste (sem text claro   */}
      {/* sobre fundo claro) e status do ambiente.                       */}
      {/* Nível inferior: Título Esmeralda + Botão Criar Treino          */}
      {/* ============================================================== */}
      <div className="hidden md:block space-y-3.5 pb-2 border-b border-[#E7E9E3]">
        {/* Nível Superior: Breadcrumb e Status do Ambiente */}
        <div className="flex items-center justify-between gap-4">
          {/* Esquerda: Breadcrumb limpo e escuro */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#64748B] tracking-wide">
              Trevo One
            </span>
            <span className="text-[#CBD5E1] text-xs select-none">/</span>
            <span className="text-sm font-bold text-[#1E2922] tracking-tight truncate">
              {consultancyName}
            </span>
          </div>

          {/* Direita: Indicador de Ambiente de Treinador */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2E6DF] shadow-xs select-none">
            <span className="w-2 h-2 rounded-full bg-[#047857]" />
            <span className="text-xs font-bold text-[#1E2922]">Treinador</span>
            <span className="text-[#CBD5E1] text-xs">·</span>
            <span className="text-xs text-[#64748B] font-medium">{userName}</span>
          </div>
        </div>

        {/* Nível Inferior: Título Esmeralda + Ação Principal */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#047857] tracking-tight leading-none">
            Início
          </h1>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo`}
            prefetch={false}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm bg-[#047857] hover:bg-[#065F46] text-white flex items-center justify-center gap-2 shadow-xs transition-colors select-none cursor-pointer active:translate-y-[1px]"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Criar treino</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
