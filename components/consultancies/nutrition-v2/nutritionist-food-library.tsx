"use client";

import React, { useState, useTransition } from "react";
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
  CreateFoodInput,
  UpdateFoodInput,
} from "@/lib/nutrition-v2/food-repository";

interface NutritionistFoodLibraryProps {
  slug: string;
  initialResult: ListFoodsResult;
}

export function NutritionistFoodLibrary({
  slug,
  initialResult,
}: NutritionistFoodLibraryProps) {
  const [data, setData] = useState<ListFoodsResult>(initialResult);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "GLOBAL" | "CONSULTANCY">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");
  const [isPending, startTransition] = useTransition();

  // Selected food for details / portions
  const [selectedFood, setSelectedFood] = useState<FoodWithPortionsDto | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodListItemDto | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New portion form state inside detail modal
  const [newPortionLabel, setNewPortionLabel] = useState("");
  const [newPortionAmount, setNewPortionAmount] = useState("");
  const [isAddingPortion, setIsAddingPortion] = useState(false);

  function showFeedback(type: "success" | "error", text: string) {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  }

  function fetchFoods(targetPage = 1, currentQuery = query, currentScope = scopeFilter, currentStatus = statusFilter) {
    startTransition(async () => {
      const res = await listUnifiedFoodsAction(slug, {
        query: currentQuery,
        scope: currentScope,
        status: currentStatus,
        page: targetPage,
        pageSize: 20,
      });
      if (res.success && res.data) {
        setData(res.data as ListFoodsResult);
      } else {
        showFeedback("error", res.error || "Erro ao buscar alimentos.");
      }
    });
  }

  async function handleOpenDetails(food: FoodListItemDto) {
    setIsLoadingDetails(true);
    setSelectedFood(null);
    try {
      const res = await getFoodDetailsAction(slug, food.publicId);
      if (res.success && res.data) {
        setSelectedFood(res.data as FoodWithPortionsDto);
      } else {
        showFeedback("error", res.error || "Erro ao abrir detalhes.");
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
        setIsCreateOpen(false);
        fetchFoods(1);
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
        fetchFoods(data.page);
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
        fetchFoods(data.page);
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
      showFeedback("error", "Informe um rótulo e uma quantidade válida maior que zero.");
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
        // Reload details
        const updated = await getFoodDetailsAction(slug, selectedFood.publicId);
        if (updated.success && updated.data) {
          setSelectedFood(updated.data as FoodWithPortionsDto);
        }
        fetchFoods(data.page);
      } else {
        showFeedback("error", res.error || "Erro ao criar porção.");
      }
    } finally {
      setIsAddingPortion(false);
    }
  }

  async function handleArchivePortion(portionPublicId: string) {
    if (!selectedFood) return;
    if (!confirm("Deseja arquivar esta medida/porção?")) return;

    try {
      const res = await archivePortionAction(slug, portionPublicId);
      if (res.success) {
        showFeedback("success", "Porção arquivada!");
        const updated = await getFoodDetailsAction(slug, selectedFood.publicId);
        if (updated.success && updated.data) {
          setSelectedFood(updated.data as FoodWithPortionsDto);
        }
        fetchFoods(data.page);
      } else {
        showFeedback("error", res.error || "Erro ao arquivar porção.");
      }
    } catch {
      showFeedback("error", "Falha ao arquivar porção.");
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Biblioteca de Alimentos</h1>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Consulte a Tabela TACO (Trevo One) e gerencie os alimentos exclusivos da sua consultoria.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Alimento
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg text-sm font-medium ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchFoods(1, query);
              }}
              placeholder="Buscar por nome do alimento (ex: arroz, maca, frango)..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)] pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => fetchFoods(1, query)}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface-tertiary)] transition-colors"
          >
            {isPending ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)] text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="font-semibold text-[var(--text-muted)] mr-1">Origem:</span>
            {(["ALL", "GLOBAL", "CONSULTANCY"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setScopeFilter(sc);
                  fetchFoods(1, query, sc, statusFilter);
                }}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                  scopeFilter === sc
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {sc === "ALL" ? "Todos" : sc === "GLOBAL" ? "Trevo One (TACO)" : "Minha Consultoria"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--text-muted)] mr-1">Status:</span>
            {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  fetchFoods(1, query, scopeFilter, st);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-[var(--surface-tertiary)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {st === "ACTIVE" ? "Ativos" : st === "ARCHIVED" ? "Arquivados" : "Todos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Food Cards / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
          <span>
            Exibindo {data.items.length} de {data.total} alimentos encontrados
          </span>
          <span>Página {data.page} de {data.totalPages}</span>
        </div>

        {data.items.length === 0 ? (
          <div className="p-12 text-center bg-[var(--surface-primary)] border border-dashed border-[var(--border)] rounded-xl">
            <p className="text-[var(--text-muted)] text-sm">Nenhum alimento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.items.map((food) => {
              const isGlobal = food.scope === "GLOBAL";
              return (
                <div
                  key={food.publicId}
                  className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[var(--brand-primary)]/50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h3 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] leading-tight">
                          {food.name}
                        </h3>
                        {food.category && (
                          <p className="text-xs text-[var(--text-muted)]">{food.category}</p>
                        )}
                      </div>
                      <div>
                        {isGlobal ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                            Trevo One
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
                            Minha Consultoria
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Macro pill summary */}
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="font-medium bg-[var(--surface-secondary)] px-2 py-0.5 rounded">
                        Ref: {food.referenceAmount} {food.referenceUnitCode}
                      </span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {food.caloriesKcal != null ? `${Math.round(food.caloriesKcal)} kcal` : "--"}
                      </span>
                      <span>P: {food.proteinG != null ? `${food.proteinG}g` : "--"}</span>
                      <span>C: {food.carbohydrateG != null ? `${food.carbohydrateG}g` : "--"}</span>
                      <span>G: {food.fatG != null ? `${food.fatG}g` : "--"}</span>
                    </div>
                  </div>

                  {/* Actions & Portions badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(food)}
                      className="text-[var(--brand-primary)] hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <span>Porções ({food.portionsCount})</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {!isGlobal && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingFood(food)}
                          className="px-2.5 py-1 rounded bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] font-medium text-[var(--text-primary)] transition-colors"
                        >
                          Editar
                        </button>
                        {food.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleArchiveFood(food)}
                            className="px-2 py-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            Arquivar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              disabled={data.page <= 1 || isPending}
              onClick={() => fetchFoods(data.page - 1)}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => fetchFoods(data.page + 1)}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--surface-secondary)] border border-[var(--border)] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Detail / Portions Modal */}
      {(selectedFood || isLoadingDetails) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            {isLoadingDetails ? (
              <div className="py-12 text-center text-sm text-[var(--text-muted)]">Carregando detalhes...</div>
            ) : selectedFood ? (
              <>
                <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedFood.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{selectedFood.category || "Sem categoria"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Macro summary */}
                <div className="grid grid-cols-4 gap-2 bg-[var(--surface-secondary)] p-3 rounded-lg text-center text-xs">
                  <div>
                    <span className="block text-[var(--text-muted)]">Calorias</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {selectedFood.caloriesKcal != null ? Math.round(selectedFood.caloriesKcal) : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-muted)]">Proteína</span>
                    <span className="font-bold">{selectedFood.proteinG ?? "--"}g</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-muted)]">Carboidrato</span>
                    <span className="font-bold">{selectedFood.carbohydrateG ?? "--"}g</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-muted)]">Gordura</span>
                    <span className="font-bold">{selectedFood.fatG ?? "--"}g</span>
                  </div>
                </div>

                {/* Portions list */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Medidas Usuais / Porções</h3>
                  {selectedFood.portions.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] italic">Nenhuma porção cadastrada para este alimento.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedFood.portions.map((p) => (
                        <div
                          key={p.publicId}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-xs"
                        >
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">{p.label}</span>
                            <span className="text-[var(--text-muted)] ml-2">
                              = {p.equivalentReferenceAmount} {selectedFood.referenceUnitCode}
                            </span>
                          </div>
                          {selectedFood.scope === "CONSULTANCY" && (
                            <button
                              type="button"
                              onClick={() => handleArchivePortion(p.publicId)}
                              className="text-rose-600 hover:text-rose-700 text-xs px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add portion form if consultancy */}
                {selectedFood.scope === "CONSULTANCY" ? (
                  <form onSubmit={handleAddPortion} className="pt-3 border-t border-[var(--border)] space-y-3">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Adicionar Nova Porção
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Ex: 1 colher de sopa"
                        value={newPortionLabel}
                        onChange={(e) => setNewPortionLabel(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                        required
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder={`Equiv. em ${selectedFood.referenceUnitCode}`}
                          value={newPortionAmount}
                          onChange={(e) => setNewPortionAmount(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                          required
                        />
                        <button
                          type="submit"
                          disabled={isAddingPortion}
                          className="px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          {isAddingPortion ? "..." : "+"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic pt-2 border-t border-[var(--border)]">
                    Alimentos Trevo One (TACO) são gerenciados pela plataforma. Porções globais são somente leitura.
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Food Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Novo Alimento da Consultoria</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[var(--text-primary)]">Nome do Alimento *</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Panqueca Proteica de Aveia"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    placeholder="Ex: Preparados"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Unidade Referência</label>
                  <select
                    name="referenceUnitCode"
                    defaultValue="G"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
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

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-primary)]">Quantidade de Referência</label>
                <input
                  name="referenceAmount"
                  type="number"
                  step="0.01"
                  defaultValue={100}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
                <div>
                  <label className="block font-semibold mb-1 text-amber-600 dark:text-amber-400">Calorias (kcal)</label>
                  <input
                    name="caloriesKcal"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                  <input
                    name="proteinG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                  <input
                    name="carbohydrateG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                  <input
                    name="fatG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Cadastrar Alimento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Editar Alimento</h2>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFood} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[var(--text-primary)]">Nome do Alimento *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingFood.name}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingFood.category || ""}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Unidade Referência</label>
                  <input
                    name="referenceUnitCode"
                    type="text"
                    defaultValue={editingFood.referenceUnitCode}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--text-primary)]">Quantidade Referência</label>
                <input
                  name="referenceAmount"
                  type="number"
                  step="0.01"
                  defaultValue={editingFood.referenceAmount}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
                <div>
                  <label className="block font-semibold mb-1 text-amber-600 dark:text-amber-400">Calorias (kcal)</label>
                  <input
                    name="caloriesKcal"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.caloriesKcal ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                  <input
                    name="proteinG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.proteinG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                  <input
                    name="carbohydrateG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.carbohydrateG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                  <input
                    name="fatG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.fatG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingFood(null)}
                  className="px-4 py-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
