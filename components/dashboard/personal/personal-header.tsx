"use client";

import React from "react";
import Link from "next/link";

export interface PersonalHeaderProps {
  consultancyName?: string;
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
  consultancySlug,
  className = "",
}: PersonalHeaderProps) {
  return (
    <header className={`w-full ${className}`}>
      {/* ============================================================== */}
      {/* TREVO ONE 2.0: CABEÇALHO OBJETIVO (DESKTOP & CELULAR)          */}
      {/* Título "Início" em verde-esmeralda e botão "+ Criar treino"    */}
      {/* perfeitamente alinhados verticalmente, sem dados duplicados da */}
      {/* barra lateral (sem breadcrumbs ou cartões extras).             */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between gap-3 pt-1 pb-1 sm:pb-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[#047857] tracking-tight leading-none font-sans">
          Início
        </h1>

        <Link
          href={`/consultoria/${consultancySlug}/rotinas/novo`}
          prefetch={false}
          className="min-h-[44px] px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#047857] hover:bg-[#065F46] text-white flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition-colors shrink-0 select-none cursor-pointer active:translate-y-[1px]"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Criar treino</span>
        </Link>
      </div>
    </header>
  );
}
