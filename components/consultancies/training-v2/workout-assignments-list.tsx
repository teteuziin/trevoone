"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProfessionalAssignmentListItem } from "@/lib/training-v2/assignment-repository";
import {
  updateWorkoutAssignmentVersionAction,
  terminateWorkoutAssignmentAction,
} from "@/app/consultoria/[slug]/rotinas/actions";

function RefreshCw({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CheckCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function User({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StopCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "ACTIVE"
              ? "bg-[var(--surface)] text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Ativas ({items.filter((i) => i.status === "ACTIVE").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ENDED")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "ENDED"
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Encerradas ({items.filter((i) => i.status === "ENDED").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "ALL"
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Todas ({items.length})
        </button>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Nenhuma prescrição encontrada
          </p>
          <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
            {activeTab === "ACTIVE"
              ? "Abra um treino publicado e clique em 'Prescrever para Aluno' para associar rotinas aos seus alunos."
              : "Nenhuma prescrição no filtro selecionado."}
          </p>
        </div>
      ) : (
        /* Assignments Grid / List */
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.assignmentPublicId}
              className="p-4 sm:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-hover)] shadow-sm transition-all space-y-3"
            >
              {/* Header: Student and Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--foreground)] truncate">
                      {item.studentName}
                    </h3>
                    <p className="text-xs text-[var(--foreground-muted)] truncate">
                      {item.studentEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {item.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--foreground-muted)]">
                      Encerrada
                    </span>
                  )}

                  {item.hasNewerPublishedVersion && item.status === "ACTIVE" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                      Nova versão disponível (V{item.currentPublishedVersionNumber})
                    </span>
                  )}
                </div>
              </div>

              {/* Workout details and version comparison */}
              <div className="pt-2 border-t border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    {item.workoutTitle}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Prescrito: <span className="font-semibold text-[var(--foreground)]">Versão {item.assignedVersionNumber}</span>
                    {item.currentPublishedVersionNumber && (
                      <span> · Publicado atual: <span className="font-semibold text-[var(--foreground)]">Versão {item.currentPublishedVersionNumber}</span></span>
                    )}
                    <span> · Início: {item.startsOn}</span>
                    {item.endsOn && <span> · Término: {item.endsOn}</span>}
                  </p>
                  {item.notesForStudent && (
                    <p className="text-xs text-[var(--foreground-muted)] italic pt-0.5">
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
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Atualizar para V{item.currentPublishedVersionNumber}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmEndItem(item)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--foreground-muted)] hover:text-rose-600 hover:bg-rose-500/10 border border-[var(--border-default)] hover:border-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Atualizar Versão da Prescrição?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Aluno: {confirmUpdateItem.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              O aluno atualmente consome a <strong className="text-[var(--foreground)]">Versão {confirmUpdateItem.assignedVersionNumber}</strong> do treino{" "}
              <strong className="text-[var(--foreground)]">&ldquo;{confirmUpdateItem.workoutTitle}&rdquo;</strong>.
              Ao confirmar, a prescrição será explicitamente vinculada à nova <strong className="text-[var(--foreground)]">Versão {confirmUpdateItem.currentPublishedVersionNumber}</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUpdateItem(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateVersion}
                disabled={isPending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? "Atualizando..." : `Confirmar Atualização (V${confirmUpdateItem.currentPublishedVersionNumber})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Terminate Assignment */}
      {confirmEndItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <StopCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Encerrar Prescrição?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Aluno: {confirmEndItem.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Deseja encerrar o treino <strong className="text-[var(--foreground)]">&ldquo;{confirmEndItem.workoutTitle}&rdquo;</strong> para este aluno?
              O treino não aparecerá mais na lista ativa do aluno, mas o histórico permanece preservado no sistema.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEndItem(null)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTerminate}
                disabled={isPending}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending ? "Encerrando..." : "Sim, Encerrar Prescrição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
