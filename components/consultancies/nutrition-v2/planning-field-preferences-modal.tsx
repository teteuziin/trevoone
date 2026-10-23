"use client";

import React, { useState } from "react";
import {
  CANONICAL_PERIMETERS,
  CANONICAL_DIAMETERS,
  type PlanningFieldPreferences,
} from "@/lib/nutrition-v2/clinical-measurements-catalog";

interface PlanningFieldPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: PlanningFieldPreferences;
  onSave: (preferences: Partial<PlanningFieldPreferences>) => Promise<void>;
}

export function PlanningFieldPreferencesModal({
  isOpen,
  onClose,
  currentPreferences,
  onSave,
}: PlanningFieldPreferencesModalProps) {
  const [prefs, setPrefs] = useState<PlanningFieldPreferences>({ ...currentPreferences });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "perimeters" | "diameters">("sections");

  if (!isOpen) return null;

  const toggleSection = (key: keyof Omit<PlanningFieldPreferences, "visiblePerimeters" | "visibleDiameters" | "preferredDiameterUnit">) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const togglePerimeter = (id: string) => {
    setPrefs((prev) => {
      const exists = prev.visiblePerimeters.includes(id);
      return {
        ...prev,
        visiblePerimeters: exists
          ? prev.visiblePerimeters.filter((item) => item !== id)
          : [...prev.visiblePerimeters, id],
      };
    });
  };

  const toggleDiameter = (id: string) => {
    setPrefs((prev) => {
      const exists = prev.visibleDiameters.includes(id);
      return {
        ...prev,
        visibleDiameters: exists
          ? prev.visibleDiameters.filter((item) => item !== id)
          : [...prev.visibleDiameters, id],
      };
    });
  };

  const handleSelectAllPerimeters = (selectAll: boolean) => {
    setPrefs((prev) => ({
      ...prev,
      visiblePerimeters: selectAll ? CANONICAL_PERIMETERS.map((p) => p.id) : [],
    }));
  };

  const handleSelectAllDiameters = (selectAll: boolean) => {
    setPrefs((prev) => ({
      ...prev,
      visibleDiameters: selectAll ? CANONICAL_DIAMETERS.map((d) => d.id) : [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(prefs);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="max-w-xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-2xl rounded-3xl">
        <div className="p-5 pb-3 border-b border-[var(--border-subtle)] flex items-start justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span>Personalizar Visualização de Planejamento</span>
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Escolha as seções e medições visíveis no seu painel. Ocultar um campo não exclui dados já cadastrados do paciente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[36px] min-w-[36px] cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-[var(--border-subtle)] px-5 bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "sections"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Seções Principais
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perimeters")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "perimeters"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Perímetros ({prefs.visiblePerimeters.length}/{CANONICAL_PERIMETERS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("diameters")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "diameters"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Diâmetros ({prefs.visibleDiameters.length}/{CANONICAL_DIAMETERS.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "sections" && (
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Exibir ou ocultar seções da aba Planejamento
              </span>

              {([
                { key: "showSummary", label: "Resumo da Avaliação", desc: "Cards de IMC, TMB, GET e Relação Cintura-Quadril" },
                { key: "showPerimeters", label: "Medidas Corporais (Perímetros)", desc: "Perímetros antropométricos bilaterais (D/E)" },
                { key: "showDiameters", label: "Diâmetros Ósseos", desc: "Diâmetros ósseos com suporte cm/mm" },
                { key: "showSkinfolds", label: "Dobras Cutâneas", desc: "Protocolos de dobras Pollock, Faulkner, Petroski" },
                { key: "showBodyComposition", label: "Composição Corporal", desc: "Modelo 2C (Massa Gorda + Massa Livre), Massa Muscular" },
                { key: "showLabExams", label: "Exames Laboratoriais", desc: "Perfil lipídico, glicêmico, ferro, vitaminas e laudos" },
                { key: "showEvolution", label: "Evolução das Medidas", desc: "Gráfico de peso e comparador temporal entre datas" },
              ] as const).map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between p-3 rounded-2xl border border-[var(--border-subtle)] hover:border-emerald-500/30 hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
                >
                  <div className="space-y-0.5 pr-3">
                    <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)] block">
                      {item.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs[item.key]}
                    onChange={() => toggleSection(item.key)}
                    className="w-5 h-5 rounded-md accent-emerald-600 cursor-pointer mt-0.5"
                  />
                </label>
              ))}

              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">
                  Unidade preferida para Diâmetros Ósseos
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrefs((prev) => ({ ...prev, preferredDiameterUnit: "cm" }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                      prefs.preferredDiameterUnit === "cm"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    Centímetros (cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefs((prev) => ({ ...prev, preferredDiameterUnit: "mm" }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                      prefs.preferredDiameterUnit === "mm"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    Milímetros (mm)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "perimeters" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  Catálogo de Perímetros ({prefs.visiblePerimeters.length} selecionados)
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAllPerimeters(true)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllPerimeters(false)}
                    className="text-[var(--text-tertiary)] font-bold hover:underline cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CANONICAL_PERIMETERS.map((p) => {
                  const isChecked = prefs.visiblePerimeters.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500/30 bg-emerald-500/5 font-semibold text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div>
                        <span>{p.name}</span>
                        {p.isBilateral && (
                          <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                            (D/E)
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePerimeter(p.id)}
                        className="w-4 h-4 rounded-md accent-emerald-600 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "diameters" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  Catálogo de Diâmetros Ósseos ({prefs.visibleDiameters.length} selecionados)
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAllDiameters(true)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllDiameters(false)}
                    className="text-[var(--text-tertiary)] font-bold hover:underline cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CANONICAL_DIAMETERS.map((d) => {
                  const isChecked = prefs.visibleDiameters.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "border-emerald-500/30 bg-emerald-500/5 font-semibold text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div>
                        <span>{d.name}</span>
                        {d.isBilateral && (
                          <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                            (D/E)
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDiameter(d.id)}
                        className="w-4 h-4 rounded-md accent-emerald-600 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-hover)] text-xs font-bold transition-all min-h-[44px] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[44px] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar Preferências"}
          </button>
        </div>
      </div>
    </div>
  );
}
