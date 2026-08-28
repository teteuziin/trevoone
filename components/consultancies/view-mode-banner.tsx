"use client";

import React, { useTransition } from "react";
import { setConsultancyViewModeAction } from "@/app/consultoria/[slug]/view-mode/actions";
import { PRESENTATION_MODE_LABELS, type ConsultancyPresentationMode } from "@/lib/consultancies/view-mode";
import { Button } from "@/components/ui/button";

export interface ViewModeBannerProps {
  consultancySlug: string;
  effectiveMode: ConsultancyPresentationMode;
  defaultMode: ConsultancyPresentationMode;
}

export function ViewModeBanner({
  consultancySlug,
  effectiveMode,
  defaultMode,
}: ViewModeBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleResetMode = () => {
    if (isPending) return;
    startTransition(async () => {
      await setConsultancyViewModeAction(consultancySlug, "DEFAULT");
    });
  };

  const modeLabel = PRESENTATION_MODE_LABELS[effectiveMode] || effectiveMode;
  const defaultLabel = PRESENTATION_MODE_LABELS[defaultMode] || defaultMode;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[var(--brand-soft)] border-b border-[var(--brand-soft-border)] text-[var(--brand-foreground)] px-4 py-2.5 sm:px-6 shadow-2xs"
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 px-2 py-0.5 rounded-md bg-[var(--brand)] text-[var(--text-inverse)] font-bold text-[10px] uppercase tracking-wider">
            Demonstração
          </span>
          <p className="font-semibold truncate">
            Visualizando a experiência de <strong>{modeLabel}</strong>. Nenhuma ação ou dado real de aluno é modificado.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            isLoading={isPending}
            onClick={handleResetMode}
            className="h-8 px-3 text-xs font-bold border-[var(--brand-soft-border)] bg-[var(--surface)] text-[var(--brand-foreground)] hover:bg-[var(--brand-soft)] transition-colors min-h-[36px]"
          >
            Voltar para {defaultLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
