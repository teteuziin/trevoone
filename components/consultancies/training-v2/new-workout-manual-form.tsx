"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkoutDraftAction } from "@/app/consultoria/[slug]/rotinas/actions";
import { Button } from "@/components/ui/button";

interface NewWorkoutManualFormProps {
  consultancySlug: string;
  isTemplate?: boolean;
  targetStudentMembershipPublicId?: string | null;
  targetStudentName?: string | null;
  targetStudentObjective?: string | null;
  cancelHref: string;
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

export function NewWorkoutManualForm({
  consultancySlug,
  isTemplate = false,
  targetStudentMembershipPublicId,
  targetStudentName,
  targetStudentObjective,
  cancelHref,
}: NewWorkoutManualFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [title, setTitle] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [objective, setObjective] = useState(targetStudentObjective || "");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Por favor, informe o nome da ficha para começar.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await createWorkoutDraftAction(consultancySlug, {
          title: trimmedTitle,
          objective: objective.trim() || undefined,
          difficultyLevel: difficultyLevel.trim() ? difficultyLevel.trim() : "INTERMEDIATE",
          estimatedDurationMinutes: estimatedDurationMinutes.trim() ? Number(estimatedDurationMinutes) : null,
          notes: notes.trim() || undefined,
          isTemplate,
        });

        if (!res.ok || !res.data) {
          setErrorMessage(res.error || "Não foi possível criar a ficha de treino.");
          return;
        }

        const redirectUrl = targetStudentMembershipPublicId
          ? `/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}?student=${encodeURIComponent(targetStudentMembershipPublicId)}`
          : `/consultoria/${consultancySlug}/rotinas/${res.data.workoutPublicId}`;

        router.push(redirectUrl);
        router.refresh();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro inesperado ao criar o rascunho.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensagem de Erro (preserva os dados digitados) */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline cursor-pointer hover:opacity-80 shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. CAMPO PRINCIPAL OBRIGATÓRIO: Nome da Ficha */}
      <div className="space-y-2">
        <label htmlFor="workout-title" className="block text-sm font-bold text-[var(--text-primary)]">
          {isTemplate ? "Nome do modelo padrão" : "Nome da ficha"}
          <span className="text-emerald-500 ml-1" aria-hidden="true">*</span>
        </label>
        <input
          id="workout-title"
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          placeholder={
            isTemplate
              ? "Ex.: Hipertrofia Intermediária — ABC"
              : targetStudentName
              ? `Ex.: Treino A — Peito e tríceps (${targetStudentName.split(" ")[0]})`
              : "Ex.: Treino A — Peito e tríceps"
          }
          className="w-full px-4 py-3 text-base sm:text-sm font-medium rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[48px] shadow-2xs"
        />
      </div>

      {/* 2. ÁREA EXPANSÍVEL: Detalhes do Treino (Objetivo, Nível, Duração, Observações) */}
      <div className="border border-[var(--border-default)] rounded-2xl bg-[var(--surface)] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsDetailsOpen((prev) => !prev)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer select-none min-h-[48px]"
          aria-expanded={isDetailsOpen}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              Detalhes do treino
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-normal">
              (opcional)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] font-medium">
            <span>{isDetailsOpen ? "Ocultar" : "Preencher agora"}</span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-200 ${
                isDetailsOpen ? "rotate-180 text-emerald-500" : ""
              }`}
            />
          </div>
        </button>

        {isDetailsOpen && (
          <div className="p-4 sm:p-5 pt-1 space-y-4 border-t border-[var(--border-subtle)] animate-in slide-in-from-top-2 duration-150">
            {/* Objetivo */}
            <div className="space-y-1.5">
              <label htmlFor="workout-objective" className="block text-xs font-semibold text-[var(--text-secondary)]">
                Objetivo principal
              </label>
              <input
                id="workout-objective"
                name="objective"
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Ex.: Hipertrofia, ganho de força, condicionamento..."
                className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
              />
            </div>

            {/* Dificuldade + Duração */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label htmlFor="workout-difficulty" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Nível de dificuldade
                </label>
                <select
                  id="workout-difficulty"
                  name="difficultyLevel"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-[var(--text-primary)] transition-all min-h-[44px]"
                >
                  <option value="">Não informado (definir depois)</option>
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="workout-duration" className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Duração estimada (min)
                </label>
                <input
                  id="workout-duration"
                  name="estimatedDurationMinutes"
                  type="number"
                  min="5"
                  max="240"
                  value={estimatedDurationMinutes}
                  onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                  placeholder="Ex.: 50"
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label htmlFor="workout-notes" className="block text-xs font-semibold text-[var(--text-secondary)]">
                Observações gerais / Recomendações
              </label>
              <textarea
                id="workout-notes"
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. AÇÕES: Confortáveis no mobile com safe-area e prevenção de duplo clique */}
      <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <Link href={cancelHref} className="w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={isPending}
            className="w-full sm:w-auto font-semibold min-h-[48px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending}
          className="w-full sm:w-auto font-bold min-h-[48px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 select-none"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Criando ficha...</span>
            </>
          ) : (
            <>
              <DumbbellIcon className="w-4 h-4" />
              <span>{isTemplate ? "Começar modelo" : "Começar montagem"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
