"use client";

import { useState, useEffect, useRef } from "react";
import {
  SuggestiveInput,
  DEFAULT_SUGGESTED_MUSCLE_GROUPS,
  DEFAULT_SUGGESTED_EQUIPMENT,
} from "@/components/ui/form-controls";
import { getExerciseTaxonomyAction } from "@/app/consultoria/[slug]/exercicios/actions";

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Sparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
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

function VideoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function BookmarkCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10l2 2 4-4" />
    </svg>
  );
}

export type CustomExerciseFormData = {
  name: string;
  muscleGroup?: string;
  equipment?: string;
  sets?: number;
  reps?: string;
  load?: string;
  restSeconds?: number;
  notes?: string;
  saveToMyLibrary?: boolean;
  videoUrl?: string;
  videoKey?: string;
};

type CustomExerciseInlineModalProps = {
  isOpen: boolean;
  consultancySlug?: string;
  initialData?: Partial<CustomExerciseFormData>;
  onClose: () => void;
  onSave: (data: CustomExerciseFormData) => Promise<void>;
};

export function CustomExerciseInlineModal({
  isOpen,
  consultancySlug,
  initialData,
  onClose,
  onSave,
}: CustomExerciseInlineModalProps) {
  const [exerciseName, setExerciseName] = useState(initialData?.name || "");
  const [muscleGroup, setMuscleGroup] = useState(initialData?.muscleGroup || "");
  const [equipment, setEquipment] = useState(initialData?.equipment || "");
  const [sets, setSets] = useState<number | string>(initialData?.sets ?? 3);
  const [reps, setReps] = useState(initialData?.reps || "10-12");
  const [load, setLoad] = useState(initialData?.load || "");
  const [restSeconds, setRestSeconds] = useState<number | string>(initialData?.restSeconds ?? 60);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [saveToMyLibrary, setSaveToMyLibrary] = useState(initialData?.saveToMyLibrary ?? true);

  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || "");
  const [videoKey, setVideoKey] = useState(initialData?.videoKey || "");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [muscleSuggestions, setMuscleSuggestions] = useState<readonly string[] | string[]>(
    DEFAULT_SUGGESTED_MUSCLE_GROUPS
  );
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<readonly string[] | string[]>(
    DEFAULT_SUGGESTED_EQUIPMENT
  );

  useEffect(() => {
    let active = true;
    if (consultancySlug) {
      getExerciseTaxonomyAction(consultancySlug).then((res) => {
        if (active && res.ok && res.data) {
          if (res.data.muscleGroups?.length) {
            setMuscleSuggestions(res.data.muscleGroups);
          }
          if (res.data.equipment?.length) {
            setEquipmentSuggestions(res.data.equipment);
          }
        }
      });
    }
    return () => {
      active = false;
    };
  }, [consultancySlug]);

  if (!isOpen) return null;

  async function handleFileUpload(file: File) {
    if (!file) return;
    try {
      setIsUploadingVideo(true);
      setUploadProgress("Enviando vídeo...");
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/training-v2/media?scope=CONSULTANCY&visibility=CONSULTANCY&mediaType=VIDEO", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha no envio do vídeo.");
      }

      const resData = await response.json();
      if (resData.asset?.publicId) {
        const assetUrl = `/api/training-v2/media/${resData.asset.publicId}`;
        setVideoUrl(assetUrl);
        setVideoKey(resData.asset.storageKey || "");
        setUploadProgress(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar vídeo.");
      setUploadProgress(null);
    } finally {
      setIsUploadingVideo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseName.trim()) {
      setError("O nome do exercício é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        name: exerciseName.trim(),
        muscleGroup: muscleGroup.trim() || undefined,
        equipment: equipment.trim() || undefined,
        sets: sets ? Number(sets) : 3,
        reps: reps.trim() || "10-12",
        load: load.trim() || undefined,
        restSeconds: restSeconds ? Number(restSeconds) : 60,
        notes: notes.trim() || undefined,
        saveToMyLibrary,
        videoUrl: videoUrl.trim() || undefined,
        videoKey: videoKey.trim() || undefined,
      });

      // Reset
      setExerciseName("");
      setMuscleGroup("");
      setEquipment("");
      setNotes("");
      setVideoUrl("");
      setVideoKey("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar exercício personalizado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Exercício Personalizado
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Criar Exercício Personalizado
            </h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              Crie exercícios fora da biblioteca global com vídeo opcional. Não bloqueia a publicação da ficha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || isUploadingVideo}
            className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Nome do exercício */}
          <div>
            <label htmlFor="custom-name" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Nome do exercício *
            </label>
            <input
              id="custom-name"
              type="text"
              required
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Ex: Agachamento búlgaro com halteres"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-[var(--foreground)]"
            />
          </div>

          {/* Grupo e Equipamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-muscle" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Grupo muscular
              </label>
              <SuggestiveInput
                id="custom-muscle"
                value={muscleGroup}
                onChange={setMuscleGroup}
                suggestions={muscleSuggestions}
                placeholder="Ex: Quadríceps, Bíceps..."
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="custom-equip" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                Equipamento
              </label>
              <SuggestiveInput
                id="custom-equip"
                value={equipment}
                onChange={setEquipment}
                suggestions={equipmentSuggestions}
                placeholder="Ex: Halteres, Barra, Polia..."
                maxLength={100}
              />
            </div>
          </div>

          {/* Prescrição Rápida */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider block">
              Prescrição Padrão
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] text-[var(--foreground-muted)] mb-1">
                  Séries
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-muted)] mb-1">
                  Reps
                </label>
                <input
                  type="text"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="Ex: 8-12"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-muted)] mb-1">
                  Carga (kg)
                </label>
                <input
                  type="text"
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                  placeholder="Ex: 14"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--foreground-muted)] mb-1">
                  Descanso (s)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(e.target.value)}
                  placeholder="Ex: 60"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>
            </div>
          </div>

          {/* Vídeo de Execução (Upload ou URL) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Vídeo de execução (opcional)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Cole o link do vídeo (MP4 ou URL)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingVideo}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--foreground)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isUploadingVideo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <VideoIcon className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{isUploadingVideo ? uploadProgress || "Enviando..." : "Enviar arquivo..."}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            {/* Video Live Preview */}
            {videoUrl.trim().length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-black/90 p-1 flex flex-col items-center">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="max-h-48 w-auto rounded-lg"
                />
                <span className="text-[10px] text-gray-400 py-1">Preview de execução do exercício</span>
              </div>
            )}
          </div>

          {/* Observações / Orientações */}
          <div>
            <label htmlFor="custom-notes" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
              Observações ou orientações técnicas
            </label>
            <textarea
              id="custom-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Focar na contração de pico por 1 segundo..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Salvar na minha biblioteca */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToMyLibrary}
                onChange={(e) => setSaveToMyLibrary(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Salvar também na minha biblioteca da consultoria
                </span>
                <span className="text-[11px] text-[var(--foreground-muted)] block">
                  Permite reutilizar este exercício personalizado em outras rotinas e fichas futuras.
                </span>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || isUploadingVideo}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border-default)] text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || isUploadingVideo || !exerciseName.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Adicionar ao Treino
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
