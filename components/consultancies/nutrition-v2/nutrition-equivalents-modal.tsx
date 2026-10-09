"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import { searchFoodsForPickerAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import type {
  MealItemWithSubstitutionsDto,
  ItemSubstitutionDto,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import {
  calculateNutrientEquivalence,
  ALL_SUBSTITUTION_CRITERIA,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  EQUIVALENT_CRITERIA_UNITS,
  STALE_REASON_LABELS,
  getTargetNutrientValue,
  type EquivalentCriterion,
  type ReferenceFoodPrescription,
  type CandidateFoodItem,
  type StaleReason,
} from "@/lib/nutrition-v2/equivalents";

interface NutritionEquivalentsModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  prescribedItem: MealItemWithSubstitutionsDto;
  substitutionToReview?: ItemSubstitutionDto | null;
  onAddSubstitution: (payload: AddSubstitutionInput) => Promise<void>;
  onUpdateSubstitution?: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
  initialFoods?: FoodListItemDto[];
}

export function NutritionEquivalentsModal({
  slug,
  isOpen,
  onClose,
  prescribedItem,
  substitutionToReview,
  onAddSubstitution,
  onUpdateSubstitution,
  initialFoods,
}: NutritionEquivalentsModalProps) {
  const isReviewMode = !!substitutionToReview;

  const [prevReviewId, setPrevReviewId] = useState<string | null>(substitutionToReview?.publicId ?? null);
  const [selectedCriterion, setSelectedCriterion] = useState<EquivalentCriterion>(
    substitutionToReview?.equivalenceCriterion || "CALORIES"
  );
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [foods, setFoods] = useState<FoodListItemDto[]>(initialFoods || []);
  const [isSearching, startSearchTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customQuantities, setCustomQuantities] = useState<Record<string, string>>({});

  if ((substitutionToReview?.publicId ?? null) !== prevReviewId) {
    setPrevReviewId(substitutionToReview?.publicId ?? null);
    setSelectedCriterion(substitutionToReview?.equivalenceCriterion || "CALORIES");
    setCustomQuantities({});
  }

  // Convert prescribed item into pure reference DTO (First Food Anchor)
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

  // Load candidate foods server-side with debounced search
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const searchQuery = isReviewMode ? (query || substitutionToReview?.foodNameSnapshot || "") : query;
        const res = await searchFoodsForPickerAction(slug, searchQuery, scopeFilter, 1);
        if (isCurrent && res.success && res.data) {
          setFoods(res.data.items);
        } else if (isCurrent && initialFoods && initialFoods.length > 0) {
          const q = searchQuery.trim().toLowerCase();
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
  }, [isOpen, slug, query, scopeFilter, initialFoods, isReviewMode, substitutionToReview]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setQuery("");
    setSuccessMessage(null);
    setSubmittingId(null);
    setCustomQuantities({});
    onClose();
  }, [isSubmitting, onClose]);

  // Keyboard accessibility (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  // Target nutrient value for currently selected criterion in reference food
  const currentTargetValue = useMemo(() => {
    if (selectedCriterion === "MANUAL") return null;
    return getTargetNutrientValue(reference, selectedCriterion);
  }, [reference, selectedCriterion]);

  // Review mode single target food
  const reviewFoodItem = useMemo(() => {
    if (!isReviewMode || !substitutionToReview) return null;
    if (substitutionToReview.foodPublicId) {
      const match = foods.find((f) => f.publicId === substitutionToReview.foodPublicId);
      if (match) return match;
    }
    // Fallback stub if not in current search window
    return {
      publicId: substitutionToReview.foodPublicId || "",
      name: substitutionToReview.foodNameSnapshot,
      displayNamePtBr: substitutionToReview.foodNameSnapshot,
      category: null,
      referenceAmount: 100,
      referenceUnitCode: "g",
      caloriesKcal: substitutionToReview.caloriesKcalSnapshot ?? null,
      proteinG: substitutionToReview.proteinGSnapshot ?? null,
      carbohydrateG: substitutionToReview.carbohydrateGSnapshot ?? null,
      fatG: substitutionToReview.fatGSnapshot ?? null,
      status: "ACTIVE",
      scope: "GLOBAL" as const,
    } as unknown as FoodListItemDto;
  }, [isReviewMode, substitutionToReview, foods]);

  // Calculated candidates list
  const calculatedItems = useMemo(() => {
    const targetFoods = isReviewMode && reviewFoodItem ? [reviewFoodItem] : foods;

    return targetFoods.map((food) => {
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

      const customQtyStr = customQuantities[food.publicId];
      const manualQty = customQtyStr
        ? parseFloat(customQtyStr.replace(",", "."))
        : (isReviewMode && substitutionToReview?.prescribedQuantity ? substitutionToReview.prescribedQuantity : null);

      const calc = calculateNutrientEquivalence(
        reference,
        candidate,
        selectedCriterion,
        selectedCriterion === "MANUAL" ? manualQty : undefined
      );

      // Self-substitution check (Requirement 17)
      const isSelf = Boolean(
        prescribedItem.foodPublicId &&
        food.publicId &&
        prescribedItem.foodPublicId === food.publicId
      );

      // Duplicate-substitution check (Requirement 18)
      const isDuplicate =
        !isReviewMode &&
        prescribedItem.substitutions.some(
          (s) => Boolean(s.foodPublicId && food.publicId && s.foodPublicId === food.publicId)
        );

      return {
        food,
        candidate,
        calc,
        isSelf,
        isDuplicate,
      };
    });
  }, [foods, isReviewMode, reviewFoodItem, customQuantities, reference, selectedCriterion, prescribedItem, substitutionToReview]);

  // Sort items: actionable first, same category first
  const sortedItems = useMemo(() => {
    if (isReviewMode) return calculatedItems;
    const refCategory = prescribedItem.categorySnapshot?.trim().toLowerCase();
    return [...calculatedItems].sort((a, b) => {
      if (a.isSelf || a.isDuplicate) return 1;
      if (b.isSelf || b.isDuplicate) return -1;
      if (a.calc.canApply && !b.calc.canApply) return -1;
      if (!a.calc.canApply && b.calc.canApply) return 1;

      if (refCategory) {
        const aCat = a.food.category?.trim().toLowerCase();
        const bCat = b.food.category?.trim().toLowerCase();
        if (aCat === refCategory && bCat !== refCategory) return -1;
        if (bCat === refCategory && aCat !== refCategory) return 1;
      }
      return 0;
    });
  }, [calculatedItems, isReviewMode, prescribedItem.categorySnapshot]);

  // Handle adding new substitution
  const handleAdd = async (food: FoodListItemDto, defaultRoundedQty: number, unitCode: string) => {
    try {
      setSubmittingId(food.publicId);
      setIsSubmitting(true);

      const customQtyStr = customQuantities[food.publicId];
      const finalQty = customQtyStr ? parseFloat(customQtyStr.replace(",", ".")) : defaultRoundedQty;
      if (!Number.isFinite(finalQty) || finalQty <= 0) {
        alert("Quantidade inválida.");
        return;
      }

      const normalizedUnit = (unitCode || "G").toUpperCase();
      const payload: AddSubstitutionInput = {
        foodPublicId: food.publicId,
        prescribedQuantity: finalQty,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: normalizedUnit.toLowerCase(),
        notes: `Equivalente por ${EQUIVALENT_CRITERIA_SHORT_LABELS[selectedCriterion].toLowerCase()}`,
        equivalenceCriterion: selectedCriterion,
        equivalenceTargetValueSnapshot: selectedCriterion === "MANUAL" ? null : currentTargetValue,
      };

      await onAddSubstitution(payload);
      setSuccessMessage(`${food.displayNamePtBr || food.name} adicionado com sucesso!`);

      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar substituição.");
    } finally {
      setIsSubmitting(false);
      setSubmittingId(null);
    }
  };

  // Handle confirming recalculation/review of existing substitution
  const handleConfirmRecalculate = async (calcRoundedQty: number | null, unitCode: string | null) => {
    if (!substitutionToReview || !onUpdateSubstitution) return;

    try {
      setIsSubmitting(true);
      const customQtyStr = customQuantities[substitutionToReview.publicId || "review"];
      const finalQty = customQtyStr
        ? parseFloat(customQtyStr.replace(",", "."))
        : (calcRoundedQty ?? substitutionToReview.prescribedQuantity ?? 100);

      if (!Number.isFinite(finalQty) || finalQty <= 0) {
        alert("Quantidade inválida.");
        return;
      }

      const normalizedUnit = (unitCode || substitutionToReview.prescribedUnitCode || "G").toUpperCase();
      const payload: UpdateSubstitutionInput = {
        prescribedQuantity: finalQty,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: normalizedUnit.toLowerCase(),
        equivalenceCriterion: selectedCriterion,
        equivalenceTargetValueSnapshot: selectedCriterion === "MANUAL" ? null : currentTargetValue,
        isStale: false,
        staleReason: null,
      };

      await onUpdateSubstitution(substitutionToReview.publicId, payload);
      setSuccessMessage("Equivalência confirmada e atualizada!");

      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao confirmar equivalência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCriterionLabel = EQUIVALENT_CRITERIA_LABELS[selectedCriterion];
  const currentCriterionShort = EQUIVALENT_CRITERIA_SHORT_LABELS[selectedCriterion];
  const currentCriterionUnit = EQUIVALENT_CRITERIA_UNITS[selectedCriterion];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden depth-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="equivalents-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </span>
              <h2 id="equivalents-title" className="text-base sm:text-lg font-bold truncate">
                {isReviewMode
                  ? substitutionToReview?.derivedStatus === "STALE"
                    ? "Recalcular Equivalência Desatualizada"
                    : "Revisar Equivalência Nutricional"
                  : "Adicionar Substituição com Equivalência"}
              </h2>
              {isReviewMode && substitutionToReview?.derivedStatus === "UNVERIFIED" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border border-zinc-500/30">
                  Não verificada
                </span>
              )}
              {isReviewMode && substitutionToReview?.derivedStatus === "STALE" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  Desatualizada
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {isReviewMode
                ? substitutionToReview?.derivedStatus === "STALE"
                  ? `O alimento principal foi alterado (${
                      substitutionToReview.staleReason
                        ? STALE_REASON_LABELS[substitutionToReview.staleReason as StaleReason] || substitutionToReview.staleReason
                        : "porção ou alimento divergente"
                    }). Revise a sugestão abaixo e confirme.`
                  : "Esta substituição não possui critério nutricional registrado. Escolha um critério ou confirme como porção manual."
                : "Selecione o alimento da biblioteca e escolha o critério para calcular a quantidade equivalente."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Fechar"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 min-h-0 flex-1">
          {/* Reference Base Food Card (First Food Anchor) */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-default)] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Alimento Principal (Base)
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] truncate block mt-0.5">
                  {prescribedItem.foodNameSnapshot}
                </span>
              </div>

              {prescribedItem.prescribedQuantity != null && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--brand)]">
                  {prescribedItem.prescribedQuantity} {prescribedItem.prescribedUnitLabel || prescribedItem.prescribedUnitCode || "g"}
                </span>
              )}
            </div>

            {/* Base Food Macro Snapshots */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedCriterion === "CALORIES"
                    ? "bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30"
                    : "bg-[var(--surface)] border-[var(--border-subtle)]"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Calorias</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.caloriesKcalSnapshot != null ? `${prescribedItem.caloriesKcalSnapshot} kcal` : "-"}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedCriterion === "PROTEIN"
                    ? "bg-sky-500/15 border-sky-500/40 ring-1 ring-sky-500/30"
                    : "bg-[var(--surface)] border-[var(--border-subtle)]"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400">Proteína</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.proteinGSnapshot != null ? `${prescribedItem.proteinGSnapshot}g` : "-"}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedCriterion === "CARBOHYDRATE"
                    ? "bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30"
                    : "bg-[var(--surface)] border-[var(--border-subtle)]"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Carboidrato</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.carbohydrateGSnapshot != null ? `${prescribedItem.carbohydrateGSnapshot}g` : "-"}
                </div>
              </div>
              <div
                className={`p-2 rounded-lg border text-center transition-all ${
                  selectedCriterion === "FAT"
                    ? "bg-orange-500/15 border-orange-500/40 ring-1 ring-orange-500/30"
                    : "bg-[var(--surface)] border-[var(--border-subtle)]"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400">Gordura</div>
                <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                  {prescribedItem.fatGSnapshot != null ? `${prescribedItem.fatGSnapshot}g` : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Criterion Tabs (Includes MANUAL) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
              <span>Critério de Equivalência:</span>
              {currentTargetValue != null && (
                <span className="text-[11px] text-[var(--brand)] font-semibold">
                  Alvo na base: {currentTargetValue} {currentCriterionUnit}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
              {ALL_SUBSTITUTION_CRITERIA.map((criterion) => {
                const isActive = selectedCriterion === criterion;
                return (
                  <button
                    key={criterion}
                    type="button"
                    onClick={() => setSelectedCriterion(criterion)}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
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

          {/* Clinical Banner */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold block">
                {selectedCriterion === "MANUAL"
                  ? "Porção Manual: o Trevo One compara os macros, e você define a porção."
                  : `Equivalência aproximada por ${currentCriterionShort.toLowerCase()}.`}
              </span>
              <span className="block opacity-90 text-[11px]">
                {selectedCriterion === "MANUAL"
                  ? "A quantidade não será recalculada automaticamente se o alimento base mudar."
                  : "A quantidade sugerida iguala o nutriente selecionado. Outros macronutrientes podem variar."}
              </span>
            </div>
          </div>

          {/* Search bar (only in Add Mode) */}
          {!isReviewMode && (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar alimento substituto (ex: batata doce, mandioca, aveia)..."
                  className="w-full min-h-[44px] pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)] placeholder:text-[var(--text-tertiary)]"
                />
                <svg className="w-4 h-4 absolute left-3 top-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[var(--text-tertiary)] font-medium mr-1">Origem:</span>
                <button
                  type="button"
                  onClick={() => setScopeFilter("ALL")}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
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
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
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
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    scopeFilter === "CONSULTANCY"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  Minha Consultoria
                </button>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Candidates / Review Card */}
          <div className="space-y-3 pt-1">
            {!isReviewMode && (
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
                <span>Alimentos candidatos ({sortedItems.length})</span>
                {isSearching && <span className="animate-pulse">Buscando...</span>}
              </div>
            )}

            {sortedItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-secondary)] bg-[var(--surface-sunken)]/50 rounded-2xl border border-dashed border-[var(--border-subtle)] space-y-1">
                <p className="font-semibold">Nenhum alimento encontrado para substituição.</p>
                <p className="text-[11px] opacity-75">Tente buscar por outro termo ou nome de ingrediente.</p>
              </div>
            ) : (
              sortedItems.map(({ food, calc, isSelf, isDuplicate }) => {
                const isSubmittingThis = submittingId === food.publicId;
                const customQtyVal =
                  customQuantities[food.publicId] ??
                  (calc.roundedQuantity != null ? String(calc.roundedQuantity) : "");

                return (
                  <div
                    key={food.publicId || "review-item"}
                    className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--brand)]/40 transition-all space-y-3 shadow-2xs"
                  >
                    {/* Item Title & Origin Badges */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-0.5 min-w-0 flex-1">
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

                      {/* Display Before vs Suggestion when reviewing */}
                      {isReviewMode && substitutionToReview && (
                        <div className="text-right shrink-0">
                          <div className="text-xs text-[var(--text-tertiary)] font-medium">
                            Quantidade atual:{" "}
                            <span className="line-through text-red-500/80 font-bold">
                              {substitutionToReview.prescribedQuantity}{" "}
                              {substitutionToReview.prescribedUnitLabel || substitutionToReview.prescribedUnitCode}
                            </span>
                          </div>
                          {calc.status === "READY" && (
                            <div className="text-sm sm:text-base font-extrabold text-[var(--brand)] tabular-nums mt-0.5">
                              Sugerido: {calc.formattedQuantity}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prominent Calculated Quantity Badge in Add Mode */}
                      {!isReviewMode && calc.status === "READY" && (
                        <div className="text-right shrink-0">
                          <div className="text-base sm:text-lg font-extrabold text-[var(--brand)] tabular-nums">
                            {calc.formattedQuantity}
                          </div>
                          <div className="text-[10px] font-semibold text-[var(--text-secondary)]">
                            quantidade sugerida
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Self-substitution block warning (Requirement 17) */}
                    {isSelf && (
                      <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Escolha um alimento diferente do alimento principal.</span>
                      </div>
                    )}

                    {/* Duplicate-substitution block warning (Requirement 18) */}
                    {isDuplicate && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Este alimento já está entre as opções de substituição.</span>
                      </div>
                    )}

                    {/* Portion Suggestion pill if available */}
                    {calc.portionSuggestion && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>{calc.portionSuggestion.formattedText}</span>
                      </div>
                    )}

                    {/* Tolerance / Difference Metrics */}
                    {calc.status === "READY" && calc.differenceMetrics && selectedCriterion !== "MANUAL" && (
                      <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          Alvo: <strong>{calc.differenceMetrics.targetValue} {currentCriterionUnit}</strong>
                        </span>
                        <span>·</span>
                        <span className="font-medium">
                          Nesta porção: <strong>{calc.differenceMetrics.candidateCalculatedValue} {currentCriterionUnit}</strong>
                        </span>
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                            Math.abs(calc.differenceMetrics.percentageDifference) <= 2
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {calc.differenceMetrics.absoluteDifference > 0 ? "+" : ""}
                          {calc.differenceMetrics.absoluteDifference} {currentCriterionUnit} (
                          {calc.differenceMetrics.percentageDifference > 0 ? "+" : ""}
                          {calc.differenceMetrics.percentageDifference}%)
                        </span>
                      </div>
                    )}

                    {/* Calculated Macros Row */}
                    {calc.status === "READY" && calc.macroSnapshotsForEquivalent && (
                      <div className="p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-[var(--text-secondary)]">
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              ≈ {calc.macroSnapshotsForEquivalent.caloriesKcal} kcal
                            </span>
                            <span>P: {calc.macroSnapshotsForEquivalent.proteinG}g</span>
                            <span>C: {calc.macroSnapshotsForEquivalent.carbohydrateG}g</span>
                            <span>G: {calc.macroSnapshotsForEquivalent.fatG}g</span>
                          </div>

                          {/* Editable quantity input before confirming */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <label className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                              Confirmar porção ({calc.unitCode?.toLowerCase() || "g"}):
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={customQtyVal}
                              onChange={(e) =>
                                setCustomQuantities({
                                  ...customQuantities,
                                  [food.publicId]: e.target.value,
                                })
                              }
                              className="w-20 min-h-[36px] px-2 py-1 text-xs font-bold text-center rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                            />
                          </div>
                        </div>

                        {/* Confirmation Button */}
                        <div className="flex justify-end pt-1">
                          {isReviewMode ? (
                            <button
                              type="button"
                              disabled={isSubmitting || isSelf}
                              onClick={() => handleConfirmRecalculate(calc.roundedQuantity, calc.unitCode)}
                              className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs text-white bg-[var(--brand)] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmitting ? "Confirmando..." : "Confirmar equivalência"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!calc.canApply || isSubmitting || isSelf || isDuplicate}
                              onClick={() => handleAdd(food, calc.roundedQuantity!, calc.unitCode!)}
                              className="min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs text-white bg-[var(--brand)] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSubmittingThis ? "Adicionando..." : "Adicionar como substituição"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Impractical State (> 2000g/ml) */}
                    {calc.status === "IMPRACTICAL" && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5">
                            <span>Quantidade calculada: {calc.formattedQuantity}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 font-extrabold uppercase">
                              Pouco Prática
                            </span>
                          </div>
                          <p className="text-[11px] opacity-80">
                            Para atingir o critério, seriam necessários mais de 2.000 {calc.unitCode?.toLowerCase() || "unidades"} deste alimento.
                          </p>
                        </div>
                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                          Quantidade não recomendada para substituição direta
                        </span>
                      </div>
                    )}

                    {/* UNKNOWN Nutrient Error State (Requirement 12) */}
                    {(calc.status === "REFERENCE_NUTRIENT_UNKNOWN" || calc.status === "CANDIDATE_NUTRIENT_UNKNOWN") && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                          </svg>
                          <span>Não é possível calcular esta equivalência porque o alimento não possui dados nutricionais suficientes.</span>
                        </div>
                        <p className="text-[11px] opacity-85">
                          Você pode escolher outro critério ou definir a porção usando a opção <strong>Porção Manual</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedCriterion("MANUAL")}
                          className="min-h-[36px] px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 transition-colors cursor-pointer"
                        >
                          Trocar para Porção Manual
                        </button>
                      </div>
                    )}

                    {/* Controlled Status Messages (Zero division, etc.) */}
                    {calc.status !== "READY" &&
                      calc.status !== "IMPRACTICAL" &&
                      calc.status !== "REFERENCE_NUTRIENT_UNKNOWN" &&
                      calc.status !== "CANDIDATE_NUTRIENT_UNKNOWN" && (
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
          <span>Critério ativo: <strong>{currentCriterionLabel}</strong></span>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-default)] hover:bg-[var(--surface)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
