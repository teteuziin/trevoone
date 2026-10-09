"use client";

import { useState } from "react";
import type {
  MealItemWithSubstitutionsDto,
  ItemSubstitutionDto,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import { NutritionSubstitutionEditor } from "./nutrition-substitution-editor";
import { NutritionFoodPicker } from "./nutrition-food-picker";
import { NutritionEquivalentsModal } from "./nutrition-equivalents-modal";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import { calculateMealMicronutrientTotals } from "@/lib/nutrition-v2/nutrient-calculator";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";

interface NutritionItemEditorProps {
  slug: string;
  item: MealItemWithSubstitutionsDto;
  readOnly?: boolean;
  onUpdateItem: (data: {
    foodPublicId?: string;
    portionPublicId?: string | null;
    prescribedQuantity?: number | null;
    prescribedUnitCode?: string | null;
    prescribedUnitLabel?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  onRemoveItem: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  onAddSubstitution: (payload: AddSubstitutionInput) => Promise<void>;
  onUpdateSubstitution: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
  onRemoveSubstitution: (subPublicId: string) => Promise<void>;
  onReorderSubstitutions: (orderedSubPublicIds: string[]) => Promise<void>;
  initialFoodsForEquivalents?: FoodListItemDto[];
}

export function NutritionItemEditor({
  slug,
  item,
  readOnly = false,
  onUpdateItem,
  onRemoveItem,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAddSubstitution,
  onUpdateSubstitution,
  onRemoveSubstitution,
  onReorderSubstitutions,
  initialFoodsForEquivalents,
}: NutritionItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.prescribedQuantity || ""));
  const [notes, setNotes] = useState(item.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isResolvePickerOpen, setIsResolvePickerOpen] = useState(false);
  const [isEquivalentsOpen, setIsEquivalentsOpen] = useState(false);
  const [substitutionToReview, setSubstitutionToReview] = useState<ItemSubstitutionDto | null>(null);
  const [showMicro, setShowMicro] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const numQty = quantity ? parseFloat(quantity.replace(",", ".")) : null;
    await onUpdateItem({
      prescribedQuantity: numQty && numQty > 0 ? numQty : null,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleMoveSub = async (index: number, direction: "UP" | "DOWN") => {
    const subs = [...item.substitutions];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= subs.length) return;

    const temp = subs[index];
    subs[index] = subs[targetIdx];
    subs[targetIdx] = temp;

    await onReorderSubstitutions(subs.map((s) => s.publicId));
  };

  return (
    <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] shadow-2xs hover:border-[var(--brand-primary)]/40 transition-all space-y-2 w-full max-w-full min-w-0">
      {/* Item Header / Overview */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-2.5 w-full max-w-full min-w-0">
        <div className="min-w-0 flex-1 space-y-1 w-full max-w-full">
          {/* Line 1: Food name and calories */}
          <div className="flex items-start justify-between gap-2 min-w-0 w-full max-w-full">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-full">
              <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0">
                {item.foodNameSnapshot}
              </span>
              {item.foodId == null ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  REVISÃO NECESSÁRIA · SEM VÍNCULO
                </span>
              ) : item.caloriesKcalSnapshot == null && (item.prescribedUnitCode === "PORCAO" || (item.prescribedUnitCode && !["G", "KG", "ML", "L"].includes(item.prescribedUnitCode.trim().toUpperCase()))) ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  REVISÃO NECESSÁRIA · MEDIDA SEM CONVERSÃO
                </span>
              ) : item.caloriesKcalSnapshot == null || item.proteinGSnapshot == null || item.carbohydrateGSnapshot == null || item.fatGSnapshot == null ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  REVISÃO NECESSÁRIA · DADOS INCOMPLETOS
                </span>
              ) : null}
            </div>
            <span className="font-bold text-xs text-amber-600 dark:text-amber-400 font-mono shrink-0 pl-1">
              {item.caloriesKcalSnapshot != null ? `${item.caloriesKcalSnapshot} kcal` : "Sem cálculo"}
            </span>
          </div>

          {/* Line 2: Quantity & Macros */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-[var(--text-secondary)] flex-wrap min-w-0 max-w-full">
            {item.prescribedQuantity != null && (
              <span className="font-medium text-[var(--text-primary)] shrink-0">
                {item.prescribedQuantity} {item.prescribedUnitLabel || item.prescribedUnitCode || "g"}
              </span>
            )}
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="shrink-0">P {item.proteinGSnapshot != null ? `${item.proteinGSnapshot}g` : "—"}</span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="shrink-0">C {item.carbohydrateGSnapshot != null ? `${item.carbohydrateGSnapshot}g` : "—"}</span>
            <span className="text-[var(--text-tertiary)]">•</span>
            <span className="shrink-0">G {item.fatGSnapshot != null ? `${item.fatGSnapshot}g` : "—"}</span>

            {!readOnly && item.foodId == null && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <button
                  type="button"
                  onClick={() => setIsResolvePickerOpen(true)}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 cursor-pointer min-h-[36px] sm:min-h-0"
                  title="Vincular a um alimento da tabela nutricional"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Vincular alimento</span>
                </button>
              </>
            )}

            {!readOnly && item.foodId != null && item.caloriesKcalSnapshot == null && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateItem({
                      prescribedUnitCode: "G",
                      prescribedUnitLabel: "Gramas (g)",
                      portionPublicId: null,
                      prescribedQuantity: item.prescribedQuantity || 100,
                    });
                  }}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 cursor-pointer min-h-[36px] sm:min-h-0"
                  title="Converter para gramas e calcular nutrientes automaticamente"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 18h12l3-18H3z" />
                  </svg>
                  <span>Usar gramas</span>
                </button>
                <span className="text-[var(--text-tertiary)]">•</span>
                <button
                  type="button"
                  onClick={() => setIsResolvePickerOpen(true)}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 cursor-pointer min-h-[36px] sm:min-h-0"
                  title="Escolher outra medida caseira cadastrada para este alimento"
                >
                  <span>Escolher outra medida</span>
                </button>
              </>
            )}

            {item.notes && <span className="text-[var(--text-muted)] italic break-words">· {item.notes}</span>}

            {item.micronutrientsSnapshotJson && (
              <>
                <span className="text-[var(--text-tertiary)]">•</span>
                <button
                  type="button"
                  onClick={() => setShowMicro(!showMicro)}
                  className="text-[10px] text-[var(--brand-primary)] hover:underline font-semibold cursor-pointer"
                >
                  {showMicro ? "Ocultar micros" : "Micronutrientes"}
                </button>
              </>
            )}
          </div>
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Remover item"
                  onClick={onRemoveItem}
                  className="p-1.5 sm:p-1 text-red-500/80 hover:text-red-600 rounded-lg hover:bg-red-500/10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border)] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Quantidade prescrita:
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Observações de consumo:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem sal, cozido..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-3 py-1 text-xs rounded-lg bg-[var(--brand-primary)] text-white font-medium hover:opacity-90"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Substitutions Sub-Tree */}
      <div className="space-y-2 pt-1">
        {item.substitutions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
              <span>Opções de Substituição (OU)</span>
              <span>{item.substitutions.length} alternativa{item.substitutions.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1.5">
              {item.substitutions.map((sub, idx) => (
                <NutritionSubstitutionEditor
                  key={sub.publicId}
                  slug={slug}
                  substitution={sub}
                  readOnly={readOnly}
                  isFirst={idx === 0}
                  isLast={idx === item.substitutions.length - 1}
                  onUpdate={(data) => onUpdateSubstitution(sub.publicId, data)}
                  onRemove={() => onRemoveSubstitution(sub.publicId)}
                  onMoveUp={() => handleMoveSub(idx, "UP")}
                  onMoveDown={() => handleMoveSub(idx, "DOWN")}
                  onReviewOrRecalculate={(targetSub) => {
                    setSubstitutionToReview(targetSub);
                    setIsEquivalentsOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add substitution button and Recalculate Equivalents button */}
        {!readOnly && (
          <div className="pt-1 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSubstitutionToReview(null);
                setIsEquivalentsOpen(true);
              }}
              className="text-xs text-[var(--brand-primary)] hover:underline font-medium inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[var(--brand-primary)]/5 cursor-pointer min-h-[44px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Adicionar Substituição</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubstitutionToReview(null);
                setIsEquivalentsOpen(true);
              }}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-amber-500/10 cursor-pointer min-h-[44px]"
              title="Calcular quantidade equivalente com base em energia, proteína, carboidrato ou gordura"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Recalcular equivalentes</span>
            </button>
          </div>
        )}

        {/* Item Micronutrients Breakdown */}
        {showMicro && item.micronutrientsSnapshotJson && (
          <div className="pt-2">
            <NutritionMicronutrientsPanel
              totals={calculateMealMicronutrientTotals([item])}
              title={`Micronutrientes — ${item.foodNameSnapshot}`}
              defaultCollapsed={false}
            />
          </div>
        )}
      </div>

      {/* Equivalents Calculator & Review Modal */}
      <NutritionEquivalentsModal
        slug={slug}
        isOpen={isEquivalentsOpen}
        onClose={() => {
          setIsEquivalentsOpen(false);
          setSubstitutionToReview(null);
        }}
        prescribedItem={item}
        substitutionToReview={substitutionToReview}
        onAddSubstitution={onAddSubstitution}
        onUpdateSubstitution={onUpdateSubstitution}
        initialFoods={initialFoodsForEquivalents}
      />

      {/* Food Picker for Resolving Pending Item or Choosing Registered Portions */}
      <NutritionFoodPicker
        slug={slug}
        isOpen={isResolvePickerOpen}
        onClose={() => setIsResolvePickerOpen(false)}
        initialQuery={extractCleanFoodQuery(item.foodNameSnapshot)}
        disableCustomTab={true}
        onSelect={async (selection) => {
          await onUpdateItem({
            foodPublicId: selection.foodPublicId || undefined,
            portionPublicId: selection.portionPublicId || null,
            prescribedQuantity: selection.prescribedQuantity ?? item.prescribedQuantity,
            prescribedUnitCode: selection.prescribedUnitCode ?? item.prescribedUnitCode,
            prescribedUnitLabel: selection.prescribedUnitLabel ?? item.prescribedUnitLabel,
          });
          setIsResolvePickerOpen(false);
        }}
        title={item.foodId == null ? `Vincular Alimento para "${item.foodNameSnapshot}"` : `Escolher Medida para "${item.foodNameSnapshot}"`}
      />
    </div>
  );
}

function extractCleanFoodQuery(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  clean = clean.replace(/^(fruta|prote[ií]na|carboidrato|gordura|vegetal|salada|bebida|doce)\s*:\s*/i, "");
  clean = clean.replace(/\([^)]*\)/g, "");
  clean = clean.replace(/^\d+([.,]\d+)?\s*(g|kg|ml|l|colheres|colher|fatias|fatia|unidades|unidade|escumadeira|concha)?(\s+de)?\s+/i, "");
  return clean.trim() || raw.trim();
}
