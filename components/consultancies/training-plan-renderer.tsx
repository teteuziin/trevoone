import type {
  TrainingPlanDto,
  TrainingWorkoutDto,
  TrainingWorkoutSectionDto,
  TrainingWorkoutBlockDto,
  TrainingBlockExerciseDto,
} from "@/lib/consultancies/training";
import { Badge } from "@/components/ui/badge";

type Props = {
  plan: TrainingPlanDto;
  studentName?: string;
  isDraft?: boolean;
  onVideoRequest?: (exercise: TrainingBlockExerciseDto) => void;
};

const WEEKDAY_NAMES: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

const BLOCK_TYPE_LABELS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "warning" }> = {
  SINGLE: { label: "Exercício Isolado", variant: "neutral" },
  BI_SET: { label: "Bi-Set", variant: "brand" },
  TRI_SET: { label: "Tri-Set", variant: "brand" },
  SUPERSET: { label: "Superset", variant: "brand" },
  CIRCUIT: { label: "Circuito", variant: "warning" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function TrainingPlanRenderer({
  plan,
  studentName,
  isDraft = false,
  onVideoRequest,
}: Props) {
  const formattedStart = formatDate(plan.startsOn);
  const formattedEnd = formatDate(plan.endsOn);

  return (
    <div className="w-full space-y-6 text-left">
      {/* Plan Header Card */}
      <div className="p-5 sm:p-6 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {studentName && (
            <Badge variant="brand" size="sm">
              Aluno: {studentName}
            </Badge>
          )}
          {isDraft && (
            <Badge variant="warning" size="sm">
              Rascunho
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {plan.title || "Plano de Treino Sem Título"}
          </h1>
          {plan.subtitle && (
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {plan.subtitle}
            </p>
          )}
        </div>

        {(formattedStart || formattedEnd) && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium pt-1">
            <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              Validade: {formattedStart || "Início"} {formattedEnd ? `até ${formattedEnd}` : ""}
            </span>
          </div>
        )}

        {plan.description && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3 whitespace-pre-wrap">
            {plan.description}
          </p>
        )}
      </div>

      {/* Workouts List */}
      {plan.workouts.length === 0 ? (
        <div className="p-8 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhum treino adicionado ainda</p>
          <p className="text-xs text-[var(--text-secondary)] max-w-[320px] mx-auto">
            Adicione o primeiro treino (ex: Treino A) para começar a estruturar a prescrição.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plan.workouts.map((workout, wIndex) => (
            <WorkoutCard
              key={workout.publicId || wIndex}
              workout={workout}
              index={wIndex}
              onVideoRequest={onVideoRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({
  workout,
  index,
  onVideoRequest,
}: {
  workout: TrainingWorkoutDto;
  index: number;
  onVideoRequest?: (exercise: TrainingBlockExerciseDto) => void;
}) {
  const weekdayLabel = workout.scheduledWeekday ? WEEKDAY_NAMES[workout.scheduledWeekday] : null;

  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs overflow-hidden">
      {/* Workout Header */}
      <div className="p-4 sm:p-5 bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--surface)] text-[10px] font-bold flex items-center justify-center">
              {String.fromCharCode(65 + index)}
            </span>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {workout.title}
            </h2>
          </div>
          {workout.subtitle && (
            <p className="text-xs text-[var(--text-secondary)]">{workout.subtitle}</p>
          )}
        </div>

        {weekdayLabel && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)] shadow-2xs">
            {weekdayLabel}
          </span>
        )}
      </div>

      {workout.notes && (
        <div className="px-5 py-2.5 bg-[var(--warning-soft)] border-b border-[var(--warning-border)] text-xs text-[var(--warning-foreground)]">
          <span className="font-semibold">Orientação:</span> {workout.notes}
        </div>
      )}

      {/* Sections List */}
      <div className="p-4 sm:p-5 space-y-5">
        {workout.sections.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] italic text-center py-3">
            Nenhuma divisão muscular ou seção cadastrada neste treino.
          </p>
        ) : (
          workout.sections.map((section, sIndex) => (
            <SectionCard
              key={section.publicId || sIndex}
              section={section}
              onVideoRequest={onVideoRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onVideoRequest,
}: {
  section: TrainingWorkoutSectionDto;
  onVideoRequest?: (exercise: TrainingBlockExerciseDto) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="border-b border-[var(--border-subtle)] pb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {section.title}
        </h3>
        {section.description && (
          <span className="text-[11px] text-[var(--text-tertiary)]">{section.description}</span>
        )}
      </div>

      {/* Blocks List */}
      <div className="space-y-3">
        {section.blocks.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] italic py-2">
            Nenhum bloco de exercícios nesta seção.
          </p>
        ) : (
          section.blocks.map((block, bIndex) => (
            <BlockCard
              key={block.publicId || bIndex}
              block={block}
              blockIndex={bIndex}
              onVideoRequest={onVideoRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BlockCard({
  block,
  blockIndex,
  onVideoRequest,
}: {
  block: TrainingWorkoutBlockDto;
  blockIndex: number;
  onVideoRequest?: (exercise: TrainingBlockExerciseDto) => void;
}) {
  const typeConfig = BLOCK_TYPE_LABELS[block.blockType] || BLOCK_TYPE_LABELS.SINGLE;
  const isMultiExercise = block.blockType !== "SINGLE";

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 space-y-3 ${
        isMultiExercise
          ? "bg-[var(--surface-subtle)] border-[var(--border-default)]"
          : "bg-[var(--surface)] border-[var(--border-default)] shadow-2xs"
      }`}
    >
      {/* Block Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-2">
          <Badge variant={typeConfig.variant} size="sm">
            {typeConfig.label}
          </Badge>
          {block.title && (
            <span className="text-xs font-semibold text-[var(--text-primary)]">{block.title}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)] font-medium">
          {block.rounds && (
            <span className="bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded shadow-2xs">
              {block.rounds} {block.rounds === 1 ? "round" : "rounds"}
            </span>
          )}
          {block.restBetweenExercisesSeconds !== null && block.restBetweenExercisesSeconds > 0 && (
            <span className="bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded shadow-2xs">
              {block.restBetweenExercisesSeconds}s entre ex.
            </span>
          )}
          {block.restAfterBlockSeconds !== null && block.restAfterBlockSeconds > 0 && (
            <span className="bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded shadow-2xs">
              {block.restAfterBlockSeconds}s descanso final
            </span>
          )}
        </div>
      </div>

      {block.instructions && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
          <span className="font-semibold text-[var(--text-primary)]">Instruções do bloco:</span> {block.instructions}
        </p>
      )}

      {/* Exercises in Block */}
      <div className="space-y-2.5">
        {block.exercises.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] italic py-1 text-center">
            Adicione exercícios a este bloco.
          </p>
        ) : (
          block.exercises.map((exercise, eIndex) => (
            <ExerciseItemCard
              key={exercise.publicId || eIndex}
              exercise={exercise}
              orderLabel={
                isMultiExercise
                  ? `${String.fromCharCode(65 + blockIndex)}${eIndex + 1}`
                  : undefined
              }
              onVideoRequest={onVideoRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ExerciseItemCard({
  exercise,
  orderLabel,
  onVideoRequest,
}: {
  exercise: TrainingBlockExerciseDto;
  orderLabel?: string;
  onVideoRequest?: (exercise: TrainingBlockExerciseDto) => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {orderLabel && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--text-primary)] text-[var(--surface)] text-[10px] font-bold">
              {orderLabel}
            </span>
          )}
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            {exercise.exerciseName}
          </h4>
        </div>

        {exercise.videoUrl && (
          onVideoRequest ? (
            <button
              type="button"
              onClick={() => onVideoRequest(exercise)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--brand-soft)] text-[var(--brand-foreground)] hover:bg-[var(--brand-soft-border)] border border-[var(--brand-soft-border)] shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ver execução
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Vídeo disponível
            </span>
          )
        )}
      </div>

      {/* Muscle / Equipment tags */}
      {(exercise.muscleGroup || exercise.equipment) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {exercise.muscleGroup && (
            <Badge variant="neutral" size="sm">
              {exercise.muscleGroup}
            </Badge>
          )}
          {exercise.equipment && (
            <Badge variant="neutral" size="sm">
              {exercise.equipment}
            </Badge>
          )}
        </div>
      )}

      {/* Prescription Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {exercise.sets !== null && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
            {exercise.sets} {exercise.sets === 1 ? "série" : "séries"}
          </span>
        )}
        {exercise.repetitionsText && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
            {exercise.repetitionsText} reps
          </span>
        )}
        {exercise.loadGuidance && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
            {exercise.loadGuidance}
          </span>
        )}
        {exercise.restSeconds !== null && exercise.restSeconds > 0 && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
            {exercise.restSeconds}s descanso
          </span>
        )}
        {exercise.technique && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]">
            {exercise.technique}
          </span>
        )}
      </div>

      {exercise.instructions && (
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2.5 rounded border border-[var(--border-subtle)]">
          <strong className="text-[var(--text-primary)]">Instruções:</strong> {exercise.instructions}
        </p>
      )}

      {exercise.notes && (
        <p className="text-xs text-[var(--text-tertiary)] italic pt-0.5">
          Obs: {exercise.notes}
        </p>
      )}
    </div>
  );
}
