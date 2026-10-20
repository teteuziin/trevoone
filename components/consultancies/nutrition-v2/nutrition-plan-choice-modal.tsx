"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export type NutritionPlanCreationChoice = "manual" | "ai-scratch" | "ai-import" | "template";

interface NutritionPlanChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: NutritionPlanCreationChoice) => void;
  isTemplatesTab?: boolean;
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PencilSquareIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function SparklesIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function ArrowUpTrayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function Squares2x2Icon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

export function NutritionPlanChoiceModal({
  isOpen,
  onClose,
  onSelectOption,
  isTemplatesTab = false,
}: NutritionPlanChoiceModalProps) {
  const mounted = useIsMounted();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button initially for fast keyboard accessibility
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const modalTitle = isTemplatesTab ? "Novo modelo de plano" : "Novo plano alimentar";

  return createPortal(
    <div
      data-testid="nutrition-plan-choice-modal-overlay"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-modal-title"
        aria-describedby="choice-modal-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full sm:max-w-2xl bg-white dark:bg-[#151619] border-t sm:border border-[#E5E7EB] dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl h-auto max-h-[85dvh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200 overflow-hidden"
      >
        {/* Mobile Drag Indicator */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-[#303238]" />
        </div>

        {/* Header: Title ~20px + Subtitle 14px + Close Button >= 44x44px */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h2
              id="choice-modal-title"
              className="text-lg sm:text-xl font-bold sm:font-black text-[#17191D] dark:text-white leading-tight tracking-tight"
            >
              {modalTitle}
            </h2>
            <p
              id="choice-modal-description"
              className="text-sm text-[#6B7280] dark:text-[#8E95A2] mt-0.5 sm:mt-1 leading-snug"
            >
              Como deseja começar?
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-[#6B7280] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Options: 1 column on mobile with 10-12px gap, 2 columns on desktop with 16px gap */}
        <div className="px-4 sm:px-6 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
            {/* 1. CRIAR MANUALMENTE */}
            <button
              type="button"
              onClick={() => onSelectOption("manual")}
              className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151619]"
            >
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform mt-0.5 outline-none ring-0">
                <PencilSquareIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#17191D] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                  Criar manualmente
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  Monte as refeições e porções.
                </p>
              </div>
            </button>

            {/* 2. CRIAR DO ZERO COM IA */}
            <button
              type="button"
              onClick={() => onSelectOption("ai-scratch")}
              className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151619]"
            >
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform mt-0.5 outline-none ring-0">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#17191D] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                  Criar do zero com IA
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  {isTemplatesTab ? "Descreva o modelo que deseja criar." : "Descreva o plano que deseja criar."}
                </p>
              </div>
            </button>

            {/* 3. IMPORTAR COM IA */}
            <button
              type="button"
              onClick={() => onSelectOption("ai-import")}
              className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-purple-500/50 dark:hover:border-purple-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151619]"
            >
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform mt-0.5 outline-none ring-0">
                <ArrowUpTrayIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#17191D] dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
                  Importar com IA
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  {isTemplatesTab ? "Importe um plano para transformar em modelo." : "Importe um plano para revisar."}
                </p>
              </div>
            </button>

            {/* 4. USAR MODELO */}
            <button
              type="button"
              onClick={() => onSelectOption("template")}
              className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-blue-500/50 dark:hover:border-blue-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3 group cursor-pointer shadow-xs outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151619]"
            >
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform mt-0.5 outline-none ring-0">
                <Squares2x2Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-[#17191D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  Usar modelo
                </h3>
                <p className="text-sm text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  {isTemplatesTab ? "Escolha um modelo base para personalizar." : "Escolha um modelo e personalize."}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
