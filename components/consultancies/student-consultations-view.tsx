"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { cancelConsultationAction } from "@/app/consultoria/[slug]/consultas/actions";
import type {
  ConsultationListItemDto,
  ConsultationJoinAccessResult,
  ConsultationStatus,
} from "@/lib/consultancies/consultations";

export interface StudentConsultationsViewProps {
  consultancySlug: string;
  consultancyName: string;
  timezone: string;
  nextConsultation: ConsultationListItemDto | null;
  joinAccess: ConsultationJoinAccessResult | null;
  upcomingConsultations: ConsultationListItemDto[];
  historyConsultations: ConsultationListItemDto[];
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

export function StudentConsultationsView({
  consultancySlug,
  timezone,
  nextConsultation,
  joinAccess,
  upcomingConsultations,
  historyConsultations,
}: StudentConsultationsViewProps) {
  const [selectedForCancel, setSelectedForCancel] = useState<ConsultationListItemDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        setCancelError(res.error || "Não foi possível cancelar a consulta.");
      }
    });
  };

  const hasAnyUpcoming = !!nextConsultation || upcomingConsultations.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        eyebrow="Teleconsulta 1:1"
        title="Consultas"
        description="Acompanhe seus próximos atendimentos e seu histórico."
        backHref={`/consultoria/${consultancySlug}`}
        backLabel="Voltar ao painel"
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

      {/* Destaque: Próxima Consulta */}
      {nextConsultation && (
        <section className="space-y-3" aria-labelledby="next-consultation-heading">
          <h2 id="next-consultation-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--brand)]">
            {nextConsultation.status === "IN_PROGRESS" ? "Consulta em Andamento" : "Próxima Consulta"}
          </h2>

          <div className="p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border-2 border-[var(--brand)]/40 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {nextConsultation.title || (nextConsultation.professionalType === "PERSONAL" ? "Consulta com Personal Trainer" : "Consulta com Nutricionista")}
                  </span>
                  <StatusBadge status={nextConsultation.status} />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Profissional: <strong className="text-[var(--text-primary)]">{nextConsultation.counterpartName}</strong> ({nextConsultation.counterpartRole})
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                  {nextConsultation.scheduledStartFormatted}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Término: {nextConsultation.scheduledEndFormatted}
                </div>
              </div>
            </div>

            {/* Join State / Call to Action */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {joinAccess?.allowed ? (
                  <div className="space-y-1">
                    <Link
                      href={`/consultoria/${consultancySlug}/consultas/${nextConsultation.publicId}/preflight`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[var(--brand)] text-white hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-2.36a.75.75 0 0 1 1.03.682v6.356a.75.75 0 0 1-1.03.682l-4.72-2.36M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
                      </svg>
                      Entrar na consulta
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Verificação de câmera e microfone será iniciada antes da chamada.
                    </p>
                  </div>
                ) : !joinAccess?.allowed && joinAccess?.reason === "TOO_EARLY" ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-sunken)] px-3.5 py-2 rounded-xl border border-[var(--border-default)]">
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Entrada liberada 10 minutos antes do horário de início.</span>
                  </div>
                ) : !joinAccess?.allowed && joinAccess?.reason === "STUDENT_BILLING_BLOCKED" ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20">
                      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                      <span>Acesso suspenso por pendência financeira. Regularize para acessar a sala.</span>
                    </div>
                    <Link
                      href={`/consultoria/${consultancySlug}/pagamentos/regularizar`}
                      className="inline-block text-xs font-bold text-[var(--brand)] hover:underline"
                    >
                      Ir para Regularização →
                    </Link>
                  </div>
                ) : !joinAccess?.allowed && joinAccess?.reason === "JOIN_WINDOW_CLOSED" ? (
                  <div className="text-xs text-[var(--text-secondary)]">
                    Horário de atendimento encerrado.
                  </div>
                ) : null}
              </div>

              {/* Botão de cancelamento para o aluno */}
              {nextConsultation.status === "SCHEDULED" && (
                <button
                  type="button"
                  onClick={() => setSelectedForCancel(nextConsultation)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  Cancelar consulta
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Consultas Futuras */}
      {upcomingConsultations.length > 0 && (
        <section className="space-y-3" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Outros Atendimentos Agendados
          </h2>
          <div className="grid gap-3">
            {upcomingConsultations.map((item) => (
              <div
                key={item.publicId}
                className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {item.title || (item.professionalType === "PERSONAL" ? "Consulta com Personal" : "Consulta com Nutricionista")}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Profissional: <strong className="text-[var(--text-primary)]">{item.counterpartName}</strong> ({item.counterpartRole})
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {item.scheduledStartFormatted}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      até {item.scheduledEndFormatted}
                    </div>
                  </div>

                  {item.status === "SCHEDULED" && (
                    <button
                      type="button"
                      onClick={() => setSelectedForCancel(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasAnyUpcoming && (
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
          title="Nenhuma consulta agendada"
          description="Quando seu profissional marcar um atendimento, ele aparecerá aqui."
        />
      )}

      {/* Histórico */}
      {historyConsultations.length > 0 && (
        <section className="space-y-3 pt-6 border-t border-[var(--border-subtle)]" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Histórico de Consultas
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
                        {item.title || (item.professionalType === "PERSONAL" ? "Consulta Personal" : "Consulta Nutricionista")}
                      </span>
                      <StatusBadge status={isPastScheduled ? "ENDED" : item.status} />
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      {item.counterpartName} ({item.counterpartRole})
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
              Tem certeza de que deseja cancelar a consulta agendada para <strong>{selectedForCancel.scheduledStartFormatted}</strong>? O atendimento será removido da sua agenda ativa.
            </p>

            {cancelError && (
              <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label htmlFor="cancel-reason" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Motivo do cancelamento (opcional):
                </label>
                <textarea
                  id="cancel-reason"
                  rows={2}
                  maxLength={500}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Conflito de horário..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-2 focus:outline-[var(--brand)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setSelectedForCancel(null);
                    setCancelError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors"
                >
                  Manter consulta
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
