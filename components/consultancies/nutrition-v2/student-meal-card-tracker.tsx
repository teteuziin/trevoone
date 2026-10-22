"use client";

import React, { useState } from "react";
import type { MealTrackingLogDto } from "@/lib/nutrition-v2/meal-tracking-types";
import { StudentMealTrackingModal } from "./student-meal-tracking-modal";

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
  currentLog?: MealTrackingLogDto | null;
  availableSubstitutions?: {
    originalFoodName: string;
    options: { foodName: string; quantityFormatted?: string }[];
  }[];
  onLogUpdated: (log: MealTrackingLogDto) => void;
}

export function StudentMealCardTracker({
  consultancySlug,
  mealDate,
  mealPublicId,
  mealTitle,
  mealScheduledTime,
  planId,
  planVersionId,
  planVersionNumber,
  mealId,
  currentLog,
  availableSubstitutions = [],
  onLogUpdated,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const isCompleted = currentLog?.status === "COMPLETED";
  const isChanged = currentLog?.status === "COMPLETED_WITH_CHANGES";
  const isNotDone = currentLog?.status === "NOT_DONE";
  const isLogged = Boolean(currentLog);

  return (
    <>
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
        {/* If logged: Display registered status */}
        {isLogged && currentLog ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span>✓</span>
                    <span>Refeição realizada</span>
                  </span>
                )}
                {isChanged && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <span>⇄</span>
                    <span>Realizada com alterações</span>
                  </span>
                )}
                {isNotDone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/15 text-[var(--text-secondary)] border border-zinc-500/30">
                    <span>✕</span>
                    <span>Não realizada</span>
                  </span>
                )}

                {currentLog.consumedAtTime && (
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    às <strong>{currentLog.consumedAtTime}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Editar registro
              </button>
            </div>

            {/* Details & Notes */}
            {isNotDone && currentLog.notDoneReasonLabel && (
              <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]">
                <strong>Motivo:</strong> {currentLog.notDoneReasonLabel}
              </div>
            )}

            {currentLog.notes && (
              <div className="text-[11px] text-[var(--text-secondary)] italic bg-[var(--surface-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]">
                &ldquo;{currentLog.notes}&rdquo;
              </div>
            )}

            {/* Substitutions */}
            {currentLog.substitutions.length > 0 && (
              <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/5 p-2 rounded-xl border border-amber-500/20 space-y-0.5">
                <span className="font-bold block">Substituições registradas:</span>
                {currentLog.substitutions.map((sub, idx) => (
                  <div key={idx}>
                    • <strong>{sub.originalFoodName}</strong> por <strong>{sub.substitutedWith}</strong>
                    {sub.quantityFormatted && ` (${sub.quantityFormatted})`}
                  </div>
                ))}
              </div>
            )}

            {/* Attached Photo Preview */}
            {currentLog.hasPhoto && currentLog.photoUrl && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(currentLog.photoUrl || null)}
                  className="group relative rounded-xl overflow-hidden border border-[var(--border-default)] hover:border-emerald-500 transition-all cursor-pointer shrink-0"
                  title="Clique para ampliar a foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentLog.photoUrl}
                    alt="Foto registrada da refeição"
                    loading="lazy"
                    className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    🔍
                  </div>
                </button>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  <span className="font-semibold text-[var(--text-primary)] block">Foto do prato anexada</span>
                  <span>Toque para ver em tamanho ampliado</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Unregistered: Quick Action Bar */
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[var(--surface-subtle)] p-2 rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
              Acompanhamento:
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <span>✓</span>
                <span>Fiz</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <span>⇄</span>
                <span>Com alterações</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)] transition-all cursor-pointer flex items-center gap-1"
              >
                <span>✕</span>
                <span>Não fiz</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <StudentMealTrackingModal
        consultancySlug={consultancySlug}
        mealDate={mealDate}
        mealPublicId={mealPublicId}
        mealTitle={mealTitle}
        mealScheduledTime={mealScheduledTime}
        planId={planId}
        planVersionId={planVersionId}
        planVersionNumber={planVersionNumber}
        mealId={mealId}
        existingLog={currentLog}
        availableSubstitutions={availableSubstitutions}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onLogUpdated}
      />

      {/* Fullscreen Lightbox */}
      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImageUrl}
              alt="Visualização ampliada da refeição"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white text-sm font-bold flex items-center justify-center cursor-pointer shadow-md"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
