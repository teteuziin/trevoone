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
  const [energyLevel, setEnergyLevel] = useState<number>(initialCheckin?.energyLevel || 4);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(
    initialCheckin?.difficultyLevel || "NONE"
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

  if (!isEditing && currentCheckin) {
    const trainingLabels: Record<TrainingCheckinStatus, string> = {
      TRAINED: "Treinei",
      NOT_TRAINED: "Não treinei",
      REST_DAY: "Descanso planejado",
    };
    const dietLabels: Record<DietCheckinStatus, string> = {
      FOLLOWED: "Segui o plano",
      PARTIAL: "Parcialmente",
      OFF_PLAN: "Saí do plano",
      NOT_APPLICABLE: "Não se aplica",
    };

    return (
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs depth-base space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--success-soft)] border border-[var(--success-border)] text-[var(--success-foreground)] flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Check-in de hoje realizado
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Suas respostas foram compartilhadas com sua consultoria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-all cursor-pointer depth-interactive"
          >
            Editar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block mb-0.5">Treino</span>
            <span className="font-semibold text-[var(--text-primary)]">{trainingLabels[currentCheckin.trainingStatus]}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block mb-0.5">Alimentação</span>
            <span className="font-semibold text-[var(--text-primary)]">{dietLabels[currentCheckin.dietStatus]}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block mb-0.5">Energia</span>
            <span className="font-semibold text-[var(--text-primary)]">⚡ {currentCheckin.energyLevel} / 5</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block mb-0.5">Dor / Desconforto</span>
            <span className={`font-semibold ${currentCheckin.hasPain ? "text-[var(--danger-foreground)]" : "text-[var(--text-primary)]"}`}>
              {currentCheckin.hasPain ? "Sim, relatou dor" : "Sem dor"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 shadow-xs depth-base space-y-4 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
            Check-in rápido de 10 segundos
          </span>
          <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight mt-0.5">
            Como foi seu dia hoje?
          </h3>
        </div>
        {initialCheckin && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Treino */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] block">
            1. Você treinou hoje?
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "TRAINED", label: "Treinei" },
              { id: "NOT_TRAINED", label: "Não treinei" },
              { id: "REST_DAY", label: "Descanso" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTrainingStatus(opt.id as TrainingCheckinStatus)}
                className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer depth-interactive ${
                  trainingStatus === opt.id
                    ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alimentação */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] block">
            2. Como foi sua alimentação?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer depth-interactive ${
                  dietStatus === opt.id
                    ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nível de energia (1 a 5) & Dor/Desconforto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] block">
              3. Nível de disposição / energia:
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all cursor-pointer depth-interactive ${
                    energyLevel === lvl
                      ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] block">
              4. Sentiu dor ou desconforto articular/muscular?
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setHasPain(false)}
                className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer depth-interactive ${
                  !hasPain
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-strong)] font-bold shadow-2xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Não, tudo bem
              </button>
              <button
                type="button"
                onClick={() => setHasPain(true)}
                className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer depth-interactive ${
                  hasPain
                    ? "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)] font-bold shadow-2xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                Sim, senti dor
              </button>
            </div>
          </div>
        </div>

        {/* Dificuldade */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] block">
            5. Dificuldade geral enfrentada hoje:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
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
                className={`py-2 px-1 text-xs rounded-xl border font-semibold transition-all cursor-pointer depth-interactive ${
                  difficultyLevel === opt.id
                    ? opt.id === "HIGH"
                      ? "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)] shadow-xs"
                      : "bg-[var(--brand)] text-white border-[var(--brand)] shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Motivos de dificuldade opcionais */}
        {(difficultyLevel === "MEDIUM" || difficultyLevel === "HIGH" || hasPain) && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
            <label className="text-[11px] font-semibold text-[var(--text-tertiary)] block">
              Motivo principal (opcional):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTY_REASON_OPTIONS.map((reason) => {
                const active = difficultyReasons.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => toggleReason(reason)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer depth-interactive ${
                      active
                        ? "bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--brand-foreground)] font-semibold shadow-2xs"
                        : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
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
        <div className="space-y-1">
          <label htmlFor="checkin-notes" className="text-[11px] font-medium text-[var(--text-tertiary)] block">
            Alguma observação para seu treinador ou nutricionista? (opcional)
          </label>
          <textarea
            id="checkin-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ex: Tive menos tempo no almoço; senti leve incômodo no ombro esquerdo..."
            className="w-full text-xs p-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
          />
        </div>

        {/* Feedback / Error */}
        {errorMessage && (
          <div className="p-3 text-xs rounded-xl bg-[var(--danger-soft)] text-[var(--danger-foreground)] border border-[var(--danger-border)]">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 text-xs rounded-xl bg-[var(--success-soft)] text-[var(--success-foreground)] border border-[var(--success-border)]">
            {successMessage}
          </div>
        )}

        {/* Transparency footer & Submit */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-[var(--text-tertiary)] leading-tight text-center sm:text-left flex items-center gap-1.5">
            <span aria-hidden="true">🔒</span>
            <span>Respostas compartilhadas com seus profissionais para acompanhamento.</span>
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-xs depth-interactive"
          >
            {isSubmitting ? "Salvando..." : "Concluir Check-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
