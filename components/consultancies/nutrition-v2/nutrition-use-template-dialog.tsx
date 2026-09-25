"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlanFromTemplateAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import { Button } from "@/components/ui/button";
import type { NutritionV2PlanTemplateListItemDto } from "@/lib/nutrition-v2/types";

interface NutritionUseTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  template: NutritionV2PlanTemplateListItemDto | null;
}

export function NutritionUseTemplateDialog({
  isOpen,
  onClose,
  consultancySlug,
  template,
}: NutritionUseTemplateDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(template?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  if (!isOpen || !template) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("templatePublicId", template.publicId);
      if (title.trim()) {
        formData.set("title", title.trim());
      }

      const res = await createPlanFromTemplateAction(consultancySlug, formData);
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Erro ao criar plano a partir do modelo.");
        setIsSubmitting(false);
        return;
      }

      // Navigate to the newly created independent draft plan
      router.push(`/consultoria/${consultancySlug}/planos-v2/${res.data.planPublicId}`);
      onClose();
    } catch {
      setErrorMessage("Falha de conexão ao criar plano.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-default)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug">
              Usar modelo
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Gera um novo plano alimentar rascunho independente baseado no blueprint deste modelo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <svg className="w-4 h-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Atenção: Validação dos alimentos</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Estrutura do Modelo
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              {template.name}
            </div>
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
              <span>{template.mealCount} refeições</span>
              <span>•</span>
              <span>{template.itemCount} alimentos/itens</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="plan-title" className="text-xs font-semibold text-[var(--text-primary)]">
              Título do novo plano alimentar <span className="text-red-500">*</span>
            </label>
            <input
              id="plan-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título para personalizar este plano..."
              maxLength={255}
              disabled={isSubmitting}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors disabled:opacity-50"
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">Independência do plano:</p>
            <p>
              O novo plano será criado em status <strong>Rascunho</strong>. Ele não fica vinculado ao modelo — edições futuras não afetarão o modelo nem outros planos.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[40px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !title.trim()}
              className="font-bold min-h-[40px] shadow-sm"
            >
              {isSubmitting ? "Criando plano..." : "Criar Plano Rascunho"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
