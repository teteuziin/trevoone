"use client";

import { useState } from "react";
import type { ItemSubstitutionDto, UpdateSubstitutionInput } from "@/lib/nutrition-v2/plan-repository";
import { calculateMealMicronutrientTotals } from "@/lib/nutrition-v2/nutrient-calculator";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";
import { NutritionFoodPicker } from "./nutrition-food-picker";
import {
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  type EquivalentCriterion,
} from "@/lib/nutrition-v2/equivalents";

interface NutritionSubstitutionEditorProps {
  slug?: string;
  substitution: ItemSubstitutionDto;
  readOnly?: boolean;
  onUpdate: (data: UpdateSubstitutionInput) => Promise<void>;
  onRemove: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  onReviewOrRecalculate?: (sub: ItemSubstitutionDto) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function NutritionSubstitutionEditor({
  slug,
  substitution,
  readOnly = false,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReviewOrRecalculate,
  isFirst,
  isLast,
}: NutritionSubstitutionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isResolvePickerOpen, setIsResolvePickerOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(substitution.prescribedQuantity || ""));
  const [notes, setNotes] = useState(substitution.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showMicro, setShowMicro] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const numQty = quantity ? parseFloat(quantity.replace(",", ".")) : null;
    await onUpdate({
      prescribedQuantity: numQty && numQty > 0 ? numQty : null,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="pl-3 sm:pl-6 pr-2.5 sm:pr-3 py-2 sm:py-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/30 hover:border-[var(--brand-primary)]/40 transition-colors w-full max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 w-full max-w-full min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap flex-1 max-w-full">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0 uppercase tracking-wide">
            OU
          </span>
          <span className="text-xs font-medium text-[var(--text-primary)] line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0 flex-1">
            {substitution.foodNameSnapshot}
          </span>
          {substitution.foodId == null && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Pendente
            </span>
          )}
          {substitution.prescribedQuantity != null && (
            <span className="text-xs text-[var(--text-secondary)] shrink-0 font-medium">
              · {substitution.prescribedQuantity} {substitution.prescribedUnitLabel || substitution.prescribedUnitCode || ""}
            </span>
          )}
          {substitution.equivalenceCriterion && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {EQUIVALENT_CRITERIA_SHORT_LABELS[substitution.equivalenceCriterion as EquivalentCriterion] || substitution.equivalenceCriterion}
            </span>
          )}
          {substitution.derivedStatus === "UNVERIFIED" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 shrink-0">
              Não verificada
            </span>
          )}
          {!readOnly && substitution.derivedStatus === "UNVERIFIED" && onReviewOrRecalculate && (
            <button
              type="button"
              onClick={() => onReviewOrRecalculate(substitution)}
              className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer shrink-0"
              title="Revisar e definir critério de equivalência"
            >
              [ Revisar ]
            </button>
          )}
          {substitution.derivedStatus === "STALE" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
              Desatualizada
            </span>
          )}
          {!readOnly && substitution.derivedStatus === "STALE" && onReviewOrRecalculate && (
            <button
              type="button"
              onClick={() => onReviewOrRecalculate(substitution)}
              className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer shrink-0"
              title="Recalcular porção equivalente com base no alimento principal"
            >
              [ Recalcular ]
            </button>
          )}
          {!readOnly && substitution.foodId == null && slug && (
            <button
              type="button"
              onClick={() => setIsResolvePickerOpen(true)}
              className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer shrink-0"
              title="Vincular a um alimento da tabela nutricional"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Vincular</span>
            </button>
          )}
        </div>

        {/* Action icons */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-1 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]">
            {!isEditing && (
              <>
                {onMoveUp && !isFirst && (
                  <button
                    type="button"
                    title="Mover para cima"
                    onClick={() => onMoveUp()}
                    className="p-1.5 sm:p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
                {onMoveDown && !isLast && (
                  <button
                    type="button"
                    title="Mover para baixo"
                    onClick={() => onMoveDown()}
                    className="p-1.5 sm:p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  title="Editar quantidade"
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 sm:p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Remover substituição"
                  onClick={onRemove}
                  className="p-1.5 sm:p-1 text-red-500/80 hover:text-red-600 rounded-lg hover:bg-red-500/10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline edit mode */}
      {isEditing && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Quantidade:
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Observações:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: cru, assado..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Macros / Notes row */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)] mt-1">
          {substitution.caloriesKcalSnapshot != null && (
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {substitution.caloriesKcalSnapshot} kcal
            </span>
          )}
          {substitution.proteinGSnapshot != null && <span>P: {substitution.proteinGSnapshot}g</span>}
          {substitution.carbohydrateGSnapshot != null && <span>C: {substitution.carbohydrateGSnapshot}g</span>}
          {substitution.fatGSnapshot != null && <span>G: {substitution.fatGSnapshot}g</span>}
          {substitution.notes && <span className="italic">· {substitution.notes}</span>}
          {substitution.micronutrientsSnapshotJson && (
            <button
              type="button"
              onClick={() => setShowMicro(!showMicro)}
              className="text-[10px] text-[var(--brand-primary)] hover:underline font-semibold ml-auto cursor-pointer"
            >
              {showMicro ? "Ocultar micronutrientes" : "Micronutrientes"}
            </button>
          )}
        </div>
      )}

      {/* Substitution Micronutrients Breakdown */}
      {showMicro && substitution.micronutrientsSnapshotJson && (
        <div className="pt-2">
          <NutritionMicronutrientsPanel
            totals={calculateMealMicronutrientTotals([substitution])}
            title={`Micronutrientes — ${substitution.foodNameSnapshot}`}
            defaultCollapsed={false}
          />
        </div>
      )}

      {/* Food Picker for Resolving Substitution Food */}
      {slug && (
        <NutritionFoodPicker
          slug={slug}
          isOpen={isResolvePickerOpen}
          onClose={() => setIsResolvePickerOpen(false)}
          onSelect={async (selection) => {
            await onUpdate({
              foodPublicId: selection.foodPublicId || undefined,
              portionPublicId: selection.portionPublicId || null,
              prescribedQuantity: selection.prescribedQuantity ?? substitution.prescribedQuantity,
              prescribedUnitCode: selection.prescribedUnitCode ?? substitution.prescribedUnitCode,
              prescribedUnitLabel: selection.prescribedUnitLabel ?? substitution.prescribedUnitLabel,
            });
            setIsResolvePickerOpen(false);
          }}
          title={`Vincular Alimento para "${substitution.foodNameSnapshot}"`}
        />
      )}
    </div>
  );
}
