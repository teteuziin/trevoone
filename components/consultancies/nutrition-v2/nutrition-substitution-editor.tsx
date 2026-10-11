"use client";

import { useState, useRef, useCallback } from "react";
import type { ItemSubstitutionDto, UpdateSubstitutionInput } from "@/lib/nutrition-v2/plan-repository";
import {
  calculateMealMicronutrientTotals,
  derivePortionUnitCode,
} from "@/lib/nutrition-v2/nutrient-calculator";
import { NutritionMicronutrientsPanel } from "./nutrition-micronutrients-panel";
import { NutritionFoodPicker } from "./nutrition-food-picker";
import { AutosaveIndicator, type AutosaveStatus } from "./autosave-indicator";
import { getFoodPortionsForPickerAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import {
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  generatePracticalRoundingSuggestions,
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

interface FoodPortionOption {
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
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
  const [quantity, setQuantity] = useState(
    substitution.prescribedQuantity != null ? String(substitution.prescribedQuantity) : ""
  );
  const [selectedUnitValue, setSelectedUnitValue] = useState<string>("G");
  const [notes, setNotes] = useState(substitution.notes || "");
  const [showMicro, setShowMicro] = useState(false);

  // Authoritative food portions loaded strictly from Food Library for this food
  const [availablePortions, setAvailablePortions] = useState<FoodPortionOption[]>([]);
  const [isLoadingPortions, setIsLoadingPortions] = useState(false);

  // Autosave state
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Concurrency & debounce refs
  const latestReqIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if item has an unresolved legacy unit without conversion
  const isLegacyUnresolved =
    selectedUnitValue === "__LEGACY__" ||
    (substitution.caloriesKcalSnapshot == null &&
      substitution.foodId != null &&
      (substitution.prescribedUnitCode === "PORCAO" ||
        (substitution.prescribedUnitCode &&
          !["G", "KG", "ML", "L"].includes(substitution.prescribedUnitCode.trim().toUpperCase()))));

  // Load portions authoritatively from Food Library for substitution.foodPublicId
  const loadPortions = useCallback(async () => {
    if (!slug || !substitution.foodPublicId) {
      setAvailablePortions([]);
      return;
    }

    setIsLoadingPortions(true);
    try {
      const res = await getFoodPortionsForPickerAction(slug, substitution.foodPublicId);
      setIsLoadingPortions(false);
      if (res.success && res.data) {
        const rawPortions = (res.data.portions || []) as Array<{
          publicId: string;
          label: string;
          equivalentReferenceAmount: number;
          status?: string;
        }>;
        const activePortions: FoodPortionOption[] = rawPortions
          .filter((p) => (p.status || "ACTIVE") === "ACTIVE")
          .map((p) => ({
            publicId: p.publicId,
            label: p.label,
            equivalentReferenceAmount: Number(p.equivalentReferenceAmount),
          }));

        setAvailablePortions(activePortions);

        // Resolve active unit selection against loaded portions
        if (substitution.prescribedUnitLabel) {
          const matching = activePortions.find(
            (p) => p.label.trim().toLowerCase() === substitution.prescribedUnitLabel!.trim().toLowerCase()
          );
          if (matching) {
            setSelectedUnitValue(matching.publicId);
            return;
          }
        }

        const code = (substitution.prescribedUnitCode || "").trim().toUpperCase();
        if (code === "G" || code === "KG" || !code) {
          setSelectedUnitValue("G");
        } else {
          // Non-standard legacy unit with no conversion
          setSelectedUnitValue("__LEGACY__");
        }
      }
    } catch {
      setIsLoadingPortions(false);
    }
  }, [slug, substitution.foodPublicId, substitution.prescribedUnitCode, substitution.prescribedUnitLabel]);

  // Authoritative Autosave execution with concurrency protection
  const performSave = useCallback(
    async (qtyStr: string, unitVal: string, currentNotes: string) => {
      const numQty = parseFloat(qtyStr.replace(",", "."));
      if (!Number.isFinite(numQty) || numQty <= 0) {
        return;
      }

      const reqId = ++latestReqIdRef.current;
      setSaveStatus("saving");
      setSaveError(null);

      try {
        let portionPublicId: string | null = null;
        let unitCode = "G";
        let unitLabel = "Gramas (g)";

        if (unitVal !== "G" && unitVal !== "__LEGACY__") {
          const pt = availablePortions.find((p) => p.publicId === unitVal);
          if (pt) {
            portionPublicId = pt.publicId;
            unitCode = derivePortionUnitCode(pt.label);
            unitLabel = pt.label;
          }
        }

        await onUpdate({
          prescribedQuantity: numQty,
          portionPublicId,
          prescribedUnitCode: unitCode,
          prescribedUnitLabel: unitLabel,
          notes: currentNotes.trim() || null,
          equivalenceCriterion: "MANUAL",
        });

        if (reqId === latestReqIdRef.current) {
          setSaveStatus("saved");
          setTimeout(() => {
            if (reqId === latestReqIdRef.current) {
              setSaveStatus("idle");
            }
          }, 2500);
        }
      } catch (err: unknown) {
        if (reqId === latestReqIdRef.current) {
          setSaveStatus("error");
          setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
        }
      }
    },
    [availablePortions, onUpdate]
  );

  // Debounced input handlers
  const handleQuantityChange = (newVal: string) => {
    setQuantity(newVal);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSave(newVal, selectedUnitValue, notes);
    }, 600);
  };

  const handleUnitChange = (newUnitVal: string) => {
    let nextQty = quantity;

    // Smart scaling: switching from grams to a portion with large gram quantity
    if (selectedUnitValue === "G" && newUnitVal !== "G" && newUnitVal !== "__LEGACY__") {
      const pt = availablePortions.find((p) => p.publicId === newUnitVal);
      if (pt && pt.equivalentReferenceAmount > 0) {
        const curNum = parseFloat(quantity.replace(",", "."));
        if (Number.isFinite(curNum) && curNum > 10) {
          const suggested = Math.max(1, Math.round(curNum / pt.equivalentReferenceAmount)) || 1;
          nextQty = String(suggested);
          setQuantity(nextQty);
        }
      }
    } else if (selectedUnitValue !== "G" && selectedUnitValue !== "__LEGACY__" && newUnitVal === "G") {
      // Switching from a portion to grams: scale to total equivalent grams
      const prevPt = availablePortions.find((p) => p.publicId === selectedUnitValue);
      if (prevPt && prevPt.equivalentReferenceAmount > 0) {
        const curNum = parseFloat(quantity.replace(",", ".")) || 1;
        const grams = Math.round(curNum * prevPt.equivalentReferenceAmount);
        nextQty = String(grams);
        setQuantity(nextQty);
      }
    }

    setSelectedUnitValue(newUnitVal);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    performSave(nextQty, newUnitVal, notes);
  };

  const handleNotesChange = (newVal: string) => {
    setNotes(newVal);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      performSave(quantity, selectedUnitValue, newVal);
    }, 600);
  };

  const handleOpenEdit = () => {
    setQuantity(substitution.prescribedQuantity != null ? String(substitution.prescribedQuantity) : "");
    setNotes(substitution.notes || "");
    setSaveStatus("idle");
    setSaveError(null);
    setIsEditing(true);
    loadPortions();
  };

  const handleClose = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      performSave(quantity, selectedUnitValue, notes);
    }
    setIsEditing(false);
  };

  const curQtyNum = parseFloat(quantity.replace(",", "."));
  const activeUnitLabel =
    selectedUnitValue === "G"
      ? "g"
      : availablePortions.find((p) => p.publicId === selectedUnitValue)?.label || "g";
  const inlineRoundingOptions =
    Number.isFinite(curQtyNum) && curQtyNum > 0
      ? generatePracticalRoundingSuggestions(curQtyNum, activeUnitLabel)
      : [];

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
          {isLegacyUnresolved && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              REVISÃO NECESSÁRIA · MEDIDA SEM CONVERSÃO
            </span>
          )}
          {substitution.prescribedQuantity != null && (
            <span className="text-xs text-[var(--text-secondary)] shrink-0 font-medium">
              · {substitution.prescribedQuantity} {substitution.prescribedUnitLabel || substitution.prescribedUnitCode || "g"}
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
          {!readOnly && substitution.equivalenceCriterion === "MANUAL" && substitution.derivedStatus !== "STALE" && onReviewOrRecalculate && (
            <button
              type="button"
              onClick={() => onReviewOrRecalculate(substitution)}
              className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer shrink-0"
              title="Recalcular equivalência matemática com base no alimento principal"
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
                  title="Editar quantidade e unidade"
                  onClick={handleOpenEdit}
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

      {/* Inline edit mode: side-by-side desktop, stacked mobile, with debounced autosave */}
      {isEditing && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Quantidade:
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
                Unidade:
              </label>
              <select
                value={selectedUnitValue}
                onChange={(e) => handleUnitChange(e.target.value)}
                disabled={isLoadingPortions}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="G">Gramas (g)</option>
                {isLoadingPortions && availablePortions.length === 0 && (
                  <option value="" disabled>Carregando porções...</option>
                )}
                {availablePortions.map((p) => (
                  <option key={p.publicId} value={p.publicId}>
                    {p.label} ({p.equivalentReferenceAmount}g)
                  </option>
                ))}
                {isLegacyUnresolved && selectedUnitValue === "__LEGACY__" && (
                  <option value="__LEGACY__" disabled>
                    {substitution.prescribedUnitLabel || substitution.prescribedUnitCode} (sem conversão cadastrada)
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Practical Rounding Suggestions Quick Chips */}
          {inlineRoundingOptions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-[var(--text-tertiary)] font-semibold mr-0.5">
                Arredondar:
              </span>
              {inlineRoundingOptions.map((opt) => {
                const isSelected = curQtyNum === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const nextVal = String(opt.value);
                      setQuantity(nextVal);
                      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                      performSave(nextVal, selectedUnitValue, notes);
                    }}
                    className={`min-h-[32px] px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-2xs"
                        : "bg-[var(--surface-primary)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--brand-primary)]/60 hover:bg-[var(--surface-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-0.5">
              Observações:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Ex: cru, assado, sem açúcar..."
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <AutosaveIndicator
                status={saveStatus}
                errorMessage={saveError}
                onRetry={() => performSave(quantity, selectedUnitValue, notes)}
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
            >
              Fechar
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
