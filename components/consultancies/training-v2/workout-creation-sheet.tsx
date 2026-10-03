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
};

export function WorkoutCreationSheet({
  consultancySlug,
  isTemplatesTab = false,
}: WorkoutCreationSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isAiModalTriggered, setIsAiModalTriggered] = useState(false);

  return (
    <>
      {/* MOBILE TRIGGER: Single prominent + Novo treino / + Novo modelo */}
      <div className="sm:hidden w-full">
        {isTemplatesTab ? (
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`}
            className="w-full block"
          >
            <Button
              variant="primary"
              size="md"
              className="w-full font-bold min-h-[46px] shadow-sm flex items-center justify-center gap-2"
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
            className="w-full font-bold min-h-[46px] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Novo treino</span>
          </Button>
        )}
      </div>

      {/* DESKTOP BUTTONS: Unchanged side-by-side buttons */}
      <div className="hidden sm:flex items-center gap-2.5 shrink-0 flex-wrap">
        {!isTemplatesTab && (
          <>
            <TrainingAiImportModal consultancySlug={consultancySlug} />
            <button
              type="button"
              onClick={() => setIsTemplatePickerOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)] transition-all min-h-[38px] cursor-pointer"
            >
              <LayersIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Modelos de Treino</span>
            </button>
          </>
        )}
        <Link
          href={
            isTemplatesTab
              ? `/consultoria/${consultancySlug}/rotinas/novo?isTemplate=true`
              : `/consultoria/${consultancySlug}/rotinas/novo`
          }
        >
          <Button
            variant="primary"
            size="md"
            className="font-bold min-h-[40px] shadow-sm flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isTemplatesTab ? "Novo modelo" : "Nova ficha"}</span>
          </Button>
        </Link>
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
