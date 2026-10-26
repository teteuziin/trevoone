"use client";

import { useState, useEffect } from "react";
import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
  WorkoutExecutionHistorySessionDto,
  WorkoutBlockItemDto,
  WorkoutBlockDto,
} from "@/lib/training-v2/types";
import { parseActiveRest } from "./workout-category-card";
import { RestTimer, type ActiveRestState } from "./rest-timer";
import { MobileBottomSheet } from "@/components/ui/mobile";
import {
  buildSequenceMediaFromCustomItem,
  buildSequenceMediaFromCombination,
} from "@/lib/training-v2/sequence-media";
import { resolveExerciseExecutionMedia } from "@/lib/training-v2/execution-media-resolver";
import { SequenceExecutionModal } from "./sequence-execution-modal";

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Clock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ListIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function ChevronLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SkipForward({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
      <line x1="19" y1="5" x2="19" y2="19" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

type StudentRuntimeFocusedViewProps = {
  workout: StudentWorkoutViewContract;
  activeSession: WorkoutExecutionSessionDto;
  onCompleteSet: (
    setPublicId: string,
    input: { actualReps?: number | null; actualLoadKg?: number | null; isSkipped?: boolean }
  ) => Promise<void>;
  loadingSetPublicId: string | null;
  activeRest: ActiveRestState | null | undefined;
  onSkipRest: () => void;
  onCompleteWorkout: (options?: { allowEarlyCompletion?: boolean }) => Promise<void>;
  isCompleting: boolean;
  completeError: string | null;
  history: WorkoutExecutionHistorySessionDto[];
  consultancySlug?: string;
  onToggleOverview?: () => void;
  isOffline?: boolean;
  activeSubstitutions?: Record<string, { performedExerciseName: string }>;
  remainingSwaps?: number;
  onOpenSwapModal?: (item: WorkoutBlockItemDto) => void;
};

export function StudentRuntimeFocusedView({
  workout,
  activeSession,
  onCompleteSet,
  loadingSetPublicId,
  activeRest,
  onSkipRest,
  onCompleteWorkout,
  isCompleting,
  completeError,
  history,
  onToggleOverview,
  isOffline = false,
  activeSubstitutions = {},
  remainingSwaps = 0,
  onOpenSwapModal,
}: StudentRuntimeFocusedViewProps) {
  // 1. Identify all ordered sets and partition into completed, skipped, and pending
  const sets = activeSession.sets || [];
  const completedSets = sets.filter((s) => s.completedAt != null && !s.isSkipped);
  const skippedSets = sets.filter((s) => s.completedAt != null && s.isSkipped);
  const pendingSets = sets.filter((s) => s.completedAt == null);

  const totalSetsCount = sets.length;
  const completedCount = completedSets.length;
  const skippedCount = skippedSets.length;
  const doneCount = completedCount + skippedCount;
  const allCompleted = totalSetsCount > 0 && pendingSets.length === 0;

  // Selected item override when student clicks an exercise in the index
  const [selectedBlockItemId, setSelectedBlockItemId] = useState<string | null>(null);

  // Locate the active target set
  const currentSet = (() => {
    if (selectedBlockItemId) {
      const itemSets = sets.filter((s) => s.blockItemPublicId === selectedBlockItemId);
      const itemPending = itemSets.filter((s) => s.completedAt == null);
      if (itemPending.length > 0) return itemPending[0];
      if (itemSets.length > 0) return itemSets[itemSets.length - 1];
    }
    return pendingSets[0] as WorkoutExecutionSetDto | undefined;
  })();

  // Active block resolution
  const currentBlock: WorkoutBlockDto | null = (() => {
    if (!workout.blocks || workout.blocks.length === 0) return null;
    if (activeSession.workoutBlockPublicId) {
      const match = workout.blocks.find((b) => b.publicId === activeSession.workoutBlockPublicId);
      if (match) return match;
    }
    if (currentSet) {
      for (const b of workout.blocks) {
        if ((b.items || []).some((it) => it.publicId === currentSet.blockItemPublicId)) {
          return b;
        }
      }
    }
    return workout.blocks[0];
  })();

  const blockItems = currentBlock?.items || [];

  // 2. Locate context for currentSet (item, combination, letter, next member)
  const currentItemContext = (() => {
    if (!currentSet || !currentBlock) return null;

    for (const item of blockItems) {
      if (item.publicId === currentSet.blockItemPublicId) {
        const combination = item.combinationPublicId
          ? currentBlock.combinations?.find((c) => c.publicId === item.combinationPublicId) || null
          : null;

        let combLetter = "";
        let nextCombItem: WorkoutBlockItemDto | null = null;
        let isLastInCombRound = true;

        if (combination) {
          const combItems = blockItems
            .filter((it) => it.combinationPublicId === combination.publicId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const memberIdx = combItems.findIndex((it) => it.publicId === item.publicId);
          combLetter = String.fromCharCode(65 + Math.max(0, memberIdx));
          if (memberIdx >= 0 && memberIdx < combItems.length - 1) {
            nextCombItem = combItems[memberIdx + 1];
            isLastInCombRound = false;
          }
        }

        const itemSets = sets.filter((s) => s.blockItemPublicId === item.publicId);
        const itemCompletedSets = itemSets.filter((s) => s.completedAt != null).length;
        const totalItemSets = itemSets.length;
        const currentRoundOrSet = Math.min(totalItemSets, itemCompletedSets + 1);

        return {
          block: currentBlock,
          item,
          combination,
          combLetter,
          nextCombItem,
          isLastInCombRound,
          itemSets,
          itemCompletedSets,
          totalItemSets,
          currentRoundOrSet,
        };
      }
    }
    return null;
  })();

  // 3. Historical performance for this specific exercise
  const lastPerformance = (() => {
    if (!currentItemContext?.item) return null;
    const targetPublicId = currentItemContext.item.publicId;

    for (const pastSession of history) {
      const matchingSets = (pastSession.sets || []).filter(
        (s) => s.blockItemPublicId === targetPublicId && s.actualReps != null
      );
      if (matchingSets.length > 0) {
        const match =
          matchingSets.find((s) => s.setNumber === currentItemContext.currentRoundOrSet) ||
          matchingSets[0];
        const loadText =
          match.actualLoadKg != null && match.actualLoadKg > 0 ? `${match.actualLoadKg} kg × ` : "";
        return `${loadText}${match.actualReps} reps`;
      }
    }
    return null;
  })();

  // 4. Optional input state for current set (reps & load)
  // STRICT RULE: If the student does not edit reps/load, send NULL to avoid faking data!
  const [draftInputs, setDraftInputs] = useState<
    Record<
      string,
      {
        reps?: number | null;
        loadKg?: string;
        hasEditedReps?: boolean;
        hasEditedLoad?: boolean;
      }
    >
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEarlyCompleteModal, setShowEarlyCompleteModal] = useState(false);
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [isExecutionSheetOpen, setIsExecutionSheetOpen] = useState(false);
  const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const [failedImgUrl, setFailedImgUrl] = useState<string | null>(null);

  const currentDraft = currentSet ? draftInputs[currentSet.publicId] : undefined;

  // Reps & Load: visually guide with prescribed values or empty, but keep unedited unless touched
  const displayedReps = currentDraft?.hasEditedReps
    ? currentDraft.reps
    : currentSet?.prescribedReps ?? null;

  const displayedLoad = currentDraft?.hasEditedLoad
    ? currentDraft.loadKg
    : currentSet?.prescribedLoadKg != null && currentSet.prescribedLoadKg > 0
      ? String(currentSet.prescribedLoadKg)
      : "";

  const handleStepReps = (delta: number) => {
    if (!currentSet) return;
    const currentBase = displayedReps ?? currentSet.prescribedReps ?? 10;
    const nextVal = Math.max(1, currentBase + delta);
    setDraftInputs((prev) => ({
      ...prev,
      [currentSet.publicId]: {
        ...prev[currentSet.publicId],
        reps: nextVal,
        hasEditedReps: true,
      },
    }));
  };

  const handleLoadChange = (val: string) => {
    if (!currentSet) return;
    setDraftInputs((prev) => ({
      ...prev,
      [currentSet.publicId]: {
        ...prev[currentSet.publicId],
        loadKg: val,
        hasEditedLoad: true,
      },
    }));
  };

  // Overall workout progress metrics
  const progressPercent = totalSetsCount > 0 ? Math.round((doneCount / totalSetsCount) * 100) : 0;

  // Active rest activity name
  const activeRestInfo = (() => {
    if (!activeRest) return null;
    if (currentItemContext?.combination?.title) {
      const parsed = parseActiveRest(currentItemContext.combination.title);
      if (parsed.isActive) {
        return parsed.activity;
      }
    }
    return null;
  })();

  // Handle set completion click
  const handleConfirmCurrentSet = async () => {
    if (!currentSet || loadingSetPublicId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const draft = draftInputs[currentSet.publicId];
      // Only send actualReps if user touched/edited it
      const finalReps = draft?.hasEditedReps && draft.reps != null && draft.reps > 0 ? draft.reps : null;

      // Only send actualLoadKg if user touched/edited it
      let finalLoad: number | null = null;
      if (draft?.hasEditedLoad && draft.loadKg && draft.loadKg.trim() !== "") {
        const parsed = parseFloat(draft.loadKg.replace(",", "."));
        if (!isNaN(parsed) && parsed > 0) {
          finalLoad = Math.round(parsed * 100) / 100;
        }
      }

      await onCompleteSet(currentSet.publicId, {
        actualReps: finalReps,
        actualLoadKg: finalLoad,
        isSkipped: false,
      });

      // Clear manual blockItem override after completing a set so flow advances naturally
      if (selectedBlockItemId) {
        const remainingInItem = sets.filter(
          (s) => s.blockItemPublicId === selectedBlockItemId && s.publicId !== currentSet.publicId && s.completedAt == null
        );
        if (remainingInItem.length === 0) {
          setSelectedBlockItemId(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle skip set click
  const handleSkipCurrentSet = async () => {
    if (!currentSet || loadingSetPublicId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCompleteSet(currentSet.publicId, {
        actualReps: null,
        actualLoadKg: null,
        isSkipped: true,
      });

      if (selectedBlockItemId) {
        const remainingInItem = sets.filter(
          (s) => s.blockItemPublicId === selectedBlockItemId && s.publicId !== currentSet.publicId && s.completedAt == null
        );
        if (remainingInItem.length === 0) {
          setSelectedBlockItemId(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Previous / Next item navigation without completing sets
  const handleNavigateItem = (direction: "prev" | "next") => {
    if (!currentItemContext || blockItems.length <= 1) return;
    const currentIdx = blockItems.findIndex((it) => it.publicId === currentItemContext.item.publicId);
    if (currentIdx === -1) return;

    const targetIdx =
      direction === "prev"
        ? (currentIdx - 1 + blockItems.length) % blockItems.length
        : (currentIdx + 1) % blockItems.length;

    const targetItem = blockItems[targetIdx];
    if (targetItem) {
      setSelectedBlockItemId(targetItem.publicId);
    }
  };

  // Workout duration timer
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  useEffect(() => {
    if (!activeSession.startedAt) return;
    const start = new Date(activeSession.startedAt).getTime();
    const update = () => {
      const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
      setElapsedMinutes(mins);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [activeSession.startedAt]);

  // --------------------------------------------------------------------------
  // WORKOUT COMPLETED CELEBRATION VIEW
  // --------------------------------------------------------------------------
  if (allCompleted) {
    return (
      <div className="space-y-6 pt-4 pb-20 max-w-lg mx-auto text-center px-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
          <TrophyIcon className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Treino 100% Concluído
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading">
            Sensacional!
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
            Você completou todas as séries prescritas para esta rotina. Finalize para salvar seu progresso.
          </p>
        </div>

        {/* Summary Metric Chips */}
        <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Duração
            </span>
            <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
              {elapsedMinutes > 0 ? `${elapsedMinutes}m` : "< 1m"}
            </span>
          </div>
          <div className="space-y-0.5 border-x border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Séries Feitas
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completedCount}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Exercícios
            </span>
            <span className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
              {blockItems.length}
            </span>
          </div>
        </div>

        {completeError && (
          <p className="text-xs text-red-500 font-semibold">{completeError}</p>
        )}

        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={() => onCompleteWorkout()}
            disabled={isCompleting}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCompleting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Finalizando treino...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Finalizar treino</span>
              </>
            )}
          </button>

          {onToggleOverview && (
            <button
              type="button"
              onClick={onToggleOverview}
              className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              Revisar treino completo
            </button>
          )}
        </div>
      </div>
    );
  }

  // If no current item context found, fallback cleanly
  if (!currentItemContext || !currentSet) {
    return null;
  }

  const {
    block,
    item,
    combination,
    combLetter,
    nextCombItem,
    isLastInCombRound,
    totalItemSets,
    currentRoundOrSet,
  } = currentItemContext;

  const hasMethodNote = Boolean(item.notes && item.notes.trim());
  const isSequence = Boolean(item.methodConfig?.isSequence || item.methodConfig?.customSequence);
  const resolvedMedia = resolveExerciseExecutionMedia({ item });
  const hasVideo = resolvedMedia.hasMedia;
  const isVideoFailed = Boolean(resolvedMedia.url && failedVideoUrl === resolvedMedia.url);
  const isImgFailed = Boolean(resolvedMedia.url && failedImgUrl === resolvedMedia.url);

  const sequenceExperience = isSequence
    ? buildSequenceMediaFromCustomItem(item)
    : combination
      ? buildSequenceMediaFromCombination(combination, block.items)
      : null;

  // Active substitution if applied
  const substitutedInfo = activeSubstitutions[item.publicId];

  // Helper renderer for Exercise Checklist Index
  const renderExerciseIndexList = () => {
    return (
      <div className="space-y-1.5">
        {blockItems.map((bi, idx) => {
          const itemSets = sets.filter((s) => s.blockItemPublicId === bi.publicId);
          const iCompleted = itemSets.filter((s) => s.completedAt != null && !s.isSkipped).length;
          const iSkipped = itemSets.filter((s) => s.completedAt != null && s.isSkipped).length;
          const iTotal = itemSets.length;
          const isItemDone = iTotal > 0 && iCompleted + iSkipped === iTotal;
          const isCurrentActive = bi.publicId === item.publicId;

          const biComb = bi.combinationPublicId
            ? block.combinations?.find((c) => c.publicId === bi.combinationPublicId)
            : null;

          return (
            <button
              key={bi.publicId}
              type="button"
              onClick={() => {
                setSelectedBlockItemId(bi.publicId);
                setIsIndexDrawerOpen(false);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                isCurrentActive
                  ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)] shadow-2xs font-bold"
                  : isItemDone
                    ? "bg-[var(--surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] opacity-80"
                    : "bg-[var(--surface-elevated)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-emerald-500/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                    isItemDone
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : isCurrentActive
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {isItemDone ? "✓" : idx + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {biComb && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {biComb.combinationType.replace("_", "-")}
                      </span>
                    )}
                    <p className="text-xs font-semibold truncate leading-tight">
                      {bi.exerciseNameSnapshot}
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {iTotal} {iTotal === 1 ? "série" : "séries"}
                    {iCompleted > 0 ? ` • ${iCompleted} concluída${iCompleted > 1 ? "s" : ""}` : ""}
                    {iSkipped > 0 ? ` • ${iSkipped} pulada` : ""}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-[11px] font-mono font-bold text-[var(--text-tertiary)]">
                {iCompleted}/{iTotal}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] select-none">
      {/* 2-COLUMN RESPONSIVE GRID (DESKTOP: 280px Sidebar + Stage | MOBILE: Single Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 items-start">
        {/* ================================================================== */}
        {/* DESKTOP STICKY EXERCISE INDEX (lg+) */}
        {/* ================================================================== */}
        <aside className="hidden lg:block sticky top-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-3.5 depth-surface">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
                {workout.title}
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                {block.title || "Divisão de Treino"}
              </h2>
            </div>

            {/* Overall Progress Widget */}
            <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                <span>Progresso da sessão</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-0.5">
                <span>{doneCount} de {totalSetsCount} séries</span>
                <span className="tabular-nums">{elapsedMinutes} min decorridos</span>
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="pt-2 border-t border-[var(--border-subtle)] max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
              {renderExerciseIndexList()}
            </div>

            {/* Sidebar Finalization Action */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setShowEarlyCompleteModal(true)}
                disabled={isCompleting}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:border-amber-500/40 text-xs font-bold text-[var(--text-secondary)] hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Finalizar treino agora</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ================================================================== */}
        {/* CENTER / RIGHT STAGE: GUIDED EXECUTION EXPERIENCE */}
        {/* ================================================================== */}
        <div className="min-w-0 space-y-4">
          {/* MOBILE RUNTIME TOP BAR: PROGRESS & OVERVIEW TOGGLE (< lg) */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-2 lg:hidden">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[var(--text-primary)] font-bold truncate">
                  {block.title || workout.title}
                </span>
                {isOffline && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                    Offline
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsIndexDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[38px]"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>Índice ({doneCount}/{totalSetsCount})</span>
                </button>
              </div>
            </div>

            {/* Mobile Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                <span>Série {doneCount + 1} de {totalSetsCount}</span>
                <span className="tabular-nums font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ACTIVE REST TIMER CARD (NON-BLOCKING) */}
          {activeRest && (
            <div className="rounded-2xl overflow-hidden shadow-xs animate-in slide-in-from-top-3 duration-200 space-y-2">
              {activeRestInfo && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 border border-emerald-500/25">
                  <span>⚡ Descanso ativo prescrito: {activeRestInfo}</span>
                </div>
              )}
              <RestTimer activeRest={activeRest} onSkip={onSkipRest} />
            </div>
          )}

          {/* ================================================================ */}
          {/* FOCUSED EXERCISE STAGE ("O QUE TENHO PARA FAZER AGORA") */}
          {/* ================================================================ */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-5 depth-surface">
            {/* Header: Combination Badge & Progress Step */}
            {combination ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    {combination.combinationType.replace("_", "-")} • Rodada {currentRoundOrSet} de {totalItemSets}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {combLetter}
                  </span>
                </div>

                {nextCombItem && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                    A seguir na rodada: {nextCombItem.exerciseNameSnapshot}
                  </span>
                )}
                {isLastInCombRound && (
                  <span className="text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-2.5 py-1 rounded-xl">
                    Último da rodada • Descanso após
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {block.title || "Exercício Individual"}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  Série {currentRoundOrSet} de {totalItemSets}
                </span>
              </div>
            )}

            {/* Exercise Title Prescribed */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading leading-tight">
                {substitutedInfo ? substitutedInfo.performedExerciseName : item.exerciseNameSnapshot}
              </h1>

              {substitutedInfo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <span>Substituição aprovada (Original: {item.exerciseNameSnapshot})</span>
                </div>
              )}

              {/* METHOD / OBSERVATION IN PROMINENT POSITION UNDER TITLE */}
              {hasMethodNote && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300">
                  <span className="text-amber-500">⚡</span>
                  <span>Método prescrito: {item.notes}</span>
                </div>
              )}
            </div>

            {/* SEQUENCE MOVEMENTS & INSTRUCTIONS */}
            {isSequence && (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider block">
                  Movimentos da Sequência Prescrita
                </span>
                {Array.isArray((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements) &&
                (((item.methodConfig?.customSequence as { movements?: unknown[] })?.movements?.length ?? 0) > 0) ? (
                  <ol className="list-decimal pl-4 space-y-1.5 text-[var(--text-primary)] font-medium">
                    {((item.methodConfig?.customSequence as { movements: unknown[] }).movements).map((m: unknown, idx: number) => {
                      const label = typeof m === "string" ? m : (m as { label?: string })?.label || `Movimento ${idx + 1}`;
                      const hint = typeof m === "object" && m !== null
                        ? ((m as { repsText?: string })?.repsText || (m as { durationText?: string })?.durationText)
                        : null;
                      return (
                        <li key={idx}>
                          <span>{label}</span>
                          {hint && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">({hint})</span>}
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                {item.instructionsSnapshot && (
                  <p className="text-[var(--text-secondary)] whitespace-pre-line pt-1 text-xs">
                    {item.instructionsSnapshot}
                  </p>
                )}
              </div>
            )}

            {/* Regular Clinical / Exercise Instructions snapshot if not sequence */}
            {!isSequence && item.instructionsSnapshot && (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] text-xs block">Instruções de Execução:</span>
                <p className="whitespace-pre-line leading-relaxed">{item.instructionsSnapshot}</p>
              </div>
            )}

            {/* Media Action and Metadata row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                {item.muscleGroupSnapshot && (
                  <span className="font-medium text-[var(--text-tertiary)]">
                    {item.muscleGroupSnapshot}
                  </span>
                )}
                {item.equipmentSnapshot && (
                  <>
                    <span>•</span>
                    <span>{item.equipmentSnapshot}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {sequenceExperience?.hasPlayableMedia ? (
                  <button
                    type="button"
                    onClick={() => setIsSequenceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors cursor-pointer min-h-[44px]"
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Ver sequência em vídeo</span>
                  </button>
                ) : hasVideo ? (
                  <button
                    type="button"
                    onClick={() => setIsExecutionSheetOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors cursor-pointer min-h-[44px]"
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Ver execução técnica</span>
                  </button>
                ) : null}

                {/* Exercise Substitution Trigger (if enabled) */}
                {onOpenSwapModal && remainingSwaps > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenSwapModal(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[44px]"
                  >
                    <span>⇄ Substituir</span>
                  </button>
                )}
              </div>
            </div>

            {/* Historical Reference */}
            {lastPerformance && (
              <div className="px-4 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span className="font-medium text-[var(--text-secondary)]">Último treino registrado:</span>
                <span className="font-bold text-[var(--text-primary)]">{lastPerformance}</span>
              </div>
            )}

            {/* ============================================================== */}
            {/* PRESCRIBED TARGETS & OPTIONAL REALIZED INPUTS */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Repetições */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                    Repetições
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)] block">
                    Prescrito: {currentSet.prescribedRepsMax && currentSet.prescribedRepsMax !== currentSet.prescribedReps ? `${currentSet.prescribedReps}-${currentSet.prescribedRepsMax}` : currentSet.prescribedReps || "Livre"}
                  </span>
                </div>

                {/* Touch Stepper for Reps */}
                <div className="flex items-center justify-between gap-2 pt-1 max-w-[200px] mx-auto">
                  <button
                    type="button"
                    onClick={() => handleStepReps(-1)}
                    className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                    aria-label="Diminuir repetições"
                  >
                    -
                  </button>
                  <span className="text-xl font-extrabold text-[var(--text-primary)] tabular-nums min-w-[40px] text-center">
                    {displayedReps ?? "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepReps(1)}
                    className="w-11 h-11 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                    aria-label="Aumentar repetições"
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  {currentDraft?.hasEditedReps ? "Modificado para esta série" : "Opcional • Deixe em branco se não quiser registrar"}
                </span>
              </div>

              {/* Carga Realizada (kg) */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                    Carga (kg)
                  </span>
                  <span className="text-xs font-medium text-[var(--text-secondary)] block">
                    Prescrito: {currentSet.prescribedLoadKg != null && currentSet.prescribedLoadKg > 0 ? `${currentSet.prescribedLoadKg} kg` : "Livre"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1 max-w-[200px] mx-auto">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayedLoad}
                    onChange={(e) => handleLoadChange(e.target.value)}
                    placeholder="—"
                    className="w-24 h-11 rounded-xl text-center text-lg font-extrabold text-[var(--text-primary)] bg-[var(--surface-elevated)] border border-[var(--border-default)] focus:border-emerald-500 focus:outline-hidden transition-all tabular-nums"
                  />
                  <span className="text-xs font-bold text-[var(--text-tertiary)]">kg</span>
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  {currentDraft?.hasEditedLoad ? "Modificado para esta série" : "Opcional • Deixe em branco se não usar carga"}
                </span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* PRIMARY & SECONDARY ACTIONS ROW */}
            {/* ============================================================== */}
            <div className="space-y-3 pt-2">
              {/* PRIMARY ACTION: CONCLUIR SÉRIE (48-56px high) */}
              <button
                type="button"
                onClick={handleConfirmCurrentSet}
                disabled={Boolean(loadingSetPublicId) || isSubmitting}
                className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loadingSetPublicId === currentSet.publicId || isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registrando série...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>CONCLUIR SÉRIE {currentRoundOrSet}</span>
                  </>
                )}
              </button>

              {/* SECONDARY ROW: PREV / NEXT NAV + PULAR SÉRIE */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleNavigateItem("prev")}
                  disabled={blockItems.length <= 1}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipCurrentSet}
                  disabled={Boolean(loadingSetPublicId) || isSubmitting}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Pular esta série"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Pular série</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateItem("next")}
                  disabled={blockItems.length <= 1}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EARLY COMPLETION MODAL */}
      {/* ==================================================================== */}
      {showEarlyCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                Finalizar treino agora?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Você concluiu <strong>{doneCount}</strong> de <strong>{totalSetsCount}</strong> séries prescritas.
                Existem <strong>{pendingSets.length}</strong> séries pendentes.
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] pt-1">
                Ao finalizar, as séries não realizadas serão registradas como encerradas antecipadamente.
              </p>
            </div>

            {completeError && (
              <p className="text-xs text-red-500 font-semibold text-center">{completeError}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEarlyCompleteModal(false)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                Continuar treinando
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowEarlyCompleteModal(false);
                  await onCompleteWorkout({ allowEarlyCompletion: true });
                }}
                disabled={isCompleting}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <span>Finalizar treino</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE EXERCISE INDEX BOTTOM SHEET (< lg) */}
      <MobileBottomSheet
        isOpen={isIndexDrawerOpen}
        onClose={() => setIsIndexDrawerOpen(false)}
        title={block.title || "Exercícios da Divisão"}
        subtitle={`${doneCount} de ${totalSetsCount} séries concluídas`}
      >
        <div className="space-y-4 py-2">
          {renderExerciseIndexList()}

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setIsIndexDrawerOpen(false);
                setShowEarlyCompleteModal(true);
              }}
              className="w-full min-h-[48px] rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center cursor-pointer"
            >
              Finalizar treino antecipadamente
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* INSTRUCTION & VIDEO BOTTOM SHEET */}
      <MobileBottomSheet
        isOpen={isExecutionSheetOpen}
        onClose={() => setIsExecutionSheetOpen(false)}
        title={item.exerciseNameSnapshot}
        subtitle="Orientações e execução técnica"
      >
        <div className="space-y-4 py-1">
          {resolvedMedia.hasMedia && resolvedMedia.url && (
            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {(() => {
                const isExplicitGif =
                  resolvedMedia.isGif ||
                  resolvedMedia.url.toLowerCase().endsWith(".gif") ||
                  resolvedMedia.url.toLowerCase().includes(".gif");
                const hasFailedBoth = (isExplicitGif && isImgFailed) || (isVideoFailed && isImgFailed);

                if (hasFailedBoth) {
                  return (
                    <div className="p-4 text-center space-y-2 text-white">
                      <span className="text-2xl block">⚠️</span>
                      <p className="text-xs font-semibold text-zinc-200">Não foi possível reproduzir este vídeo.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFailedVideoUrl(null);
                          setFailedImgUrl(null);
                        }}
                        className="text-[11px] px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition cursor-pointer"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  );
                }

                if (isExplicitGif || isVideoFailed || !resolvedMedia.isVideo) {
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={resolvedMedia.url}
                      alt={item.exerciseNameSnapshot}
                      onError={() => setFailedImgUrl(resolvedMedia.url)}
                      className="w-full h-full object-contain"
                    />
                  );
                }

                return (
                  <video
                    src={resolvedMedia.url}
                    poster={resolvedMedia.thumbnailUrl || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() => setFailedVideoUrl(resolvedMedia.url)}
                    className="w-full h-full object-contain"
                  />
                );
              })()}
            </div>
          )}

          {item.instructionsSnapshot && (
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Instruções de Execução
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                {item.instructionsSnapshot}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">
                Grupo Muscular
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {item.muscleGroupSnapshot || "Geral"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">
                Equipamento
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {item.equipmentSnapshot || "Livre"}
              </span>
            </div>
          </div>
        </div>
      </MobileBottomSheet>

      {/* MULTI-MOVEMENT SEQUENCE VIDEO MODAL */}
      <SequenceExecutionModal
        isOpen={isSequenceModalOpen}
        onClose={() => setIsSequenceModalOpen(false)}
        experience={sequenceExperience}
      />
    </div>
  );
}
