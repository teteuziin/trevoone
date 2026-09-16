"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProfessionalAssignmentListItem } from "@/lib/training-v2/assignment-repository";
import {
  updateWorkoutAssignmentVersionAction,
  terminateWorkoutAssignmentAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function UserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StopCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

type WorkoutAssignmentsListProps = {
  slug: string;
  initialItems: ProfessionalAssignmentListItem[];
  total: number;
};

export function WorkoutAssignmentsList({
  slug,
  initialItems,
}: WorkoutAssignmentsListProps) {
  const router = useRouter();
  const [items, setItems] = useState<ProfessionalAssignmentListItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ENDED" | "ALL">("ACTIVE");
  const [confirmUpdateItem, setConfirmUpdateItem] = useState<ProfessionalAssignmentListItem | null>(null);
  const [confirmEndItem, setConfirmEndItem] = useState<ProfessionalAssignmentListItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredItems = items.filter((item) => {
    if (activeTab === "ALL") return true;
    return item.status === activeTab;
  });

  function handleUpdateVersion() {
    if (!confirmUpdateItem || !confirmUpdateItem.currentPublishedVersionPublicId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateWorkoutAssignmentVersionAction(
        slug,
        confirmUpdateItem.assignmentPublicId,
        confirmUpdateItem.currentPublishedVersionPublicId!
      );

      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao atualizar versão da prescrição.");
        setConfirmUpdateItem(null);
        return;
      }

      // Update locally
      setItems((prev) =>
        prev.map((item) => {
          if (item.assignmentPublicId === confirmUpdateItem.assignmentPublicId) {
            return {
              ...item,
              assignedVersionPublicId: confirmUpdateItem.currentPublishedVersionPublicId!,
              assignedVersionNumber: confirmUpdateItem.currentPublishedVersionNumber!,
              hasNewerPublishedVersion: false,
            };
          }
          return item;
        })
      );

      setSuccessMessage(
        `Prescrição de ${confirmUpdateItem.studentName} atualizada para a Versão ${confirmUpdateItem.currentPublishedVersionNumber}!`
      );
      setConfirmUpdateItem(null);
      router.refresh();
    });
  }

  function handleTerminate() {
    if (!confirmEndItem) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await terminateWorkoutAssignmentAction(
        slug,
        confirmEndItem.assignmentPublicId
      );

      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao encerrar prescrição.");
        setConfirmEndItem(null);
        return;
      }

      setItems((prev) =>
        prev.map((item) => {
          if (item.assignmentPublicId === confirmEndItem.assignmentPublicId) {
            return {
              ...item,
              status: "ENDED",
              endsOn: new Date().toISOString().slice(0, 10),
            };
          }
          return item;
        })
      );

      setSuccessMessage(`Prescrição de ${confirmEndItem.studentName} encerrada com sucesso.`);
      setConfirmEndItem(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl w-fit shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-3.5 py-1.5 text-xs rounded-xl select-none transition-all min-h-[36px] flex items-center gap-1.5 depth-interactive ${
            activeTab === "ACTIVE"
              ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
          }`}
        >
          <span>Ativas</span>
          <span className="text-[11px] opacity-75 font-mono">({items.filter((i) => i.status === "ACTIVE").length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ENDED")}
          className={`px-3.5 py-1.5 text-xs rounded-xl select-none transition-all min-h-[36px] flex items-center gap-1.5 depth-interactive ${
            activeTab === "ENDED"
              ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
          }`}
        >
          <span>Encerradas</span>
          <span className="text-[11px] opacity-75 font-mono">({items.filter((i) => i.status === "ENDED").length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-3.5 py-1.5 text-xs rounded-xl select-none transition-all min-h-[36px] flex items-center gap-1.5 depth-interactive ${
            activeTab === "ALL"
              ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent font-medium"
          }`}
        >
          <span>Todas</span>
          <span className="text-[11px] opacity-75 font-mono">({items.length})</span>
        </button>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs depth-surface space-y-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Nenhuma prescrição encontrada
          </p>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            {activeTab === "ACTIVE"
              ? "Abra um treino publicado e use a opção 'Prescrever para Aluno' para associar rotinas aos seus alunos."
              : "Nenhuma prescrição no filtro selecionado."}
          </p>
        </div>
      ) : (
        /* Assignments Grid / List */
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.assignmentPublicId}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs transition-all space-y-3 depth-surface"
            >
              {/* Header: Student and Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {item.studentName}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                      {item.studentEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {item.status === "ACTIVE" ? (
                    <Badge variant="success" size="sm">
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Encerrada
                    </Badge>
                  )}

                  {item.hasNewerPublishedVersion && item.status === "ACTIVE" && (
                    <Badge variant="warning" size="sm" className="animate-pulse">
                      Nova versão disponível (V{item.currentPublishedVersionNumber})
                    </Badge>
                  )}
                </div>
              </div>

              {/* Workout details and version comparison */}
              <div className="pt-2 border-t border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {item.workoutTitle}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Prescrito: <strong className="text-[var(--text-primary)]">Versão {item.assignedVersionNumber}</strong>
                    {item.currentPublishedVersionNumber && (
                      <span> · Publicado atual: <strong className="text-[var(--text-primary)]">Versão {item.currentPublishedVersionNumber}</strong></span>
                    )}
                    <span> · Início: {item.startsOn}</span>
                    {item.endsOn && <span> · Término: {item.endsOn}</span>}
                  </p>
                  {item.notesForStudent && (
                    <p className="text-xs text-[var(--text-tertiary)] italic pt-0.5">
                      &ldquo;{item.notesForStudent}&rdquo;
                    </p>
                  )}
                </div>

                {/* Actions */}
                {item.status === "ACTIVE" && (
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {item.hasNewerPublishedVersion && (
                      <button
                        type="button"
                        onClick={() => setConfirmUpdateItem(item)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-foreground)] shadow-xs transition-all flex items-center gap-1.5 min-h-[36px] depth-interactive"
                      >
                        <RefreshIcon className="w-3.5 h-3.5" />
                        <span>Atualizar para V{item.currentPublishedVersionNumber}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmEndItem(item)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-500/10 border border-[var(--border-default)] hover:border-rose-500/20 transition-all flex items-center gap-1.5 min-h-[36px] depth-interactive"
                    >
                      <StopCircleIcon className="w-3.5 h-3.5" />
                      <span>Encerrar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal: Update Version */}
      {confirmUpdateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200 depth-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--brand)]">
                <RefreshIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Atualizar Versão da Prescrição?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Aluno: {confirmUpdateItem.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              O aluno atualmente consome a <strong className="text-[var(--text-primary)]">Versão {confirmUpdateItem.assignedVersionNumber}</strong> do treino{" "}
              <strong className="text-[var(--text-primary)]">&ldquo;{confirmUpdateItem.workoutTitle}&rdquo;</strong>.
              Ao confirmar, a prescrição será explicitamente vinculada à nova <strong className="text-[var(--text-primary)]">Versão {confirmUpdateItem.currentPublishedVersionNumber}</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmUpdateItem(null)}
                disabled={isPending}
                className="font-semibold min-h-[40px]"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateVersion}
                disabled={isPending}
                className="font-bold min-h-[40px] flex items-center gap-1.5 shadow-sm"
              >
                {isPending ? "Atualizando..." : `Confirmar Atualização (V${confirmUpdateItem.currentPublishedVersionNumber})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Terminate Assignment */}
      {confirmEndItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200 depth-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <StopCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Encerrar Prescrição?
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Aluno: {confirmEndItem.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Deseja encerrar o treino <strong className="text-[var(--text-primary)]">&ldquo;{confirmEndItem.workoutTitle}&rdquo;</strong> para este aluno?
              O treino não aparecerá mais na lista ativa do aluno, mas o histórico permanece preservado no sistema.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmEndItem(null)}
                disabled={isPending}
                className="font-semibold min-h-[40px]"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleTerminate}
                disabled={isPending}
                className="font-bold min-h-[40px] flex items-center gap-1.5 shadow-sm"
              >
                {isPending ? "Encerrando..." : "Sim, Encerrar Prescrição"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
