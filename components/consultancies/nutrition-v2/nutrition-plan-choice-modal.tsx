"use client";

import React, { useEffect, useRef } from "react";

export type NutritionPlanCreationChoice = "manual" | "ai-scratch" | "ai-import" | "template";

interface NutritionPlanChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: NutritionPlanCreationChoice) => void;
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
}: NutritionPlanChoiceModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      aria-labelledby="choice-modal-title"
    >
      <div
        ref={containerRef}
        className="relative w-full sm:max-w-2xl bg-white dark:bg-[#151619] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E5E7EB] dark:border-[#303238] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#303238]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div>
            <h2 id="choice-modal-title" className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
              Como deseja criar o plano?
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-0.5">
              Escolha a melhor forma de iniciar a prescrição nutricional
            </p>
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

        {/* Options Grid: Desktop 2 cols / Mobile 1 col */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 1. CRIAR MANUALMENTE */}
            <button
              type="button"
              onClick={() => onSelectOption("manual")}
              className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/50 group-hover:scale-105 transition-transform mt-0.5">
                <PencilSquareIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-sm text-[#17191D] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Criar manualmente
                  </h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#282B32] text-slate-600 dark:text-slate-300">
                    Controle total
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  Monte as refeições e escolha os alimentos diretamente no editor clínico.
                </p>
              </div>
            </button>

            {/* 2. CRIAR DO ZERO COM IA */}
            <button
              type="button"
              onClick={() => onSelectOption("ai-scratch")}
              className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 group-hover:scale-105 transition-transform mt-0.5">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-sm text-[#17191D] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Criar do zero com IA
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    IA Avançada
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  Descreva o plano que deseja montar e deixe a IA calcular os nutrientes.
                </p>
              </div>
            </button>

            {/* 3. IMPORTAR COM IA */}
            <button
              type="button"
              onClick={() => onSelectOption("ai-import")}
              className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-purple-500/50 dark:hover:border-purple-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/25 group-hover:scale-105 transition-transform mt-0.5">
                <ArrowUpTrayIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-sm text-[#17191D] dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Importar com IA
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    PDF / Texto
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  Transforme um plano existente em um rascunho editável automaticamente.
                </p>
              </div>
            </button>

            {/* 4. USAR MODELO */}
            <button
              type="button"
              onClick={() => onSelectOption("template")}
              className="p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] hover:bg-[#F9FAFB] dark:hover:bg-[#22242A] hover:border-blue-500/50 dark:hover:border-blue-500/50 active:scale-[0.99] transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25 group-hover:scale-105 transition-transform mt-0.5">
                <Squares2x2Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-bold text-sm text-[#17191D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Usar modelo
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Base pronta
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-relaxed">
                  Comece com um modelo disponível da consultoria e adapte conforme a necessidade.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[#E5E7EB] dark:border-[#303238] flex items-center justify-end bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
