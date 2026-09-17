"use client";

import { useState, useEffect, useTransition } from "react";
import type { ExerciseItemDto } from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
function Search({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
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

function Plus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function Dumbbell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function Video({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ImageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function Loader2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  );
}

function Globe({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function Building2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 12v.01M14 16v.01M10 12v.01M10 16v.01" />
    </svg>
  );
}

function Lock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type UnifiedExercisePickerProps = {
  isOpen: boolean;
  consultancySlug: string;
  onClose: () => void;
  onSelectExercise: (exercisePublicId: string) => Promise<void>;
  onOpenCustomModal: () => void;
};

type SourceTab = "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS";

export function UnifiedExercisePicker({
  isOpen,
  consultancySlug,
  onClose,
  onSelectExercise,
  onOpenCustomModal,
}: UnifiedExercisePickerProps) {
  const [source, setSource] = useState<SourceTab>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseItemDto[]>([]);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    startTransition(async () => {
      const res = await searchExercisesForPickerAction(consultancySlug, {
        source,
        query: searchQuery.trim() || undefined,
      });

      if (active) {
        if (res.ok && res.data) {
          setExercises(res.data);
        } else {
          setExercises([]);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, source, searchQuery, consultancySlug]);

  if (!isOpen) return null;

  async function handleSelect(publicId: string) {
    try {
      setSelectingId(publicId);
      await onSelectExercise(publicId);
      onClose();
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-2xl bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-hidden">
        {/* Mobile Pull Handle */}
        <div className="pt-2.5 pb-1 sm:hidden flex justify-center bg-[var(--surface)]">
          <div className="w-12 h-1 rounded-full bg-[var(--border-strong)] opacity-60" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--border-subtle)] space-y-3.5 shrink-0 bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
                BIBLIOTECA DE EXERCÍCIOS
              </span>
              <h2 className="text-lg sm:text-xl font-heading font-black text-[var(--foreground)]">
                Adicionar Exercício
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar seleção de exercícios"
              className="p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action to create custom inline */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)]">
            <div className="text-xs text-[var(--foreground)]">
              <span className="font-bold">Exercício não listado?</span> Crie uma variação personalizada rápida.
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCustomModal();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 shadow-2xs min-h-[38px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Personalizado</span>
            </button>
          </div>

          {/* Search bar & source filters */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome do exercício..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-[var(--foreground)] min-h-[44px]"
              />
            </div>

            {/* Source tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "TODOS", label: "Todos" },
                { id: "TREVO_ONE", label: "Trevo One" },
                { id: "CONSULTORIA", label: "Minha Consultoria" },
                { id: "MEUS", label: "Só para mim" },
              ].map((tab) => {
                const isActive = source === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSource(tab.id as SourceTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] flex items-center cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] border border-[var(--border-subtle)] bg-[var(--surface)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-2.5">
          {isPending ? (
            <div className="py-16 text-center text-sm text-[var(--foreground-muted)] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Buscando exercícios...</span>
            </div>
          ) : exercises.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--foreground-muted)] space-y-2">
              <Dumbbell className="w-8 h-8 mx-auto text-[var(--foreground-muted)] opacity-60" />
              <p className="font-bold text-[var(--foreground)]">Nenhum exercício encontrado.</p>
              <p className="text-xs max-w-xs mx-auto">
                Tente refinar sua busca ou crie um exercício personalizado para esta rotina.
              </p>
            </div>
          ) : (
            exercises.map((ex) => {
              const isGlobal = ex.scope === "GLOBAL";
              const isShared = ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY";
              const isPrivate = ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY";
              const hasVideo = ex.media.some((m) => m.role === "EXECUTION_VIDEO");
              const hasImage = ex.media.some((m) => m.role === "START_IMAGE" || m.role === "ALTERNATE_IMAGE");
              const isSelecting = selectingId === ex.publicId;

              return (
                <div
                  key={ex.publicId}
                  onClick={() => handleSelect(ex.publicId)}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-emerald-500/50 hover:bg-[var(--surface-subtle)] active:scale-[0.99] transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {ex.name}
                      </h4>
                      {isGlobal && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          <Globe className="w-2.5 h-2.5" />
                          Trevo One
                        </span>
                      )}
                      {isShared && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                          <Building2 className="w-2.5 h-2.5" />
                          Consultoria
                        </span>
                      )}
                      {isPrivate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Só para mim
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                      <span>{ex.muscleGroupPrimary}</span>
                      {ex.equipment && (
                        <>
                          <span>•</span>
                          <span>{ex.equipment}</span>
                        </>
                      )}
                      {(hasVideo || hasImage) && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px] text-[var(--foreground-muted)]">
                            {hasVideo && <Video className="w-3 h-3 text-emerald-500" />}
                            {hasImage && <ImageIcon className="w-3 h-3" />}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(ex.publicId);
                    }}
                    disabled={isSelecting}
                    className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-2xs shrink-0 min-h-[44px] min-w-[90px] cursor-pointer"
                  >
                    {isSelecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs text-[var(--foreground-muted)] shrink-0">
          <span className="font-medium">
            {exercises.length} {exercises.length === 1 ? "exercício encontrado" : "exercícios encontrados"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface)] text-[var(--foreground)] font-semibold transition-colors min-h-[38px] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
