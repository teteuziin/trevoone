"use client";

import React from "react";
import Link from "next/link";

export interface StudentOverviewHeaderProps {
  consultancySlug: string;
  consultancyName: string;
  userName: string;
  isInfluencer?: boolean;
  isVip?: boolean;
}

export function StudentOverviewHeader({
  consultancySlug,
  consultancyName,
  userName,
  isInfluencer = false,
  isVip = false,
}: StudentOverviewHeaderProps) {
  return (
    <div className="w-full">
      {/* Header Card Sólido Executivo no padrão Cockpit Compacto */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            {/* Linha de status com ponto verde e contexto */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
              <span className="text-[11px] sm:text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                Acompanhamento do Aluno · {consultancyName}
              </span>
              {isVip && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  VIP
                </span>
              )}
              {isInfluencer && !isVip && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Parceiro
                </span>
              )}
            </div>

            {/* Título forte e identificação única */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">
                Meu acompanhamento
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A7B4]">
                Aluno: <strong className="text-white font-semibold">{userName}</strong>
              </p>
            </div>
          </div>

          {/* Atalho rápido secundário */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/consultoria/${consultancySlug}/treinos`}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
            >
              <span>Ver treinos</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
