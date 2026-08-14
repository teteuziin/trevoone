import type {
  TrainingPlanDto,
  TrainingWorkoutDto,
  TrainingWorkoutSectionDto,
  TrainingWorkoutBlockDto,
  TrainingBlockExerciseDto,
} from "@/lib/consultancies/training";

type Props = {
  plan: TrainingPlanDto;
  studentName?: string;
  isDraft?: boolean;
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

const BLOCK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  SINGLE: { label: "Exercício Isolado", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  BI_SET: { label: "Bi-Set", color: "bg-emerald-50 text-[#00A859] border-emerald-200 font-bold" },
  TRI_SET: { label: "Tri-Set", color: "bg-blue-50 text-blue-700 border-blue-200 font-bold" },
  SUPERSET: { label: "Superset", color: "bg-purple-50 text-purple-700 border-purple-200 font-bold" },
  CIRCUIT: { label: "Circuito", color: "bg-amber-50 text-amber-800 border-amber-200 font-bold" },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function TrainingPlanRenderer({ plan, studentName, isDraft = false }: Props) {
  const formattedStart = formatDate(plan.startsOn);
  const formattedEnd = formatDate(plan.endsOn);

  return (
    <div className="w-full space-y-6 text-left">
      {/* Plan Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {studentName && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
              Aluno: {studentName}
            </span>
          )}
          {isDraft && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Rascunho
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            {plan.title || "Plano de Treino Sem Título"}
          </h1>
          {plan.subtitle && (
            <p className="text-sm font-medium text-zinc-600">
              {plan.subtitle}
            </p>
          )}
        </div>

        {(formattedStart || formattedEnd) && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium pt-1">
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              Validade: {formattedStart || "Início"} {formattedEnd ? `até ${formattedEnd}` : ""}
            </span>
          </div>
        )}

        {plan.description && (
          <p className="text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
            {plan.description}
          </p>
        )}
      </div>

      {/* Workouts List */}
      {plan.workouts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-2">
          <p className="text-sm font-semibold text-zinc-700">Nenhum treino adicionado ainda</p>
          <p className="text-xs text-zinc-500 max-w-[320px] mx-auto">
            Adicione o primeiro treino (ex: Treino A) para começar a estruturar a prescrição.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plan.workouts.map((workout, wIndex) => (
            <WorkoutCard key={workout.publicId || wIndex} workout={workout} index={wIndex} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, index }: { workout: TrainingWorkoutDto; index: number }) {
  const weekdayLabel = workout.scheduledWeekday ? WEEKDAY_NAMES[workout.scheduledWeekday] : null;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 shadow-2xs overflow-hidden">
      {/* Workout Header */}
      <div className="p-4 sm:p-5 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
              {String.fromCharCode(65 + index)}
            </span>
            <h2 className="text-base font-bold text-zinc-900">
              {workout.title}
            </h2>
          </div>
          {workout.subtitle && (
            <p className="text-xs text-zinc-500">{workout.subtitle}</p>
          )}
        </div>

        {weekdayLabel && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 shadow-2xs">
            {weekdayLabel}
          </span>
        )}
      </div>

      {workout.notes && (
        <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-900">
          <span className="font-semibold">Orientação:</span> {workout.notes}
        </div>
      )}

      {/* Sections List */}
      <div className="p-4 sm:p-5 space-y-5">
        {workout.sections.length === 0 ? (
          <p className="text-xs text-zinc-400 italic text-center py-3">
            Nenhuma divisão muscular ou seção cadastrada neste treino.
          </p>
        ) : (
          workout.sections.map((section, sIndex) => (
            <SectionCard key={section.publicId || sIndex} section={section} />
          ))
        )}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: TrainingWorkoutSectionDto }) {
  return (
    <div className="space-y-3">
      <div className="border-b border-zinc-100 pb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          {section.title}
        </h3>
        {section.description && (
          <span className="text-[11px] text-zinc-400">{section.description}</span>
        )}
      </div>

      {/* Blocks List */}
      <div className="space-y-3">
        {section.blocks.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-2">
            Nenhum bloco de exercícios nesta seção.
          </p>
        ) : (
          section.blocks.map((block, bIndex) => (
            <BlockCard key={block.publicId || bIndex} block={block} blockIndex={bIndex} />
          ))
        )}
      </div>
    </div>
  );
}

function BlockCard({ block, blockIndex }: { block: TrainingWorkoutBlockDto; blockIndex: number }) {
  const typeConfig = BLOCK_TYPE_LABELS[block.blockType] || BLOCK_TYPE_LABELS.SINGLE;
  const isMultiExercise = block.blockType !== "SINGLE";

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 space-y-3 ${
        isMultiExercise
          ? "bg-zinc-50/60 border-zinc-200/90"
          : "bg-white border-zinc-200/80 shadow-2xs"
      }`}
    >
      {/* Block Meta Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100/80 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${typeConfig.color}`}
          >
            {typeConfig.label}
          </span>
          {block.title && (
            <span className="text-xs font-semibold text-zinc-800">{block.title}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 font-medium">
          {block.rounds && (
            <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-2xs">
              {block.rounds} {block.rounds === 1 ? "round" : "rounds"}
            </span>
          )}
          {block.restBetweenExercisesSeconds !== null && block.restBetweenExercisesSeconds > 0 && (
            <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-2xs">
              {block.restBetweenExercisesSeconds}s entre ex.
            </span>
          )}
          {block.restAfterBlockSeconds !== null && block.restAfterBlockSeconds > 0 && (
            <span className="bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-2xs">
              {block.restAfterBlockSeconds}s descanso final
            </span>
          )}
        </div>
      </div>

      {block.instructions && (
        <p className="text-xs text-zinc-600 leading-relaxed bg-white p-2 rounded-lg border border-zinc-100">
          <span className="font-semibold text-zinc-700">Instruções do bloco:</span> {block.instructions}
        </p>
      )}

      {/* Exercises in Block */}
      <div className="space-y-2.5">
        {block.exercises.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-1 text-center">
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
}: {
  exercise: TrainingBlockExerciseDto;
  orderLabel?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-white border border-zinc-200/80 shadow-2xs space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {orderLabel && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-bold">
              {orderLabel}
            </span>
          )}
          <h4 className="text-sm font-bold text-zinc-900">
            {exercise.exerciseName}
          </h4>
        </div>

        {exercise.videoUrl && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#00A859] border border-emerald-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vídeo disponível
          </span>
        )}
      </div>

      {/* Muscle / Equipment tags */}
      {(exercise.muscleGroup || exercise.equipment) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
          {exercise.muscleGroup && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium">
              {exercise.muscleGroup}
            </span>
          )}
          {exercise.equipment && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-medium">
              {exercise.equipment}
            </span>
          )}
        </div>
      )}

      {/* Prescription Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {exercise.sets !== null && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800">
            {exercise.sets} {exercise.sets === 1 ? "série" : "séries"}
          </span>
        )}
        {exercise.repetitionsText && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800">
            {exercise.repetitionsText} reps
          </span>
        )}
        {exercise.loadGuidance && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800">
            {exercise.loadGuidance}
          </span>
        )}
        {exercise.restSeconds !== null && exercise.restSeconds > 0 && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-800">
            {exercise.restSeconds}s descanso
          </span>
        )}
        {exercise.technique && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            {exercise.technique}
          </span>
        )}
      </div>

      {exercise.notes && (
        <p className="text-xs text-zinc-500 italic pt-1">
          Obs: {exercise.notes}
        </p>
      )}
    </div>
  );
}
