"use client";

import React, { useState } from "react";
import { submitDailyCheckinAction } from "@/app/consultoria/[slug]/checkin/actions";
import type { DailyCheckinRecord, TrainingCheckinStatus, DietCheckinStatus, DifficultyLevel } from "@/lib/checkins/service";

interface DailyCheckinWidgetProps {
  consultancySlug: string;
  initialCheckin?: DailyCheckinRecord | null;
  todayCheckin?: DailyCheckinRecord | null;
}

const DIFFICULTY_REASON_OPTIONS = [
  "Falta de tempo",
  "Fome",
  "Motivação",
  "Dor / cansaço",
  "Rotina corrida",
  "Treino difícil",
  "Dieta difícil",
  "Outro",
];

function SparkleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function DailyCheckinWidget({
  consultancySlug,
  initialCheckin,
  todayCheckin,
}: DailyCheckinWidgetProps) {
  const effectiveInitialCheckin = todayCheckin ?? initialCheckin ?? null;
  const [isEditing, setIsEditing] = useState(!effectiveInitialCheckin);
  const [currentCheckin, setCurrentCheckin] = useState<DailyCheckinRecord | null>(effectiveInitialCheckin);

  const [trainingStatus, setTrainingStatus] = useState<TrainingCheckinStatus>(
    effectiveInitialCheckin?.trainingStatus || "TRAINED"
  );
  const [dietStatus, setDietStatus] = useState<DietCheckinStatus>(
    effectiveInitialCheckin?.dietStatus || "FOLLOWED"
  );
  const [energyLevel, setEnergyLevel] = useState<number>(effectiveInitialCheckin?.energyLevel || 4);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(
    effectiveInitialCheckin?.difficultyLevel || "NONE"
  );
  const [hasPain, setHasPain] = useState<boolean>(effectiveInitialCheckin?.hasPain || false);
  const [difficultyReasons, setDifficultyReasons] = useState<string[]>(
    effectiveInitialCheckin?.difficultyReasons || []
  );
  const [notes, setNotes] = useState<string>(effectiveInitialCheckin?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function toggleReason(reason: string) {
    if (difficultyReasons.includes(reason)) {
      setDifficultyReasons(difficultyReasons.filter((r) => r !== reason));
    } else {
      setDifficultyReasons([...difficultyReasons, reason]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await submitDailyCheckinAction(consultancySlug, {
      trainingStatus,
      dietStatus,
      energyLevel,
      difficultyLevel,
      hasPain,
      difficultyReasons: difficultyReasons.length > 0 ? difficultyReasons : undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Erro ao salvar check-in.");
    } else {
      setSuccessMessage("Check-in registrado com sucesso!");
      setCurrentCheckin({
        id: currentCheckin?.id || 1,
        publicId: currentCheckin?.publicId || "temp",
        consultancyId: currentCheckin?.consultancyId || 1,
        studentMemberId: currentCheckin?.studentMemberId || 1,
        checkinDate: new Date().toISOString().split("T")[0],
        trainingStatus,
        dietStatus,
        energyLevel,
        difficultyLevel,
        hasPain,
        difficultyReasons: difficultyReasons.length > 0 ? difficultyReasons : null,
        notes: notes.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setIsEditing(false);
    }
  }

  // Visual completed summary card
  if (!isEditing && currentCheckin) {
    const trainingLabels: Record<TrainingCheckinStatus, string> = {
      TRAINED: "Treinei hoje",
      NOT_TRAINED: "Não treinei",
      REST_DAY: "Descanso planejado",
    };
    const dietLabels: Record<DietCheckinStatus, string> = {
      FOLLOWED: "Segui o plano 100%",
      PARTIAL: "Parcialmente",
      OFF_PLAN: "Saí do plano",
      NOT_APPLICABLE: "Sem plano alimentar",
    };

    return (
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-heading">
                Check-in de hoje concluído
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Suas respostas foram compartilhadas com sua consultoria em tempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="self-start sm:self-auto text-xs font-semibold px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-all cursor-pointer min-h-[38px]"
          >
            Editar respostas
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider block">Treino</span>
            <span className="font-bold text-[var(--text-primary)] line-clamp-1">{trainingLabels[currentCheckin.trainingStatus]}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider block">Alimentação</span>
            <span className="font-bold text-[var(--text-primary)] line-clamp-1">{dietLabels[currentCheckin.dietStatus]}</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider block">Disposição</span>
            <span className="font-bold text-[var(--text-primary)]">⚡ {currentCheckin.energyLevel} de 5</span>
          </div>
          <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider block">Dor / Articular</span>
            <span className={`font-bold ${currentCheckin.hasPain ? "text-amber-500 dark:text-amber-400" : "text-emerald-500"}`}>
              {currentCheckin.hasPain ? "Relatou incômodo" : "Sem dor"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Interactive Form
  return (
    <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 transition-all">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <SparkleIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
              Acompanhamento Diário • 10 segundos
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading leading-tight mt-0.5">
              Como foi sua rotina hoje?
            </h3>
          </div>
        </div>
        {effectiveInitialCheckin && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1 px-2"
          >
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Treino */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            1. Você treinou hoje?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "TRAINED", label: "Treinei" },
              { id: "NOT_TRAINED", label: "Não treinei" },
              { id: "REST_DAY", label: "Descanso" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTrainingStatus(opt.id as TrainingCheckinStatus)}
                className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  trainingStatus === opt.id
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Alimentação */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            2. Como foi sua alimentação?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "FOLLOWED", label: "Segui o plano" },
              { id: "PARTIAL", label: "Parcialmente" },
              { id: "OFF_PLAN", label: "Saí do plano" },
              { id: "NOT_APPLICABLE", label: "Sem plano" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDietStatus(opt.id as DietCheckinStatus)}
                className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center text-center ${
                  dietStatus === opt.id
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Disposição & 4. Dor/Desconforto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Nível de energia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
              <span>3. Disposição / energia:</span>
              <span className="text-[var(--brand)] font-extrabold">{energyLevel} / 5</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`flex-1 py-2.5 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                    energyLevel === lvl
                      ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Dor ou desconforto */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] block">
              4. Sentiu dor ou incômodo físico?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHasPain(false)}
                className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  !hasPain
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                Não, tudo normal
              </button>
              <button
                type="button"
                onClick={() => setHasPain(true)}
                className={`py-2.5 px-3 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  hasPain
                    ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                Sim, senti dor
              </button>
            </div>
          </div>
        </div>

        {/* 5. Dificuldade geral */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--text-primary)] block">
            5. Dificuldade geral enfrentada hoje:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "NONE", label: "Nenhuma" },
              { id: "LOW", label: "Baixa" },
              { id: "MEDIUM", label: "Média" },
              { id: "HIGH", label: "Alta" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDifficultyLevel(opt.id as DifficultyLevel)}
                className={`py-2.5 px-2 text-xs sm:text-sm rounded-xl border font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  difficultyLevel === opt.id
                    ? opt.id === "HIGH"
                      ? "bg-red-500/15 text-red-500 border-red-500/30 shadow-xs"
                      : "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Motivos de dificuldade opcionais */}
        {(difficultyLevel === "MEDIUM" || difficultyLevel === "HIGH" || hasPain) && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-[var(--text-secondary)] block">
              Motivo principal (opcional):
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_REASON_OPTIONS.map((reason) => {
                const active = difficultyReasons.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => toggleReason(reason)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer min-h-[36px] ${
                      active
                        ? "bg-emerald-500/15 border-emerald-500/40 text-[var(--brand)] font-bold shadow-xs"
                        : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Observação opcional */}
        <div className="space-y-1.5">
          <label htmlFor="checkin-notes" className="text-xs font-semibold text-[var(--text-secondary)] block">
            Alguma observação para seu treinador ou nutricionista? (opcional)
          </label>
          <textarea
            id="checkin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ex: Tive menos tempo no almoço; senti leve incômodo no ombro esquerdo..."
            className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 transition-all min-h-[68px]"
          />
        </div>

        {/* Feedback / Error */}
        {errorMessage && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-semibold">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 text-xs rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
            {successMessage}
          </div>
        )}

        {/* Footer & Submit */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3.5">
          <p className="text-[11px] text-[var(--text-tertiary)] text-center sm:text-left flex items-center gap-1.5">
            <span aria-hidden="true">🔒</span>
            <span>Avisos diários notificam sua equipe técnica sobre sua evolução.</span>
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs sm:text-sm font-bold active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-sm min-h-[46px]"
          >
            {isSubmitting ? "Salvando..." : "Concluir Check-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
