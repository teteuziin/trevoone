"use client";

import React, { useState } from "react";
import type { WarmupMethodConfig } from "@/lib/training-v2/types";

type WarmupEditorProps = {
  itemPublicId: string;
  methodConfig: WarmupMethodConfig | null;
  onSave: (payload: { config: WarmupMethodConfig }) => Promise<void>;
  disabled?: boolean;
};

const FOCUS_PRESETS = [
  "Mobilidade Articular",
  "Ativação Muscular",
  "Aquecimento Geral",
  "Específico de Padrão Motor",
];

const JOINT_PRESETS = [
  "Ombros / Cintura Escapular",
  "Quadril / Pélvis",
  "Coluna Torácica",
  "Tornozelos",
  "Corpo Inteiro",
];

function FlameIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
      />
    </svg>
  );
}

function TargetIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SaveIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoaderIcon({ className = "w-3.5 h-3.5 animate-spin" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function WarmupEditor({
  methodConfig,
  onSave,
  disabled = false,
}: WarmupEditorProps) {
  const [focus, setFocus] = useState<string>(methodConfig?.focus || "");
  const [targetJoint, setTargetJoint] = useState<string>(methodConfig?.targetJoint || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      const cleanFocus = focus.trim() || null;
      const cleanTargetJoint = targetJoint.trim() || null;

      await onSave({
        config: {
          focus: cleanFocus,
          targetJoint: cleanTargetJoint,
        },
      });

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao salvar configuração de aquecimento.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasConfig = Boolean(methodConfig?.focus || methodConfig?.targetJoint);

  return (
    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FlameIcon className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
              Configuração de Aquecimento
              {hasConfig && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Ativo
                </span>
              )}
            </h5>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Defina o foco preparatório e a articulação ou região-alvo deste exercício.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={disabled || isSaving}
          className="self-start sm:self-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors disabled:opacity-50 min-h-[36px]"
        >
          {isSaving ? (
            <>
              <LoaderIcon className="w-3.5 h-3.5" />
              <span>Salvando...</span>
            </>
          ) : successMsg ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-white" />
              <span>Salvo!</span>
            </>
          ) : (
            <>
              <SaveIcon className="w-3.5 h-3.5" />
              <span>Salvar Aquecimento</span>
            </>
          )}
        </button>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Focus Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Foco do Aquecimento
          </label>
          <input
            type="text"
            value={focus}
            maxLength={100}
            onChange={(e) => setFocus(e.target.value)}
            disabled={disabled || isSaving}
            placeholder="Ex: Mobilidade Articular, Ativação..."
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface)] border border-[var(--border-default)] text-[var(--foreground)] focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />

          {/* Presets */}
          <div className="flex flex-wrap gap-1 pt-1">
            {FOCUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFocus(preset)}
                disabled={disabled || isSaving}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                  focus === preset
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    : "bg-[var(--surface-subtle)] text-[var(--foreground-muted)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Target Joint Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--foreground)] flex items-center gap-1">
            <TargetIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Articulação / Região-Alvo
          </label>
          <input
            type="text"
            value={targetJoint}
            maxLength={100}
            onChange={(e) => setTargetJoint(e.target.value)}
            disabled={disabled || isSaving}
            placeholder="Ex: Ombros, Quadril, Tornozelos..."
            className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--surface)] border border-[var(--border-default)] text-[var(--foreground)] focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />

          {/* Presets */}
          <div className="flex flex-wrap gap-1 pt-1">
            {JOINT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTargetJoint(preset)}
                disabled={disabled || isSaving}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                  targetJoint === preset
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    : "bg-[var(--surface-subtle)] text-[var(--foreground-muted)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error & Feedback Messages */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
          ✓ Configuração de aquecimento salva com sucesso!
        </div>
      )}
    </div>
  );
}
