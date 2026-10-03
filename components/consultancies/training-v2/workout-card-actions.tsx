"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteWorkoutAction,
  duplicateWorkoutAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { TemplateAssignModal } from "./template-assign-modal";

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

function SparklesIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

function UserCheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

export type WorkoutCardActionsProps = {
  consultancySlug: string;
  workoutPublicId: string;
  workoutTitle: string;
  isDraft: boolean;
  isTemplate?: boolean;
};

export function WorkoutCardActions({
  consultancySlug,
  workoutPublicId,
  workoutTitle,
  isDraft,
  isTemplate,
}: WorkoutCardActionsProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    setIsMenuOpen(false);
    startTransition(async () => {
      const res = await duplicateWorkoutAction(consultancySlug, workoutPublicId, undefined, {
        isTemplate: Boolean(isTemplate),
      });
      if (res.ok && res.data) {
        router.refresh();
      } else {
        alert(res.error || "Erro ao duplicar.");
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
        alert(res.error || "Erro ao excluir.");
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] justify-end relative">
      {isTemplate ? (
        <button
          type="button"
          onClick={() => setIsAssignModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all min-h-[44px] sm:min-h-[34px] cursor-pointer"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Usar modelo</span>
        </button>
      ) : (
        <Link
          href={`/consultoria/${consultancySlug}/rotinas/${workoutPublicId}`}
          className="inline-flex items-center justify-center px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold sm:font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all min-h-[44px] sm:min-h-[34px] cursor-pointer"
        >
          Abrir →
        </Link>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isTemplate ? "Opções do modelo" : "Opções do treino"}
          className="p-2 sm:p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border-default)] transition-colors min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl z-40 py-1.5 text-xs font-semibold text-[var(--text-primary)] divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1 space-y-0.5">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/${workoutPublicId}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[32px]"
                >
                  <ExternalIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isTemplate ? "Abrir modelo" : "Abrir treino"}</span>
                </Link>

                {isTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAssignModalOpen(true);
                    }}
                    className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[32px] text-purple-600 dark:text-purple-400"
                  >
                    <UserCheckIcon className="w-3.5 h-3.5" />
                    <span>Atribuir a um aluno</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDuplicate}
                  className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[var(--surface-subtle)] flex items-center gap-2 text-left cursor-pointer disabled:opacity-50 min-h-[40px] sm:min-h-[32px]"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isTemplate ? "Duplicar modelo" : "Duplicar treino"}</span>
                </button>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="w-full px-3 py-2 sm:py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left cursor-pointer min-h-[40px] sm:min-h-[32px]"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>{isTemplate ? "Excluir modelo" : isDraft ? "Excluir rascunho" : "Excluir treino"}</span>
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
                {isTemplate ? "Excluir este modelo?" : "Excluir este treino?"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {isTemplate
                  ? `Esta ação removerá este modelo padrão (${workoutTitle}). Alunos que já receberam este plano continuarão com suas rotinas 100% intactas.`
                  : `Esta ação removerá este ${isDraft ? "rascunho" : "treino"} (${workoutTitle}). O histórico de treinos concluídos pelos alunos é 100% preservado.`}
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

      {/* Direct Assignment to Student Modal */}
      {isTemplate && isAssignModalOpen && (
        <TemplateAssignModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          slug={consultancySlug}
          templatePublicId={workoutPublicId}
          templateTitle={workoutTitle}
          onAssigned={() => router.refresh()}
        />
      )}
    </div>
  );
}
