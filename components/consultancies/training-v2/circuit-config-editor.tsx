"use client";

import React, { useState } from "react";
import type { WorkoutBlockDto } from "@/lib/training-v2/types";

type CircuitConfigEditorProps = {
  block: WorkoutBlockDto;
  onSave: (config: {
    rounds: number;
    restBetweenItemsSeconds: number;
    restBetweenRoundsSeconds: number;
    restAfterBlockSeconds: number;
    instructions: string | null;
  }) => Promise<void>;
  disabled?: boolean;
};

export function CircuitConfigEditor({
  block,
  onSave,
  disabled = false,
}: CircuitConfigEditorProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [rounds, setRounds] = useState<number>(block.rounds || 3);
  const [restBetweenItems, setRestBetweenItems] = useState<number>(
    block.restBetweenItemsSeconds ?? 15
  );
  const [restBetweenRounds, setRestBetweenRounds] = useState<number>(
    block.restBetweenRoundsSeconds ?? 90
  );
  const [restAfterBlock, setRestAfterBlock] = useState<number>(
    block.restAfterBlockSeconds ?? 120
  );
  const [instructions, setInstructions] = useState<string>(block.instructions || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        rounds: Math.max(1, Number(rounds) || 1),
        restBetweenItemsSeconds: Math.max(0, Number(restBetweenItems) || 0),
        restBetweenRoundsSeconds: Math.max(0, Number(restBetweenRounds) || 0),
        restAfterBlockSeconds: Math.max(0, Number(restAfterBlock) || 0),
        instructions: instructions.trim() || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsExpanded(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-4 bg-amber-50/50 border border-amber-200/80 rounded-xl overflow-hidden">
      <div className="p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-amber-800 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Parâmetros do Circuito:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 font-semibold">
            {block.rounds || 3} voltas
          </span>
          <span className="text-stone-500">
            Pausa est.: <span className="font-semibold text-stone-700">{block.restBetweenItemsSeconds ?? 15}s</span>
          </span>
          <span className="text-stone-500">
            Pausa volta: <span className="font-semibold text-stone-700">{block.restBetweenRoundsSeconds ?? 90}s</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline px-2 py-1 rounded transition-colors whitespace-nowrap"
        >
          {isExpanded ? "Fechar Ajustes" : "Ajustar Circuito"}
        </button>
      </div>

      {isExpanded && (
        <form onSubmit={handleSave} className="p-4 border-t border-amber-200/60 bg-white/70 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Número de Voltas *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                disabled={disabled || isSaving}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-stone-900"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Descanso Estações (s)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={restBetweenItems}
                onChange={(e) => setRestBetweenItems(Number(e.target.value))}
                disabled={disabled || isSaving}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Descanso Voltas (s)
              </label>
              <input
                type="number"
                min={0}
                max={600}
                value={restBetweenRounds}
                onChange={(e) => setRestBetweenRounds(Number(e.target.value))}
                disabled={disabled || isSaving}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Descanso Final (s)
              </label>
              <input
                type="number"
                min={0}
                max={600}
                value={restAfterBlock}
                onChange={(e) => setRestAfterBlock(Number(e.target.value))}
                disabled={disabled || isSaving}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold text-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Orientações Específicas do Circuito
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Transição rápida entre estações; hidratação apenas entre voltas."
              disabled={disabled || isSaving}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-stone-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                ✓ Salvo com sucesso!
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              disabled={isSaving}
              className="px-3 py-1 text-xs text-stone-500 hover:text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled || isSaving}
              className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
            >
              {isSaving ? "Salvando..." : "Salvar Parâmetros"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
