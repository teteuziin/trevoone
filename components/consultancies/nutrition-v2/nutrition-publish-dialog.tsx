"use client";

import type { PlanVersionTreeDto } from "@/lib/nutrition-v2/plan-repository";

interface NutritionPublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tree: PlanVersionTreeDto;
  isPublishing: boolean;
  errorMessage: string | null;
}

export function NutritionPublishDialog({
  isOpen,
  onClose,
  onConfirm,
  tree,
  isPublishing,
  errorMessage,
}: NutritionPublishDialogProps) {
  if (!isOpen) return null;

  const totalMeals = tree.meals.length;
  let totalMainItems = 0;
  let totalSubstitutions = 0;

  for (const m of tree.meals) {
    totalMainItems += m.items.length;
    for (const item of m.items) {
      totalSubstitutions += item.substitutions.length;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug">
              Publicar Plano Alimentar
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Versão {tree.version.versionNumber} · {tree.version.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Atenção: Versão Imutável</span>
            </p>
            <p className="leading-relaxed">
              Ao publicar esta versão, sua prescrição se tornará definitiva e não poderá mais ser editada diretamente. Para realizar futuras alterações, você poderá criar uma nova versão a partir desta.
            </p>
          </div>

          {/* Structure Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Resumo da Prescrição
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="text-base font-bold text-[var(--text-primary)]">{totalMeals}</div>
                <div className="text-[11px] text-[var(--text-muted)]">Refeiç{totalMeals === 1 ? "ão" : "ões"}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="text-base font-bold text-[var(--text-primary)]">{totalMainItems}</div>
                <div className="text-[11px] text-[var(--text-muted)]">Itens Principais</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="text-base font-bold text-[var(--text-primary)]">{totalSubstitutions}</div>
                <div className="text-[11px] text-[var(--text-muted)]">Substituições</div>
              </div>
            </div>
          </div>

          {/* Macro Summary Badge */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
              <span>Totais Diários:</span>
              <span className="text-amber-600 dark:text-amber-400">{tree.dailyTotals.caloriesKcal} kcal</span>
            </div>
            <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
              <span>P: {tree.dailyTotals.proteinG}g · C: {tree.dailyTotals.carbohydrateG}g · G: {tree.dailyTotals.fatG}g</span>
              {tree.dailyTotals.hasIncompleteData && (
                <span className="text-[var(--text-muted)] italic">(itens sem cálculo)</span>
              )}
            </div>
          </div>

          {/* Error message banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isPublishing}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          >
            Voltar ao Editor
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            {isPublishing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Publicando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirmar e Publicar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
