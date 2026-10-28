"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback, useMemo } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import type {
  MealItemWithSubstitutionsDto,
  AddSubstitutionInput,
  UpdateMealItemInput,
} from "@/lib/nutrition-v2/plan-repository";
import {
  calculateNutrientEquivalence,
  EQUIVALENT_CRITERIA_UNITS,
  getTargetNutrientValue,
  type EquivalentCriterion,
  type ReferenceFoodPrescription,
} from "@/lib/nutrition-v2/equivalents";
import {
  calculateItemNutrients,
  parseQuantityInput,
  formatQuantityForDisplay,
} from "@/lib/nutrition-v2/nutrient-calculator";
import { getDataQualityBadgeInfo } from "@/lib/nutrition-v2/food-search";
import {
  NutritionCustomMeasureModal,
  type FoodPortionOption,
} from "./nutrition-custom-measure-modal";

export interface NutritionSubstitutionInlineSearchProps {
  slug: string;
  prescribedItem: MealItemWithSubstitutionsDto;
  onAddSubstitution: (payload: AddSubstitutionInput) => Promise<void>;
  onReplaceItem?: (payload: UpdateMealItemInput) => Promise<void>;
  onClose: () => void;
  onOpenAdvancedModal?: () => void;
  mode?: "SUBSTITUTION" | "REPLACE";
}

// Quick suggestions based on dietary category
const QUICK_SUGGESTIONS_MAP: Record<string, string[]> = {
  carbs: ["Batata doce", "Mandioca cozida", "Aveia em flocos", "Pão francês", "Arroz integral", "Tapioca"],
  protein: ["Peito de frango", "Ovo de galinha", "Filé de tilápia", "Patinho moído", "Whey protein", "Atum sólido"],
  fats: ["Azeite de oliva", "Pasta de amendoim", "Castanha de caju", "Abacate", "Manteiga"],
  default: ["Batata doce", "Aveia em flocos", "Ovo de galinha", "Peito de frango", "Banana prata", "Azeite de oliva"],
};

function getInitialCriterion(item: MealItemWithSubstitutionsDto): EquivalentCriterion {
  // If dominant macro is identifiable, default to it; otherwise default to CALORIES
  if (item.caloriesKcalSnapshot != null && item.caloriesKcalSnapshot > 0) {
    const carbKcal = (item.carbohydrateGSnapshot || 0) * 4;
    const protKcal = (item.proteinGSnapshot || 0) * 4;
    const fatKcal = (item.fatGSnapshot || 0) * 9;
    if (carbKcal > protKcal && carbKcal > fatKcal) return "CARBOHYDRATE";
    if (protKcal > carbKcal && protKcal > fatKcal) return "PROTEIN";
    if (fatKcal > carbKcal && fatKcal > protKcal) return "FAT";
    return "CALORIES";
  }
  if (item.carbohydrateGSnapshot != null && item.carbohydrateGSnapshot > 0) return "CARBOHYDRATE";
  if (item.proteinGSnapshot != null && item.proteinGSnapshot > 0) return "PROTEIN";
  if (item.fatGSnapshot != null && item.fatGSnapshot > 0) return "FAT";
  return "CALORIES";
}

export function NutritionSubstitutionInlineSearch({
  slug,
  prescribedItem,
  onAddSubstitution,
  onReplaceItem,
  onClose,
  onOpenAdvancedModal,
  mode = "SUBSTITUTION",
}: NutritionSubstitutionInlineSearchProps) {
  const [selectedCriterion, setSelectedCriterion] = useState<EquivalentCriterion>(
    () => getInitialCriterion(prescribedItem)
  );
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "TACO" | "USDA" | "CONSULTANCY">("ALL");
  const [foods, setFoods] = useState<FoodListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();

  // Selected portions per food: portionPublicId, "ML", or "G"
  const [selectedPortions, setSelectedPortions] = useState<Record<string, string>>({});
  // Selected quantity per food, kept as RAW TEXT so user can type fractions/decimals
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, string>>({});
  // Portions cache per foodPublicId
  const [foodPortionsMap, setFoodPortionsMap] = useState<Record<string, FoodPortionOption[]>>({});
  const loadedPortionsRef = useRef<Set<string>>(new Set());

  // Adding feedback
  const [submittingFoodId, setSubmittingFoodId] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Optional expanded details per food
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);

  // Custom measure modal trigger
  const [customMeasureFood, setCustomMeasureFood] = useState<FoodListItemDto | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  // Reference food prescription anchor
  const reference: ReferenceFoodPrescription = useMemo(() => ({
    name: prescribedItem.foodNameSnapshot,
    prescribedQuantity: prescribedItem.prescribedQuantity,
    prescribedUnitCode: prescribedItem.prescribedUnitCode,
    prescribedUnitLabel: prescribedItem.prescribedUnitLabel,
    caloriesKcalSnapshot: prescribedItem.caloriesKcalSnapshot,
    proteinGSnapshot: prescribedItem.proteinGSnapshot,
    carbohydrateGSnapshot: prescribedItem.carbohydrateGSnapshot,
    fatGSnapshot: prescribedItem.fatGSnapshot,
  }), [prescribedItem]);

  // Target value for current criterion
  const currentTargetValue = useMemo(() => {
    return getTargetNutrientValue(reference, selectedCriterion);
  }, [reference, selectedCriterion]);

  // Dynamic suggestions category
  const quickSuggestions = useMemo(() => {
    const carb = prescribedItem.carbohydrateGSnapshot || 0;
    const prot = prescribedItem.proteinGSnapshot || 0;
    const fat = prescribedItem.fatGSnapshot || 0;
    if (carb * 4 > prot * 4 && carb * 4 > fat * 9) return QUICK_SUGGESTIONS_MAP.carbs;
    if (prot * 4 > carb * 4 && prot * 4 > fat * 9) return QUICK_SUGGESTIONS_MAP.protein;
    if (fat * 9 > carb * 4 && fat * 9 > prot * 4) return QUICK_SUGGESTIONS_MAP.fats;
    return QUICK_SUGGESTIONS_MAP.default;
  }, [prescribedItem]);

  // Focus on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch candidate foods with debounce and race-condition guard
  const fetchFoods = useCallback(
    async (searchTerm: string, source: "ALL" | "TACO" | "USDA" | "CONSULTANCY") => {
      const currentReqId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const effectiveQuery = searchTerm.trim() || quickSuggestions[0] || "batata";
        const res = await searchFoodsForPickerAction(slug, effectiveQuery, "ALL", 1, source);
        if (currentReqId !== requestIdRef.current) return;
        if (res.success && res.data) {
          // Filter out the base food itself from candidates
          const filtered = (res.data.items || []).filter(
            (f) => f.publicId !== prescribedItem.foodPublicId
          );
          setFoods(filtered);
        } else {
          setFoods([]);
        }
      } catch {
        if (currentReqId === requestIdRef.current) {
          setFoods([]);
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [slug, quickSuggestions, prescribedItem.foodPublicId]
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      startSearchTransition(() => {
        fetchFoods(query, sourceFilter);
      });
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, sourceFilter, fetchFoods]);

  // Load portions for all candidate foods
  useEffect(() => {
    for (const food of foods) {
      if (!loadedPortionsRef.current.has(food.publicId)) {
        loadedPortionsRef.current.add(food.publicId);
        getFoodPortionsForPickerAction(slug, food.publicId).then((res) => {
          if (res.success && res.data) {
            const rawPortions = (res.data.portions || []) as Array<{
              publicId: string;
              label: string;
              equivalentReferenceAmount: number;
              status?: string;
              scope?: "GLOBAL" | "CONSULTANCY" | "PERSONAL";
              notes?: string | null;
            }>;
            const activePortions = rawPortions
              .filter((p) => (p.status || "ACTIVE") === "ACTIVE")
              .map((p) => ({
                publicId: p.publicId,
                label: p.label,
                equivalentReferenceAmount: Number(p.equivalentReferenceAmount),
                scope: p.scope,
                notes: p.notes,
              }));

            setFoodPortionsMap((prev) => ({
              ...prev,
              [food.publicId]: activePortions,
            }));
          }
        }).catch(() => {});
      }
    }
  }, [foods, slug]);

  const handleQuantityChange = (foodPublicId: string, val: string) => {
    setSelectedQuantities((prev) => ({
      ...prev,
      [foodPublicId]: val,
    }));
  };

  const handleQuantityBlur = (foodPublicId: string, defaultQty: number) => {
    setSelectedQuantities((prev) => {
      const raw = prev[foodPublicId];
      if (raw == null) return prev;
      const num = parseQuantityInput(raw);
      if (num == null || num <= 0) {
        return { ...prev, [foodPublicId]: formatQuantityForDisplay(defaultQty) };
      }
      return prev;
    });
  };

  const handlePortionChange = (
    food: FoodListItemDto,
    newPortionId: string,
    calculatedGrams: number,
    newlyCreatedPortion?: FoodPortionOption
  ) => {
    if (newPortionId === "__CREATE_CUSTOM__") {
      setCustomMeasureFood(food);
      return;
    }

    const portions = [...(foodPortionsMap[food.publicId] || [])];
    if (newlyCreatedPortion && !portions.some((p) => p.publicId === newlyCreatedPortion.publicId)) {
      portions.push(newlyCreatedPortion);
    }

    let newEq = 1;
    if (newPortionId !== "G" && newPortionId !== "ML") {
      const targetPortion = portions.find((p) => p.publicId === newPortionId);
      if (targetPortion && targetPortion.equivalentReferenceAmount > 0) {
        newEq = targetPortion.equivalentReferenceAmount;
      }
    }

    const convertedQty = calculatedGrams / newEq;

    setSelectedPortions((prev) => ({
      ...prev,
      [food.publicId]: newPortionId,
    }));

    setSelectedQuantities((prev) => ({
      ...prev,
      [food.publicId]: formatQuantityForDisplay(convertedQty),
    }));
  };

  const handleCustomMeasureCreated = (
    food: FoodListItemDto,
    newPortion: FoodPortionOption,
    calculatedGrams: number
  ) => {
    setFoodPortionsMap((prev) => ({
      ...prev,
      [food.publicId]: [...(prev[food.publicId] || []).filter((p) => p.publicId !== newPortion.publicId), newPortion],
    }));
    handlePortionChange(food, newPortion.publicId, calculatedGrams, newPortion);
    setCustomMeasureFood(null);
  };

  const handleExecuteAction = async (
    food: FoodListItemDto,
    calculatedGrams: number,
    activePortion: FoodPortionOption | null,
    currentQtyNum: number
  ) => {
    const isVolumeFood = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
    const standardUnitCode = isVolumeFood ? "ML" : "G";
    const standardUnitLabel = isVolumeFood ? "Mililitros (ml)" : "Gramas (g)";

    let portionPublicId: string | null = null;
    let unitCode = standardUnitCode;
    let unitLabel = standardUnitLabel;

    if (activePortion) {
      portionPublicId = activePortion.publicId;
      unitCode = "PORCAO";
      unitLabel = activePortion.label;
    }

    setSubmittingFoodId(food.publicId);
    try {
      if (mode === "SUBSTITUTION") {
        const criterionLabel = selectedCriterion === "CALORIES" ? "calorias"
          : selectedCriterion === "PROTEIN" ? "proteína"
          : selectedCriterion === "CARBOHYDRATE" ? "carboidrato"
          : "gordura";

        await onAddSubstitution({
          foodPublicId: food.publicId,
          prescribedQuantity: currentQtyNum,
          portionPublicId,
          prescribedUnitCode: unitCode,
          prescribedUnitLabel: unitLabel,
          notes: `Equivalente por ${criterionLabel}`,
          equivalenceCriterion: selectedCriterion,
          equivalenceTargetValueSnapshot: currentTargetValue,
        });

        setRecentlyAddedId(food.publicId);
        setTimeout(() => {
          setRecentlyAddedId((curr) => (curr === food.publicId ? null : curr));
        }, 2000);

        // Keep focus on search input for continuous rapid additions
        searchInputRef.current?.focus();
      } else if (mode === "REPLACE" && onReplaceItem) {
        if (!confirm(`Confirmar substituição do alimento base "${prescribedItem.foodNameSnapshot}" por "${food.displayNamePtBr || food.name}"?`)) {
          return;
        }

        await onReplaceItem({
          foodPublicId: food.publicId,
          prescribedQuantity: currentQtyNum,
          portionPublicId,
          prescribedUnitCode: unitCode,
          prescribedUnitLabel: unitLabel,
          notes: prescribedItem.notes || null,
        });

        onClose();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao processar substituição.");
    } finally {
      setSubmittingFoodId(null);
    }
  };

  const criterionUnit = EQUIVALENT_CRITERIA_UNITS[selectedCriterion];

  return (
    <div className="rounded-xl border border-[var(--brand)]/30 bg-[var(--surface-primary)] p-2.5 sm:p-3 shadow-sm space-y-2.5 mt-2 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. COMPACT HEADER: Title + Base Portion Anchor + Close / Advanced         */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse shrink-0" />
            <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight truncate">
              {mode === "SUBSTITUTION"
                ? `Substituições de “${prescribedItem.foodNameSnapshot}”`
                : `Substituir “${prescribedItem.foodNameSnapshot}”`}
            </h4>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Porção base: {formatQuantityForDisplay(prescribedItem.prescribedQuantity || 100)}{" "}
              {prescribedItem.prescribedUnitLabel || "g"}
              {currentTargetValue != null && (
                <span className="text-[var(--brand)] ml-1 font-bold">
                  ({currentTargetValue} {criterionUnit})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAdvancedModal && (
            <button
              type="button"
              onClick={onOpenAdvancedModal}
              className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)] px-2 py-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Abrir comparação completa em janela modal"
            >
              Avançado
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Fechar busca de substituições"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SINGLE PARAMETER SELECTOR: Equivaler por (Calories, P, C, G)           */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">
          Equivaler por:
        </span>
        {(
          [
            { key: "CALORIES", label: "Calorias" },
            { key: "PROTEIN", label: "Proteínas" },
            { key: "CARBOHYDRATE", label: "Carboidratos" },
            { key: "FAT", label: "Gorduras" },
          ] as const
        ).map((item) => {
          const isActive = selectedCriterion === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedCriterion(item.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--brand)] text-white shadow-2xs font-bold"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH INPUT & CATALOG FILTERS                                         */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar alimento substituto (ex: batata doce, aveia, frango)..."
            className="w-full pl-8 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] shadow-2xs transition-colors"
          />
          <svg
            className="w-4 h-4 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Source Catalog Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          {(
            [
              { key: "ALL", label: "Todos os catálogos" },
              { key: "TACO", label: "TACO Brasil" },
              { key: "USDA", label: "USDA Internacional" },
              { key: "CONSULTANCY", label: "Consultoria" },
            ] as const
          ).map((src) => {
            const isActive = sourceFilter === src.key;
            return (
              <button
                key={src.key}
                type="button"
                onClick={() => setSourceFilter(src.key)}
                className={`px-2.5 py-0.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer text-[11px] ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-2xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                }`}
              >
                {src.label}
              </button>
            );
          })}
        </div>

        {/* Quick Suggestions when query is empty */}
        {!query && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Sugestões:</span>
            {quickSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  searchInputRef.current?.focus();
                }}
                className="px-2 py-0.5 text-[11px] rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CANDIDATE RESULTS LIST                                                */}
      {/* ========================================================================= */}
      <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[var(--border-subtle)]">
        {(isLoading || isSearching) && foods.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Calculando alimentos equivalentes...</span>
          </div>
        )}

        {!isLoading && !isSearching && foods.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">
              Nenhum alimento encontrado para &ldquo;{query}&rdquo;
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Tente outro alimento ou altere o filtro de catálogo.
            </p>
          </div>
        )}

        {foods.map((food) => {
          const isVolumeFood = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
          const standardUnitCode = isVolumeFood ? "ML" : "G";
          const standardUnitLabel = isVolumeFood ? "Mililitros (ml)" : "Gramas (g)";
          const unitShort = isVolumeFood ? "ml" : "g";

          // Calculate equivalence for this candidate
          const equivResult = calculateNutrientEquivalence(
            reference,
            {
              publicId: food.publicId,
              name: food.name,
              displayNamePtBr: food.displayNamePtBr,
              category: food.category,
              referenceAmount: food.referenceAmount || 100,
              referenceUnitCode: food.referenceUnitCode || "G",
              caloriesKcal: food.caloriesKcal,
              proteinG: food.proteinG,
              carbohydrateG: food.carbohydrateG,
              fatG: food.fatG,
              scope: food.scope,
            },
            selectedCriterion
          );

          const calculatedGrams = equivResult.roundedQuantity ?? equivResult.calculatedQuantity ?? 100;

          // Household portions loaded for this candidate
          const portions = foodPortionsMap[food.publicId] || [];

          // Active portion choice
          const chosenPortionId = selectedPortions[food.publicId] ?? (portions[0]?.publicId || standardUnitCode);
          const activePortion = portions.find((p) => p.publicId === chosenPortionId) || null;

          // Equivalent physical amount for 1 unit of chosen portion
          const portionEquivAmount = activePortion ? activePortion.equivalentReferenceAmount : 1;

          // Initial suggested quantity in active portion
          const defaultConvertedQty = activePortion
            ? Math.round((calculatedGrams / portionEquivAmount) * 10) / 10
            : calculatedGrams;

          const qtyText = selectedQuantities[food.publicId] ?? formatQuantityForDisplay(defaultConvertedQty);
          const currentQtyNum = parseQuantityInput(qtyText) ?? defaultConvertedQty;

          // Actual physical amount being evaluated
          const physicalAmount = activePortion
            ? Math.round(currentQtyNum * portionEquivAmount * 10) / 10
            : Math.round(currentQtyNum * 10) / 10;

          // Live authoritatively recalculated nutrients
          const liveNutrients = calculateItemNutrients({
            food: {
              referenceAmount: food.referenceAmount || 100,
              referenceUnitCode: food.referenceUnitCode || "G",
              caloriesKcal: food.caloriesKcal,
              proteinG: food.proteinG,
              carbohydrateG: food.carbohydrateG,
              fatG: food.fatG,
              fiberG: food.fiberG,
            },
            prescribedQuantity: currentQtyNum,
            prescribedUnitCode: activePortion ? "PORCAO" : standardUnitCode,
            portion: activePortion
              ? {
                  publicId: activePortion.publicId,
                  label: activePortion.label,
                  equivalentReferenceAmount: activePortion.equivalentReferenceAmount,
                }
              : null,
          });

          // Difference metrics formatting
          let diffText: string | null = null;
          let isExact = false;
          if (currentTargetValue != null) {
            let activeValue = 0;
            if (selectedCriterion === "CALORIES") activeValue = liveNutrients.caloriesKcal || 0;
            if (selectedCriterion === "PROTEIN") activeValue = liveNutrients.proteinG || 0;
            if (selectedCriterion === "CARBOHYDRATE") activeValue = liveNutrients.carbohydrateG || 0;
            if (selectedCriterion === "FAT") activeValue = liveNutrients.fatG || 0;

            const diff = Math.round((activeValue - currentTargetValue) * 10) / 10;
            const nutrientName = selectedCriterion === "CALORIES" ? "calorias"
              : selectedCriterion === "PROTEIN" ? "proteína"
              : selectedCriterion === "CARBOHYDRATE" ? "carboidrato"
              : "gordura";

            if (Math.abs(diff) < 0.05) {
              isExact = true;
              diffText = "Equivalência exata";
            } else {
              const sign = diff > 0 ? "+" : "";
              diffText = `Diferença: ${sign}${formatQuantityForDisplay(diff)} ${criterionUnit} de ${nutrientName}`;
            }
          }

          const qualityBadge = getDataQualityBadgeInfo(food.dataQuality);
          const isSubmitting = submittingFoodId === food.publicId;
          const isRecentlyAdded = recentlyAddedId === food.publicId;
          const isDetailsOpen = expandedDetailsId === food.publicId;

          return (
            <div
              key={food.publicId}
              className={`pt-2 first:pt-0 p-2 sm:p-2.5 rounded-xl transition-all ${
                isRecentlyAdded
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-default)]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Food Information */}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                      {food.displayNamePtBr || food.name}
                    </span>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-semibold shrink-0 ${
                        food.scope === "GLOBAL"
                          ? food.sourceKey === "TACO"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                          : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                      }`}
                    >
                      {food.scope === "GLOBAL"
                        ? food.sourceKey === "TACO"
                          ? "TACO"
                          : "USDA"
                        : "Consultoria"}
                    </span>

                    {qualityBadge && (
                      <span
                        title={qualityBadge.title}
                        className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                      >
                        {qualityBadge.label}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedDetailsId(isDetailsOpen ? null : food.publicId)}
                      className="px-1.5 py-0.2 rounded text-[9px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                      title="Ver detalhes complementares deste alimento"
                    >
                      {isDetailsOpen ? "Ocultar detalhes" : "Detalhes"}
                    </button>
                  </div>

                  {/* Macros in one row + Compact Rounding Difference */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      = {formatQuantityForDisplay(physicalAmount)} {unitShort}
                    </span>
                    <span className="font-bold text-[var(--brand)]">
                      {liveNutrients.caloriesKcal != null ? `${liveNutrients.caloriesKcal} kcal` : "—"}
                    </span>
                    <span>•</span>
                    <span>{liveNutrients.proteinG != null ? `${liveNutrients.proteinG}g P` : "— P"}</span>
                    <span>•</span>
                    <span>{liveNutrients.carbohydrateG != null ? `${liveNutrients.carbohydrateG}g C` : "— C"}</span>
                    <span>•</span>
                    <span>{liveNutrients.fatG != null ? `${liveNutrients.fatG}g G` : "— G"}</span>

                    {diffText && (
                      <>
                        <span className="text-[var(--border-default)]">•</span>
                        <span
                          className={`text-[10px] font-medium ${
                            isExact
                              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {diffText}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Desktop Inline Controls */}
                <div className="hidden sm:flex sm:items-end gap-1.5 shrink-0">
                  {/* Quantity input */}
                  <div className="w-14">
                    <label className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5 text-center">
                      Qtd
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={qtyText}
                      onChange={(e) => handleQuantityChange(food.publicId, e.target.value)}
                      onBlur={() => handleQuantityBlur(food.publicId, defaultConvertedQty)}
                      className="w-full px-1.5 py-1 text-xs font-bold text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                      title="Quantidade calculada ou personalizada"
                    />
                  </div>

                  {/* Measure dropdown */}
                  <div className="min-w-[130px] max-w-[180px]">
                    <label className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">
                      Medida
                    </label>
                    <select
                      value={chosenPortionId}
                      onChange={(e) => handlePortionChange(food, e.target.value, calculatedGrams)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] truncate cursor-pointer font-medium"
                      title="Selecione a medida deste substituto"
                    >
                      <optgroup label="Unidade Padrão">
                        <option value={standardUnitCode}>{standardUnitLabel}</option>
                      </optgroup>

                      {portions.length > 0 ? (
                        <optgroup label="Medidas do Alimento">
                          {portions.map((p) => (
                            <option key={p.publicId} value={p.publicId}>
                              {p.label} ({p.equivalentReferenceAmount}{unitShort})
                              {p.scope === "PERSONAL" ? " (Pessoal)" : p.scope === "CONSULTANCY" ? " (Consultoria)" : ""}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <optgroup label="Medidas do Alimento">
                          <option value="" disabled>Equivalência não cadastrada</option>
                        </optgroup>
                      )}

                      <optgroup label="Personalização">
                        <option value="__CREATE_CUSTOM__">+ Cadastrar medida...</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="button"
                    disabled={isSubmitting || isRecentlyAdded}
                    onClick={() => handleExecuteAction(food, calculatedGrams, activePortion, currentQtyNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer min-h-[32px] ${
                      isRecentlyAdded
                        ? "bg-emerald-600 text-white cursor-default"
                        : mode === "SUBSTITUTION"
                        ? "bg-[var(--brand)] hover:opacity-90 text-white shadow-2xs"
                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                    }`}
                  >
                    {isSubmitting ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : isRecentlyAdded ? (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Adicionado!</span>
                      </>
                    ) : mode === "SUBSTITUTION" ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Adicionar substituição</span>
                      </>
                    ) : (
                      <span>Substituir alimento</span>
                    )}
                  </button>
                </div>

                {/* Mobile Controls (Full width row, no cramped fields) */}
                <div className="flex sm:hidden items-center gap-1.5 w-full pt-1">
                  <div className="w-16 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={qtyText}
                      onChange={(e) => handleQuantityChange(food.publicId, e.target.value)}
                      onBlur={() => handleQuantityBlur(food.publicId, defaultConvertedQty)}
                      className="w-full px-1.5 py-1 text-xs font-bold text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px]"
                      placeholder="Qtd"
                      title="Quantidade"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <select
                      value={chosenPortionId}
                      onChange={(e) => handlePortionChange(food, e.target.value, calculatedGrams)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] truncate cursor-pointer font-medium min-h-[38px]"
                      title="Medida"
                    >
                      <option value={standardUnitCode}>{standardUnitLabel}</option>
                      {portions.map((p) => (
                        <option key={p.publicId} value={p.publicId}>
                          {p.label} ({p.equivalentReferenceAmount}{unitShort})
                        </option>
                      ))}
                      <option value="__CREATE_CUSTOM__">+ Cadastrar...</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || isRecentlyAdded}
                    onClick={() => handleExecuteAction(food, calculatedGrams, activePortion, currentQtyNum)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer min-h-[38px] ${
                      isRecentlyAdded
                        ? "bg-emerald-600 text-white"
                        : mode === "SUBSTITUTION"
                        ? "bg-[var(--brand)] text-white shadow-2xs"
                        : "bg-amber-600 text-white shadow-2xs"
                    }`}
                  >
                    {isRecentlyAdded ? "Adicionado!" : mode === "SUBSTITUTION" ? "+ Adicionar" : "Substituir"}
                  </button>
                </div>
              </div>

              {/* Optional Discrete Details / Comparison Drawer */}
              {isDetailsOpen && (
                <div className="mt-2 p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1.5 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                    <span>Comparativo Nutricional: Base vs Substituto</span>
                    <span className="text-[var(--text-tertiary)]">{food.category || "Geral"}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Calorias</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {liveNutrients.caloriesKcal != null ? `${liveNutrients.caloriesKcal} kcal` : "—"}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Base: {prescribedItem.caloriesKcalSnapshot != null ? `${prescribedItem.caloriesKcalSnapshot} kcal` : "—"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Proteína</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {liveNutrients.proteinG != null ? `${liveNutrients.proteinG}g` : "—"}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Base: {prescribedItem.proteinGSnapshot != null ? `${prescribedItem.proteinGSnapshot}g` : "—"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Carboidrato</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {liveNutrients.carbohydrateG != null ? `${liveNutrients.carbohydrateG}g` : "—"}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Base: {prescribedItem.carbohydrateGSnapshot != null ? `${prescribedItem.carbohydrateGSnapshot}g` : "—"}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Gordura</div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {liveNutrients.fatG != null ? `${liveNutrients.fatG}g` : "—"}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Base: {prescribedItem.fatGSnapshot != null ? `${prescribedItem.fatGSnapshot}g` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Measure Modal */}
      {customMeasureFood && (
        <NutritionCustomMeasureModal
          isOpen={Boolean(customMeasureFood)}
          onClose={() => setCustomMeasureFood(null)}
          slug={slug}
          foodPublicId={customMeasureFood.publicId}
          foodName={customMeasureFood.displayNamePtBr || customMeasureFood.name}
          foodReferenceUnit={customMeasureFood.referenceUnitCode}
          existingPortions={foodPortionsMap[customMeasureFood.publicId] || []}
          onMeasureCreated={(newPortion: FoodPortionOption) => {
            const equiv = calculateNutrientEquivalence(
              reference,
              {
                publicId: customMeasureFood.publicId,
                name: customMeasureFood.name,
                displayNamePtBr: customMeasureFood.displayNamePtBr,
                referenceAmount: customMeasureFood.referenceAmount || 100,
                referenceUnitCode: customMeasureFood.referenceUnitCode || "G",
                caloriesKcal: customMeasureFood.caloriesKcal,
                proteinG: customMeasureFood.proteinG,
                carbohydrateG: customMeasureFood.carbohydrateG,
                fatG: customMeasureFood.fatG,
              },
              selectedCriterion
            );
            const grams = equiv.roundedQuantity ?? equiv.calculatedQuantity ?? 100;
            handleCustomMeasureCreated(customMeasureFood, newPortion, grams);
          }}
        />
      )}
    </div>
  );
}
