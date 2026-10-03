"use client";

import { useState, useTransition, useMemo } from "react";
import type { WorkoutVersionDto } from "@/lib/training-v2/types";
import { inspectWorkoutVersionForPublish } from "@/lib/training-v2/validation";
import { publishWorkoutAction } from "@/app/consultoria/[slug]/rotinas/actions";

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
};

export function WorkoutPublishDialog({
  consultancySlug,
  version,
  isOpen,
  onClose,
  onPublished,
}: WorkoutPublishDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inspection = useMemo(() => inspectWorkoutVersionForPublish(version), [version]);

  if (!isOpen) return null;

  const isDraft = version.status === "DRAFT";
  const totalBlocks = version.blocks?.length || 0;
  const totalItems = version.blocks?.reduce((acc, b) => acc + (b.items?.length || 0), 0) || 0;

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[var(--surface)] border-t sm:border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 duration-200 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                {isDraft ? "Publicar Treino" : "Versão Publicada"}
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                {isDraft
                  ? `Versão ${version.versionNumber} • Rascunho pronto para publicação`
                  : `Versão ${version.versionNumber} • Disponível para os alunos`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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

          {/* Fatal Structural Errors (Blocks Publication) */}
          {inspection.fatalErrors.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Pendências que impedem a publicação</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  {inspection.fatalErrors.map((err, i) => (
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
                <p className="font-semibold">Avisos encontrados (a publicação prosseguirá normalmente)</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                  {inspection.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 pt-0.5">
                  Campos opcionais inválidos serão saneados automaticamente e o treino será disponibilizado para o aluno sem erros.
                </p>
              </div>
            </div>
          )}

          {/* Immutability Alert Notice */}
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

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border-default)] transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            {isDraft ? "Cancelar" : "Fechar"}
          </button>
          {isDraft && (
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
