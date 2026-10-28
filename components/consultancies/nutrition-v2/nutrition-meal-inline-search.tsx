"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import { getDataQualityBadgeInfo } from "@/lib/nutrition-v2/food-search";
import {
  calculateItemNutrients,
  parseQuantityInput,
  formatQuantityForDisplay,
} from "@/lib/nutrition-v2/nutrient-calculator";
import type { FoodSelectionResult } from "./nutrition-food-picker";
import {
  NutritionCustomMeasureModal,
  type FoodPortionOption,
} from "./nutrition-custom-measure-modal";

interface NutritionMealInlineSearchProps {
  slug: string;
  mealTitle: string;
  onAddItem: (payload: FoodSelectionResult) => Promise<void>;
  onClose: () => void;
}

// Popular staples to show when search query is empty
const QUICK_SUGGESTIONS = [
  "Arroz branco",
  "Feijão carioca",
  "Peito de frango",
  "Ovo de galinha",
  "Banana prata",
  "Aveia em flocos",
  "Pão francês",
  "Azeite de oliva",
  "Leite integral",
  "Batata doce",
];

export function NutritionMealInlineSearch({
  slug,
  mealTitle,
  onAddItem,
  onClose,
}: NutritionMealInlineSearchProps) {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "TACO" | "USDA" | "CONSULTANCY">("ALL");
  const [foods, setFoods] = useState<FoodListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();

  // Keyboard navigation active index
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Portions cache per foodPublicId
  const [foodPortionsMap, setFoodPortionsMap] = useState<Record<string, FoodPortionOption[]>>({});
  const loadedPortionsRef = useRef<Set<string>>(new Set());

  // Selected portion per food: portionPublicId, "ML", or "G"
  const [selectedPortions, setSelectedPortions] = useState<Record<string, string>>({});
  // Selected quantity per food, kept as RAW TEXT so user can type fractions/decimals
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, string>>({});

  // Adding feedback
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Custom measure modal trigger
  const [customMeasureFood, setCustomMeasureFood] = useState<FoodListItemDto | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  // Focus on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch foods with debounce and out-of-order race-condition protection
  const fetchFoods = useCallback(
    async (searchTerm: string, source: "ALL" | "TACO" | "USDA" | "CONSULTANCY") => {
      const currentReqId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const effectiveQuery = searchTerm.trim() || "arroz";
        const res = await searchFoodsForPickerAction(slug, effectiveQuery, "ALL", 1, source);
        // Discard stale responses from older search requests
        if (currentReqId !== requestIdRef.current) return;
        if (res.success && res.data) {
          setFoods(res.data.items || []);
          setActiveIndex(-1);
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
    [slug]
  );

  // Trigger search on mount and on query/filter changes
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

  // Load portions for all visible foods (without blocking on food.portionsCount > 0)
  useEffect(() => {
    for (const food of foods) {
      if (!loadedPortionsRef.current.has(food.publicId)) {
        loadedPortionsRef.current.add(food.publicId);
        getFoodPortionsForPickerAction(slug, food.publicId).then((res) => {
          if (res.success && res.data) {
            const isVol = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
            const standardCode = isVol ? "ML" : "G";

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

            // Default to first registered portion if available, else standard unit G or ML
            setSelectedPortions((prev) => {
              if (prev[food.publicId]) return prev;
              const defaultKey = activePortions.length > 0 ? activePortions[0].publicId : standardCode;
              return {
                ...prev,
                [food.publicId]: defaultKey,
              };
            });

            // If defaulting to standard G or ML and quantity wasn't set, default quantity to 100 (or 1 for portion)
            setSelectedQuantities((prev) => {
              if (prev[food.publicId] != null) return prev;
              const defaultQty = activePortions.length > 0 ? "1" : "100";
              return {
                ...prev,
                [food.publicId]: defaultQty,
              };
            });
          }
        }).catch(() => {});
      }
    }
  }, [foods, slug]);

  const handleQuantityChange = (foodPublicId: string, val: string) => {
    // Keep exactly what the user typed (including fractions "1/2" or comma "1,5")
    setSelectedQuantities((prev) => ({
      ...prev,
      [foodPublicId]: val,
    }));
  };

  const handleQuantityBlur = (foodPublicId: string) => {
    setSelectedQuantities((prev) => {
      const raw = prev[foodPublicId];
      if (raw == null) return prev;
      const num = parseQuantityInput(raw);
      if (num == null || num <= 0) {
        return { ...prev, [foodPublicId]: "1" };
      }
      return prev;
    });
  };

  // Effective numeric quantity for previews and for adding
  const getQuantityNumber = (foodPublicId: string, fallbackDefault = 1): number => {
    const raw = selectedQuantities[foodPublicId];
    if (raw == null) return fallbackDefault;
    const num = parseQuantityInput(raw);
    return num != null && num > 0 ? num : fallbackDefault;
  };

  // Smart switching of measure while preserving physical quantity (Section 3)
  const handlePortionChange = (
    food: FoodListItemDto,
    newPortionId: string,
    newlyCreatedPortion?: FoodPortionOption
  ) => {
    if (newPortionId === "__CREATE_CUSTOM__") {
      setCustomMeasureFood(food);
      return;
    }

    const isVolumeFood = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
    const standardCode = isVolumeFood ? "ML" : "G";
    const oldChoice = selectedPortions[food.publicId] ?? (foodPortionsMap[food.publicId]?.[0]?.publicId || standardCode);
    const portions = [...(foodPortionsMap[food.publicId] || [])];
    if (newlyCreatedPortion && !portions.some((p) => p.publicId === newlyCreatedPortion.publicId)) {
      portions.push(newlyCreatedPortion);
    }

    // Determine previous physical equivalence
    let prevEq = 1;
    if (oldChoice !== "G" && oldChoice !== "ML") {
      const prevPortion = portions.find((p) => p.publicId === oldChoice);
      if (prevPortion && prevPortion.equivalentReferenceAmount > 0) {
        prevEq = prevPortion.equivalentReferenceAmount;
      }
    }

    // Determine new physical equivalence
    let newEq = 1;
    if (newPortionId !== "G" && newPortionId !== "ML") {
      const targetPortion = portions.find((p) => p.publicId === newPortionId);
      if (targetPortion && targetPortion.equivalentReferenceAmount > 0) {
        newEq = targetPortion.equivalentReferenceAmount;
      }
    }

    // Current quantity
    const currentQtyNum = getQuantityNumber(food.publicId, oldChoice === "G" || oldChoice === "ML" ? 100 : 1);
    let convertedQty = currentQtyNum;
    if (Number.isFinite(currentQtyNum) && currentQtyNum > 0 && prevEq > 0 && newEq > 0) {
      const physicalAmount = currentQtyNum * prevEq;
      convertedQty = physicalAmount / newEq;
    }

    setSelectedPortions((prev) => ({
      ...prev,
      [food.publicId]: newPortionId,
    }));

    setSelectedQuantities((prev) => ({
      ...prev,
      [food.publicId]: formatQuantityForDisplay(convertedQty),
    }));
  };

  const handleCustomMeasureCreated = (food: FoodListItemDto, newPortion: FoodPortionOption) => {
    setFoodPortionsMap((prev) => ({
      ...prev,
      [food.publicId]: [...(prev[food.publicId] || []).filter((p) => p.publicId !== newPortion.publicId), newPortion],
    }));
    handlePortionChange(food, newPortion.publicId, newPortion);
    setCustomMeasureFood(null);
  };

  const handleAddFood = async (food: FoodListItemDto) => {
    const isVolumeFood = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
    const standardUnitCode = isVolumeFood ? "ML" : "G";
    const standardUnitLabel = isVolumeFood ? "Mililitros (ml)" : "Gramas (g)";

    const portions = foodPortionsMap[food.publicId] || [];
    const portionChoice = selectedPortions[food.publicId] ?? (portions[0]?.publicId || standardUnitCode);
    const qty = getQuantityNumber(food.publicId, portionChoice === "G" || portionChoice === "ML" ? 100 : 1);

    let portionPublicId: string | null = null;
    let unitCode = standardUnitCode;
    let unitLabel = standardUnitLabel;

    if (portionChoice !== "G" && portionChoice !== "ML") {
      const activePortion = portions.find((p) => p.publicId === portionChoice);
      if (activePortion) {
        portionPublicId = activePortion.publicId;
        unitCode = "PORCAO";
        unitLabel = activePortion.label;
      }
    } else if (portionChoice === "ML") {
      unitCode = "ML";
      unitLabel = "Mililitros (ml)";
    }

    setAddingFoodId(food.publicId);
    try {
      await onAddItem({
        foodPublicId: food.publicId,
        customName: null,
        prescribedQuantity: qty,
        prescribedUnitCode: unitCode,
        prescribedUnitLabel: unitLabel,
        portionPublicId,
        notes: null,
      });

      setRecentlyAddedId(food.publicId);
      setTimeout(() => {
        setRecentlyAddedId((curr) => (curr === food.publicId ? null : curr));
      }, 2000);

      // Keep focus on the search input for continuous additions
      searchInputRef.current?.focus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar alimento.");
    } finally {
      setAddingFoodId(null);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev < foods.length - 1 ? prev + 1 : prev;
        scrollToItem(next);
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        scrollToItem(next);
        return next;
      });
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0 && activeIndex < foods.length) {
      e.preventDefault();
      handleAddFood(foods[activeIndex]);
    }
  };

  const scrollToItem = (idx: number) => {
    if (!resultsContainerRef.current) return;
    const elements = resultsContainerRef.current.children;
    if (elements[idx]) {
      (elements[idx] as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  return (
    <div className="mt-2.5 p-3 sm:p-4 rounded-2xl border-2 border-[var(--brand)]/40 bg-[var(--surface-subtle)] space-y-3 shadow-md depth-surface animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
            Adicionar alimentos em &ldquo;{mealTitle}&rdquo;
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Fechar</span>
        </button>
      </div>

      {/* Search Input & Source Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite para buscar qualquer alimento (ex: arroz, frango, aveia, ovo)..."
            className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setSourceFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
              sourceFilter === "ALL"
                ? "bg-[var(--brand)] text-white shadow-2xs"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
            }`}
          >
            Todos os catálogos
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("TACO")}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
              sourceFilter === "TACO"
                ? "bg-[var(--brand)] text-white shadow-2xs"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
            }`}
          >
            TACO Brasil
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("USDA")}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
              sourceFilter === "USDA"
                ? "bg-[var(--brand)] text-white shadow-2xs"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
            }`}
          >
            USDA Internacional
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter("CONSULTANCY")}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
              sourceFilter === "CONSULTANCY"
                ? "bg-[var(--brand)] text-white shadow-2xs"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
            }`}
          >
            Consultoria
          </button>
        </div>
      </div>

      {/* Quick Suggestions Chips when query is empty */}
      {!query && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Sugestões:</span>
          {QUICK_SUGGESTIONS.map((item) => (
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

      {/* Results Container */}
      <div
        ref={resultsContainerRef}
        className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-[var(--border-subtle)]"
      >
        {(isLoading || isSearching) && foods.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Buscando alimentos no catálogo...</span>
          </div>
        )}

        {!isLoading && !isSearching && foods.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">Nenhum alimento encontrado para &ldquo;{query}&rdquo;</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Tente outro termo ou limpe os filtros de catálogo.</p>
          </div>
        )}

        {foods.map((food, idx) => {
          const isVolumeFood = food.referenceUnitCode === "ML" || food.referenceUnitCode === "L";
          const standardUnitCode = isVolumeFood ? "ML" : "G";
          const standardUnitLabel = isVolumeFood ? "Mililitros (ml)" : "Gramas (g)";
          const unitShort = isVolumeFood ? "ml" : "g";

          const portions = foodPortionsMap[food.publicId] || [];
          const chosenPortionId = selectedPortions[food.publicId] ?? (portions[0]?.publicId || standardUnitCode);
          const activePortion = portions.find((p) => p.publicId === chosenPortionId) || null;

          const defaultFallbackQty = chosenPortionId === "G" || chosenPortionId === "ML" ? 100 : 1;
          const qtyText = selectedQuantities[food.publicId] ?? (portions.length > 0 ? "1" : "100");
          const qtyNum = parseQuantityInput(qtyText) ?? defaultFallbackQty;

          // Physical reference amount
          const equivalentRefAmount = activePortion ? activePortion.equivalentReferenceAmount : 1;
          const physicalAmount = Math.round(qtyNum * equivalentRefAmount * 10) / 10;

          // Authoritative live calculated nutrients for this exact quantity and measure
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
            prescribedQuantity: qtyNum,
            prescribedUnitCode: activePortion ? "PORCAO" : standardUnitCode,
            portion: activePortion
              ? {
                  publicId: activePortion.publicId,
                  label: activePortion.label,
                  equivalentReferenceAmount: activePortion.equivalentReferenceAmount,
                }
              : null,
          });

          const qualityBadge = getDataQualityBadgeInfo(food.dataQuality);
          const isAdding = addingFoodId === food.publicId;
          const isRecentlyAdded = recentlyAddedId === food.publicId;
          const isActive = idx === activeIndex;

          return (
            <div
              key={food.publicId}
              className={`pt-2 first:pt-0 p-2 sm:p-2.5 rounded-xl transition-all ${
                isRecentlyAdded
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : isActive
                  ? "bg-[var(--brand)]/10 border border-[var(--brand)]/40"
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

                    {portions.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setCustomMeasureFood(food)}
                        className="px-1.5 py-0.2 rounded text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        title="Cadastrar medida personalizada para este alimento"
                      >
                        + Cadastrar medida
                      </button>
                    )}
                  </div>

                  {/* Live Recalculated Badges & Physical Equivalence */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--text-secondary)]">
                    {activePortion && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        = {formatQuantityForDisplay(physicalAmount)} {unitShort}
                      </span>
                    )}
                    <span className="font-bold text-[var(--brand)]">
                      {liveNutrients.caloriesKcal != null ? `${liveNutrients.caloriesKcal} kcal` : "—"}
                    </span>
                    <span>•</span>
                    <span>{liveNutrients.proteinG != null ? `${liveNutrients.proteinG}g P` : "— P"}</span>
                    <span>•</span>
                    <span>{liveNutrients.carbohydrateG != null ? `${liveNutrients.carbohydrateG}g C` : "— C"}</span>
                    <span>•</span>
                    <span>{liveNutrients.fatG != null ? `${liveNutrients.fatG}g G` : "— G"}</span>
                    {liveNutrients.fiberG != null && (
                      <>
                        <span>•</span>
                        <span>{liveNutrients.fiberG}g Fibra</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Interactive Quantity, Measure Selector & Add Button */}
                <div className="flex items-end gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
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
                      onBlur={() => handleQuantityBlur(food.publicId)}
                      className="w-full px-1.5 py-1 text-xs font-bold text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                      title="Quantidade prescrita"
                    />
                  </div>

                  {/* Measure dropdown */}
                  <div className="min-w-[130px] max-w-[190px]">
                    <label className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">
                      Medida
                    </label>
                    <select
                      value={chosenPortionId}
                      onChange={(e) => handlePortionChange(food, e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] truncate cursor-pointer font-medium"
                      title="Selecione a medida deste alimento"
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

                  {/* Add button */}
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleAddFood(food)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer min-h-[32px] ${
                      isRecentlyAdded
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--brand)] hover:opacity-90 text-white shadow-2xs"
                    }`}
                  >
                    {isAdding ? (
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
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
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
          onMeasureCreated={(newPortion) => {
            handleCustomMeasureCreated(customMeasureFood, newPortion);
          }}
        />
      )}
    </div>
  );
}
