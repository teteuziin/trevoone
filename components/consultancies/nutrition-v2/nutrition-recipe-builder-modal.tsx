"use client";

import React, { useState, useTransition } from "react";
import { registerRecipeFoodAction, searchFoodsForPickerAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodSelectionResult } from "./nutrition-food-picker";
import type { FoodListItemDto } from "@/lib/nutrition-v2/food-repository";

interface RecipeIngredient {
  foodPublicId: string;
  foodName: string;
  quantity: number;
  unitCode: string;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  fiberG: number;
  portionPublicId?: string | null;
}

interface NutritionRecipeBuilderModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onFoodCreated: (result: FoodSelectionResult) => void;
}

export function NutritionRecipeBuilderModal({
  slug,
  isOpen,
  onClose,
  onFoodCreated,
}: NutritionRecipeBuilderModalProps) {
  const [name, setName] = useState("");
  const [servingsYield, setServingsYield] = useState<number>(2);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Search state to add ingredients
  const [isSearchingIngredient, setIsSearchingIngredient] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodListItemDto[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodListItemDto | null>(null);
  const [ingredientQty, setIngredientQty] = useState("100");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  // Calculate totals across ingredients
  const totalKcal = Math.round(ingredients.reduce((acc, ing) => acc + ing.caloriesKcal, 0) * 10) / 10;
  const totalP = Math.round(ingredients.reduce((acc, ing) => acc + ing.proteinG, 0) * 10) / 10;
  const totalC = Math.round(ingredients.reduce((acc, ing) => acc + ing.carbohydrateG, 0) * 10) / 10;
  const totalG = Math.round(ingredients.reduce((acc, ing) => acc + ing.fatG, 0) * 10) / 10;
  const totalFiber = Math.round(ingredients.reduce((acc, ing) => acc + ing.fiberG, 0) * 10) / 10;

  const validServings = Math.max(1, servingsYield || 1);
  const perServingKcal = Math.round((totalKcal / validServings) * 10) / 10;
  const perServingP = Math.round((totalP / validServings) * 10) / 10;
  const perServingC = Math.round((totalC / validServings) * 10) / 10;
  const perServingG = Math.round((totalG / validServings) * 10) / 10;
  const perServingFiber = Math.round((totalFiber / validServings) * 10) / 10;

  async function handleSearchIngredients(q: string) {
    setIngredientQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await searchFoodsForPickerAction(slug, q, "ALL", 1, "ALL");
    if (res.success && res.data) {
      setSearchResults(res.data.items);
    }
  }

  function handleAddIngredient() {
    if (!selectedFood) return;
    const qty = parseFloat(ingredientQty.replace(",", "."));
    if (isNaN(qty) || qty <= 0) return;

    const ref = selectedFood.referenceAmount || 100;
    const factor = qty / ref;

    const ingKcal = selectedFood.caloriesKcal != null ? Math.round(selectedFood.caloriesKcal * factor * 10) / 10 : 0;
    const ingP = selectedFood.proteinG != null ? Math.round(selectedFood.proteinG * factor * 10) / 10 : 0;
    const ingC = selectedFood.carbohydrateG != null ? Math.round(selectedFood.carbohydrateG * factor * 10) / 10 : 0;
    const ingG = selectedFood.fatG != null ? Math.round(selectedFood.fatG * factor * 10) / 10 : 0;
    const ingFiber = selectedFood.fiberG != null ? Math.round(selectedFood.fiberG * factor * 10) / 10 : 0;

    const newIng: RecipeIngredient = {
      foodPublicId: selectedFood.publicId,
      foodName: selectedFood.displayNamePtBr || selectedFood.name,
      quantity: qty,
      unitCode: selectedFood.referenceUnitCode || "G",
      caloriesKcal: ingKcal,
      proteinG: ingP,
      carbohydrateG: ingC,
      fatG: ingG,
      fiberG: ingFiber,
    };

    setIngredients([...ingredients, newIng]);
    setSelectedFood(null);
    setIngredientQuery("");
    setSearchResults([]);
    setIsSearchingIngredient(false);
    setIngredientQty("100");
  }

  function handleRemoveIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("O nome da receita é obrigatório.");
      return;
    }

    if (ingredients.length === 0) {
      setErrorMsg("Adicione pelo menos um ingrediente da biblioteca para calcular os nutrientes.");
      return;
    }

    startTransition(async () => {
      const res = await registerRecipeFoodAction(slug, {
        name: cleanName,
        servingsYield: validServings,
        ingredients: ingredients.map((ing) => ({
          foodPublicId: ing.foodPublicId,
          quantity: ing.quantity,
          unitCode: ing.unitCode,
          portionPublicId: ing.portionPublicId || null,
        })),
      });

      if (res.success && res.data) {
        onFoodCreated({
          foodPublicId: res.data.publicId,
          prescribedQuantity: 1,
          prescribedUnitCode: "PORCAO",
          prescribedUnitLabel: `1 porção (1/${validServings})`,
          portionPublicId: null,
        });
        onClose();
      } else {
        setErrorMsg(res.error || "Erro ao salvar receita.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden depth-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Criar Receita / Preparação</h2>
              <p className="text-xs text-[var(--text-secondary)]">Cálculo exato de macros somando os ingredientes da biblioteca</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Nome da Receita *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Panqueca de Banana com Aveia"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Rendimento (porções) *
              </label>
              <input
                type="number"
                min={1}
                max={50}
                required
                value={servingsYield}
                onChange={(e) => setServingsYield(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs sm:text-sm text-center font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          {/* Ingredients list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Ingredientes ({ingredients.length})
              </span>
              {!isSearchingIngredient && (
                <button
                  type="button"
                  onClick={() => setIsSearchingIngredient(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  <span>+ Adicionar ingrediente</span>
                </button>
              )}
            </div>

            {/* Quick search inline */}
            {isSearchingIngredient && (
              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    Buscar ingrediente na biblioteca:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchingIngredient(false);
                      setSelectedFood(null);
                    }}
                    className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Fechar
                  </button>
                </div>

                {!selectedFood ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={ingredientQuery}
                      onChange={(e) => handleSearchIngredients(e.target.value)}
                      placeholder="Digite o alimento (ex: banana, ovo, aveia...)"
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)]">
                        {searchResults.slice(0, 6).map((item) => (
                          <div
                            key={item.publicId}
                            onClick={() => {
                              setSelectedFood(item);
                              setIngredientQty(String(item.referenceAmount || 100));
                            }}
                            className="p-2.5 hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-[var(--text-primary)]">
                              {item.displayNamePtBr || item.name}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)]">
                              {item.caloriesKcal} kcal / {item.referenceAmount} {item.referenceUnitCode}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex-1 min-w-[150px]">
                      {selectedFood.displayNamePtBr || selectedFood.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(e.target.value)}
                        className="w-20 px-2.5 py-1.5 text-xs text-center font-bold rounded-lg border border-[var(--border-default)] bg-[var(--surface)]"
                      />
                      <span className="text-xs text-[var(--text-secondary)] font-semibold">
                        {selectedFood.referenceUnitCode || "G"}
                      </span>
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                      >
                        Incluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Added ingredients list */}
            {ingredients.length === 0 ? (
              <div className="py-6 text-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)]/40 text-xs text-[var(--text-secondary)]">
                Nenhum ingrediente adicionado ainda. Clique em &quot;+ Adicionar ingrediente&quot;.
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[var(--text-primary)] block truncate">
                        {ing.foodName}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {ing.quantity} {ing.unitCode} • {ing.caloriesKcal} kcal • {ing.proteinG}g P • {ing.carbohydrateG}g C • {ing.fatG}g G
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Remover ingrediente"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Macro Calculations Dashboard */}
          {ingredients.length > 0 && (
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-200">
                <span>Resultado Nutricional da Receita</span>
                <span>Rendimento: {validServings} porção(ões)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Por Porção (1/{validServings})</span>
                  <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {perServingKcal} kcal
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    P: <strong>{perServingP}g</strong> • C: <strong>{perServingC}g</strong> • G: <strong>{perServingG}g</strong> • Fib: <strong>{perServingFiber}g</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Total da Receita Inteira</span>
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">
                    {totalKcal} kcal
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    P: {totalP}g • C: {totalC}g • G: {totalG}g
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || ingredients.length === 0}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 transition-colors shadow-xs min-h-[40px] cursor-pointer"
            >
              {isPending ? "Cadastrando receita..." : "Salvar receita e adicionar ao plano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
