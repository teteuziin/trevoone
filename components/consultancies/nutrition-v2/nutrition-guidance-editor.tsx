"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  type PlanStructuredGuidance,
  type PlanRecommendationItem,
  type PlanPrescriptionItem,
  createEmptyStructuredGuidance,
} from "@/lib/nutrition-v2/guidance-types";
import { AutosaveIndicator, type AutosaveStatus } from "./autosave-indicator";

export interface NutritionGuidanceEditorProps {
  initialGuidance?: PlanStructuredGuidance | null;
  initialNotes?: string | null;
  readOnly?: boolean;
  onSaveGuidance: (guidance: PlanStructuredGuidance, notes: string | null) => Promise<void>;
  autosaveStatus: AutosaveStatus;
  autosaveError?: string | null;
}

export function NutritionGuidanceEditor({
  initialGuidance,
  initialNotes = "",
  readOnly = false,
  onSaveGuidance,
  autosaveStatus,
  autosaveError,
}: NutritionGuidanceEditorProps) {
  const [activeCategory, setActiveCategory] = useState<"RECOMMENDATIONS" | "SUPPLEMENTS" | "PHYTOTHERAPEUTICS" | "INTERNAL_NOTES">("RECOMMENDATIONS");

  const [guidance, setGuidance] = useState<PlanStructuredGuidance>(() => {
    return initialGuidance || createEmptyStructuredGuidance();
  });
  const [notes, setNotes] = useState<string>(initialNotes || "");

  // Autosave debounce timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced autosave
  const triggerAutosave = useCallback(
    (newGuidance: PlanStructuredGuidance, newNotes: string) => {
      if (readOnly) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        try {
          await onSaveGuidance(newGuidance, newNotes.trim() ? newNotes.trim() : null);
        } catch {
          // Handled via parent status
        }
      }, 1000);
    },
    [readOnly, onSaveGuidance]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Update handler for guidance
  const updateGuidance = (updater: (prev: PlanStructuredGuidance) => PlanStructuredGuidance) => {
    setGuidance((prev) => {
      const next = updater(prev);
      triggerAutosave(next, notes);
      return next;
    });
  };

  // Update handler for notes
  const handleNotesChange = (val: string) => {
    setNotes(val);
    triggerAutosave(guidance, val);
  };

  // =========================================================================
  // RECOMMENDATIONS OPERATIONS
  // =========================================================================
  const handleAddRecommendation = () => {
    const newItem: PlanRecommendationItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: "",
      text: "",
      sortOrder: guidance.recommendations.length,
    };
    updateGuidance((prev) => ({
      ...prev,
      recommendations: [...prev.recommendations, newItem],
    }));
  };

  const handleUpdateRecommendation = (id: string, patch: Partial<PlanRecommendationItem>) => {
    updateGuidance((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleRemoveRecommendation = (id: string) => {
    updateGuidance((prev) => ({
      ...prev,
      recommendations: prev.recommendations.filter((item) => item.id !== id),
    }));
  };

  const handleMoveRecommendation = (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= guidance.recommendations.length) return;

    updateGuidance((prev) => {
      const list = [...prev.recommendations];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        recommendations: list.map((item, idx) => ({ ...item, sortOrder: idx })),
      };
    });
  };

  // =========================================================================
  // SUPPLEMENTS OPERATIONS
  // =========================================================================
  const handleAddSupplement = () => {
    const newItem: PlanPrescriptionItem = {
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: "",
      presentation: null,
      dosage: null,
      unit: null,
      route: null,
      frequency: null,
      duration: null,
      notes: null,
      sortOrder: guidance.supplements.length,
    };
    updateGuidance((prev) => ({
      ...prev,
      supplements: [...prev.supplements, newItem],
    }));
  };

  const handleUpdateSupplement = (id: string, patch: Partial<PlanPrescriptionItem>) => {
    updateGuidance((prev) => ({
      ...prev,
      supplements: prev.supplements.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleRemoveSupplement = (id: string) => {
    updateGuidance((prev) => ({
      ...prev,
      supplements: prev.supplements.filter((item) => item.id !== id),
    }));
  };

  const handleMoveSupplement = (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= guidance.supplements.length) return;

    updateGuidance((prev) => {
      const list = [...prev.supplements];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        supplements: list.map((item, idx) => ({ ...item, sortOrder: idx })),
      };
    });
  };

  // =========================================================================
  // PHYTOTHERAPEUTICS OPERATIONS
  // =========================================================================
  const handleAddPhytotherapeutic = () => {
    const newItem: PlanPrescriptionItem = {
      id: `fito-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: "",
      presentation: null,
      dosage: null,
      unit: null,
      route: null,
      frequency: null,
      duration: null,
      notes: null,
      sortOrder: guidance.phytotherapeutics.length,
    };
    updateGuidance((prev) => ({
      ...prev,
      phytotherapeutics: [...prev.phytotherapeutics, newItem],
    }));
  };

  const handleUpdatePhytotherapeutic = (id: string, patch: Partial<PlanPrescriptionItem>) => {
    updateGuidance((prev) => ({
      ...prev,
      phytotherapeutics: prev.phytotherapeutics.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleRemovePhytotherapeutic = (id: string) => {
    updateGuidance((prev) => ({
      ...prev,
      phytotherapeutics: prev.phytotherapeutics.filter((item) => item.id !== id),
    }));
  };

  const handleMovePhytotherapeutic = (index: number, direction: "UP" | "DOWN") => {
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= guidance.phytotherapeutics.length) return;

    updateGuidance((prev) => {
      const list = [...prev.phytotherapeutics];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        phytotherapeutics: list.map((item, idx) => ({ ...item, sortOrder: idx })),
      };
    });
  };

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6 depth-surface">
      {/* Header & Autosave */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Orientações Clínicas e Prescrição
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Organize recomendações gerais, suplementos e fitoterápicos prescritos para este plano.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutosaveIndicator status={autosaveStatus} errorMessage={autosaveError} />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] overflow-x-auto scrollbar-none flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setActiveCategory("RECOMMENDATIONS")}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeCategory === "RECOMMENDATIONS"
              ? "bg-[var(--brand)] text-white shadow-2xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <span>Recomendações</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "RECOMMENDATIONS" ? "bg-white/20 text-white" : "bg-[var(--border-default)] text-[var(--text-secondary)]"
          }`}>
            {guidance.recommendations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("SUPPLEMENTS")}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeCategory === "SUPPLEMENTS"
              ? "bg-[var(--brand)] text-white shadow-2xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <span>Suplementação</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "SUPPLEMENTS" ? "bg-white/20 text-white" : "bg-[var(--border-default)] text-[var(--text-secondary)]"
          }`}>
            {guidance.supplements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("PHYTOTHERAPEUTICS")}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeCategory === "PHYTOTHERAPEUTICS"
              ? "bg-[var(--brand)] text-white shadow-2xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <span>Fitoterápicos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            activeCategory === "PHYTOTHERAPEUTICS" ? "bg-white/20 text-white" : "bg-[var(--border-default)] text-[var(--text-secondary)]"
          }`}>
            {guidance.phytotherapeutics.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("INTERNAL_NOTES")}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] cursor-pointer flex items-center gap-1.5 shrink-0 ${
            activeCategory === "INTERNAL_NOTES"
              ? "bg-[var(--brand)] text-white shadow-2xs"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <span>Notas Internas</span>
          <span className="text-[10px] text-amber-500 font-bold">🔒</span>
        </button>
      </div>

      {/* SECTION 1: RECOMENDAÇÕES */}
      {activeCategory === "RECOMMENDATIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Recomendações e Hábitos de Vida
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Orientações sobre hidratação, sono, mastigação, rotina ou instruções específicas de alimentação.
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddRecommendation}
                className="px-3.5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-all min-h-[38px] cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Adicionar orientação</span>
              </button>
            )}
          </div>

          {guidance.recommendations.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Nenhuma recomendação cadastrada no momento.
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-sm mx-auto">
                Categorias vazias não geram blocos na visualização do paciente nem no PDF.
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAddRecommendation}
                  className="mt-2 text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  + Adicionar primeira orientação
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {guidance.recommendations.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Orientação #{idx + 1}
                    </span>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveRecommendation(idx, "UP")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center text-xs"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === guidance.recommendations.length - 1}
                          onClick={() => handleMoveRecommendation(idx, "DOWN")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center text-xs"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecommendation(item.id)}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center text-xs font-bold"
                          title="Excluir orientação"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Título da Orientação (Personalizado)
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.title || ""}
                        onChange={(e) => handleUpdateRecommendation(item.id, { title: e.target.value })}
                        placeholder="Ex: Sugestões, sucos laxantes / Hidratação / Orientações gerais"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[40px] sm:min-h-[36px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Conteúdo da Orientação ou Lista de Itens
                      </label>
                      <textarea
                        rows={4}
                        disabled={readOnly}
                        value={item.text}
                        onChange={(e) => handleUpdateRecommendation(item.id, { text: e.target.value })}
                        placeholder="Descreva as orientações ou liste opções com marcadores (ex: • Suco de mamão, ameixa e aveia)..."
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-y min-h-[90px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SUPLEMENTAÇÃO */}
      {activeCategory === "SUPPLEMENTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Suplementação Nutricional Prescrita
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Prescrição de suplementos alimentares. Apenas o nome do item é essencial; demais campos são adaptáveis.
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddSupplement}
                className="px-3.5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-all min-h-[38px] cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Novo Suplemento</span>
              </button>
            )}
          </div>

          {guidance.supplements.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Nenhum suplemento prescrito para este plano alimentar.
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-sm mx-auto">
                Não gera seções vazias no aplicativo do aluno nem na impressão em PDF.
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAddSupplement}
                  className="mt-2 text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  Prescrever primeiro suplemento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {guidance.supplements.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Suplemento #{idx + 1}
                    </span>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSupplement(idx, "UP")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === guidance.supplements.length - 1}
                          onClick={() => handleMoveSupplement(idx, "DOWN")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupplement(item.id)}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs font-bold"
                          title="Excluir suplemento"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {/* Item Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Nome do Suplemento / Item <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.name}
                        onChange={(e) => handleUpdateSupplement(item.id, { name: e.target.value })}
                        placeholder="Ex: Creatina Monoidratada 100% Pura"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[40px] sm:min-h-[36px]"
                      />
                    </div>

                    {/* Concentration & Dosage Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Apresentação / Concentração
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.presentation || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { presentation: e.target.value })}
                          placeholder="Ex: Pó, Cápsula 500mg, Sachê"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Quantidade / Dose
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.dosage || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { dosage: e.target.value })}
                          placeholder="Ex: 5 ou 1 scoop"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Unidade
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.unit || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { unit: e.target.value })}
                          placeholder="Ex: g, cápsula, dose"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>
                    </div>

                    {/* Timing, Route, Duration Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Horário / Frequência
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.frequency || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { frequency: e.target.value })}
                          placeholder="Ex: 1x ao dia, após o treino"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Via / Modo de Uso
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.route || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { route: e.target.value })}
                          placeholder="Ex: Diluído em 200ml de água"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Duração / Datas
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.duration || ""}
                          onChange={(e) => handleUpdateSupplement(item.id, { duration: e.target.value })}
                          placeholder="Ex: Uso contínuo, Por 30 dias"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>
                    </div>

                    {/* Notes / Free text */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Observações Complementares / Texto Livre
                      </label>
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        value={item.notes || ""}
                        onChange={(e) => handleUpdateSupplement(item.id, { notes: e.target.value })}
                        placeholder="Ex: Consumir preferencialmente acompanhado de uma refeição contendo carboidratos..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-y min-h-[50px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: FITOTERÁPICOS */}
      {activeCategory === "PHYTOTHERAPEUTICS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Fitoterapia e Prescrição de Botânicos
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Prescrição de fitoterápicos, extratos secos, infusões e compostos vegetais.
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddPhytotherapeutic}
                className="px-3.5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:opacity-90 shadow-2xs transition-all min-h-[38px] cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>+ Novo Fitoterápico</span>
              </button>
            )}
          </div>

          {guidance.phytotherapeutics.length === 0 ? (
            <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Nenhum fitoterápico prescrito para este plano alimentar.
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] max-w-sm mx-auto">
                Não gera seções vazias no aplicativo do aluno nem no documento em PDF.
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAddPhytotherapeutic}
                  className="mt-2 text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  Prescrever primeiro fitoterápico
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {guidance.phytotherapeutics.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Fitoterápico #{idx + 1}
                    </span>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePhytotherapeutic(idx, "UP")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === guidance.phytotherapeutics.length - 1}
                          onClick={() => handleMovePhytotherapeutic(idx, "DOWN")}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-30 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhytotherapeutic(item.id)}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center text-xs font-bold"
                          title="Excluir fitoterápico"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {/* Item Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Nome do Fitoterápico / Planta <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.name}
                        onChange={(e) => handleUpdatePhytotherapeutic(item.id, { name: e.target.value })}
                        placeholder="Ex: Extrato Seco de Withania somnifera (Ashwagandha)"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[40px] sm:min-h-[36px]"
                      />
                    </div>

                    {/* Concentration & Dosage Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Apresentação / Concentração
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.presentation || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { presentation: e.target.value })}
                          placeholder="Ex: Extrato seco 5% withanolídeos"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Quantidade / Dose
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.dosage || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { dosage: e.target.value })}
                          placeholder="Ex: 300 ou 1 cápsula"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Unidade
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.unit || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { unit: e.target.value })}
                          placeholder="Ex: mg, cápsula, gotas"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>
                    </div>

                    {/* Timing, Route, Duration Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Horário / Frequência
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.frequency || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { frequency: e.target.value })}
                          placeholder="Ex: 1x ao dia à noite, 1h antes de dormir"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Via / Modo de Uso
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.route || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { route: e.target.value })}
                          placeholder="Ex: Via oral com água morna"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Duração / Datas
                        </label>
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.duration || ""}
                          onChange={(e) => handleUpdatePhytotherapeutic(item.id, { duration: e.target.value })}
                          placeholder="Ex: Por 60 dias"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[38px] sm:min-h-[32px]"
                        />
                      </div>
                    </div>

                    {/* Notes / Free text */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Observações Complementares / Texto Livre
                      </label>
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        value={item.notes || ""}
                        onChange={(e) => handleUpdatePhytotherapeutic(item.id, { notes: e.target.value })}
                        placeholder="Ex: Suspender em caso de gravidez ou desconforto gástrico..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-base sm:text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-y min-h-[50px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: NOTAS CLÍNICAS INTERNAS (EQUIPE) */}
      {activeCategory === "INTERNAL_NOTES" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <span className="text-base shrink-0">🔒</span>
            <div className="space-y-0.5">
              <span className="font-bold block">Privacidade e Segregação Clínica</span>
              <p className="leading-relaxed opacity-90">
                Estas anotações são restritas exclusivamente aos profissionais desta consultoria. Este conteúdo <strong>NUNCA</strong> é exibido no aplicativo do paciente nem impresso no PDF da prescrição.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              Anotações Internas da Equipe Profissional
            </label>
            <textarea
              rows={6}
              disabled={readOnly}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Ex: Paciente relata boa adesão ao treino, mas tem rotina corrida às terças. Avaliar ajuste calórico no próximo retorno..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] resize-y min-h-[120px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
