"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  type NutritionBuilderPreferences,
  DEFAULT_NUTRITION_BUILDER_PREFERENCES,
  getPresetFromPreferences,
} from "@/lib/nutrition-v2/builder-preferences-types";
import { saveNutritionBuilderPreferencesAction } from "@/app/consultoria/[slug]/planos-v2/actions";

export interface NutritionBuilderPreferencesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  preferences: NutritionBuilderPreferences;
  onSaved: (newPrefs: NutritionBuilderPreferences) => void;
}

export function NutritionBuilderPreferencesDrawer({
  isOpen,
  onClose,
  slug,
  preferences,
  onSaved,
}: NutritionBuilderPreferencesDrawerProps) {
  const [draft, setDraft] = useState<NutritionBuilderPreferences>(preferences);
  const [prevPreferences, setPrevPreferences] = useState(preferences);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Sync draft synchronously during render when reopened or external preferences change
  if (isOpen !== prevIsOpen || preferences !== prevPreferences) {
    setPrevIsOpen(isOpen);
    setPrevPreferences(preferences);
    if (isOpen) {
      setDraft(preferences);
      setErrorMessage(null);
      setShowRestoreConfirm(false);
    }
  }

  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, isSaving, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const currentPreset = getPresetFromPreferences(draft);

  const applyPreset = (preset: "COMPLETO" | "SIMPLIFICADO") => {
    setShowRestoreConfirm(false);
    setErrorMessage(null);
    if (preset === "COMPLETO") {
      setDraft({
        showStudentPreview: true,
        showVersionHistory: true,
        showTemplateActions: true,
      });
    } else {
      setDraft({
        showStudentPreview: false,
        showVersionHistory: false,
        showTemplateActions: false,
      });
    }
  };

  const handleToggle = (key: keyof NutritionBuilderPreferences) => {
    setShowRestoreConfirm(false);
    setErrorMessage(null);
    setDraft((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleConfirmRestore = () => {
    setDraft({ ...DEFAULT_NUTRITION_BUILDER_PREFERENCES });
    setShowRestoreConfirm(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await saveNutritionBuilderPreferencesAction(slug, draft);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setErrorMessage(res.error || "Não foi possível salvar as preferências. Tente novamente.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado ao salvar preferências.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" role="dialog" aria-modal="true" aria-labelledby="prefs-drawer-title">
      {/* Separate Backdrop Layer */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />

      {/* Solid Surface Drawer Panel */}
      <div className="relative w-full max-w-md bg-[var(--surface)] text-[var(--text-primary)] border-l border-[var(--border-default)] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-default)] flex items-start justify-between gap-3 bg-[var(--surface)] shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="prefs-drawer-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight">
                Preferências do painel
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentPreset === "COMPLETO"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : currentPreset === "SIMPLIFICADO"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {currentPreset === "COMPLETO"
                  ? "Completo"
                  : currentPreset === "SIMPLIFICADO"
                  ? "Simplificado"
                  : "Personalizado"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Escolha o que aparece no seu editor de planos alimentares.
            </p>
            <p className="text-[11px] text-[var(--text-muted)] italic">
              Estas preferências afetam apenas sua visualização nesta consultoria.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            aria-label="Fechar preferências do painel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-[var(--surface)]">
          {/* Presets Quick Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Configurações rápidas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("COMPLETO")}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer min-h-[44px] ${
                  currentPreset === "COMPLETO"
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] shadow-2xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>Completo</span>
                <span className="text-[10px] font-normal opacity-80">
                  Mostra todos os recursos
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("SIMPLIFICADO")}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5 cursor-pointer min-h-[44px] ${
                  currentPreset === "SIMPLIFICADO"
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)] shadow-2xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>Simplificado</span>
                <span className="text-[10px] font-normal opacity-80">
                  Foco na montagem e PDF
                </span>
              </button>
            </div>
          </div>

          {/* Individual Controls */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Controles individuais
            </label>

            {/* Toggle 1: Prévia do Aluno */}
            <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] flex items-start justify-between gap-3 transition-colors">
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--text-primary)] block">
                  Mostrar prévia do aluno
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Exibe o botão para visualizar como o paciente verá o cardápio no aplicativo móvel.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showStudentPreview}
                onClick={() => handleToggle("showStudentPreview")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)] min-h-[24px] ${
                  draft.showStudentPreview ? "bg-[var(--brand)]" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    draft.showStudentPreview ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Histórico de Versões */}
            <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] flex items-start justify-between gap-3 transition-colors">
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--text-primary)] block">
                  Mostrar histórico de versões
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Exibe o acesso às versões anteriores do plano.{" "}
                  <strong className="font-semibold text-[var(--text-primary)]">
                    Ocultar este acesso não apaga as versões anteriores.
                  </strong>
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showVersionHistory}
                onClick={() => handleToggle("showVersionHistory")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)] min-h-[24px] ${
                  draft.showVersionHistory ? "bg-[var(--brand)]" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    draft.showVersionHistory ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Ações de Modelos */}
            <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] flex items-start justify-between gap-3 transition-colors">
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-sm font-semibold text-[var(--text-primary)] block">
                  Mostrar ações de modelos
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Exibe a opção de salvar este plano alimentar como modelo reutilizável.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showTemplateActions}
                onClick={() => handleToggle("showTemplateActions")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)] min-h-[24px] ${
                  draft.showTemplateActions ? "bg-[var(--brand)]" : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    draft.showTemplateActions ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Operational Guarantees Notice */}
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-xs text-[var(--text-secondary)] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Recursos operacionais protegidos</span>
            </div>
            <p className="leading-relaxed">
              O download em PDF e a publicação de atualizações continuam sempre acessíveis para usuários autorizados, garantindo a entrega do plano alimentar.
            </p>
          </div>

          {/* Restore Default Section */}
          <div className="pt-2 border-t border-[var(--border-default)]">
            {!showRestoreConfirm ? (
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(true)}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] underline transition-colors cursor-pointer min-h-[44px] flex items-center"
              >
                Restaurar padrão
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5">
                <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                  Deseja restaurar para a configuração padrão (<strong>Completo</strong>)? As opções de prévia, histórico e modelos serão reativadas no seu rascunho.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    Confirmar restauração
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] font-semibold text-xs hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Não alterar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message if Save Fails */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-default)] flex items-center justify-end gap-2.5 bg-[var(--surface)] shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:opacity-95 text-xs sm:text-sm font-bold text-white shadow-sm transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar preferências</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
