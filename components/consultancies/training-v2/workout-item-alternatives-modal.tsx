"use client";

import React, { useState } from "react";
import type {
  WorkoutBlockItemDto,
  WorkoutBlockItemAlternativeDto,
} from "@/lib/training-v2/types";
import { UnifiedExercisePicker } from "./unified-exercise-picker";

interface WorkoutItemAlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  item: WorkoutBlockItemDto;
  onSaveAlternatives: (alternatives: WorkoutBlockItemAlternativeDto[]) => Promise<void>;
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function ChevronUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
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

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function WorkoutItemAlternativesModal({
  isOpen,
  onClose,
  consultancySlug,
  item,
  onSaveAlternatives,
}: WorkoutItemAlternativesModalProps) {
  const [alternatives, setAlternatives] = useState<WorkoutBlockItemAlternativeDto[]>(
    () => (item.alternatives ? JSON.parse(JSON.stringify(item.alternatives)) : [])
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscleGroup, setCustomMuscleGroup] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenPicker = () => {
    setIsPickerOpen(true);
  };

  const handleSelectFromLibrary = async (exercisePublicId: string) => {
    try {
      const { getExerciseDetailsForPickerAction } = await import(
        "@/app/consultoria/[slug]/rotinas/actions"
      );
      const res = await getExerciseDetailsForPickerAction(consultancySlug, exercisePublicId);

      const firstSet = item.sets?.[0];
      const newAlt: WorkoutBlockItemAlternativeDto = {
        id: crypto.randomUUID(),
        exercisePublicId,
        exerciseName: res.ok && res.data ? res.data.name : "Exercício Alternativo",
        muscleGroup: res.ok && res.data ? res.data.muscleGroupPrimary : item.muscleGroupSnapshot,
        equipment: res.ok && res.data ? res.data.equipment : item.equipmentSnapshot,
        instructions: res.ok && res.data ? res.data.instructions : null,
        targetReps: firstSet?.targetReps ?? 10,
        targetRepsMax: firstSet?.targetRepsMax ?? null,
        targetLoadKg: firstSet?.targetLoadKg ?? null,
        targetRestSeconds: firstSet?.targetRestSeconds ?? 60,
        notes: item.notes ?? null,
      };

      setAlternatives((prev) => [...prev, newAlt]);
      setIsPickerOpen(false);
    } catch {
      // Fallback if details call fails
      const firstSet = item.sets?.[0];
      const newAlt: WorkoutBlockItemAlternativeDto = {
        id: crypto.randomUUID(),
        exercisePublicId,
        exerciseName: "Exercício da Biblioteca",
        muscleGroup: item.muscleGroupSnapshot,
        equipment: item.equipmentSnapshot,
        targetReps: firstSet?.targetReps ?? 10,
        targetRepsMax: firstSet?.targetRepsMax ?? null,
        targetLoadKg: firstSet?.targetLoadKg ?? null,
        targetRestSeconds: firstSet?.targetRestSeconds ?? 60,
        notes: item.notes ?? null,
      };
      setAlternatives((prev) => [...prev, newAlt]);
      setIsPickerOpen(false);
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const firstSet = item.sets?.[0];
    const newAlt: WorkoutBlockItemAlternativeDto = {
      id: crypto.randomUUID(),
      isCustomExercise: true,
      exerciseName: customName.trim(),
      muscleGroup: customMuscleGroup.trim() || null,
      equipment: customEquipment.trim() || null,
      targetReps: firstSet?.targetReps ?? 10,
      targetRepsMax: firstSet?.targetRepsMax ?? null,
      targetLoadKg: firstSet?.targetLoadKg ?? null,
      targetRestSeconds: firstSet?.targetRestSeconds ?? 60,
      notes: item.notes ?? null,
    };

    setAlternatives((prev) => [...prev, newAlt]);
    setCustomName("");
    setCustomMuscleGroup("");
    setCustomEquipment("");
    setIsCustomModalOpen(false);
  };

  const handleRemove = (id: string) => {
    setAlternatives((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= alternatives.length) return;

    setAlternatives((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleUpdateField = <K extends keyof WorkoutBlockItemAlternativeDto>(
    id: string,
    field: K,
    val: WorkoutBlockItemAlternativeDto[K]
  ) => {
    setAlternatives((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSaveAlternatives(alternatives);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alternativas.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-subtle)]/40 shrink-0">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Substituições Prescritas pelo Personal
              </span>
              <h3 className="text-base font-extrabold text-[var(--foreground)] truncate">
                {item.exerciseNameSnapshot}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Fechar modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle description */}
          <div className="px-5 py-3 bg-[var(--surface-sunken)]/60 border-b border-[var(--border-subtle)] text-xs text-[var(--foreground-muted)] leading-relaxed">
            Cadastre as opções que o aluno poderá escolher caso o aparelho original esteja ocupado ou indisponível.
            Você pode personalizar repetições, carga, intervalo e observações para cada opção.
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {alternatives.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--surface-sunken)]/30 space-y-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Nenhuma alternativa cadastrada
                </p>
                <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
                  Sem alternativas cadastradas, o aluno não terá opções pré-autorizadas para trocar este exercício durante o treino.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alternatives.map((alt, idx) => (
                  <div
                    key={alt.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] space-y-3"
                  >
                    {/* Alternative Title & Controls */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Opção {idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-[var(--foreground)] truncate">
                            {alt.exerciseName}
                          </h4>
                        </div>
                        {(alt.muscleGroup || alt.equipment) && (
                          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                            {[alt.muscleGroup, alt.equipment].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>

                      {/* Reorder and Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "up")}
                          disabled={idx === 0}
                          title="Mover para cima"
                          className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-30 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        >
                          <ChevronUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, "down")}
                          disabled={idx === alternatives.length - 1}
                          title="Mover para baixo"
                          className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-30 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(alt.id)}
                          title="Remover esta alternativa"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Prescription Overrides for this Alternative */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      {/* Reps */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] block">
                          Repetições
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={alt.targetReps ?? ""}
                            onChange={(e) =>
                              handleUpdateField(
                                alt.id,
                                "targetReps",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="Min"
                            className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] font-semibold text-center"
                          />
                          <span className="text-[var(--foreground-muted)]">-</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={alt.targetRepsMax ?? ""}
                            onChange={(e) =>
                              handleUpdateField(
                                alt.id,
                                "targetRepsMax",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="Max"
                            className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] font-semibold text-center"
                          />
                        </div>
                      </div>

                      {/* Load */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] block">
                          Carga (kg)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={alt.targetLoadKg ?? ""}
                          onChange={(e) =>
                            handleUpdateField(
                              alt.id,
                              "targetLoadKg",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="Livre"
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] font-semibold text-center"
                        />
                      </div>

                      {/* Rest */}
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] block">
                          Descanso (s)
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="600"
                          value={alt.targetRestSeconds ?? ""}
                          onChange={(e) =>
                            handleUpdateField(
                              alt.id,
                              "targetRestSeconds",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="60s"
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] font-semibold text-center"
                        />
                      </div>

                      {/* Notes / Method */}
                      <div className="space-y-1 col-span-2 sm:col-span-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] block">
                          Observações / Cuidados Técnicos (Opcional)
                        </label>
                        <input
                          type="text"
                          value={alt.notes ?? ""}
                          onChange={(e) =>
                            handleUpdateField(alt.id, "notes", e.target.value || null)
                          }
                          placeholder="Ex: Ajustar o banco na altura média..."
                          className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons to Add Alternatives */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenPicker}
                className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Adicionar da Biblioteca</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomModalOpen(true)}
                className="py-2.5 px-3 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-[var(--foreground)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Adicionar Personalizado</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5 bg-[var(--surface-subtle)]/30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--foreground)] transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isSaving ? "Salvando..." : `Salvar Alternativas (${alternatives.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Library Picker Modal */}
      {isPickerOpen && (
        <UnifiedExercisePicker
          isOpen={isPickerOpen}
          consultancySlug={consultancySlug}
          onClose={() => setIsPickerOpen(false)}
          onSelectExercise={handleSelectFromLibrary}
          onOpenCustomModal={() => {
            setIsPickerOpen(false);
            setIsCustomModalOpen(true);
          }}
          contextTitle="Escolher Exercício Alternativo"
          selectButtonLabel="Adicionar como Alternativa"
        />
      )}

      {/* Custom Exercise Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleAddCustom}
            className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h4 className="text-sm font-extrabold text-[var(--foreground)]">
                Criar Alternativa Personalizada
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--foreground)]">Nome do Exercício *</label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Agachamento no Hack..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--foreground)] focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--foreground-muted)]">Grupo Muscular</label>
                <input
                  type="text"
                  value={customMuscleGroup}
                  onChange={(e) => setCustomMuscleGroup(e.target.value)}
                  placeholder="Ex: Quadríceps, Glúteos..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--foreground)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--foreground-muted)]">Equipamento</label>
                <input
                  type="text"
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  placeholder="Ex: Máquina Hack, Halteres..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--foreground)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!customName.trim()}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
