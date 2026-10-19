"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import type {
  ConsultancyPresentationMode,
  AllowedViewModeOption,
} from "@/lib/consultancies/view-mode";
import {
  DuotoneTrainingIcon,
  DuotoneOperationsIcon,
  DuotoneNutritionIcon,
  DuotoneStudentsIcon,
  DuotoneReferralsIcon,
} from "@/components/ui/icons/duotone-icons";

export interface CockpitRoleModeSwitcherProps {
  consultancySlug: string;
  currentMode: ConsultancyPresentationMode;
  allowedOptions?: AllowedViewModeOption[];
  onSwitch?: (mode: ConsultancyPresentationMode) => void;
  className?: string;
  compact?: boolean;
  variant?: "desktop" | "mobile" | "auto";
}

const MODE_CONFIG: Record<
  ConsultancyPresentationMode,
  {
    label: string;
    subtitle: string;
    dotColor: string;
    badgeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PERSONAL: {
    label: "Treinador",
    subtitle: "Prescrição de treinos e acompanhamento de alunos",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    icon: DuotoneTrainingIcon,
  },
  ADMIN: {
    label: "Administração",
    subtitle: "Gestão da consultoria, membros, financeiro e configurações",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    icon: DuotoneOperationsIcon,
  },
  NUTRITIONIST: {
    label: "Nutricionista",
    subtitle: "Planos alimentares, pacientes e prontuários",
    dotColor: "bg-teal-500",
    badgeBg: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    icon: DuotoneNutritionIcon,
  },
  STUDENT: {
    label: "Aluno",
    subtitle: "Visualização de treinos, dieta e evolução pessoal",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    icon: DuotoneStudentsIcon,
  },
  INFLUENCER: {
    label: "Influenciador / VIP",
    subtitle: "Missões, links de indicação e comissões",
    dotColor: "bg-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    icon: DuotoneReferralsIcon,
  },
};

export function CockpitRoleModeSwitcher({
  consultancySlug,
  currentMode,
  allowedOptions,
  onSwitch,
  className = "",
  compact = false,
  variant = "auto",
}: CockpitRoleModeSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTarget, setOptimisticTarget] = useState<ConsultancyPresentationMode | null>(null);
  const [prevMode, setPrevMode] = useState(currentMode);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (prevMode !== currentMode) {
    setPrevMode(currentMode);
    setOptimisticTarget(null);
  }

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filter allowed options to only real authorized roles
  const authorizedOptions = (
    allowedOptions && allowedOptions.length > 0
      ? allowedOptions.filter((o) => o.isRealRole)
      : [
          { mode: "PERSONAL" as const, label: "Treinador", isRealRole: true },
          { mode: "ADMIN" as const, label: "Administração", isRealRole: true },
        ]
  ).filter((o) => o.isRealRole);

  // If user only has 1 authorized mode, do not show unnecessary switcher
  if (authorizedOptions.length <= 1) {
    return null;
  }

  const activeMode = optimisticTarget ?? currentMode;
  const currentConfig = MODE_CONFIG[activeMode] || MODE_CONFIG.PERSONAL;
  const CurrentIcon = currentConfig.icon;

  const isMobileLayout = variant === "mobile" || (variant === "auto" && compact);

  const handleSwitch = (targetMode: ConsultancyPresentationMode) => {
    setIsOpen(false);
    if (isPending || targetMode === activeMode) return;

    setOptimisticTarget(targetMode);
    if (onSwitch) onSwitch(targetMode);

    startTransition(async () => {
      try {
        const res = await setConsultancyViewModeAction(consultancySlug, targetMode);
        if (res.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("trevo-view-mode-change", {
                detail: { mode: targetMode, slug: consultancySlug },
              })
            );
          }
          router.refresh();
        } else {
          setOptimisticTarget(null);
        }
      } catch {
        setOptimisticTarget(null);
      }
    });
  };

  // =========================================================================
  // MOBILE / COMPACT VARIANT: Trigger button + Accessible Bottom Sheet
  // =========================================================================
  if (isMobileLayout) {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl border border-neutral-200 dark:border-[#303238] bg-white dark:bg-[#151619] hover:bg-neutral-50 dark:hover:bg-[#1B1D21] text-xs font-semibold text-neutral-900 dark:text-white shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${currentConfig.dotColor}`} aria-hidden="true" />
          <CurrentIcon className="w-3.5 h-3.5 shrink-0 text-neutral-600 dark:text-neutral-300" />
          <span className="truncate max-w-[100px] sm:max-w-none">{currentConfig.label}</span>
          {isPending ? (
            <span className="w-3 h-3 border-2 border-neutral-300 border-t-[var(--brand)] rounded-full animate-spin shrink-0" />
          ) : (
            <svg
              className="w-3.5 h-3.5 text-neutral-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </button>

        {/* Mobile Accessible Bottom Sheet */}
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mode-sheet-title"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full bg-white dark:bg-[#151619] border-t border-neutral-200 dark:border-[#303238] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#252830]">
                <div>
                  <h3 id="mode-sheet-title" className="text-base font-bold text-neutral-900 dark:text-white">
                    Modo de acesso
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Selecione o modo de navegação na consultoria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors text-sm font-bold"
                  aria-label="Fechar seletor de modo"
                >
                  ✕
                </button>
              </div>

              {/* Options list */}
              <div className="space-y-2 pt-1" role="listbox">
                {authorizedOptions.map((opt) => {
                  const cfg = MODE_CONFIG[opt.mode] || MODE_CONFIG.PERSONAL;
                  const Icon = cfg.icon;
                  const isSelected = opt.mode === activeMode;

                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSwitch(opt.mode)}
                      className={`w-full min-h-[50px] p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-neutral-100 dark:bg-[#252830] border-neutral-300 dark:border-neutral-600 shadow-xs"
                          : "border-neutral-200/80 dark:border-[#252830] hover:bg-neutral-50 dark:hover:bg-[#1B1D21]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.badgeBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`}
                              aria-hidden="true"
                            />
                            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {cfg.label}
                            </p>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate mt-0.5">
                            {cfg.subtitle}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // DESKTOP SIDEBAR VARIANT: Unified selector button with clean dropdown
  // =========================================================================
  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Label discreta */}
      <span className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase px-1 mb-1 block select-none">
        Modo de acesso
      </span>

      {/* Botão de largura útil com altura mínima de 44px */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-200 dark:border-[#303238] bg-white hover:bg-neutral-50 dark:bg-[#151619] dark:hover:bg-[#1B1D21] transition-all flex items-center justify-between gap-2.5 shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed group text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${currentConfig.dotColor}`} aria-hidden="true" />
          <CurrentIcon className="w-4 h-4 shrink-0 text-neutral-600 dark:text-neutral-300" />
          <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
            {currentConfig.label}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {isPending ? (
            <span
              className="w-3.5 h-3.5 border-2 border-neutral-300 dark:border-neutral-600 border-t-[var(--brand)] rounded-full animate-spin shrink-0"
              aria-label="Alternando perfil..."
            />
          ) : (
            <svg
              className={`w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </div>
      </button>

      {/* Desktop Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-xl bg-white dark:bg-[#1B1D21] border border-neutral-200 dark:border-[#303238] shadow-xl space-y-1 animate-in fade-in duration-100"
        >
          {authorizedOptions.map((opt) => {
            const cfg = MODE_CONFIG[opt.mode] || MODE_CONFIG.PERSONAL;
            const Icon = cfg.icon;
            const isSelected = opt.mode === activeMode;

            return (
              <button
                key={opt.mode}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSwitch(opt.mode)}
                className={`w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-neutral-100 dark:bg-[#252830] text-neutral-900 dark:text-white font-bold"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
                  <Icon className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  <span className="truncate">{cfg.label}</span>
                </div>

                {isSelected && (
                  <svg
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
