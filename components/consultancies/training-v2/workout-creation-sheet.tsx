"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
    <div className="space-y-2.5 py-1">
      {/* 1. Criar diretamente */}
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/novo`}
        onClick={() => setIsSheetOpen(false)}
        className="p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none block min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center shrink-0 border border-[#176B49]/20">
          <EditIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[#102E23]">
            Criar ficha em branco
          </h4>
          <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
            Monte a ficha no novo editor com divisões e biblioteca de exercícios
          </p>
        </div>
        <span className="text-[#8C9890] text-xs font-bold">→</span>
      </Link>

      {/* 2. Criar com IA */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsAiGenerateModalOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center shrink-0 border border-[#176B49]/20">
          <SparklesIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[#102E23]">
            Gerar com Inteligência Artificial
          </h4>
          <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
            Descreva o perfil do aluno e objetivo para a IA estruturar a rotina
          </p>
        </div>
        <span className="text-[#8C9890] text-xs font-bold">→</span>
      </button>

      {/* 3. Aproveitar de um modelo */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsTemplatePickerOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0 border border-purple-500/20">
          <LayersIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[#102E23]">
            Aproveitar de um modelo
          </h4>
          <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
            Comece a partir de um dos seus modelos pré-configurados
          </p>
        </div>
        <span className="text-[#8C9890] text-xs font-bold">→</span>
      </button>

      {/* 4. Importar treino */}
      <button
        type="button"
        onClick={() => {
          setIsSheetOpen(false);
          setIsAiImportModalOpen(true);
        }}
        className="w-full text-left p-4 rounded-2xl bg-[#FDFDFC] hover:bg-[#F5F5F0] border border-[#E5E8E2] flex items-center gap-3.5 transition-all select-none cursor-pointer min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-500/20">
          <UploadIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[#102E23]">
            Importar texto ou ficha existente
          </h4>
          <p className="text-xs text-[#526058] mt-0.5 leading-relaxed">
            Cole um texto de treino para importar os exercícios automaticamente
          </p>
        </div>
        <span className="text-[#8C9890] text-xs font-bold">→</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Trigger Button */}
      {isFloating ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#176B49] hover:bg-[#12583B] text-white shadow-lg active:scale-95 transition-all cursor-pointer font-sans"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{isTemplatesTab ? "Novo modelo" : "Criar treino"}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {isTemplatesTab ? (
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
              aria-label="Criar novo modelo de treino"
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all font-sans cursor-pointer min-h-[38px] sm:min-h-[40px]"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="sm:hidden">Criar</span>
              <span className="hidden sm:inline">Novo modelo</span>
            </Link>
          ) : (
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
                onClick={() => setIsAiGenerateModalOpen(true)}
                title="Criar treino com Inteligência Artificial"
                aria-label="Criar treino com Inteligência Artificial"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#E5E8E2] shadow-2xs transition-all cursor-pointer min-h-[38px] sm:min-h-[40px] font-sans text-xs font-semibold"
              >
                <SparklesIcon className="w-4 h-4 text-[#176B49]" />
                <span className="sm:hidden">IA</span>
                <span className="hidden sm:inline">Criar com IA</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PORTAL BOTTOM SHEET: Strictly z-[70] above all bottom bars and top headers */}
      {isMounted && isSheetOpen && createPortal(
        <div
          data-testid="workout-creation-sheet-overlay"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nova ficha de treino"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white border-t sm:border border-[#E5E8E2] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#F0F2ED] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center font-bold">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#102E23] leading-tight">
                    {isTemplatesTab ? "Criar novo modelo" : "Como deseja criar a ficha?"}
                  </h3>
                  <p className="text-xs text-[#526058] mt-0.5">
                    Escolha a melhor forma de iniciar a prescrição
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="p-1.5 text-[#8C9890] hover:text-[#102E23] rounded-xl hover:bg-[#F5F5F0] transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {renderOptions()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SUB-MODALS */}
      {isTemplatePickerOpen && (
        <WorkoutTemplatePicker
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          consultancySlug={consultancySlug}
        />
      )}

      {isAiGenerateModalOpen && (
        <TrainingAiGenerateModal
          isOpen={isAiGenerateModalOpen}
          onClose={() => setIsAiGenerateModalOpen(false)}
          consultancySlug={consultancySlug}
        />
      )}

      {isAiImportModalOpen && (
        <TrainingAiImportModal
          isOpenControlled={isAiImportModalOpen}
          onCloseControlled={() => setIsAiImportModalOpen(false)}
          consultancySlug={consultancySlug}
          hideTrigger={true}
        />
      )}
    </>
  );
}
