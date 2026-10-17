"use client";

import React, { useTransition } from "react";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import type { ConsultancyPresentationMode } from "@/lib/consultancies/view-mode";

interface CockpitRoleModeSwitcherProps {
  consultancySlug: string;
  currentMode: ConsultancyPresentationMode;
  onSwitch?: (mode: ConsultancyPresentationMode) => void;
  className?: string;
  compact?: boolean;
}

export function CockpitRoleModeSwitcher({
  consultancySlug,
  currentMode,
  onSwitch,
  className = "",
  compact = false,
}: CockpitRoleModeSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const isCoach = currentMode === "PERSONAL";
  const isAdmin = currentMode === "ADMIN";

  const handleSwitch = (targetMode: ConsultancyPresentationMode) => {
    if (isPending || targetMode === currentMode) return;
    if (onSwitch) onSwitch(targetMode);
    startTransition(async () => {
      await setConsultancyViewModeAction(consultancySlug, targetMode);
    });
  };

  return (
    <div
      role="group"
      aria-label="Alternar modo de operação da consultoria"
      className={`inline-flex items-center p-1 rounded-xl bg-[#0E0F12] border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] select-none ${className}`}
    >
      {/* Botão Treinador */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleSwitch("PERSONAL")}
        aria-pressed={isCoach}
        className={`relative inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer ${
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm"
        } ${
          isCoach
            ? "bg-gradient-to-b from-[#282B33] to-[#181A1F] text-white border-t border-white/[0.22] border-b border-black/80 shadow-[0_3px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
            : "text-[#8E95A2] hover:text-white hover:bg-white/[0.04]"
        } active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            isCoach
              ? "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              : "bg-neutral-600"
          }`}
          aria-hidden="true"
        />
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9l3-3 2 2-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 20l3-3 2 2-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 10.5l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 21.5l4-4" />
        </svg>
        <span>Treinador</span>
      </button>

      {/* Botão Administração */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleSwitch("ADMIN")}
        aria-pressed={isAdmin}
        className={`relative inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer ${
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm"
        } ${
          isAdmin
            ? "bg-gradient-to-b from-[#282B33] to-[#181A1F] text-white border-t border-white/[0.22] border-b border-black/80 shadow-[0_3px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
            : "text-[#8E95A2] hover:text-white hover:bg-white/[0.04]"
        } active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            isAdmin
              ? "bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              : "bg-neutral-600"
          }`}
          aria-hidden="true"
        />
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <span>Administração</span>
      </button>

      {/* Indicador de carregamento suave */}
      {isPending && (
        <span
          className="ml-2 w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0"
          aria-label="Alternando perfil..."
        />
      )}
    </div>
  );
}
