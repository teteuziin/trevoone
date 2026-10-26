"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { WorkoutTemplatePicker } from "./workout-template-picker";

const TrainingAiImportModal = dynamic(
  () => import("./training-ai-import-modal").then((m) => m.TrainingAiImportModal),
  { ssr: false }
);
const TrainingAiGenerateModal = dynamic(
  () => import("./training-ai-generate-modal").then((m) => m.TrainingAiGenerateModal),
  { ssr: false }
);

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function UploadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

type WorkoutCreationSheetProps = {
  consultancySlug: string;
  isTemplatesTab?: boolean;
  isFloating?: boolean;
};

export function WorkoutCreationSheet({
  consultancySlug,
  isTemplatesTab = false,
  isFloating = false,
}: WorkoutCreationSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isAiGenerateModalOpen, setIsAiGenerateModalOpen] = useState(false);
  const isMounted = useIsMounted();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isSheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsSheetOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSheetOpen]);

  const handleClose = () => {
    setIsSheetOpen(false);
    triggerRef.current?.focus();
  };

  const renderOptions = () => (
    <div className="space-y-3 py-1">
      {/* 1. Criar manualmente */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        onClick={() => setIsSheetOpen(false)}
        className="p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none block min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <EditIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Criar manualmente
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Monte uma ficha em branco escolhendo blocos e exercícios
          </p>
        </div>
        <span className="text-zinc-400 text-xs font-bold">→</span>
      </Link>

      {/* 2. Criar do zero com IA */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsAiGenerateModalOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Criar do zero com IA
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Descreva o treino e deixe a IA estruturar a ficha completa
          </p>
        </div>
        <span className="text-zinc-400 text-xs font-bold">→</span>
      </button>

      {/* 3. Importar com IA */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsAiImportModalOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
          <UploadIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Importar com IA
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Envie um PDF, foto ou texto e converta em ficha de treino automaticamente
          </p>
        </div>
        <span className="text-zinc-400 text-xs font-bold">→</span>
      </button>

      {/* 4. Usar modelo */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsTemplatePickerOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
          <LayersIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
            Usar modelo
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Aproveite um modelo já estruturado para personalizar rapidamente
          </p>
        </div>
        <span className="text-zinc-400 text-xs font-bold">→</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Trigger Button */}
      {isFloating ? (
        isTemplatesTab ? (
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg active:scale-95 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Novo modelo</span>
          </Link>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Nova ficha</span>
          </button>
        )
      ) : (
        <div className="w-full sm:w-auto">
          {isTemplatesTab ? (
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
              className="w-full sm:w-auto inline-block"
            >
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto font-bold min-h-[42px] px-5 shadow-sm flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Novo modelo</span>
              </Button>
            </Link>
          ) : (
            <Button
              ref={triggerRef}
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsSheetOpen(true)}
              className="w-full sm:w-auto font-bold min-h-[42px] px-5 shadow-sm flex items-center justify-center gap-2 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nova ficha</span>
            </Button>
          )}
        </div>
      )}

      {/* PORTAL BOTTOM SHEET: Stricty z-[70] above all bottom bars and top headers */}
      {isMounted && isSheetOpen && createPortal(
        <div
          data-testid="workout-creation-sheet-overlay"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nova ficha"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200 overflow-hidden"
          >
            {/* Compact Header: title "Nova ficha" + close button >= 44x44px. No drag handle. */}
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
              <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                Nova ficha
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar painel"
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center cursor-pointer transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content: 16px padding, 12px gap, safe area bottom */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {renderOptions()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-Modals for creation options */}
      <WorkoutTemplatePicker
        consultancySlug={consultancySlug}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      <TrainingAiGenerateModal
        consultancySlug={consultancySlug}
        isOpen={isAiGenerateModalOpen}
        onClose={() => setIsAiGenerateModalOpen(false)}
      />

      <TrainingAiImportModal
        consultancySlug={consultancySlug}
        isOpenControlled={isAiImportModalOpen}
        onCloseControlled={() => setIsAiImportModalOpen(false)}
        hideTrigger
      />
    </>
  );
}
