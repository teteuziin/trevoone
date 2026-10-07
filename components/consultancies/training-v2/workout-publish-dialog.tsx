"use client";

import { useState, useTransition, useMemo } from "react";
import type { WorkoutVersionDto } from "@/lib/training-v2/types";
import { inspectWorkoutVersionForPublish } from "@/lib/training-v2/validation";
import {
  publishWorkoutAction,
  publishWorkoutWithAutoCustomAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

function AlertCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckCircle2({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function X({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

const BLOCK_METHOD_LABELS: Record<string, string> = {
  SINGLE: "Série Simples",
  BI_SET: "Bi-Set",
  TRI_SET: "Tri-Set",
  SUPER_SET: "Super-Série",
  CIRCUIT: "Circuito",
  DROP_SET: "Drop-Set",
  REST_PAUSE: "Rest-Pause",
  COMBINED_SET: "Combinado",
  WARMUP: "Aquecimento",
  CARDIO: "Cardio",
  CUSTOM: "Personalizado",
};

type WorkoutPublishDialogProps = {
  consultancySlug: string;
  version: WorkoutVersionDto;
  isOpen: boolean;
  onClose: () => void;
  onPublished: (publishedVersion: WorkoutVersionDto) => void;
  onResolveItem?: (categoryPublicId: string, itemPublicId: string, exerciseName: string) => void;
  onCustomizeItem?: (
    categoryPublicId: string,
    subBlockPublicId: string | null,
    itemPublicId: string,
    initialData: { name: string; muscleGroup?: string; equipment?: string; notes?: string }
  ) => void;
};

export function WorkoutPublishDialog({
  consultancySlug,
  version,
  isOpen,
  onClose,
  onPublished,
  onResolveItem,
  onCustomizeItem,
}: WorkoutPublishDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inspection = useMemo(() => inspectWorkoutVersionForPublish(version), [version]);

  const unresolvedItems = useMemo(() => {
    const list: Array<{
      categoryPublicId: string;
      categoryTitle: string;
      subBlockPublicId: string | null;
      item: NonNullable<WorkoutVersionDto["blocks"]>[0]["items"][0];
    }> = [];
    for (const block of version.blocks || []) {
      for (const item of block.items || []) {
        const isCustom = Boolean(item.customExercisePublicId || item.isCustomExercise);
        const isLibrary = Boolean(item.exercisePublicId && !item.isCustomExercise);
        if (!isCustom && !isLibrary) {
          list.push({
            categoryPublicId: block.publicId,
            categoryTitle: block.title || BLOCK_METHOD_LABELS[block.blockType] || block.blockType,
            subBlockPublicId: item.subBlockPublicId || null,
            item,
          });
        }
      }
    }
    return list;
  }, [version]);

  const otherFatalErrors = useMemo(() => {
    return inspection.fatalErrors.filter((err) => !err.includes("precisa(m) ser revisado(s)"));
  }, [inspection.fatalErrors]);

  if (!isOpen) return null;

  const isDraft = version.status === "DRAFT";
  const totalBlocks = version.blocks?.length || 0;
  const totalItems = version.blocks?.reduce((acc, b) => acc + (b.items?.length || 0), 0) || 0;
  const hasUnresolved = unresolvedItems.length > 0;

  // Standard publication (only when 0 unresolved items)
  const handleConfirmPublish = () => {
    if (!isDraft) {
      setErrorMessage("Apenas versões em rascunho podem ser publicadas.");
      return;
    }
    if (!inspection.canPublish) {
      setErrorMessage(inspection.fatalErrors.join(" | "));
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const res = await publishWorkoutAction(consultancySlug, version.publicId);
      if (!res.ok || !res.data) {
        setErrorMessage(res.error || "Não foi possível publicar o treino.");
      } else {
        onPublished(res.data);
        onClose();
      }
    });
  };

  // One-click batch conversion & publish as custom
  const handlePublishAsCustom = () => {
    if (!isDraft) {
      setErrorMessage("Apenas versões em rascunho podem ser publicadas.");
      return;
    }
    if (otherFatalErrors.length > 0) {
      setErrorMessage(otherFatalErrors.join(" | "));
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const res = await publishWorkoutWithAutoCustomAction(consultancySlug, version.publicId);
      if (!res.ok || !res.data) {
        setErrorMessage(res.error || "Não foi possível publicar a ficha como personalizados.");
      } else {
        onPublished(res.data);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--surface)] border-t sm:border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 duration-200 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              hasUnresolved
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-500"
            }`}>
              {hasUnresolved ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)] truncate">
                {!isDraft
                  ? "Versão Publicada"
                  : hasUnresolved
                  ? `Existem ${unresolvedItems.length} exercício${unresolvedItems.length > 1 ? "s" : ""} ainda não vinculado${unresolvedItems.length > 1 ? "s" : ""} à biblioteca`
                  : "Publicar Treino"}
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] truncate">
                {!isDraft
                  ? `Versão ${version.versionNumber} • Disponível para os alunos`
                  : hasUnresolved
                  ? "Você pode publicá-los como exercícios personalizados ou revisá-los individualmente."
                  : `Versão ${version.versionNumber} • Rascunho pronto para publicação`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Workout Summary Card */}
          <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-sunken)] space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                {version.title}
              </h4>
              {version.subtitle && (
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  {version.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--foreground-muted)] block">Categorias</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{totalBlocks}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--foreground-muted)] block">Exercícios</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{totalItems}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--foreground-muted)] block">Duração</span>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {version.estimatedDurationMinutes ? `${version.estimatedDurationMinutes}m` : "—"}
                </span>
              </div>
            </div>

            {/* Methods list */}
            {version.blocks && version.blocks.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-medium text-[var(--foreground-muted)] block mb-1.5">
                  Metodologias incluídas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {version.blocks.map((b, idx) => (
                    <span
                      key={b.publicId || idx}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--surface-subtle)] text-[var(--foreground)] border border-[var(--border-subtle)]"
                    >
                      {BLOCK_METHOD_LABELS[b.blockType] || b.blockType}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* UNRESOLVED ITEMS PREVIEW (QUICK PUBLISH MODE) */}
          {hasUnresolved && !isReviewMode && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                    Exercícios a serem confirmados como personalizados ({unresolvedItems.length})
                  </h4>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Todos serão liberados para publicação mantendo 100% da prescrição, séries, repetições, carga e notas. O vídeo é opcional.
                  </p>
                </div>
              </div>

              {/* Explicit items list with names */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-amber-500/15">
                {unresolvedItems.map(({ item, categoryTitle }) => (
                  <div
                    key={item.publicId}
                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-semibold text-[var(--foreground)] truncate">
                        {item.exerciseNameSnapshot || "Exercício sem nome"}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--foreground-muted)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] shrink-0">
                      {categoryTitle}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UNRESOLVED ITEMS DETAILED REVIEW MODE */}
          {hasUnresolved && isReviewMode && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-amber-500/20">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Revisão individual de pendências ({unresolvedItems.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsReviewMode(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Modo rápido</span>
                </button>
              </div>

              <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                {unresolvedItems.map(({ categoryPublicId, categoryTitle, subBlockPublicId, item }) => (
                  <div
                    key={item.publicId}
                    className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--foreground)] truncate">
                          {item.exerciseNameSnapshot}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--foreground-muted)] border border-[var(--border-subtle)]">
                          {categoryTitle}
                        </span>
                      </div>
                      {item.muscleGroupSnapshot && (
                        <span className="text-[10px] text-[var(--foreground-muted)] block mt-0.5">
                          {item.muscleGroupSnapshot}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onResolveItem && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onResolveItem(categoryPublicId, item.publicId, item.exerciseNameSnapshot);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                        >
                          Resolver na biblioteca
                        </button>
                      )}
                      {onCustomizeItem && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onCustomizeItem(categoryPublicId, subBlockPublicId, item.publicId, {
                              name: item.exerciseNameSnapshot,
                              muscleGroup: item.muscleGroupSnapshot || undefined,
                              equipment: item.equipmentSnapshot || undefined,
                              notes: item.notes || undefined,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition-colors cursor-pointer"
                        >
                          Usar como personalizado
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Fatal Structural Errors (Empty Blocks, etc.) */}
          {otherFatalErrors.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Pendências estruturais que impedem a publicação</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {otherFatalErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Non-Blocking Warnings (Publication Allowed) */}
          {inspection.warnings.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">Avisos informativos (não impedem a publicação)</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                  {inspection.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 pt-0.5">
                  Campos opcionais inválidos serão saneados automaticamente e a ficha será disponibilizada para os alunos sem erros.
                </p>
              </div>
            </div>
          )}

          {/* Immutability Alert Notice when 0 unresolved */}
          {!hasUnresolved && (
            <>
              {isDraft ? (
                <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">Tudo pronto para publicação</p>
                    <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">
                      Ao confirmar, esta versão se tornará a versão ativa publicada para prescrição aos alunos com segurança e rastreabilidade total.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Versão já publicada</p>
                    <p className="mt-0.5 leading-relaxed text-[11px] opacity-90">
                      Esta versão já está finalizada para os alunos. Para realizar novas alterações, edite o treino para gerar um novo rascunho.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Banner if publication fails server-side */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erro ao publicar</p>
                <p className="mt-0.5 leading-relaxed text-[11px]">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
          {/* Cancel / Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-default)] transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            {isDraft ? "Cancelar" : "Fechar"}
          </button>

          {/* Has Unresolved Items: Primary action is "Publicar como personalizados" */}
          {isDraft && hasUnresolved && (
            <>
              {!isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setIsReviewMode(true)}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-strong)] transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  Revisar exercícios
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsReviewMode(false)}
                  disabled={isPending}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-strong)] transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  Voltar
                </button>
              )}

              <button
                type="button"
                onClick={handlePublishAsCustom}
                disabled={isPending || otherFatalErrors.length > 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xs disabled:opacity-40 min-h-[46px] cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando como personalizados...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publicar como personalizados</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Zero Unresolved Items: Normal Publish Button */}
          {isDraft && !hasUnresolved && (
            <button
              type="button"
              onClick={handleConfirmPublish}
              disabled={isPending || !inspection.canPublish}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-xs disabled:opacity-40 min-h-[46px] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando e Publicando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publicar treino</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
