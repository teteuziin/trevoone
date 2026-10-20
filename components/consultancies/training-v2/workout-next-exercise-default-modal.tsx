"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

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

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* 100% Solid Opaque Dialog Surface - No Glassmorphism, No Transparency */}
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header - Solid Background */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="default-exercise-modal-title"
                className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate"
              >
                Padrão dos próximos exercícios
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                Configurar séries e repetições pré-definidas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form - Solid Background, 16px Spacing Between Groups */}
        <form onSubmit={handleApply} className="p-4 sm:p-5 space-y-4 bg-white dark:bg-zinc-900">
          {/* Sets Field & Shortcuts */}
          <div>
            <label
              htmlFor="default-sets-input"
              className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Número de séries:
            </label>
            <div className="flex items-center gap-2">
              {[3, 4, 5].map((sVal) => {
                const isActive = sets === sVal;
                return (
                  <button
                    key={sVal}
                    type="button"
                    onClick={() => setSets(sVal)}
                    aria-pressed={isActive}
                    className={`flex-1 min-h-[44px] text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-semibold"
                    }`}
                  >
                    {sVal} séries
                  </button>
                );
              })}
              <div className="w-24">
                <input
                  id="default-sets-input"
                  type="number"
                  min="1"
                  max="15"
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 1)}
                  className="w-full min-h-[44px] px-2.5 text-base sm:text-sm text-center font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  placeholder="Outro"
                  aria-label="Número de séries personalizado"
                />
              </div>
            </div>
          </div>

          {/* Reps Type Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tipo de repetições:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRepsType("RANGE")}
                aria-pressed={repsType === "RANGE"}
                className={`min-h-[44px] px-3 text-xs sm:text-sm font-bold rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  repsType === "RANGE"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-semibold"
                }`}
              >
                {repsType === "RANGE" && <Check className="w-4 h-4 text-white shrink-0" />}
                <span>Intervalo (ex: 8–12)</span>
              </button>
              <button
                type="button"
                onClick={() => setRepsType("FIXED")}
                aria-pressed={repsType === "FIXED"}
                className={`min-h-[44px] px-3 text-xs sm:text-sm font-bold rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  repsType === "FIXED"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-semibold"
                }`}
              >
                {repsType === "FIXED" && <Check className="w-4 h-4 text-white shrink-0" />}
                <span>Fixas (ex: 10 reps)</span>
              </button>
            </div>
          </div>

          {/* Reps Inputs */}
          {repsType === "RANGE" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="default-reps-min-input"
                  className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Mínimo de repetições:
                </label>
                <input
                  id="default-reps-min-input"
                  type="number"
                  min="1"
                  max="100"
                  value={repsMin}
                  onChange={(e) => setRepsMin(parseInt(e.target.value, 10) || 1)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="default-reps-max-input"
                  className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Máximo de repetições:
                </label>
                <input
                  id="default-reps-max-input"
                  type="number"
                  min="1"
                  max="100"
                  value={repsMax}
                  onChange={(e) => setRepsMax(parseInt(e.target.value, 10) || 1)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="default-reps-input"
                className="block text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Repetições:
              </label>
              <input
                id="default-reps-input"
                type="number"
                min="1"
                max="100"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value, 10) || 1)}
                className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>
          )}

          {/* Live Preview Callout - Solid Discreet Background, High Contrast Text */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold leading-relaxed">
              {previewText}
            </span>
          </div>

          {/* Modal Actions - Solid Footer */}
          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            {currentDefault ? (
              <button
                type="button"
                onClick={handleDeactivate}
                className="min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Desativar padrão</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
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
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <DefaultExerciseModalInner
      currentDefault={currentDefault}
      onClose={onClose}
      onSave={onSave}
    />,
    document.body
  );
}
