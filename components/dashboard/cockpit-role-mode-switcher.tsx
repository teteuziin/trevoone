"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import type {
  ConsultancyPresentationMode,
  AllowedViewModeOption,
} from "@/lib/consultancies/view-mode";

export interface CockpitRoleModeSwitcherProps {
  consultancySlug: string;
  currentMode: ConsultancyPresentationMode;
  allowedOptions?: AllowedViewModeOption[];
  onSwitch?: (mode: ConsultancyPresentationMode) => void;
  className?: string;
  compact?: boolean;
  variant?: "desktop" | "mobile" | "auto";
}

const ROLE_DISPLAY: Record<
  ConsultancyPresentationMode,
  {
    label: string;
    actionLabel: string;
    subLabel: string;
    dotColor: string;
  }
> = {
  PERSONAL: {
    label: "Treinador",
    actionLabel: "Treinador",
    subLabel: "Prescrição e alunos",
    dotColor: "bg-[#176B49]",
  },
  ADMIN: {
    label: "Administração",
    actionLabel: "Administração",
    subLabel: "Gerenciar consultoria",
    dotColor: "bg-blue-600",
  },
  NUTRITIONIST: {
    label: "Nutricionista",
    actionLabel: "Nutricionista",
    subLabel: "Planos e pacientes",
    dotColor: "bg-teal-600",
  },
  STUDENT: {
    label: "Aluno",
    actionLabel: "Modo Aluno",
    subLabel: "Visualização como aluno",
    dotColor: "bg-emerald-600",
  },
  INFLUENCER: {
    label: "Influenciador / VIP",
    actionLabel: "Influenciador",
    subLabel: "Missões e indicações",
    dotColor: "bg-purple-600",
  },
};

export function CockpitRoleModeSwitcher({
  consultancySlug,
  currentMode,
  allowedOptions,
  onSwitch,
  className = "",
}: CockpitRoleModeSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTarget, setOptimisticTarget] = useState<ConsultancyPresentationMode | null>(null);
  const [prevMode, setPrevMode] = useState(currentMode);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  };

  // Close on Escape & handle focus return
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
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

  const hasStaffRole = authorizedOptions.some(
    (o) => o.mode === "PERSONAL" || o.mode === "ADMIN" || o.mode === "NUTRITIONIST"
  );

  // If user only has 1 authorized mode or has no staff roles (student/influencer only), do not show unnecessary switcher
  if (authorizedOptions.length <= 1 || !hasStaffRole) {
    return null;
  }

  const activeMode = optimisticTarget ?? currentMode;
  const currentConfig = ROLE_DISPLAY[activeMode] || ROLE_DISPLAY.PERSONAL;

  const handleSwitch = (targetMode: ConsultancyPresentationMode) => {
    handleClose();
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
          router.push(`/consultoria/${consultancySlug}`);
          router.refresh();
        } else {
          setOptimisticTarget(null);
        }
      } catch {
        setOptimisticTarget(null);
      }
    });
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Botão Seletor de Área Compacto */}
      <button
        ref={triggerRef}
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Área de trabalho: ${currentConfig.label}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-xl border border-[#E5E8E2] bg-white hover:bg-[#F5F5F0] text-[#102E23] text-xs font-bold shadow-2xs transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#176B49] disabled:opacity-60"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${currentConfig.dotColor}`} aria-hidden="true" />
        <span className="truncate max-w-[140px] sm:max-w-none">{currentConfig.label}</span>
        {isPending ? (
          <span className="w-3 h-3 border-2 border-neutral-300 border-t-[#176B49] rounded-full animate-spin shrink-0" />
        ) : (
          <svg
            className={`w-3.5 h-3.5 text-[#6B7870] transition-transform duration-150 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Popover Compacto Alinhado ao Botão (Direita) */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Selecionar área de trabalho"
          className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E5E8E2] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          {/* Cabeçalho do Popover */}
          <div className="px-3 py-2 border-b border-[#F0F2ED] mb-1.5">
            <p className="text-[10px] font-bold text-[#6B7870] uppercase tracking-wider">
              Área de trabalho
            </p>
          </div>

          {/* Opções Autorizadas */}
          <div className="space-y-1">
            {authorizedOptions.map((opt) => {
              const cfg = ROLE_DISPLAY[opt.mode] || ROLE_DISPLAY.PERSONAL;
              const isSelected = opt.mode === activeMode;

              if (isSelected) {
                return (
                  <div
                    key={opt.mode}
                    role="option"
                    aria-selected="true"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#E8F0EA] border border-[#CDEED5] text-[#102E23] text-xs font-bold"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
                      <span className="truncate">{cfg.actionLabel}</span>
                      <span className="text-[11px] font-medium text-[#526058] shrink-0">— Área atual</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-[#176B49] shrink-0 ml-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                );
              }

              return (
                <button
                  key={opt.mode}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => handleSwitch(opt.mode)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[#102E23] hover:bg-[#F5F5F0] text-xs font-semibold transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
                    <span className="truncate font-bold">{cfg.actionLabel}</span>
                    <span className="text-[11px] text-[#6B7870] font-normal truncate">
                      — {cfg.subLabel}
                    </span>
                  </div>
                  <span className="text-sm text-[#6B7870] group-hover:text-[#176B49] group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5 font-bold">
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
