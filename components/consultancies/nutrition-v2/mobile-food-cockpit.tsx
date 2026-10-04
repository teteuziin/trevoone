"use client";

import React, { useState, useEffect, useTransition, useId } from "react";
import {
  listUnifiedFoodsAction,
  getFoodDetailsAction,
  createConsultancyFoodAction,
  updateConsultancyFoodAction,
  archiveConsultancyFoodAction,
  createPortionAction,
  archivePortionAction,
} from "@/app/consultoria/[slug]/alimentos-v2/actions";
import type {
  FoodListItemDto,
  FoodWithPortionsDto,
  ListFoodsResult,
  FoodSourceTab,
  CreateFoodInput,
  UpdateFoodInput,
} from "@/lib/nutrition-v2/food-repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ============================================================================
// NUTRIENT FORMATTERS (RULE 28: UNKNOWN != ZERO, RULE 40, RULE 41)
// ============================================================================

export function formatNutrientValue(
  value: number | null | undefined,
  unit = "g",
  status?: string | null
): string {
  if (status === "TRACE") return "Tr";
  if (status === "KNOWN_ZERO" || value === 0) return `0 ${unit}`.trim();
  if (value != null && !isNaN(value)) {
    return `${Number(value.toFixed(1))} ${unit}`.trim();
  }
  return "—";
}

export function formatCaloriesValue(
  value: number | null | undefined,
  status?: string | null
): string {
  if (status === "TRACE") return "Tr";
  if (status === "KNOWN_ZERO" || value === 0) return "0 kcal";
  if (value != null && !isNaN(value)) {
    return `${Math.round(value)} kcal`;
  }
  return "—";
}

interface MobileFoodCockpitProps {
  slug: string;
  initialResult: ListFoodsResult;
  initialSourceTab?: FoodSourceTab;
  canAuthorNutrition?: boolean;
}

export function MobileFoodCockpit({
  slug,
  initialResult,
  initialSourceTab = "TREVO_BRASIL",
  canAuthorNutrition = true,
}: MobileFoodCockpitProps) {
  const [data, setData] = useState<ListFoodsResult>(initialResult);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sourceTab, setSourceTab] = useState<FoodSourceTab>(initialSourceTab);
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [isPending, startTransition] = useTransition();

  // Modals & Bottom Sheets
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodWithPortionsDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const [activeActionFood, setActiveActionFood] = useState<FoodListItemDto | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodListItemDto | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New portion state
  const [newPortionLabel, setNewPortionLabel] = useState("");
  const [newPortionAmount, setNewPortionAmount] = useState("");
  const [isAddingPortion, setIsAddingPortion] = useState(false);

  const searchInputId = useId();

  function showFeedback(type: "success" | "error", text: string) {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  }

  // Debounced search (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== undefined) {
      fetchFoods(1, debouncedQuery, scopeFilter, statusFilter, sourceTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function fetchFoods(
    targetPage = 1,
    currentQuery = query,
    currentScope = scopeFilter,
    currentStatus = statusFilter,
    currentTab = sourceTab
  ) {
    startTransition(async () => {
      const res = await listUnifiedFoodsAction(slug, {
        query: currentQuery,
        scope: currentScope,
        status: currentStatus,
        sourceTab: currentTab,
        page: targetPage,
        pageSize: 20,
      });
      if (res.success && res.data) {
        setData(res.data as ListFoodsResult);
      } else {
        showFeedback("error", res.error || "Erro ao consultar alimentos.");
      }
    });
  }

  async function handleOpenDetails(food: FoodListItemDto) {
    setIsActionSheetOpen(false);
    setIsLoadingDetails(true);
    setIsDetailSheetOpen(true);
    setSelectedFood(null);
    setShowMicros(false);
    try {
      const res = await getFoodDetailsAction(slug, food.publicId);
      if (res.success && res.data) {
        setSelectedFood(res.data as FoodWithPortionsDto);
      } else {
        showFeedback("error", res.error || "Erro ao carregar detalhes.");
      }
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleCreateFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const input: CreateFoodInput = {
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim() || null,
      referenceAmount: Number(formData.get("referenceAmount")) || 100,
      referenceUnitCode: String(formData.get("referenceUnitCode") || "G").trim().toUpperCase(),
      caloriesKcal: formData.get("caloriesKcal") ? Number(formData.get("caloriesKcal")) : null,
      proteinG: formData.get("proteinG") ? Number(formData.get("proteinG")) : null,
      carbohydrateG: formData.get("carbohydrateG") ? Number(formData.get("carbohydrateG")) : null,
      fatG: formData.get("fatG") ? Number(formData.get("fatG")) : null,
    };

    startTransition(async () => {
      const res = await createConsultancyFoodAction(slug, input);
      if (res.success) {
        showFeedback("success", "Alimento cadastrado com sucesso!");
        setIsCreateSheetOpen(false);
        fetchFoods(1, query, scopeFilter, statusFilter, sourceTab);
      } else {
        showFeedback("error", res.error || "Erro ao cadastrar alimento.");
      }
    });
  }

  async function handleUpdateFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingFood) return;

    const formData = new FormData(e.currentTarget);
    const input: UpdateFoodInput = {
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim() || null,
      referenceAmount: Number(formData.get("referenceAmount")) || 100,
      referenceUnitCode: String(formData.get("referenceUnitCode") || "G").trim().toUpperCase(),
      caloriesKcal: formData.get("caloriesKcal") ? Number(formData.get("caloriesKcal")) : null,
      proteinG: formData.get("proteinG") ? Number(formData.get("proteinG")) : null,
      carbohydrateG: formData.get("carbohydrateG") ? Number(formData.get("carbohydrateG")) : null,
      fatG: formData.get("fatG") ? Number(formData.get("fatG")) : null,
    };

    startTransition(async () => {
      const res = await updateConsultancyFoodAction(slug, editingFood.publicId, input);
      if (res.success) {
        showFeedback("success", "Alimento atualizado com sucesso!");
        setEditingFood(null);
        fetchFoods(data.page, query, scopeFilter, statusFilter, sourceTab);
      } else {
        showFeedback("error", res.error || "Erro ao atualizar alimento.");
      }
    });
  }

  async function handleArchiveFood(food: FoodListItemDto) {
    if (!confirm(`Deseja realmente arquivar o alimento "${food.name}"?`)) return;

    startTransition(async () => {
      const res = await archiveConsultancyFoodAction(slug, food.publicId);
      if (res.success) {
        showFeedback("success", "Alimento arquivado com sucesso!");
        setIsActionSheetOpen(false);
        fetchFoods(data.page, query, scopeFilter, statusFilter, sourceTab);
      } else {
        showFeedback("error", res.error || "Erro ao arquivar alimento.");
      }
    });
  }

  async function handleAddPortion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFood) return;

    const label = newPortionLabel.trim();
    const amount = Number(newPortionAmount);

    if (!label || isNaN(amount) || amount <= 0) {
      showFeedback("error", "Informe um rótulo e uma quantidade válida.");
      return;
    }

    setIsAddingPortion(true);
    try {
      const res = await createPortionAction(slug, selectedFood.publicId, {
        label,
        equivalentReferenceAmount: amount,
      });

      if (res.success) {
        showFeedback("success", "Porção adicionada!");
        setNewPortionLabel("");
        setNewPortionAmount("");
        const updated = await getFoodDetailsAction(slug, selectedFood.publicId);
        if (updated.success && updated.data) {
          setSelectedFood(updated.data as FoodWithPortionsDto);
        }
        fetchFoods(data.page, query, scopeFilter, statusFilter, sourceTab);
      } else {
        showFeedback("error", res.error || "Erro ao criar porção.");
      }
    } finally {
      setIsAddingPortion(false);
    }
  }

  async function handleArchivePortion(portionPublicId: string) {
    if (!selectedFood) return;
    if (!confirm("Deseja remover esta medida usual?")) return;

    try {
      const res = await archivePortionAction(slug, portionPublicId);
      if (res.success) {
        showFeedback("success", "Medida removida!");
        const updated = await getFoodDetailsAction(slug, selectedFood.publicId);
        if (updated.success && updated.data) {
          setSelectedFood(updated.data as FoodWithPortionsDto);
        }
        fetchFoods(data.page, query, scopeFilter, statusFilter, sourceTab);
      } else {
        showFeedback("error", res.error || "Erro ao remover porção.");
      }
    } catch {
      showFeedback("error", "Falha ao remover porção.");
    }
  }

  const activeFilterCount =
    (scopeFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ACTIVE" ? 1 : 0);

  return (
    <div className="w-full space-y-4 pb-20">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Mobile Header & Cockpit Title */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
            Nutrição • Biblioteca
          </span>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Biblioteca de Alimentos
          </h1>
        </div>
        {canAuthorNutrition && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsCreateSheetOpen(true)}
            className="font-bold min-h-[44px] px-3.5 shadow-sm rounded-xl shrink-0"
          >
            <span className="text-lg leading-none mr-1">+</span>
            <span>Novo</span>
          </Button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          role="status"
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Mobile Search Bar & Filter Button */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth={2} />
              <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento (ex: arroz, frango, aveia)..."
            aria-label="Buscar alimento"
            className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors min-h-[44px]"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-2 flex items-center justify-center w-7 h-7 my-auto text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--surface-hover)]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Trigger Button */}
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          aria-label="Abrir filtros"
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold min-h-[44px] shrink-0 transition-colors ${
            activeFilterCount > 0
              ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
              : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--brand)] text-white text-[10px] font-extrabold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Horizontal Scrollable Source Tabs */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {[
          { key: "TREVO_BRASIL", label: "Trevo Brasil (TACO)" },
          { key: "COMMERCIAL", label: "Comerciais" },
          { key: "MY_FOODS", label: "Minha Consultoria" },
          { key: "OTHER_DATABASES", label: "Outras bases" },
        ].map((tab) => {
          const isActive = sourceTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                const nextTab = tab.key as FoodSourceTab;
                setSourceTab(nextTab);
                fetchFoods(1, query, scopeFilter, statusFilter, nextTab);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors min-h-[36px] ${
                isActive
                  ? "bg-[var(--brand)] text-white shadow-xs"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {scopeFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20">
              Escopo: {scopeFilter === "GLOBAL" ? "Trevo One" : "Consultoria"}
              <button
                type="button"
                onClick={() => {
                  setScopeFilter("ALL");
                  fetchFoods(1, query, "ALL", statusFilter, sourceTab);
                }}
                className="hover:opacity-75"
              >
                ✕
              </button>
            </span>
          )}
          {statusFilter !== "ACTIVE" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]">
              Status: {statusFilter === "ARCHIVED" ? "Arquivados" : "Todos"}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ACTIVE");
                  fetchFoods(1, query, scopeFilter, "ACTIVE", sourceTab);
                }}
                className="hover:opacity-75"
              >
                ✕
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setScopeFilter("ALL");
              setStatusFilter("ACTIVE");
              fetchFoods(1, query, "ALL", "ACTIVE", sourceTab);
            }}
            className="text-[11px] font-bold text-[var(--brand)] hover:underline ml-1"
          >
            Limpar
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Results Counter */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium px-1">
        <span>
          {isPending ? "Carregando..." : `${data.total} alimento${data.total === 1 ? "" : "s"}`}
        </span>
        {data.totalPages > 1 && (
          <span>Página {data.page} de {data.totalPages}</span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Mobile Food List Cards */}
      {/* ------------------------------------------------------------------ */}
      {data.items.length === 0 ? (
        <div className="p-8 text-center bg-[var(--surface)] border border-dashed border-[var(--border-default)] rounded-2xl space-y-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Nenhum alimento encontrado
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Tente buscar com outro termo ou selecionar outra aba de fonte.
          </p>
          {canAuthorNutrition && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateSheetOpen(true)}
              className="font-bold min-h-[44px]"
            >
              + Cadastrar Alimento Manual
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.items.map((food) => {
            const foodTitle = food.displayNamePtBr || food.name;
            const caloriesStr = formatCaloriesValue(food.caloriesKcal);
            const proteinStr = formatNutrientValue(food.proteinG, "g");
            const carbsStr = formatNutrientValue(food.carbohydrateG, "g");
            const fatStr = formatNutrientValue(food.fatG, "g");

            return (
              <div
                key={food.publicId}
                className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-3.5 shadow-xs space-y-2.5 active:border-[var(--brand)] transition-colors"
              >
                {/* Top: Name, Source Badge, Menu button */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => handleOpenDetails(food)}
                    className="space-y-0.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight line-clamp-2">
                      {foodTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {food.category && (
                        <span className="text-[11px] text-[var(--text-secondary)] truncate">
                          {food.category}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)]">•</span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        {food.referenceAmount} {food.referenceUnitCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {food.sourceKey === "TACO" ? (
                      <Badge variant="brand" size="sm" className="text-[10px] px-2 py-0.5">
                        TACO
                      </Badge>
                    ) : food.sourceType === "BRANDED" || food.sourceKey === "GROWTH_SUPPLEMENTS" || food.sourceKey === "AMAFIL" ? (
                      <Badge variant="success" size="sm" className="text-[10px] px-2 py-0.5">
                        Comercial
                      </Badge>
                    ) : food.scope === "CONSULTANCY" ? (
                      <Badge variant="neutral" size="sm" className="text-[10px] px-2 py-0.5">
                        Consultoria
                      </Badge>
                    ) : food.sourceKey?.startsWith("USDA") ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        USDA
                      </span>
                    ) : (
                      <Badge variant="brand" size="sm" className="text-[10px] px-2 py-0.5">
                        Trevo One
                      </Badge>
                    )}

                    {/* Secondary Actions Button (•••) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveActionFood(food);
                        setIsActionSheetOpen(true);
                      }}
                      aria-label="Ações do alimento"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Macro Pills Bar */}
                <div
                  onClick={() => handleOpenDetails(food)}
                  className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[var(--brand)] text-xs">
                      {caloriesStr}
                    </span>
                    <span className="text-[var(--text-secondary)] text-[11px]">
                      P: <strong className="text-[var(--text-primary)] font-semibold">{proteinStr}</strong>
                    </span>
                    <span className="text-[var(--text-secondary)] text-[11px]">
                      C: <strong className="text-[var(--text-primary)] font-semibold">{carbsStr}</strong>
                    </span>
                    <span className="text-[var(--text-secondary)] text-[11px]">
                      G: <strong className="text-[var(--text-primary)] font-semibold">{fatStr}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[var(--brand)] font-bold text-xs shrink-0">
                    <span>{food.portionsCount > 0 ? `${food.portionsCount} porções` : "Detalhes"}</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <polyline points="9 18 15 12 9 6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Pagination Controls */}
      {/* ------------------------------------------------------------------ */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2 px-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={data.page <= 1 || isPending}
            onClick={() => fetchFoods(data.page - 1, query, scopeFilter, statusFilter, sourceTab)}
            className="min-h-[44px] flex-1 font-bold"
          >
            ← Anterior
          </Button>
          <span className="text-xs text-[var(--text-secondary)] font-semibold px-2 shrink-0">
            {data.page} / {data.totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={data.page >= data.totalPages || isPending}
            onClick={() => fetchFoods(data.page + 1, query, scopeFilter, statusFilter, sourceTab)}
            className="min-h-[44px] flex-1 font-bold"
          >
            Próxima →
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Action Sheet (•••) */}
      {/* ------------------------------------------------------------------ */}
      {isActionSheetOpen && activeActionFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Opções</p>
                <h4 className="text-sm font-extrabold text-[var(--text-primary)] truncate">
                  {activeActionFood.displayNamePtBr || activeActionFood.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleOpenDetails(activeActionFood)}
                className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] min-h-[44px] flex items-center gap-2.5"
              >
                <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Ver detalhes e medidas usuais</span>
              </button>

              {activeActionFood.scope === "CONSULTANCY" && canAuthorNutrition && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFood(activeActionFood);
                      setIsActionSheetOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] min-h-[44px] flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Editar alimento</span>
                  </button>

                  {activeActionFood.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => handleArchiveFood(activeActionFood)}
                      className="w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 min-h-[44px] flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Arquivar alimento</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. Filter Bottom Sheet */}
      {/* ------------------------------------------------------------------ */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Filtros de Alimentos</h3>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
              >
                ✕
              </button>
            </div>

            {/* Scope Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Origem / Escopo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "ALL", label: "Todos" },
                  { key: "GLOBAL", label: "Trevo One (TACO)" },
                  { key: "CONSULTANCY", label: "Consultoria" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setScopeFilter(item.key as "ALL" | "GLOBAL" | "CONSULTANCY")}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-center transition-colors min-h-[42px] ${
                      scopeFilter === item.key
                        ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                        : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "ACTIVE", label: "Ativos" },
                  { key: "ARCHIVED", label: "Arquivados" },
                  { key: "ALL", label: "Todos" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key as "ACTIVE" | "ARCHIVED" | "ALL")}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-center transition-colors min-h-[42px] ${
                      statusFilter === item.key
                        ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                        : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => {
                  setScopeFilter("ALL");
                  setStatusFilter("ACTIVE");
                  fetchFoods(1, query, "ALL", "ACTIVE", sourceTab);
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 min-h-[46px] font-semibold"
              >
                Limpar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  fetchFoods(1, query, scopeFilter, statusFilter, sourceTab);
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 min-h-[46px] font-bold"
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 9. Food Details Sheet */}
      {/* ------------------------------------------------------------------ */}
      {isDetailSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            {isLoadingDetails ? (
              <div className="py-16 text-center text-xs text-[var(--text-secondary)] font-medium">
                Carregando informações nutricionais...
              </div>
            ) : selectedFood ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20">
                        {selectedFood.sourceKey || (selectedFood.scope === "CONSULTANCY" ? "Consultoria" : "Oficial")}
                      </span>
                      {selectedFood.category && (
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          {selectedFood.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-extrabold text-[var(--text-primary)] leading-snug">
                      {selectedFood.displayNamePtBr || selectedFood.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailSheetOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {/* Macro Summary Cards */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Porção de Referência: {selectedFood.referenceAmount} {selectedFood.referenceUnitCode}
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Calorias</span>
                      <span className="text-sm font-extrabold text-[var(--brand)] block">
                        {formatCaloriesValue(selectedFood.caloriesKcal)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Proteína</span>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {formatNutrientValue(selectedFood.proteinG, "g")}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Carboidrato</span>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {formatNutrientValue(selectedFood.carbohydrateG, "g")}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Gordura</span>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        {formatNutrientValue(selectedFood.fatG, "g")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micronutrients Accordion */}
                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMicros(!showMicros)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] min-h-[44px]"
                  >
                    <span>Micronutrientes e Fibras</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {showMicros ? "▲ Recolher" : "▼ Expandir"}
                    </span>
                  </button>
                  {showMicros && (
                    <div className="p-3 bg-[var(--surface)] text-xs space-y-2 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">Fibra Alimentar:</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatNutrientValue(selectedFood.fiberG, "g")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">Qualidade dos Dados:</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedFood.dataQuality || "Padrão"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[var(--text-secondary)]">Fonte Original:</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedFood.sourceReference || selectedFood.sourceKey || "Manual"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Portions / Household Measures */}
                <div className="space-y-2.5 pt-1">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Medidas Usuais / Porções Cadastradas
                  </h3>
                  {selectedFood.portions.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] italic p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                      Nenhuma medida usual cadastrada para este alimento.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedFood.portions.map((p) => (
                        <div
                          key={p.publicId}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs"
                        >
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">{p.label}</span>
                            <span className="text-[var(--text-secondary)] ml-2 font-medium">
                              = {p.equivalentReferenceAmount} {selectedFood.referenceUnitCode}
                            </span>
                          </div>
                          {selectedFood.scope === "CONSULTANCY" && canAuthorNutrition && (
                            <button
                              type="button"
                              onClick={() => handleArchivePortion(p.publicId)}
                              className="text-rose-600 hover:text-rose-700 font-bold text-xs px-2 py-1 rounded min-h-[32px]"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Portion Form for Consultancy foods */}
                  {selectedFood.scope === "CONSULTANCY" && canAuthorNutrition && (
                    <form onSubmit={handleAddPortion} className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                      <span className="text-[11px] font-bold text-[var(--text-primary)] block">
                        + Adicionar Nova Medida Usual
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Ex: 1 colher de sopa"
                          value={newPortionLabel}
                          onChange={(e) => setNewPortionLabel(e.target.value)}
                          className="px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[42px]"
                          required
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder={`Equiv. em ${selectedFood.referenceUnitCode}`}
                            value={newPortionAmount}
                            onChange={(e) => setNewPortionAmount(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[42px]"
                            required
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isAddingPortion}
                            className="font-bold min-h-[42px] px-3 shrink-0"
                          >
                            {isAddingPortion ? "..." : "+"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. Create Food Sheet (Mobile-Native Form) */}
      {/* ------------------------------------------------------------------ */}
      {isCreateSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                Novo Alimento da Consultoria
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4 text-xs">
              {/* Group 1: Identificação */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  1. Identificação
                </span>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Nome do Alimento *</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Ex: Panqueca de Aveia com Banana"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    placeholder="Ex: Preparações da Consultoria"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                  />
                </div>
              </div>

              {/* Group 2: Referência */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  2. Base de Referência
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Quantidade Base *</label>
                    <input
                      name="referenceAmount"
                      type="number"
                      step="0.01"
                      defaultValue={100}
                      required
                      inputMode="decimal"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Unidade *</label>
                    <select
                      name="referenceUnitCode"
                      defaultValue="G"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    >
                      <option value="G">Gramas (g)</option>
                      <option value="ML">Mililitros (ml)</option>
                      <option value="UNIDADE">Unidade</option>
                      <option value="FATIA">Fatia</option>
                      <option value="COLHER_SOPA">Colher de sopa</option>
                      <option value="PORCAO">Porção</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 3: Macronutrientes */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  3. Macronutrientes (por porção de referência)
                </span>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Deixe em branco caso algum dado seja desconhecido (UNKNOWN).
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold mb-1 text-[var(--brand)]">Calorias (kcal)</label>
                    <input
                      name="caloriesKcal"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                    <input
                      name="proteinG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                    <input
                      name="carbohydrateG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                    <input
                      name="fatG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Submit Button */}
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isPending}
                  className="w-full min-h-[48px] font-bold text-sm shadow-sm"
                >
                  {isPending ? "Cadastrando..." : "Salvar Alimento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 11. Edit Food Sheet (Mobile-Native Form) */}
      {/* ------------------------------------------------------------------ */}
      {editingFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border-t border-[var(--border-default)] rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                Editar Alimento da Consultoria
              </h2>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFood} className="space-y-4 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  1. Identificação
                </span>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Nome do Alimento *</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingFood.name}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-sm min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingFood.category || ""}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  2. Base de Referência
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Quantidade Base *</label>
                    <input
                      name="referenceAmount"
                      type="number"
                      step="0.01"
                      defaultValue={editingFood.referenceAmount}
                      required
                      inputMode="decimal"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Unidade *</label>
                    <input
                      name="referenceUnitCode"
                      type="text"
                      defaultValue={editingFood.referenceUnitCode}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  3. Macronutrientes
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold mb-1 text-[var(--brand)]">Calorias (kcal)</label>
                    <input
                      name="caloriesKcal"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      defaultValue={editingFood.caloriesKcal ?? ""}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                    <input
                      name="proteinG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      defaultValue={editingFood.proteinG ?? ""}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                    <input
                      name="carbohydrateG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      defaultValue={editingFood.carbohydrateG ?? ""}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                    <input
                      name="fatG"
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      defaultValue={editingFood.fatG ?? ""}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isPending}
                  className="w-full min-h-[48px] font-bold text-sm shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
