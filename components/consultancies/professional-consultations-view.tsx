"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  scheduleConsultationAction,
  rescheduleConsultationAction,
  cancelConsultationAction,
} from "@/app/consultoria/[slug]/consultas/actions";
import type {
  ConsultationListItemDto,
  ConsultationJoinAccessResult,
  ConsultationStatus,
  ConsultationProfessionalType,
  ActiveStudentOptionDto,
} from "@/lib/consultancies/consultations";

export interface ProfessionalConsultationsViewProps {
  consultancySlug: string;
  consultancyName: string;
  timezone: string;
  professionalType: ConsultationProfessionalType;
  activeStudents: ActiveStudentOptionDto[];
  upcomingConsultations: ConsultationListItemDto[];
  historyConsultations: ConsultationListItemDto[];
  joinAccessForNext: ConsultationJoinAccessResult | null;
}

function StatusBadge({ status }: { status: ConsultationStatus | "ENDED" }) {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Em andamento
        </span>
      );
    case "SCHEDULED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          Agendada
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20">
          Concluída
        </span>
      );
    case "CANCELED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
          Cancelada
        </span>
      );
    case "ENDED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
          Horário encerrado
        </span>
      );
  }
}

export function ProfessionalConsultationsView({
  consultancySlug,
  timezone,
  professionalType,
  activeStudents,
  upcomingConsultations,
  historyConsultations,
  joinAccessForNext,
}: ProfessionalConsultationsViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForReschedule, setSelectedForReschedule] = useState<ConsultationListItemDto | null>(null);
  const [selectedForCancel, setSelectedForCancel] = useState<ConsultationListItemDto | null>(null);

  // Form states
  const [createStudentPublicId, setCreateStudentPublicId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createStartTime, setCreateStartTime] = useState("");
  const [createEndTime, setCreateEndTime] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createStudentPublicId) {
      setCreateError("Selecione um aluno.");
      return;
    }
    if (!createDate || !createStartTime || !createEndTime) {
      setCreateError("Informe a data e os horários de início e término.");
      return;
    }

    const formData = new FormData();
    formData.set("slug", consultancySlug);
    formData.set("studentMembershipPublicId", createStudentPublicId);
    formData.set("professionalType", professionalType);
    formData.set("date", createDate);
    formData.set("startTime", createStartTime);
    formData.set("endTime", createEndTime);
    if (createTitle.trim()) {
      formData.set("title", createTitle.trim());
    }

    startTransition(async () => {
      const res = await scheduleConsultationAction({}, formData);
      if (res.success) {
        setIsCreateOpen(false);
        setCreateStudentPublicId("");
        setCreateDate("");
        setCreateStartTime("");
        setCreateEndTime("");
        setCreateTitle("");
      } else {
        setCreateError(res.error || "Erro ao agendar consulta.");
      }
    });
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForReschedule) return;
    setRescheduleError(null);

    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setRescheduleError("Informe a nova data e os novos horários.");
      return;
    }

    const formData = new FormData();
    formData.set("slug", consultancySlug);
    formData.set("consultationPublicId", selectedForReschedule.publicId);
    formData.set("date", rescheduleDate);
    formData.set("startTime", rescheduleStartTime);
    formData.set("endTime", rescheduleEndTime);

    startTransition(async () => {
      const res = await rescheduleConsultationAction({}, formData);
      if (res.success) {
        setSelectedForReschedule(null);
        setRescheduleDate("");
        setRescheduleStartTime("");
        setRescheduleEndTime("");
      } else {
        setRescheduleError(res.error || "Erro ao remarcar consulta.");
      }
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForCancel) return;
    setCancelError(null);

    const formData = new FormData();
    formData.set("slug", consultancySlug);
    formData.set("consultationPublicId", selectedForCancel.publicId);
    if (cancelReason.trim()) {
      formData.set("cancelReason", cancelReason.trim());
    }

    startTransition(async () => {
      const res = await cancelConsultationAction({}, formData);
      if (res.success) {
        setSelectedForCancel(null);
        setCancelReason("");
      } else {
        setCancelError(res.error || "Erro ao cancelar consulta.");
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        eyebrow="Agenda Profissional"
        title="Consultas"
        description="Gerencie seus próximos atendimentos e histórico de teleconsultas."
        backHref={`/consultoria/${consultancySlug}`}
        backLabel="Voltar ao painel"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-90 transition-opacity shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova consulta
          </button>
        }
      />

      {/* Timezone Note */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>Horários no fuso da consultoria: <strong className="text-[var(--text-primary)]">{timezone}</strong></span>
        </div>
      </div>

      {/* Próximas Consultas */}
      {upcomingConsultations.length > 0 ? (
        <section className="space-y-4" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--brand)]">
            Próximos Atendimentos ({upcomingConsultations.length})
          </h2>

          <div className="grid gap-3">
            {upcomingConsultations.map((item, index) => {
              const isNext = index === 0;
              const joinAllowed = isNext && joinAccessForNext?.allowed;
              const isTooEarly = isNext && !joinAccessForNext?.allowed && joinAccessForNext?.reason === "TOO_EARLY";

              return (
                <div
                  key={item.publicId}
                  className={`p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border transition-all ${
                    isNext
                      ? "border-2 border-[var(--brand)]/40 shadow-sm"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-base text-[var(--text-primary)]">
                          Aluno: {item.counterpartName}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {item.title || (professionalType === "PERSONAL" ? "Consulta com Personal Trainer" : "Consulta com Nutricionista")}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.scheduledStartFormatted}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Término: {item.scheduledEndFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Operational Action Bar */}
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {joinAllowed ? (
                        <div className="space-y-1">
                          <Link
                            href={`/consultoria/${consultancySlug}/consultas/${item.publicId}/preflight`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-90 transition-opacity shadow-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                            </svg>
                            Entrar na consulta
                          </Link>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Verificação de câmera e microfone será iniciada antes da chamada.
                          </p>
                        </div>
                      ) : isTooEarly ? (
                        <span className="text-xs text-[var(--text-secondary)] bg-[var(--surface-sunken)] px-3 py-1.5 rounded-lg border border-[var(--border-default)]">
                          Entrada liberada 10 min antes
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">
                          Acesso à sala no horário agendado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {item.status === "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForReschedule(item);
                              setRescheduleError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors border border-[var(--border-subtle)]"
                          >
                            Remarcar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForCancel(item);
                              setCancelError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
          title="Nenhuma consulta agendada"
          description="Você ainda não possui atendimentos agendados na sua grade."
          action={
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-90 transition-opacity"
            >
              Agendar primeira consulta
            </button>
          }
        />
      )}

      {/* Histórico de Consultas */}
      {historyConsultations.length > 0 && (
        <section className="space-y-3 pt-6 border-t border-[var(--border-subtle)]" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Histórico ({historyConsultations.length})
          </h2>
          <div className="grid gap-2.5">
            {historyConsultations.map((item) => {
              const isPastScheduled = item.status === "SCHEDULED";
              return (
                <div
                  key={item.publicId}
                  className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Aluno: {item.counterpartName}
                      </span>
                      <StatusBadge status={isPastScheduled ? "ENDED" : item.status} />
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      {item.title || (professionalType === "PERSONAL" ? "Consulta Personal" : "Consulta Nutricionista")}
                    </p>
                  </div>

                  <div className="text-left sm:text-right text-[var(--text-secondary)]">
                    {item.scheduledStartFormatted}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Create Consultation Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 id="create-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
                Nova Consulta
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor="create-student" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Aluno <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-student"
                  required
                  value={createStudentPublicId}
                  onChange={(e) => setCreateStudentPublicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                >
                  <option value="">Selecione um aluno ativo...</option>
                  {activeStudents.map((st) => (
                    <option key={st.membershipPublicId} value={st.membershipPublicId}>
                      {st.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="create-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="create-date"
                    type="date"
                    required
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>

                <div>
                  <label htmlFor="create-start-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Hora Início <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="create-start-time"
                    type="time"
                    required
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>

                <div>
                  <label htmlFor="create-end-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Hora Término <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="create-end-time"
                    type="time"
                    required
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-title" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Título ou Pauta (opcional)
                </label>
                <input
                  id="create-title"
                  type="text"
                  maxLength={200}
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={professionalType === "PERSONAL" ? "Ex: Avaliação de Treino e Metas" : "Ex: Revisão de Plano Alimentar"}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>

              <p className="text-[11px] text-[var(--text-tertiary)]">
                Horários calculados no fuso oficial da consultoria ({timezone}).
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs"
                >
                  {isPending ? "Agendando..." : "Salvar Agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {selectedForReschedule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl space-y-4">
            <h3 id="reschedule-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Remarcar Consulta
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Aluno: <strong className="text-[var(--text-primary)]">{selectedForReschedule.counterpartName}</strong>
            </p>

            {rescheduleError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="reschedule-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Nova Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reschedule-date"
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-start-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Início <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reschedule-start-time"
                    type="time"
                    required
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-end-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Término <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reschedule-end-time"
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-2 focus:outline-[var(--brand)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSelectedForReschedule(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs"
                >
                  {isPending ? "Remarcando..." : "Confirmar Remarcação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {selectedForCancel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl space-y-4">
            <h3 id="cancel-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Cancelar esta consulta?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Consulta com o aluno <strong>{selectedForCancel.counterpartName}</strong> agendada para <strong>{selectedForCancel.scheduledStartFormatted}</strong>. O atendimento será cancelado na agenda de ambos.
            </p>

            {cancelError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label htmlFor="cancel-reason-prof" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Motivo do cancelamento (opcional):
                </label>
                <textarea
                  id="cancel-reason-prof"
                  rows={2}
                  maxLength={500}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Imprevisto operacional..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSelectedForCancel(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isPending ? "Cancelando..." : "Confirmar cancelamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
