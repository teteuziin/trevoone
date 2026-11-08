"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { WorkoutBlockItemDto } from "@/lib/training-v2/types";

interface ExerciseCardProps {
  item: WorkoutBlockItemDto;
  index: number;
  totalItems: number;
  onUpdateConfig: (itemPublicId: string, updates: {
    setsCount?: number;
    reps?: string;
    loadKg?: number | null;
    restSeconds?: number | null;
    notes?: string;
    tempo?: string;
    rpeTarget?: number | null;
  }) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onStartBiSet?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function ArrowUpIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}

function ArrowDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export function ExerciseCard({
  item,
  index,
  onUpdateConfig,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onStartBiSet,
  isFirst = false,
  isLast = false,
}: ExerciseCardProps) {
  // Normalize initial values from item
  const setsCount = item.sets?.length || 3;
  const firstSet = item.sets?.[0];
  const initialReps =
    firstSet?.targetReps && firstSet?.targetRepsMax
      ? `${firstSet.targetReps}-${firstSet.targetRepsMax}`
      : firstSet?.targetReps
      ? String(firstSet.targetReps)
      : "10";
  const initialLoad = firstSet?.targetLoadKg ?? null;
  const initialRest = firstSet?.targetRestSeconds ?? 60;

  // Local string states allowing complete clearing, temporary empty strings, and normal typing
  const [setsStr, setSetsStr] = useState<string>(String(setsCount));
  const [repsStr, setRepsStr] = useState<string>(initialReps);
  const [loadStr, setLoadStr] = useState<string>(initialLoad !== null ? String(initialLoad) : "");
  const [restStr, setRestStr] = useState<string>(String(initialRest));
  const [notesStr, setNotesStr] = useState<string>(item.notes || "");
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(Boolean(item.notes));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(Boolean(item.targetCadence || item.targetRpe));
  const [tempoStr, setTempoStr] = useState<string>(item.targetCadence || "");
  const [rpeStr, setRpeStr] = useState<string>(item.targetRpe ? String(item.targetRpe) : "");

  // Track last committed values to prevent duplicate action invocations
  const lastCommittedRef = useRef<{
    setsCount: number;
    reps: string;
    loadKg: number | null;
    restSeconds: number | null;
    notes: string;
    tempo?: string;
    rpeTarget: number | null;
  }>({
    setsCount,
    reps: initialReps,
    loadKg: initialLoad,
    restSeconds: initialRest,
    notes: item.notes || "",
    tempo: item.targetCadence || undefined,
    rpeTarget: item.targetRpe ?? null,
  });

  // Keep ref in sync if item changes from outside
  useEffect(() => {
    lastCommittedRef.current = {
      setsCount,
      reps: initialReps,
      loadKg: initialLoad,
      restSeconds: initialRest,
      notes: item.notes || "",
      tempo: item.targetCadence || undefined,
      rpeTarget: item.targetRpe ?? null,
    };
  }, [item.publicId, setsCount, initialReps, initialLoad, initialRest, item.notes, item.targetCadence, item.targetRpe]);

  const commitUpdates = useCallback(
    (overrides?: {
      setsCount?: number;
      reps?: string;
      loadKg?: number | null;
      restSeconds?: number | null;
      notes?: string;
      tempo?: string;
      rpeTarget?: number | null;
    }) => {
      // Parse sets
      let setsVal = overrides?.setsCount;
      if (setsVal === undefined) {
        const parsed = parseInt(setsStr.trim(), 10);
        setsVal = !isNaN(parsed) && parsed > 0 ? Math.min(30, parsed) : lastCommittedRef.current.setsCount;
      }

      // Parse reps
      let repsVal = overrides?.reps;
      if (repsVal === undefined) {
        repsVal = repsStr.trim() || lastCommittedRef.current.reps || "10";
      }

      // Parse load
      let loadVal = overrides?.loadKg;
      if (loadVal === undefined) {
        const trimmed = loadStr.trim();
        if (!trimmed) {
          loadVal = null;
        } else {
          const parsed = parseFloat(trimmed.replace(",", "."));
          loadVal = !isNaN(parsed) && parsed >= 0 ? parsed : null;
        }
      }

      // Parse rest
      let restVal = overrides?.restSeconds;
      if (restVal === undefined) {
        const parsed = parseInt(restStr.trim(), 10);
        restVal = !isNaN(parsed) && parsed >= 0 ? Math.min(900, parsed) : lastCommittedRef.current.restSeconds;
      }

      // Notes & Advanced
      const notesVal = overrides?.notes !== undefined ? overrides.notes : notesStr.trim();
      const tempoVal = overrides?.tempo !== undefined ? overrides.tempo : tempoStr.trim() || undefined;

      let rpeVal = overrides?.rpeTarget;
      if (rpeVal === undefined) {
        const trimmed = rpeStr.trim();
        if (!trimmed) {
          rpeVal = null;
        } else {
          const parsed = parseFloat(trimmed.replace(",", "."));
          rpeVal = !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
        }
      }

      // Check if anything actually changed compared to last committed
      const last = lastCommittedRef.current;
      const isChanged =
        last.setsCount !== setsVal ||
        last.reps !== repsVal ||
        last.loadKg !== loadVal ||
        last.restSeconds !== restVal ||
        last.notes !== notesVal ||
        last.tempo !== tempoVal ||
        last.rpeTarget !== rpeVal;

      if (!isChanged) return;

      const payload = {
        setsCount: setsVal,
        reps: repsVal,
        loadKg: loadVal,
        restSeconds: restVal,
        notes: notesVal,
        tempo: tempoVal,
        rpeTarget: rpeVal,
      };

      lastCommittedRef.current = payload;
      onUpdateConfig(item.publicId, payload);
    },
    [setsStr, repsStr, loadStr, restStr, notesStr, tempoStr, rpeStr, item.publicId, onUpdateConfig]
  );

  // Debounced auto-save while typing:
  // Holds off commit if user is in an intermediate empty state, so they can erase and type without interference
  useEffect(() => {
    const trimmedSets = setsStr.trim();
    const trimmedRest = restStr.trim();

    // If a required field is temporarily empty while typing, do not fire debounced auto-save
    if (trimmedSets === "" || trimmedRest === "") {
      return;
    }

    const timer = setTimeout(() => {
      commitUpdates();
    }, 500);

    return () => clearTimeout(timer);
  }, [setsStr, repsStr, loadStr, restStr, notesStr, tempoStr, rpeStr, commitUpdates]);

  // Flush on unmount if any pending valid change
  useEffect(() => {
    return () => {
      commitUpdates();
    };
  }, [commitUpdates]);

  // ---------------------------------------------------------------------------
  // Handlers for onBlur (normalize and immediately commit without debounce)
  // ---------------------------------------------------------------------------
  const handleSetsBlur = () => {
    const trimmed = setsStr.trim();
    if (!trimmed) {
      const fallback = String(lastCommittedRef.current.setsCount || 3);
      setSetsStr(fallback);
      commitUpdates({ setsCount: parseInt(fallback, 10) });
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 1) {
      setSetsStr("1");
      commitUpdates({ setsCount: 1 });
    } else if (parsed > 30) {
      setSetsStr("30");
      commitUpdates({ setsCount: 30 });
    } else {
      setSetsStr(String(parsed));
      commitUpdates({ setsCount: parsed });
    }
  };

  const handleRestBlur = () => {
    const trimmed = restStr.trim();
    if (!trimmed) {
      const fallback = String(lastCommittedRef.current.restSeconds ?? 60);
      setRestStr(fallback);
      commitUpdates({ restSeconds: parseInt(fallback, 10) });
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed) || parsed < 0) {
      setRestStr("0");
      commitUpdates({ restSeconds: 0 });
    } else if (parsed > 900) {
      setRestStr("900");
      commitUpdates({ restSeconds: 900 });
    } else {
      setRestStr(String(parsed));
      commitUpdates({ restSeconds: parsed });
    }
  };

  const handleLoadBlur = () => {
    const trimmed = loadStr.trim();
    if (!trimmed) {
      setLoadStr("");
      commitUpdates({ loadKg: null });
      return;
    }
    const parsed = parseFloat(trimmed.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      setLoadStr("");
      commitUpdates({ loadKg: null });
    } else {
      setLoadStr(String(parsed));
      commitUpdates({ loadKg: parsed });
    }
  };

  const handleRepsBlur = () => {
    const trimmed = repsStr.trim();
    if (!trimmed) {
      setRepsStr("10");
      commitUpdates({ reps: "10" });
    } else {
      commitUpdates({ reps: trimmed });
    }
  };

  const handleRpeBlur = () => {
    const trimmed = rpeStr.trim();
    if (!trimmed) {
      setRpeStr("");
      commitUpdates({ rpeTarget: null });
      return;
    }
    const parsed = parseFloat(trimmed.replace(",", "."));
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      setRpeStr("");
      commitUpdates({ rpeTarget: null });
    } else {
      setRpeStr(String(parsed));
      commitUpdates({ rpeTarget: parsed });
    }
  };

  const handleTempoBlur = () => {
    commitUpdates({ tempo: tempoStr.trim() || undefined });
  };

  const handleNotesBlur = () => {
    commitUpdates({ notes: notesStr.trim() });
  };

  const indexPadded = String(index + 1).padStart(2, "0");

  return (
    <div className="w-full bg-white border border-[#E5E8E2] hover:border-[#C6E2D1] rounded-2xl p-3.5 sm:p-4.5 shadow-xs transition-all space-y-3">
      {/* Top Header: Ordem + Nome + Músculo + Ações Rápidas */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Badge de Ordem */}
          <span className="w-7 h-7 rounded-xl bg-[#F0F5F2] text-[#176B49] text-xs font-black flex items-center justify-center shrink-0 select-none">
            {indexPadded}
          </span>

          {/* Nome e Tags */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-[#102E23] leading-snug truncate font-sans">
              {item.exerciseNameSnapshot}
            </h3>

            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {item.muscleGroupSnapshot && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F0EA] text-[#176B49]">
                  {item.muscleGroupSnapshot}
                </span>
              )}
              {item.equipmentSnapshot && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F0] text-[#526058]">
                  {item.equipmentSnapshot}
                </span>
              )}
              {(item.customVideoUrl || (item.pinnedMedia && item.pinnedMedia.length > 0)) && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">
                  ▶ Vídeo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ações Rápidas: Subir, Descer, Duplicar, Excluir */}
        <div className="flex items-center gap-1 shrink-0 bg-[#F5F5F0] p-1 rounded-xl">
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:text-[#102E23] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Mover para cima"
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:text-[#102E23] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Mover para baixo"
          >
            <ArrowDownIcon />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:text-[#102E23] hover:bg-white transition-colors cursor-pointer"
            title="Duplicar exercício"
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remover "${item.exerciseNameSnapshot}"?`)) {
                onDelete();
              }
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#526058] hover:text-[#DC2626] hover:bg-white transition-colors cursor-pointer"
            title="Remover exercício"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Grid de Parâmetros Diretos (Séries, Reps, Carga, Descanso) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#F0F2ED]">
        {/* Séries */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Séries
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={setsStr}
              onChange={(e) => setSetsStr(e.target.value)}
              onBlur={handleSetsBlur}
              onFocus={(e) => e.target.select()}
              placeholder="3"
              className="w-full text-sm font-bold text-[#102E23] bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* Repetições */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Repetições
          </label>
          <input
            type="text"
            inputMode="text"
            value={repsStr}
            onChange={(e) => setRepsStr(e.target.value)}
            onBlur={handleRepsBlur}
            onFocus={(e) => e.target.select()}
            placeholder="Ex: 8-12"
            className="w-full text-sm font-bold text-[#102E23] bg-transparent focus:outline-none"
          />
        </div>

        {/* Carga */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Carga (kg)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={loadStr}
            onChange={(e) => setLoadStr(e.target.value)}
            onBlur={handleLoadBlur}
            onFocus={(e) => e.target.select()}
            placeholder="Opcional"
            className="w-full text-sm font-bold text-[#102E23] bg-transparent focus:outline-none"
          />
        </div>

        {/* Descanso */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Descanso (seg)
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={restStr}
              onChange={(e) => setRestStr(e.target.value)}
              onBlur={handleRestBlur}
              onFocus={(e) => e.target.select()}
              placeholder="60"
              className="w-full text-sm font-bold text-[#102E23] bg-transparent focus:outline-none"
            />
            <span className="text-xs text-[#6B7870] font-semibold">s</span>
          </div>
        </div>
      </div>

      {/* Observações e Parâmetros Avançados Expansíveis */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between text-[11px] text-[#526058]">
          <button
            type="button"
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className="hover:text-[#176B49] font-medium transition-colors cursor-pointer"
          >
            {isNotesOpen ? "Ocultar observações" : "+ Adicionar observação"}
          </button>

          <div className="flex items-center gap-3">
            {onStartBiSet && (
              <button
                type="button"
                onClick={onStartBiSet}
                className="hover:text-[#176B49] font-bold text-[#176B49] transition-colors cursor-pointer"
              >
                ⚡ Criar Bi-set com este
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="hover:text-[#176B49] font-medium transition-colors cursor-pointer"
            >
              {isAdvancedOpen ? "Ocultar avançado" : "+ RPE & Cadência"}
            </button>
          </div>
        </div>

        {/* Campo de Observações */}
        {isNotesOpen && (
          <div className="pt-1 animate-in fade-in duration-100">
            <input
              type="text"
              value={notesStr}
              onChange={(e) => setNotesStr(e.target.value)}
              onBlur={handleNotesBlur}
              onFocus={(e) => e.target.select()}
              placeholder="Ex: Foco no pico de contração; segurar 1s embaixo..."
              className="w-full px-3 py-1.5 text-xs text-[#102E23] bg-[#FBFBF9] border border-[#EAEFEA] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#176B49]"
            />
          </div>
        )}

        {/* Campos Avançados: Cadência e RPE */}
        {isAdvancedOpen && (
          <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-100">
            <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
                Cadência / Tempo
              </label>
              <input
                type="text"
                value={tempoStr}
                onChange={(e) => setTempoStr(e.target.value)}
                onBlur={handleTempoBlur}
                onFocus={(e) => e.target.select()}
                placeholder="Ex: 3-0-1-0"
                className="w-full text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
              />
            </div>
            <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
                RPE Alvo (1 a 10)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={rpeStr}
                onChange={(e) => setRpeStr(e.target.value)}
                onBlur={handleRpeBlur}
                onFocus={(e) => e.target.select()}
                placeholder="Ex: 8.5"
                className="w-full text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
