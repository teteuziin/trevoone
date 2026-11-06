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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PersonalHeader({
  consultancyName = "Consultoria",
  consultancySlug,
  userName = "Treinador",
  userAvatarUrl,
  className = "",
}: PersonalHeaderProps) {
  const initials = getInitials(userName);

  return (
    <header className={`w-full space-y-3.5 sm:space-y-4 ${className}`}>
      {/* 1. Barra Superior Editorial (Contexto Consultoria + Perfil) */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E6E9E2]">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="font-bold text-[#102E23]">{consultancyName}</span>
          <span className="text-[#8E9B93]" aria-hidden="true">|</span>
          <span className="text-[#526058] font-medium">Trevo One</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs font-bold text-[#102E23] leading-tight">{userName}</p>
            <p className="text-[11px] text-[#526058] font-medium">Treinador</p>
          </div>
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover border border-[#102E23]/20 shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-[#102E23] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs select-none"
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* 2. Título "Início" e Botão "+ Criar treino" */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102E23] tracking-tight leading-none font-sans">
            Início
          </h1>
          <p className="text-xs sm:text-sm text-[#526058] font-medium mt-1.5">
            Suas prioridades e atividades em andamento.
          </p>
        </div>

        <Link
          href={`/consultoria/${consultancySlug}/rotinas/novo`}
          prefetch={false}
          aria-label="Criar novo treino"
          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#102E23] hover:bg-[#176B49] text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 select-none cursor-pointer active:translate-y-[1px]"
        >
          <PlusIcon className="w-4 h-4 stroke-[2.5]" />
          <span>Criar treino</span>
        </Link>
      </div>
    </header>
  );
}
