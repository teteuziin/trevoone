"use client";

import React, { useState } from "react";
import { createTemplateFromPlanAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import { Button } from "@/components/ui/button";

interface NutritionSaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  planPublicId: string;
  versionPublicId?: string;
  defaultName?: string;
}

export function NutritionSaveTemplateDialog({
  isOpen,
  onClose,
  consultancySlug,
  planPublicId,
  versionPublicId,
  defaultName = "",
}: NutritionSaveTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("O nome do modelo é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.set("planPublicId", planPublicId);
      if (versionPublicId) {
        formData.set("versionPublicId", versionPublicId);
      }
      formData.set("name", name.trim());
      if (description.trim()) {
        formData.set("description", description.trim());
      }

      const res = await createTemplateFromPlanAction(consultancySlug, formData);
      if (!res.success) {
        setErrorMessage(res.error || "Erro ao salvar modelo.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Modelo salvo com sucesso.");
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch {
      setErrorMessage("Falha de conexão ao salvar modelo.");
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
              Salvar como modelo
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Crie um modelo reutilizável com a estrutura nutricional deste plano para aplicar futuramente.
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
            <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="template-name" className="text-xs font-semibold text-[var(--text-primary)]">
              Nome do modelo <span className="text-red-500">*</span>
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hipertrofia 3000 kcal, Low Carb 1800 kcal..."
              maxLength={255}
              disabled={isSubmitting || Boolean(successMessage)}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="template-desc" className="text-xs font-semibold text-[var(--text-primary)]">
              Descrição (opcional)
            </label>
            <textarea
              id="template-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Indicações clínicas, perfil calórico, distribuição de macronutrientes..."
              maxLength={2000}
              disabled={isSubmitting || Boolean(successMessage)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors resize-none disabled:opacity-50"
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <p className="font-semibold text-[var(--text-primary)]">Nota de privacidade:</p>
            <p>
              Apenas a estrutura nutricional (refeições, alimentos, quantidades e substituições) é copiada.
              Nenhum dado pessoal, histórico clínico ou prescrição ativa do paciente é incluído no modelo.
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
              disabled={isSubmitting || Boolean(successMessage) || !name.trim()}
              className="font-bold min-h-[40px] shadow-sm"
            >
              {isSubmitting ? "Salvando..." : "Salvar Modelo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
