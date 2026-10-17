"use client";

import React, { useTransition } from "react";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import type { ConsultancyPresentationMode } from "@/lib/consultancies/view-mode";
import {
  DuotoneTrainingIcon,
  DuotoneOperationsIcon,
} from "@/components/ui/icons/duotone-icons";

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
      className={`inline-flex items-center p-1 rounded-xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-xs select-none ${className}`}
    >
      {/* Botão Treinador */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleSwitch("PERSONAL")}
        aria-pressed={isCoach}
        className={`relative inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm"
        } ${
          isCoach
            ? "bg-[#F0F1F3] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#303238] shadow-xs font-semibold"
            : "text-[#4B5563] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] border border-transparent font-medium"
        } active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
            isCoach ? "bg-[#10B981]" : "bg-neutral-400 dark:bg-neutral-600"
          }`}
          aria-hidden="true"
        />
        <DuotoneTrainingIcon className="w-4 h-4 shrink-0" />
        <span>Treinador</span>
      </button>

      {/* Botão Administração */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleSwitch("ADMIN")}
        aria-pressed={isAdmin}
        className={`relative inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs sm:text-sm"
        } ${
          isAdmin
            ? "bg-[#F0F1F3] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#303238] shadow-xs font-semibold"
            : "text-[#4B5563] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] border border-transparent font-medium"
        } active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span
          className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
            isAdmin ? "bg-[#3B82F6]" : "bg-neutral-400 dark:bg-neutral-600"
          }`}
          aria-hidden="true"
        />
        <DuotoneOperationsIcon className="w-4 h-4 shrink-0" />
        <span>Administração</span>
      </button>

      {/* Indicador de carregamento suave */}
      {isPending && (
        <span
          className="ml-2 w-3.5 h-3.5 border-2 border-neutral-300 dark:border-neutral-600 border-t-[#10B981] rounded-full animate-spin shrink-0"
          aria-label="Alternando perfil..."
        />
      )}
    </div>
  );
}
