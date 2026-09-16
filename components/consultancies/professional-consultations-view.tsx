"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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
        <Badge variant="success" dot className="animate-pulse">
          Em andamento
        </Badge>
      );
    case "SCHEDULED":
      return <Badge variant="info">Agendada</Badge>;
    case "COMPLETED":
      return <Badge variant="neutral">Concluída</Badge>;
    case "CANCELED":
      return <Badge variant="danger">Cancelada</Badge>;
    case "ENDED":
      return <Badge variant="neutral">Horário encerrado</Badge>;
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

  const nextConsultation = upcomingConsultations[0] || null;
  const remainingUpcoming = upcomingConsultations.slice(1);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
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
            className="depth-interactive inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-[var(--brand)] text-white hover:opacity-95 shadow-xs transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova consulta
          </button>
        }
      />

      {/* Timezone Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] shadow-2xs">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>
            Horários no fuso oficial da consultoria: <strong className="text-[var(--text-primary)]">{timezone}</strong>
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          Teleconsulta 1:1 com verificação prévia de dispositivos
        </span>
      </div>

      {/* Próximas Consultas */}
      {upcomingConsultations.length > 0 ? (
        <section className="space-y-4" aria-labelledby="upcoming-heading">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Próximos Atendimentos ({upcomingConsultations.length})
            </h2>
          </div>

          {/* Destaque da próxima consulta */}
          {nextConsultation && (() => {
            const joinAllowed = joinAccessForNext?.allowed;
            const isTooEarly = !joinAccessForNext?.allowed && joinAccessForNext?.reason === "TOO_EARLY";

            return (
              <div className="depth-surface p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border-2 border-[var(--brand)]/35 shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)]">
                        Próximo atendimento
                      </span>
                      <StatusBadge status={nextConsultation.status} />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                        Aluno: {nextConsultation.counterpartName}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {nextConsultation.title || (professionalType === "PERSONAL" ? "Consulta com Personal Trainer" : "Consulta com Nutricionista")}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 p-3 sm:p-0 rounded-xl bg-[var(--surface-sunken)] sm:bg-transparent border sm:border-0 border-[var(--border-subtle)]">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {nextConsultation.scheduledStartFormatted}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      Término previsto: {nextConsultation.scheduledEndFormatted}
                    </div>
                  </div>
                </div>

                {/* Operational Action Bar */}
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {joinAllowed ? (
                      <div className="space-y-1">
                        <Link
                          href={`/consultoria/${consultancySlug}/consultas/${nextConsultation.publicId}/preflight`}
                          className="depth-interactive inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-95 transition-all shadow-xs active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                          </svg>
                          Entrar na consulta
                        </Link>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          Verificação de câmera e microfone será iniciada antes da chamada.
                        </p>
                      </div>
                    ) : isTooEarly ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-sunken)] px-3 py-1.5 rounded-xl border border-[var(--border-default)]">
                        <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Entrada liberada 10 min antes
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)]">
                        Acesso à sala liberado no horário agendado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {nextConsultation.status === "SCHEDULED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForReschedule(nextConsultation);
                            setRescheduleError(null);
                          }}
                          className="depth-interactive px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all border border-[var(--border-default)]"
                        >
                          Remarcar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedForCancel(nextConsultation);
                            setCancelError(null);
                          }}
                          className="depth-interactive px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Demais consultas futuras */}
          {remainingUpcoming.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Demais agendamentos ({remainingUpcoming.length})
              </h3>
              <div className="grid gap-2.5">
                {remainingUpcoming.map((item) => (
                  <div
                    key={item.publicId}
                    className="depth-surface p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:border-[var(--border-strong)] shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          Aluno: {item.counterpartName}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {item.title || (professionalType === "PERSONAL" ? "Consulta com Personal Trainer" : "Consulta com Nutricionista")}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="font-medium text-[var(--text-primary)]">
                          {item.scheduledStartFormatted}
                        </div>
                        <div className="text-[11px] text-[var(--text-tertiary)]">
                          Término: {item.scheduledEndFormatted}
                        </div>
                      </div>

                      {item.status === "SCHEDULED" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForReschedule(item);
                              setRescheduleError(null);
                            }}
                            className="depth-interactive px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all border border-[var(--border-default)]"
                          >
                            Remarcar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForCancel(item);
                              setCancelError(null);
                            }}
                            className="depth-interactive px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              className="depth-interactive inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--brand)] text-white hover:opacity-95 transition-all shadow-xs active:scale-95"
            >
              Agendar primeira consulta
            </button>
          }
        />
      )}

      {/* Histórico de Consultas */}
      {historyConsultations.length > 0 && (
        <section className="space-y-3 pt-6 border-t border-[var(--border-subtle)]" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Histórico ({historyConsultations.length})
          </h2>
          <div className="grid gap-2">
            {historyConsultations.map((item) => {
              const isPastScheduled = item.status === "SCHEDULED";
              return (
                <div
                  key={item.publicId}
                  className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Aluno: {item.counterpartName}
                      </span>
                      <StatusBadge status={isPastScheduled ? "ENDED" : item.status} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {item.title || (professionalType === "PERSONAL" ? "Consulta Personal" : "Consulta Nutricionista")}
                    </p>
                  </div>

                  <div className="text-left sm:text-right text-[var(--text-tertiary)] font-mono text-[11px]">
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
          <div className="depth-surface w-full max-w-lg p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="create-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
                  Nova Consulta
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Agende um atendimento 1:1 na grade oficial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="depth-interactive text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-border)] text-xs text-[var(--danger-foreground)] font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor="create-student" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Aluno <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  id="create-student"
                  required
                  value={createStudentPublicId}
                  onChange={(e) => setCreateStudentPublicId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
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
                  <label htmlFor="create-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Data <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="create-date"
                    type="date"
                    required
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="create-start-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Hora Início <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="create-start-time"
                    type="time"
                    required
                    value={createStartTime}
                    onChange={(e) => setCreateStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="create-end-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Hora Término <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="create-end-time"
                    type="time"
                    required
                    value={createEndTime}
                    onChange={(e) => setCreateEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-title" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Título ou Pauta (opcional)
                </label>
                <input
                  id="create-title"
                  type="text"
                  maxLength={200}
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={professionalType === "PERSONAL" ? "Ex: Avaliação de Treino e Metas" : "Ex: Revisão de Plano Alimentar"}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
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
                  className="depth-interactive px-4 py-2.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="depth-interactive px-5 py-2.5 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-xs active:scale-95"
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
          <div className="depth-surface w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl space-y-4">
            <h3 id="reschedule-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Remarcar Consulta
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Aluno: <strong className="text-[var(--text-primary)]">{selectedForReschedule.counterpartName}</strong>
            </p>

            {rescheduleError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-border)] text-xs text-[var(--danger-foreground)] font-medium">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="reschedule-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Nova Data <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="reschedule-date"
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-start-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Início <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="reschedule-start-time"
                    type="time"
                    required
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-end-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Término <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="reschedule-end-time"
                    type="time"
                    required
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSelectedForReschedule(null)}
                  className="depth-interactive px-4 py-2.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="depth-interactive px-4 py-2.5 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-xs active:scale-95"
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
          <div className="depth-surface w-full max-w-md p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl space-y-4">
            <h3 id="cancel-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Cancelar esta consulta?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Consulta com o aluno <strong className="text-[var(--text-primary)]">{selectedForCancel.counterpartName}</strong> agendada para <strong className="text-[var(--text-primary)]">{selectedForCancel.scheduledStartFormatted}</strong>. O atendimento será cancelado na agenda de ambos.
            </p>

            {cancelError && (
              <div role="alert" className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-border)] text-xs text-[var(--danger-foreground)] font-medium">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label htmlFor="cancel-reason-prof" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Motivo do cancelamento (opcional):
                </label>
                <textarea
                  id="cancel-reason-prof"
                  rows={2}
                  maxLength={500}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Imprevisto operacional..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-hidden focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSelectedForCancel(null)}
                  className="depth-interactive px-4 py-2.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="depth-interactive px-4 py-2.5 text-xs font-bold rounded-xl bg-[var(--danger)] text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-xs active:scale-95"
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
