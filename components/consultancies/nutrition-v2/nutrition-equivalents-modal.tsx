"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback, useRef } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import type {
  MealItemWithSubstitutionsDto,
  ItemSubstitutionDto,
  AddMealItemInput,
  UpdateMealItemInput,
  AddSubstitutionInput,
  UpdateSubstitutionInput,
} from "@/lib/nutrition-v2/plan-repository";
import {
  calculateNutrientEquivalence,
  generatePracticalRoundingSuggestions,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  EQUIVALENT_CRITERIA_UNITS,
  STALE_REASON_LABELS,
  getTargetNutrientValue,
  type EquivalentCriterion,
  type ReferenceFoodPrescription,
  type CandidateFoodItem,
  type StaleReason,
  type MacroSnapshots,
} from "@/lib/nutrition-v2/equivalents";
import {
  derivePortionUnitCode,
  roundMacro,
} from "@/lib/nutrition-v2/nutrient-calculator";

interface NutritionEquivalentsModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  prescribedItem: MealItemWithSubstitutionsDto;
  substitutionToReview?: ItemSubstitutionDto | null;
  onAddSubstitution: (payload: AddSubstitutionInput) => Promise<void>;
  onUpdateSubstitution?: (subPublicId: string, data: UpdateSubstitutionInput) => Promise<void>;
  onAddItemToMeal?: (payload: AddMealItemInput) => Promise<void>;
  onReplaceItem?: (data: UpdateMealItemInput) => Promise<void>;
  initialFoods?: FoodListItemDto[];
}

interface FoodPortionOption {
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
}

interface ReplacementCandidateState {
  food: FoodListItemDto;
  activeQty: number;
  activeUnitCode: string;
  activePortionPublicId: string | null;
  activeUnitLabel: string;
  displayMacros: MacroSnapshots;
}

function getInitialCriterion(
  reviewSub?: ItemSubstitutionDto | null,
  item?: MealItemWithSubstitutionsDto
): EquivalentCriterion {
  if (reviewSub?.equivalenceCriterion && reviewSub.equivalenceCriterion !== "MANUAL") {
    return reviewSub.equivalenceCriterion;
  }
  if (item?.caloriesKcalSnapshot != null && item.caloriesKcalSnapshot > 0) return "CALORIES";
  if (item?.proteinGSnapshot != null && item.proteinGSnapshot > 0) return "PROTEIN";
  if (item?.carbohydrateGSnapshot != null && item.carbohydrateGSnapshot > 0) return "CARBOHYDRATE";
  if (item?.fatGSnapshot != null && item.fatGSnapshot > 0) return "FAT";
  return "CALORIES";
}

export function NutritionEquivalentsModal({
  slug,
  isOpen,
  onClose,
  prescribedItem,
  substitutionToReview,
  onAddSubstitution,
  onUpdateSubstitution,
  onAddItemToMeal,
  onReplaceItem,
  initialFoods,
}: NutritionEquivalentsModalProps) {
  const isReviewMode = !!substitutionToReview;

  const [prevReviewId, setPrevReviewId] = useState<string | null>(substitutionToReview?.publicId ?? null);
  const [selectedCriterion, setSelectedCriterion] = useState<EquivalentCriterion>(
    getInitialCriterion(substitutionToReview, prescribedItem)
  );
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [foods, setFoods] = useState<FoodListItemDto[]>(initialFoods || []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchRequestIdRef = useRef(0);
  const [isSearching, startSearchTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customQuantities, setCustomQuantities] = useState<Record<string, string>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [foodPortionsMap, setFoodPortionsMap] = useState<Record<string, FoodPortionOption[]>>({});
  const [replacementCandidate, setReplacementCandidate] = useState<ReplacementCandidateState | null>(null);
  const loadedPortionFoodIdsRef = useRef<Set<string>>(new Set());

  if ((substitutionToReview?.publicId ?? null) !== prevReviewId) {
    setPrevReviewId(substitutionToReview?.publicId ?? null);
    setSelectedCriterion(getInitialCriterion(substitutionToReview, prescribedItem));
    setCustomQuantities({});
    setSelectedUnits({});
    setReplacementCandidate(null);
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

  // Render-phase state sync: Reset to page 1 whenever search query or scope filter changes
  const [prevSearchSnapshot, setPrevSearchSnapshot] = useState({ query, scopeFilter });
  if (prevSearchSnapshot.query !== query || prevSearchSnapshot.scopeFilter !== scopeFilter) {
    setPrevSearchSnapshot({ query, scopeFilter });
    setPage(1);
  }

  // Load candidate foods server-side with debounced search and race-condition request ID guard
  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const currentRequestId = ++searchRequestIdRef.current;
    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        const searchQuery = isReviewMode ? (query || substitutionToReview?.foodNameSnapshot || "") : query;
        const res = await searchFoodsForPickerAction(slug, searchQuery, scopeFilter, page);
        if (!isCurrent || searchRequestIdRef.current !== currentRequestId) return;

        if (res.success && res.data) {
          setFoods(res.data.items);
          setTotalPages(res.data.totalPages || 1);
          setTotalCount(res.data.total || 0);
        } else if (initialFoods && initialFoods.length > 0 && !searchQuery.trim()) {
          setFoods(initialFoods);
          setTotalPages(1);
          setTotalCount(initialFoods.length);
        }
      });
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [isOpen, slug, query, scopeFilter, page, initialFoods, isReviewMode, substitutionToReview]);

  // Pre-load household portions from Food Library for candidate foods
  useEffect(() => {
    if (!isOpen || !slug || foods.length === 0) return;

    const foodsToFetch = foods.filter(
      (f) => f.publicId && !loadedPortionFoodIdsRef.current.has(f.publicId)
    );
    if (foodsToFetch.length === 0) return;

    foodsToFetch.forEach((f) => loadedPortionFoodIdsRef.current.add(f.publicId));

    Promise.all(
      foodsToFetch.map(async (f) => {
        try {
          const res = await getFoodPortionsForPickerAction(slug, f.publicId);
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
            return { foodPublicId: f.publicId, portions: activePortions };
          }
        } catch {
          // ignore network errors
        }
        return null;
      })
    ).then((results) => {
      setFoodPortionsMap((prev) => {
        const next = { ...prev };
        for (const item of results) {
          if (item) {
            next[item.foodPublicId] = item.portions;
          }
        }
        return next;
      });
    });
  }, [isOpen, slug, foods]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setQuery("");
    setPage(1);
    setSuccessMessage(null);
    setSubmittingId(null);
    setCustomQuantities({});
    setSelectedUnits({});
    setReplacementCandidate(null);
    loadedPortionFoodIdsRef.current.clear();
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

  // Action A: Add candidate as a new item to the meal
  const handleAddToMeal = async (
    food: FoodListItemDto,
    defaultRoundedQty: number,
    unitCode: string,
    portionPublicId?: string | null,
    unitLabel?: string | null
  ) => {
    if (!onAddItemToMeal) return;
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
      const payload: AddMealItemInput = {
        foodPublicId: food.publicId,
        prescribedQuantity: finalQty,
        portionPublicId: portionPublicId || null,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: unitLabel || (normalizedUnit === "G" ? "Gramas (g)" : normalizedUnit.toLowerCase()),
        notes: null,
      };

      await onAddItemToMeal(payload);
      setSuccessMessage(`${food.displayNamePtBr || food.name} adicionado à refeição!`);

      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar alimento à refeição.");
    } finally {
      setIsSubmitting(false);
      setSubmittingId(null);
    }
  };

  // Action B: Add candidate as a linked substitution option
  const handleAddSubstitution = async (
    food: FoodListItemDto,
    defaultRoundedQty: number,
    unitCode: string,
    portionPublicId?: string | null,
    unitLabel?: string | null
  ) => {
    try {
      setSubmittingId(food.publicId);
      setIsSubmitting(true);

      const customQtyStr = customQuantities[food.publicId];
      const finalQty = customQtyStr ? parseFloat(customQtyStr.replace(",", ".")) : defaultRoundedQty;
      if (!Number.isFinite(finalQty) || finalQty <= 0) {
        alert("Quantidade inválida.");
        return;
      }

      const isOverridden =
        selectedCriterion === "MANUAL" ||
        (customQtyStr != null && parseFloat(customQtyStr.replace(",", ".")) !== defaultRoundedQty) ||
        Boolean(portionPublicId);
      const criterionToSave = isOverridden ? "MANUAL" : selectedCriterion;

      const normalizedUnit = (unitCode || "G").toUpperCase();
      const payload: AddSubstitutionInput = {
        foodPublicId: food.publicId,
        prescribedQuantity: finalQty,
        portionPublicId: portionPublicId || null,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: unitLabel || (normalizedUnit === "G" ? "Gramas (g)" : normalizedUnit.toLowerCase()),
        notes: isOverridden
          ? "Porção ajustada manualmente"
          : `Equivalente por ${EQUIVALENT_CRITERIA_SHORT_LABELS[selectedCriterion].toLowerCase()}`,
        equivalenceCriterion: criterionToSave,
        equivalenceTargetValueSnapshot: criterionToSave === "MANUAL" ? null : currentTargetValue,
      };

      await onAddSubstitution(payload);
      setSuccessMessage(`${food.displayNamePtBr || food.name} adicionado como substituição!`);

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

  // Action C: Initiate replacement of original food
  const handleStartReplace = (
    food: FoodListItemDto,
    activeQty: number,
    activeUnitCode: string,
    activePortionPublicId: string | null,
    activeUnitLabel: string,
    displayMacros: MacroSnapshots
  ) => {
    setReplacementCandidate({
      food,
      activeQty,
      activeUnitCode,
      activePortionPublicId,
      activeUnitLabel,
      displayMacros,
    });
  };

  // Action C: Confirm and execute replacement
  const handleConfirmReplace = async () => {
    if (!replacementCandidate || !onReplaceItem) return;
    try {
      setIsSubmitting(true);
      const normalizedUnit = (replacementCandidate.activeUnitCode || "G").toUpperCase();
      const payload: UpdateMealItemInput = {
        foodPublicId: replacementCandidate.food.publicId,
        prescribedQuantity: replacementCandidate.activeQty,
        portionPublicId: replacementCandidate.activePortionPublicId || null,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: replacementCandidate.activeUnitLabel || (normalizedUnit === "G" ? "Gramas (g)" : normalizedUnit.toLowerCase()),
        notes: prescribedItem.notes || null,
      };

      await onReplaceItem(payload);
      setSuccessMessage(
        `${prescribedItem.foodNameSnapshot} foi substituído por ${replacementCandidate.food.displayNamePtBr || replacementCandidate.food.name}!`
      );

      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao substituir alimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle confirming recalculation/review of existing substitution
  const handleConfirmRecalculate = async (
    calcRoundedQty: number | null,
    unitCode: string | null,
    portionPublicId?: string | null,
    unitLabel?: string | null
  ) => {
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

      const isOverridden =
        selectedCriterion === "MANUAL" ||
        (calcRoundedQty != null && finalQty !== calcRoundedQty) ||
        Boolean(portionPublicId);
      const criterionToSave = isOverridden ? "MANUAL" : selectedCriterion;

      const normalizedUnit = (unitCode || substitutionToReview.prescribedUnitCode || "G").toUpperCase();
      const payload: UpdateSubstitutionInput = {
        prescribedQuantity: finalQty,
        portionPublicId: portionPublicId || null,
        prescribedUnitCode: normalizedUnit,
        prescribedUnitLabel: unitLabel || (normalizedUnit === "G" ? "Gramas (g)" : normalizedUnit.toLowerCase()),
        equivalenceCriterion: criterionToSave,
        equivalenceTargetValueSnapshot: criterionToSave === "MANUAL" ? null : currentTargetValue,
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

  const deltaKcal =
    replacementCandidate &&
    prescribedItem.caloriesKcalSnapshot != null &&
    replacementCandidate.displayMacros.caloriesKcal != null
      ? Math.round((replacementCandidate.displayMacros.caloriesKcal - prescribedItem.caloriesKcalSnapshot) * 10) / 10
      : null;
  const deltaP =
    replacementCandidate &&
    prescribedItem.proteinGSnapshot != null &&
    replacementCandidate.displayMacros.proteinG != null
      ? Math.round((replacementCandidate.displayMacros.proteinG - prescribedItem.proteinGSnapshot) * 10) / 10
      : null;
  const deltaC =
    replacementCandidate &&
    prescribedItem.carbohydrateGSnapshot != null &&
    replacementCandidate.displayMacros.carbohydrateG != null
      ? Math.round((replacementCandidate.displayMacros.carbohydrateG - prescribedItem.carbohydrateGSnapshot) * 10) / 10
      : null;
  const deltaG =
    replacementCandidate &&
    prescribedItem.fatGSnapshot != null &&
    replacementCandidate.displayMacros.fatG != null
      ? Math.round((replacementCandidate.displayMacros.fatG - prescribedItem.fatGSnapshot) * 10) / 10
      : null;

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
                {replacementCandidate
                  ? "Confirmar Substituição do Alimento Base"
                  : isReviewMode
                  ? substitutionToReview?.derivedStatus === "STALE"
                    ? "Recalcular Equivalência Desatualizada"
                    : "Revisar Equivalência Nutricional"
                  : "Equivalência Nutricional Dinâmica"}
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
              {replacementCandidate
                ? "Confira os dados antes de substituir o alimento original na refeição."
                : isReviewMode
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
          {replacementCandidate ? (
            /* Action C: Dedicated Replacement Confirmation View */
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Confirmar Substituição do Alimento Base
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Você está prestes a substituir <strong>{prescribedItem.foodNameSnapshot}</strong> por <strong>{replacementCandidate.food.displayNamePtBr || replacementCandidate.food.name}</strong> diretamente na refeição. A posição do alimento será preservada.
                  </p>
                </div>
              </div>

              {/* Side-by-side Before vs After Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Before (Original) */}
                <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-sunken)] space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Alimento Atual (Removido)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400">
                      Antes
                    </span>
                  </div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">
                    {prescribedItem.foodNameSnapshot}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">
                    Porção: {prescribedItem.prescribedQuantity} {prescribedItem.prescribedUnitLabel || prescribedItem.prescribedUnitCode || "g"}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center pt-1 font-mono text-[11px]">
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-amber-700 dark:text-amber-400">
                      <div className="text-[9px] uppercase font-bold">Kcal</div>
                      <div className="font-bold">{prescribedItem.caloriesKcalSnapshot ?? "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-sky-700 dark:text-sky-400">
                      <div className="text-[9px] uppercase font-bold">P</div>
                      <div className="font-bold">{prescribedItem.proteinGSnapshot != null ? `${prescribedItem.proteinGSnapshot}g` : "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-emerald-700 dark:text-emerald-400">
                      <div className="text-[9px] uppercase font-bold">C</div>
                      <div className="font-bold">{prescribedItem.carbohydrateGSnapshot != null ? `${prescribedItem.carbohydrateGSnapshot}g` : "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-orange-700 dark:text-orange-400">
                      <div className="text-[9px] uppercase font-bold">G</div>
                      <div className="font-bold">{prescribedItem.fatGSnapshot != null ? `${prescribedItem.fatGSnapshot}g` : "-"}</div>
                    </div>
                  </div>
                </div>

                {/* After (New Candidate) */}
                <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Novo Alimento Base
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                      Depois
                    </span>
                  </div>
                  <div className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                    {replacementCandidate.food.displayNamePtBr || replacementCandidate.food.name}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Porção: {replacementCandidate.activeQty} {replacementCandidate.activeUnitLabel || replacementCandidate.activeUnitCode || "g"}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center pt-1 font-mono text-[11px]">
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-emerald-500/30 text-amber-700 dark:text-amber-400">
                      <div className="text-[9px] uppercase font-bold">Kcal</div>
                      <div className="font-bold">{replacementCandidate.displayMacros.caloriesKcal ?? "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-emerald-500/30 text-sky-700 dark:text-sky-400">
                      <div className="text-[9px] uppercase font-bold">P</div>
                      <div className="font-bold">{replacementCandidate.displayMacros.proteinG != null ? `${replacementCandidate.displayMacros.proteinG}g` : "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      <div className="text-[9px] uppercase font-bold">C</div>
                      <div className="font-bold">{replacementCandidate.displayMacros.carbohydrateG != null ? `${replacementCandidate.displayMacros.carbohydrateG}g` : "-"}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[var(--surface)] border border-emerald-500/30 text-orange-700 dark:text-orange-400">
                      <div className="text-[9px] uppercase font-bold">G</div>
                      <div className="font-bold">{replacementCandidate.displayMacros.fatG != null ? `${replacementCandidate.displayMacros.fatG}g` : "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutritional Delta Summary Card */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-[var(--text-secondary)]">Diferença Nutricional Prevista:</span>
                <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
                  <span className={`font-bold ${deltaKcal != null && deltaKcal > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-primary)]"}`}>
                    {deltaKcal != null && deltaKcal > 0 ? `+${deltaKcal}` : deltaKcal ?? "-"} kcal
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-sky-700 dark:text-sky-400 font-semibold">
                    P {deltaP != null && deltaP > 0 ? `+${deltaP}` : deltaP ?? "-"}g
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    C {deltaC != null && deltaC > 0 ? `+${deltaC}` : deltaC ?? "-"}g
                  </span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-orange-700 dark:text-orange-400 font-semibold">
                    G {deltaG != null && deltaG > 0 ? `+${deltaG}` : deltaG ?? "-"}g
                  </span>
                </div>
              </div>

              {/* Existing Substitutions Warning */}
              {prescribedItem.substitutions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Atenção: este alimento possui {prescribedItem.substitutions.length} substituição(ões) vinculada(s)</span>
                  </div>
                  <p className="leading-relaxed opacity-95">
                    As opções de substituição cadastradas serão preservadas, mas serão marcadas automaticamente como <strong>Desatualizadas (BASE_FOOD_CHANGED)</strong> para que você possa revisar ou recalcular as equivalências em relação ao novo alimento.
                  </p>
                </div>
              )}

              {/* Confirmation Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setReplacementCandidate(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Voltar para a busca
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmReplace}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Substituindo..." : "Confirmar e Substituir Alimento"}
                </button>
              </div>
            </div>
          ) : (
            /* Regular flow */
            <>
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

                {/* Base Food Macro Snapshots (Interactive Clickable Criterion Selectors) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    role="button"
                    aria-pressed={selectedCriterion === "CALORIES"}
                    onClick={() => setSelectedCriterion("CALORIES")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCriterion === "CALORIES"
                        ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40 shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border-subtle)] hover:border-amber-500/50 hover:bg-amber-500/5"
                    }`}
                    title="Clique para calcular equivalência por Calorias"
                  >
                    <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                      <span>Calorias</span>
                      {selectedCriterion === "CALORIES" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                      {prescribedItem.caloriesKcalSnapshot != null ? `${prescribedItem.caloriesKcalSnapshot} kcal` : "-"}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="button"
                    aria-pressed={selectedCriterion === "PROTEIN"}
                    onClick={() => setSelectedCriterion("PROTEIN")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCriterion === "PROTEIN"
                        ? "bg-sky-500/20 border-sky-500 ring-2 ring-sky-500/40 shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border-subtle)] hover:border-sky-500/50 hover:bg-sky-500/5"
                    }`}
                    title="Clique para calcular equivalência por Proteína"
                  >
                    <div className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 flex items-center justify-center gap-1">
                      <span>Proteína</span>
                      {selectedCriterion === "PROTEIN" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                      {prescribedItem.proteinGSnapshot != null ? `${prescribedItem.proteinGSnapshot}g` : "-"}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="button"
                    aria-pressed={selectedCriterion === "CARBOHYDRATE"}
                    onClick={() => setSelectedCriterion("CARBOHYDRATE")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCriterion === "CARBOHYDRATE"
                        ? "bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border-subtle)] hover:border-emerald-500/50 hover:bg-emerald-500/5"
                    }`}
                    title="Clique para calcular equivalência por Carboidrato"
                  >
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                      <span>Carboidrato</span>
                      {selectedCriterion === "CARBOHYDRATE" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                      {prescribedItem.carbohydrateGSnapshot != null ? `${prescribedItem.carbohydrateGSnapshot}g` : "-"}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="button"
                    aria-pressed={selectedCriterion === "FAT"}
                    onClick={() => setSelectedCriterion("FAT")}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCriterion === "FAT"
                        ? "bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/40 shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border-subtle)] hover:border-orange-500/50 hover:bg-orange-500/5"
                    }`}
                    title="Clique para calcular equivalência por Gordura"
                  >
                    <div className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400 flex items-center justify-center gap-1">
                      <span>Gordura</span>
                      {selectedCriterion === "FAT" && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] mt-0.5 tabular-nums">
                      {prescribedItem.fatGSnapshot != null ? `${prescribedItem.fatGSnapshot}g` : "-"}
                    </div>
                  </button>
                </div>
              </div>

          {/* Primary Criterion Tabs + Secondary Manual Adjustment Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
              <span>Critério de Equivalência:</span>
              {currentTargetValue != null && selectedCriterion !== "MANUAL" && (
                <span className="text-[11px] text-[var(--brand)] font-semibold">
                  Alvo na base: {currentTargetValue} {currentCriterionUnit}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex-1">
                {(["CALORIES", "CARBOHYDRATE", "PROTEIN", "FAT"] as const).map((criterion) => {
                  const isActive = selectedCriterion === criterion;
                  return (
                    <button
                      key={criterion}
                      type="button"
                      onClick={() => setSelectedCriterion(criterion)}
                      className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
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

              <button
                type="button"
                onClick={() => setSelectedCriterion(selectedCriterion === "MANUAL" ? "CALORIES" : "MANUAL")}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5 ${
                  selectedCriterion === "MANUAL"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 ring-1 ring-amber-500/20"
                    : "text-[var(--text-secondary)] border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span>✏️ Ajustar porção manualmente</span>
              </button>
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

              {/* Top Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs">
                  <span className="text-[var(--text-secondary)] font-medium text-[11px]">
                    Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} alimento{totalCount !== 1 ? "s" : ""})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1 || isSearching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      ← Anterior
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || isSearching}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}
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
                const foodPortions = foodPortionsMap[food.publicId] || [];
                const selectedUnitVal = selectedUnits[food.publicId] || "G";
                const customQtyVal =
                  customQuantities[food.publicId] ??
                  (calc.roundedQuantity != null ? String(calc.roundedQuantity) : "");
                const activeQtyNum = parseFloat(customQtyVal.replace(",", "."));
                const activeQty = Number.isFinite(activeQtyNum) && activeQtyNum > 0 ? activeQtyNum : (calc.roundedQuantity || 1);

                let activePortionPublicId: string | null = null;
                let activeUnitCode = calc.unitCode || "G";
                let activeUnitLabel = "Gramas (g)";
                let portionMultiplier = 1;

                if (selectedUnitVal !== "G") {
                  const pt = foodPortions.find((p) => p.publicId === selectedUnitVal);
                  if (pt) {
                    activePortionPublicId = pt.publicId;
                    activeUnitCode = derivePortionUnitCode(pt.label);
                    activeUnitLabel = pt.label;
                    portionMultiplier = pt.equivalentReferenceAmount;
                  }
                }

                // Practical rounding suggestions near calculated equivalent
                const roundingOptions = calc.status === "READY" && calc.roundedQuantity != null
                  ? generatePracticalRoundingSuggestions(
                      selectedUnitVal === "G"
                        ? calc.roundedQuantity
                        : Math.max(1, Math.round(calc.roundedQuantity / portionMultiplier)),
                      selectedUnitVal === "G" ? (calc.unitCode?.toLowerCase() || "g") : activeUnitLabel
                    )
                  : [];

                const isOverridden =
                  selectedCriterion === "MANUAL" ||
                  (calc.roundedQuantity != null && activeQty !== calc.roundedQuantity) ||
                  selectedUnitVal !== "G";

                // Dynamic macros based on chosen prescribed quantity and unit
                const effectiveGrams = activeQty * (selectedUnitVal === "G" ? 1 : portionMultiplier);
                const macroScale = food.referenceAmount > 0 ? effectiveGrams / food.referenceAmount : 1;
                const displayMacros: MacroSnapshots = {
                  caloriesKcal: food.caloriesKcal != null ? roundMacro(food.caloriesKcal * macroScale) : null,
                  proteinG: food.proteinG != null ? roundMacro(food.proteinG * macroScale) : null,
                  carbohydrateG: food.carbohydrateG != null ? roundMacro(food.carbohydrateG * macroScale) : null,
                  fatG: food.fatG != null ? roundMacro(food.fatG * macroScale) : null,
                };

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
                            <div className="mt-0.5">
                              <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                                Equivalência calculada
                              </div>
                              <div className="text-sm sm:text-base font-extrabold text-[var(--brand)] tabular-nums">
                                {calc.formattedQuantity}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prominent Calculated Quantity Badge in Add Mode */}
                      {!isReviewMode && calc.status === "READY" && (
                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                            Equivalência calculada
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-[var(--brand)] tabular-nums">
                            {calc.formattedQuantity}
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

                    {/* Side-by-Side 4-Macro Comparative Table */}
                    {calc.status === "READY" && calc.macroSnapshotsForEquivalent && (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden text-xs bg-[var(--surface-sunken)]/40">
                          <div className="grid grid-cols-3 bg-[var(--surface-sunken)] px-3 py-2 font-bold text-[11px] text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                            <span>Nutriente</span>
                            <span className="text-center">Alimento Base ({prescribedItem.prescribedQuantity}{prescribedItem.prescribedUnitLabel || prescribedItem.prescribedUnitCode || "g"})</span>
                            <span className="text-right">Substituto Sugerido ({activeQty} {selectedUnitVal === "G" ? (calc.unitCode?.toLowerCase() || "g") : activeUnitLabel})</span>
                          </div>

                          {/* Calorias */}
                          <div className={`grid grid-cols-3 px-3 py-2 items-center border-b border-[var(--border-subtle)] transition-colors ${selectedCriterion === "CALORIES" ? "bg-amber-500/15 font-bold" : ""}`}>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">Calorias</span>
                              {selectedCriterion === "CALORIES" && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/25 text-amber-800 dark:text-amber-300 uppercase font-extrabold shrink-0">Critério</span>
                              )}
                            </span>
                            <span className="text-center tabular-nums">{reference.caloriesKcalSnapshot != null ? `${reference.caloriesKcalSnapshot} kcal` : "-"}</span>
                            <span className="text-right tabular-nums">
                              <strong>{displayMacros.caloriesKcal ?? "-"} kcal</strong>
                              {reference.caloriesKcalSnapshot != null && displayMacros.caloriesKcal != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                                  ({(displayMacros.caloriesKcal - reference.caloriesKcalSnapshot > 0 ? "+" : "")}
                                  {Math.round((displayMacros.caloriesKcal - reference.caloriesKcalSnapshot) * 10) / 10} kcal)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Carboidratos */}
                          <div className={`grid grid-cols-3 px-3 py-2 items-center border-b border-[var(--border-subtle)] transition-colors ${selectedCriterion === "CARBOHYDRATE" ? "bg-emerald-500/15 font-bold" : ""}`}>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">Carboidratos</span>
                              {selectedCriterion === "CARBOHYDRATE" && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 uppercase font-extrabold shrink-0">Critério</span>
                              )}
                            </span>
                            <span className="text-center tabular-nums">{reference.carbohydrateGSnapshot != null ? `${reference.carbohydrateGSnapshot}g` : "-"}</span>
                            <span className="text-right tabular-nums">
                              <strong>{displayMacros.carbohydrateG ?? "-"}g</strong>
                              {reference.carbohydrateGSnapshot != null && displayMacros.carbohydrateG != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                                  ({(displayMacros.carbohydrateG - reference.carbohydrateGSnapshot > 0 ? "+" : "")}
                                  {Math.round((displayMacros.carbohydrateG - reference.carbohydrateGSnapshot) * 10) / 10}g)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Proteínas */}
                          <div className={`grid grid-cols-3 px-3 py-2 items-center border-b border-[var(--border-subtle)] transition-colors ${selectedCriterion === "PROTEIN" ? "bg-sky-500/15 font-bold" : ""}`}>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                              <span className="truncate">Proteínas</span>
                              {selectedCriterion === "PROTEIN" && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/25 text-sky-800 dark:text-sky-300 uppercase font-extrabold shrink-0">Critério</span>
                              )}
                            </span>
                            <span className="text-center tabular-nums">{reference.proteinGSnapshot != null ? `${reference.proteinGSnapshot}g` : "-"}</span>
                            <span className="text-right tabular-nums">
                              <strong>{displayMacros.proteinG ?? "-"}g</strong>
                              {reference.proteinGSnapshot != null && displayMacros.proteinG != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                                  ({(displayMacros.proteinG - reference.proteinGSnapshot > 0 ? "+" : "")}
                                  {Math.round((displayMacros.proteinG - reference.proteinGSnapshot) * 10) / 10}g)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Gorduras */}
                          <div className={`grid grid-cols-3 px-3 py-2 items-center transition-colors ${selectedCriterion === "FAT" ? "bg-orange-500/15 font-bold" : ""}`}>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                              <span className="truncate">Gorduras</span>
                              {selectedCriterion === "FAT" && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-orange-500/25 text-orange-800 dark:text-orange-300 uppercase font-extrabold shrink-0">Critério</span>
                              )}
                            </span>
                            <span className="text-center tabular-nums">{reference.fatGSnapshot != null ? `${reference.fatGSnapshot}g` : "-"}</span>
                            <span className="text-right tabular-nums">
                              <strong>{displayMacros.fatG ?? "-"}g</strong>
                              {reference.fatGSnapshot != null && displayMacros.fatG != null && (
                                <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                                  ({(displayMacros.fatG - reference.fatGSnapshot > 0 ? "+" : "")}
                                  {Math.round((displayMacros.fatG - reference.fatGSnapshot) * 10) / 10}g)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Confirmation & Practical Rounding Box */}
                        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-3">
                          {/* Calculated vs Practical Display (Clinically Clear Differentiation) */}
                          <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-[var(--text-secondary)] font-medium">Calculado:</span>
                              <span className="font-mono font-bold text-[var(--text-primary)]">
                                {calc.calculatedQuantity != null
                                  ? `${roundMacro(calc.calculatedQuantity)} ${calc.unitCode?.toLowerCase() || "g"}`
                                  : calc.formattedQuantity}
                              </span>
                              <span className="text-[var(--text-tertiary)]">|</span>
                              <span className="text-[var(--text-secondary)] font-medium">Aplicar:</span>
                              <span className="font-mono font-bold text-[var(--brand)]">
                                {activeQty} {selectedUnitVal === "G" ? (calc.unitCode?.toLowerCase() || "g") : activeUnitLabel}
                              </span>
                              {calc.differenceMetrics && selectedCriterion !== "MANUAL" && (
                                <>
                                  <span className="text-[var(--text-tertiary)]">|</span>
                                  <span className="text-[var(--text-secondary)] font-medium">
                                    Diferença ({currentCriterionShort.toLowerCase()}):
                                  </span>
                                  <span
                                    className={`font-semibold font-mono ${
                                      Math.abs(calc.differenceMetrics.percentageDifference) <= 2
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {calc.differenceMetrics.absoluteDifference > 0 ? "+" : ""}
                                    {calc.differenceMetrics.absoluteDifference} {currentCriterionUnit} (
                                    {calc.differenceMetrics.percentageDifference > 0 ? "+" : ""}
                                    {calc.differenceMetrics.percentageDifference}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Header: Equivalência calculada + Sugestões de arredondamento rápido */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                            <div className="text-xs">
                              <span className="text-[var(--text-secondary)] font-medium">Equivalência calculada: </span>
                              <strong className="text-[var(--brand)] font-bold text-sm tabular-nums">
                                {calc.formattedQuantity || `${calc.roundedQuantity} g`}
                              </strong>
                            </div>

                            {/* Practical Rounding Suggestions Quick Chips */}
                            {roundingOptions.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-[var(--text-tertiary)] font-semibold mr-0.5">
                                  Arredondar:
                                </span>
                                {roundingOptions.map((opt) => {
                                  const isSelected = activeQty === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setCustomQuantities((prev) => ({
                                          ...prev,
                                          [food.publicId]: String(opt.value),
                                        }));
                                      }}
                                      className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                        isSelected
                                          ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-xs"
                                          : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--brand)]/60 hover:bg-[var(--surface-hover)]"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Inputs: Quantidade prescrita + Unidade */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                Quantidade prescrita:
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0.1"
                                value={customQtyVal}
                                onChange={(e) =>
                                  setCustomQuantities({
                                    ...customQuantities,
                                    [food.publicId]: e.target.value,
                                  })
                                }
                                className="w-full min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] tabular-nums"
                                placeholder="Ex: 55"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                Unidade:
                              </label>
                              <select
                                value={selectedUnitVal}
                                onChange={(e) => {
                                  const newUnit = e.target.value;
                                  let nextQtyStr = customQtyVal;
                                  const curNum = parseFloat(customQtyVal.replace(",", "."));

                                  if (selectedUnitVal === "G" && newUnit !== "G") {
                                    const pt = foodPortions.find((p) => p.publicId === newUnit);
                                    if (pt && pt.equivalentReferenceAmount > 0 && Number.isFinite(curNum) && curNum > 10) {
                                      nextQtyStr = String(Math.max(1, Math.round(curNum / pt.equivalentReferenceAmount)));
                                    }
                                  } else if (selectedUnitVal !== "G" && newUnit === "G") {
                                    const prevPt = foodPortions.find((p) => p.publicId === selectedUnitVal);
                                    if (prevPt && prevPt.equivalentReferenceAmount > 0) {
                                      nextQtyStr = String(Math.round((Number.isFinite(curNum) ? curNum : 1) * prevPt.equivalentReferenceAmount));
                                    }
                                  }

                                  setSelectedUnits((prev) => ({ ...prev, [food.publicId]: newUnit }));
                                  setCustomQuantities((prev) => ({ ...prev, [food.publicId]: nextQtyStr }));
                                }}
                                className="w-full min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                              >
                                <option value="G">Gramas (g)</option>
                                {foodPortions.map((p) => (
                                  <option key={p.publicId} value={p.publicId}>
                                    {p.label} ({p.equivalentReferenceAmount}g)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Status & Action Buttons Row (Touch Targets >= 44px) */}
                          <div className="space-y-2.5 pt-1">
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {isOverridden ? (
                                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Ajuste manual (critério: MANUAL — não recalcula automaticamente)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Equivalência automática por {currentCriterionShort.toLowerCase()}
                                </span>
                              )}
                            </div>

                            {isReviewMode ? (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  disabled={isSubmitting || isSelf}
                                  onClick={() => handleConfirmRecalculate(activeQty, activeUnitCode, activePortionPublicId, activeUnitLabel)}
                                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--brand)] hover:opacity-90 active:scale-[0.98] transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSubmitting ? "Confirmando..." : "Confirmar equivalência"}
                                </button>
                              </div>
                            ) : (
                              /* Three Clearly Distinct Actions in Add Mode */
                              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                                <div className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                                  Ações para este equivalente:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {/* Action A: Adicionar à refeição */}
                                  {onAddItemToMeal && (
                                    <button
                                      type="button"
                                      disabled={!calc.canApply || isSubmitting || isSelf}
                                      onClick={() => handleAddToMeal(food, activeQty, activeUnitCode, activePortionPublicId, activeUnitLabel)}
                                      className="min-h-[44px] p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] transition-all text-left flex flex-col justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs group"
                                    >
                                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                                        <svg className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Adicionar à refeição</span>
                                      </div>
                                      <span className="text-[10px] text-emerald-900/70 dark:text-emerald-300/70 mt-1 leading-tight">
                                        Novo alimento independente (soma aos macros da refeição).
                                      </span>
                                    </button>
                                  )}

                                  {/* Action B: Como substituição */}
                                  <button
                                    type="button"
                                    disabled={!calc.canApply || isSubmitting || isSelf || isDuplicate}
                                    onClick={() => handleAddSubstitution(food, activeQty, activeUnitCode, activePortionPublicId, activeUnitLabel)}
                                    className="min-h-[44px] p-2.5 rounded-xl bg-[var(--brand)] text-white hover:opacity-90 active:scale-[0.98] transition-all text-left flex flex-col justify-between shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                      </svg>
                                      <span>{isSubmittingThis ? "Adicionando..." : "Como substituição"}</span>
                                    </div>
                                    <span className="text-[10px] text-white/80 mt-1 leading-tight">
                                      Alternativa (&quot;OU&quot;) para o paciente variar a dieta.
                                    </span>
                                  </button>

                                  {/* Action C: Substituir o alimento */}
                                  {onReplaceItem && (
                                    <button
                                      type="button"
                                      disabled={!calc.canApply || isSubmitting || isSelf}
                                      onClick={() => handleStartReplace(food, activeQty, activeUnitCode, activePortionPublicId, activeUnitLabel, displayMacros)}
                                      className="min-h-[44px] p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] transition-all text-left flex flex-col justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs group"
                                    >
                                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800 dark:text-amber-300">
                                        <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Substituir o alimento</span>
                                      </div>
                                      <span className="text-[10px] text-amber-900/70 dark:text-amber-300/70 mt-1 leading-tight">
                                        Troca o alimento base mantendo sua posição na refeição.
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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

          {/* Bottom Pagination Controls */}
          {!isReviewMode && totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs mt-2">
              <span className="text-[var(--text-secondary)] font-medium text-[11px]">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} alimento{totalCount !== 1 ? "s" : ""})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || isSearching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || isSearching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition-colors"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
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
