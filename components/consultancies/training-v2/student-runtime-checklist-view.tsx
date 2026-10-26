"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
  WorkoutExecutionHistorySessionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
} from "@/lib/training-v2/types";
import {
  toggleWorkoutExecutionExerciseAction,
  skipWorkoutExecutionExerciseAction,
  completeWorkoutExecutionSetAction,
  completeWorkoutExecutionAction,
} from "@/app/consultoria/[slug]/treinos/actions";
import { StudentExerciseSwapModal } from "./student-exercise-swap-modal";
import { resolveExerciseExecutionMedia } from "@/lib/training-v2/execution-media-resolver";
import type { ActiveSubstitutedItem } from "@/lib/training-v2/exercise-substitution-types";

// ============================================================================
// ICONS
// ============================================================================

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SwapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface StudentRuntimeChecklistViewProps {
  workout: StudentWorkoutViewContract;
  activeSession: WorkoutExecutionSessionDto;
  consultancySlug: string;
  history?: WorkoutExecutionHistorySessionDto[];
  activeSubstitutions?: Record<string, ActiveSubstitutedItem>;
  remainingSwaps?: number;
  onSessionUpdated?: (session: WorkoutExecutionSessionDto) => void;
  onToggleOverview?: () => void;
}

// ============================================================================
// MAIN COMPONENT: STUDENT RUNTIME CHECKLIST VIEW
// ============================================================================

export function StudentRuntimeChecklistView({
  workout,
  activeSession,
  consultancySlug,
  activeSubstitutions = {},
  remainingSwaps = 3,
  onSessionUpdated,
  onToggleOverview,
}: StudentRuntimeChecklistViewProps) {
  // 1. Current Active Division Block
  const activeBlock: WorkoutBlockDto = useMemo(() => {
    if (activeSession.workoutBlockPublicId) {
      const match = workout.blocks.find((b) => b.publicId === activeSession.workoutBlockPublicId);
      if (match) return match;
    }
    return workout.blocks[0] || {
      id: 0,
      publicId: "default",
      blockType: "STANDARD",
      title: "Treino Principal",
      sortOrder: 0,
      rounds: 1,
      items: [],
      subBlocks: [],
      combinations: [],
    };
  }, [workout.blocks, activeSession.workoutBlockPublicId]);

  // Block Items in this division
  const blockItems: WorkoutBlockItemDto[] = useMemo(() => {
    return activeBlock.items || [];
  }, [activeBlock]);

  // Sets indexed by block_item_id
  const sessionSetsByItemPublicId = useMemo(() => {
    const map = new Map<string, WorkoutExecutionSetDto[]>();
    for (const s of activeSession.sets) {
      const list = map.get(s.blockItemPublicId) || [];
      list.push(s);
      map.set(s.blockItemPublicId, list);
    }
    return map;
  }, [activeSession.sets]);

  // Local state for set loads/reps being recorded in accordions
  const [localSetValues, setLocalSetValues] = useState<
    Record<string, { reps: string; load: string }>
  >({});

  // Expanded accordions per item
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  // Loading states for actions
  const [loadingItemPublicId, setLoadingItemPublicId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Video / Media Modal Item
  const [videoModalItem, setVideoModalItem] = useState<WorkoutBlockItemDto | null>(null);

  // Substitution Modal Item
  const [swapModalItem, setSwapModalItem] = useState<WorkoutBlockItemDto | null>(null);

  // Floating Rest Timer State
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [restInitialSeconds, setRestInitialSeconds] = useState<number>(0);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Finalization Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [completionState, setCompletionState] = useState<"ALL" | "PARTIAL" | "NONE">("ALL");
  const [studentNotes, setStudentNotes] = useState("");
  const [hasDiscomfort, setHasDiscomfort] = useState(false);
  const [discomfortNotes, setDiscomfortNotes] = useState("");

  // Server-confirmed completion session
  const [confirmedCompletedSession, setConfirmedCompletedSession] = useState<WorkoutExecutionSessionDto | null>(
    activeSession.status === "COMPLETED" ? activeSession : null
  );

  // --------------------------------------------------------------------------
  // REST TIMER TICKER
  // --------------------------------------------------------------------------
  const isRestActive = activeRestSeconds !== null && activeRestSeconds > 0;
  useEffect(() => {
    if (!isRestActive) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      return;
    }

    restTimerRef.current = setInterval(() => {
      setActiveRestSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isRestActive]);

  function startRest(seconds: number) {
    if (seconds <= 0) return;
    setRestInitialSeconds(seconds);
    setActiveRestSeconds(seconds);
  }

  function addRestSeconds(seconds: number) {
    setActiveRestSeconds((prev) => (prev ? prev + seconds : seconds));
  }

  function skipRest() {
    setActiveRestSeconds(null);
  }

  // --------------------------------------------------------------------------
  // ITEM STATUS CALCULATOR
  // --------------------------------------------------------------------------
  const itemStatuses = useMemo(() => {
    const statuses: Record<string, "COMPLETED" | "SKIPPED" | "PENDING"> = {};
    for (const item of blockItems) {
      const sets = sessionSetsByItemPublicId.get(item.publicId) || [];
      if (sets.length === 0) {
        statuses[item.publicId] = "PENDING";
        continue;
      }
      const allSkipped = sets.every((s) => s.isSkipped);
      if (allSkipped) {
        statuses[item.publicId] = "SKIPPED";
        continue;
      }
      const allDone = sets.every((s) => s.completedAt !== null);
      if (allDone) {
        statuses[item.publicId] = "COMPLETED";
      } else {
        statuses[item.publicId] = "PENDING";
      }
    }
    return statuses;
  }, [blockItems, sessionSetsByItemPublicId]);

  // Exercise counts
  const totalExercisesCount = blockItems.length;
  const completedExercisesCount = useMemo(() => {
    return blockItems.filter((i) => itemStatuses[i.publicId] === "COMPLETED").length;
  }, [blockItems, itemStatuses]);
  const skippedExercisesCount = useMemo(() => {
    return blockItems.filter((i) => itemStatuses[i.publicId] === "SKIPPED").length;
  }, [blockItems, itemStatuses]);

  // First pending item index (highlighted as next)
  const nextPendingIndex = useMemo(() => {
    return blockItems.findIndex((i) => itemStatuses[i.publicId] === "PENDING");
  }, [blockItems, itemStatuses]);

  const progressPercent = totalExercisesCount > 0
    ? Math.round((completedExercisesCount / totalExercisesCount) * 100)
    : 0;

  // --------------------------------------------------------------------------
  // CHECKLIST ACTIONS: CONCLUIR EXERCÍCIO / DESMARCAR / PULAR
  // --------------------------------------------------------------------------
  async function handleToggleExercise(item: WorkoutBlockItemDto, markCompleted: boolean) {
    setLoadingItemPublicId(item.publicId);
    try {
      const res = await toggleWorkoutExecutionExerciseAction(
        consultancySlug,
        activeSession.publicId,
        item.publicId,
        markCompleted
      );
      if (res.success && res.data) {
        // Update local session sets
        const updatedSets = [...activeSession.sets];
        for (const newSet of res.data.sets) {
          const idx = updatedSets.findIndex((s) => s.publicId === newSet.publicId);
          if (idx >= 0) {
            updatedSets[idx] = newSet;
          }
        }
        const updatedSession = { ...activeSession, sets: updatedSets };
        onSessionUpdated?.(updatedSession);

        // Optional rest trigger if rest is prescribed and user just finished
        const restSec = item.sets?.[0]?.targetRestSeconds;
        if (markCompleted && restSec && restSec > 0 && activeRestSeconds === null) {
          // Do not force, but user can see rest timer ready
        }
      }
    } catch (err) {
      console.error("[ChecklistView] Failed to toggle exercise:", err);
    } finally {
      setLoadingItemPublicId(null);
    }
  }

  async function handleSkipExercise(item: WorkoutBlockItemDto, reason?: string) {
    setLoadingItemPublicId(item.publicId);
    try {
      const res = await skipWorkoutExecutionExerciseAction(
        consultancySlug,
        activeSession.publicId,
        item.publicId,
        reason || null
      );
      if (res.success && res.data) {
        const updatedSets = [...activeSession.sets];
        for (const newSet of res.data.sets) {
          const idx = updatedSets.findIndex((s) => s.publicId === newSet.publicId);
          if (idx >= 0) {
            updatedSets[idx] = newSet;
          }
        }
        const updatedSession = { ...activeSession, sets: updatedSets };
        onSessionUpdated?.(updatedSession);
      }
    } catch (err) {
      console.error("[ChecklistView] Failed to skip exercise:", err);
    } finally {
      setLoadingItemPublicId(null);
    }
  }

  // --------------------------------------------------------------------------
  // RECORD OPTIONAL PER-SET REPS / LOAD
  // --------------------------------------------------------------------------
  async function handleSaveSetLoadReps(set: WorkoutExecutionSetDto) {
    const val = localSetValues[set.publicId];
    if (!val) return;
    const reps = val.reps.trim() !== "" ? Number(val.reps.trim()) : null;
    const load = val.load.trim() !== "" ? Number(val.load.trim().replace(",", ".")) : null;

    try {
      const res = await completeWorkoutExecutionSetAction(
        consultancySlug,
        activeSession.publicId,
        set.publicId,
        {
          actualReps: reps,
          actualLoadKg: load,
          isSkipped: false,
        }
      );
      if (res.success && res.set) {
        const updatedSets = activeSession.sets.map((s) => (s.publicId === set.publicId ? res.set! : s));
        onSessionUpdated?.({ ...activeSession, sets: updatedSets });
      }
    } catch (err) {
      console.error("[ChecklistView] Failed to save set values:", err);
    }
  }

  // --------------------------------------------------------------------------
  // FINALIZATION & FEEDBACK
  // --------------------------------------------------------------------------
  async function handleFinalizeWorkoutSubmit() {
    setIsFinalizing(true);
    setFinalizeError(null);

    const fullFeedback = [
      studentNotes.trim(),
      hasDiscomfort && discomfortNotes.trim() ? `[Desconforto relatado: ${discomfortNotes.trim()}]` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await completeWorkoutExecutionAction(
        consultancySlug,
        activeSession.publicId,
        {
          allowEarlyCompletion: true,
          studentCompletionState: completionState,
          studentFeedbackNotes: fullFeedback || null,
        }
      );

      if (res.success && res.session) {
        setIsFeedbackModalOpen(false);
        setConfirmedCompletedSession(res.session);
        onSessionUpdated?.(res.session);
      } else {
        setFinalizeError(res.error || "Não foi possível finalizar o treino. Tente novamente.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao finalizar treino.";
      setFinalizeError(msg);
    } finally {
      setIsFinalizing(false);
    }
  }

  // --------------------------------------------------------------------------
  // SUCCESS SCREEN (ONLY AFTER SERVER CONFIRMATION)
  // --------------------------------------------------------------------------
  if (confirmedCompletedSession && confirmedCompletedSession.status === "COMPLETED") {
    const started = new Date(confirmedCompletedSession.startedAt);
    const finished = confirmedCompletedSession.completedAt
      ? new Date(confirmedCompletedSession.completedAt)
      : new Date();

    const isSameDay = started.toDateString() === finished.toDateString();
    const startTimeFormatted = !Number.isNaN(started.getTime())
      ? started.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const finishTimeFormatted = !Number.isNaN(finished.getTime())
      ? finished.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const finishDateFormatted = !Number.isNaN(finished.getTime())
      ? finished.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    // Duration in minutes if within reasonable range (same day, < 12h)
    const diffMs = finished.getTime() - started.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const isDurationReasonable = isSameDay && diffMins > 0 && diffMins < 720;

    const isPureFullCompletion = completedExercisesCount === totalExercisesCount && skippedExercisesCount === 0;

    return (
      <div className="w-full max-w-xl mx-auto pt-6 pb-24 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
          <TrophyIcon className="w-10 h-10" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isPureFullCompletion ? "Treino 100% Concluído" : "Treino Finalizado com Sucesso"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-heading">
            Sensacional!
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Seu treino da divisão <strong>{activeBlock.title}</strong> foi salvo e registrado com sucesso.
          </p>
        </div>

        {/* Real Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Horário
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] block tabular-nums">
              {isDurationReasonable
                ? `${diffMins} min`
                : startTimeFormatted && finishTimeFormatted
                ? `${startTimeFormatted} - ${finishTimeFormatted}`
                : finishDateFormatted}
            </span>
          </div>

          <div className="space-y-1 border-x border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Concluídos
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completedExercisesCount} de {totalExercisesCount}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Data
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] block tabular-nums">
              {finishDateFormatted}
            </span>
          </div>
        </div>

        {/* Confirmation of Trainer Feedback */}
        {studentNotes && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left text-xs space-y-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
              ✓ Suas observações foram enviadas ao seu personal
            </span>
            <p className="text-emerald-900/80 dark:text-emerald-200/80 italic">
              &quot;{studentNotes}&quot;
            </p>
          </div>
        )}

        {/* Return Button */}
        <div className="pt-2">
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Voltar aos meus treinos</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ACTIVE CHECKLIST SCREEN
  // --------------------------------------------------------------------------
  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-28 pt-2 px-3 sm:px-4">
      {/* 1. Header Compacto */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-all min-h-[44px]"
          >
            ← Voltar aos meus treinos
          </Link>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {workout.title}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight font-heading">
              {activeBlock.title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              {completedExercisesCount} de {totalExercisesCount} exercícios concluídos
              {skippedExercisesCount > 0 ? ` • ${skippedExercisesCount} pulado(s)` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFeedbackModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all min-h-[44px] cursor-pointer shrink-0"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Finalizar treino</span>
          </button>
        </div>

        {/* Barra de Progresso Única e Clara */}
        <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Lista de Exercícios em Checklist Ordenado */}
      <div className="space-y-4 pt-1">
        {blockItems.map((item, index) => {
          const status = itemStatuses[item.publicId] || "PENDING";
          const isDone = status === "COMPLETED";
          const isSkipped = status === "SKIPPED";
          const isNext = index === nextPendingIndex;
          const isLoading = loadingItemPublicId === item.publicId;

          const substituted = activeSubstitutions[item.publicId];
          const exerciseName = substituted?.performedExerciseName || item.exerciseNameSnapshot || "Exercício";

          // Prescribed parameters
          const setsCount = item.sets?.length || 3;
          const firstSet = item.sets?.[0];
          const repsLabel = firstSet?.targetRepsMax
            ? `${firstSet.targetReps} a ${firstSet.targetRepsMax} repetições`
            : firstSet?.targetReps
            ? `${firstSet.targetReps} repetições`
            : "Repetições prescritas";
          const loadLabel = firstSet?.targetLoadKg ? `${firstSet.targetLoadKg} kg` : null;
          const restSeconds = firstSet?.targetRestSeconds || null;

          const media = resolveExerciseExecutionMedia({ item });
          const hasNotes = Boolean(item.notes || item.instructionsSnapshot);
          const isAccordionOpen = Boolean(expandedAccordions[item.publicId]);

          const itemSets = sessionSetsByItemPublicId.get(item.publicId) || [];

          return (
            <div
              key={item.publicId}
              className={`p-4 sm:p-5 rounded-2xl border transition-all depth-surface ${
                isDone
                  ? "bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/30"
                  : isSkipped
                  ? "bg-zinc-100/60 dark:bg-[#181A1E] border-zinc-300 dark:border-zinc-700 opacity-75"
                  : isNext
                  ? "bg-white dark:bg-[#151619] border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30"
                  : "bg-white dark:bg-[#151619] border-[var(--border-default)]"
              }`}
            >
              {/* Top Row: Ordem + Status Badge + Músculo */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isSkipped
                        ? "bg-zinc-400 text-white"
                        : isNext
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                    }`}
                  >
                    {isDone ? "✓" : index + 1}
                  </span>

                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    Exercício {index + 1} de {totalExercisesCount}
                  </span>

                  {isDone && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Concluído
                    </span>
                  )}
                  {isSkipped && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Não realizado
                    </span>
                  )}
                  {isNext && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                      Próximo
                    </span>
                  )}
                </div>

                {item.muscleGroupSnapshot && (
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    {item.muscleGroupSnapshot}
                  </span>
                )}
              </div>

              {/* Nome do Exercício */}
              <div className="space-y-1 mb-3">
                <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                  {exerciseName}
                </h3>

                {substituted && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    Substituto de {item.exerciseNameSnapshot} ({substituted.reasonLabel})
                  </p>
                )}

                {/* Prescrição Legível */}
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                  {setsCount} {setsCount === 1 ? "série" : "séries"} de {repsLabel}
                  {loadLabel ? ` • Carga: ${loadLabel}` : ""}
                  {restSeconds ? ` • Descanso: ${restSeconds}s` : ""}
                </p>
              </div>

              {/* Observações / Cuidados Clínicos do Personal */}
              {hasNotes && (
                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 mb-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11px] uppercase tracking-wider">
                    <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Observações do personal:</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {item.notes || item.instructionsSnapshot}
                  </p>
                </div>
              )}

              {/* Botões de Apoio: Ver Execução + Iniciar Descanso */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {media.hasMedia && (
                  <button
                    type="button"
                    onClick={() => setVideoModalItem(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors min-h-[40px] cursor-pointer"
                  >
                    <PlayIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Ver execução</span>
                  </button>
                )}

                {restSeconds && restSeconds > 0 && (
                  <button
                    type="button"
                    onClick={() => startRest(restSeconds)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors min-h-[40px] cursor-pointer"
                  >
                    <ClockIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Descanso: {restSeconds}s</span>
                  </button>
                )}
              </div>

              {/* Ação Principal: Concluir Exercício (min-52px, verde Trevo One) */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {!isDone ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleToggleExercise(item, true)}
                    className="w-full sm:flex-1 min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckIcon className="w-5 h-5" />
                        <span>Concluir exercício</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full sm:flex-1 flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Exercício concluído
                    </span>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleToggleExercise(item, false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Desfazer
                    </button>
                  </div>
                )}

                {/* Ações Complementares: Trocar / Pular */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSwapModalItem(item)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-[var(--border-subtle)] transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <SwapIcon className="w-3.5 h-3.5" />
                    <span>Trocar</span>
                  </button>

                  {!isDone && !isSkipped && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSkipExercise(item)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer"
                    >
                      Pular
                    </button>
                  )}
                </div>
              </div>

              {/* Accordion Opcional: Registrar Séries e Cargas */}
              <div className="pt-2 border-t border-[var(--border-subtle)] mt-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAccordions((prev) => ({
                      ...prev,
                      [item.publicId]: !prev[item.publicId],
                    }))
                  }
                  className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 transition-colors cursor-pointer"
                >
                  <span>Registrar séries e cargas (opcional)</span>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isAccordionOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isAccordionOpen && (
                  <div className="pt-3 pb-1 space-y-2.5 animate-in fade-in duration-200">
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      Se você desejar, anote as cargas e repetições reais executadas. Campos não preenchidos serão salvos como em branco.
                    </p>

                    <div className="space-y-2">
                      {itemSets.map((s, sIdx) => {
                        const localVal = localSetValues[s.publicId] || {
                          reps: s.actualReps != null ? String(s.actualReps) : "",
                          load: s.actualLoadKg != null ? String(s.actualLoadKg) : "",
                        };

                        return (
                          <div
                            key={s.publicId}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
                          >
                            <span className="w-16 text-xs font-bold text-[var(--text-primary)] shrink-0">
                              Série {sIdx + 1}
                            </span>

                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder={s.prescribedLoadKg ? `${s.prescribedLoadKg} kg` : "Carga (kg)"}
                                value={localVal.load}
                                onChange={(e) =>
                                  setLocalSetValues((prev) => ({
                                    ...prev,
                                    [s.publicId]: { ...localVal, load: e.target.value },
                                  }))
                                }
                                onBlur={() => handleSaveSetLoadReps(s)}
                                className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                              />

                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={s.prescribedReps ? `${s.prescribedReps} reps` : "Reps"}
                                value={localVal.reps}
                                onChange={(e) =>
                                  setLocalSetValues((prev) => ({
                                    ...prev,
                                    [s.publicId]: { ...localVal, reps: e.target.value },
                                  }))
                                }
                                onBlur={() => handleSaveSetLoadReps(s)}
                                className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Rodapé com Botão Principal de Finalização */}
      <div className="pt-4 pb-8 space-y-3">
        <button
          type="button"
          onClick={() => setIsFeedbackModalOpen(true)}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckIcon className="w-5 h-5" />
          <span>Finalizar treino</span>
        </button>

        {onToggleOverview && (
          <button
            type="button"
            onClick={onToggleOverview}
            className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
          >
            Ver ficha completa de treino
          </button>
        )}
      </div>

      {/* 4. Timer de Descanso Flutuante Não-Bloqueante */}
      {activeRestSeconds !== null && (
        <div className="fixed bottom-6 right-4 sm:right-8 z-40 p-4 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-700 space-y-2 animate-in slide-in-from-bottom-4 duration-200 min-w-[240px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Descanso
            </span>
            <button
              type="button"
              onClick={skipRest}
              className="text-zinc-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-black tabular-nums tracking-tight">
              {Math.floor(activeRestSeconds / 60)}:
              {String(activeRestSeconds % 60).padStart(2, "0")}
            </span>
            <span className="text-[10px] text-zinc-400">
              de {restInitialSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => addRestSeconds(15)}
              className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
            >
              +15 s
            </button>
            <button
              type="button"
              onClick={skipRest}
              className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* 5. Modal de Feedback ao Personal */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#151619] border border-[var(--border-default)] shadow-2xl p-6 sm:p-7 space-y-5 text-left max-h-[90vh] overflow-y-auto depth-surface">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight font-heading">
                  Como foi o treino?
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Divisão: <strong>{activeBlock.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-[var(--surface-subtle)]"
              >
                ✕
              </button>
            </div>

            {/* Pergunta: Conseguiu fazer tudo? */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Conseguiu fazer tudo?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "ALL", label: "Sim, tudo" },
                  { value: "PARTIAL", label: "Fiz parte" },
                  { value: "NONE", label: "Não consegui" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCompletionState(opt.value as "ALL" | "PARTIAL" | "NONE")}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      completionState === opt.value
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30"
                        : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inconsistency Warning (gentle check against checklist) */}
            {completionState === "ALL" && completedExercisesCount < totalExercisesCount && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold block">
                  Atenção: existem {totalExercisesCount - completedExercisesCount} exercício(s) pendente(s) no checklist.
                </span>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                  Você pode voltar para marcá-los ou finalizar agora mesmo. Seu personal receberá o resumo fiel.
                </p>
              </div>
            )}

            {/* Campo Opcional: Dúvidas ou Observações para o Personal */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Dúvidas ou observações para seu personal (opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Conte o que foi difícil ou o que você quer perguntar..."
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Relato Opcional de Desconforto/Dor */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={hasDiscomfort}
                  onChange={(e) => setHasDiscomfort(e.target.checked)}
                  className="rounded border-[var(--border-default)] text-emerald-600 focus:ring-emerald-500"
                />
                <span>Senti algum desconforto ou dor durante o treino</span>
              </label>

              {hasDiscomfort && (
                <input
                  type="text"
                  placeholder="Ex: Leve pontada no ombro direito durante o supino..."
                  value={discomfortNotes}
                  onChange={(e) => setDiscomfortNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500"
                />
              )}
            </div>

            {finalizeError && (
              <p className="text-xs text-red-500 font-semibold">{finalizeError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => setIsFeedbackModalOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl border border-[var(--border-default)] text-xs sm:text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleFinalizeWorkoutSubmit}
                className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isFinalizing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Finalizando treino...</span>
                  </>
                ) : (
                  <span>Finalizar e enviar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal de Vídeo / Mídia da Execução */}
      {videoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {videoModalItem.exerciseNameSnapshot || "Execução do Exercício"}
                </h3>
                {videoModalItem.muscleGroupSnapshot && (
                  <span className="text-xs text-zinc-400">
                    {videoModalItem.muscleGroupSnapshot}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setVideoModalItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {(() => {
              const m = resolveExerciseExecutionMedia({ item: videoModalItem });
              if (!m.hasMedia || !m.url) {
                return (
                  <p className="text-xs text-zinc-400 p-6 text-center">
                    Demonstração em vídeo não cadastrada para este exercício.
                  </p>
                );
              }
              if (m.isVideo) {
                return (
                  <video
                    src={m.url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full rounded-2xl max-h-[60vh] object-contain bg-black"
                  />
                );
              }
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.url}
                  alt={videoModalItem.exerciseNameSnapshot || "Exercício"}
                  className="w-full rounded-2xl max-h-[60vh] object-contain bg-black"
                />
              );
            })()}

            {videoModalItem.instructionsSnapshot && (
              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                {videoModalItem.instructionsSnapshot}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 7. Modal de Substituição de Exercício */}
      {swapModalItem && (
        <StudentExerciseSwapModal
          isOpen={Boolean(swapModalItem)}
          onClose={() => setSwapModalItem(null)}
          consultancySlug={consultancySlug}
          sessionPublicId={activeSession.publicId}
          originalBlockItemPublicId={swapModalItem.publicId}
          originalExerciseName={swapModalItem.exerciseNameSnapshot || "Exercício"}
          muscleGroup={swapModalItem.muscleGroupSnapshot}
          remainingSwaps={remainingSwaps}
          onSwapConfirmed={() => {
            setSwapModalItem(null);
            // Refresh local session
            if (activeSession) {
              onSessionUpdated?.({ ...activeSession });
            }
          }}
          onSkipExercise={() => {
            if (swapModalItem) {
              handleSkipExercise(swapModalItem);
              setSwapModalItem(null);
            }
          }}
        />
      )}
    </div>
  );
}
