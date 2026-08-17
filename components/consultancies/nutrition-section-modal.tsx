"use client";

import { useState } from "react";
import {
  createNutritionMealSectionAction,
  updateNutritionMealSectionAction,
} from "@/app/consultoria/[slug]/nutricao/planos/actions";

interface SectionData {
  publicId?: string;
  title: string;
}

interface NutritionSectionModalProps {
  slug: string;
  planPublicId: string;
  optionPublicId?: string;
  section?: SectionData | null;
  isOpen: boolean;
  onClose: () => void;
}

const SECTION_PRESETS = [
  "Proteínas",
  "Carboidratos",
  "Frutas",
  "Gorduras Saudáveis",
  "Saladas & Vegetais",
  "Bebidas",
  "Suplementos",
  "Orientações",
];

export function NutritionSectionModal({
  slug,
  planPublicId,
  optionPublicId,
  section,
  isOpen,
  onClose,
}: NutritionSectionModalProps) {
  if (!isOpen) return null;

  return (
    <NutritionSectionModalContent
      key={section?.publicId || optionPublicId || "new-section"}
      slug={slug}
      planPublicId={planPublicId}
      optionPublicId={optionPublicId}
      section={section}
      onClose={onClose}
    />
  );
}

function NutritionSectionModalContent({
  slug,
  planPublicId,
  optionPublicId,
  section,
  onClose,
}: {
  slug: string;
  planPublicId: string;
  optionPublicId?: string;
  section?: SectionData | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(section?.title || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isEditing = !!section?.publicId;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      if (isEditing && section?.publicId) {
        const res = await updateNutritionMealSectionAction(
          slug,
          planPublicId,
          section.publicId,
          title
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      } else if (optionPublicId) {
        const res = await createNutritionMealSectionAction(
          slug,
          planPublicId,
          optionPublicId,
          title
        );
        if (!res.success) {
          setError(res.error);
          setIsPending(false);
          return;
        }
      }

      onClose();
    } catch {
      setError("Ocorreu um erro ao salvar a seção. Tente novamente.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {isEditing ? "Editar Seção" : "Adicionar Seção à Opção"}
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

          {/* Nome da Seção */}
          <div className="space-y-1.5">
            <label htmlFor="section-title" className="block text-xs font-semibold text-slate-700">
              Nome da Seção <span className="text-red-500">*</span>
            </label>
            <input
              id="section-title"
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Proteínas, Carboidratos, Frutas"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Sugestões rápidas */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-slate-500">Sugestões rápidas:</span>
            <div className="flex flex-wrap gap-1.5">
              {SECTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    title === preset
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                      : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {preset}
                </button>
              ))}
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
              disabled={isPending || !title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar seção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
