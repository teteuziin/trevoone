"use client";

import { useState } from "react";
import type {
  TrainingPlanDto,
  TrainingBlockExerciseDto,
} from "@/lib/consultancies/training";
import { TrainingPlanRenderer } from "./training-plan-renderer";
import { TrainingVideoPlayer } from "./training-video-player";
import { Badge } from "@/components/ui/badge";

type Props = {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  plan: TrainingPlanDto;
};

export function StudentTrainingPlan({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  plan,
}: Props) {
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [activeVideoExercise, setActiveVideoExercise] = useState<TrainingBlockExerciseDto | null>(null);

  // Derivação imutável para exibir apenas o treino selecionado caso haja mais de 1
  const displayedPlan: TrainingPlanDto = {
    ...plan,
    workouts:
      plan.workouts.length > 0
        ? [plan.workouts[Math.min(selectedWorkoutIndex, plan.workouts.length - 1)]]
        : [],
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Plan Information */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse mr-1" />
                Plano Atual
              </Badge>
              {consultancyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consultancyLogoUrl}
                  alt={consultancyName}
                  className="h-5 max-w-[100px] object-contain"
                />
              ) : (
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {consultancyName}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {plan.title}
            </h1>
            {plan.subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {plan.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/consultoria/${consultancySlug}/treinos/pdf`}
              download
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--surface)] text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer focus-visible:outline-[var(--brand)]"
            >
              <svg className="w-4 h-4 text-[var(--border-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Baixar Ficha em PDF
            </a>
          </div>
        </div>

        {/* Vigência / Descrição */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
          {(plan.startsOn || plan.endsOn) && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                Vigência: <strong className="text-[var(--text-primary)]">{plan.startsOn ? new Date(plan.startsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Início"}</strong> até <strong className="text-[var(--text-primary)]">{plan.endsOn ? new Date(plan.endsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Indeterminado"}</strong>
              </span>
            </div>
          )}
          {plan.activatedAt && (
            <span>
              Disponibilizado em: {new Date(plan.activatedAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {plan.description && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-3 whitespace-pre-wrap">
            {plan.description}
          </p>
        )}
      </div>

      {/* Workout Switcher Tabs (se houver mais de 1 treino) */}
      {plan.workouts.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Selecione o Treino ({plan.workouts.length})
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {plan.workouts.map((workout, idx) => {
              const isSelected = idx === selectedWorkoutIndex;
              return (
                <button
                  key={workout.publicId || idx}
                  type="button"
                  onClick={() => setSelectedWorkoutIndex(idx)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[var(--brand-strong)] text-white border-[var(--brand-strong)] shadow-xs"
                      : "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] shadow-2xs"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{workout.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Canonical Workout Renderer */}
      <TrainingPlanRenderer
        plan={displayedPlan}
        onVideoRequest={(exercise) => setActiveVideoExercise(exercise)}
      />

      {/* Video Player Modal */}
      {activeVideoExercise && (
        <TrainingVideoPlayer
          exercise={activeVideoExercise}
          onClose={() => setActiveVideoExercise(null)}
        />
      )}
    </div>
  );
}
