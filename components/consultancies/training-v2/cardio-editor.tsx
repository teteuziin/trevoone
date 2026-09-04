"use client";

import React, { useState } from "react";
import type {
  WorkoutItemSetDto,
  CardioMethodConfig,
  HeartRateZone,
  PrescriptionMode,
} from "@/lib/training-v2/types";

type CardioEditorProps = {
  itemPublicId: string;
  prescriptionMode: PrescriptionMode;
  methodConfig: CardioMethodConfig | null;
  existingSets: WorkoutItemSetDto[];
  itemNotes: string | null;
  onSave: (payload: {
    prescriptionMode: PrescriptionMode;
    config: CardioMethodConfig;
    targetDurationSeconds?: number | null;
    targetDistanceMeters?: number | null;
    targetRestSeconds?: number | null;
    notes?: string | null;
  }) => Promise<void>;
  disabled?: boolean;
};

export function CardioEditor({
  prescriptionMode: initialMode,
  methodConfig,
  existingSets,
  itemNotes,
  onSave,
  disabled = false,
}: CardioEditorProps) {
  const primarySet = existingSets[0];

  const [mode, setMode] = useState<PrescriptionMode>(initialMode || "TIME");
  const [durationMinutes, setDurationMinutes] = useState<number | string>(
    primarySet?.targetDurationSeconds ? Math.round(primarySet.targetDurationSeconds / 60) : 30
  );
  const [distanceKm, setDistanceKm] = useState<number | string>(
    primarySet?.targetDistanceMeters ? (primarySet.targetDistanceMeters / 1000).toFixed(2) : ""
  );
  const [speedKmh, setSpeedKmh] = useState<number | string>(methodConfig?.speedKmh ?? "");
  const [inclinePercent, setInclinePercent] = useState<number | string>(
    methodConfig?.inclinePercent ?? ""
  );
  const [hrZone, setHrZone] = useState<HeartRateZone | "">((methodConfig?.heartRateZone as HeartRateZone) || "");
  const [intensityLabel, setIntensityLabel] = useState<string>(methodConfig?.intensityLabel || "");
  const [notes, setNotes] = useState<string>(itemNotes || "");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(false);

    const durSec = durationMinutes !== "" ? Math.round(Number(durationMinutes) * 60) : null;
    const distMeters = distanceKm !== "" ? Math.round(Number(distanceKm) * 1000) : null;
    const speed = speedKmh !== "" ? Number(speedKmh) : null;
    const incline = inclinePercent !== "" ? Number(inclinePercent) : null;

    // Enforce validation: must have at least one metric
    if (!durSec && !distMeters && !speed && !incline && !hrZone) {
      setErrorMsg("Defina ao menos uma meta de duração, distância, velocidade, inclinação ou zona cardíaca.");
      setIsSaving(false);
      return;
    }

    try {
      await onSave({
        prescriptionMode: mode,
        config: {
          speedKmh: speed,
          inclinePercent: incline,
          heartRateZone: hrZone ? (hrZone as HeartRateZone) : null,
          intensityLabel: intensityLabel.trim() || null,
        },
        targetDurationSeconds: durSec,
        targetDistanceMeters: distMeters,
        notes: notes.trim() || null,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar parâmetros de Cardio.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="mt-3 bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
            Prescrição Aeróbia / Cardio
          </span>
        </div>
        <div className="flex gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("TIME")}
            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
              mode === "TIME"
                ? "bg-emerald-700 text-white"
                : "bg-white text-emerald-800 border border-emerald-200"
            }`}
          >
            Tempo
          </button>
          <button
            type="button"
            onClick={() => setMode("DISTANCE")}
            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
              mode === "DISTANCE"
                ? "bg-emerald-700 text-white"
                : "bg-white text-emerald-800 border border-emerald-200"
            }`}
          >
            Distância
          </button>
          <button
            type="button"
            onClick={() => setMode("INTERVALS")}
            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
              mode === "INTERVALS"
                ? "bg-emerald-700 text-white"
                : "bg-white text-emerald-800 border border-emerald-200"
            }`}
          >
            Intervalado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-emerald-200/80 rounded-lg p-3">
        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Duração (minutos)
          </label>
          <input
            type="number"
            min={1}
            max={480}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Ex: 30"
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-bold text-stone-900"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Distância (km)
          </label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="Ex: 5.0"
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-bold text-stone-900"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Velocidade (km/h)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            step="0.5"
            value={speedKmh}
            onChange={(e) => setSpeedKmh(e.target.value)}
            placeholder="Ex: 9.5"
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-semibold text-stone-900"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Inclinação (%)
          </label>
          <input
            type="number"
            min={-5}
            max={30}
            step="0.5"
            value={inclinePercent}
            onChange={(e) => setInclinePercent(e.target.value)}
            placeholder="Ex: 2.0"
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-md focus:bg-white font-semibold text-stone-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Zona de Frequência Cardíaca (FC)
          </label>
          <select
            value={hrZone}
            onChange={(e) => setHrZone(e.target.value as HeartRateZone | "")}
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-md focus:ring-1 focus:ring-emerald-500 text-stone-800"
          >
            <option value="">Não especificada</option>
            <option value="Z1">Zona 1 — Muito Leve / Recuperação (&lt;60% FCmax)</option>
            <option value="Z2">Zona 2 — Leve / Queima de Gordura / Base (60–70% FCmax)</option>
            <option value="Z3">Zona 3 — Moderado / Aeróbio (70–80% FCmax)</option>
            <option value="Z4">Zona 4 — Difícil / Limiar Anaeróbio (80–90% FCmax)</option>
            <option value="Z5">Zona 5 — Máximo / Sprint (&gt;90% FCmax)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-800 mb-0.5">
            Rótulo de Intensidade / Padrão
          </label>
          <input
            type="text"
            value={intensityLabel}
            onChange={(e) => setIntensityLabel(e.target.value)}
            placeholder="Ex: LISS, Trote Contínuo, HIIT 30s/30s"
            disabled={disabled || isSaving}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-md focus:ring-1 focus:ring-emerald-500 text-stone-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
          Observações / Recomendações Aeróbias
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Manter respiração nasal durante os primeiros 10 minutos."
          disabled={disabled || isSaving}
          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-md focus:ring-1 focus:ring-emerald-500 text-stone-700"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
          {successMsg && <span className="text-xs text-emerald-600 font-medium">✓ Salvo!</span>}
        </div>

        <button
          type="submit"
          disabled={disabled || isSaving}
          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
        >
          {isSaving ? "Salvando..." : "Salvar Configuração Cardio"}
        </button>
      </div>
    </form>
  );
}
