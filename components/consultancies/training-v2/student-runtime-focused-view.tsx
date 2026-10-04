"use client";

import { useState, useEffect } from "react";
import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
  WorkoutExecutionHistorySessionDto,
  WorkoutBlockItemDto,
} from "@/lib/training-v2/types";
import { parseActiveRest } from "./workout-category-card";
import { RestTimer, type ActiveRestState } from "./rest-timer";
import { MobileBottomSheet } from "@/components/ui/mobile";

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Play({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
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

function isValidVideoUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  );
}

type StudentRuntimeFocusedViewProps = {
  workout: StudentWorkoutViewContract;
  activeSession: WorkoutExecutionSessionDto;
  onCompleteSet: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  loadingSetPublicId: string | null;
  activeRest: ActiveRestState | null | undefined;
  onSkipRest: () => void;
  onCompleteWorkout: () => Promise<void>;
  isCompleting: boolean;
  completeError: string | null;
  history: WorkoutExecutionHistorySessionDto[];
  consultancySlug?: string;
  onToggleOverview: () => void;
  isOffline?: boolean;
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
}: StudentRuntimeFocusedViewProps) {
  // 1. Identify all ordered sets and partition into completed vs pending
  const sets = activeSession.sets || [];
  const completedSets = sets.filter((s) => s.completedAt != null);
  const pendingSets = sets.filter((s) => s.completedAt == null);

  const allCompleted = sets.length > 0 && pendingSets.length === 0;
  const currentSet = pendingSets[0] as WorkoutExecutionSetDto | undefined;

  // 2. Locate the active block, item and combination for currentSet
  const currentItemContext = (() => {
    if (!currentSet) return null;

    for (const block of workout.blocks || []) {
      for (let itemIdx = 0; itemIdx < (block.items || []).length; itemIdx++) {
        const item = block.items[itemIdx];
        if (item.publicId === currentSet.blockItemPublicId) {
          const combination = item.combinationPublicId
            ? block.combinations?.find((c) => c.publicId === item.combinationPublicId) || null
            : null;

          let combLetter = "";
          let nextCombItem: WorkoutBlockItemDto | null = null;
          let isLastInCombRound = true;

          if (combination) {
            const combItems = block.items.filter((it) => it.combinationPublicId === combination.publicId);
            const memberIdx = combItems.findIndex((it) => it.publicId === item.publicId);
            combLetter = String.fromCharCode(65 + Math.max(0, memberIdx));
            if (memberIdx >= 0 && memberIdx < combItems.length - 1) {
              nextCombItem = combItems[memberIdx + 1];
              isLastInCombRound = false;
            }
          }

          // Count how many sets of this item are completed
          const itemCompletedSets = completedSets.filter(
            (s) => s.blockItemPublicId === item.publicId
          ).length;
          const totalItemSets = sets.filter(
            (s) => s.blockItemPublicId === item.publicId
          ).length;

          return {
            block,
            item,
            combination,
            combLetter,
            nextCombItem,
            isLastInCombRound,
            itemCompletedSets,
            totalItemSets,
            currentRoundOrSet: itemCompletedSets + 1,
          };
        }
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
        // Pick the set matching current round, or the first one
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

  // 4. Input state for current set (reps & load) derived per set ID
  const [draftInputs, setDraftInputs] = useState<Record<string, { reps?: number; loadKg?: string }>>({});
  const [isExecutionSheetOpen, setIsExecutionSheetOpen] = useState(false);

  const currentDraft = currentSet ? draftInputs[currentSet.publicId] : undefined;
  const reps = currentDraft?.reps ?? currentSet?.prescribedReps ?? 10;
  const loadKg =
    currentDraft?.loadKg ??
    (currentSet?.prescribedLoadKg != null && currentSet.prescribedLoadKg > 0
      ? String(currentSet.prescribedLoadKg)
      : "");

  const setReps = (newReps: number | ((prev: number) => number)) => {
    if (!currentSet) return;
    const computed = typeof newReps === "function" ? newReps(reps) : newReps;
    setDraftInputs((prev) => ({
      ...prev,
      [currentSet.publicId]: { ...prev[currentSet.publicId], reps: computed },
    }));
  };

  const setLoadKg = (newLoad: string) => {
    if (!currentSet) return;
    setDraftInputs((prev) => ({
      ...prev,
      [currentSet.publicId]: { ...prev[currentSet.publicId], loadKg: newLoad },
    }));
  };

  // Overall workout progress metrics
  const totalSetsCount = sets.length;
  const completedSetsCount = completedSets.length;
  const progressPercent = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

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
    if (!currentSet || loadingSetPublicId) return;

    const parsedLoad = loadKg.trim() !== "" ? parseFloat(loadKg.replace(",", ".")) : null;
    const cleanLoad = parsedLoad != null && !isNaN(parsedLoad) && parsedLoad > 0 ? parsedLoad : null;

    await onCompleteSet(currentSet.publicId, {
      actualReps: Math.max(1, reps),
      actualLoadKg: cleanLoad,
    });
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
        <div className="w-16 h-16 mx-auto rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
          <TrophyIcon className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
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
        <div className="grid grid-cols-3 gap-2.5 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Duração
            </span>
            <span className="text-lg font-extrabold text-[var(--text-primary)]">
              {elapsedMinutes > 0 ? `${elapsedMinutes}m` : "< 1m"}
            </span>
          </div>
          <div className="space-y-0.5 border-x border-[var(--border-subtle)]">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Séries
            </span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {completedSetsCount}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">
              Exercícios
            </span>
            <span className="text-lg font-extrabold text-[var(--text-primary)]">
              {workout.blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0)}
            </span>
          </div>
        </div>

        {completeError && (
          <p className="text-xs text-red-500 font-semibold">{completeError}</p>
        )}

        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={onCompleteWorkout}
            disabled={isCompleting}
            className="w-full min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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

          <button
            type="button"
            onClick={onToggleOverview}
            className="w-full min-h-[44px] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
          >
            Revisar treino completo
          </button>
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
  const hasVideo = isValidVideoUrl(item.customVideoUrl) || (item.pinnedMedia && item.pinnedMedia.length > 0);

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))] select-none">
      {/* RUNTIME TOP BAR: PROGRESS & OVERVIEW TOGGLE */}
      <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[var(--text-primary)] font-bold truncate max-w-[190px]">
              {workout.title}
            </span>
            {isOffline && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Offline
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleOverview}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[36px]"
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>Ver tudo</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <span>Série {completedSetsCount + 1} de {totalSetsCount}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ACTIVE REST NOTIFICATION (IF CURRENTLY RESTING) */}
      {activeRest && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-xs space-y-2.5 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {activeRestInfo ? "Descanso Ativo" : "Intervalo de Descanso"}
              </span>
            </div>
            {activeRestInfo && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                {activeRestInfo}
              </span>
            )}
          </div>

          <RestTimer activeRest={activeRest} onSkip={onSkipRest} />
        </div>
      )}

      {/* ==================================================================== */}
      {/* CURRENT EXERCISE FOCUS CARD ("O QUE EU FAÇO AGORA") */}
      {/* ==================================================================== */}
      <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-xs space-y-4 depth-surface">
        {/* Combination Badge & Header */}
        {combination ? (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                {combination.combinationType.replace("_", "-")} • Rodada {currentRoundOrSet} de {totalItemSets}
              </span>
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                {combLetter}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-tertiary)]">
              {block.title || "Treino"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {block.title || "Exercício Individual"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
              Série {currentRoundOrSet} de {totalItemSets}
            </span>
          </div>
        )}

        {/* Exercise Title */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading leading-tight">
            {item.exerciseNameSnapshot}
          </h1>

          {/* METHOD / OBSERVATION IN PROMINENT POSITION (UNDER TITLE) */}
          {hasMethodNote && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300">
              <span className="text-amber-500">⚡</span>
              <span>Método: {item.notes}</span>
            </div>
          )}

          {/* Meta details & execution action */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[var(--text-secondary)]">
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

            {/* Ver Execução Button */}
            <button
              type="button"
              onClick={() => setIsExecutionSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer min-h-[38px]"
            >
              {hasVideo ? <VideoIcon className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Ver execução</span>
            </button>
          </div>
        </div>

        {/* Historical Reference (Discreet) */}
        {lastPerformance && (
          <div className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
            <span className="font-semibold text-[var(--text-secondary)]">Último registro</span>
            <span className="font-bold text-[var(--text-primary)]">{lastPerformance}</span>
          </div>
        )}

        {/* ================================================================== */}
        {/* PRESCRIBED VS PERFORMED INPUT CARDS */}
        {/* ================================================================== */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Repetições */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] space-y-2 text-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Repetições
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Prescrito: {currentSet.prescribedRepsMax && currentSet.prescribedRepsMax !== currentSet.prescribedReps ? `${currentSet.prescribedReps}-${currentSet.prescribedRepsMax}` : currentSet.prescribedReps || "Livre"}
              </span>
            </div>

            {/* Stepper Touch Row */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <button
                type="button"
                onClick={() => setReps((r) => Math.max(1, r - 1))}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                aria-label="Diminuir repetições"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value, 10) || 1)}
                className="w-16 h-10 text-center font-extrabold text-xl text-[var(--text-primary)] bg-[var(--surface)] rounded-xl border border-[var(--border-default)] focus:border-[var(--brand)] outline-none"
              />
              <button
                type="button"
                onClick={() => setReps((r) => r + 1)}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                aria-label="Aumentar repetições"
              >
                +
              </button>
            </div>
          </div>

          {/* Carga (Kg) */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] space-y-2 text-center">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Carga (kg)
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                {/* Rule 25: Never show 0 kg */}
                Prescrito: {currentSet.prescribedLoadKg && currentSet.prescribedLoadKg > 0 ? `${currentSet.prescribedLoadKg} kg` : "Livre"}
              </span>
            </div>

            {/* Stepper / Quick Input Touch Row */}
            <div className="flex items-center justify-between gap-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  const curr = parseFloat(loadKg) || 0;
                  setLoadKg(String(Math.max(0, curr - 2)));
                }}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                aria-label="Diminuir carga"
              >
                −
              </button>
              <input
                type="text"
                inputMode="decimal"
                placeholder="kg"
                value={loadKg}
                onChange={(e) => setLoadKg(e.target.value)}
                className="w-16 h-10 text-center font-extrabold text-lg text-[var(--text-primary)] bg-[var(--surface)] rounded-xl border border-[var(--border-default)] focus:border-[var(--brand)] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const curr = parseFloat(loadKg) || 0;
                  setLoadKg(String(curr + 2));
                }}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-extrabold text-base flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                aria-label="Aumentar carga"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Next Step Information */}
        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          {combination && !isLastInCombRound && nextCombItem ? (
            <p className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
              <span>⚡</span>
              <span>
                Próximo na combinação: {String.fromCharCode(combLetter.charCodeAt(0) + 1)} • {nextCombItem.exerciseNameSnapshot} (sem descanso agora)
              </span>
            </p>
          ) : currentSet.prescribedRestSeconds && currentSet.prescribedRestSeconds > 0 ? (
            <p className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span>Próximo: Descanso de {currentSet.prescribedRestSeconds}s</span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 font-medium">
              <span>✓</span>
              <span>Próximo: Próxima série ou exercício</span>
            </p>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* STICKY BOTTOM ACTION BAR (IN THUMB ZONE & SAFE AREA) */}
      {/* ==================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] shadow-xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleConfirmCurrentSet}
          disabled={Boolean(loadingSetPublicId)}
          className="w-full min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-base shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loadingSetPublicId === currentSet.publicId ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Registrando série...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>CONCLUIR SÉRIE</span>
            </>
          )}
        </button>
      </div>

      {/* INSTRUCTION & VIDEO BOTTOM SHEET */}
      <MobileBottomSheet
        isOpen={isExecutionSheetOpen}
        onClose={() => setIsExecutionSheetOpen(false)}
        title={item.exerciseNameSnapshot}
        subtitle="Orientações e execução técnica"
      >
        <div className="space-y-4 py-1">
          {/* Video Section (if valid video exists) */}
          {hasVideo && (
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {isValidVideoUrl(item.customVideoUrl) ? (
                <video
                  src={item.customVideoUrl!}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : item.pinnedMedia && item.pinnedMedia.length > 0 && item.pinnedMedia[0].mediaAsset?.publicId ? (
                <video
                  src={`/api/training-v2/media/${item.pinnedMedia[0].mediaAsset.publicId}`}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-white text-xs">Vídeo de demonstração indisponível</div>
              )}
            </div>
          )}

          {/* Instructions text */}
          {item.instructionsSnapshot && (
            <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Instruções de Execução
              </span>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                {item.instructionsSnapshot}
              </p>
            </div>
          )}

          {/* Target muscles & equipment */}
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
    </div>
  );
}
