"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProfessionalAssignmentListItem } from "@/lib/training-v2/assignment-repository";
import {
  updateWorkoutAssignmentVersionAction,
  terminateWorkoutAssignmentAction,
  updateWorkoutAssignmentCustomTitleAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
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

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}


function formatDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number | Date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

type AssignmentFilterTab = "ALL" | "ACTIVE" | "UPDATES" | "ENDED";

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
  const [activeTab, setActiveTab] = useState<AssignmentFilterTab>("ACTIVE");
  const [reviewUpdateItem, setReviewUpdateItem] = useState<ProfessionalAssignmentListItem | null>(null);
  const [confirmEndItem, setConfirmEndItem] = useState<ProfessionalAssignmentListItem | null>(null);
  const [editTitleItem, setEditTitleItem] = useState<ProfessionalAssignmentListItem | null>(null);
  const [editedCustomTitle, setEditedCustomTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const updatesCount = items.filter((i) => i.status === "ACTIVE" && i.hasNewerPublishedVersion).length;
  const endedCount = items.filter((i) => i.status === "ENDED").length;

  const filteredItems = items.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") return item.status === "ACTIVE";
    if (activeTab === "UPDATES") return item.status === "ACTIVE" && item.hasNewerPublishedVersion;
    if (activeTab === "ENDED") return item.status === "ENDED";
    return true;
  });

  function handleSaveCustomTitle() {
    if (!editTitleItem) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateWorkoutAssignmentCustomTitleAction(
        slug,
        editTitleItem.assignmentPublicId,
        editedCustomTitle.trim() || null
      );

      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao atualizar nome da ficha.");
        return;
      }

      const cleanTrimmed = editedCustomTitle.trim();
      const updatedTitle = cleanTrimmed || `Treino de ${editTitleItem.studentName}`;
      setItems((prev) =>
        prev.map((it) =>
          it.assignmentPublicId === editTitleItem.assignmentPublicId
            ? {
                ...it,
                customTitle: cleanTrimmed || null,
                workoutTitle: updatedTitle,
              }
            : it
        )
      );

      setSuccessMessage(`Nome da ficha de ${editTitleItem.studentName} atualizado com sucesso!`);
      setEditTitleItem(null);
      router.refresh();
    });
  }

  function handleConfirmUpdateVersion() {
    if (!reviewUpdateItem || !reviewUpdateItem.currentPublishedVersionPublicId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateWorkoutAssignmentVersionAction(
        slug,
        reviewUpdateItem.assignmentPublicId,
        reviewUpdateItem.currentPublishedVersionPublicId!
      );

      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao atualizar treino do aluno.");
        setReviewUpdateItem(null);
        return;
      }

      // Update locally
      setItems((prev) =>
        prev.map((item) => {
          if (item.assignmentPublicId === reviewUpdateItem.assignmentPublicId) {
            return {
              ...item,
              assignedVersionPublicId: reviewUpdateItem.currentPublishedVersionPublicId!,
              assignedVersionNumber: reviewUpdateItem.currentPublishedVersionNumber!,
              hasNewerPublishedVersion: false,
            };
          }
          return item;
        })
      );

      setSuccessMessage(
        `Treino de ${reviewUpdateItem.studentName} atualizado com sucesso!`
      );
      setReviewUpdateItem(null);
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
        setErrorMessage(res.error || "Erro ao encerrar treino.");
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

      setSuccessMessage(`Treino de ${confirmEndItem.studentName} encerrado com sucesso.`);
      setConfirmEndItem(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 shrink-0 text-[#176B49]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Tabs - Ivory Design */}
      <div className="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "ACTIVE"
              ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
              : "text-[#526058] hover:text-[#102E23] hover:bg-black/5 font-semibold"
          }`}
        >
          <span>Ativos</span>
          <span className="text-[11px] opacity-75 font-mono">({activeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("UPDATES")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "UPDATES"
              ? "bg-white text-[#8C5D00] font-bold shadow-2xs border border-[#FBE3A4]"
              : "text-[#526058] hover:text-[#8C5D00] hover:bg-black/5 font-semibold"
          }`}
        >
          <span>Atualizações</span>
          {updatesCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-[#FFF8E6] text-[#8C5D00] border border-[#FBE3A4] text-[10px] font-bold">
              {updatesCount}
            </span>
          ) : (
            <span className="text-[11px] opacity-75 font-mono">(0)</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ENDED")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "ENDED"
              ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
              : "text-[#526058] hover:text-[#102E23] hover:bg-black/5 font-semibold"
          }`}
        >
          <span>Encerrados</span>
          <span className="text-[11px] opacity-75 font-mono">({endedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "ALL"
              ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
              : "text-[#526058] hover:text-[#102E23] hover:bg-black/5 font-semibold"
          }`}
        >
          <span>Todos</span>
          <span className="text-[11px] opacity-75 font-mono">({items.length})</span>
        </button>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl border border-[#E5E8E2] bg-white shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center mx-auto">
            <UserIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#102E23]">
              Nenhum treino encontrado nesta categoria
            </h3>
            <p className="text-xs text-[#526058] leading-relaxed">
              {activeTab === "ACTIVE"
                ? "Abra um treino publicado e use a opção 'Prescrever para aluno' para associar fichas aos seus alunos."
                : activeTab === "UPDATES"
                ? "Todos os alunos com treinos ativos já estão utilizando as versões mais recentes."
                : "Nenhum treino no filtro selecionado."}
            </p>
          </div>
        </div>
      ) : (
        /* Assignments List */
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isActive = item.status === "ACTIVE";
            const hasUpdate = isActive && item.hasNewerPublishedVersion;
            const studentInitials = item.studentName
              ? item.studentName.slice(0, 2).toUpperCase()
              : "AL";

            return (
              <div
                key={item.assignmentPublicId}
                className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5E8E2] hover:border-[#CCD5CB] shadow-2xs hover:shadow-xs transition-all space-y-2.5"
              >
                {/* Header: Student and Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#EDF5F0] text-[#176B49] border border-[#D5E4D8] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {studentInitials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[#102E23] truncate leading-tight">
                        {item.studentName}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {hasUpdate ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FFF8E6] text-[#8C5D00] border border-[#FBE3A4] shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-[#E58900] animate-pulse" />
                        <span>Atualização disponível</span>
                      </span>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#EBF7EE] text-[#12583B] border border-[#CDEED5]">
                        <span className="w-2 h-2 rounded-full bg-[#176B49]" />
                        <span>Treino ativo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F5F5F0] text-[#6B7870] border border-[#E5E8E2]">
                        Treino encerrado
                      </span>
                    )}
                  </div>
                </div>

                {/* Workout details and direct actions */}
                <div className="pt-2.5 border-t border-[#F0F2ED] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#102E23] truncate">
                      {item.workoutTitle}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-[#526058]">
                      <span>Início em {formatDate(item.startsOn)}</span>
                      {item.endsOn && (
                        <>
                          <span>·</span>
                          <span>Término: {formatDate(item.endsOn)}</span>
                        </>
                      )}
                      {item.notesForStudent && (
                        <>
                          <span>·</span>
                          <span className="italic text-[#6B7870] truncate max-w-[200px]">
                            &ldquo;{item.notesForStudent}&rdquo;
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direct Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTitleItem(item);
                          setEditedCustomTitle(item.customTitle || "");
                        }}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] border border-[#DEE2DA] transition-all flex items-center gap-1 min-h-[36px] cursor-pointer"
                        title="Renomear ficha do aluno"
                      >
                        <EditIcon className="w-3.5 h-3.5 text-[#6B7870]" />
                        <span className="hidden sm:inline">Renomear</span>
                      </button>
                    )}

                    {hasUpdate ? (
                      <button
                        type="button"
                        onClick={() => setReviewUpdateItem(item)}
                        disabled={isPending}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all flex items-center gap-1.5 min-h-[36px] cursor-pointer"
                      >
                        <RefreshIcon className="w-3.5 h-3.5 text-white" />
                        <span>Conferir atualização</span>
                      </button>
                    ) : isActive ? (
                      <a
                        href={`/consultoria/${slug}/rotinas/${item.workoutPublicId}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all min-h-[36px] cursor-pointer"
                      >
                        <span>Ver treino</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    ) : (
                      <a
                        href={`/consultoria/${slug}/rotinas/${item.workoutPublicId}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#D5DDD6] transition-all min-h-[36px] cursor-pointer"
                      >
                        <span>Ver histórico</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => setConfirmEndItem(item)}
                        disabled={isPending}
                        className="p-2 rounded-xl text-[#6B7870] hover:text-rose-600 hover:bg-rose-50 border border-[#DEE2DA] hover:border-rose-200 transition-all flex items-center justify-center min-h-[36px] min-w-[36px] cursor-pointer"
                        title="Encerrar treino do aluno"
                        aria-label="Encerrar treino do aluno"
                      >
                        <StopCircleIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE 3 MOMENTOS: CONFERIR ATUALIZAÇÃO
          Momento 1: Entender
          Momento 2: Conferir (Comparação)
          Momento 3: Decidir
          ========================================================================= */}
      {reviewUpdateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E5E8E2] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 font-sans">
            {/* Header / Momento 1: Entender */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-[#FFF8E6] text-[#8C5D00] border border-[#FBE3A4] flex items-center justify-center shrink-0">
                  <RefreshIcon className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#102E23]">
                    Atualização disponível para {reviewUpdateItem.studentName}
                  </h3>
                  <p className="text-xs text-[#6B7870]">
                    Você editou a ficha base e há uma nova versão pronta para envio.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#E5E8E2] text-xs text-[#526058] leading-relaxed">
                <strong className="text-[#102E23] block mb-0.5">Momento 1: Entender o que acontece</strong>
                O aluno continua visualizando o treino anterior até você confirmar o envio. Ao atualizar, o aplicativo do aluno receberá a versão mais recente imediatamente.
              </div>
            </div>

            {/* Momento 2: Conferir (Comparação lado a lado ou empilhada) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#102E23] block">
                Momento 2: Conferir as fichas
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lado A: O que o aluno usa hoje */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E5E8E2] space-y-2">
                  <span className="text-[10px] font-bold text-[#6B7870] uppercase tracking-wider block">
                    Treino atual do aluno
                  </span>
                  <p className="text-xs font-bold text-[#102E23] truncate">
                    {reviewUpdateItem.workoutTitle}
                  </p>
                  <p className="text-[11px] text-[#6B7870]">
                    Ficha em uso no aplicativo
                  </p>
                </div>

                {/* Lado B: A nova versão pronta */}
                <div className="p-3.5 rounded-2xl bg-[#EBF7EE] border border-[#CDEED5] space-y-2">
                  <span className="text-[10px] font-bold text-[#12583B] uppercase tracking-wider block">
                    Nova versão atualizada
                  </span>
                  <p className="text-xs font-bold text-[#102E23] truncate">
                    {reviewUpdateItem.workoutTitle}
                  </p>
                  <p className="text-[11px] text-[#12583B] font-medium">
                    Pronta para envio ao aluno
                  </p>
                </div>
              </div>
            </div>

            {/* Momento 3: Decidir */}
            <div className="pt-2 border-t border-[#F0F2ED] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewUpdateItem(null)}
                disabled={isPending}
                className="w-full sm:w-auto font-semibold min-h-[42px] cursor-pointer"
              >
                Manter treino atual
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmUpdateVersion}
                disabled={isPending}
                className="w-full sm:w-auto font-bold min-h-[42px] bg-[#176B49] hover:bg-[#12583B] text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshIcon className="w-4 h-4 text-white" />
                <span>{isPending ? "Atualizando..." : "Atualizar treino do aluno"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Terminate Assignment */}
      {confirmEndItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E5E8E2] shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <StopCircleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#102E23]">
                  Encerrar treino do aluno?
                </h3>
                <p className="text-xs text-[#6B7870] font-medium">
                  Aluno: {confirmEndItem.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#526058] leading-relaxed">
              Deseja encerrar o treino <strong className="text-[#102E23]">&ldquo;{confirmEndItem.workoutTitle}&rdquo;</strong> para este aluno?
              O treino não aparecerá mais como ativo no aplicativo dele, mas o histórico permanece 100% seguro e preservado.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmEndItem(null)}
                disabled={isPending}
                className="font-semibold min-h-[42px] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleTerminate}
                disabled={isPending}
                className="font-bold min-h-[42px] cursor-pointer"
              >
                {isPending ? "Encerrando..." : "Sim, encerrar treino"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Custom Title */}
      {editTitleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E5E8E2] shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-200 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EDF5F0] border border-[#D5E4D8] flex items-center justify-center text-[#176B49]">
                <EditIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#102E23]">
                  Renomear ficha do aluno
                </h3>
                <p className="text-xs text-[#6B7870] font-medium">
                  Aluno: {editTitleItem.studentName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#102E23]">
                Nome de exibição da ficha para este aluno
              </label>
              <input
                type="text"
                value={editedCustomTitle}
                onChange={(e) => setEditedCustomTitle(e.target.value)}
                placeholder={`Ex: Treino de ${editTitleItem.studentName}`}
                disabled={isPending}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F0] border border-[#DEE2DA] text-sm text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49] focus:bg-white transition-all min-h-[44px]"
              />
              <p className="text-[11px] text-[#6B7870] leading-relaxed">
                Deixe em branco para restaurar automaticamente o nome padrão &quot;Treino de {editTitleItem.studentName}&quot;.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditTitleItem(null)}
                disabled={isPending}
                className="font-semibold min-h-[42px] cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCustomTitle}
                disabled={isPending}
                className="font-bold min-h-[42px] bg-[#176B49] hover:bg-[#12583B] text-white cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar nome"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
