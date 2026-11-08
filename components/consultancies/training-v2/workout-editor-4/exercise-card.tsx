"use client";

import React, { useState, useCallback, useRef } from "react";
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
  onOpenMethodMenu?: () => void;
  onPreviewVideo?: () => void;
  onSwapSlot?: () => void;
  onReplaceExercise?: () => void;
  slotLabel?: string;
  isFirst?: boolean;
  isLast?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onLongPressReorder?: () => void;
  isDragging?: boolean;
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

function DragHandleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function PlayCircleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowsRightLeftIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
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
  onOpenMethodMenu,
  onPreviewVideo,
  onSwapSlot,
  onReplaceExercise,
  slotLabel,
  isFirst = false,
  isLast = false,
  onDragStart,
  onDragOver,
  onDrop,
  onLongPressReorder,
  isDragging = false,
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

  // Local state for fast typing
  const [repsStr, setRepsStr] = useState<string>(initialReps);
  const [loadStr, setLoadStr] = useState<string>(initialLoad !== null ? String(initialLoad) : "");
  const [restStr, setRestStr] = useState<string>(String(initialRest));
  const [notesStr, setNotesStr] = useState<string>(item.notes || "");
  const [rpeStr, setRpeStr] = useState<string>(
    firstSet?.rpeTarget != null ? String(firstSet.rpeTarget) : ""
  );
  const [tempoStr, setTempoStr] = useState<string>(firstSet?.tempo || "");

  // Expandable sections
  const [isNotesOpen, setIsNotesOpen] = useState(Boolean(item.notes));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    Boolean(firstSet?.rpeTarget != null || firstSet?.tempo)
  );

  // Sync external changes during render
  const [prevSync, setPrevSync] = useState({
    reps: initialReps,
    load: initialLoad,
    rest: initialRest,
    notes: item.notes || "",
  });

  if (
    prevSync.reps !== initialReps ||
    prevSync.load !== initialLoad ||
    prevSync.rest !== initialRest ||
    prevSync.notes !== (item.notes || "")
  ) {
    setPrevSync({
      reps: initialReps,
      load: initialLoad,
      rest: initialRest,
      notes: item.notes || "",
    });
    setRepsStr(initialReps);
    setLoadStr(initialLoad !== null ? String(initialLoad) : "");
    setRestStr(String(initialRest));
    setNotesStr(item.notes || "");
  }

  // Mobile Long-Press Detection
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    // If touched an interactive control (input, button, textarea), don't trigger long press
    const target = e.target as HTMLElement;
    if (target.closest("input, button, textarea, a, select")) {
      return;
    }

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore vibration errors
        }
      }
      if (onLongPressReorder) {
        onLongPressReorder();
      }
    }, 380);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If moved more than 10px, it's a page scroll gesture — cancel long press immediately
    if (diffX > 10 || diffY > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      setIsLongPressing(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
    touchStartPos.current = null;
  };

  // Commit updates debounce/blur
  const commitUpdates = useCallback(
    (updates: {
      setsCount?: number;
      reps?: string;
      loadKg?: number | null;
      restSeconds?: number | null;
      notes?: string;
      tempo?: string;
      rpeTarget?: number | null;
    }) => {
      onUpdateConfig(item.publicId, updates);
    },
    [item.publicId, onUpdateConfig]
  );

  // Field Blur handlers
  const handleRestBlur = () => {
    const trimmed = restStr.trim();
    if (!trimmed) {
      setRestStr("60");
      commitUpdates({ restSeconds: 60 });
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

  const hasMedia = Boolean(
    item.customVideoUrl ||
      item.mediaAssetPublicId ||
      item.pinnedMediaAssets?.length
  );

  return (
    <div
      data-testid="exercise-card"
      data-item-id={item.publicId}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`w-full bg-white rounded-2xl p-3.5 sm:p-4.5 shadow-xs transition-all space-y-3 font-sans select-none border ${
        isDragging || isLongPressing
          ? "border-[#176B49] ring-2 ring-[#176B49]/30 shadow-md scale-[1.01] bg-[#F9FCFA]"
          : "border-[#E5E8E2] hover:border-[#C6E2D1]"
      }`}
    >
      {/* Top Header: Ordem + Slot (se houver) + Nome + Músculo + Ações Rápidas */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Drag Handle & Order Badge */}
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <span
              className="text-[#8C9890] hover:text-[#102E23] cursor-grab active:cursor-grabbing p-0.5 rounded touch-none"
              title="Arraste para mover"
            >
              <DragHandleIcon className="w-4 h-4" />
            </span>
            <span className="w-6 h-6 rounded-lg bg-[#F0F5F2] text-[#176B49] text-[11px] font-black flex items-center justify-center select-none">
              {slotLabel ? slotLabel.slice(0, 2) : indexPadded}
            </span>
          </div>

          {/* Nome, Posição e Tags */}
          <div className="min-w-0 flex-1">
            {slotLabel && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#176B49] block mb-0.5">
                {slotLabel}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-bold text-[#102E23] leading-snug truncate">
              {item.exerciseNameSnapshot || "Exercício"}
            </h3>

            <div className="flex items-center gap-2 flex-wrap text-xs text-[#6B7870] mt-0.5">
              {item.muscleGroupSnapshot && (
                <span className="font-semibold text-[#176B49]">
                  {item.muscleGroupSnapshot}
                </span>
              )}
              {item.equipmentSnapshot && (
                <>
                  <span className="text-[#CCD5CB]">•</span>
                  <span>{item.equipmentSnapshot}</span>
                </>
              )}
              {item.isCustomExercise && (
                <>
                  <span className="text-[#CCD5CB]">•</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#CDEED5]">
                    Próprio
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ações Rápidas do Card */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Ver Demonstração em Vídeo/GIF */}
          {onPreviewVideo && (
            <button
              type="button"
              onClick={onPreviewVideo}
              aria-label="Ver demonstração em vídeo"
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                hasMedia
                  ? "bg-[#EBF7EE] text-[#12583B] border-[#CDEED5] hover:bg-[#DDF0E3]"
                  : "bg-white text-[#8C9890] border-[#E5E8E2] hover:text-[#526058]"
              }`}
              title={hasMedia ? "Ver vídeo/GIF do exercício" : "Exercício sem vídeo cadastrado"}
            >
              <PlayCircleIcon className="w-3.5 h-3.5 text-[#176B49]" />
              <span className="hidden sm:inline text-[11px] font-bold">Ver</span>
            </button>
          )}

          {/* Trocar ordem com próximo (quando dentro de combinação) */}
          {onSwapSlot && (
            <button
              type="button"
              onClick={onSwapSlot}
              className="p-1.5 rounded-lg text-[#526058] hover:text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer"
              title="Trocar posição"
            >
              <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Trocar exercício */}
          {onReplaceExercise && (
            <button
              type="button"
              onClick={onReplaceExercise}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
            >
              Trocar
            </button>
          )}

          {/* Subir */}
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label="Mover exercício para cima"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </button>

          {/* Descer */}
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label="Mover exercício para baixo"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </button>

          {/* Duplicar */}
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicar exercício"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>

          {/* Excluir */}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Remover exercício"
            className="p-1.5 rounded-lg text-[#526058] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid de Configuração Rápida: Séries, Repetições, Carga, Descanso */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Séries */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Séries
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={setsCount <= 1}
              onClick={() => commitUpdates({ setsCount: Math.max(1, setsCount - 1) })}
              className="w-6 h-6 rounded-lg bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] hover:bg-[#F5F5F0] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              −
            </button>
            <span className="text-sm font-black text-[#102E23] flex-1 text-center font-mono">
              {setsCount}
            </span>
            <button
              type="button"
              disabled={setsCount >= 10}
              onClick={() => commitUpdates({ setsCount: Math.min(10, setsCount + 1) })}
              className="w-6 h-6 rounded-lg bg-white border border-[#E5E8E2] text-xs font-bold text-[#102E23] hover:bg-[#F5F5F0] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Repetições */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Repetições
          </label>
          <input
            type="text"
            value={repsStr}
            onChange={(e) => setRepsStr(e.target.value)}
            onBlur={handleRepsBlur}
            onFocus={(e) => e.target.select()}
            placeholder="10 ou 8-12"
            className="w-full text-sm font-bold text-[#102E23] bg-transparent focus:outline-none"
          />
        </div>

        {/* Carga (kg) */}
        <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA] space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
            Carga (kg)
          </label>
          <div className="flex items-center gap-1">
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
            {loadStr && <span className="text-xs text-[#6B7870] font-semibold">kg</span>}
          </div>
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

      {/* Observações e Ação de Método */}
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
            {onOpenMethodMenu && (
              <button
                type="button"
                onClick={onOpenMethodMenu}
                className="hover:text-[#176B49] font-bold text-[#176B49] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>⚡ Criar método com este</span>
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
              placeholder="Ex: Executar com amplitude completa, pico de contração de 1s"
              className="w-full px-3 py-1.5 rounded-xl border border-[#E5E8E2] text-xs text-[#102E23] placeholder-[#8C9890] bg-[#FAFBF9] focus:outline-none focus:ring-1 focus:ring-[#176B49]"
            />
          </div>
        )}

        {/* Campos Avançados: RPE e Cadência */}
        {isAdvancedOpen && (
          <div className="pt-1 grid grid-cols-2 gap-2 animate-in fade-in duration-100 bg-[#FAFBF9] p-2.5 rounded-xl border border-[#EAEFEA]">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
                RPE Alvo (1-10)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={rpeStr}
                onChange={(e) => setRpeStr(e.target.value)}
                onBlur={handleRpeBlur}
                placeholder="Ex: 8.5"
                className="w-full text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
                Cadência / Tempo
              </label>
              <input
                type="text"
                value={tempoStr}
                onChange={(e) => setTempoStr(e.target.value)}
                onBlur={handleTempoBlur}
                placeholder="Ex: 3-0-1-0"
                className="w-full text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
