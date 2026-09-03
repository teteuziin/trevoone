"use client";

import { useState } from "react";

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Sparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function Loader2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  );
}

type CustomExerciseInlineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customSnapshot: {
    exerciseName: string;
    muscleGroup?: string;
    equipment?: string;
    instructions?: string;
  }) => Promise<void>;
};

const COMMON_MUSCLES = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Quadríceps",
  "Posterior de Coxa",
  "Glúteos",
  "Panturrilha",
  "Abdômen",
  "Cardio",
  "Corpo Inteiro",
];

const COMMON_EQUIPMENTS = [
  "Halteres",
  "Barra",
  "Máquina",
  "Polia / Cabo",
  "Peso do corpo",
  "Kettlebell",
  "Elástico",
  "Outro",
];

export function CustomExerciseInlineModal({
  isOpen,
  onClose,
  onSave,
}: CustomExerciseInlineModalProps) {
  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseName.trim()) {
      setError("O nome do exercício é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        exerciseName: exerciseName.trim(),
        muscleGroup: muscleGroup.trim() || undefined,
        equipment: equipment.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      // Reset
      setExerciseName("");
      setMuscleGroup("");
      setEquipment("");
      setInstructions("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar exercício.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xl p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              Exercício Personalizado
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Criar Exercício para esta Rotina
            </h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              Este exercício é exclusivo deste treino e não afetará a biblioteca compartilhada da consultoria.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="custom-name" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
              Nome do exercício *
            </label>
            <input
              id="custom-name"
              type="text"
              required
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Ex: Flexão declinada com pausa"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-muscle" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Grupo muscular
              </label>
              <select
                id="custom-muscle"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              >
                <option value="">Selecione (opcional)</option>
                {COMMON_MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="custom-equip" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
                Equipamento
              </label>
              <select
                id="custom-equip"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
              >
                <option value="">Selecione (opcional)</option>
                {COMMON_EQUIPMENTS.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="custom-inst" className="block text-xs font-medium text-[var(--foreground)] mb-1.5">
              Instruções ou orientações de execução
            </label>
            <textarea
              id="custom-inst"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Descreva a cadência, posicionamento ou foco técnico deste exercício..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-[var(--foreground)]"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border-default)] text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !exerciseName.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Adicionar ao Bloco
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
