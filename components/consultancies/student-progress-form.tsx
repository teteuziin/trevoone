"use client";

import React, { useState, useTransition } from "react";
import {
  recordStudentOwnProgressAction,
  recordProfessionalProgressAction,
  type ProgressActionResult,
} from "@/app/consultoria/[slug]/progresso/actions";

type Props = {
  consultancySlug: string;
  studentPublicId?: string; // If provided, this is a professional registering for a student
  onSuccess?: () => void;
};

export function StudentProgressForm({
  consultancySlug,
  studentPublicId,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Default to today's local date (YYYY-MM-DD)
  const todayIso = new Date().toISOString().split("T")[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      let result: ProgressActionResult;
      if (studentPublicId) {
        result = await recordProfessionalProgressAction(
          consultancySlug,
          studentPublicId,
          formData
        );
      } else {
        result = await recordStudentOwnProgressAction(consultancySlug, formData);
      }

      if (!result.success) {
        setError(result.error || "Erro ao registrar medição.");
      } else {
        setSuccessMessage("Medição registrada com sucesso!");
        setError(null);
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
          if (onSuccess) onSuccess();
        }, 1200);
      }
    });
  }

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setError(null);
            setSuccessMessage(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:opacity-90 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar evolução
        </button>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Nova Medição Corporal
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Preencha a data e pelo menos uma das medidas corporais abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={isPending}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar formulário"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-medium"
            >
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recorded Date */}
            <div className="space-y-1.5 max-w-xs">
              <label htmlFor="recordedOn" className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Data da medição <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="recordedOn"
                name="recordedOn"
                defaultValue={todayIso}
                required
                disabled={isPending}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>

            {/* Measurement Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {/* Peso */}
              <div className="space-y-1.5">
                <label htmlFor="weightKg" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Peso (kg)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="weightKg"
                    name="weightKg"
                    placeholder="Ex: 80,5"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* Cintura */}
              <div className="space-y-1.5">
                <label htmlFor="waistCm" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Cintura (cm)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="waistCm"
                    name="waistCm"
                    placeholder="Ex: 82,0"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              {/* Abdômen */}
              <div className="space-y-1.5">
                <label htmlFor="abdomenCm" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Abdômen (cm)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="abdomenCm"
                    name="abdomenCm"
                    placeholder="Ex: 88,5"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              {/* Quadril */}
              <div className="space-y-1.5">
                <label htmlFor="hipCm" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Quadril (cm)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="hipCm"
                    name="hipCm"
                    placeholder="Ex: 98,0"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              {/* Braço */}
              <div className="space-y-1.5">
                <label htmlFor="armCm" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Braço (cm)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="armCm"
                    name="armCm"
                    placeholder="Ex: 34,5"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              {/* Coxa */}
              <div className="space-y-1.5">
                <label htmlFor="thighCm" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Coxa (cm)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="thighCm"
                    name="thighCm"
                    placeholder="Ex: 56,0"
                    disabled={isPending}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--text-tertiary)] pointer-events-none">
                    cm
                  </span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label htmlFor="note" className="block text-xs font-semibold text-[var(--text-secondary)]">
                Observações (opcional)
              </label>
              <textarea
                id="note"
                name="note"
                rows={2}
                maxLength={500}
                placeholder="Ex: Medição realizada em jejum pela manhã."
                disabled={isPending}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                disabled={isPending}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:opacity-90 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar medição"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
