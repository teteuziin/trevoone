"use client";

import { useState } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutBlockType,
  PrescriptionMode,
  CardioMethodConfig,
  RestPauseMethodConfig,
  WarmupMethodConfig,
} from "@/lib/training-v2/types";
import { CircuitConfigEditor } from "./circuit-config-editor";
import { DropSetEditor } from "./drop-set-editor";
import { RestPauseEditor } from "./rest-pause-editor";
import { CardioEditor } from "./cardio-editor";
import { WarmupEditor } from "./warmup-editor";

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

const METHOD_META: Record<
  WorkoutBlockType,
  { label: string; badge: string; color: string; maxItems: number }
> = {
  SINGLE: {
    label: "Série Simples",
    badge: "Tradicional",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    maxItems: 1,
  },
  BI_SET: {
    label: "Bi-Set",
    badge: "2 Exercícios",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    maxItems: 2,
  },
  TRI_SET: {
    label: "Tri-Set",
    badge: "3 Exercícios",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    maxItems: 3,
  },
  SUPER_SET: {
    label: "Super-Set",
    badge: "2 Exercícios em Sequência",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    maxItems: 2,
  },
  CIRCUIT: {
    label: "Circuito",
    badge: "Voltas & Estações",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    maxItems: 10,
  },
  DROP_SET: {
    label: "Drop-Set",
    badge: "Redução de Carga",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    maxItems: 1,
  },
  REST_PAUSE: {
    label: "Rest-Pause",
    badge: "Intra-Pausa Curta",
    color: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
    maxItems: 1,
  },
  COMBINED_SET: {
    label: "Série Combinada",
    badge: "2+ Exercícios Combinados",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    maxItems: 10,
  },
  WARMUP: {
    label: "Aquecimento",
    badge: "Mobilidade / Ativação",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    maxItems: 10,
  },
  CARDIO: {
    label: "Cardio",
    badge: "Aeróbio & Metabólico",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    maxItems: 1,
  },
  CUSTOM: {
    label: "Personalizado",
    badge: "Estrutura Livre",
    color: "bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20",
    maxItems: 10,
  },
};

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
  onUpdateCircuitConfig?: (config: {
    rounds: number;
    restBetweenItemsSeconds: number;
    restBetweenRoundsSeconds: number;
    restAfterBlockSeconds: number;
    instructions: string | null;
  }) => Promise<void>;
  onReplaceDropSet?: (
    itemPublicId: string,
    payload: {
      initialSet: {
        targetReps?: number | null;
        targetRepsMax?: number | null;
        targetLoadKg?: number | null;
        targetRestSeconds?: number | null;
        intensityIndicator?: string | null;
      };
      dropStages: Array<{
        targetReps?: number | null;
        targetRepsMax?: number | null;
        targetLoadKg?: number | null;
        intensityIndicator?: string | null;
      }>;
    }
  ) => Promise<void>;
  onReplaceRestPause?: (
    itemPublicId: string,
    payload: {
      config: {
        intraPauseSeconds: number;
        targetTotalReps?: number | null;
      };
      initialSet: {
        targetReps?: number | null;
        targetLoadKg?: number | null;
        targetRestSeconds?: number | null;
        intensityIndicator?: string | null;
      };
      miniSets: Array<{
        targetReps?: number | null;
        targetLoadKg?: number | null;
        intensityIndicator?: string | null;
      }>;
    }
  ) => Promise<void>;
  onUpdateCardio?: (
    itemPublicId: string,
    payload: {
      prescriptionMode: PrescriptionMode;
      config: CardioMethodConfig;
      targetDurationSeconds?: number | null;
      targetDistanceMeters?: number | null;
      targetRestSeconds?: number | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onUpdateWarmup?: (
    itemPublicId: string,
    payload: {
      config: WarmupMethodConfig;
    }
  ) => Promise<void>;
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
  onUpdateCircuitConfig,
  onReplaceDropSet,
  onReplaceRestPause,
  onUpdateCardio,
  onUpdateWarmup,
}: WorkoutBlockCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(block.title || "");
  const [savingTitle, setSavingTitle] = useState(false);

  const [savingItemSetId, setSavingItemSetId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const methodMeta = METHOD_META[block.blockType] || METHOD_META.SINGLE;
  const items = block.items || [];
  const canAddMoreItems = items.length < methodMeta.maxItems;

  async function handleSaveTitle() {
    try {
      setSavingTitle(true);
      await onUpdateBlockTitle(titleValue.trim() || null);
      setIsEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  }

  // Generic Normal Set handlers for an item
  async function handleAddNormalSet(targetItem: WorkoutBlockItemDto) {
    const currentSets = targetItem.sets || [];
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
      setSavingItemSetId(targetItem.publicId);
      await onUpdateSets(targetItem.publicId, newSets);
    } finally {
      setSavingItemSetId(null);
    }
  }

  async function handleRemoveNormalSet(targetItem: WorkoutBlockItemDto, setIndex: number) {
    const currentSets = targetItem.sets || [];
    const filtered = currentSets.filter((_, idx) => idx !== setIndex);
    const reindexed = filtered.map((s, idx) => ({
      setNumber: idx + 1,
      targetReps: s.targetReps,
      targetRepsMax: s.targetRepsMax,
      targetLoadKg: s.targetLoadKg,
      targetRestSeconds: s.targetRestSeconds,
    }));

    try {
      setSavingItemSetId(targetItem.publicId);
      await onUpdateSets(targetItem.publicId, reindexed);
    } finally {
      setSavingItemSetId(null);
    }
  }

  async function handleNormalSetFieldChange(
    targetItem: WorkoutBlockItemDto,
    setIndex: number,
    field: "targetReps" | "targetRepsMax" | "targetLoadKg" | "targetRestSeconds",
    value: string
  ) {
    const currentSets = targetItem.sets || [];
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
      setSavingItemSetId(targetItem.publicId);
      await onUpdateSets(targetItem.publicId, updated);
    } finally {
      setSavingItemSetId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs overflow-hidden transition-all hover:border-[var(--border-subtle)]">
      {/* Block Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[var(--primary)] text-white shrink-0">
            BLOCO {blockIndex + 1}
          </span>

          <span
            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border shrink-0 ${methodMeta.color}`}
          >
            {methodMeta.label}
          </span>

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="Rótulo do bloco (ex: Peito, Aquecimento...)"
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)] text-[var(--foreground)]"
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
              {block.title ? (
                block.title
              ) : (
                <span className="text-[var(--foreground-muted)] italic">+ Adicionar rótulo</span>
              )}
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
            Confirmar remoção deste bloco e todos os seus exercícios?
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
      <div className="p-4 sm:p-6 space-y-5">
        {/* Method-specific Block Level Configuration (e.g. CIRCUIT rounds & intervals) */}
        {block.blockType === "CIRCUIT" && onUpdateCircuitConfig && (
          <CircuitConfigEditor block={block} onSave={onUpdateCircuitConfig} />
        )}

        {/* Empty Block State */}
        {items.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--surface-subtle)]/50 space-y-3">
            <Dumbbell className="w-7 h-7 mx-auto text-[var(--foreground-muted)] opacity-60" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                Bloco {methodMeta.label} sem exercício
              </h4>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Selecione um exercício da biblioteca ou crie um personalizado para iniciar este bloco.
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
          /* Render Items List */
          <div className="space-y-6">
            {items.map((item, itemIdx) => (
              <div
                key={item.publicId}
                className="space-y-3 pt-1 first:pt-0 border-t first:border-t-0 border-[var(--border-subtle)]"
              >
                {/* Item Header & Snapshot info */}
                <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {methodMeta.maxItems > 1 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-900 text-white shrink-0">
                          Ex {itemIdx + 1}
                        </span>
                      )}
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
                      <p className="text-xs text-[var(--foreground-muted)] pt-0.5 italic line-clamp-2">
                        {item.instructionsSnapshot}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.publicId)}
                    title="Remover exercício do bloco"
                    className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Method-Specific Editors */}
                {block.blockType === "DROP_SET" && onReplaceDropSet ? (
                  <DropSetEditor
                    itemPublicId={item.publicId}
                    existingSets={item.sets || []}
                    onSave={(payload) => onReplaceDropSet(item.publicId, payload)}
                  />
                ) : block.blockType === "REST_PAUSE" && onReplaceRestPause ? (
                  <RestPauseEditor
                    itemPublicId={item.publicId}
                    methodConfig={(item.methodConfig as RestPauseMethodConfig) || null}
                    existingSets={item.sets || []}
                    onSave={(payload) => onReplaceRestPause(item.publicId, payload)}
                  />
                ) : block.blockType === "CARDIO" && onUpdateCardio ? (
                  <CardioEditor
                    itemPublicId={item.publicId}
                    prescriptionMode={item.prescriptionMode}
                    methodConfig={(item.methodConfig as CardioMethodConfig) || null}
                    existingSets={item.sets || []}
                    itemNotes={item.notes}
                    onSave={(payload) => onUpdateCardio(item.publicId, payload)}
                  />
                ) : (
                  /* Standard / Multi-Exercise Set Series Editor */
                  <div className="space-y-4 pt-1">
                    {/* Method-Specific Warmup Configuration */}
                    {block.blockType === "WARMUP" && onUpdateWarmup && (
                      <WarmupEditor
                        itemPublicId={item.publicId}
                        methodConfig={(item.methodConfig as WarmupMethodConfig) || null}
                        onSave={(payload) => onUpdateWarmup(item.publicId, payload)}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          Séries Prescritas {methodMeta.maxItems > 1 ? `(Ex ${itemIdx + 1})` : ""}
                        </h5>
                        {savingItemSetId === item.publicId && (
                          <span className="text-[11px] text-[var(--primary)] flex items-center gap-1 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Salvando...
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddNormalSet(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Série
                      </button>
                    </div>

                    {/* Set rows */}
                    <div className="space-y-2">
                      {!item.sets || item.sets.length === 0 ? (
                        <div className="text-center py-3 text-xs text-[var(--foreground-muted)] border border-dashed border-[var(--border-default)] rounded-xl">
                          Nenhuma série cadastrada. Clique em &quot;+ Adicionar Série&quot;.
                        </div>
                      ) : (
                        item.sets.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-[70px]">
                              <span className="font-bold text-[var(--foreground)]">
                                Série {sIdx + 1}
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
                                  onBlur={(e) =>
                                    handleNormalSetFieldChange(item, sIdx, "targetReps", e.target.value)
                                  }
                                  className="w-14 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                                  placeholder="Min"
                                />
                                <span className="text-[var(--foreground-muted)]">-</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="500"
                                  defaultValue={s.targetRepsMax ?? ""}
                                  onBlur={(e) =>
                                    handleNormalSetFieldChange(
                                      item,
                                      sIdx,
                                      "targetRepsMax",
                                      e.target.value
                                    )
                                  }
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
                                  onBlur={(e) =>
                                    handleNormalSetFieldChange(
                                      item,
                                      sIdx,
                                      "targetLoadKg",
                                      e.target.value
                                    )
                                  }
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
                                  onBlur={(e) =>
                                    handleNormalSetFieldChange(
                                      item,
                                      sIdx,
                                      "targetRestSeconds",
                                      e.target.value
                                    )
                                  }
                                  className="w-14 px-2 py-1 text-center rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                                  placeholder="s"
                                />
                                <span className="text-[var(--foreground-muted)]">s</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveNormalSet(item, sIdx)}
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
                )}
              </div>
            ))}

            {/* Slot to add another exercise if under cardinality limit */}
            {canAddMoreItems && (
              <div className="pt-2 border-t border-dashed border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={onOpenPicker}
                  className="w-full py-2.5 px-4 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all active:scale-99"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar {items.length + 1}º Exercício ({methodMeta.label})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
