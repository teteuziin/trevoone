"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ExistingWorkoutPicker } from "./existing-workout-picker";

const TrainingAiImportModal = dynamic(
  () => import("./training-ai-import-modal").then((m) => m.TrainingAiImportModal),
  { ssr: false }
);

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
}: WorkoutCreationSheetProps) {
  const [isTemplateCreateSheetOpen, setIsTemplateCreateSheetOpen] = useState(false);
  const [isExistingPickerOpen, setIsExistingPickerOpen] = useState(false);
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isImportAsTemplate, setIsImportAsTemplate] = useState(false);
  const isMounted = useIsMounted();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll and handle Escape key for template sheet
  useEffect(() => {
    if (!isTemplateCreateSheetOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsTemplateCreateSheetOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTemplateCreateSheetOpen]);

  const handleCloseSheet = () => {
    setIsTemplateCreateSheetOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      {/* Top Header Actions */}
      <div className="flex items-center gap-2">
        {isTemplatesTab ? (
          /* Aba Modelos: Botão "+ Criar modelo" que abre 3 opções */
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsTemplateCreateSheetOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all font-sans cursor-pointer min-h-[38px] sm:min-h-[40px]"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Criar modelo</span>
          </button>
        ) : (
          /* Central de Treinos: "+ Criar treino" (Editor 4.0) e "Importar treino" (IA) */
          <div className="flex items-center gap-2">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              aria-label="Criar novo treino"
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all font-sans cursor-pointer min-h-[38px] sm:min-h-[40px]"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="sm:hidden">Criar</span>
              <span className="hidden sm:inline">Criar treino</span>
            </Link>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setIsImportAsTemplate(false);
                setIsAiImportModalOpen(true);
              }}
              title="Importar treino com Inteligência Artificial"
              aria-label="Importar treino com Inteligência Artificial"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#E5E8E2] shadow-2xs transition-all cursor-pointer min-h-[38px] sm:min-h-[40px] font-sans text-xs font-semibold"
            >
              <UploadIcon className="w-4 h-4 text-[#176B49]" />
              <span className="sm:hidden">Importar</span>
              <span className="hidden sm:inline">Importar treino</span>
            </button>
          </div>
        )}
      </div>

      {/* PORTAL BOTTOM SHEET / MODAL PARA CRIAR MODELO (3 OPÇÕES CLARAS) */}
      {isMounted && isTemplateCreateSheetOpen && createPortal(
        <div
          data-testid="template-creation-sheet-overlay"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={handleCloseSheet}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Criar novo modelo de treino"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white border-t sm:border border-[#E5E8E2] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#F0F2ED] flex items-center justify-between gap-3 bg-[#FAFBF9]">
              <div>
                <h3 className="text-base font-extrabold text-[#102E23] leading-tight">
                  Criar novo modelo
                </h3>
                <p className="text-xs text-[#526058] mt-0.5">
                  Como deseja criar o modelo pronto?
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSheet}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Opções Claras */}
            <div className="p-4 sm:p-5 space-y-2.5">
              {/* Opção 1: Criar do zero */}
              <Link
                href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
                onClick={() => setIsTemplateCreateSheetOpen(false)}
                className="p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none block"
              >
                <div className="w-10 h-10 rounded-xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center shrink-0 border border-[#176B49]/20">
                  <EditIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-[#102E23]">
                    1. Criar do zero
                  </h4>
                  <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
                    Abra o Editor 4.0 limpo para montar o modelo passo a passo
                  </p>
                </div>
                <span className="text-[#8C9890] text-xs font-bold">→</span>
              </Link>

              {/* Opção 2: Usar um treino existente */}
              <button
                type="button"
                onClick={() => {
                  setIsTemplateCreateSheetOpen(false);
                  setIsExistingPickerOpen(true);
                }}
                className="w-full text-left p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0 border border-purple-500/20">
                  <LayersIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-[#102E23]">
                    2. Usar um treino existente
                  </h4>
                  <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
                    Clone uma cópia de um treino seu para servir de modelo
                  </p>
                </div>
                <span className="text-[#8C9890] text-xs font-bold">→</span>
              </button>

              {/* Opção 3: Importar uma ficha */}
              <button
                type="button"
                onClick={() => {
                  setIsTemplateCreateSheetOpen(false);
                  setIsImportAsTemplate(true);
                  setIsAiImportModalOpen(true);
                }}
                className="w-full text-left p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <UploadIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-[#102E23]">
                    3. Importar uma ficha com IA
                  </h4>
                  <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
                    Envie documento, imagem ou cole texto para converter em modelo
                  </p>
                </div>
                <span className="text-[#8C9890] text-xs font-bold">→</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SUB-MODALS */}
      {isExistingPickerOpen && (
        <ExistingWorkoutPicker
          consultancySlug={consultancySlug}
          isOpen={isExistingPickerOpen}
          onClose={() => setIsExistingPickerOpen(false)}
        />
      )}

      {isAiImportModalOpen && (
        <TrainingAiImportModal
          isOpenControlled={isAiImportModalOpen}
          onCloseControlled={() => setIsAiImportModalOpen(false)}
          consultancySlug={consultancySlug}
          hideTrigger={true}
          isTemplate={isImportAsTemplate}
        />
      )}
    </>
  );
}
