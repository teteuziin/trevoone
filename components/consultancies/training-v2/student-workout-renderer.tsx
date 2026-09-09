"use client";

import type { StudentWorkoutViewContract } from "@/lib/training-v2/types";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemSetDto,
} from "@/lib/training-v2/types";

function Dumbbell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
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

function Calendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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

function Video({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

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

function formatRepsSummary(sets: WorkoutItemSetDto[]): string {
  if (!sets || sets.length === 0) return "";
  const s0 = sets[0];
  const isUniform = sets.every(
    (s) => s.targetReps === s0.targetReps && s.targetRepsMax === s0.targetRepsMax
  );

  const seriesLabel = `${sets.length} ${sets.length === 1 ? "série" : "séries"}`;
  if (!isUniform) {
    return seriesLabel;
  }

  let repsText = "";
  if (s0.targetReps != null && s0.targetRepsMax != null && s0.targetReps !== s0.targetRepsMax) {
    repsText = `${s0.targetReps}–${s0.targetRepsMax} repetições`;
  } else if (s0.targetReps != null) {
    repsText = `${s0.targetReps} repetições`;
  } else {
    return seriesLabel;
  }

  return `${seriesLabel} × ${repsText}`;
}

function getUniformLoad(sets: WorkoutItemSetDto[]): string | null {
  if (!sets || sets.length === 0) return null;
  const firstLoad = sets[0].targetLoadKg;
  if (firstLoad == null) return null;
  const allSame = sets.every((s) => s.targetLoadKg === firstLoad);
  return allSame ? `${firstLoad} kg` : null;
}

function getUniformRest(sets: WorkoutItemSetDto[]): string | null {
  if (!sets || sets.length === 0) return null;
  const firstRest = sets[0].targetRestSeconds;
  if (firstRest == null) return null;
  const allSame = sets.every((s) => s.targetRestSeconds === firstRest);
  return allSame ? formatRest(firstRest) : null;
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

type StudentWorkoutRendererProps = {
  workout: StudentWorkoutViewContract;
};

export function StudentWorkoutRenderer({ workout }: StudentWorkoutRendererProps) {
  const blocks = workout.blocks || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Workout Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Versão {workout.versionNumber}
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {workout.consultancyName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Prescrito: {workout.startsOn}</span>
            {workout.endsOn && <span>até {workout.endsOn}</span>}
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {workout.title}
          </h1>
          {workout.subtitle && (
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              {workout.subtitle}
            </p>
          )}
        </div>

        {workout.objective && (
          <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--foreground-muted)] flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[var(--foreground)]">Objetivo: </span>
              {workout.objective}
            </div>
          </div>
        )}

        {workout.notesForStudent && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--foreground)] space-y-1">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">
              Orientações do seu treinador:
            </p>
            <p className="text-[var(--foreground-muted)] italic leading-relaxed">
              &ldquo;{workout.notesForStudent}&rdquo;
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--foreground-muted)] pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 font-medium">
            <Dumbbell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{blocks.length} {blocks.length === 1 ? "bloco de exercícios" : "blocos de exercícios"}</span>
          </div>

          {workout.estimatedDurationMinutes != null && (
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{workout.estimatedDurationMinutes} min estimado</span>
            </div>
          )}

          {workout.difficultyLevel && (
            <div className="px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[11px] font-semibold text-[var(--foreground)]">
              {workout.difficultyLevel === "BEGINNER"
                ? "Iniciante"
                : workout.difficultyLevel === "ADVANCED"
                ? "Avançado"
                : "Intermediário"}
            </div>
          )}
        </div>
      </div>

      {/* Blocks List */}
      <div className="space-y-5">
        {blocks.map((block, blockIndex) => (
          <BlockCard key={block.publicId} block={block} blockIndex={blockIndex} />
        ))}
      </div>
    </div>
  );
}

function BlockCard({ block, blockIndex }: { block: WorkoutBlockDto; blockIndex: number }) {
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
}: {
  item: WorkoutBlockItemDto;
  blockType: string;
  itemIndex: number;
  totalItems: number;
}) {
  const isDropSet = blockType === "DROP_SET";
  const isRestPause = blockType === "REST_PAUSE";
  const isCardio = blockType === "CARDIO";
  const isWarmup = blockType === "WARMUP";

  const pinnedMedia = item.pinnedMedia || [];
  const isCustom = item.exercisePublicId === null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle)]/60 border border-[var(--border-subtle)] space-y-5">
      {/* SECTION 1: EXERCISE IDENTITY */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {totalItems > 1 && (
              <span className="text-[11px] font-bold text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded-md shrink-0">
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
          <div className="pt-1">
            <p className="text-xs text-[var(--foreground-muted)] italic">
              Obs: {item.notes}
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: EXECUÇÃO DO EXERCÍCIO (Only if media is present) */}
      {pinnedMedia.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Execução do exercício</span>
          </div>

          <div className="space-y-2">
            {pinnedMedia.map((m) => (
              <div
                key={m.mediaAsset.publicId}
                className="rounded-2xl overflow-hidden border border-[var(--border-default)] bg-black shadow-xs"
              >
                {m.mediaAsset.mediaType === "VIDEO" ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={`/api/training-v2/media/${m.mediaAsset.publicId}`}
                    className="w-full max-h-80 bg-black aspect-video object-contain"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/training-v2/media/${m.mediaAsset.publicId}`}
                    alt={item.exerciseNameSnapshot}
                    className="w-full max-h-80 object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: SUA PRESCRIÇÃO */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          <Dumbbell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Sua prescrição</span>
        </div>

        {isCardio ? (
          <CardioPrescription item={item} />
        ) : isWarmup ? (
          <WarmupPrescription item={item} />
        ) : isDropSet ? (
          <DropSetPrescription item={item} />
        ) : isRestPause ? (
          <RestPausePrescription item={item} />
        ) : (
          <StandardSetsPrescription sets={item.sets || []} item={item} />
        )}
      </div>

      {/* SECTION 4: COMO EXECUTAR (Only if instructions are present) */}
      {item.instructionsSnapshot && item.instructionsSnapshot.trim().length > 0 && (() => {
        const parsed = parseInstructions(item.instructionsSnapshot);
        if (!parsed) return null;

        return (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <span>Como executar</span>
            </div>

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
        );
      })()}
    </div>
  );
}

function StandardSetsPrescription({
  sets,
  item,
}: {
  sets: WorkoutItemSetDto[];
  item?: WorkoutBlockItemDto;
}) {
  if (!sets || sets.length === 0) {
    return (
      <div className="text-center py-3 text-xs text-[var(--foreground-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
        Nenhuma série prescrita.
      </div>
    );
  }

  const summaryText = formatRepsSummary(sets);
  const uniformLoad = getUniformLoad(sets);
  const uniformRest = getUniformRest(sets);

  return (
    <div className="space-y-2">
      {/* Prescription Summary Header Card */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
            {summaryText}
          </span>
        </div>

        {/* Compact Metadata Row (Carga, Descanso, RIR, RPE) */}
        {(uniformLoad != null || uniformRest != null || item?.targetRir != null || item?.targetRpe != null) && (
          <div className="flex flex-wrap items-center gap-3 pt-1.5 text-xs text-[var(--foreground-muted)] border-t border-[var(--border-subtle)]">
            {uniformLoad != null && (
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="text-[var(--foreground-muted)]">Carga:</span>
                <span className="font-semibold text-[var(--foreground)]">{uniformLoad}</span>
              </span>
            )}
            {uniformRest != null && (
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="text-[var(--foreground-muted)]">Descanso:</span>
                <span className="font-semibold text-[var(--foreground)]">{uniformRest}</span>
              </span>
            )}
            {item?.targetRir != null && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <span>RIR:</span>
                <span className="font-bold">{item.targetRir}</span>
              </span>
            )}
            {item?.targetRpe != null && (
              <span className="inline-flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                <span>RPE:</span>
                <span className="font-bold">{item.targetRpe}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Individual Series Rows */}
      <div className="space-y-1.5">
        {sets.map((s, idx) => {
          const typeLabel = SET_TYPE_LABELS[s.setType] || s.setType;
          const reps = formatReps(s);
          const load = formatLoad(s);
          const rest = formatRest(s.targetRestSeconds);

          return (
            <div
              key={s.setNumber || idx}
              className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-[var(--foreground)] min-w-[50px]">
                  {idx + 1}ª série
                </span>
                {s.setType && s.setType !== "NORMAL" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {typeLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 sm:gap-4 font-semibold text-[var(--foreground)] text-right">
                <span>{reps}</span>
                {load != null && (
                  <span className="text-[var(--foreground-muted)] font-medium text-[11px] sm:text-xs">
                    {load}
                  </span>
                )}
                {rest != null && (
                  <span className="text-[var(--foreground-muted)] font-normal text-[11px] sm:text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--foreground-muted)]" />
                    {rest}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DropSetPrescription({ item }: { item: WorkoutBlockItemDto }) {
  const sets = item.sets || [];
  if (sets.length === 0) return null;

  const mainSet = sets.find((s) => s.setType === "NORMAL") || sets[0];
  const dropStages = sets.filter((s) => s !== mainSet && s.setType === "DROP_STAGE");

  return (
    <div className="space-y-2 pt-1">
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-amber-500/20 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--foreground)]">Série Principal</span>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatReps(mainSet)}
            {formatLoad(mainSet) && ` · ${formatLoad(mainSet)}`}
          </div>
        </div>

        {dropStages.length > 0 && (
          <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
              Reduções imediatas (sem descanso):
            </p>
            {dropStages.map((stage, idx) => (
              <div
                key={stage.setNumber || idx}
                className="flex items-center justify-between text-xs pl-3 border-l-2 border-amber-500/50 py-0.5"
              >
                <span className="font-medium text-[var(--foreground-muted)]">
                  Redução {idx + 1}
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {formatReps(stage)}
                  {formatLoad(stage) && ` · ${formatLoad(stage)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {mainSet.targetRestSeconds && (
          <div className="text-right text-[11px] text-[var(--foreground-muted)] pt-1">
            Descanso após o Drop-Set: {formatRest(mainSet.targetRestSeconds)}
          </div>
        )}
      </div>
    </div>
  );
}

function RestPausePrescription({ item }: { item: WorkoutBlockItemDto }) {
  const sets = item.sets || [];
  if (sets.length === 0) return null;

  const mainSet = sets.find((s) => s.setType === "NORMAL") || sets[0];
  const miniSets = sets.filter((s) => s !== mainSet);
  const cfg = item.methodConfig as { intraPauseSeconds?: number; targetTotalReps?: number } | undefined;
  const intraPause = cfg?.intraPauseSeconds || 15;

  return (
    <div className="space-y-2 pt-1">
      <div className="p-3 rounded-xl bg-[var(--surface)] border border-blue-500/20 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[var(--foreground)]">Série Inicial</span>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Pausa intra-série: {intraPause}s
            </p>
          </div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatReps(mainSet)}
            {formatLoad(mainSet) && ` · ${formatLoad(mainSet)}`}
          </div>
        </div>

        {miniSets.length > 0 && (
          <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
              Mini-séries após pausa de {intraPause}s:
            </p>
            {miniSets.map((mini, idx) => (
              <div
                key={mini.setNumber || idx}
                className="flex items-center justify-between text-xs pl-3 border-l-2 border-blue-500/50 py-0.5"
              >
                <span className="font-medium text-[var(--foreground-muted)]">
                  Mini-série {idx + 1}
                </span>
                <span className="font-semibold text-[var(--foreground)]">
                  {formatReps(mini)}
                  {formatLoad(mini) && ` · ${formatLoad(mini)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {mainSet.targetRestSeconds && (
          <div className="text-right text-[11px] text-[var(--foreground-muted)] pt-1">
            Descanso após Rest-Pause: {formatRest(mainSet.targetRestSeconds)}
          </div>
        )}
      </div>
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
