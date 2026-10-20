"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { WorkoutBlockItemDto } from "@/lib/training-v2/types";

const emptySubscribe = () => () => {};

function PencilIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function RotateCcwIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LoaderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface WorkoutRenameExerciseModalProps {
  isOpen: boolean;
  item: WorkoutBlockItemDto | null;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
}

export function WorkoutRenameExerciseModal({
  isOpen,
  item,
  onClose,
  onSave,
}: WorkoutRenameExerciseModalProps) {
  const [prevItem, setPrevItem] = useState<WorkoutBlockItemDto | null>(item);
  const [name, setName] = useState(item?.exerciseNameSnapshot || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (item !== prevItem) {
    setPrevItem(item);
    setName(item?.exerciseNameSnapshot || "");
    setError(null);
    setIsSaving(false);
  }

  // Auto focus and select input text when opened
  useEffect(() => {
    if (isOpen && item) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    }
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !mounted || !item) return null;

  const originalName = item.originalExerciseName?.trim() || null;
  const isCustomFromScratch = Boolean(item.isCustomExercise && !originalName);
  const showRestoreOriginal =
    Boolean(originalName) &&
    !isCustomFromScratch &&
    name.trim().toLowerCase() !== originalName?.toLowerCase();

  const handleApply = async () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError("O nome do exercício deve ter pelo menos 2 caracteres.");
      return;
    }
    if (cleanName.length > 255) {
      setError("O nome do exercício não pode exceder 255 caracteres.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(cleanName);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao renomear exercício.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-exercise-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PencilIcon className="w-4 h-4" />
            </div>
            <h2
              id="rename-exercise-modal-title"
              className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate"
            >
              Renomear exercício na ficha
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="exercise-display-name-input"
              className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Nome na ficha
            </label>
            <input
              ref={inputRef}
              id="exercise-display-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleInputKeyDown}
              disabled={isSaving}
              maxLength={255}
              placeholder="Ex: Agachamento guiado"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] text-sm font-semibold placeholder:text-[var(--text-tertiary)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              Este nome aparece para o aluno. O vídeo de execução permanece vinculado.
            </p>
          </div>

          {/* Option to restore original library name */}
          {showRestoreOriginal && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (originalName) {
                    setName(originalName);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }
                }}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer transition-colors"
              >
                <RotateCcwIcon className="w-3.5 h-3.5" />
                <span>Usar nome original ({originalName})</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving || !name.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <LoaderIcon className="w-3.5 h-3.5" />
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Aplicar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
