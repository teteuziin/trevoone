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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NutritionistFoodLibraryProps {
  slug: string;
  initialResult: ListFoodsResult;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
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
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Cockpit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
              Catálogo Nutricional
            </span>
            <Badge variant="brand" size="sm">
              Tabela TACO & Consultoria
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Biblioteca de Alimentos
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
            Consulte a Tabela TACO unificada e gerencie preparações exclusivas da sua consultoria.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setIsCreateOpen(true)}
          className="font-bold min-h-[44px] shadow-sm shrink-0"
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          <span>Novo Alimento</span>
        </Button>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Search & Filters */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4 depth-surface">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 relative">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchFoods(1, query);
              }}
              placeholder="Buscar por nome do alimento (ex: arroz, maçã, peito de frango)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => fetchFoods(1, query)}
            disabled={isPending}
            className="font-semibold px-5 min-h-[42px]"
          >
            {isPending ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="font-bold text-[var(--text-secondary)] mr-1">Origem:</span>
            {(["ALL", "GLOBAL", "CONSULTANCY"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => {
                  setScopeFilter(sc);
                  fetchFoods(1, query, sc, statusFilter);
                }}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors depth-interactive ${
                  scopeFilter === sc
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {sc === "ALL" ? "Todos" : sc === "GLOBAL" ? "Trevo One (TACO)" : "Minha Consultoria"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-secondary)] mr-1">Status:</span>
            {(["ACTIVE", "ARCHIVED", "ALL"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  fetchFoods(1, query, scopeFilter, st);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors depth-interactive ${
                  statusFilter === st
                    ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {st === "ACTIVE" ? "Ativos" : st === "ARCHIVED" ? "Arquivados" : "Todos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Food Cards / List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium px-1">
          <span>
            Exibindo {data.items.length} de {data.total} alimentos encontrados
          </span>
          <span>Página {data.page} de {data.totalPages}</span>
        </div>

        {data.items.length === 0 ? (
          <div className="p-12 text-center bg-[var(--surface)] border border-dashed border-[var(--border-default)] rounded-2xl sm:rounded-3xl space-y-2 shadow-xs depth-surface">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Nenhum alimento encontrado
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Tente ajustar o termo de busca ou selecionar outros filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.items.map((food) => {
              const isGlobal = food.scope === "GLOBAL";
              return (
                <div
                  key={food.publicId}
                  className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[var(--brand-soft-border)] transition-all flex flex-col justify-between gap-3 depth-surface"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug truncate">
                          {food.displayNamePtBr || food.name}
                        </h3>
                        {food.category && (
                          <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                            {food.category}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isGlobal ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="success" size="sm">
                              Trevo One
                            </Badge>
                            {food.sourceKey && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                {food.sourceKey.startsWith("USDA") ? "USDA" : food.sourceKey === "TACO" ? "TACO" : food.sourceKey}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="brand" size="sm">
                            Minha Consultoria
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Macro pill summary */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold bg-[var(--surface-subtle)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                        Ref: {food.referenceAmount} {food.referenceUnitCode}
                      </span>
                      <span className="font-extrabold text-[var(--brand)]">
                        {food.caloriesKcal != null ? `${Math.round(food.caloriesKcal)} kcal` : "--"}
                      </span>
                      <span className="font-medium">P: {food.proteinG != null ? `${food.proteinG}g` : "--"}</span>
                      <span className="font-medium">C: {food.carbohydrateG != null ? `${food.carbohydrateG}g` : "--"}</span>
                      <span className="font-medium">G: {food.fatG != null ? `${food.fatG}g` : "--"}</span>
                    </div>
                  </div>

                  {/* Actions & Portions badge */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-subtle)] text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(food)}
                      className="text-[var(--brand)] hover:underline font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Porções ({food.portionsCount})</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>

                    {!isGlobal && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingFood(food)}
                          className="font-semibold text-xs min-h-[32px] px-2.5"
                        >
                          Editar
                        </Button>
                        {food.status === "ACTIVE" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveFood(food)}
                            className="font-semibold text-xs min-h-[32px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            Arquivar
                          </Button>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={data.page <= 1 || isPending}
              onClick={() => fetchFoods(data.page - 1)}
              className="min-h-[36px]"
            >
              Anterior
            </Button>
            <span className="text-xs text-[var(--text-secondary)] font-medium px-2">
              Página {data.page} de {data.totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => fetchFoods(data.page + 1)}
              className="min-h-[36px]"
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      {/* Detail / Portions Modal */}
      {(selectedFood || isLoadingDetails) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl depth-surface">
            {isLoadingDetails ? (
              <div className="py-12 text-center text-sm text-[var(--text-secondary)] font-medium">Carregando detalhes...</div>
            ) : selectedFood ? (
              <>
                <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="space-y-0.5 min-w-0">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{selectedFood.name}</h2>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">{selectedFood.category || "Sem categoria"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    aria-label="Fechar"
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Macro summary */}
                <div className="grid grid-cols-4 gap-2 bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-default)] text-center text-xs">
                  <div>
                    <span className="block text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Calorias</span>
                    <span className="font-extrabold text-[var(--brand)] text-sm">
                      {selectedFood.caloriesKcal != null ? Math.round(selectedFood.caloriesKcal) : "--"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Proteína</span>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{selectedFood.proteinG ?? "--"}g</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Carboidrato</span>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{selectedFood.carbohydrateG ?? "--"}g</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Gordura</span>
                    <span className="font-bold text-[var(--text-primary)] text-sm">{selectedFood.fatG ?? "--"}g</span>
                  </div>
                </div>

                {/* Portions list */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Medidas Usuais / Porções</h3>
                  {selectedFood.portions.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] italic">Nenhuma porção cadastrada para este alimento.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedFood.portions.map((p) => (
                        <div
                          key={p.publicId}
                          className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs"
                        >
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">{p.label}</span>
                            <span className="text-[var(--text-secondary)] ml-2">
                              = {p.equivalentReferenceAmount} {selectedFood.referenceUnitCode}
                            </span>
                          </div>
                          {selectedFood.scope === "CONSULTANCY" && (
                            <button
                              type="button"
                              onClick={() => handleArchivePortion(p.publicId)}
                              className="text-rose-600 hover:text-rose-700 text-xs px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
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
                  <form onSubmit={handleAddPortion} className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Adicionar Nova Porção
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Ex: 1 colher de sopa"
                        value={newPortionLabel}
                        onChange={(e) => setNewPortionLabel(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
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
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                          required
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={isAddingPortion}
                          className="font-bold min-h-[36px] px-3"
                        >
                          {isAddingPortion ? "..." : "+"}
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] italic pt-2 border-t border-[var(--border-subtle)]">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Novo Alimento da Consultoria</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Fechar"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Nome do Alimento *</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Panqueca Proteica de Aveia"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    placeholder="Ex: Preparados"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Unidade Referência</label>
                  <select
                    name="referenceUnitCode"
                    defaultValue="G"
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
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
                <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Quantidade de Referência</label>
                <input
                  name="referenceAmount"
                  type="number"
                  step="0.01"
                  defaultValue={100}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <label className="block font-bold mb-1 text-[var(--brand)]">Calorias (kcal)</label>
                  <input
                    name="caloriesKcal"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                  <input
                    name="proteinG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                  <input
                    name="carbohydrateG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                  <input
                    name="fatG"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsCreateOpen(false)}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  className="font-bold shadow-sm"
                >
                  {isPending ? "Salvando..." : "Cadastrar Alimento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Food Modal */}
      {editingFood && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Editar Alimento</h2>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                aria-label="Fechar"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFood} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Nome do Alimento *</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingFood.name}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    defaultValue={editingFood.category || ""}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Unidade Referência</label>
                  <input
                    name="referenceUnitCode"
                    type="text"
                    defaultValue={editingFood.referenceUnitCode}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-[var(--text-primary)]">Quantidade Referência</label>
                <input
                  name="referenceAmount"
                  type="number"
                  step="0.01"
                  defaultValue={editingFood.referenceAmount}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <label className="block font-bold mb-1 text-[var(--brand)]">Calorias (kcal)</label>
                  <input
                    name="caloriesKcal"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.caloriesKcal ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Proteína (g)</label>
                  <input
                    name="proteinG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.proteinG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Carboidrato (g)</label>
                  <input
                    name="carbohydrateG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.carbohydrateG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-[var(--text-primary)]">Gordura (g)</label>
                  <input
                    name="fatG"
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={editingFood.fatG ?? ""}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingFood(null)}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  className="font-bold shadow-sm"
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
