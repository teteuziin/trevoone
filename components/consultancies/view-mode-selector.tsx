"use client";

import React, { useTransition } from "react";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import type {
  AllowedViewModeOption,
  ConsultancyPresentationMode,
} from "@/lib/consultancies/view-mode";

export interface ViewModeSelectorProps {
  consultancySlug: string;
  effectiveMode: ConsultancyPresentationMode;
  defaultMode: ConsultancyPresentationMode;
  allowedOptions: AllowedViewModeOption[];
  className?: string;
  onSelect?: () => void;
}

export function ViewModeSelector({
  consultancySlug,
  effectiveMode,
  defaultMode,
  allowedOptions,
  className = "",
  onSelect,
}: ViewModeSelectorProps) {
  const [isPending, startTransition] = useTransition();

  if (!allowedOptions || allowedOptions.length <= 1) {
    return null;
  }

  const handleSelectMode = (mode: ConsultancyPresentationMode) => {
    if (isPending || mode === effectiveMode) return;
    startTransition(async () => {
      await setConsultancyViewModeAction(consultancySlug, mode);
      if (onSelect) onSelect();
    });
  };

  const handleResetToDefault = () => {
    if (isPending || effectiveMode === defaultMode) return;
    startTransition(async () => {
      await setConsultancyViewModeAction(consultancySlug, "DEFAULT");
      if (onSelect) onSelect();
    });
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          Alternar perfil
        </label>
        {effectiveMode !== defaultMode && (
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={isPending}
            className="text-[11px] font-bold text-[var(--brand)] hover:underline cursor-pointer focus-visible:outline-none"
          >
            Modo padrão
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Selecionar modo de experiência da consultoria"
        className="space-y-2"
      >
        {allowedOptions.map((opt) => {
          const isSelected = effectiveMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isPending}
              onClick={() => handleSelectMode(opt.mode)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs transition-all cursor-pointer min-h-[48px] select-none text-left depth-interactive ${
                isSelected
                  ? "bg-[var(--brand)]/10 text-[var(--text-primary)] border-[var(--brand)]/40 shadow-xs font-semibold"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)] font-medium"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-2xs"
                      : "border border-[var(--border-strong)] bg-[var(--surface)]"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <span className="truncate text-sm">{opt.label}</span>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                  isSelected
                    ? "bg-[var(--brand)]/15 text-[var(--brand)] border-[var(--brand)]/30"
                    : opt.isRealRole
                    ? "bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border-[var(--border-subtle)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-default)]"
                }`}
              >
                {opt.isRealRole ? "Seu perfil" : "Demonstração"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
