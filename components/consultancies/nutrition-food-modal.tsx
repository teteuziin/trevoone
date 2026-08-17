"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  searchNutritionFoodsAction,
  createChoiceGroupWithItemAction,
  addItemAlternativeAction,
} from "@/app/consultoria/[slug]/nutricao/planos/actions";
import { calculateItemMacros } from "@/lib/consultancies/nutrition-calc";
import type { NutritionFoodDto } from "@/lib/consultancies/nutrition";

interface NutritionFoodModalProps {
  slug: string;
  planPublicId: string;
  sectionPublicId?: string;
  choiceGroupPublicId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NutritionFoodModal({
  slug,
  planPublicId,
  sectionPublicId,
  choiceGroupPublicId,
  isOpen,
  onClose,
}: NutritionFoodModalProps) {
  if (!isOpen) return null;

  return (
    <NutritionFoodModalContent
      key={sectionPublicId || choiceGroupPublicId || "new-food-modal"}
      slug={slug}
      planPublicId={planPublicId}
      sectionPublicId={sectionPublicId}
      choiceGroupPublicId={choiceGroupPublicId}
      onClose={onClose}
    />
  );
}

function NutritionFoodModalContent({
  slug,
  planPublicId,
  sectionPublicId,
  choiceGroupPublicId,
  onClose,
}: {
  slug: string;
  planPublicId: string;
  sectionPublicId?: string;
  choiceGroupPublicId?: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NutritionFoodDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NutritionFoodDto | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const searchSeqRef = useRef(0);
  const isAlternative = !!choiceGroupPublicId;

  function handleQueryChange(val: string) {
    setQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  }

  // Busca de alimentos com debounce seguro contra race conditions
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const currentSeq = ++searchSeqRef.current;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchNutritionFoodsAction(slug, trimmed);
        if (currentSeq === searchSeqRef.current) {
          if (res.success && res.data) {
            setSearchResults(res.data);
          } else {
            setSearchResults([]);
          }
          setHasSearched(true);
          setIsSearching(false);
        }
      } catch {
        if (currentSeq === searchSeqRef.current) {
          setSearchResults([]);
          setIsSearching(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, slug]);

  function handleSelectFood(food: NutritionFoodDto) {
    setSelectedFood(food);
    setQuantity(String(food.referenceAmount || 100));
    setError(null);
  }

  // Previsão em tempo real de macros
  const previewMacros = selectedFood
    ? calculateItemMacros({
        referenceAmount: Number(selectedFood.referenceAmount) || 100,
        caloriesKcal: Number(selectedFood.caloriesKcal) || 0,
        proteinG: Number(selectedFood.proteinG) || 0,
        carbohydrateG: Number(selectedFood.carbohydrateG) || 0,
        fatG: Number(selectedFood.fatG) || 0,
        prescribedQuantity: Number(quantity.replace(",", ".")) || 0,
      })
    : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFood) {
      setError("Selecione um alimento da busca.");
      return;
    }

    const numQty = Number(quantity.replace(",", "."));
    if (!numQty || numQty <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      if (isAlternative && choiceGroupPublicId) {
        const res = await addItemAlternativeAction(
          slug,
          planPublicId,
          choiceGroupPublicId,
          selectedFood.publicId,
          quantity,
          notes || null
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      } else if (sectionPublicId) {
        const res = await createChoiceGroupWithItemAction(
          slug,
          planPublicId,
          sectionPublicId,
          selectedFood.publicId,
          quantity,
          notes || null
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      }

      onClose();
    } catch {
      setError("Ocorreu um erro ao salvar o alimento. Tente novamente.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isAlternative ? "Adicionar Alternativa" : "Adicionar Alimento"}
            </h3>
            <p className="text-xs text-slate-500">
              {isAlternative
                ? "Prescreva uma opção substituta para este grupo alimentar"
                : "Busque na biblioteca e informe a porção prescrita"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Autocomplete Input */}
          <div className="space-y-1.5">
            <label htmlFor="food-search-input" className="block text-xs font-semibold text-slate-700">
              Buscar Alimento na Biblioteca <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="food-search-input"
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Ex: Arroz, Frango, Banana, Ovo, Aveia..."
                autoComplete="off"
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Limpar busca"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {query.trim().length > 0 && query.trim().length < 2 && (
              <p className="text-[11px] text-slate-500">Digite pelo menos 2 caracteres para buscar.</p>
            )}
          </div>

          {/* Search Results List */}
          {isSearching && (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Buscando alimentos...
            </div>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <p className="text-xs font-medium text-slate-700">Nenhum alimento encontrado para &quot;{query}&quot;</p>
              <p className="text-[11px] text-slate-500">
                Não encontrou o alimento desejado?{" "}
                <Link
                  href={`/consultoria/${slug}/nutricao/alimentos/novo`}
                  target="_blank"
                  className="text-emerald-600 hover:underline font-semibold"
                >
                  Cadastre na Biblioteca
                </Link>
              </p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-slate-50/50">
              <span className="block px-2.5 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Resultados ({searchResults.length})
              </span>
              {searchResults.map((f) => {
                const isSelected = selectedFood?.publicId === f.publicId;
                return (
                  <button
                    key={f.publicId}
                    type="button"
                    onClick={() => handleSelectFood(f)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 ${
                      isSelected
                        ? "bg-emerald-50 border border-emerald-300 shadow-xs"
                        : "bg-white border border-slate-200/70 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">{f.name}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          f.sourceType === "EXTERNAL"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {f.sourceType === "EXTERNAL" ? "TACO" : "Manual"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Ref: {f.referenceAmount} {f.referenceUnit}</span>
                      <span>•</span>
                      <span>{f.caloriesKcal} kcal</span>
                      <span>•</span>
                      <span>P: {f.proteinG}g · C: {f.carbohydrateG}g · G: {f.fatG}g</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Food Details & Quantity Form */}
          {selectedFood && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    Alimento Selecionado
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{selectedFood.name}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFood(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Trocar
                </button>
              </div>

              {/* Quantity Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label htmlFor="prescribed-qty" className="block text-xs font-semibold text-slate-700">
                    Quantidade Prescrita ({selectedFood.referenceUnit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="prescribed-qty"
                    type="text"
                    required
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ex: 150"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Macro Preview */}
                {previewMacros && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 flex flex-col justify-center text-xs">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Valores Calculados:</span>
                    <div className="font-bold text-emerald-900 text-sm">
                      {previewMacros.calculatedCalories.toFixed(0)} kcal
                    </div>
                    <div className="text-[11px] text-slate-600">
                      P: {previewMacros.calculatedProtein.toFixed(1)}g · C: {previewMacros.calculatedCarbohydrate.toFixed(1)}g · G: {previewMacros.calculatedFat.toFixed(1)}g
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label htmlFor="item-notes" className="block text-xs font-semibold text-slate-700">
                  Observações do item <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="item-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pesar cozido, grelhado sem óleo, etc."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedFood}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isPending
                ? "Salvando..."
                : isAlternative
                ? "Adicionar alternativa"
                : "Adicionar alimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
