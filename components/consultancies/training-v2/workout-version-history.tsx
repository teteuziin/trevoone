"use client";

import Link from "next/link";
import type { WorkoutVersionSummaryDto } from "@/lib/training-v2/workout-repository";

function History({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function Layers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Calendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

type WorkoutVersionHistoryProps = {
  consultancySlug: string;
  workoutPublicId: string;
  currentVersionPublicId: string;
  versions: WorkoutVersionSummaryDto[];
  isOpen: boolean;
  onClose: () => void;
  onCreateNewVersion?: () => void;
  isCreatingNewVersion?: boolean;
};

export function WorkoutVersionHistory({
  consultancySlug,
  workoutPublicId,
  currentVersionPublicId,
  versions,
  isOpen,
  onClose,
  onCreateNewVersion,
  isCreatingNewVersion = false,
}: WorkoutVersionHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Histórico de Versões
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Snapshots imutáveis desta rotina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Versions List */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {versions.map((v) => {
            const isSelected = v.publicId === currentVersionPublicId;
            const isDraft = v.status === "DRAFT";
            const isPublished = v.status === "PUBLISHED";
            const isArchived = v.status === "ARCHIVED";

            const dateLabel = v.publishedAt
              ? new Date(v.publishedAt).toLocaleDateString("pt-BR")
              : new Date(v.createdAt).toLocaleDateString("pt-BR");

            return (
              <div
                key={v.publicId}
                className={`p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
                    : "border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)]">
                      Versão {v.versionNumber}
                    </span>
                    {isSelected && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        Exibindo agora
                      </span>
                    )}
                  </div>

                  <div>
                    {isDraft && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Rascunho
                      </span>
                    )}
                    {isPublished && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Publicado
                      </span>
                    )}
                    {isArchived && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                        Anterior
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {v.blocksCount} {v.blocksCount === 1 ? "bloco" : "blocos"}
                    </span>
                  </div>

                  {!isSelected && (
                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${workoutPublicId}?version=${v.publicId}`}
                      onClick={onClose}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Visualizar
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Fechar
          </button>

          {onCreateNewVersion && (
            <button
              type="button"
              onClick={onCreateNewVersion}
              disabled={isCreatingNewVersion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isCreatingNewVersion ? "Criando versão..." : "Criar nova versão"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
