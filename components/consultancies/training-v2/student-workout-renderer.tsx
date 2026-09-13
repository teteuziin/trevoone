"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
  WorkoutExecutionHistorySessionDto,
  WorkoutExecutionHistorySetDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemSetDto,
} from "@/lib/training-v2/types";
import {
  startOrResumeWorkoutExecutionAction,
  completeWorkoutExecutionSetAction,
  completeWorkoutExecutionAction,
} from "@/app/consultoria/[slug]/treinos/actions";
import {
  RestTimer,
  getInitialActiveRest,
  markRestTimerSkipped,
  type ActiveRestState,
} from "./rest-timer";

function Check({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function Repeat({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="17 1 21 5 17 9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function Flame({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function Heart({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function Info({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const METHOD_LABELS: Record<string, string> = {
  SINGLE: "Série Simples",
  BI_SET: "Bi-Set",
  TRI_SET: "Tri-Set",
  SUPER_SET: "Super-Série",
  CIRCUIT: "Circuito",
  DROP_SET: "Drop-Set",
  REST_PAUSE: "Rest-Pause",
  COMBINED_SET: "Série Combinada",
  WARMUP: "Aquecimento",
  CARDIO: "Cardio",
  CUSTOM: "Exercício Personalizado",
};

const SET_TYPE_LABELS: Record<string, string> = {
  WARMUP: "Aquecimento",
  FEEDER: "Aproximação",
  NORMAL: "Série Principal",
  DROP_STAGE: "Redução",
  REST_PAUSE_MINI: "Mini-série",
  FAILURE: "Até a Falha",
};

function formatReps(set: WorkoutItemSetDto): string {
  if (set.targetReps != null && set.targetRepsMax != null && set.targetReps !== set.targetRepsMax) {
    return `${set.targetReps}–${set.targetRepsMax} reps`;
  }
  if (set.targetReps != null) {
    return `${set.targetReps} reps`;
  }
  return "Reps livre";
}

function formatLoad(set: WorkoutItemSetDto): string | null {
  if (set.targetLoadKg != null) {
    return `${set.targetLoadKg} kg`;
  }
  return null;
}

function formatRest(seconds?: number | null, options?: { includeWord?: boolean }): string | null {
  if (!seconds || seconds <= 0) return null;
  const word = options?.includeWord ? " descanso" : "";
  if (seconds <= 60) {
    return `${seconds}s${word}`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (rem === 0) {
    return `${mins} min${word}`;
  }
  return `${mins}m ${rem}s${word}`;
}

type ParsedInstructions =
  | { type: "steps"; preamble: string | null; steps: string[] }
  | { type: "paragraphs"; preamble: null; paragraphs: string[] };

function parseInstructions(rawText?: string | null): ParsedInstructions | null {
  if (!rawText || !rawText.trim()) return null;
  const trimmed = rawText.trim();

  const markerRegex = /(?:^|\n|\s+)(\d+)[\.\)]\s+/g;
  const matches = [...trimmed.matchAll(markerRegex)];

  if (matches.length > 0 && matches[0][1] === "1") {
    const isMultiStep = matches.length >= 2;
    const isExplicitLineStep = matches.length === 1 && /(?:^|\n)\s*1[\.\)]\s+/.test(trimmed);

    if (isMultiStep || isExplicitLineStep) {
      const fullMatch = matches[0][0];
      const matchIndex = matches[0].index;
      const digitOffset = fullMatch.search(/\d/);
      const step1Start = matchIndex + digitOffset;

      const preamble = step1Start > 0 ? trimmed.slice(0, step1Start).trim() : null;

      const steps: string[] = [];
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = i + 1 < matches.length ? matches[i + 1] : null;

        const contentStart = currentMatch.index + currentMatch[0].length;
        let contentEnd = trimmed.length;
        if (nextMatch) {
          const nextDigitOffset = nextMatch[0].search(/\d/);
          contentEnd = nextMatch.index + nextDigitOffset;
        }

        const stepText = trimmed.slice(contentStart, contentEnd).trim();
        if (stepText) {
          steps.push(stepText);
        }
      }

      if (steps.length > 0) {
        return { type: "steps", preamble, steps };
      }
    }
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    type: "paragraphs",
    preamble: null,
    paragraphs: paragraphs.length > 0 ? paragraphs : [trimmed],
  };
}

function formatCompactPrescriptionSummary(sets: WorkoutItemSetDto[]): string {
  if (!sets || sets.length === 0) return "";
  const count = sets.length;
  const s0 = sets[0];
  const allSameReps = sets.every(
    (s) => s.targetReps === s0.targetReps && s.targetRepsMax === s0.targetRepsMax
  );
  const allSameLoad = sets.every((s) => s.targetLoadKg === s0.targetLoadKg);
  const allSameRest = sets.every((s) => s.targetRestSeconds === s0.targetRestSeconds);

  const parts: string[] = [];

  if (allSameReps) {
    if (s0.targetReps != null && s0.targetRepsMax != null && s0.targetReps !== s0.targetRepsMax) {
      parts.push(`${count} × ${s0.targetReps}–${s0.targetRepsMax} reps`);
    } else if (s0.targetReps != null) {
      parts.push(`${count} × ${s0.targetReps} reps`);
    } else {
      parts.push(`${count} ${count === 1 ? "série" : "séries"}`);
    }
  } else {
    parts.push(`${count} ${count === 1 ? "série" : "séries"}`);
  }

  if (allSameLoad && s0.targetLoadKg != null) {
    parts.push(`${s0.targetLoadKg} kg`);
  }

  if (allSameRest && s0.targetRestSeconds != null && s0.targetRestSeconds > 0) {
    const formatted = formatRest(s0.targetRestSeconds);
    if (formatted) parts.push(formatted);
  }

  return parts.join(" · ");
}

function InstructionsAccordion({ instructions }: { instructions: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const parsed = useMemo(() => parseInstructions(instructions), [instructions]);

  if (!parsed) return null;

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] text-xs font-semibold text-[var(--foreground)] transition-colors cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Como executar</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-[var(--foreground-muted)] font-normal">
          <span>{isOpen ? "Ocultar" : "Ver instruções"}</span>
          <ChevronDownIcon
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--foreground)]">
          {parsed.type === "steps" ? (
            <div className="space-y-2.5">
              {parsed.preamble && (
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {parsed.preamble}
                </p>
              )}
              <ol className="space-y-2">
                {parsed.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--foreground)] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="space-y-2">
              {parsed.paragraphs.map((para, idx) => (
                <p key={idx} className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type StudentWorkoutRendererProps = {
  workout: StudentWorkoutViewContract;
  initialExecution?: WorkoutExecutionSessionDto | null;
  initialHistory?: WorkoutExecutionHistorySessionDto[];
  consultancySlug?: string;
};

export function StudentWorkoutRenderer({
  workout,
  initialExecution = null,
  initialHistory = [],
  consultancySlug,
}: StudentWorkoutRendererProps) {
  const [activeSession, setActiveSession] = useState<WorkoutExecutionSessionDto | null>(
    initialExecution || null
  );
  const [completedSessions, setCompletedSessions] = useState<WorkoutExecutionHistorySessionDto[]>([]);

  const history = useMemo(() => {
    const map = new Map<string, WorkoutExecutionHistorySessionDto>();
    for (const s of completedSessions) {
      map.set(s.publicId, s);
    }
    for (const s of initialHistory) {
      if (!map.has(s.publicId)) {
        map.set(s.publicId, s);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return db - da;
    });
  }, [completedSessions, initialHistory]);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [loadingSetPublicId, setLoadingSetPublicId] = useState<string | null>(null);
  const [setErrors, setSetErrors] = useState<Record<string, string>>({});
  const [manualRest, setManualRest] = useState<ActiveRestState | null | undefined>(undefined);

  // Session-scoped UI expansion and draft state
  // Keyed by activeSession.publicId to ensure:
  // 1) Values and expansions are preserved during re-renders and set collapse within the same execution
  // 2) When "Treinar novamente" starts a new session, its state automatically resets (no inherited drafts, future sets collapsed)
  const [expandedSetsBySession, setExpandedSetsBySession] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [draftsBySession, setDraftsBySession] = useState<
    Record<string, Record<string, { reps: string; load: string }>>
  >({});

  const currentSessionKey = activeSession?.publicId || "preview";
  const expandedFutureSets = expandedSetsBySession[currentSessionKey] || {};
  const sessionDrafts = draftsBySession[currentSessionKey] || {};

  const handleToggleExpandSet = (setKey: string, expanded: boolean) => {
    setExpandedSetsBySession((prev) => ({
      ...prev,
      [currentSessionKey]: {
        ...(prev[currentSessionKey] || {}),
        [setKey]: expanded,
      },
    }));
  };

  const handleDraftChange = (setKey: string, draft: { reps: string; load: string }) => {
    setDraftsBySession((prev) => ({
      ...prev,
      [currentSessionKey]: {
        ...(prev[currentSessionKey] || {}),
        [setKey]: draft,
      },
    }));
  };

  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const initialRest = useMemo(
    () => (isMounted ? getInitialActiveRest(initialExecution) : null),
    [isMounted, initialExecution]
  );

  const activeRest = manualRest !== undefined ? manualRest : initialRest;

  function handleSkipRest() {
    if (activeSession && activeRest) {
      markRestTimerSkipped(
        activeSession.publicId,
        activeRest.setPublicId,
        activeRest.targetEndAt
      );
    }
    setManualRest(null);
  }

  const blocks = workout.blocks || [];

  const totalSets = activeSession?.sets?.length || 0;
  const completedSets = activeSession?.sets?.filter((s) => s.completedAt != null).length || 0;
  const allSetsCompleted = totalSets > 0 && completedSets === totalSets;

  async function handleStartWorkout() {
    if (!consultancySlug || isStarting || activeSession?.status === "IN_PROGRESS") return;

    setIsStarting(true);
    setStartError(null);

    try {
      const res = await startOrResumeWorkoutExecutionAction(
        consultancySlug,
        workout.assignmentPublicId
      );

      if (res.success && res.session) {
        setActiveSession(res.session);
        setManualRest(null);
      } else {
        setStartError(res.error || "Erro ao iniciar o treino.");
      }
    } catch {
      setStartError("Erro de conexão ao iniciar o treino.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleCompleteWorkout() {
    if (!consultancySlug || !activeSession || activeSession.status !== "IN_PROGRESS" || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setCompleteError(null);

    try {
      const res = await completeWorkoutExecutionAction(
        consultancySlug,
        activeSession.publicId
      );

      if (res.success && res.session) {
        const completedSession = res.session;
        setActiveSession(completedSession);
        setManualRest(null);

        // Prepend the freshly completed session to local history view
        const completedHistorySession: WorkoutExecutionHistorySessionDto = {
          publicId: completedSession.publicId,
          startedAt: completedSession.startedAt,
          completedAt: completedSession.completedAt,
          sets: completedSession.sets.map((s) => {
            let exName = "Exercício";
            for (const b of workout.blocks) {
              for (const item of b.items) {
                if (s.blockItemPublicId && item.publicId === s.blockItemPublicId) {
                  exName = item.exerciseNameSnapshot;
                  break;
                }
              }
            }
            return {
              publicId: s.publicId,
              setNumber: s.setNumber,
              exerciseName: exName,
              blockItemPublicId: s.blockItemPublicId,
              setType: s.setType,
              prescribedReps: s.prescribedReps,
              prescribedRepsMax: s.prescribedRepsMax,
              prescribedLoadKg: s.prescribedLoadKg,
              prescribedRestSeconds: s.prescribedRestSeconds,
              actualReps: s.actualReps,
              actualLoadKg: s.actualLoadKg,
              completedAt: s.completedAt,
            };
          }),
        };
        setCompletedSessions((prev) => [
          completedHistorySession,
          ...prev.filter((item) => item.publicId !== completedSession.publicId),
        ]);
      } else {
        setCompleteError(res.error || "Erro ao finalizar o treino.");
      }
    } catch {
      setCompleteError("Erro de conexão ao finalizar o treino.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleCompleteSet(
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) {
    if (!consultancySlug || !activeSession || activeSession.status !== "IN_PROGRESS" || loadingSetPublicId) {
      return;
    }

    setLoadingSetPublicId(setPublicId);
    setSetErrors((prev) => {
      const copy = { ...prev };
      delete copy[setPublicId];
      return copy;
    });

    try {
      const res = await completeWorkoutExecutionSetAction(
        consultancySlug,
        activeSession.publicId,
        setPublicId,
        input
      );

      if (res.success && res.set) {
        const updatedSet = res.set;
        setActiveSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            sets: prev.sets.map((s) => (s.publicId === updatedSet.publicId ? updatedSet : s)),
          };
        });

        if (updatedSet.prescribedRestSeconds != null && updatedSet.prescribedRestSeconds > 0) {
          setManualRest({
            setPublicId: updatedSet.publicId,
            setNumber: updatedSet.setNumber,
            blockItemPublicId: updatedSet.blockItemPublicId,
            totalSeconds: updatedSet.prescribedRestSeconds,
            targetEndAt: Date.now() + updatedSet.prescribedRestSeconds * 1000,
          });
        } else {
          setManualRest(null);
        }
      } else {
        setSetErrors((prev) => ({
          ...prev,
          [setPublicId]: res.error || "Erro ao concluir série.",
        }));
      }
    } catch {
      setSetErrors((prev) => ({
        ...prev,
        [setPublicId]: "Erro de conexão ao concluir série.",
      }));
    } finally {
      setLoadingSetPublicId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Workout Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {workout.title}
          </h1>
          {workout.subtitle && (
            <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-0.5">
              {workout.subtitle}
            </p>
          )}
        </div>

        {/* Compact Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--foreground-muted)]">
          <span className="font-medium text-[var(--foreground)]">{workout.consultancyName}</span>
          <span>•</span>
          <span>{blocks.length} {blocks.length === 1 ? "bloco" : "blocos"}</span>
          {workout.estimatedDurationMinutes != null && (
            <>
              <span>•</span>
              <span>{workout.estimatedDurationMinutes} min</span>
            </>
          )}
          {workout.difficultyLevel && (
            <>
              <span>•</span>
              <span>
                {workout.difficultyLevel === "BEGINNER"
                  ? "Iniciante"
                  : workout.difficultyLevel === "ADVANCED"
                  ? "Avançado"
                  : "Intermediário"}
              </span>
            </>
          )}
          <span>•</span>
          <span>v{workout.versionNumber}</span>
          {workout.startsOn && (
            <>
              <span>•</span>
              <span>Prescrito em {workout.startsOn}</span>
            </>
          )}
        </div>

        {workout.notesForStudent && (
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--foreground)] space-y-0.5">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Orientações do seu treinador:
            </p>
            <p className="text-[var(--foreground-muted)] italic leading-relaxed">
              &ldquo;{workout.notesForStudent}&rdquo;
            </p>
          </div>
        )}

        {workout.objective && (
          <p className="text-xs text-[var(--foreground-muted)]">
            <span className="font-medium text-[var(--foreground)]">Objetivo: </span>
            {workout.objective}
          </p>
        )}

        {/* Execution Control Area - Informational status & Single Start Action */}
        {consultancySlug && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            {activeSession && activeSession.status === "COMPLETED" ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Treino concluído</span>
                {activeSession.completedAt && (
                  <span suppressHydrationWarning className="text-[11px] font-normal text-emerald-600/80 dark:text-emerald-400/80">
                    • Concluído às {new Date(activeSession.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            ) : activeSession && activeSession.status === "IN_PROGRESS" ? (
              allSetsCompleted ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Todas as séries concluídas</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Treino em andamento</span>
                  <span suppressHydrationWarning className="text-[11px] font-normal text-emerald-600/80 dark:text-emerald-400/80">
                    • Iniciado às {new Date(activeSession.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )
            ) : (
              <div className="w-full sm:w-auto space-y-1.5">
                <button
                  type="button"
                  onClick={handleStartWorkout}
                  disabled={isStarting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isStarting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Iniciando treino...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar treino</span>
                    </>
                  )}
                </button>
                {startError && (
                  <p className="text-xs text-red-500 font-medium">
                    {startError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blocks List */}
      <div className="space-y-5">
        {blocks.map((block, blockIndex) => (
          <BlockCard
            key={block.publicId}
            block={block}
            blockIndex={blockIndex}
            activeSession={activeSession}
            loadingSetPublicId={loadingSetPublicId}
            setErrors={setErrors}
            onCompleteSet={handleCompleteSet}
            activeRest={activeRest}
            onSkipRest={handleSkipRest}
            expandedFutureSets={expandedFutureSets}
            onToggleExpandSet={handleToggleExpandSet}
            sessionDrafts={sessionDrafts}
            onDraftChange={handleDraftChange}
          />
        ))}

        {/* Bottom Completion Banner */}
        {activeSession && activeSession.status === "IN_PROGRESS" && allSetsCompleted && (
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)]">
                Todas as séries concluídas!
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Você completou todas as séries prescritas. Finalize para registrar seu treino.
              </p>
            </div>
            {completeError && (
              <p className="text-xs text-red-500 font-medium">{completeError}</p>
            )}
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={handleCompleteWorkout}
                disabled={isCompleting}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCompleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Finalizar treino</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeSession && activeSession.status === "COMPLETED" && (
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">
                Treino concluído!
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Parabéns! Todas as séries deste treino foram finalizadas com sucesso.
              </p>
            </div>
            <div className="pt-1 flex flex-col items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={handleStartWorkout}
                disabled={isStarting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isStarting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Treinar novamente</span>
                  </>
                )}
              </button>
              {startError && (
                <p className="text-xs text-red-500 font-medium">
                  {startError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Execution History */}
      <WorkoutExecutionHistorySection history={history} />
    </div>
  );
}

function BlockCard({
  block,
  blockIndex,
  activeSession,
  loadingSetPublicId,
  setErrors,
  onCompleteSet,
  activeRest,
  onSkipRest,
  expandedFutureSets,
  onToggleExpandSet,
  sessionDrafts,
  onDraftChange,
}: {
  block: WorkoutBlockDto;
  blockIndex: number;
  activeSession?: WorkoutExecutionSessionDto | null;
  loadingSetPublicId?: string | null;
  setErrors?: Record<string, string>;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  activeRest?: ActiveRestState | null;
  onSkipRest?: () => void;
  expandedFutureSets?: Record<string, boolean>;
  onToggleExpandSet?: (setKey: string, expanded: boolean) => void;
  sessionDrafts?: Record<string, { reps: string; load: string }>;
  onDraftChange?: (setKey: string, draft: { reps: string; load: string }) => void;
}) {
  const methodLabel = METHOD_LABELS[block.blockType] || block.blockType;
  const items = block.items || [];
  const isCircuit = block.blockType === "CIRCUIT";

  return (
    <section
      aria-label={`Bloco ${blockIndex + 1}: ${block.title || methodLabel}`}
      className="rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs overflow-hidden space-y-4"
    >
      {/* Block Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
            {blockIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {methodLabel}
              </span>
              {isCircuit && block.rounds && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Repeat className="w-3 h-3" />
                  {block.rounds} voltas
                </span>
              )}
            </div>
            {block.title && (
              <h2 className="text-sm font-bold text-[var(--foreground)] mt-0.5">
                {block.title}
              </h2>
            )}
          </div>
        </div>

        {/* Block Rests */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
          {block.restBetweenItemsSeconds ? (
            <span className="px-2 py-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border-default)]">
              Intervalo entre itens: {formatRest(block.restBetweenItemsSeconds, { includeWord: true })}
            </span>
          ) : null}
          {block.restBetweenRoundsSeconds ? (
            <span className="px-2 py-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border-default)]">
              Intervalo entre voltas: {formatRest(block.restBetweenRoundsSeconds, { includeWord: true })}
            </span>
          ) : null}
          {block.restAfterBlockSeconds ? (
            <span className="px-2 py-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border-default)] font-semibold text-[var(--foreground)]">
              Descanso pós-bloco: {formatRest(block.restAfterBlockSeconds, { includeWord: true })}
            </span>
          ) : null}
        </div>
      </div>

      {block.instructions && (
        <div className="px-5 text-xs text-[var(--foreground-muted)] italic">
          {block.instructions}
        </div>
      )}

      {/* Items List */}
      <div className="px-5 pb-5 space-y-4">
        {items.map((item, itemIndex) => (
          <ItemCard
            key={item.publicId}
            item={item}
            blockType={block.blockType}
            itemIndex={itemIndex}
            totalItems={items.length}
            activeSession={activeSession}
            loadingSetPublicId={loadingSetPublicId}
            setErrors={setErrors}
            onCompleteSet={onCompleteSet}
            activeRest={activeRest}
            onSkipRest={onSkipRest}
            expandedFutureSets={expandedFutureSets}
            onToggleExpandSet={onToggleExpandSet}
            sessionDrafts={sessionDrafts}
            onDraftChange={onDraftChange}
          />
        ))}
      </div>
    </section>
  );
}

function ItemCard({
  item,
  blockType,
  itemIndex,
  totalItems,
  activeSession,
  loadingSetPublicId,
  setErrors,
  onCompleteSet,
  activeRest,
  onSkipRest,
  expandedFutureSets,
  onToggleExpandSet,
  sessionDrafts,
  onDraftChange,
}: {
  item: WorkoutBlockItemDto;
  blockType: string;
  itemIndex: number;
  totalItems: number;
  activeSession?: WorkoutExecutionSessionDto | null;
  loadingSetPublicId?: string | null;
  setErrors?: Record<string, string>;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  activeRest?: ActiveRestState | null;
  onSkipRest?: () => void;
  expandedFutureSets?: Record<string, boolean>;
  onToggleExpandSet?: (setKey: string, expanded: boolean) => void;
  sessionDrafts?: Record<string, { reps: string; load: string }>;
  onDraftChange?: (setKey: string, draft: { reps: string; load: string }) => void;
}) {
  const isDropSet = blockType === "DROP_SET";
  const isRestPause = blockType === "REST_PAUSE";
  const isCardio = blockType === "CARDIO";
  const isWarmup = blockType === "WARMUP";

  const pinnedMedia = item.pinnedMedia || [];
  const isCustom = item.exercisePublicId === null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle)]/50 border border-[var(--border-subtle)] space-y-4">
      {/* SECTION 1: EXERCISE IDENTITY */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {totalItems > 1 && (
              <span className="text-[10px] font-bold text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border-default)] px-1.5 py-0.5 rounded shrink-0">
                Item {itemIndex + 1}
              </span>
            )}
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-[var(--foreground)]">
              {item.exerciseNameSnapshot}
            </h3>
            {isCustom && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                Personalizado
              </span>
            )}
          </div>

          {item.muscleGroupSnapshot && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--foreground-muted)]">
              {item.muscleGroupSnapshot}
            </span>
          )}
        </div>

        {item.notes && (
          <p className="text-xs text-[var(--foreground-muted)] italic">
            Obs: {item.notes}
          </p>
        )}
      </div>

      {/* SECTION 2: VÍDEO / MÍDIA */}
      {pinnedMedia.length > 0 && (
        <div className="space-y-2">
          {pinnedMedia.map((m) => (
            <div
              key={m.mediaAsset.publicId}
              className="rounded-xl overflow-hidden border border-[var(--border-default)] bg-black shadow-xs"
            >
              {m.mediaAsset.mediaType === "VIDEO" ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={`/api/training-v2/media/${m.mediaAsset.publicId}`}
                  className="w-full max-h-72 bg-black aspect-video object-contain"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/training-v2/media/${m.mediaAsset.publicId}`}
                  alt={item.exerciseNameSnapshot}
                  className="w-full max-h-72 object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* SECTION 3: PRESCRIÇÃO E SÉRIES */}
      <div className="space-y-2.5">
        {isCardio ? (
          <CardioPrescription item={item} />
        ) : isWarmup ? (
          <WarmupPrescription item={item} />
        ) : isDropSet ? (
          <DropSetPrescription
            item={item}
            activeSession={activeSession}
            loadingSetPublicId={loadingSetPublicId}
            setErrors={setErrors}
            onCompleteSet={onCompleteSet}
            activeRest={activeRest}
            onSkipRest={onSkipRest}
          />
        ) : isRestPause ? (
          <RestPausePrescription
            item={item}
            activeSession={activeSession}
            loadingSetPublicId={loadingSetPublicId}
            setErrors={setErrors}
            onCompleteSet={onCompleteSet}
            activeRest={activeRest}
            onSkipRest={onSkipRest}
          />
        ) : (
          <StandardSetsPrescription
            sets={item.sets || []}
            item={item}
            activeSession={activeSession}
            loadingSetPublicId={loadingSetPublicId}
            setErrors={setErrors}
            onCompleteSet={onCompleteSet}
            activeRest={activeRest}
            onSkipRest={onSkipRest}
            expandedFutureSets={expandedFutureSets}
            onToggleExpandSet={onToggleExpandSet}
            sessionDrafts={sessionDrafts}
            onDraftChange={onDraftChange}
          />
        )}
      </div>

      {/* SECTION 4: COMO EXECUTAR (Recolhível / Expansível) */}
      {item.instructionsSnapshot && item.instructionsSnapshot.trim().length > 0 && (
        <InstructionsAccordion instructions={item.instructionsSnapshot} />
      )}
    </div>
  );
}

function formatActualLoad(loadKg: number | null | undefined): string | null {
  if (loadKg === null || loadKg === undefined) return null;
  const num = Number(loadKg);
  if (!Number.isFinite(num)) return null;
  if (num === 0) return "0 kg";
  const formatted = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} kg`;
}

function getInitialReps(
  targetReps: number | null | undefined,
  prescribedReps: number | null | undefined
): string {
  const r = targetReps ?? prescribedReps;
  if (r != null && Number.isInteger(r) && r >= 0) {
    return String(r);
  }
  return "";
}

function getInitialLoad(
  targetLoadKg: number | null | undefined,
  prescribedLoadKg: number | null | undefined
): string {
  const l = targetLoadKg !== undefined ? targetLoadKg : prescribedLoadKg;
  if (l === null || l === undefined) return "";
  if (typeof l === "number" && Number.isFinite(l) && l >= 0) {
    if (l === 0) return "0";
    return String(l).replace(".", ",");
  }
  return "";
}

function SetCheckoffControl({
  executionSet,
  setDto,
  isLoading,
  onCompleteSet,
  isSessionActive,
  draft,
  onDraftChange,
}: {
  executionSet?: WorkoutExecutionSetDto | null;
  setDto?: WorkoutItemSetDto | null;
  isLoading: boolean;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  isSessionActive?: boolean;
  draft?: { reps: string; load: string };
  onDraftChange?: (draft: { reps: string; load: string }) => void;
}) {
  if (!executionSet) return null;

  if (executionSet.completedAt != null) {
    const repsPart =
      executionSet.actualReps != null ? `${executionSet.actualReps} reps` : null;
    const loadPart = formatActualLoad(executionSet.actualLoadKg);
    const realizedText = [repsPart, loadPart].filter(Boolean).join(" · ");

    return (
      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Realizado:
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {realizedText || "Concluída"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Concluída</span>
        </span>
      </div>
    );
  }

  if (!isSessionActive) {
    return null;
  }

  return (
    <PendingSetControl
      executionSet={executionSet}
      setDto={setDto}
      isLoading={isLoading}
      onCompleteSet={onCompleteSet}
      draft={draft}
      onDraftChange={onDraftChange}
    />
  );
}

function PendingSetControl({
  executionSet,
  setDto,
  isLoading,
  onCompleteSet,
  draft,
  onDraftChange,
}: {
  executionSet: WorkoutExecutionSetDto;
  setDto?: WorkoutItemSetDto | null;
  isLoading: boolean;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  draft?: { reps: string; load: string };
  onDraftChange?: (draft: { reps: string; load: string }) => void;
}) {
  const [repsInput, setRepsInput] = useState<string>(() =>
    draft?.reps !== undefined
      ? draft.reps
      : getInitialReps(setDto?.targetReps, executionSet.prescribedReps)
  );
  const [loadInput, setLoadInput] = useState<string>(() =>
    draft?.load !== undefined
      ? draft.load
      : getInitialLoad(setDto?.targetLoadKg, executionSet.prescribedLoadKg)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (isLoading || isSubmitting) return;

    setValidationError(null);

    const trimmedReps = repsInput.trim();
    if (trimmedReps === "") {
      setValidationError("Informe o número de repetições realizadas.");
      return;
    }
    const r = Number(trimmedReps);
    if (!Number.isInteger(r) || isNaN(r) || r < 0 || r > 65535) {
      setValidationError("Repetições deve ser um número inteiro entre 0 e 65535.");
      return;
    }
    const actualReps = r;

    const trimmedLoad = loadInput.trim();
    let actualLoadKg: number | null = null;
    if (trimmedLoad !== "") {
      const normalizedLoad = trimmedLoad.replace(",", ".");
      if (!/^\d+(\.\d+)?$/.test(normalizedLoad)) {
        setValidationError("Carga deve ser um número válido entre 0 e 9999,99 kg.");
        return;
      }
      const parts = normalizedLoad.split(".");
      if (parts.length === 2 && parts[1].length > 2) {
        setValidationError("Carga deve ter no máximo 2 casas decimais.");
        return;
      }
      const l = Number(normalizedLoad);
      if (!Number.isFinite(l) || isNaN(l) || l < 0 || l > 9999.99) {
        setValidationError("Carga deve ser um número entre 0 e 9999,99 kg.");
        return;
      }
      actualLoadKg = l;
    }

    setIsSubmitting(true);
    try {
      await onCompleteSet?.(executionSet.publicId, {
        actualReps,
        actualLoadKg,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isLoading || isSubmitting;

  return (
    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            Realizado:
          </span>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`reps-${executionSet.publicId}`}
              className="text-[11px] text-[var(--foreground-muted)] font-medium"
            >
              Reps:
            </label>
            <input
              id={`reps-${executionSet.publicId}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={repsInput}
              onChange={(e) => {
                const val = e.target.value;
                setRepsInput(val);
                setValidationError(null);
                onDraftChange?.({ reps: val, load: loadInput });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isBusy}
              placeholder="0"
              className="w-14 h-8 px-2 text-center text-xs font-semibold text-[var(--foreground)] bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              aria-label="Repetições realizadas"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`load-${executionSet.publicId}`}
              className="text-[11px] text-[var(--foreground-muted)] font-medium"
            >
              Carga:
            </label>
            <div className="relative inline-flex items-center">
              <input
                id={`load-${executionSet.publicId}`}
                type="text"
                inputMode="decimal"
                value={loadInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLoadInput(val);
                  setValidationError(null);
                  onDraftChange?.({ reps: repsInput, load: val });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isBusy}
                placeholder="0"
                className="w-16 h-8 pl-2 pr-6 text-center text-xs font-semibold text-[var(--foreground)] bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                aria-label="Carga realizada em kg"
              />
              <span className="absolute right-1.5 text-[10px] font-medium text-[var(--foreground-muted)] pointer-events-none">
                kg
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBusy}
          className="px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ml-auto"
        >
          {isBusy ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Concluindo...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Concluir série</span>
            </>
          )}
        </button>
      </div>

      {validationError && (
        <p className="text-[11px] text-red-500 font-medium text-right">{validationError}</p>
      )}
    </div>
  );
}

function StandardSetsPrescription({
  sets,
  item,
  activeSession,
  loadingSetPublicId,
  setErrors = {},
  onCompleteSet,
  activeRest,
  onSkipRest,
  expandedFutureSets = {},
  onToggleExpandSet,
  sessionDrafts = {},
  onDraftChange,
}: {
  sets: WorkoutItemSetDto[];
  item?: WorkoutBlockItemDto;
  activeSession?: WorkoutExecutionSessionDto | null;
  loadingSetPublicId?: string | null;
  setErrors?: Record<string, string>;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  activeRest?: ActiveRestState | null;
  onSkipRest?: () => void;
  expandedFutureSets?: Record<string, boolean>;
  onToggleExpandSet?: (setKey: string, expanded: boolean) => void;
  sessionDrafts?: Record<string, { reps: string; load: string }>;
  onDraftChange?: (setKey: string, draft: { reps: string; load: string }) => void;
}) {

  if (!sets || sets.length === 0) {
    return (
      <div className="text-center py-3 text-xs text-[var(--foreground-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
        Nenhuma série prescrita.
      </div>
    );
  }

  const compactSummary = formatCompactPrescriptionSummary(sets);

  // Identify the first uncompleted set for visual prominence when in progress
  const firstPendingSetNumber =
    activeSession && activeSession.status === "IN_PROGRESS"
      ? sets.find((s) => {
          const es = activeSession.sets?.find(
            (e) => (e.blockItemPublicId ?? "") === (item?.publicId ?? "") && e.setNumber === s.setNumber
          );
          return es && es.completedAt == null;
        })?.setNumber
      : null;

  return (
    <div className="space-y-2">
      {/* Compact Prescription Summary */}
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-[var(--foreground)]">
          {compactSummary}
        </span>
        {(item?.targetRir != null || item?.targetRpe != null) && (
          <div className="flex items-center gap-2">
            {item?.targetRir != null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                RIR {item.targetRir}
              </span>
            )}
            {item?.targetRpe != null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                RPE {item.targetRpe}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Individual Series Rows */}
      <div className="space-y-2">
        {sets.map((s, idx) => {
          const typeLabel = SET_TYPE_LABELS[s.setType] || s.setType;
          const reps = formatReps(s);
          const load = formatLoad(s);
          const rest = formatRest(s.targetRestSeconds);

          const executionSet =
            activeSession && (activeSession.status === "IN_PROGRESS" || activeSession.status === "COMPLETED")
              ? activeSession.sets?.find(
                  (es) => (es.blockItemPublicId ?? "") === (item?.publicId ?? "") && es.setNumber === s.setNumber
                )
              : null;
          const isLoading = executionSet && loadingSetPublicId === executionSet.publicId;
          const setErr = executionSet ? setErrors[executionSet.publicId] : null;
          const isCompleted = executionSet && executionSet.completedAt != null;
          const isCurrent = activeSession?.status === "IN_PROGRESS" && s.setNumber === firstPendingSetNumber;

          // CASE 1: Concluída (Compacta, 1 linha)
          if (isCompleted && executionSet) {
            const repsPart = executionSet.actualReps != null ? `${executionSet.actualReps} reps` : null;
            const loadPart = formatActualLoad(executionSet.actualLoadKg);
            const realizedText = [repsPart, loadPart].filter(Boolean).join(" · ");

            return (
              <div
                key={s.setNumber || idx}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  <span className="font-bold text-[var(--foreground)]">
                    {idx + 1}ª série
                  </span>
                  <span className="text-[var(--foreground-muted)]">
                    — {realizedText || "Concluída"}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Concluída
                </span>
              </div>
            );
          }

          // CASE 2: Em andamento - Série Atual (Destaque visual)
          if (isCurrent) {
            const setKey = `${item?.publicId ?? "item"}-${s.setNumber}`;
            const draft = sessionDrafts[setKey];

            return (
              <div
                key={s.setNumber || idx}
                className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border-2 border-emerald-500/40 shadow-xs space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-sm text-[var(--foreground)]">
                      {idx + 1}ª série
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Série atual
                    </span>
                    {s.setType && s.setType !== "NORMAL" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {typeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] text-right">
                    <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
                    <span className="font-semibold text-[var(--foreground)]">{reps}</span>
                    {load != null && <span>· {load}</span>}
                    {rest != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rest}
                      </span>
                    )}
                  </div>
                </div>

                <SetCheckoffControl
                  executionSet={executionSet}
                  setDto={s}
                  isLoading={isLoading || false}
                  onCompleteSet={onCompleteSet}
                  isSessionActive={true}
                  draft={draft}
                  onDraftChange={(newDraft) => onDraftChange?.(setKey, newDraft)}
                />

                {setErr && (
                  <div className="text-right">
                    <p className="text-[11px] text-red-500 font-medium">
                      {setErr}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // CASE 3: Em andamento - Séries Futuras (Pendente sem bloqueio, compacta por padrão)
          if (activeSession && activeSession.status === "IN_PROGRESS") {
            const setKey = `${item?.publicId ?? "item"}-${s.setNumber}`;
            const isExpanded = !!expandedFutureSets[setKey] || !!setErr;
            const draft = sessionDrafts[setKey];

            if (!isExpanded) {
              return (
                <div
                  key={s.setNumber || idx}
                  className="px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-[var(--foreground-muted)]">
                      {idx + 1}ª série
                    </span>
                    {s.setType && s.setType !== "NORMAL" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {typeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <span className="font-medium text-[var(--foreground)]">{reps}</span>
                      {load != null && <span>· {load}</span>}
                      {rest != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rest}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleExpandSet?.(setKey, true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border-subtle)] transition-colors shrink-0 cursor-pointer"
                      title="Abrir controles para registrar esta série"
                    >
                      <span>Registrar</span>
                      <ChevronDownIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.setNumber || idx}
                className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--foreground-muted)]">
                      {idx + 1}ª série
                    </span>
                    {s.setType && s.setType !== "NORMAL" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {typeLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] text-right">
                      <span className="font-medium text-[var(--foreground)]">{reps}</span>
                      {load != null && <span>· {load}</span>}
                      {rest != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rest}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleExpandSet?.(setKey, false)}
                      className="text-[11px] font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:underline cursor-pointer"
                    >
                      Recolher
                    </button>
                  </div>
                </div>

                <SetCheckoffControl
                  executionSet={executionSet}
                  setDto={s}
                  isLoading={isLoading || false}
                  onCompleteSet={onCompleteSet}
                  isSessionActive={true}
                  draft={draft}
                  onDraftChange={(newDraft) => onDraftChange?.(setKey, newDraft)}
                />

                {setErr && (
                  <div className="text-right">
                    <p className="text-[11px] text-red-500 font-medium">
                      {setErr}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // CASE 4: Pré-treino (Não iniciado / Preview)
          return (
            <div
              key={s.setNumber || idx}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--foreground)]">
                  {idx + 1}ª série
                </span>
                {s.setType && s.setType !== "NORMAL" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {typeLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)] text-right">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
                <span className="font-semibold text-[var(--foreground)]">{reps}</span>
                {load != null && <span>· {load}</span>}
                {rest != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rest}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest Timer Panel */}
      {activeRest && (activeRest.blockItemPublicId ?? "") === (item?.publicId ?? "") && (
        <div className="pt-1.5">
          <RestTimer activeRest={activeRest} onSkip={onSkipRest || (() => {})} />
        </div>
      )}
    </div>
  );
}

function DropSetPrescription({
  item,
  activeSession,
  loadingSetPublicId,
  setErrors = {},
  onCompleteSet,
  activeRest,
  onSkipRest,
}: {
  item: WorkoutBlockItemDto;
  activeSession?: WorkoutExecutionSessionDto | null;
  loadingSetPublicId?: string | null;
  setErrors?: Record<string, string>;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  activeRest?: ActiveRestState | null;
  onSkipRest?: () => void;
}) {
  const sets = item.sets || [];
  if (sets.length === 0) return null;

  const mainSet = sets.find((s) => s.setType === "NORMAL") || sets[0];
  const dropStages = sets.filter((s) => s !== mainSet && s.setType === "DROP_STAGE");

  const mainExecutionSet = activeSession && (activeSession.status === "IN_PROGRESS" || activeSession.status === "COMPLETED")
    ? activeSession.sets?.find(
        (es) => (es.blockItemPublicId ?? "") === (item.publicId ?? "") && es.setNumber === mainSet.setNumber
      )
    : null;
  const mainErr = mainExecutionSet ? setErrors[mainExecutionSet.publicId] : null;

  return (
    <div className="space-y-2 pt-1">
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-amber-500/20 space-y-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[var(--foreground)]">Série Principal</span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
              <span className="font-semibold text-[var(--foreground)]">
                {formatReps(mainSet)}
                {formatLoad(mainSet) && ` · ${formatLoad(mainSet)}`}
              </span>
            </div>
          </div>
          <SetCheckoffControl
            executionSet={mainExecutionSet}
            setDto={mainSet}
            isLoading={loadingSetPublicId === mainExecutionSet?.publicId}
            onCompleteSet={onCompleteSet}
            isSessionActive={activeSession?.status === "IN_PROGRESS"}
          />
        </div>

        {mainErr && (
          <div className="text-right">
            <p className="text-[11px] text-red-500 font-medium">{mainErr}</p>
          </div>
        )}

        {dropStages.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
              Reduções imediatas (sem descanso):
            </p>
            {dropStages.map((stage, idx) => {
              const stageExecutionSet = activeSession && (activeSession.status === "IN_PROGRESS" || activeSession.status === "COMPLETED")
                ? activeSession.sets?.find(
                    (es) => (es.blockItemPublicId ?? "") === (item.publicId ?? "") && es.setNumber === stage.setNumber
                  )
                : null;
              const stageErr = stageExecutionSet ? setErrors[stageExecutionSet.publicId] : null;

              return (
                <div key={stage.setNumber || idx} className="space-y-1.5 pl-3 border-l-2 border-amber-500/50 py-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[var(--foreground-muted)]">
                      Redução {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatReps(stage)}
                        {formatLoad(stage) && ` · ${formatLoad(stage)}`}
                      </span>
                    </div>
                  </div>
                  <SetCheckoffControl
                    executionSet={stageExecutionSet}
                    setDto={stage}
                    isLoading={loadingSetPublicId === stageExecutionSet?.publicId}
                    onCompleteSet={onCompleteSet}
                    isSessionActive={activeSession?.status === "IN_PROGRESS"}
                  />
                  {stageErr && (
                    <div className="text-right">
                      <p className="text-[11px] text-red-500 font-medium">{stageErr}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mainSet.targetRestSeconds && (
          <div className="text-right text-[11px] text-[var(--foreground-muted)] pt-1">
            Descanso após o Drop-Set: {formatRest(mainSet.targetRestSeconds)}
          </div>
        )}
      </div>

      {/* Rest Timer Panel */}
      {activeRest && (activeRest.blockItemPublicId ?? "") === (item.publicId ?? "") && (
        <div className="pt-1">
          <RestTimer activeRest={activeRest} onSkip={onSkipRest || (() => {})} />
        </div>
      )}
    </div>
  );
}

function RestPausePrescription({
  item,
  activeSession,
  loadingSetPublicId,
  setErrors = {},
  onCompleteSet,
  activeRest,
  onSkipRest,
}: {
  item: WorkoutBlockItemDto;
  activeSession?: WorkoutExecutionSessionDto | null;
  loadingSetPublicId?: string | null;
  setErrors?: Record<string, string>;
  onCompleteSet?: (
    setPublicId: string,
    input: { actualReps: number; actualLoadKg: number | null }
  ) => Promise<void>;
  activeRest?: ActiveRestState | null;
  onSkipRest?: () => void;
}) {
  const sets = item.sets || [];
  if (sets.length === 0) return null;

  const mainSet = sets.find((s) => s.setType === "NORMAL") || sets[0];
  const miniSets = sets.filter((s) => s !== mainSet);
  const cfg = item.methodConfig as { intraPauseSeconds?: number; targetTotalReps?: number } | undefined;
  const intraPause = cfg?.intraPauseSeconds || 15;

  const mainExecutionSet = activeSession && (activeSession.status === "IN_PROGRESS" || activeSession.status === "COMPLETED")
    ? activeSession.sets?.find(
        (es) => (es.blockItemPublicId ?? "") === (item.publicId ?? "") && es.setNumber === mainSet.setNumber
      )
    : null;
  const mainErr = mainExecutionSet ? setErrors[mainExecutionSet.publicId] : null;

  return (
    <div className="space-y-2 pt-1">
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-blue-500/20 space-y-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-[var(--foreground)]">Série Inicial</span>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Pausa intra-série: {intraPause}s
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
              <span className="font-semibold text-[var(--foreground)]">
                {formatReps(mainSet)}
                {formatLoad(mainSet) && ` · ${formatLoad(mainSet)}`}
              </span>
            </div>
          </div>
          <SetCheckoffControl
            executionSet={mainExecutionSet}
            setDto={mainSet}
            isLoading={loadingSetPublicId === mainExecutionSet?.publicId}
            onCompleteSet={onCompleteSet}
            isSessionActive={activeSession?.status === "IN_PROGRESS"}
          />
        </div>

        {mainErr && (
          <div className="text-right">
            <p className="text-[11px] text-red-500 font-medium">{mainErr}</p>
          </div>
        )}

        {miniSets.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
              Mini-séries após pausa de {intraPause}s:
            </p>
            {miniSets.map((mini, idx) => {
              const miniExecutionSet = activeSession && (activeSession.status === "IN_PROGRESS" || activeSession.status === "COMPLETED")
                ? activeSession.sets?.find(
                    (es) => (es.blockItemPublicId ?? "") === (item.publicId ?? "") && es.setNumber === mini.setNumber
                  )
                : null;
              const miniErr = miniExecutionSet ? setErrors[miniExecutionSet.publicId] : null;

              return (
                <div key={mini.setNumber || idx} className="space-y-1.5 pl-3 border-l-2 border-blue-500/50 py-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[var(--foreground-muted)]">
                      Mini-série {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                      <span className="text-[11px] font-medium text-[var(--foreground-muted)]">Prescrito:</span>
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatReps(mini)}
                        {formatLoad(mini) && ` · ${formatLoad(mini)}`}
                      </span>
                    </div>
                  </div>
                  <SetCheckoffControl
                    executionSet={miniExecutionSet}
                    setDto={mini}
                    isLoading={loadingSetPublicId === miniExecutionSet?.publicId}
                    onCompleteSet={onCompleteSet}
                    isSessionActive={activeSession?.status === "IN_PROGRESS"}
                  />
                  {miniErr && (
                    <div className="text-right">
                      <p className="text-[11px] text-red-500 font-medium">{miniErr}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mainSet.targetRestSeconds && (
          <div className="text-right text-[11px] text-[var(--foreground-muted)] pt-1">
            Descanso após Rest-Pause: {formatRest(mainSet.targetRestSeconds)}
          </div>
        )}
      </div>

      {/* Rest Timer Panel */}
      {activeRest && (activeRest.blockItemPublicId ?? "") === (item.publicId ?? "") && (
        <div className="pt-1">
          <RestTimer activeRest={activeRest} onSkip={onSkipRest || (() => {})} />
        </div>
      )}
    </div>
  );
}

function CardioPrescription({ item }: { item: WorkoutBlockItemDto }) {
  const cfg = (item.methodConfig || {}) as Record<string, unknown>;

  return (
    <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-rose-500/20 space-y-2 text-xs">
      <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
        <Heart className="w-4 h-4 text-rose-500" />
        <span>Prescrição Cardiovascular</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
        {cfg.durationMinutes != null && (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Duração</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.durationMinutes)} min</span>
          </div>
        )}
        {cfg.targetDistanceKm != null && (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Distância</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.targetDistanceKm)} km</span>
          </div>
        )}
        {cfg.speedKmh != null && (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Velocidade</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.speedKmh)} km/h</span>
          </div>
        )}
        {cfg.inclinePercent != null && (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Inclinação</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.inclinePercent)}%</span>
          </div>
        )}
        {cfg.heartRateZone != null && (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Zona de FC</span>
            <span className="font-semibold text-[var(--foreground)]">Zona {String(cfg.heartRateZone)}</span>
          </div>
        )}
        {cfg.intensityIndicator ? (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Intensidade</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.intensityIndicator)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WarmupPrescription({ item }: { item: WorkoutBlockItemDto }) {
  const cfg = (item.methodConfig || {}) as Record<string, unknown>;
  const sets = item.sets || [];

  return (
    <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-amber-500/20 space-y-2 text-xs">
      <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
        <Flame className="w-4 h-4 text-amber-500" />
        <span>Aquecimento e Mobilidade</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {cfg.focus ? (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Foco</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.focus)}</span>
          </div>
        ) : null}
        {cfg.targetJointOrRegion ? (
          <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
            <span className="text-[var(--foreground-muted)] block">Articulação / Região</span>
            <span className="font-semibold text-[var(--foreground)]">{String(cfg.targetJointOrRegion)}</span>
          </div>
        ) : null}
      </div>

      {sets.length > 0 && <StandardSetsPrescription sets={sets} item={item} />}
    </div>
  );
}

function HistoryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function formatLoadNumber(val: number): string {
  const rounded = Math.round(val * 100) / 100;
  return rounded.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatHistoryDate(dateVal: string | Date | null): string {
  if (!dateVal) return "Data não registrada";
  const date = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(date.getTime())) return String(dateVal);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

function formatPrescribedSet(set: WorkoutExecutionHistorySetDto): string {
  const parts: string[] = [];

  if (
    set.prescribedReps != null &&
    set.prescribedRepsMax != null &&
    set.prescribedReps !== set.prescribedRepsMax
  ) {
    parts.push(`${set.prescribedReps}-${set.prescribedRepsMax} reps`);
  } else if (set.prescribedReps != null) {
    parts.push(`${set.prescribedReps} reps`);
  }

  if (set.prescribedLoadKg != null) {
    parts.push(`${formatLoadNumber(set.prescribedLoadKg)} kg`);
  }

  if (set.prescribedRestSeconds != null && set.prescribedRestSeconds > 0) {
    parts.push(`${set.prescribedRestSeconds}s`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Sem prescrição";
}

function formatActualSet(set: WorkoutExecutionHistorySetDto) {
  // If actualReps is null: legacy session or unregistered
  if (set.actualReps == null) {
    return (
      <span className="italic text-[var(--foreground-muted)]">
        Dados realizados não registrados
      </span>
    );
  }

  const parts: string[] = [];
  parts.push(`${set.actualReps} reps`);

  // STRICT RULE: actual_load_kg = NULL → não mostrar "0 kg". actual_load_kg = 0.00 → mostrar "0 kg"
  if (set.actualLoadKg != null) {
    parts.push(`${formatLoadNumber(set.actualLoadKg)} kg`);
  }

  return <span className="font-semibold text-[var(--foreground)]">{parts.join(" · ")}</span>;
}

function WorkoutExecutionHistorySection({
  history,
}: {
  history: WorkoutExecutionHistorySessionDto[];
}) {
  return (
    <section aria-label="Histórico de execuções" className="pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)]">
            Histórico de execuções
          </h2>
          {history.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {history.length}
            </span>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-[var(--border)] text-center">
          <p className="text-xs sm:text-sm text-[var(--foreground-muted)]">
            Nenhum treino concluído ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((session) => (
            <HistorySessionCard key={session.publicId} session={session} />
          ))}
        </div>
      )}
    </section>
  );
}

function HistorySessionCard({
  session,
}: {
  session: WorkoutExecutionHistorySessionDto;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group sets by exercise name, preserving sequential order
  const exerciseGroups: { exerciseName: string; sets: WorkoutExecutionHistorySetDto[] }[] = [];
  for (const set of session.sets) {
    const name = set.exerciseName || "Exercício";
    const lastGroup = exerciseGroups[exerciseGroups.length - 1];
    if (lastGroup && lastGroup.exerciseName === name) {
      lastGroup.sets.push(set);
    } else {
      exerciseGroups.push({ exerciseName: name, sets: [set] });
    }
  }

  const completedSetsCount = session.sets.filter((s) => s.completedAt != null).length;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p
            suppressHydrationWarning
            className="text-xs sm:text-sm font-semibold text-[var(--foreground)] truncate"
          >
            {formatHistoryDate(session.completedAt || session.startedAt)}
          </p>
          <p className="text-xs text-[var(--foreground-muted)]">
            {completedSetsCount} {completedSetsCount === 1 ? "série concluída" : "séries concluídas"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-transparent hover:bg-neutral-500/5 text-xs font-medium text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes"}</span>
          <ChevronDownIcon
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-4">
          {exerciseGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                {group.exerciseName}
              </h4>
              <div className="space-y-2">
                {group.sets.map((set) => {
                  const prescribedText = formatPrescribedSet(set);
                  const actualContent = formatActualSet(set);

                  return (
                    <div
                      key={set.publicId}
                      className="p-3 rounded-xl bg-neutral-500/5 border border-neutral-500/10 text-xs space-y-1"
                    >
                      <div className="font-semibold text-[var(--foreground)]">
                        Série {set.setNumber}
                      </div>
                      <div className="text-[var(--foreground-muted)]">
                        <span className="font-medium">Prescrito:</span> {prescribedText}
                      </div>
                      <div>
                        <span className="font-medium text-[var(--foreground-muted)]">Realizado: </span>
                        {actualContent}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
