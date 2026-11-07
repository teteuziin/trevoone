"use client";

import React, { useState, useEffect } from "react";
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
  // Normalize sets
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

  const [sets, setSets] = useState<number>(setsCount);
  const [reps, setReps] = useState<string>(initialReps);
  const [load, setLoad] = useState<string>(initialLoad !== null ? String(initialLoad) : "");
  const [rest, setRest] = useState<number>(initialRest);
  const [notes, setNotes] = useState<string>(item.notes || "");
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(Boolean(item.notes));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(Boolean(item.targetCadence || item.targetRpe));
  const [tempo, setTempo] = useState<string>(item.targetCadence || "");
  const [rpe, setRpe] = useState<string>(item.targetRpe ? String(item.targetRpe) : "");

  // Debounced auto-save when parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsedLoad = load.trim() ? parseFloat(load.replace(",", ".")) : null;
      const parsedRpe = rpe.trim() ? parseFloat(rpe) : null;

      onUpdateConfig(item.publicId, {
        setsCount: sets,
        reps,
        loadKg: Number.isNaN(parsedLoad) ? null : parsedLoad,
        restSeconds: rest,
        notes: notes.trim(),
        tempo: tempo.trim() || undefined,
        rpeTarget: Number.isNaN(parsedRpe) ? null : parsedRpe,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [sets, reps, load, rest, notes, tempo, rpe, item.publicId, onUpdateConfig]);

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
              type="number"
              min={1}
              max={20}
              value={sets}
              onChange={(e) => setSets(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
            value={reps}
            onChange={(e) => setReps(e.target.value)}
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
            value={load}
            onChange={(e) => setLoad(e.target.value)}
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
              type="number"
              step={5}
              min={0}
              max={600}
              value={rest}
              onChange={(e) => setRest(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="Ex: 3-0-1-0"
                className="w-full text-xs font-bold text-[#102E23] bg-transparent focus:outline-none"
              />
            </div>
            <div className="p-2 rounded-xl bg-[#FBFBF9] border border-[#EAEFEA]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7870] block">
                RPE Alvo (1 a 10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
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
