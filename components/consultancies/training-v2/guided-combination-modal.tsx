"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import type {
  WorkoutBlockItemDto,
  WorkoutCombinationType,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import {
  getCombinationTheme,
  STUDIO_COMBINATION_TYPE_LABELS,
} from "./training-studio-tokens";

function getItemPrescriptionSummary(item: WorkoutBlockItemDto) {
  const sets = item.sets || [];
  const seriesCount = sets.length > 0 ? sets.length : 3;
  const firstSet = sets[0];
  const reps = firstSet?.targetReps ?? 10;
  const repsMax = firstSet?.targetRepsMax ?? null;
  const repsText = repsMax != null ? `${reps}-${repsMax} reps` : `${reps} reps`;
  const loadKg = firstSet?.targetLoadKg ?? null;
  const restSeconds = firstSet?.targetRestSeconds ?? 60;
  return {
    seriesCount,
    repsText,
    loadKg,
    restSeconds,
  };
}

type GuidedCombinationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: WorkoutCombinationType;
  categoryPublicId?: string;
  _categoryPublicId?: string;
  initialItem: WorkoutBlockItemDto;
  categoryItems: WorkoutBlockItemDto[];
  consultancySlug: string;
  onConfirmCombination: (
    type: WorkoutCombinationType,
    itemPublicIds: string[],
    rounds: number,
    restSeconds: number
  ) => Promise<void>;
  onAddAndCombineItem?: (exercisePublicId: string) => Promise<WorkoutBlockItemDto | null>;
};

export function GuidedCombinationModal({
  isOpen,
  onClose,
  type,
  categoryPublicId,
  _categoryPublicId,
  initialItem,
  categoryItems,
  consultancySlug,
  onConfirmCombination,
  onAddAndCombineItem,
}: GuidedCombinationModalProps) {
  void categoryPublicId;
  void _categoryPublicId;
  const theme = getCombinationTheme(type);
  const typeLabel = STUDIO_COMBINATION_TYPE_LABELS[type] || "Combinação";

  // Required member count
  const requiredCount = type === "BI_SET" ? 2 : type === "TRI_SET" ? 3 : 4;

  const initialSummary = initialItem ? getItemPrescriptionSummary(initialItem) : null;

  // Selected items: item 0 is always initialItem
  const [selectedItems, setSelectedItems] = useState<
    Array<{ publicId: string; name: string; prescription?: string }>
  >(() => {
    if (!initialItem || !initialSummary) return [];
    return [
      {
        publicId: initialItem.publicId,
        name: initialItem.exerciseNameSnapshot,
        prescription: `${initialSummary.seriesCount} séries · ${initialSummary.repsText}${initialSummary.loadKg != null ? ` · ${initialSummary.loadKg}kg` : ""}`,
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<"existing" | "library">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryExercises, setLibraryExercises] = useState<ExerciseItemDto[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const [rounds, setRounds] = useState(() => initialSummary?.seriesCount || 3);
  const [restSeconds, setRestSeconds] = useState(() => initialSummary?.restSeconds || 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Candidates already in the same category that are not currently in combination and not already picked
  const availableExisting = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((i) => i.publicId));
    return (categoryItems || []).filter(
      (it) => it.publicId !== initialItem?.publicId && !selectedIds.has(it.publicId)
    );
  }, [categoryItems, initialItem, selectedItems]);

  // Search library
  useEffect(() => {
    if (activeTab !== "library" || !isOpen) return;

    let active = true;
    startSearchTransition(async () => {
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          source: "TODOS",
          query: searchQuery.trim() || undefined,
        });
        if (active && res.ok && res.data) {
          setLibraryExercises(res.data);
        } else if (active) {
          setLibraryExercises([]);
        }
      } catch {
        if (active) setLibraryExercises([]);
      }
    });

    return () => {
      active = false;
    };
  }, [activeTab, searchQuery, consultancySlug, isOpen]);

  if (!isOpen) return null;

  const currentStep = selectedItems.length;
  const isPreviewStep = selectedItems.length >= requiredCount;
  const currentLetter = String.fromCharCode(65 + selectedItems.length); // Next letter to pick (B, C, etc.)

  function handleSelectExisting(item: WorkoutBlockItemDto) {
    const summary = getItemPrescriptionSummary(item);
    setSelectedItems((prev) => [
      ...prev,
      {
        publicId: item.publicId,
        name: item.exerciseNameSnapshot,
        prescription: `${summary.seriesCount} séries · ${summary.repsText}${summary.loadKg != null ? ` · ${summary.loadKg}kg` : ""}`,
      },
    ]);
  }

  async function handleSelectFromLibrary(ex: ExerciseItemDto) {
    if (!onAddAndCombineItem) {
      setErrorMessage("Adição pela biblioteca não disponível neste contexto.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const added = await onAddAndCombineItem(ex.publicId);
      if (added) {
        setSelectedItems((prev) => [
          ...prev,
          {
            publicId: added.publicId,
            name: added.exerciseNameSnapshot,
            prescription: "10 repetições",
          },
        ]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao adicionar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRemoveItem(idx: number) {
    if (idx === 0) return; // Cannot remove member A
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    if (selectedItems.length < requiredCount) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const itemIds = selectedItems.map((i) => i.publicId);
      await onConfirmCombination(type, itemIds, rounds, restSeconds);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao criar combinação de exercícios."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-combination-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b border-zinc-200 dark:border-white/[0.08] ${theme.headerBgClass} flex items-center justify-between gap-3 shrink-0`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider ${theme.badgeClass}`}>
                {typeLabel}
              </span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {isPreviewStep ? "Prévia Final" : `Passo ${currentStep} de ${requiredCount}`}
              </span>
            </div>
            <h3 id="guided-combination-title" className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white">
              {isPreviewStep ? `Confirmar ${typeLabel}` : `Criar ${typeLabel} com ${initialItem.exerciseNameSnapshot}`}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Passo 1 de {requiredCount}: {initialItem.exerciseNameSnapshot} selecionado como 1º exercício. Escolha o próximo membro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de combinação"
            className="w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Selected Members Summary (A, B, C...) */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-white/[0.06] space-y-2 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Membros da Combinação:
          </div>
          <div className="space-y-1.5">
            {selectedItems.map((it, idx) => (
              <div
                key={it.publicId}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className={`w-7 h-7 rounded-lg ${theme.letterAvatarClass} text-xs flex items-center justify-center shrink-0`}>
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {it.name}
                    </p>
                    {it.prescription && (
                      <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {it.prescription}
                      </p>
                    )}
                  </div>
                </div>
                {idx > 0 && !isSubmitting && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    aria-label={`Remover exercício ${it.name}`}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}

            {!isPreviewStep && (
              <div className="flex items-center gap-2.5 p-2 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 bg-transparent text-zinc-500 dark:text-zinc-400">
                <span className="w-7 h-7 rounded-lg border border-dashed border-zinc-400 dark:border-zinc-600 text-xs flex items-center justify-center shrink-0 font-bold">
                  {currentLetter}.
                </span>
                <span className="text-xs font-semibold">
                  Selecione o exercício {currentLetter} abaixo...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {!isPreviewStep ? (
            /* Picker Step */
            <div className="space-y-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveTab("existing")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "existing"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Exercícios neste treino ({availableExisting.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("library")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "library"
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Buscar na biblioteca
                </button>
              </div>

              {activeTab === "existing" ? (
                /* Existing Items in Category */
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Toque em um exercício deste treino para adicionar como membro {currentLetter}:
                  </p>
                  {availableExisting.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                      <p className="font-semibold">Nenhum outro exercício solto neste treino.</p>
                      <p>Use a aba &quot;Buscar na Biblioteca&quot; acima para adicionar um novo.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {availableExisting.map((ex) => {
                        const sum = getItemPrescriptionSummary(ex);
                        return (
                          <button
                            key={ex.publicId}
                            type="button"
                            onClick={() => handleSelectExisting(ex)}
                            className="w-full p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] hover:border-blue-500 bg-white dark:bg-zinc-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                                {ex.exerciseNameSnapshot}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                                {sum.seriesCount} séries · {sum.repsText}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                              + Escolher {currentLetter}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Library Search */
                <div className="space-y-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite para buscar exercício..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-zinc-300 dark:border-white/20 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <p className="py-6 text-center text-xs text-zinc-500">Buscando na biblioteca...</p>
                    ) : libraryExercises.length === 0 ? (
                      <p className="py-6 text-center text-xs text-zinc-500">
                        {searchQuery ? "Nenhum exercício encontrado." : "Digite o nome de um exercício para pesquisar."}
                      </p>
                    ) : (
                      libraryExercises.map((lex) => (
                        <button
                          key={lex.publicId}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSelectFromLibrary(lex)}
                          className="w-full p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] hover:border-blue-500 bg-white dark:bg-zinc-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {lex.name}
                            </h4>
                            <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                              {lex.muscleGroupPrimary || "Geral"} {lex.equipment ? `· ${lex.equipment}` : ""}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            + Adicionar {currentLetter}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Preview Step: Confirm configuration */
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Prévia da Combinação
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-white/[0.08] space-y-3">
                {/* Steppers for rounds & rest */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                      Voltas / Rodadas da combinação
                    </label>
                    <span className="text-[11px] text-zinc-500">Executar sequência A → B</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRounds((r) => Math.max(1, r - 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-sm text-zinc-900 dark:text-white">
                      {rounds}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRounds((r) => Math.min(10, r + 1))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                      Descanso após cada volta
                    </label>
                    <span className="text-[11px] text-zinc-500">Sem pausa entre os membros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRestSeconds((s) => Math.max(0, s - 15))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-black text-sm text-zinc-900 dark:text-white">
                      {restSeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() => setRestSeconds((s) => Math.min(600, s + 15))}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>

          {isPreviewStep ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className={`py-2.5 px-6 rounded-2xl ${theme.selectorActiveClass} font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer`}
            >
              {isSubmitting ? "Criando..." : `Confirmar e Criar ${typeLabel}`}
            </button>
          ) : (
            <span className="text-xs font-semibold text-zinc-500">
              Passo {currentStep} de {requiredCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
