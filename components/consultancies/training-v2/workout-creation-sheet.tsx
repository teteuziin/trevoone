"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileBottomSheet } from "@/components/ui/mobile";
import { WorkoutTemplatePicker } from "./workout-template-picker";
import { TrainingAiImportModal } from "./training-ai-import-modal";

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
  const [isAiModalTriggered, setIsAiModalTriggered] = useState(false);

  if (isFloating) {
    return (
      <>
        {isTemplatesTab ? (
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg active:scale-95 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Novo modelo</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Nova ficha</span>
          </button>
        )}

        {/* MOBILE BOTTOM SHEET FOR WORKOUT CREATION */}
        <MobileBottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Nova Ficha de Treino"
          subtitle="Escolha como deseja iniciar a prescrição deste treino"
        >
          <div className="space-y-3 py-1">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              onClick={() => setIsSheetOpen(false)}
              className="p-4 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none block min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <EditIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Criar do zero
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Monte uma ficha em branco adicionando categorias, exercícios e séries
                </p>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsSheetOpen(false);
                setIsTemplatePickerOpen(true);
              }}
              className="w-full text-left p-4 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <LayersIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Usar plano padrão
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Aproveite um modelo já estruturado para personalizar rapidamente
                </p>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSheetOpen(false);
                setIsAiModalTriggered(true);
              }}
              className="w-full text-left p-4 rounded-2xl bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Importar com IA
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Envie um PDF, foto ou texto e converta em ficha de treino automaticamente
                </p>
              </div>
              <span className="text-zinc-400 text-xs">→</span>
            </button>
          </div>
        </MobileBottomSheet>

        <WorkoutTemplatePicker
          consultancySlug={consultancySlug}
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
        />

        <TrainingAiImportModal
          consultancySlug={consultancySlug}
          isOpenControlled={isAiModalTriggered}
          onCloseControlled={() => setIsAiModalTriggered(false)}
          hideTrigger
        />
      </>
    );
  }

  return (
    <>
      {/* TRIGGER (Desktop & Mobile): Single clean prominent button without duplicate header clutter */}
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

      {/* MOBILE BOTTOM SHEET FOR WORKOUT CREATION */}
      <MobileBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Criar Novo Treino"
        subtitle="Escolha como deseja iniciar a prescrição deste treino"
      >
        <div className="space-y-3 py-1">
          {/* Option 1: Criar do Zero */}
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo`}
            onClick={() => setIsSheetOpen(false)}
            className="p-4 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none block min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <EditIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Criar do zero
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Monte uma ficha em branco adicionando categorias, exercícios e séries
              </p>
            </div>
            <span className="text-[var(--text-tertiary)] text-xs">→</span>
          </Link>

          {/* Option 2: Usar Plano Padrão (Template) */}
          <button
            type="button"
            onClick={() => {
              setIsSheetOpen(false);
              setIsTemplatePickerOpen(true);
            }}
            className="w-full text-left p-4 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <LayersIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Usar plano padrão
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Aproveite um modelo já estruturado para personalizar rapidamente
              </p>
            </div>
            <span className="text-[var(--text-tertiary)] text-xs">→</span>
          </button>

          {/* Option 3: Importar com IA */}
          <button
            type="button"
            onClick={() => {
              setIsSheetOpen(false);
              setIsAiModalTriggered(true);
            }}
            className="w-full text-left p-4 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] flex items-center gap-3.5 transition-all active:scale-[0.99] select-none cursor-pointer min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Importar com IA
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Envie um PDF, foto ou texto e converta em ficha de treino automaticamente
              </p>
            </div>
            <span className="text-[var(--text-tertiary)] text-xs">→</span>
          </button>
        </div>
      </MobileBottomSheet>

      {/* TEMPLATE PICKER MODAL */}
      <WorkoutTemplatePicker
        consultancySlug={consultancySlug}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      {/* AI IMPORT TRIGGER WRAPPER */}
      <TrainingAiImportModal
        consultancySlug={consultancySlug}
        isOpenControlled={isAiModalTriggered}
        onCloseControlled={() => setIsAiModalTriggered(false)}
        hideTrigger
      />
    </>
  );
}
