"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  DuotoneStudentsIcon,
  DuotoneTrainingIcon,
  DuotoneExercisesIcon,
} from "@/components/ui/icons/duotone-icons";
import { TrainingAiImportModal } from "@/components/consultancies/training-v2/training-ai-import-modal";
import { TrainingAiGenerateModal } from "@/components/consultancies/training-v2/training-ai-generate-modal";
import { WorkoutTemplatePicker } from "@/components/consultancies/training-v2/workout-template-picker";

export interface PersonalOverviewHeaderProps {
  consultancySlug: string;
  totalStudents?: number | null;
  totalWorkouts?: number | null;
  prescribedBlocksCount?: number | null;
}

function PencilClipboardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function DocumentUploadIcon({ className = "w-5 h-5" }: { className?: string }) {
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

function SparklesWandIcon({ className = "w-5 h-5" }: { className?: string }) {
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

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LayersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function PersonalOverviewHeader({
  consultancySlug,
  totalStudents,
  totalWorkouts,
  prescribedBlocksCount = 0,
}: PersonalOverviewHeaderProps) {
  const blocksCount = prescribedBlocksCount ?? 0;

  const displayStudents =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayPlans =
    totalWorkouts !== undefined && totalWorkouts !== null ? totalWorkouts : "—";

  // Modals & Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isImportAiOpen, setIsImportAiOpen] = useState(false);
  const [isGenerateAiOpen, setIsGenerateAiOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!isMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  // Initial focus on close button, Escape key handler, Tab focus trap
  useEffect(() => {
    if (!isMenuOpen) return;

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseMenu();
        return;
      }
      if (e.key === "Tab") {
        if (!sheetContentRef.current) return;
        const focusable = sheetContentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, handleCloseMenu]);

  return (
    <div className="w-full">
      {/* 1. Header Card Sólido Executivo com Indicadores Integrados Compactos */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                Treinador · Painel de Prescrição
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Visão geral dos treinos
            </h1>
          </div>

          {/* Ações Desktop & Mobile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsImportAiOpen(true)}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm"
            >
              <DocumentUploadIcon className="w-4 h-4 text-[#8E95A2]" />
              <span>Importar treino</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setIsMenuOpen(true);
              }}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none"
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
              aria-label="Opções para criar nova ficha"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nova ficha</span>
            </button>
          </div>
        </div>

        {/* Linha de Indicadores Compactos Integrados (sem blocos gigantes separados) */}
        <div className="mt-5 pt-4 border-t border-[#303238] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-blue-500/50 flex items-center justify-center shrink-0">
              <DuotoneStudentsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors font-mono tabular-nums">
                  {displayStudents}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">alunos sob gestão</span>
              </div>
              <span className="text-[11px] text-blue-400 group-hover:underline block truncate font-medium">
                Ver alunos →
              </span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-orange-500/50 flex items-center justify-center shrink-0">
              <DuotoneTrainingIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-orange-400 transition-colors font-mono tabular-nums">
                  {displayPlans}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">fichas ativas</span>
              </div>
              <span className="text-[11px] text-orange-400 group-hover:underline block truncate font-medium">
                Ver todas →
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 p-2.5 rounded-xl sm:border-l sm:border-[#303238]/60 sm:pl-4">
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] flex items-center justify-center shrink-0">
              <DuotoneExercisesIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white font-mono tabular-nums">
                  {blocksCount}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">blocos em uso</span>
              </div>
              <span className="text-[11px] text-[#8E95A2] block truncate font-medium">
                Prescritos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Fixo Mobile (Nova ficha) que abre as 3 opções */}
      <button
        type="button"
        onClick={(e) => {
          triggerRef.current = e.currentTarget;
          setIsMenuOpen(true);
        }}
        aria-label="Abrir opções de nova ficha de treino"
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        className="md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 min-h-[48px] px-5 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg select-none cursor-pointer focus:outline-none active:translate-y-[2px] transition-transform"
      >
        <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nova ficha</span>
      </button>

      {/* Menu Vertical de 3 Opções (Modal / Bottom Sheet com superfícies sólidas acima da navegação via Portal) */}
      {mounted && isMenuOpen && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={handleCloseMenu}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-workout-menu-title"
        >
          <div
            ref={sheetContentRef}
            className="w-full sm:max-w-md max-h-[90dvh] flex flex-col bg-white dark:bg-[#151619] border-t sm:border border-[#E5E7EB] dark:border-[#303238] rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 overflow-hidden text-[#17191D] dark:text-[#E5E7EB]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Nova ficha + Botão Fechar (mínimo 44x44px) */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E5E7EB] dark:border-[#303238] shrink-0">
              <h2 id="new-workout-menu-title" className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white">
                Nova ficha
              </h2>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleCloseMenu}
                className="p-2 rounded-xl text-[#6B7280] hover:text-[#17191D] dark:text-[#8E95A2] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fechar"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Quatro Opções em Largura Total, min-height 72px cada, gap 12px, safe-area-inset-bottom */}
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5">
              {/* Opção 1: Criar manualmente */}
              <Link
                href={`/consultoria/${consultancySlug}/rotinas/novo`}
                prefetch={false}
                onClick={handleCloseMenu}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] dark:bg-[#1B1D21] dark:hover:bg-[#222429] border border-[#E5E7EB] dark:border-[#303238] transition-colors group min-h-[72px] h-auto select-none cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <PencilClipboardIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#17191D] dark:text-white leading-tight">
                    Criar manualmente
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-normal">
                    Monte uma ficha em branco escolhendo blocos e exercícios.
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
              </Link>

              {/* Opção 2: Criar do zero com IA */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsGenerateAiOpen(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] dark:bg-[#1B1D21] dark:hover:bg-[#222429] border border-[#E5E7EB] dark:border-[#303238] transition-colors group min-h-[72px] h-auto select-none cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <SparklesWandIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#17191D] dark:text-white leading-tight">
                    Criar do zero com IA
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-normal">
                    Descreva o treino e deixe a IA estruturar a ficha completa.
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
              </button>

              {/* Opção 3: Importar com IA */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsImportAiOpen(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] dark:bg-[#1B1D21] dark:hover:bg-[#222429] border border-[#E5E7EB] dark:border-[#303238] transition-colors group min-h-[72px] h-auto select-none cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <DocumentUploadIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#17191D] dark:text-white leading-tight">
                    Importar com IA
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-normal">
                    Transforme um PDF, foto ou texto em ficha de treino.
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
              </button>

              {/* Opção 4: Usar modelo */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsTemplatePickerOpen(true);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F9FAFB] hover:bg-[#F3F4F6] dark:bg-[#1B1D21] dark:hover:bg-[#222429] border border-[#E5E7EB] dark:border-[#303238] transition-colors group min-h-[72px] h-auto select-none cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <LayersIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#17191D] dark:text-white leading-tight">
                    Usar modelo
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] mt-1 leading-normal">
                    Aproveite um modelo já estruturado para personalizar rapidamente.
                  </p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 1: Importar com IA */}
      <TrainingAiImportModal
        consultancySlug={consultancySlug}
        isOpenControlled={isImportAiOpen}
        onCloseControlled={() => setIsImportAiOpen(false)}
        hideTrigger={true}
      />

      {/* Modal 2: Criar do zero com IA */}
      <TrainingAiGenerateModal
        consultancySlug={consultancySlug}
        isOpen={isGenerateAiOpen}
        onClose={() => setIsGenerateAiOpen(false)}
      />

      {/* Modal 3: Usar modelo */}
      <WorkoutTemplatePicker
        consultancySlug={consultancySlug}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />
    </div>
  );
}
