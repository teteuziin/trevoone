"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  searchFoodsForPickerAction,
  getFoodPortionsForPickerAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";
import { getDataQualityBadgeInfo } from "@/lib/nutrition-v2/food-search";
import type { FoodSelectionResult } from "./nutrition-food-picker";

interface FoodPortionOption {
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
}

interface NutritionMealInlineSearchProps {
  slug: string;
  mealTitle: string;
  onAddItem: (payload: FoodSelectionResult) => Promise<void>;
  onClose: () => void;
}

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

  // Portions cache per foodPublicId
  const [foodPortionsMap, setFoodPortionsMap] = useState<Record<string, FoodPortionOption[]>>({});
  const loadedPortionsRef = useRef<Set<string>>(new Set());

  // Selected portion per food: portionPublicId or "G"
  const [selectedPortions, setSelectedPortions] = useState<Record<string, string>>({});
  // Selected quantity per food (default 1)
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Adding feedback
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch foods with debounce
  const fetchFoods = useCallback(
    async (searchTerm: string, source: "ALL" | "TACO" | "USDA" | "CONSULTANCY") => {
      setIsLoading(true);
      try {
        const res = await searchFoodsForPickerAction(slug, searchTerm, "ALL", 1, source);
        if (res.success && res.data) {
          setFoods(res.data.items || []);
        } else {
          setFoods([]);
        }
      } catch {
        setFoods([]);
      } finally {
        setIsLoading(false);
      }
    },
    [slug]
  );

  // Search trigger on query or source change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      startSearchTransition(() => {
        fetchFoods(query, sourceFilter);
      });
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, sourceFilter, fetchFoods]);

  // Load portions for visible foods
  useEffect(() => {
    for (const food of foods) {
      if (food.portionsCount > 0 && !loadedPortionsRef.current.has(food.publicId)) {
        loadedPortionsRef.current.add(food.publicId);
        getFoodPortionsForPickerAction(slug, food.publicId).then((res) => {
          if (res.success && res.data) {
            const rawPortions = (res.data.portions || []) as Array<{
              publicId: string;
              label: string;
              equivalentReferenceAmount: number;
              status?: string;
            }>;
            const activePortions = rawPortions
              .filter((p) => (p.status || "ACTIVE") === "ACTIVE")
              .map((p) => ({
                publicId: p.publicId,
                label: p.label,
                equivalentReferenceAmount: Number(p.equivalentReferenceAmount),
              }));

            setFoodPortionsMap((prev) => ({
              ...prev,
              [food.publicId]: activePortions,
            }));

            // Default to first registered portion if available
            if (activePortions.length > 0) {
              setSelectedPortions((prev) => ({
                ...prev,
                [food.publicId]: activePortions[0].publicId,
              }));
            }
          }
        }).catch(() => {});
      }
    }
  }, [foods, slug]);

  const handleQuantityChange = (foodPublicId: string, val: string) => {
    const num = parseFloat(val.replace(",", "."));
    setSelectedQuantities((prev) => ({
      ...prev,
      [foodPublicId]: isNaN(num) || num <= 0 ? 1 : num,
    }));
  };

  const handlePortionChange = (foodPublicId: string, val: string) => {
    setSelectedPortions((prev) => ({
      ...prev,
      [foodPublicId]: val,
    }));
  };

  const handleAddFood = async (food: FoodListItemDto) => {
    const qty = selectedQuantities[food.publicId] ?? 1;
    const portionChoice = selectedPortions[food.publicId] ?? (foodPortionsMap[food.publicId]?.[0]?.publicId || "G");

    let portionPublicId: string | null = null;
    let unitCode = "G";
    let unitLabel = "Gramas (g)";

    if (portionChoice !== "G") {
      const activePortion = (foodPortionsMap[food.publicId] || []).find((p) => p.publicId === portionChoice);
      if (activePortion) {
        portionPublicId = activePortion.publicId;
        unitCode = "PORCAO";
        unitLabel = activePortion.label;
      }
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

      // Keep focus on the search input for continuous typing
      searchInputRef.current?.focus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar alimento.");
    } finally {
      setAddingFoodId(null);
    }
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-xl border-2 border-[var(--brand)]/40 bg-[var(--surface-subtle)] space-y-3.5 shadow-sm depth-surface animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
            Adicionar alimentos em &ldquo;{mealTitle}&rdquo;
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Concluir busca</span>
          <span className="text-[10px]">✕</span>
        </button>
      </div>

      {/* Search Input & Source Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <svg
            className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome (ex: arroz branco, peito de frango, banana prata, aveia)..."
            className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
          />
          {(isLoading || isSearching) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Source Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {[
            { id: "ALL", label: "Todos os bancos" },
            { id: "TACO", label: "TACO Brasil" },
            { id: "CONSULTANCY", label: "Minha consultoria" },
            { id: "USDA", label: "USDA Internacional" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceFilter(tab.id as typeof sourceFilter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                sourceFilter === tab.id
                  ? "bg-[var(--brand)] text-white shadow-2xs"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border-subtle)]">
        {foods.length === 0 && !isLoading && !isSearching && (
          <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
            {query.trim() ? "Nenhum alimento encontrado para o termo pesquisado." : "Digite o nome de um alimento para buscar..."}
          </div>
        )}

        {foods.map((food) => {
          const qty = selectedQuantities[food.publicId] ?? 1;
          const portions = foodPortionsMap[food.publicId] || [];
          const chosenPortionId = selectedPortions[food.publicId] || (portions[0]?.publicId ?? "G");

          // Calculate preview macros
          let scaleFactor = (qty * (food.referenceAmount || 100)) / (food.referenceAmount || 100);
          if (chosenPortionId !== "G") {
            const foundPortion = portions.find((p) => p.publicId === chosenPortionId);
            if (foundPortion && food.referenceAmount) {
              scaleFactor = (qty * foundPortion.equivalentReferenceAmount) / food.referenceAmount;
            }
          } else {
            scaleFactor = qty / (food.referenceAmount || 100);
          }

          const previewKcal = food.caloriesKcal != null ? Math.round(food.caloriesKcal * scaleFactor) : null;
          const previewP = food.proteinG != null ? Math.round(food.proteinG * scaleFactor * 10) / 10 : null;
          const previewC = food.carbohydrateG != null ? Math.round(food.carbohydrateG * scaleFactor * 10) / 10 : null;
          const previewG = food.fatG != null ? Math.round(food.fatG * scaleFactor * 10) / 10 : null;
          const previewFiber = food.fiberG != null ? Math.round(food.fiberG * scaleFactor * 10) / 10 : null;

          const qualityBadge = getDataQualityBadgeInfo(food.dataQuality);
          const isAdding = addingFoodId === food.publicId;
          const isRecentlyAdded = recentlyAddedId === food.publicId;

          return (
            <div
              key={food.publicId}
              className={`pt-2.5 first:pt-0 p-2.5 rounded-xl transition-all ${
                isRecentlyAdded
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-default)]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Food Information */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-tight">
                      {food.displayNamePtBr || food.name}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
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
                          : food.sourceKey?.startsWith("USDA")
                          ? "USDA"
                          : "Trevo One"
                        : "Consultoria"}
                    </span>

                    {qualityBadge && (
                      <span
                        title={qualityBadge.title}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                      >
                        {qualityBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Reference Nutrition Badges */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                    <span className="text-[var(--text-tertiary)]">
                      Ref {food.referenceAmount}{food.referenceUnitCode?.toLowerCase() || "g"}:
                    </span>
                    <span className="font-bold text-[var(--brand)]">
                      {food.caloriesKcal != null ? `${food.caloriesKcal} kcal` : "—"}
                    </span>
                    <span>•</span>
                    <span>{food.proteinG != null ? `${food.proteinG}g P` : "— P"}</span>
                    <span>•</span>
                    <span>{food.carbohydrateG != null ? `${food.carbohydrateG}g C` : "— C"}</span>
                    <span>•</span>
                    <span>{food.fatG != null ? `${food.fatG}g G` : "— G"}</span>
                    {food.fiberG != null && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{food.fiberG}g Fibra</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Interactive Quantity, Portion & Add Button */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Quantity input */}
                  <div className="w-16">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={qty}
                      onChange={(e) => handleQuantityChange(food.publicId, e.target.value)}
                      className="w-full px-2 py-1 text-xs font-bold text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                      title="Quantidade prescrita"
                    />
                  </div>

                  {/* Portion dropdown */}
                  <div className="min-w-[130px] max-w-[200px]">
                    <select
                      value={chosenPortionId}
                      onChange={(e) => handlePortionChange(food.publicId, e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] truncate cursor-pointer"
                    >
                      {portions.map((p) => (
                        <option key={p.publicId} value={p.publicId}>
                          {p.label} ({p.equivalentReferenceAmount}g)
                        </option>
                      ))}
                      <option value="G">Gramas (g)</option>
                    </select>
                  </div>

                  {/* Add button */}
                  <button
                    type="button"
                    disabled={isAdding}
                    onClick={() => handleAddFood(food)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[34px] ${
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subtotal preview for selected quantity & portion */}
              {previewKcal != null && (
                <div className="mt-1 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                  <span>
                    Subtotal calculado ({qty} {chosenPortionId === "G" ? "g" : portions.find((p) => p.publicId === chosenPortionId)?.label || "porção"}):
                  </span>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    <strong className="text-[var(--brand)]">{previewKcal} kcal</strong> • {previewP}g P • {previewC}g C • {previewG}g G
                    {previewFiber != null && ` • ${previewFiber}g F`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
