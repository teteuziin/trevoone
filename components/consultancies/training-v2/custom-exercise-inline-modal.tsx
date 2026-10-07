"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  SuggestiveInput,
  DEFAULT_SUGGESTED_MUSCLE_GROUPS,
  DEFAULT_SUGGESTED_EQUIPMENT,
} from "@/components/ui/form-controls";
import { getExerciseTaxonomyAction } from "@/app/consultoria/[slug]/exercicios/actions";
import { detectExerciseSequenceFromText } from "@/lib/training-v2/sequence-detector";

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
  type?: "EXERCISE" | "SEQUENCE";
  name: string;
  instructions?: string;
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
  isSequence?: boolean;
  sequenceMovements?: string[];
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
  const [customType, setCustomType] = useState<"EXERCISE" | "SEQUENCE">(
    initialData?.isSequence || initialData?.type === "SEQUENCE" ? "SEQUENCE" : "EXERCISE"
  );
  const [exerciseName, setExerciseName] = useState(initialData?.name || "");
  const detectedSeq = useMemo(() => {
    return customType === "EXERCISE" ? detectExerciseSequenceFromText(exerciseName) : null;
  }, [customType, exerciseName]);
  const [instructions, setInstructions] = useState(initialData?.instructions || initialData?.notes || "");
  const [movementsText, setMovementsText] = useState(
    initialData?.sequenceMovements ? initialData.sequenceMovements.join("\n") : ""
  );
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
      setError(customType === "SEQUENCE" ? "O nome da sequência ou circuito é obrigatório." : "O nome do exercício é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const parsedMovements = customType === "SEQUENCE"
        ? movementsText
            .split("\n")
            .map((m) => m.trim().replace(/^\d+[\.\-\)]\s*/, ""))
            .filter(Boolean)
        : undefined;

      await onSave({
        type: customType,
        isSequence: customType === "SEQUENCE",
        name: exerciseName.trim(),
        instructions: instructions.trim() || undefined,
        sequenceMovements: parsedMovements,
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
      setInstructions("");
      setMovementsText("");
      setMuscleGroup("");
      setEquipment("");
      setNotes("");
      setVideoUrl("");
      setVideoKey("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar item personalizado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {customType === "SEQUENCE" ? "Sequência / Circuito" : "Exercício Personalizado"}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
              {customType === "SEQUENCE" ? "Criar Sequência Personalizada" : "Criar Exercício Personalizado"}
            </h2>
            <p className="text-xs text-[var(--foreground-muted)] line-clamp-2 sm:line-clamp-none">
              {customType === "SEQUENCE"
                ? "Prescreva uma sequência ou circuito descrita por texto. Vídeo opcional. Não bloqueia a publicação."
                : "Crie exercícios fora da biblioteca global com vídeo opcional. Não bloqueia a publicação da ficha."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || isUploadingVideo}
            aria-label="Fechar"
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Content + Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3.5 text-xs rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Type Selector: Exercício vs Sequência/Circuito */}
            <div className="flex p-1 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setCustomType("EXERCISE")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  customType === "EXERCISE"
                    ? "bg-[var(--surface)] text-emerald-600 dark:text-emerald-400 shadow-xs border border-[var(--border-subtle)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Exercício Personalizado
              </button>
              <button
                type="button"
                onClick={() => setCustomType("SEQUENCE")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  customType === "SEQUENCE"
                    ? "bg-[var(--surface)] text-purple-600 dark:text-purple-400 shadow-xs border border-[var(--border-subtle)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Sequência / Circuito Personalizado
              </button>
            </div>

            {/* Bloco 1: Identificação */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)]/40 border border-[var(--border-subtle)]">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {customType === "SEQUENCE" ? "1. Identificação da Sequência" : "1. Exercício"}
              </span>

              {/* Nome */}
              <div>
                <label htmlFor="custom-name" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                  {customType === "SEQUENCE" ? "Nome da sequência ou circuito *" : "Nome do exercício *"}
                </label>
                <input
                  id="custom-name"
                  type="text"
                  required
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder={customType === "SEQUENCE" ? "Ex: Sequência de Mobilidade Escapular, Circuito Abdominal..." : "Ex: Agachamento búlgaro com halteres"}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-[var(--foreground)] min-h-[44px]"
                />

                {/* Intelligent Sequence Detection Suggestion */}
                {customType === "EXERCISE" && detectedSeq?.detected && detectedSeq.movements.length >= 2 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block">
                        ✨ Sequência detectada ({detectedSeq.movements.length} movimentos):
                      </span>
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium truncate block">
                        {detectedSeq.movements.map((m) => m.normalizedName).join(" → ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomType("SEQUENCE");
                        setMovementsText(detectedSeq.movements.map((m) => m.rawText).join("\n"));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-[10px] shrink-0 cursor-pointer transition-all shadow-xs"
                    >
                      Estruturar movimentos
                    </button>
                  </div>
                )}
              </div>

              {customType === "SEQUENCE" ? (
                <>
                  {/* Movimentos da sequência */}
                  <div>
                    <label htmlFor="custom-movements" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                      Movimentos da sequência (um por linha)
                    </label>
                    <textarea
                      id="custom-movements"
                      rows={3}
                      value={movementsText}
                      onChange={(e) => setMovementsText(e.target.value)}
                      placeholder={"1. Cat-cow (10 reps)\n2. Prancha frontal (30s)\n3. Superman (12 reps)"}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                    <span className="text-[10px] text-[var(--foreground-muted)] mt-1 block">
                      Conteúdo de apresentação para o aluno. O registro de execução continua sendo no item principal.
                    </span>
                  </div>

                  {/* Orientações */}
                  <div>
                    <label htmlFor="custom-instructions" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                      Orientações gerais de execução
                    </label>
                    <textarea
                      id="custom-instructions"
                      rows={2}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Ex: Executar os movimentos em sequência com descanso apenas ao final de cada rodada."
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              ) : (
                <>
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

                  {/* Instruções do Exercício */}
                  <div>
                    <label htmlFor="custom-exercise-instructions" className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                      Orientações ou instruções de execução
                    </label>
                    <textarea
                      id="custom-exercise-instructions"
                      rows={2}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Ex: Manter tronco inclinado e escápulas fechadas durante todo o percurso."
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Bloco 2: Prescrição */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)]/40 border border-[var(--border-subtle)]">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                2. Prescrição Padrão
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--foreground-muted)] mb-1">
                    Séries
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--foreground-muted)] mb-1">
                    Reps
                  </label>
                  <input
                    type="text"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="Ex: 8-12"
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--foreground-muted)] mb-1">
                    Carga (kg)
                  </label>
                  <input
                    type="text"
                    value={load}
                    onChange={(e) => setLoad(e.target.value)}
                    placeholder="Ex: 14"
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--foreground-muted)] mb-1">
                    Descanso (s)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(e.target.value)}
                    placeholder="Ex: 60"
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Vídeo de Execução */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)]/40 border border-[var(--border-subtle)]">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                3. Vídeo de Execução (Opcional)
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Cole o link do vídeo (MP4 ou URL)"
                  className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingVideo}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--foreground)] transition-colors cursor-pointer shrink-0 disabled:opacity-50 min-h-[44px]"
                >
                  {isUploadingVideo ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <VideoIcon className="w-4 h-4 text-emerald-600" />
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

            {/* Bloco 4: Observações Técnicas */}
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--surface-subtle)]/40 border border-[var(--border-subtle)]">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                4. Observações ou Orientações Técnicas
              </span>
              <textarea
                id="custom-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Focar na contração de pico por 1 segundo..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Bloco 5: Biblioteca da Consultoria */}
            <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToMyLibrary}
                  onChange={(e) => setSaveToMyLibrary(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <div className="flex-1 text-xs">
                  <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Salvar também na minha biblioteca da consultoria
                  </span>
                  <span className="text-[11px] text-[var(--foreground-muted)] block mt-0.5">
                    Permite reutilizar este exercício personalizado em outras rotinas e fichas futuras.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Sticky Bottom Footer Actions (Always Accessible) */}
          <div className="p-3 sm:p-4 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--border-subtle)] bg-[var(--surface)] flex items-center justify-end gap-2.5 z-10 shadow-lg shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || isUploadingVideo}
              className="px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-[var(--border-default)] text-[var(--foreground-muted)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer min-h-[48px] sm:min-h-[40px] flex items-center justify-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || isUploadingVideo || !exerciseName.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 transition-colors cursor-pointer min-h-[48px] sm:min-h-[40px]"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Adicionar ao Treino</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
