"use client";

import React, { useState } from "react";
import type {
  MealTrackingStatus,
  MealNotDoneReason,
  MealTrackingLogDto,
  MealTrackingSubstitutionItem,
} from "@/lib/nutrition-v2/meal-tracking-types";
import {
  MEAL_NOT_DONE_REASONS,
  MEAL_NOT_DONE_REASON_LABELS,
} from "@/lib/nutrition-v2/meal-tracking-types";
import { saveMealTrackingAction } from "@/app/consultoria/[slug]/nutricao/refeicoes/actions";

interface Props {
  consultancySlug: string;
  mealDate: string; // YYYY-MM-DD
  mealPublicId: string;
  mealTitle: string;
  mealScheduledTime?: string | null;
  planId?: number | null;
  planVersionId?: number | null;
  planVersionNumber?: number | null;
  mealId?: number | null;
  existingLog?: MealTrackingLogDto | null;
  availableSubstitutions?: {
    originalFoodName: string;
    options: { foodName: string; quantityFormatted?: string }[];
  }[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (log: MealTrackingLogDto) => void;
}

export function StudentMealTrackingModal(props: Props) {
  if (!props.isOpen) return null;
  return <StudentMealTrackingModalContent {...props} />;
}

function StudentMealTrackingModalContent({
  consultancySlug,
  mealDate,
  mealPublicId,
  mealTitle,
  mealScheduledTime,
  planId,
  planVersionId,
  planVersionNumber,
  mealId,
  existingLog,
  availableSubstitutions = [],
  onClose,
  onSaved,
}: Props) {
  const [status, setStatus] = useState<MealTrackingStatus>(
    existingLog?.status || "COMPLETED"
  );
  const [notDoneReason, setNotDoneReason] = useState<MealNotDoneReason | "">(
    existingLog?.notDoneReason || ""
  );
  const [consumedAtTime, setConsumedAtTime] = useState<string>(
    existingLog?.consumedAtTime ||
      mealScheduledTime ||
      new Date().toTimeString().slice(0, 5)
  );
  const [notes, setNotes] = useState<string>(existingLog?.notes || "");
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<
    MealTrackingSubstitutionItem[]
  >(existingLog?.substitutions || []);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    existingLog?.photoUrl || null
  );
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("A foto deve ter no máximo 8 MB.");
      return;
    }

    setPhotoFile(file);
    setRemoveExistingPhoto(false);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (existingLog?.hasPhoto) {
      setRemoveExistingPhoto(true);
    }
  };

  const toggleSubstitution = (
    originalFoodName: string,
    substitutedWith: string,
    quantityFormatted?: string
  ) => {
    const exists = selectedSubstitutions.some(
      (s) =>
        s.originalFoodName === originalFoodName &&
        s.substitutedWith === substitutedWith
    );

    if (exists) {
      setSelectedSubstitutions(
        selectedSubstitutions.filter(
          (s) =>
            !(
              s.originalFoodName === originalFoodName &&
              s.substitutedWith === substitutedWith
            )
        )
      );
    } else {
      setSelectedSubstitutions([
        ...selectedSubstitutions,
        { originalFoodName, substitutedWith, quantityFormatted },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        mealDate,
        mealPublicId,
        mealTitle,
        mealScheduledTime,
        planId,
        planVersionId,
        planVersionNumber,
        mealId,
        status,
        notDoneReason: status === "NOT_DONE" && notDoneReason ? notDoneReason : null,
        consumedAtTime: status !== "NOT_DONE" ? consumedAtTime : null,
        notes: notes.trim() || null,
        substitutions: status === "COMPLETED_WITH_CHANGES" ? selectedSubstitutions : [],
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (photoFile) {
        formData.append("photo", photoFile);
      }
      if (removeExistingPhoto) {
        formData.append("removePhoto", "true");
      }

      const res = await saveMealTrackingAction(consultancySlug, formData);
      if (!res.success || !res.log) {
        setErrorMessage(res.error || "Não foi possível salvar o registro.");
        setIsSubmitting(false);
        return;
      }

      onSaved(res.log);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao salvar.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Acompanhamento de Refeição
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
              {mealTitle}
            </h2>
            {mealScheduledTime && (
              <p className="text-xs text-[var(--text-secondary)]">
                Horário previsto: <strong className="text-[var(--text-primary)]">{mealScheduledTime}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Status Selection (3 Explicit States) */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--text-primary)] block">
              Como foi essa refeição?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("COMPLETED")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  status === "COMPLETED"
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-xs"
                    : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-sm">✓</span>
                <span>Fiz</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("COMPLETED_WITH_CHANGES")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  status === "COMPLETED_WITH_CHANGES"
                    ? "bg-amber-600 border-amber-500 text-white shadow-xs"
                    : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-sm">⇄</span>
                <span>Com alterações</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus("NOT_DONE")}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  status === "NOT_DONE"
                    ? "bg-zinc-700 dark:bg-zinc-600 border-zinc-500 text-white shadow-xs"
                    : "bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-sm">✕</span>
                <span>Não fiz</span>
              </button>
            </div>
          </div>

          {/* Conditional Blocks depending on status */}

          {/* State A: COMPLETED */}
          {status === "COMPLETED" && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300">
              Ótimo! Você consumiu a refeição conforme planejado no seu cardápio.
            </div>
          )}

          {/* State B: COMPLETED_WITH_CHANGES */}
          {status === "COMPLETED_WITH_CHANGES" && (
            <div className="space-y-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block mb-1">
                  O que você alterou ou adaptou?
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Troquei a proteína por ovos cozidos, comi um pouco mais de salada..."
                  className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-[var(--surface-elevated)] text-[var(--text-primary)] text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Structured substitutions selector if available in this meal */}
              {availableSubstitutions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-[11px] text-amber-900 dark:text-amber-200 block">
                    Usou alguma das substituições já previstas?
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {availableSubstitutions.map((subGroup) =>
                      subGroup.options.map((opt) => {
                        const isChecked = selectedSubstitutions.some(
                          (s) =>
                            s.originalFoodName === subGroup.originalFoodName &&
                            s.substitutedWith === opt.foodName
                        );
                        return (
                          <button
                            key={`${subGroup.originalFoodName}-${opt.foodName}`}
                            type="button"
                            onClick={() =>
                              toggleSubstitution(
                                subGroup.originalFoodName,
                                opt.foodName,
                                opt.quantityFormatted
                              )
                            }
                            className={`w-full text-left p-2 rounded-lg text-[11px] border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              isChecked
                                ? "bg-amber-500/25 border-amber-500/60 font-bold text-amber-950 dark:text-amber-100"
                                : "bg-[var(--surface-elevated)] border-amber-500/20 text-[var(--text-secondary)] hover:border-amber-500/40"
                            }`}
                          >
                            <span>
                              Troquei <strong>{subGroup.originalFoodName}</strong> por{" "}
                              <strong>{opt.foodName}</strong>
                              {opt.quantityFormatted && ` (${opt.quantityFormatted})`}
                            </span>
                            <span className="shrink-0 text-xs">
                              {isChecked ? "✓" : "+"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-amber-800 dark:text-amber-300 italic">
                * Os macronutrientes da prescrição não serão exibidos como consumo exato para manter a precisão do seu histórico.
              </p>
            </div>
          )}

          {/* State C: NOT_DONE */}
          {status === "NOT_DONE" && (
            <div className="space-y-3 p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-xl">
              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Motivo (Opcional):
                </label>
                <div className="space-y-1">
                  {MEAL_NOT_DONE_REASONS.map((reasonKey) => (
                    <label
                      key={reasonKey}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        notDoneReason === reasonKey
                          ? "bg-zinc-600 text-white font-bold border-zinc-500"
                          : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="notDoneReason"
                        value={reasonKey}
                        checked={notDoneReason === reasonKey}
                        onChange={() => setNotDoneReason(reasonKey)}
                        className="sr-only"
                      />
                      <span>{MEAL_NOT_DONE_REASON_LABELS[reasonKey]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Alguma observação a mais?
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Se quiser, conte para o nutricionista o que aconteceu..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                Tudo bem! Imprevistos acontecem. O registro sincero ajuda sua nutricionista a ajustar sua rotina com empatia.
              </p>
            </div>
          )}

          {/* Consumed time (if not NOT_DONE) */}
          {status !== "NOT_DONE" && (
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  Horário realizado
                </label>
                <input
                  type="time"
                  value={consumedAtTime}
                  onChange={(e) => setConsumedAtTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs font-semibold"
                />
              </div>

              {status === "COMPLETED" && (
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">
                    Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Refeição saborosa, sem fome após"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Photo Upload (Strictly Optional) */}
          {status !== "NOT_DONE" && (
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>📸</span>
                  <span>Foto do prato (Opcional)</span>
                </label>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  JPG, PNG ou WEBP até 8 MB
                </span>
              </div>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[var(--border-default)] max-w-xs mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Foto da refeição"
                    className="w-full h-44 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black text-white text-[10px] font-bold shadow-md cursor-pointer transition-colors"
                  >
                    ✕ Remover foto
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[var(--border-default)] hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="sr-only"
                  />
                  <span className="text-xl">📷</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Tirar ou anexar foto
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    Localização e dados de privacidade são removidos automaticamente.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Confirmar registro</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
