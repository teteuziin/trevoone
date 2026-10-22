"use client";

import React from "react";
import type { PlanUpdatePolicy } from "@/lib/nutrition-v2/auto-publish-types";

export type AutosaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "saving_draft"
  | "draft_saved"
  | "updating_patient"
  | "patient_updated"
  | "auto_update_paused"
  | "auto_update_error";

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  policy?: PlanUpdatePolicy;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function AutosaveIndicator({
  status,
  policy = "MANUAL",
  isPaused = false,
  onPauseToggle,
  errorMessage,
  onRetry,
  className = "",
}: AutosaveIndicatorProps) {
  if (status === "saving" || status === "saving_draft") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-[var(--brand)] font-medium ${className}`}
        aria-live="polite"
        data-testid="autosave-saving"
      >
        <svg
          className="w-3.5 h-3.5 animate-spin text-[var(--brand)] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span>{policy === "AUTO_PUBLISH" ? "Salvando rascunho..." : "Salvando..."}</span>
      </div>
    );
  }

  if (status === "updating_patient") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-medium ${className}`}
        aria-live="polite"
        data-testid="autosave-updating-patient"
      >
        <svg
          className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <span>Atualizando plano do paciente...</span>
      </div>
    );
  }

  if (status === "patient_updated") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium ${className}`}
        aria-live="polite"
        data-testid="autosave-patient-updated"
      >
        <svg
          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>Plano atualizado</span>
      </div>
    );
  }

  if (
    status === "auto_update_paused" ||
    (policy === "AUTO_PUBLISH" && isPaused && status !== "error" && status !== "auto_update_error")
  ) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium ${className}`}
        aria-live="polite"
        data-testid="autosave-paused"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
        <span>Atualização pausada</span>
        {onPauseToggle && (
          <button
            type="button"
            onClick={onPauseToggle}
            className="ml-1 text-[11px] underline hover:no-underline font-semibold text-amber-700 dark:text-amber-300"
          >
            Retomar
          </button>
        )}
      </div>
    );
  }

  if (status === "auto_update_error") {
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium flex-wrap ${className}`}
        aria-live="assertive"
        data-testid="autosave-auto-update-error"
        title={errorMessage || "Paciente continua com a versão anterior"}
      >
        <span className="inline-flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-amber-600 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Erro ao atualizar — paciente na versão anterior</span>
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-bold underline hover:no-underline text-amber-800 dark:text-amber-200 cursor-pointer min-h-[32px] inline-flex items-center"
            data-testid="autosave-retry-btn"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (status === "saved" || status === "draft_saved") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium ${className}`}
        aria-live="polite"
        data-testid="autosave-saved"
      >
        <svg
          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>Salvo</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`inline-flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium flex-wrap ${className}`}
        aria-live="assertive"
        data-testid="autosave-error"
        title={errorMessage || "Não foi possível salvar alterações"}
      >
        <span className="inline-flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-red-600 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>Não foi possível salvar</span>
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="font-bold underline hover:no-underline text-red-700 dark:text-red-300 cursor-pointer min-h-[32px] inline-flex items-center"
            data-testid="autosave-retry-btn"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  // Default / idle state
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] ${className}`}
      data-testid="autosave-idle"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" aria-hidden="true" />
      <span className="font-medium">Salvo</span>
    </div>
  );
}
