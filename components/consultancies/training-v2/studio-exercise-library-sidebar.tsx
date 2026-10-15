"use client";

import { useState, useEffect, useTransition } from "react";
import type { ExerciseItemDto } from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import { ExerciseExecutionModal } from "./exercise-execution-modal";

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
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
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

const MUSCLE_FILTER_CHIPS = [
  "Todos",
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Cardio",
];

export type StudioExerciseLibrarySidebarProps = {
  consultancySlug: string;
  categories: { publicId: string; title: string }[];
  selectedCategoryPublicId: string | null;
  onSelectCategory: (categoryPublicId: string) => void;
  onAddExercise: (categoryPublicId: string, exercisePublicId: string) => Promise<void>;
  onOpenCustomModal: (categoryPublicId: string) => void;
  onClose: () => void;
};

export function StudioExerciseLibrarySidebar({
  consultancySlug,
  categories,
  selectedCategoryPublicId,
  onSelectCategory,
  onAddExercise,
  onOpenCustomModal,
  onClose,
}: StudioExerciseLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [exercises, setExercises] = useState<ExerciseItemDto[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseItemDto | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveCategoryId = selectedCategoryPublicId || categories[0]?.publicId || null;
  const currentCategory = categories.find((c) => c.publicId === effectiveCategoryId);

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      const res = await searchExercisesForPickerAction(consultancySlug, {
        source: "TODOS",
        query: searchQuery.trim() || undefined,
        muscle: selectedMuscle !== "Todos" ? selectedMuscle : undefined,
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
  }, [consultancySlug, searchQuery, selectedMuscle]);

  async function handleAdd(exercisePublicId: string) {
    if (!effectiveCategoryId) return;
    setAddingId(exercisePublicId);
    try {
      await onAddExercise(effectiveCategoryId, exercisePublicId);
      setJustAddedId(exercisePublicId);
      setTimeout(() => {
        setJustAddedId((cur) => (cur === exercisePublicId ? null : cur));
      }, 1600);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <aside
      data-testid="studio-exercise-library-sidebar"
      className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 dark:backdrop-blur-xl shadow-xl flex flex-col h-[calc(100vh-140px)] sticky top-6 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-white/[0.06] space-y-3 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/95">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              TREVO ONE STUDIO
            </span>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Biblioteca de Exercícios
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Recolher biblioteca lateral"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Recolher painel"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Target Category Selector — Crystal Clear */}
        {categories.length > 0 && (
          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Adicionando no treino:
              </span>
              <span className="text-zinc-600 dark:text-zinc-300 font-semibold truncate max-w-[140px] text-right" title={currentCategory?.title}>
                {currentCategory?.title || `${categories.length} divisões`}
              </span>
            </div>
            <select
              value={effectiveCategoryId || ""}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[34px] cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.publicId} value={c.publicId} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar exercício..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[36px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Muscle Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {MUSCLE_FILTER_CHIPS.map((chip) => {
            const isActive = selectedMuscle === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setSelectedMuscle(chip)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-emerald-600 text-white font-black shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.06]"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {isPending && exercises.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Buscando exercícios...</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="py-8 px-3 text-center space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Nenhum exercício encontrado para a busca.
            </p>
            {effectiveCategoryId && (
              <button
                type="button"
                onClick={() => onOpenCustomModal(effectiveCategoryId)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Criar personalizado</span>
              </button>
            )}
          </div>
        ) : (
          exercises.map((ex) => {
            const isAdding = addingId === ex.publicId;
            const hasVideo = !!(ex.media && ex.media.length > 0);

            return (
              <div
                key={ex.publicId}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-emerald-500/40 shadow-xs transition-all flex items-center justify-between gap-2 text-left group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                      {ex.name}
                    </span>
                    {hasVideo && (
                      <button
                        type="button"
                        onClick={() => setPreviewExercise(ex)}
                        title="Ver vídeo de execução"
                        className="text-zinc-400 hover:text-sky-500 p-0.5 shrink-0 transition-colors"
                      >
                        <VideoIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
                    <span>{ex.muscleGroupPrimary || "Geral"}</span>
                    {ex.equipment && <span>• {ex.equipment}</span>}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAdding || !effectiveCategoryId}
                  onClick={() => handleAdd(ex.publicId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 min-h-[32px] cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                    addingId === ex.publicId
                      ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-white/20"
                      : justAddedId === ex.publicId
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-in zoom-in-95 duration-150"
                      : "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 dark:bg-white/[0.05] dark:hover:bg-emerald-600 dark:text-zinc-200 dark:hover:text-white dark:border-white/[0.1]"
                  }`}
                  title="Adicionar exercício ao treino selecionado"
                >
                  {addingId === ex.publicId ? (
                    <>
                      <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Adicionando...</span>
                    </>
                  ) : justAddedId === ex.publicId ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      <span>Adicionado!</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Custom Exercise Action */}
      <div className="p-3 border-t border-zinc-200 dark:border-white/[0.06] bg-zinc-50/80 dark:bg-zinc-900/95 shrink-0">
        <button
          type="button"
          disabled={!effectiveCategoryId}
          onClick={() => effectiveCategoryId && onOpenCustomModal(effectiveCategoryId)}
          className="w-full py-2 px-3 rounded-xl border border-dashed border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>+ Criar exercício personalizado</span>
        </button>
      </div>

      {/* Exercise Video Preview Modal */}
      {previewExercise && (
        <ExerciseExecutionModal
          isOpen={true}
          onClose={() => setPreviewExercise(null)}
          exerciseName={previewExercise.name}
          exercisePublicId={previewExercise.publicId}
          pinnedMedia={previewExercise.media}
          instructions={previewExercise.instructions}
        />
      )}
    </aside>
  );
}
