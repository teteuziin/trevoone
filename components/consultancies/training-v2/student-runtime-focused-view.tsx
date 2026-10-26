"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { parseScheduledWeekdays } from "@/lib/training-v2/route-helpers";

function FastForward({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="13 19 22 12 13 5 13 19" fill="currentColor" />
      <polygon points="2 19 11 12 2 5 2 19" fill="currentColor" />
    </svg>
  );
}

function Flag({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
    </svg>
  );
}

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

function ChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function AlertTriangle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  consultancySlug,
  onToggleOverview,
  isOffline = false,
  activeSubstitutions = {},
  remainingSwaps = 0,
  onOpenSwapModal,
}: StudentRuntimeFocusedViewProps) {
  // 1. Resolve active division/block
  const currentBlock: WorkoutBlockDto | null = (() => {
    if (!workout.blocks || workout.blocks.length === 0) return null;
    // 1. Se workoutBlockPublicId explícito existe, utiliza-o (sessões modernas)
    if (activeSession.workoutBlockPublicId) {
      const match = workout.blocks.find((b) => b.publicId === activeSession.workoutBlockPublicId);
      if (match) return match;
    }
    // 2. Para sessões legadas: resolve por séries concluídas (modelo persistido estável)
    const setsWithCompletion = (activeSession.sets || []).filter((s) => s.completedAt != null);
    if (setsWithCompletion.length > 0) {
      const countPerBlock = new Map<string, number>();
      for (const s of setsWithCompletion) {
        for (const b of workout.blocks) {
          if ((b.items || []).some((it) => it.publicId === s.blockItemPublicId)) {
            countPerBlock.set(b.publicId, (countPerBlock.get(b.publicId) || 0) + 1);
            break;
          }
        }
      }
      let bestBlockPublicId: string | null = null;
      let maxCount = 0;
      for (const [bId, count] of countPerBlock.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestBlockPublicId = bId;
        }
      }
      if (bestBlockPublicId) {
        const match = workout.blocks.find((b) => b.publicId === bestBlockPublicId);
        if (match) return match;
      }
    }
    // 3. Se nenhuma série foi feita ainda, vincula pelo dia da semana de início da sessão
    if (activeSession.startedAt) {
      const sessionDate = new Date(activeSession.startedAt);
      if (!Number.isNaN(sessionDate.getTime())) {
        const sessionWeekday = sessionDate.getDay();
        const matchingBlock = workout.blocks.find((b) => {
          const days = parseScheduledWeekdays(b.title, b.instructions);
          return days.includes(sessionWeekday);
        });
        if (matchingBlock) return matchingBlock;
      }
    }
    // 4. Fallback padrão para primeiro bloco
    return workout.blocks[0];
  })();

  const blockItems = useMemo(() => currentBlock?.items || [], [currentBlock]);
  const currentBlockItemIds = useMemo(
    () => new Set(blockItems.map((it) => it.publicId)),
    [blockItems]
  );

  // 2. Scope sets strictly to current division (fixes 107 series on legacy un-scoped sessions)
  const sets = useMemo(() => {
    const allSessionSets = activeSession.sets || [];
    if (currentBlockItemIds.size === 0) return allSessionSets;
    const filtered = allSessionSets.filter((s) => currentBlockItemIds.has(s.blockItemPublicId));
    return filtered.length > 0 ? filtered : allSessionSets;
  }, [activeSession.sets, currentBlockItemIds]);

  const completedSets = sets.filter((s) => s.completedAt != null && !s.isSkipped);
  const skippedSets = sets.filter((s) => s.completedAt != null && s.isSkipped);
  const pendingSets = sets.filter((s) => s.completedAt == null);

  const totalSetsCount = sets.length;
  const completedCount = completedSets.length;
  const skippedCount = skippedSets.length;
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
  const [isOptionalInputOpen, setIsOptionalInputOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const [failedImgUrl, setFailedImgUrl] = useState<string | null>(null);

  const currentDraft = currentSet ? draftInputs[currentSet.publicId] : undefined;

  // Reps & Load: visually guide with prescribed values or empty, but keep unedited unless touched
  const displayedReps = currentDraft?.hasEditedReps
    ? currentDraft.reps
    : null;

  const displayedLoad = currentDraft?.hasEditedLoad
    ? currentDraft.loadKg ?? ""
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

  const handleRepsInputChange = (val: string) => {
    if (!currentSet) return;
    const cleaned = val.replace(/\D/g, "");
    if (cleaned === "") {
      setDraftInputs((prev) => ({
        ...prev,
        [currentSet.publicId]: {
          ...prev[currentSet.publicId],
          reps: null,
          hasEditedReps: false,
        },
      }));
    } else {
      const num = parseInt(cleaned, 10);
      setDraftInputs((prev) => ({
        ...prev,
        [currentSet.publicId]: {
          ...prev[currentSet.publicId],
          reps: num,
          hasEditedReps: true,
        },
      }));
    }
  };

  const handleLoadChange = (val: string) => {
    if (!currentSet) return;
    if (val.trim() === "") {
      setDraftInputs((prev) => ({
        ...prev,
        [currentSet.publicId]: {
          ...prev[currentSet.publicId],
          loadKg: "",
          hasEditedLoad: false,
        },
      }));
    } else {
      setDraftInputs((prev) => ({
        ...prev,
        [currentSet.publicId]: {
          ...prev[currentSet.publicId],
          loadKg: val,
          hasEditedLoad: true,
        },
      }));
    }
  };

  // Human-readable prescription text formatted according to requirements
  // E.g.: "3 séries" & "8 a 12 repetições · Descanso de 30 segundos"
  const prescriptionParts = (() => {
    if (!currentItemContext || !currentSet) {
      return { setsText: "", repsText: "", restText: "", loadText: "" };
    }
    const totalItemSets = currentItemContext.totalItemSets;
    const setsText = `${totalItemSets} ${totalItemSets === 1 ? "série" : "séries"}`;
    let repsText = "";
    if (currentSet.prescribedRepsMax && currentSet.prescribedRepsMax !== currentSet.prescribedReps) {
      repsText = `${currentSet.prescribedReps} a ${currentSet.prescribedRepsMax} repetições`;
    } else if (currentSet.prescribedReps) {
      repsText = `${currentSet.prescribedReps} repetições`;
    } else {
      repsText = "Repetições livres";
    }
    let restText = "";
    if (currentSet.prescribedRestSeconds && currentSet.prescribedRestSeconds > 0) {
      restText = `Descanso de ${currentSet.prescribedRestSeconds} segundos`;
    } else {
      restText = "Sem descanso programado";
    }
    let loadText = "";
    if (currentSet.prescribedLoadKg != null && currentSet.prescribedLoadKg > 0) {
      loadText = ` · ${currentSet.prescribedLoadKg} kg`;
    }
    return { setsText, repsText, restText, loadText };
  })();
  const prescriptionSummaryText = `${prescriptionParts.setsText} · ${prescriptionParts.repsText} · ${prescriptionParts.restText}${prescriptionParts.loadText}`;

  // Overall workout progress metrics: Séries puladas não entram na contagem de concluídas
  const progressPercent = totalSetsCount > 0 ? Math.round((completedCount / totalSetsCount) * 100) : 0;

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

  // Skip all remaining pending sets of the current exercise
  const handleSkipCurrentExercise = async () => {
    if (!currentItemContext || !onCompleteSet || loadingSetPublicId || isSubmitting) return;
    const targetItem = currentItemContext.item;
    const itemPendingSets = sets.filter(
      (s) => s.blockItemPublicId === targetItem.publicId && s.completedAt == null
    );
    if (itemPendingSets.length === 0) return;

    setIsSubmitting(true);
    try {
      for (const s of itemPendingSets) {
        await onCompleteSet(s.publicId, {
          actualReps: null,
          actualLoadKg: null,
          isSkipped: true,
        });
      }
      setSelectedBlockItemId(null);
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

  // Workout duration timer & session timing representation
  // Rule: If started on a previous day or > 4h ago, display exact start timestamp ("Iniciado em DD/MM às HH:mm").
  // Never display multi-day elapsed minutes like "7615 min decorridos".
  const [timingLabel, setTimingLabel] = useState<string>("");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    if (!activeSession.startedAt) return;
    const update = () => {
      const startDate = new Date(activeSession.startedAt);
      const now = new Date();
      const elapsedMs = now.getTime() - startDate.getTime();
      const isSameCalendarDay =
        startDate.getDate() === now.getDate() &&
        startDate.getMonth() === now.getMonth() &&
        startDate.getFullYear() === now.getFullYear();
      const isRecent = isSameCalendarDay && elapsedMs >= 0 && elapsedMs < 4 * 60 * 60 * 1000;

      const mins = Math.max(0, Math.floor(elapsedMs / 60000));
      setElapsedMinutes(mins);

      if (isRecent) {
        setTimingLabel(`${mins} min decorridos`);
      } else {
        const day = String(startDate.getDate()).padStart(2, "0");
        const month = String(startDate.getMonth() + 1).padStart(2, "0");
        const hours = String(startDate.getHours()).padStart(2, "0");
        const minutes = String(startDate.getMinutes()).padStart(2, "0");
        setTimingLabel(`Iniciado em ${day}/${month} às ${hours}:${minutes}`);
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [activeSession.startedAt]);

  // --------------------------------------------------------------------------
  // WORKOUT COMPLETED SUMMARY SCREEN (Requirement 5)
  // --------------------------------------------------------------------------
  if (activeSession.status === "COMPLETED") {
    const startedDate = activeSession.startedAt ? new Date(activeSession.startedAt) : null;
    const completedDate = activeSession.completedAt ? new Date(activeSession.completedAt) : new Date();

    const startedTimeFormatted = startedDate && !Number.isNaN(startedDate.getTime())
      ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(startedDate)
      : "";
    const completedTimeFormatted = completedDate && !Number.isNaN(completedDate.getTime())
      ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(completedDate)
      : "";
    const sessionDateFormatted = startedDate && !Number.isNaN(startedDate.getTime())
      ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(startedDate)
      : "";

    const durationMinutes = startedDate && completedDate && !Number.isNaN(startedDate.getTime()) && !Number.isNaN(completedDate.getTime())
      ? Math.max(1, Math.round((completedDate.getTime() - startedDate.getTime()) / 60000))
      : elapsedMinutes > 0 ? elapsedMinutes : 1;

    const optionalLoadsTracked = sets.filter((s) => s.actualLoadKg != null && s.actualLoadKg > 0).length;
    const optionalRepsTracked = sets.filter((s) => s.actualReps != null && s.actualReps > 0).length;

    return (
      <div className="space-y-6 pt-6 pb-20 max-w-xl mx-auto px-4 animate-in fade-in duration-300">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <TrophyIcon className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Treino Finalizado com Sucesso
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-heading">
              Resumo do Treino
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              {workout.title} • {currentBlock?.title || "Divisão de Treino"}
            </p>
          </div>
        </div>

        {/* Resumo ao Concluir */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-4 depth-surface">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Duração Real
              </span>
              <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                {durationMinutes} min
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Séries Feitas
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {completedCount}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Séries Puladas
              </span>
              <span className="text-lg font-black text-zinc-500 dark:text-zinc-400 tabular-nums">
                {skippedCount}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Exercícios
              </span>
              <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">
                {blockItems.length}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <div className="flex items-center justify-between">
              <span>Data da sessão:</span>
              <strong className="text-[var(--text-primary)]">{sessionDateFormatted}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Horário:</span>
              <strong className="text-[var(--text-primary)]">
                {startedTimeFormatted} até {completedTimeFormatted}
              </strong>
            </div>
            {(optionalLoadsTracked > 0 || optionalRepsTracked > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span>Registros opcionais:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {optionalLoadsTracked > 0 ? `${optionalLoadsTracked} cargas registradas` : ""}
                  {optionalLoadsTracked > 0 && optionalRepsTracked > 0 ? " • " : ""}
                  {optionalRepsTracked > 0 ? `${optionalRepsTracked} contagens de reps` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botão Principal: Voltar aos meus treinos */}
        <div className="space-y-3 pt-2">
          <Link
            href={consultancySlug ? `/consultoria/${consultancySlug}/treinos` : "/app"}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Voltar aos meus treinos</span>
            <span>→</span>
          </Link>

          {onToggleOverview && (
            <button
              type="button"
              onClick={onToggleOverview}
              className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              Revisar ficha completa
            </button>
          )}
        </div>
      </div>
    );
  }

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
            <span className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tabular-nums truncate block">
              {elapsedMinutes > 0 && elapsedMinutes < 720 ? `${elapsedMinutes}m` : "< 1m"}
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
    totalItemSets,
  } = currentItemContext;

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
          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-3 depth-surface">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block truncate">
                {workout.title}
              </span>
              <h2 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                {currentBlock?.title || "Divisão de Treino"}
              </h2>
            </div>

            {/* Scrollable Checklist */}
            <div className="pt-2 border-t border-[var(--border-subtle)] max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {renderExerciseIndexList()}
            </div>
          </div>
        </aside>

        {/* ================================================================== */}
        {/* CENTER / RIGHT STAGE: GUIDED EXECUTION EXPERIENCE */}
        {/* ================================================================== */}
        <div className="min-w-0 space-y-4">
          {/* CABEÇALHO ÚNICO: Voltar, Divisão, Botão Exercícios, Barra de progresso com contagem clara */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={consultancySlug ? `/consultoria/${consultancySlug}/treinos` : "/app"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1 group min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Voltar aos meus treinos</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsIndexDrawerOpen(true)}
                className="inline-flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[44px]"
              >
                <ListIcon className="w-4 h-4" />
                <span>Exercícios</span>
              </button>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight truncate">
                  {currentBlock?.title || workout.title}
                </h2>
                {isOffline && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
                    Offline
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)] tabular-nums shrink-0">
                {progressPercent}%
              </span>
            </div>

            {/* Uma barra de progresso com contagem clara */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pt-0.5">
                <span>{completedCount} de {totalSetsCount} séries concluídas</span>
                {timingLabel && <span className="tabular-nums">{timingLabel}</span>}
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
          {/* EXERCÍCIO */}
          {/* ================================================================ */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xs space-y-5 depth-surface">
            {/* Header: Exercício X de Y */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Exercício {exerciseNumber} de {totalExercisesCount}
              </span>
              {combination && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {combination.combinationType.replace("_", "-")} ({combLetter})
                </span>
              )}
            </div>

            {/* Nome completo do exercício */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tight font-heading leading-tight">
                {substitutedInfo ? substitutedInfo.performedExerciseName : item.exerciseNameSnapshot}
              </h1>

              {item.muscleGroupSnapshot && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {item.muscleGroupSnapshot}{item.equipmentSnapshot ? ` · ${item.equipmentSnapshot}` : ""}
                </p>
              )}

              {substitutedInfo && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  <span>Substituição realizada (Original: {item.exerciseNameSnapshot})</span>
                </div>
              )}
            </div>

            {/* "Ver demonstração", quando houver mídia */}
            {sequenceExperience?.hasPlayableMedia ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsSequenceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <VideoIcon className="w-4 h-4" />
                  <span>Ver sequência em vídeo</span>
                </button>
              </div>
            ) : hasVideo ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsExecutionSheetOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors cursor-pointer min-h-[44px]"
                >
                  <VideoIcon className="w-4 h-4" />
                  <span>Ver demonstração</span>
                </button>
              </div>
            ) : null}

            {/* Observações do personal, quando existentes */}
            {item.notes && item.notes.trim().length > 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Observações do personal:</span>
                </div>
                <p className="leading-relaxed whitespace-pre-line pl-5">{item.notes}</p>
              </div>
            )}

            {/* Prescrição: Direta, sem caixa verde gigante, sem rótulo "PRESCRIÇÃO" */}
            <div className="py-1 space-y-0.5" aria-label={prescriptionSummaryText}>
              <div className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                {prescriptionParts.setsText}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                {prescriptionParts.repsText} · {prescriptionParts.restText}{prescriptionParts.loadText}
              </div>
              {lastPerformance && (
                <div className="text-[11px] text-[var(--text-tertiary)] pt-0.5">
                  Último registro: <strong className="font-semibold text-[var(--text-secondary)]">{lastPerformance}</strong>
                </div>
              )}
            </div>

            {/* EXECUÇÃO */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Série {currentSetNumberInItem} de {totalItemSets}
                </span>

                {/* Indicadores pequenos das séries locais (1, 2, 3...) */}
                <div className="flex items-center gap-1.5" role="group" aria-label="Séries deste exercício">
                  {itemSets.map((s, sIdx) => {
                    const isDone = s.completedAt != null && !s.isSkipped;
                    const isSkipped = s.completedAt != null && s.isSkipped;
                    const isCurrent = s.publicId === currentSet.publicId;

                    return (
                      <div
                        key={s.publicId}
                        aria-label={`Série ${sIdx + 1}: ${isCurrent ? "Em execução" : isDone ? "Concluída" : isSkipped ? "Pulada" : "A fazer"}`}
                        className={`min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-emerald-600 text-white font-extrabold shadow-xs ring-2 ring-emerald-500/30"
                            : isDone
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : isSkipped
                            ? "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 line-through"
                            : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                        }`}
                      >
                        <span>{isDone ? `✓ ${sIdx + 1}` : sIdx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botão principal "Concluir série" */}
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
                    <span>Concluir série {currentSetNumberInItem}</span>
                  </>
                )}
              </button>

              {/* Área recolhível "Registrar carga e repetições — opcional" */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsOptionalInputOpen((prev) => !prev)}
                  className="w-full px-4 py-3 min-h-[44px] flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      Registrar carga e repetições (opcional)
                    </span>
                    {(currentDraft?.hasEditedReps || currentDraft?.hasEditedLoad) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {currentDraft.hasEditedReps ? `${currentDraft.reps} reps` : ""}
                        {currentDraft.hasEditedReps && currentDraft.hasEditedLoad ? " · " : ""}
                        {currentDraft.hasEditedLoad ? `${currentDraft.loadKg} kg` : ""}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 shrink-0 ${
                      isOptionalInputOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOptionalInputOpen && (
                  <div className="p-4 pt-1 border-t border-[var(--border-subtle)] space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Opcional. Campos em branco permanecem vazios (NULL) e não assumem a prescrição automaticamente.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Repetições */}
                      <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-1.5 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                          Repetições Realizadas
                        </span>
                        <div className="flex items-center justify-between gap-2 max-w-[180px] mx-auto">
                          <button
                            type="button"
                            onClick={() => handleStepReps(-1)}
                            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                            aria-label="Diminuir repetições"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={displayedReps != null ? String(displayedReps) : ""}
                            onChange={(e) => handleRepsInputChange(e.target.value)}
                            placeholder={currentSet.prescribedReps != null ? String(currentSet.prescribedReps) : "—"}
                            className="w-16 h-10 rounded-lg text-center text-base font-extrabold text-[var(--text-primary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] focus:border-emerald-500 focus:outline-hidden transition-all tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepReps(1)}
                            className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                            aria-label="Aumentar repetições"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)] block">
                          {currentDraft?.hasEditedReps ? "Modificado para esta série" : currentSet.prescribedReps ? `Prescrito: ${currentSet.prescribedReps}` : "Livre"}
                        </span>
                      </div>

                      {/* Carga Utilizada (kg) */}
                      <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-default)] space-y-1.5 text-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                          Carga Utilizada (kg)
                        </span>
                        <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayedLoad}
                            onChange={(e) => handleLoadChange(e.target.value)}
                            placeholder={currentSet.prescribedLoadKg != null && currentSet.prescribedLoadKg > 0 ? String(currentSet.prescribedLoadKg) : "—"}
                            className="w-20 h-10 rounded-lg text-center text-base font-extrabold text-[var(--text-primary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] focus:border-emerald-500 focus:outline-hidden transition-all tabular-nums"
                          />
                          <span className="text-xs font-bold text-[var(--text-tertiary)]">kg</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)] block">
                          {currentDraft?.hasEditedLoad ? "Modificado para esta série" : currentSet.prescribedLoadKg ? `Prescrito: ${currentSet.prescribedLoadKg} kg` : "Sem carga"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AÇÕES COMPLEMENTARES */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                {onOpenSwapModal && remainingSwaps > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenSwapModal(item)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⇄ Trocar exercício</span>
                  </button>
                )}

                {/* Menu "Mais opções": Pular série, Pular exercício e Finalizar treino */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMoreOptionsOpen((prev) => !prev)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
                    aria-expanded={isMoreOptionsOpen}
                    aria-haspopup="menu"
                  >
                    <span>Mais opções</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOptionsOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isMoreOptionsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={() => setIsMoreOptionsOpen(false)}
                      />
                      <div
                        className="absolute left-0 bottom-full mb-2 w-52 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                        role="menu"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreOptionsOpen(false);
                            handleSkipCurrentSet();
                          }}
                          disabled={Boolean(loadingSetPublicId) || isSubmitting}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          role="menuitem"
                        >
                          <SkipForward className="w-4 h-4 text-zinc-500" />
                          <span>Pular esta série</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreOptionsOpen(false);
                            handleSkipCurrentExercise();
                          }}
                          disabled={Boolean(loadingSetPublicId) || isSubmitting}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          role="menuitem"
                        >
                          <FastForward className="w-4 h-4 text-zinc-500" />
                          <span>Pular exercício</span>
                        </button>

                        <div className="border-t border-[var(--border-subtle)] my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreOptionsOpen(false);
                            setShowEarlyCompleteModal(true);
                          }}
                          disabled={isCompleting}
                          className="w-full min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          role="menuitem"
                        >
                          <Flag className="w-4 h-4 text-amber-600" />
                          <span>Finalizar treino</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Navegação simples sem concluir nada ao navegar */}
              {blockItems.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavigateItem("prev")}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                    title="Exercício anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigateItem("next")}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] transition-colors flex items-center gap-1 cursor-pointer"
                    title="Próximo exercício"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
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
                Você ainda tem <strong>{pendingSets.length}</strong> {pendingSets.length === 1 ? "série para fazer" : "séries para fazer"}. Deseja finalizar agora?
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] pt-1">
                Ao finalizar, as séries não realizadas serão registradas como encerradas antecipadamente e seu progresso será salvo.
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
        title={currentBlock?.title || "Exercícios da Divisão"}
        subtitle={`${completedCount} de ${totalSetsCount} séries concluídas`}
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
