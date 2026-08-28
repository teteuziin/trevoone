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
          Alternar visualização
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
        className="space-y-1.5"
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
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[44px] select-none text-left ${
                isSelected
                  ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)] shadow-2xs font-bold"
                  : "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border-default)]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isSelected ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
                  }`}
                />
                <span className="truncate">{opt.label}</span>
              </div>

              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  opt.isRealRole
                    ? "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                    : "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]"
                }`}
              >
                {opt.isRealRole ? "Seu papel" : "Demonstração"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
