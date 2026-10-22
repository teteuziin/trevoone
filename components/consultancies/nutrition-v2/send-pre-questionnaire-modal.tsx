"use client";

import React, { useState, useTransition } from "react";
import {
  type PreQuestionnaireCategory,
  PRE_QUESTIONNAIRE_CATEGORY_LABELS,
} from "@/lib/nutrition-v2/pre-questionnaire-types";
import { getQuestionsCatalogForStudent } from "@/lib/nutrition-v2/pre-questionnaire-catalog";
import { sendPreQuestionnaireAction } from "@/app/consultoria/[slug]/planos-v2/pre-questionnaire-actions";

interface SendPreQuestionnaireModalProps {
  slug: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  biologicalSex?: string | null;
  consultationOptions?: { publicId: string; dateFormatted: string; label: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendPreQuestionnaireModal({
  slug,
  studentMembershipPublicId,
  studentName,
  studentEmail,
  biologicalSex,
  consultationOptions = [],
  isOpen,
  onClose,
  onSuccess,
}: SendPreQuestionnaireModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Load catalog based on student biological sex
  const catalog = React.useMemo(() => {
    return getQuestionsCatalogForStudent(biologicalSex);
  }, [biologicalSex]);

  // Selected questions map & required map
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(catalog.map((q) => q.id));
  });

  const [requiredIds, setRequiredIds] = useState<Set<string>>(() => {
    return new Set(catalog.filter((q) => q.required).map((q) => q.id));
  });

  const [title, setTitle] = useState<string>("Pré-Questionário Nutricional");
  const [instructions, setInstructions] = useState<string>(
    "Por favor, responda com atenção às perguntas abaixo antes da nossa consulta. Suas respostas ajudarão a montar seu plano alimentar com precisão."
  );
  const [selectedConsultationPublicId, setSelectedConsultationPublicId] = useState<string>("");

  if (!isOpen) return null;

  const toggleQuestionSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleQuestionRequired = (id: string) => {
    setRequiredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(catalog.map((q) => q.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Group questions by category
  const categories: PreQuestionnaireCategory[] = [
    "OBJETIVO",
    "HISTORICO_MEDICO",
    "MEDICAMENTOS_SUPLEMENTOS",
    "HABITOS_ROTINA",
    "PREFERENCIAS_ALIMENTARES",
    "SAUDE_FEMININA",
  ];

  const handleSend = () => {
    setError(null);
    if (selectedIds.size === 0) {
      setError("Selecione pelo menos uma pergunta para o questionário.");
      return;
    }

    startTransition(async () => {
      const res = await sendPreQuestionnaireAction(slug, {
        studentMembershipPublicId,
        consultationPublicId: selectedConsultationPublicId || null,
        title,
        instructions,
        selectedQuestionIds: Array.from(selectedIds),
        requiredQuestionIds: Array.from(requiredIds),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Erro ao enviar pré-questionário.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-pre-quest-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--surface-subtle)]">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Consulta Nutricional • Etapa 10
            </span>
            <h2 id="send-pre-quest-title" className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
              Enviar Pré-Questionário
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[40px] min-w-[40px]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Destinatário e Vínculo */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
              Destinatário &amp; Atendimento
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-[var(--text-tertiary)] block">Paciente</span>
                <strong className="text-sm font-bold text-[var(--text-primary)] block truncate">
                  {studentName}
                </strong>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                  {studentEmail}
                </span>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-tertiary)] block font-semibold mb-1">
                  Vincular a uma consulta (opcional):
                </label>
                <select
                  value={selectedConsultationPublicId}
                  onChange={(e) => setSelectedConsultationPublicId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 min-h-[40px]"
                >
                  <option value="">Sem consulta específica (Geral)</option>
                  {consultationOptions.map((c) => (
                    <option key={c.publicId} value={c.publicId}>
                      {c.dateFormatted} — {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Título & Instruções */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                Título do questionário
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                Orientações ao paciente
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 3. Seleção de Perguntas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Perguntas Selecionadas ({selectedIds.size} de {catalog.length})
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Personalize quais informações serão solicitadas ao paciente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Marcar todas
                </button>
                <span className="text-zinc-400">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[11px] font-bold text-[var(--text-tertiary)] hover:underline cursor-pointer"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            {/* Questions by category */}
            <div className="space-y-4">
              {categories.map((cat) => {
                const questionsInCat = catalog.filter((q) => q.category === cat);
                if (questionsInCat.length === 0) return null;

                const selectedInCat = questionsInCat.filter((q) => selectedIds.has(q.id)).length;

                return (
                  <div key={cat} className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {PRE_QUESTIONNAIRE_CATEGORY_LABELS[cat]}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)]">
                        {selectedInCat} de {questionsInCat.length} selecionadas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {questionsInCat.map((q) => {
                        const isSelected = selectedIds.has(q.id);
                        const isRequired = requiredIds.has(q.id);

                        return (
                          <div
                            key={q.id}
                            className={`p-2.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                              isSelected
                                ? "bg-[var(--surface)] border-emerald-500/30"
                                : "bg-[var(--surface)]/50 border-[var(--border-subtle)] opacity-60"
                            }`}
                          >
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleQuestionSelected(q.id)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-xs font-bold text-[var(--text-primary)] block leading-snug">
                                  {q.title}
                                </span>
                                {q.description && (
                                  <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1">
                                    {q.description}
                                  </p>
                                )}
                              </div>
                            </label>

                            {isSelected && (
                              <button
                                type="button"
                                onClick={() => toggleQuestionRequired(q.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                                  isRequired
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]"
                                }`}
                              >
                                {isRequired ? "Obrigatória" : "Opcional"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[44px]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || selectedIds.size === 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer inline-flex items-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Enviar Pré-Questionário ao Paciente</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
