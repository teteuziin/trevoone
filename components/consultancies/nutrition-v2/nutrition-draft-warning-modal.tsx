"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

interface NutritionDraftWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  editorHref: string;
}

function WarningTriangleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function NutritionDraftWarningModal({
  isOpen,
  onClose,
  planTitle,
  editorHref,
}: NutritionDraftWarningModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-warning-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full sm:max-w-md bg-white dark:bg-[#151619] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E5E7EB] dark:border-[#303238] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#303238]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
              <WarningTriangleIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 id="draft-warning-title" className="text-sm sm:text-base font-bold text-[#17191D] dark:text-white">
                Plano em rascunho
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] truncate max-w-[240px]">
                {planTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3 text-xs sm:text-sm text-[#4B5563] dark:text-[#C2C8CF] leading-relaxed">
          <p className="font-semibold text-[#17191D] dark:text-white">
            Este plano precisa ser revisado e publicado antes do envio.
          </p>
          <p>
            Ele ainda está em fase de edição (versão rascunho). Para que o paciente receba a prescrição correta no aplicativo, abra o editor para conferir os alimentos, as quantidades e publique a versão definitiva.
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <span className="font-bold">Regra:</span>
            <span>Versões rascunho não são enviadas silenciosamente para proteger a segurança nutricional do paciente.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[#E5E7EB] dark:border-[#303238] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
          >
            Voltar
          </button>
          <Link
            href={editorHref}
            prefetch={false}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <span>Revisar plano</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
