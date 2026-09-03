"use client";

import { useState } from "react";
import type { WorkoutBlockDto, WorkoutBlockItemDto } from "@/lib/training-v2/types";
function ChevronUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Copy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function Trash2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function Plus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function Dumbbell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function Video({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function MoreVertical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
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

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type WorkoutBlockCardProps = {
  block: WorkoutBlockDto;
  blockIndex: number;
  totalBlocks: number;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onRemove: () => Promise<void>;
  onOpenPicker: () => void;
  onRemoveItem: (itemPublicId: string) => Promise<void>;
  onUpdateSets: (
    itemPublicId: string,
    sets: Array<{
      setNumber: number;
      targetReps?: number | null;
      targetRepsMax?: number | null;
      targetLoadKg?: number | null;
      targetRestSeconds?: number | null;
    }>
  ) => Promise<void>;
  onUpdateBlockTitle: (title: string | null) => Promise<void>;
};

export function WorkoutBlockCard({
  block,
  blockIndex,
  totalBlocks,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onOpenPicker,
  onRemoveItem,
  onUpdateSets,
  onUpdateBlockTitle,
}: WorkoutBlockCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(block.title || "");
  const [savingTitle, setSavingTitle] = useState(false);

  const [savingSets, setSavingSets] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Item in this SINGLE block (E1 standard)
  const item: WorkoutBlockItemDto | undefined = block.items[0];

  async function handleSaveTitle() {
    try {
      setSavingTitle(true);
      await onUpdateBlockTitle(titleValue.trim() || null);
      setIsEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  }

  // Set management
  async function handleAddSet() {
    if (!item) return;
    const currentSets = item.sets || [];
    const lastSet = currentSets[currentSets.length - 1];
    const newSetNumber = currentSets.length + 1;

    const newSets = [
      ...currentSets.map((s) => ({
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        targetRepsMax: s.targetRepsMax,
        targetLoadKg: s.targetLoadKg,
        targetRestSeconds: s.targetRestSeconds,
      })),
      {
        setNumber: newSetNumber,
        targetReps: lastSet?.targetReps ?? 10,
        targetRepsMax: lastSet?.targetRepsMax ?? 12,
        targetLoadKg: lastSet?.targetLoadKg ?? null,
        targetRestSeconds: lastSet?.targetRestSeconds ?? 60,
      },
    ];

    try {
      setSavingSets(true);
      await onUpdateSets(item.publicId, newSets);
    } finally {
      setSavingSets(false);
    }
  }

  async function handleRemoveSet(setIndex: number) {
    if (!item) return;
    const currentSets = item.sets || [];
    const filtered = currentSets.filter((_, idx) => idx !== setIndex);
    const reindexed = filtered.map((s, idx) => ({
      setNumber: idx + 1,
      targetReps: s.targetReps,
      targetRepsMax: s.targetRepsMax,
      targetLoadKg: s.targetLoadKg,
      targetRestSeconds: s.targetRestSeconds,
    }));

    try {
      setSavingSets(true);
      await onUpdateSets(item.publicId, reindexed);
    } finally {
      setSavingSets(false);
    }
  }

  async function handleSetFieldChange(
    setIndex: number,
    field: "targetReps" | "targetRepsMax" | "targetLoadKg" | "targetRestSeconds",
    value: string
  ) {
    if (!item) return;
    const currentSets = item.sets || [];
    const parsedVal = value.trim() ? Number(value) : null;

    const updated = currentSets.map((s, idx) => {
      if (idx === setIndex) {
        return {
          setNumber: s.setNumber,
          targetReps: field === "targetReps" ? parsedVal : s.targetReps,
          targetRepsMax: field === "targetRepsMax" ? parsedVal : s.targetRepsMax,
          targetLoadKg: field === "targetLoadKg" ? parsedVal : s.targetLoadKg,
          targetRestSeconds: field === "targetRestSeconds" ? parsedVal : s.targetRestSeconds,
        };
      }
      return {
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        targetRepsMax: s.targetRepsMax,
        targetLoadKg: s.targetLoadKg,
        targetRestSeconds: s.targetRestSeconds,
      };
    });

    try {
      setSavingSets(true);
      await onUpdateSets(item.publicId, updated);
    } finally {
      setSavingSets(false);
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs overflow-hidden transition-all hover:border-[var(--border-subtle)]">
      {/* Block Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--primary)] text-white shrink-0">
            BLOCO {blockIndex + 1}
          </span>

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="Rótulo do bloco (ex: Peito, Aquecimento...)"
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="p-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors shrink-0"
              >
                {savingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="text-xs font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors truncate text-left"
            >
              {block.title ? block.title : <span className="text-[var(--foreground-muted)] italic">+ Adicionar rótulo</span>}
            </button>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={blockIndex === 0}
            title="Mover para cima"
            className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={blockIndex === totalBlocks - 1}
            title="Mover para baixo"
            className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--foreground)] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-lg py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="w-full px-3.5 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-subtle)] flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                  Duplicar bloco
                </button>
                <div className="my-1 border-t border-[var(--border-subtle)]" />
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full px-3.5 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover bloco
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Banner */}
      {confirmDelete && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-3 text-xs">
          <span className="text-red-700 dark:text-red-300 font-medium">
            Confirmar remoção deste bloco e seus exercícios?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                onRemove();
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </button>
          </div>
        </div>
      )}

      {/* Block Body */}
      <div className="p-4 sm:p-6 space-y-4">
        {!item ? (
          /* Empty Block: Prompt to add exercise */
          <div className="p-6 text-center border-2 border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--surface-subtle)]/50 space-y-3">
            <Dumbbell className="w-7 h-7 mx-auto text-[var(--foreground-muted)] opacity-60" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                Bloco sem exercício
              </h4>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Selecione um exercício da biblioteca ou crie um personalizado para compor este bloco.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPicker}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Exercício
            </button>
          </div>
        ) : (
          /* Exercise Item Details */
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--foreground)] truncate">
                    {item.exerciseNameSnapshot}
                  </h4>
                  {item.exercisePublicId ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      Biblioteca
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                      Personalizado
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
                  {item.muscleGroupSnapshot && <span>{item.muscleGroupSnapshot}</span>}
                  {item.equipmentSnapshot && (
                    <>
                      <span>•</span>
                      <span>{item.equipmentSnapshot}</span>
                    </>
                  )}
                  {item.pinnedMedia && item.pinnedMedia.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--primary)] font-medium">
                        <Video className="w-3 h-3" />
                        Vídeo fixado
                      </span>
                    </>
                  )}
                </div>

                {item.instructionsSnapshot && (
                  <p className="text-xs text-[var(--foreground-muted)] pt-1 italic line-clamp-2">
                    {item.instructionsSnapshot}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onRemoveItem(item.publicId)}
                title="Substituir ou remover exercício"
                className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Simple NORMAL Series Editor */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Séries Prescritas
                  </h5>
                  {savingSets && (
                    <span className="text-[11px] text-[var(--primary)] flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Salvando...
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddSet}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Série
                </button>
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {(!item.sets || item.sets.length === 0) ? (
                  <div className="text-center py-4 text-xs text-[var(--foreground-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
                    Nenhuma série cadastrada. Clique em &quot;+ Adicionar Série&quot;.
                  </div>
                ) : (
                  item.sets.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-[70px]">
                        <span className="font-bold text-[var(--foreground)]">
                          Série {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-1 justify-end sm:justify-start">
                        {/* Reps min - max */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--foreground-muted)]">Reps:</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            defaultValue={s.targetReps ?? ""}
                            onBlur={(e) => handleSetFieldChange(idx, "targetReps", e.target.value)}
                            className="w-14 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                            placeholder="Min"
                          />
                          <span className="text-[var(--foreground-muted)]">-</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            defaultValue={s.targetRepsMax ?? ""}
                            onBlur={(e) => handleSetFieldChange(idx, "targetRepsMax", e.target.value)}
                            className="w-14 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                            placeholder="Max"
                          />
                        </div>

                        {/* Load kg */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--foreground-muted)]">Carga:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            defaultValue={s.targetLoadKg ?? ""}
                            onBlur={(e) => handleSetFieldChange(idx, "targetLoadKg", e.target.value)}
                            className="w-16 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                            placeholder="kg"
                          />
                        </div>

                        {/* Rest seconds */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--foreground-muted)]">Descanso:</span>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            max="600"
                            defaultValue={s.targetRestSeconds ?? "60"}
                            onBlur={(e) => handleSetFieldChange(idx, "targetRestSeconds", e.target.value)}
                            className="w-14 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                            placeholder="s"
                          />
                          <span className="text-[var(--foreground-muted)]">s</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSet(idx)}
                        disabled={item.sets.length === 1}
                        title="Remover série"
                        className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
