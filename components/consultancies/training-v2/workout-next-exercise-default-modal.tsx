"use client";

import React, { useState } from "react";

function Sliders({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-6 4v4" />
    </svg>
  );
}

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RotateCcw({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
    </svg>
  );
}

export interface WorkoutNextExerciseDefault {
  sets: number;
  repsType: "FIXED" | "RANGE";
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
}

interface WorkoutNextExerciseDefaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDefault: WorkoutNextExerciseDefault | null;
  onSave: (val: WorkoutNextExerciseDefault | null) => void;
}

function DefaultExerciseModalInner({
  currentDefault,
  onClose,
  onSave,
}: {
  currentDefault: WorkoutNextExerciseDefault | null;
  onClose: () => void;
  onSave: (val: WorkoutNextExerciseDefault | null) => void;
}) {
  const [sets, setSets] = useState(currentDefault?.sets || 4);
  const [repsType, setRepsType] = useState<"FIXED" | "RANGE">(currentDefault?.repsType || "RANGE");
  const [reps, setReps] = useState(currentDefault?.reps || 10);
  const [repsMin, setRepsMin] = useState(currentDefault?.repsMin || 8);
  const [repsMax, setRepsMax] = useState(currentDefault?.repsMax || 12);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSets = Math.max(1, Math.min(15, sets || 4));
    let cleanReps: number | null = null;
    let cleanRepsMin: number | null = null;
    let cleanRepsMax: number | null = null;

    if (repsType === "FIXED") {
      cleanReps = Math.max(1, reps || 10);
    } else {
      cleanRepsMin = Math.max(1, repsMin || 8);
      cleanRepsMax = Math.max(cleanRepsMin, repsMax || 12);
    }

    onSave({
      sets: cleanSets,
      repsType,
      reps: cleanReps,
      repsMin: cleanRepsMin,
      repsMax: cleanRepsMax,
    });
    onClose();
  };

  const handleDeactivate = () => {
    onSave(null);
    onClose();
  };

  const previewText =
    repsType === "RANGE"
      ? `Os próximos exercícios serão adicionados com ${sets} séries de ${repsMin}–${repsMax} repetições.`
      : `Os próximos exercícios serão adicionados com ${sets} séries de ${reps} repetições.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="default-exercise-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface-primary)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="default-exercise-modal-title" className="text-sm font-bold text-[var(--text-primary)]">
                Padrão dos próximos exercícios
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Configurar séries e repetições pré-definidas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleApply} className="p-4 space-y-4">
          {/* Sets Field */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Número de séries:
            </label>
            <div className="flex items-center gap-2">
              {[3, 4, 5].map((sVal) => (
                <button
                  key={sVal}
                  type="button"
                  onClick={() => setSets(sVal)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    sets === sVal
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {sVal} séries
                </button>
              ))}
              <div className="w-20">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs text-center font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                  placeholder="Outro"
                />
              </div>
            </div>
          </div>

          {/* Reps Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Tipo de repetições:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRepsType("RANGE")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                  repsType === "RANGE"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Intervalo (ex: 8–12)
              </button>
              <button
                type="button"
                onClick={() => setRepsType("FIXED")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                  repsType === "FIXED"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Fixas (ex: 10 reps)
              </button>
            </div>
          </div>

          {/* Reps Inputs */}
          {repsType === "RANGE" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Mínimo de repetições:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={repsMin}
                  onChange={(e) => setRepsMin(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Máximo de repetições:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={repsMax}
                  onChange={(e) => setRepsMax(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Repetições:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Live Preview Callout */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs leading-snug">
              {previewText}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
            {currentDefault ? (
              <button
                type="button"
                onClick={handleDeactivate}
                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Desativar padrão</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {currentDefault ? "Salvar padrão" : "Ativar padrão"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkoutNextExerciseDefaultModal({
  isOpen,
  onClose,
  currentDefault,
  onSave,
}: WorkoutNextExerciseDefaultModalProps) {
  if (!isOpen) return null;
  return (
    <DefaultExerciseModalInner
      currentDefault={currentDefault}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
