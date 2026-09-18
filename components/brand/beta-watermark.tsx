import React from "react";

interface BetaWatermarkProps {
  className?: string;
}

/**
 * BetaWatermark
 * Marca d'água institucional discreta "TREVO ONE · BETA V1" presente em todo o produto.
 * 
 * Diretrizes:
 * - Visual: Pequeno, elegante, institucional, baixo contraste.
 * - Opacidade: Light 22% (18%-28%), Dark 18% (16%-24%).
 * - Posicionamento: Fixo, canto inferior direito (no mobile posicionado acima da bottom bar e respeitando safe-area).
 * - Acessibilidade: aria-hidden="true", pointer-events: none, não entra no fluxo de foco.
 * - Cobertura: Integrado globalmente ao layout raiz (app/layout.tsx) e páginas estáticas offline.
 */
export function BetaWatermark({ className = "" }: BetaWatermarkProps) {
  return (
    <div
      data-trevo-beta-watermark="true"
      aria-hidden="true"
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-3.5 right-3.5 sm:right-5 z-20 pointer-events-none select-none print:hidden transition-opacity duration-300 ${className}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--foreground)] opacity-[0.22] dark:opacity-[0.18] bg-[var(--surface-subtle)]/30 border border-[var(--border-subtle)]/40 backdrop-blur-[2px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] opacity-80 shrink-0" />
        <span className="shrink-0">TREVO ONE</span>
        <span className="opacity-40 shrink-0">·</span>
        <span className="shrink-0">BETA V1</span>
      </div>
    </div>
  );
}
