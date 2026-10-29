"use client";

import { useMemo } from "react";
import type { PlanVersionTreeDto } from "@/lib/nutrition-v2/plan-repository";
import {
  validatePlanTreeForPublication,
  formatMissingNutrientsList,
  type PendingPublicationItem,
} from "@/lib/nutrition-v2/validation";

interface NutritionPublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tree: PlanVersionTreeDto;
  isPublishing: boolean;
  errorMessage: string | null;
  patientName?: string;
  onReviewItem?: (item: PendingPublicationItem) => void;
  onSearchLibraryItem?: (item: PendingPublicationItem) => void;
  onManualNutritionItem?: (item: PendingPublicationItem) => void;
  onToggleAcknowledgeItem?: (item: PendingPublicationItem, acknowledged: boolean) => Promise<void>;
  onConfirmPublishPartial?: () => Promise<void>;
}

export function NutritionPublishDialog({
  isOpen,
  onClose,
  onConfirm,
  tree,
  isPublishing,
  errorMessage,
  patientName,
  onReviewItem,
  onSearchLibraryItem,
  onManualNutritionItem,
  onToggleAcknowledgeItem,
  onConfirmPublishPartial,
}: NutritionPublishDialogProps) {
  const validation = useMemo(() => validatePlanTreeForPublication(tree), [tree]);
  const pendingItems = validation.pendingItems;
  const hasFatalErrors = validation.hasFatalErrors;
  const hasOnlyNutritionPendencies = !hasFatalErrors && pendingItems.length > 0;

  const reviewedMap = tree.version.guidanceJson?.reviewedWithoutNutrition || {};

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[var(--surface-primary)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-[var(--surface-primary)]">
          <div className="w-10 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug">
              {hasFatalErrors
                ? "Revise o plano antes de publicar"
                : patientName
                ? "Publicar Atualização do Plano"
                : "Publicar Plano Alimentar"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {hasFatalErrors
                ? "Existem itens com quantidades inválidas ou erros impeditivos."
                : hasOnlyNutritionPendencies
                ? `Versão ${tree.version.versionNumber} · Contém ${pendingItems.length} alimento${
                    pendingItems.length > 1 ? "s" : ""
                  } com dados parciais`
                : `${patientName ? `Paciente: ${patientName} · ` : ""}Versão ${
                    tree.version.versionNumber
                  } · ${tree.version.title}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {hasFatalErrors ? (
            /* ========================================================== */
            /* FATAL ERROR BLOCK: QUANTITY <= 0, EMPTY MEAL, ETC.        */
            /* ========================================================== */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-800 dark:text-red-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>Publicação bloqueada</span>
                </p>
                <p className="leading-relaxed">
                  Existem alimentos com quantidade zero ou inválida. Todos os alimentos devem possuir uma quantidade prescrita maior que zero para serem publicados.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Itens com quantidade inválida
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {pendingItems
                    .filter((p) => p.reason === "INVALID_QUANTITY")
                    .map((item, idx) => (
                      <div
                        key={`${item.itemPublicId}-${idx}`}
                        className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="font-semibold text-[var(--text-primary)] truncate">
                            {item.mealTitle ? `${item.mealTitle}: ` : ""}
                            {item.foodName}
                          </div>
                          <div className="text-[11px] text-red-700 dark:text-red-400">
                            Quantidade inválida (deve ser maior que zero)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onReviewItem?.(item);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[var(--surface-primary)] border border-red-500/40 text-red-800 dark:text-red-300 font-semibold text-xs hover:bg-red-500/15 cursor-pointer"
                        >
                          Corrigir quantidade
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : hasOnlyNutritionPendencies ? (
            /* ========================================================== */
            /* TRANSPARENT PARTIAL NUTRITION FLOW (3 CLEAR ACTIONS)       */
            /* ========================================================== */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Valores nutricionais parciais</span>
                </p>
                <p className="leading-relaxed">
                  Este plano contém {pendingItems.length} alimento{pendingItems.length > 1 ? "s" : ""} com informações nutricionais incompletas. Os totais apresentados são parciais.
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                  Você pode vincular os alimentos ao catálogo, preencher seus nutrientes ou publicar o cardápio mantendo os dados parciais auditados.
                </p>
              </div>

              {/* Pending Items List with the 3 Paths */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Alimentos com dados parciais ({pendingItems.length})
                  </h4>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                  {pendingItems.map((item, idx) => {
                    const isReviewed = Boolean(reviewedMap[item.itemPublicId]);
                    return (
                      <div
                        key={`${item.itemPublicId}-${idx}`}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]/40 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-bold text-[var(--text-primary)] truncate">
                              {item.mealTitle ? `${item.mealTitle}: ` : ""}
                              {item.foodName}
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-400">
                              {item.reason === "UNLINKED"
                                ? "Sem vínculo nutricional"
                                : item.missingNutrients && item.missingNutrients.length > 0
                                ? `Dados ausentes: ${formatMissingNutrientsList(item.missingNutrients)}`
                                : "Dados nutricionais incompletos"}
                            </div>
                          </div>
                          {isReviewed && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              Revisado sem dados
                            </span>
                          )}
                        </div>

                        {/* 3 Clear Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border)]/60">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onSearchLibraryItem) onSearchLibraryItem(item);
                              else onReviewItem?.(item);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Buscar alimento correspondente na biblioteca"
                          >
                            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Buscar na biblioteca</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onManualNutritionItem) onManualNutritionItem(item);
                              else onReviewItem?.(item);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Cadastrar calorias e macronutrientes para este alimento"
                          >
                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Informar valores</span>
                          </button>

                          {onToggleAcknowledgeItem && (
                            <button
                              type="button"
                              onClick={() => onToggleAcknowledgeItem(item, !isReviewed)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                isReviewed
                                  ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/20"
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                              }`}
                              title={isReviewed ? "Desmarcar confirmação" : "Manter na prescrição sem dados nutricionais calculados"}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{isReviewed ? "Revisado" : "Manter sem dados"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Structure Summary */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Resumo da Prescrição
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                    <div className="text-base font-bold text-[var(--text-primary)]">{totalMeals}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Refeiç{totalMeals === 1 ? "ão" : "ões"}
                    </div>
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

              {/* Macro Summary Badge (Partial) */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1 text-xs">
                <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                  <span className="flex items-center gap-1">
                    <span>Totais Diários:</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Subtotal parcial
                    </span>
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">
                    {tree.dailyTotals.caloriesKcal != null ? `${tree.dailyTotals.caloriesKcal} kcal*` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
                  <span>
                    P: {tree.dailyTotals.proteinG != null ? `${tree.dailyTotals.proteinG}g*` : "—"} · C:{" "}
                    {tree.dailyTotals.carbohydrateG != null ? `${tree.dailyTotals.carbohydrateG}g*` : "—"} · G:{" "}
                    {tree.dailyTotals.fatG != null ? `${tree.dailyTotals.fatG}g*` : "—"}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] pt-0.5">
                  * Calculado sobre os alimentos com dados cadastrados. Alimentos sem nutrientes não são forçados a zero.
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* NORMAL CLEAN PUBLISH FLOW                                 */
            /* ========================================================== */
            <>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{patientName ? "Atualização da Prescrição" : "Pronto para Publicação"}</span>
                </p>
                <p className="leading-relaxed">
                  {patientName
                    ? `Ao publicar, ${patientName} passará a receber imediatamente este novo cardápio. O histórico anterior será preservado com segurança.`
                    : "Todos os alimentos possuem dados nutricionais completos. Ao publicar esta versão, sua prescrição se tornará definitiva."}
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
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Refeiç{totalMeals === 1 ? "ão" : "ões"}
                    </div>
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
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {tree.dailyTotals.caloriesKcal ?? "—"} kcal
                  </span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)] text-[11px]">
                  <span>
                    P: {tree.dailyTotals.proteinG ?? "—"}g · C: {tree.dailyTotals.carbohydrateG ?? "—"}g · G:{" "}
                    {tree.dailyTotals.fatG ?? "—"}g
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Error message banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-secondary)]/30 flex items-center justify-between sm:justify-end gap-2.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {hasFatalErrors ? (
            /* Blocking footer for real fatal errors (like quantity <= 0) */
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] min-h-[44px] cursor-pointer"
              >
                Voltar ao Editor
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-sm flex items-center justify-center gap-2 min-h-[48px] transition-colors cursor-pointer"
              >
                <span>Revisar itens com erro</span>
              </button>
            </>
          ) : hasOnlyNutritionPendencies ? (
            /* Explicit action: Publicar com dados parciais */
            <>
              <button
                type="button"
                disabled={isPublishing}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] min-h-[44px] cursor-pointer"
              >
                Voltar ao Editor
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={onConfirmPublishPartial || onConfirm}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm flex items-center justify-center gap-2 min-h-[48px] transition-colors cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Publicar com dados parciais</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Normal publish footer */
            <>
              <button
                type="button"
                disabled={isPublishing}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] min-h-[44px] cursor-pointer"
              >
                Voltar ao Editor
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={onConfirm}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 min-h-[48px] transition-colors cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    <span>{patientName ? "Publicar Atualização" : "Confirmar e Publicar"}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
