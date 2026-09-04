"use client";

import React, { useState } from "react";
import type { WorkoutItemSetDto } from "@/lib/training-v2/types";

type DropSetEditorProps = {
  itemPublicId: string;
  existingSets: WorkoutItemSetDto[];
  onSave: (payload: {
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
  }) => Promise<void>;
  disabled?: boolean;
};

export function DropSetEditor({
  existingSets,
  onSave,
  disabled = false,
}: DropSetEditorProps) {
  const topSet = existingSets.find((s) => s.setType === "NORMAL") || existingSets[0];
  const initialDrops = existingSets
    .filter((s) => s.setType === "DROP_STAGE")
    .map((s, idx) => ({
      targetReps: s.targetReps ?? 8,
      targetLoadKg: s.targetLoadKg ?? 0,
      intensityIndicator: s.intensityIndicator || `Drop ${idx + 1}`,
    }));

  const [topReps, setTopReps] = useState<number | string>(topSet?.targetReps ?? 10);
  const [topLoad, setTopLoad] = useState<number | string>(topSet?.targetLoadKg ?? 50);
  const [topRest, setTopRest] = useState<number | string>(topSet?.targetRestSeconds ?? 90);
  const [drops, setDrops] = useState<
    Array<{ targetReps: number | string; targetLoadKg: number | string; intensityIndicator: string }>
  >(
    initialDrops.length > 0
      ? initialDrops
      : [
          { targetReps: 8, targetLoadKg: 40, intensityIndicator: "Drop 1 (-20%)" },
          { targetReps: 6, targetLoadKg: 30, intensityIndicator: "Drop 2 (-40%)" },
        ]
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleAddDrop = () => {
    const lastLoad = Number(drops[drops.length - 1]?.targetLoadKg || topLoad);
    const estimatedNextLoad = Math.max(0, Math.round(lastLoad * 0.75));
    setDrops([
      ...drops,
      {
        targetReps: 6,
        targetLoadKg: estimatedNextLoad,
        intensityIndicator: `Drop ${drops.length + 1}`,
      },
    ]);
  };

  const handleRemoveDrop = (index: number) => {
    if (drops.length <= 1) {
      setErrorMsg("O método Drop-Set exige pelo menos 1 redução de carga.");
      return;
    }
    setErrorMsg(null);
    setDrops(drops.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drops.length === 0) {
      setErrorMsg("Adicione ao menos 1 etapa de redução de carga (Drop).");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      await onSave({
        initialSet: {
          targetReps: topReps !== "" ? Number(topReps) : null,
          targetLoadKg: topLoad !== "" ? Number(topLoad) : null,
          targetRestSeconds: topRest !== "" ? Number(topRest) : 90,
          intensityIndicator: "Série Pesada (Falha)",
        },
        dropStages: drops.map((d) => ({
          targetReps: d.targetReps !== "" ? Number(d.targetReps) : null,
          targetLoadKg: d.targetLoadKg !== "" ? Number(d.targetLoadKg) : null,
          intensityIndicator: d.intensityIndicator.trim() || null,
        })),
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar séries de Drop-Set.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="mt-3 bg-purple-50/40 border border-purple-200/70 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
            Estrutura de Drop-Set (Reduções Vinculadas)
          </span>
        </div>
        <span className="text-[11px] text-purple-700 bg-purple-100/60 font-semibold px-2 py-0.5 rounded-md">
          {drops.length} drop{drops.length > 1 ? "s" : ""} encadeado{drops.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Top Set / Main Initial Set */}
      <div className="bg-white border border-purple-200/80 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-stone-900 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            Série Principal (Até a Falha)
          </span>
          <span className="text-[11px] font-medium text-stone-500">
            Pausa pós-drop: {topRest}s
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
              Repetições
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={topReps}
              onChange={(e) => setTopReps(e.target.value)}
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-semibold text-stone-900"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
              Carga (kg)
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={topLoad}
              onChange={(e) => setTopLoad(e.target.value)}
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-semibold text-stone-900"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
              Descanso pós-bloco (s)
            </label>
            <input
              type="number"
              min={0}
              step="5"
              value={topRest}
              onChange={(e) => setTopRest(e.target.value)}
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white text-stone-800"
            />
          </div>
        </div>
      </div>

      {/* Drops stages */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-purple-950">
          Reduções Imediatas (Sem Descanso Intermediário):
        </label>
        {drops.map((drop, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-purple-50/70 border border-purple-200/60 rounded-lg p-2.5 text-xs"
          >
            <span className="w-5 h-5 rounded-md bg-purple-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {idx + 2}
            </span>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Reps</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={drop.targetReps}
                  onChange={(e) => {
                    const next = [...drops];
                    next[idx].targetReps = e.target.value;
                    setDrops(next);
                  }}
                  disabled={disabled || isSaving}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:border-purple-500 font-semibold text-stone-900"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Carga (kg)</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={drop.targetLoadKg}
                  onChange={(e) => {
                    const next = [...drops];
                    next[idx].targetLoadKg = e.target.value;
                    setDrops(next);
                  }}
                  disabled={disabled || isSaving}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:border-purple-500 font-semibold text-stone-900"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Legenda</span>
                <input
                  type="text"
                  value={drop.intensityIndicator}
                  onChange={(e) => {
                    const next = [...drops];
                    next[idx].intensityIndicator = e.target.value;
                    setDrops(next);
                  }}
                  disabled={disabled || isSaving}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:border-purple-500 text-stone-700"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveDrop(idx)}
              disabled={disabled || isSaving}
              title="Remover drop"
              className="p-1.5 text-stone-400 hover:text-red-600 rounded hover:bg-white transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleAddDrop}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-800 hover:text-purple-950 bg-white border border-purple-300 hover:bg-purple-100/50 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Redução (Drop)
        </button>

        <div className="flex items-center gap-2">
          {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
          {successMsg && <span className="text-xs text-emerald-600 font-medium">✓ Salvo!</span>}
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition-colors"
          >
            {isSaving ? "Salvando..." : "Salvar Drop-Set"}
          </button>
        </div>
      </div>
    </form>
  );
}
