"use client";

import { useState } from "react";
import {
  createNutritionMealAction,
  updateNutritionMealAction,
} from "@/app/consultoria/[slug]/nutricao/planos/actions";

interface MealData {
  publicId?: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
}

interface NutritionMealModalProps {
  slug: string;
  planPublicId: string;
  meal?: MealData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function NutritionMealModal({
  slug,
  planPublicId,
  meal,
  isOpen,
  onClose,
}: NutritionMealModalProps) {
  if (!isOpen) return null;

  return (
    <NutritionMealModalContent
      key={meal?.publicId || "new-meal"}
      slug={slug}
      planPublicId={planPublicId}
      meal={meal}
      onClose={onClose}
    />
  );
}

function NutritionMealModalContent({
  slug,
  planPublicId,
  meal,
  onClose,
}: {
  slug: string;
  planPublicId: string;
  meal?: MealData | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(meal?.title || "");
  const [scheduledTime, setScheduledTime] = useState(
    meal?.scheduledTime ? meal.scheduledTime.slice(0, 5) : ""
  );
  const [notes, setNotes] = useState(meal?.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isEditing = !!meal?.publicId;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("scheduledTime", scheduledTime);
    formData.set("notes", notes);

    try {
      if (isEditing && meal?.publicId) {
        const res = await updateNutritionMealAction(
          slug,
          planPublicId,
          meal.publicId,
          formData
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      } else {
        const res = await createNutritionMealAction(
          slug,
          planPublicId,
          formData
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      }

      onClose();
    } catch {
      setError("Ocorreu um erro ao salvar a refeição. Tente novamente.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {isEditing ? "Editar Refeição" : "Adicionar Refeição"}
          </h3>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Nome da Refeição */}
          <div className="space-y-1.5">
            <label htmlFor="meal-title" className="block text-xs font-semibold text-slate-700">
              Nome da Refeição <span className="text-red-500">*</span>
            </label>
            <input
              id="meal-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Café da manhã, Almoço, Lanche da tarde"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Horário Previsto */}
          <div className="space-y-1.5">
            <label htmlFor="meal-time" className="block text-xs font-semibold text-slate-700">
              Horário previsto <span className="text-xs text-slate-400 font-normal">(HH:MM, opcional)</span>
            </label>
            <input
              id="meal-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label htmlFor="meal-notes" className="block text-xs font-semibold text-slate-700">
              Observações da refeição <span className="text-xs text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="meal-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Consumir 30 min antes do treino"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
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
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar refeição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
