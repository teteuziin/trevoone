"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteWorkoutAction,
  duplicateWorkoutAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

function MoreVertical({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TrashIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ExternalIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export type WorkoutCardActionsProps = {
  consultancySlug: string;
  workoutPublicId: string;
  workoutTitle: string;
  isDraft: boolean;
};

export function WorkoutCardActions({
  consultancySlug,
  workoutPublicId,
  workoutTitle,
  isDraft,
}: WorkoutCardActionsProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    setIsMenuOpen(false);
    startTransition(async () => {
      const res = await duplicateWorkoutAction(consultancySlug, workoutPublicId);
      if (res.ok && res.data) {
        router.refresh();
      } else {
        alert(res.error || "Erro ao duplicar treino.");
      }
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteWorkoutAction(consultancySlug, workoutPublicId);
      if (res.ok) {
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        alert(res.error || "Erro ao excluir treino.");
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] justify-end relative">
      <Link
        href={`/consultoria/${consultancySlug}/rotinas/${workoutPublicId}`}
        className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all min-h-[34px] cursor-pointer"
      >
        Abrir →
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Opções do treino"
          className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border-default)] transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1 space-y-0.5">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/${workoutPublicId}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer"
                >
                  <ExternalIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Abrir treino</span>
                </Link>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDuplicate}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer disabled:opacity-50"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Duplicar treino</span>
                </button>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>{isDraft ? "Excluir rascunho" : "Excluir treino"}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <TrashIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                Excluir este treino?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Esta ação removerá este {isDraft ? "rascunho" : "treino"} ({workoutTitle}). O histórico de treinos concluídos pelos alunos é 100% preservado.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
