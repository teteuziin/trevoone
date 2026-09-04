"use client";

import React, { useState } from "react";
import type { WorkoutItemSetDto, RestPauseMethodConfig } from "@/lib/training-v2/types";

type RestPauseEditorProps = {
  itemPublicId: string;
  methodConfig: RestPauseMethodConfig | null;
  existingSets: WorkoutItemSetDto[];
  onSave: (payload: {
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
  }) => Promise<void>;
  disabled?: boolean;
};

export function RestPauseEditor({
  methodConfig,
  existingSets,
  onSave,
  disabled = false,
}: RestPauseEditorProps) {
  const topSet = existingSets.find((s) => s.setType === "NORMAL") || existingSets[0];
  const initialMiniSets = existingSets
    .filter((s) => s.setType === "REST_PAUSE_MINI")
    .map((s, idx) => ({
      targetReps: s.targetReps ?? 4,
      targetLoadKg: s.targetLoadKg ?? (topSet?.targetLoadKg ?? 60),
      intensityIndicator: s.intensityIndicator || `Mini ${idx + 1}`,
    }));

  const [intraPause, setIntraPause] = useState<number>(methodConfig?.intraPauseSeconds ?? 15);
  const [totalRepsTarget, setTotalRepsTarget] = useState<number | string>(
    methodConfig?.targetTotalReps ?? ""
  );

  const [topReps, setTopReps] = useState<number | string>(topSet?.targetReps ?? 10);
  const [topLoad, setTopLoad] = useState<number | string>(topSet?.targetLoadKg ?? 60);
  const [topRest, setTopRest] = useState<number | string>(topSet?.targetRestSeconds ?? 120);

  const [miniSets, setMiniSets] = useState<
    Array<{ targetReps: number | string; targetLoadKg: number | string; intensityIndicator: string }>
  >(
    initialMiniSets.length > 0
      ? initialMiniSets
      : [
          { targetReps: 4, targetLoadKg: topSet?.targetLoadKg ?? 60, intensityIndicator: "Mini 1" },
          { targetReps: 3, targetLoadKg: topSet?.targetLoadKg ?? 60, intensityIndicator: "Mini 2" },
          { targetReps: 2, targetLoadKg: topSet?.targetLoadKg ?? 60, intensityIndicator: "Mini 3" },
        ]
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleAddMini = () => {
    setMiniSets([
      ...miniSets,
      {
        targetReps: 3,
        targetLoadKg: topLoad,
        intensityIndicator: `Mini ${miniSets.length + 1}`,
      },
    ]);
  };

  const handleRemoveMini = (index: number) => {
    if (miniSets.length <= 1) {
      setErrorMsg("O método Rest-Pause exige pelo menos 1 mini-série após a pausa.");
      return;
    }
    setErrorMsg(null);
    setMiniSets(miniSets.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (miniSets.length === 0) {
      setErrorMsg("Adicione ao menos 1 mini-série após a pausa curta.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    try {
      await onSave({
        config: {
          intraPauseSeconds: Math.max(5, Number(intraPause) || 15),
          targetTotalReps: totalRepsTarget !== "" ? Number(totalRepsTarget) : null,
        },
        initialSet: {
          targetReps: topReps !== "" ? Number(topReps) : null,
          targetLoadKg: topLoad !== "" ? Number(topLoad) : null,
          targetRestSeconds: topRest !== "" ? Number(topRest) : 120,
          intensityIndicator: "Falha inicial",
        },
        miniSets: miniSets.map((m) => ({
          targetReps: m.targetReps !== "" ? Number(m.targetReps) : null,
          targetLoadKg: m.targetLoadKg !== "" ? Number(m.targetLoadKg) : null,
          intensityIndicator: m.intensityIndicator.trim() || null,
        })),
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar séries de Rest-Pause.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="mt-3 bg-fuchsia-50/40 border border-fuchsia-200/70 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-fuchsia-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-fuchsia-600" />
          <span className="text-xs font-bold text-fuchsia-950 uppercase tracking-wider">
            Estrutura de Rest-Pause (Intra-Pausa Curta)
          </span>
        </div>
        <span className="text-[11px] text-fuchsia-700 bg-fuchsia-100/60 font-semibold px-2 py-0.5 rounded-md">
          {miniSets.length} mini-série{miniSets.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Intra-Pause Configuration Bar */}
      <div className="grid grid-cols-2 gap-3 bg-white border border-fuchsia-200/80 rounded-lg p-3">
        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Tempo de Intra-Pausa (segundos) *
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={5}
              max={120}
              step={5}
              value={intraPause}
              onChange={(e) => setIntraPause(Number(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-bold text-stone-900"
              required
            />
            <span className="text-xs text-stone-500 font-medium">s</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Recomendado: 10s a 20s</span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Meta Total de Reps (Opcional)
          </label>
          <input
            type="number"
            min={1}
            max={200}
            placeholder="Ex: 20 total"
            value={totalRepsTarget}
            onChange={(e) => setTotalRepsTarget(e.target.value)}
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-medium text-stone-900"
          />
          <span className="text-[10px] text-stone-400 mt-0.5 block">Soma de todas as mini-séries</span>
        </div>
      </div>

      {/* Initial Set */}
      <div className="bg-white border border-fuchsia-200/80 rounded-lg p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-stone-900 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            Série Inicial (Até a Falha)
          </span>
          <span className="text-[11px] font-medium text-stone-500">
            Descanso pós-bloco: {topRest}s
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Reps</label>
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
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Carga (kg)</label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={topLoad}
              onChange={(e) => {
                setTopLoad(e.target.value);
                // Also update mini sets load by default if they matched
                setMiniSets(miniSets.map((m) => ({ ...m, targetLoadKg: e.target.value })));
              }}
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-semibold text-stone-900"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Descanso Final (s)</label>
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

      {/* Mini-Sets */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-fuchsia-950">
          Mini-séries Consecutivas ({intraPause}s de pausa entre cada):
        </label>
        {miniSets.map((mini, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-fuchsia-50/70 border border-fuchsia-200/60 rounded-lg p-2.5 text-xs"
          >
            <span className="w-5 h-5 rounded-md bg-fuchsia-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {idx + 2}
            </span>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Reps</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={mini.targetReps}
                  onChange={(e) => {
                    const next = [...miniSets];
                    next[idx].targetReps = e.target.value;
                    setMiniSets(next);
                  }}
                  disabled={disabled || isSaving}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:border-fuchsia-500 font-semibold text-stone-900"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Carga (kg)</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={mini.targetLoadKg}
                  onChange={(e) => {
                    const next = [...miniSets];
                    next[idx].targetLoadKg = e.target.value;
                    setMiniSets(next);
                  }}
                  disabled={disabled || isSaving}
                  className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded focus:border-fuchsia-500 font-semibold text-stone-900"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block mb-0.5">Pausa</span>
                <span className="block px-2 py-1 text-xs bg-stone-100 rounded text-stone-600 font-medium">
                  {intraPause}s
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveMini(idx)}
              disabled={disabled || isSaving}
              title="Remover mini-série"
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
          onClick={handleAddMini}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-fuchsia-800 hover:text-fuchsia-950 bg-white border border-fuchsia-300 hover:bg-fuchsia-100/50 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Mini-série
        </button>

        <div className="flex items-center gap-2">
          {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
          {successMsg && <span className="text-xs text-emerald-600 font-medium">✓ Salvo!</span>}
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-fuchsia-700 hover:bg-fuchsia-800 rounded-lg shadow-xs transition-colors"
          >
            {isSaving ? "Salvando..." : "Salvar Rest-Pause"}
          </button>
        </div>
      </div>
    </form>
  );
}
