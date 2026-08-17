"use client";

import { useState } from "react";
import { updateItemQuantityAction } from "@/app/consultoria/[slug]/nutricao/planos/actions";
import { calculateItemMacros } from "@/lib/consultancies/nutrition-calc";

interface ItemData {
  publicId: string;
  foodNameSnapshot: string;
  referenceAmountSnapshot: number | null;
  referenceUnitSnapshot: string | null;
  caloriesReferenceSnapshot: number | null;
  proteinReferenceSnapshot: number | null;
  carbohydrateReferenceSnapshot: number | null;
  fatReferenceSnapshot: number | null;
  prescribedQuantity: number;
  prescribedUnitLabel: string;
}

interface NutritionItemQuantityModalProps {
  slug: string;
  planPublicId: string;
  item: ItemData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NutritionItemQuantityModal({
  slug,
  planPublicId,
  item,
  isOpen,
  onClose,
}: NutritionItemQuantityModalProps) {
  if (!isOpen || !item) return null;

  return (
    <NutritionItemQuantityModalContent
      key={item.publicId}
      slug={slug}
      planPublicId={planPublicId}
      item={item}
      onClose={onClose}
    />
  );
}

function NutritionItemQuantityModalContent({
  slug,
  planPublicId,
  item,
  onClose,
}: {
  slug: string;
  planPublicId: string;
  item: ItemData;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(item.prescribedQuantity));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const previewMacros = calculateItemMacros({
    referenceAmount: Number(item.referenceAmountSnapshot) || 100,
    caloriesKcal: Number(item.caloriesReferenceSnapshot) || 0,
    proteinG: Number(item.proteinReferenceSnapshot) || 0,
    carbohydrateG: Number(item.carbohydrateReferenceSnapshot) || 0,
    fatG: Number(item.fatReferenceSnapshot) || 0,
    prescribedQuantity: Number(quantity.replace(",", ".")) || 0,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const numQty = Number(quantity.replace(",", "."));
    if (!numQty || numQty <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const res = await updateItemQuantityAction(
        slug,
        planPublicId,
        item.publicId,
        quantity
      );

      if (!res.success) {
        setError(res.error);
        setIsPending(false);
        return;
      }

      onClose();
    } catch {
      setError("Ocorreu um erro ao atualizar a quantidade. Tente novamente.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Editar Quantidade</h3>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Alimento</span>
            <h4 className="text-sm font-bold text-slate-900">{item.foodNameSnapshot}</h4>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-qty-input" className="block text-xs font-semibold text-slate-700">
              Nova Quantidade ({item.prescribedUnitLabel}) <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-qty-input"
              type="text"
              required
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: 150"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Macro Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Macros recalculados:</span>
            <div className="font-bold text-emerald-900 text-sm">
              {previewMacros.calculatedCalories.toFixed(0)} kcal
            </div>
            <div className="text-[11px] text-slate-600">
              P: {previewMacros.calculatedProtein.toFixed(1)}g · C: {previewMacros.calculatedCarbohydrate.toFixed(1)}g · G: {previewMacros.calculatedFat.toFixed(1)}g
            </div>
          </div>

          {/* Actions */}
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
              disabled={isPending || !quantity.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isPending ? "Salvando..." : "Salvar quantidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
