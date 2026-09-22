"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import { searchFoodsForPickerAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import type { FoodSelectionResult } from "./nutrition-food-picker";
import type { MealItemWithSubstitutionsDto } from "@/lib/nutrition-v2/plan-repository";
import {
  calculateNutrientEquivalence,
  ALL_EQUIVALENT_CRITERIA,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  type EquivalentCriterion,
  type ReferenceFoodPrescription,
  type CandidateFoodItem,
} from "@/lib/nutrition-v2/equivalents";

interface NutritionEquivalentsModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  prescribedItem: MealItemWithSubstitutionsDto;
  onAddSubstitution: (payload: FoodSelectionResult) => Promise<void>;
  initialFoods?: FoodListItemDto[];
}

export function NutritionEquivalentsModal({
  slug,
  isOpen,
  onClose,
  prescribedItem,
  onAddSubstitution,
  initialFoods,
}: NutritionEquivalentsModalProps) {
  const [selectedCriterion, setSelectedCriterion] = useState<EquivalentCriterion>("ENERGY");
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [foods, setFoods] = useState<FoodListItemDto[]>(initialFoods || []);
  const [isSearching, startSearchTransition] = useTransition();
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Convert prescribed item into pure reference DTO
  const reference: ReferenceFoodPrescription = useMemo(() => {
    return {
      name: prescribedItem.foodNameSnapshot,
      prescribedQuantity: prescribedItem.prescribedQuantity,
      prescribedUnitCode: prescribedItem.prescribedUnitCode,
      prescribedUnitLabel: prescribedItem.prescribedUnitLabel,
      caloriesKcalSnapshot: prescribedItem.caloriesKcalSnapshot,
      proteinGSnapshot: prescribedItem.proteinGSnapshot,
      carbohydrateGSnapshot: prescribedItem.carbohydrateGSnapshot,
      fatGSnapshot: prescribedItem.fatGSnapshot,
    };
  }, [prescribedItem]);

  // Load foods server-side with debounced search
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchFoodsForPickerAction(slug, query, scopeFilter, 1);
        if (isCurrent && res.success && res.data) {
          setFoods(res.data.items);
        } else if (isCurrent && initialFoods && initialFoods.length > 0) {
          const q = query.trim().toLowerCase();
          const filtered = q
            ? initialFoods.filter((f) => (f.displayNamePtBr || f.name).toLowerCase().includes(q))
            : initialFoods;
          setFoods(filtered);
        }
      });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, slug, query, scopeFilter, initialFoods]);

  const handleClose = useCallback(() => {
    if (isSubmittingId) return;
    setQuery("");
    setSuccessMessage(null);
    setIsSubmittingId(null);
    onClose();
  }, [isSubmittingId, onClose]);

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmittingId) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmittingId, handleClose]);

  // Calculate equivalence for all currently loaded foods 100% client-side
  // Zero requests on tab switch!
  const calculatedItems = useMemo(() => {
    return foods.map((food) => {
      const candidate: CandidateFoodItem = {
        publicId: food.publicId,
        name: food.displayNamePtBr || food.name,
        category: food.category,
        referenceAmount: food.referenceAmount,
        referenceUnitCode: food.referenceUnitCode,
        caloriesKcal: food.caloriesKcal,
        proteinG: food.proteinG,
        carbohydrateG: food.carbohydrateG,
        fatG: food.fatG,
        scope: food.scope,
      };

      const calc = calculateNutrientEquivalence(reference, candidate, selectedCriterion);
      return {
        food,
        candidate,
        calc,
      };
    });
  }, [foods, reference, selectedCriterion]);

  // Sort items: prioritizing same category or matching foods
  const sortedItems = useMemo(() => {
    const refCategory = prescribedItem.categorySnapshot?.trim().toLowerCase();
    return [...calculatedItems].sort((a, b) => {
      // Prioritize items that can be applied
      if (a.calc.canApply && !b.calc.canApply) return -1;
      if (!a.calc.canApply && b.calc.canApply) return 1;

      // Prioritize same category if available
      if (refCategory) {
        const aCat = a.food.category?.trim().toLowerCase();
        const bCat = b.food.category?.trim().toLowerCase();
        if (aCat === refCategory && bCat !== refCategory) return -1;
        if (bCat === refCategory && aCat !== refCategory) return 1;
      }

      return 0;
    });
  }, [calculatedItems, prescribedItem.categorySnapshot]);

  // Handle adding equivalent substitution
  const handleAdd = async (food: FoodListItemDto, roundedGrams: number) => {
    try {
      setIsSubmittingId(food.publicId);

      const payload: FoodSelectionResult = {
        foodPublicId: food.publicId,
        prescribedQuantity: roundedGrams,
        prescribedUnitCode: "G",
        prescribedUnitLabel: "g",
        notes: `Equivalente por ${EQUIVALENT_CRITERIA_SHORT_LABELS[selectedCriterion].toLowerCase()} (${roundedGrams} g)`,
      };

      await onAddSubstitution(payload);
      setSuccessMessage(`${food.displayNamePtBr || food.name} adicionado como substituição!`);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      alert("Erro ao adicionar substituição.");
    } finally {
      setIsSubmittingId(null);
    }
  };

  if (!isOpen) return null;

  const currentCriterionLabel = EQUIVALENT_CRITERIA_LABELS[selectedCriterion];
  const currentCriterionShort = EQUIVALENT_CRITERIA_SHORT_LABELS[selectedCriterion];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden depth-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="equivalents-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </span>
              <h2 id="equivalents-title" className="text-base sm:text-lg font-bold truncate">
                Recalcular Equivalentes de Alimentos
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Calcule a quantidade exata de outro alimento para atingir a mesma meta nutricional.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={!!isSubmittingId}
            aria-label="Fechar"
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0 flex-1">
          {/* Reference Food Card (Source of Truth) */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-default)] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Alimento Prescrito (Referência)
                </span>
                <span className="text-sm font-bold text-[var(--text-primary)] truncate block">
                  {prescribedItem.foodNameSnapshot}
                </span>
              </div>
              {prescribedItem.prescribedQuantity != null && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--brand)]">
                  {prescribedItem.prescribedQuantity} {prescribedItem.prescribedUnitLabel || prescribedItem.prescribedUnitCode || "g"}
                </span>
              )}
            </div>

            {/* Reference Food Current Snapshots */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
                <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Calorias</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.caloriesKcalSnapshot != null ? `${prescribedItem.caloriesKcalSnapshot} kcal` : "-"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
                <div className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400">Proteína</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.proteinGSnapshot != null ? `${prescribedItem.proteinGSnapshot}g` : "-"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Carboidrato</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.carbohydrateGSnapshot != null ? `${prescribedItem.carbohydrateGSnapshot}g` : "-"}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-center">
                <div className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400">Gordura</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.fatGSnapshot != null ? `${prescribedItem.fatGSnapshot}g` : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Criterion Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-secondary)]">
              Calcular equivalência com base em:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
              {ALL_EQUIVALENT_CRITERIA.map((criterion) => {
                const isActive = selectedCriterion === criterion;
                return (
                  <button
                    key={criterion}
                    type="button"
                    onClick={() => setSelectedCriterion(criterion)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      isActive
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]/60"
                    }`}
                  >
                    {EQUIVALENT_CRITERIA_SHORT_LABELS[criterion]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mandatory Disclaimer Banner */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold">
                Equivalência calculada com base em {currentCriterionLabel}.
              </span>
              <span className="block opacity-90 text-[11px]">
                Os demais nutrientes (calorias, carboidratos, proteínas e gorduras) podem variar conforme a composição de cada alimento.
              </span>
            </div>
          </div>

          {/* Search Input & Filter Chips */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar alimento substituto (ex: frango, tilápia, batata, aveia)..."
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] placeholder:text-[var(--text-tertiary)]"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium mr-1">Origem:</span>
              <button
                type="button"
                onClick={() => setScopeFilter("ALL")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  scopeFilter === "ALL"
                    ? "bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border-default)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("GLOBAL")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  scopeFilter === "GLOBAL"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Trevo One
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("CONSULTANCY")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  scopeFilter === "CONSULTANCY"
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Minha Consultoria
              </button>
            </div>
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
              <span>Opções calculadas ({sortedItems.length})</span>
              {isSearching && <span className="animate-pulse">Buscando alimentos...</span>}
            </div>

            {sortedItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-sunken)]/50 rounded-2xl border border-dashed border-[var(--border-subtle)] space-y-1">
                <p className="font-semibold">Nenhum alimento encontrado para substituição.</p>
                <p className="text-[11px] opacity-75">Tente buscar por outro termo ou nome de ingrediente.</p>
              </div>
            ) : (
              sortedItems.map(({ food, calc }) => {
                const isSubmittingThis = isSubmittingId === food.publicId;

                return (
                  <div
                    key={food.publicId}
                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--brand)]/40 transition-all space-y-3 shadow-2xs"
                  >
                    {/* Item Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {food.displayNamePtBr || food.name}
                          </span>
                          {food.scope && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                food.scope === "GLOBAL"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                              }`}
                            >
                              {food.scope === "GLOBAL" ? "Trevo One" : "Minha Consultoria"}
                            </span>
                          )}
                          {food.category && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                              {food.category}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          Base cadastral: {food.referenceAmount} {food.referenceUnitCode.toLowerCase()} (
                          {food.caloriesKcal != null ? `${food.caloriesKcal} kcal` : "-"} · P: {food.proteinG ?? "-"}g · C: {food.carbohydrateG ?? "-"}g · G: {food.fatG ?? "-"}g)
                        </div>
                      </div>

                      {/* Prominent Calculated Grams Badge */}
                      {calc.status === "READY" && (
                        <div className="text-right shrink-0">
                          <div className="text-base sm:text-lg font-extrabold text-[var(--brand)] tabular-nums">
                            {calc.formattedGrams}
                          </div>
                          <div className="text-[10px] font-semibold text-[var(--text-secondary)]">
                            porção equivalente
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Calculated Outcome States */}
                    {calc.status === "READY" && calc.macroSnapshotsForEquivalent && (
                      <div className="p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-[var(--text-secondary)]">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            ≈ {calc.macroSnapshotsForEquivalent.caloriesKcal} kcal
                          </span>
                          <span>P: {calc.macroSnapshotsForEquivalent.proteinG}g</span>
                          <span>C: {calc.macroSnapshotsForEquivalent.carbohydrateG}g</span>
                          <span>G: {calc.macroSnapshotsForEquivalent.fatG}g</span>
                        </div>

                        <button
                          type="button"
                          disabled={!calc.canApply || !!isSubmittingId}
                          onClick={() => handleAdd(food, calc.roundedGrams!)}
                          className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-[var(--brand)] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-auto"
                        >
                          {isSubmittingThis ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              <span>Adicionando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Adicionar como substituição</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Impractical State (> 2000g) */}
                    {calc.status === "IMPRACTICAL" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>Quantidade calculada: {calc.formattedGrams}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 font-extrabold uppercase">
                              Pouco Prática
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80">
                            Para atingir a meta de {currentCriterionShort.toLowerCase()}, seriam necessários mais de 2.000 g deste alimento.
                          </p>
                        </div>

                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                          Quantidade não recomendada para substituição
                        </span>
                      </div>
                    )}

                    {/* Not Applicable / Missing Data Messages */}
                    {(calc.status === "NOT_APPLICABLE" || calc.status === "MISSING_DATA" || calc.status === "INVALID_REFERENCE") && (
                      <div className="p-2.5 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-xs text-[var(--text-secondary)] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        <span className="text-[11px]">{calc.message}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)] shrink-0">
          <span>Critério atual: <strong>{currentCriterionLabel}</strong></span>
          <button
            type="button"
            onClick={handleClose}
            disabled={!!isSubmittingId}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-default)] hover:bg-[var(--surface)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
