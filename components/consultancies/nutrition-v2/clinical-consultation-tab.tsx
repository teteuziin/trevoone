"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  PatientConsultationHubSummaryDto,
  ClinicalConsultationDetailDto,
} from "@/lib/nutrition-v2/clinical-consultation-types";
import {
  getPatientConsultationsHubAction,
  getClinicalConsultationDetailAction,
} from "@/app/consultoria/[slug]/planos-v2/consultation-actions";
import { ClinicalConsultationModal } from "./clinical-consultation-modal";
import { ClinicalConsultationDetailModal } from "./clinical-consultation-detail-modal";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";

interface ClinicalConsultationTabProps {
  slug: string;
  studentPublicId: string;
  studentName: string;
  initialSummary?: PatientConsultationHubSummaryDto | null;
  initialAppointmentPublicId?: string | null;
  availableAnthropometrics?: PatientAnthropometricEntry[];
  canAuthor?: boolean;
}

export function ClinicalConsultationTab({
  slug,
  studentPublicId,
  studentName,
  initialSummary = null,
  initialAppointmentPublicId = null,
  availableAnthropometrics = [],
  canAuthor = true,
}: ClinicalConsultationTabProps) {
  const [summary, setSummary] = useState<PatientConsultationHubSummaryDto | null>(initialSummary);
  const [isLoading, setIsLoading] = useState(!initialSummary);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(Boolean(initialAppointmentPublicId && canAuthor));
  const [editingDetail, setEditingDetail] = useState<ClinicalConsultationDetailDto | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingDetail, setViewingDetail] = useState<ClinicalConsultationDetailDto | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadHubSummary = async () => {
    setIsLoading(true);
    const res = await getPatientConsultationsHubAction(slug, studentPublicId);
    if (res.success && res.data) {
      setSummary(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    if (!initialSummary) {
      getPatientConsultationsHubAction(slug, studentPublicId).then((res) => {
        if (!ignore) {
          if (res.success && res.data) {
            setSummary(res.data);
          }
          setIsLoading(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [slug, studentPublicId, initialSummary]);

  const handleOpenNewConsultation = () => {
    if (summary?.activeDraft) {
      // If there is an active draft, open it for continuation
      handleOpenDraft(summary.activeDraft.publicId);
      return;
    }
    setEditingDetail(null);
    setIsFormModalOpen(true);
  };

  const handleOpenDraft = async (publicId: string) => {
    startTransition(async () => {
      const res = await getClinicalConsultationDetailAction(slug, publicId);
      if (res.success && res.data) {
        setEditingDetail(res.data);
        setIsFormModalOpen(true);
      }
    });
  };

  const handleOpenDetail = async (publicId: string) => {
    startTransition(async () => {
      const res = await getClinicalConsultationDetailAction(slug, publicId);
      if (res.success && res.data) {
        setViewingDetail(res.data);
        setIsDetailModalOpen(true);
      }
    });
  };

  const handleModalSuccess = () => {
    setIsFormModalOpen(false);
    setEditingDetail(null);
    loadHubSummary();
  };

  if (isLoading && !summary) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
        Carregando histórico de consultas...
      </div>
    );
  }

  const timeline = summary?.consultationsTimeline || [];
  const activeDraft = summary?.activeDraft;
  const latestCompleted = summary?.latestCompletedConsultation;

  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Última Consulta */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Última Consulta
          </span>
          {latestCompleted ? (
            <div>
              <span className="text-sm font-bold text-[var(--text-primary)] block">
                {latestCompleted.formattedDate}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                {latestCompleted.consultationTypeLabel} •{" "}
                {latestCompleted.weightKg !== null ? `${latestCompleted.weightKg} kg` : "Sem peso"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-secondary)] italic">Nenhum atendimento</span>
          )}
        </div>

        {/* Card 2: Retorno Recomendado */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Retorno Recomendado
          </span>
          {summary?.recommendedReturnFormatted ? (
            <span className="text-sm font-bold text-[var(--accent-primary)] block">
              {summary.recommendedReturnFormatted}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-secondary)] italic">Não definido</span>
          )}
          <span className="text-[10px] text-[var(--text-tertiary)] block">Sugestão clínica</span>
        </div>

        {/* Card 3: Próxima Consulta Agendada (Agenda oficial) */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Próxima Consulta Agendada
          </span>
          {summary?.realNextAppointment ? (
            <div>
              <span className="text-sm font-bold text-emerald-400 block">
                {summary.realNextAppointment.formattedStart}
              </span>
              <span className="text-[10px] text-emerald-500/80">Agenda confirmada</span>
            </div>
          ) : (
            <div>
              <span className="text-xs text-[var(--text-secondary)] italic block">Não agendada</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Sem teleconsulta futura</span>
            </div>
          )}
        </div>

        {/* Card 4: Consultas Concluídas */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
            Total de Consultas
          </span>
          <span className="text-xl font-extrabold text-[var(--text-primary)] block">
            {summary?.totalCompletedConsultations ?? 0}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)]">Atendimentos concluídos</span>
        </div>
      </div>

      {/* Active Draft Banner if exists */}
      {activeDraft && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">Consulta em andamento</h4>
              <p className="text-[11px] text-amber-200/80">
                Iniciada em {activeDraft.formattedDate} ({activeDraft.consultationTypeLabel}) por{" "}
                {activeDraft.professionalName}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenDraft(activeDraft.publicId)}
            disabled={isPending}
            className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 self-start sm:self-auto"
          >
            Continuar atendimento →
          </Button>
        </div>
      )}

      {/* Header with CTA */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Histórico Cronológico de Atendimentos</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Acompanhamento temporal, conduta profissional e metas de retorno.
          </p>
        </div>
        {canAuthor && !activeDraft && (
          <Button
            size="sm"
            onClick={handleOpenNewConsultation}
            className="text-xs font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white shadow-sm"
          >
            + Nova consulta
          </Button>
        )}
      </div>

      {/* Timeline List or Empty State */}
      {timeline.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 space-y-3">
          <div className="w-10 h-10 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mx-auto text-base">
            📋
          </div>
          <div className="max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Nenhuma consulta registrada ainda</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Registre a primeira consulta para iniciar a timeline clínica e acompanhar a evolução deste paciente.
            </p>
          </div>
          {canAuthor && (
            <Button
              size="sm"
              onClick={handleOpenNewConsultation}
              className="text-xs font-bold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white mt-2"
            >
              Registrar primeira consulta
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((item) => {
            const isDraft = item.status === "DRAFT";
            const isCancelled = item.status === "CANCELLED";
            const isCompleted = item.status === "COMPLETED";

            return (
              <div
                key={item.publicId}
                className={`p-4 rounded-xl border transition-all ${
                  isDraft
                    ? "bg-amber-500/5 border-amber-500/30"
                    : isCancelled
                    ? "bg-[var(--surface-secondary)]/30 border-[var(--border-subtle)] opacity-70"
                    : "bg-[var(--surface-secondary)]/60 border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-secondary)]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-[var(--text-primary)]">
                        {item.formattedDate}
                      </span>
                      <Badge variant="neutral" className="text-[10px]">
                        {item.consultationTypeLabel}
                      </Badge>
                      <Badge
                        variant={isCompleted ? "success" : isDraft ? "warning" : "danger"}
                        className="text-[10px]"
                      >
                        {item.statusLabel}
                      </Badge>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        • Profissional: {item.professionalName}
                      </span>
                    </div>

                    {/* Weight & Evolution row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {item.weightKg !== null ? (
                        <span>
                          Peso: <strong className="text-[var(--text-primary)]">{item.weightKg} kg</strong>
                        </span>
                      ) : (
                        <span className="italic text-[var(--text-tertiary)]">Sem medição</span>
                      )}

                      {item.weightDeltaKg !== null && (
                        <span
                          className={`font-semibold ${
                            item.weightDeltaKg <= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {item.weightDeltaKg > 0 ? "+" : ""}
                          {item.weightDeltaKg} kg (
                          {item.weightDeltaPercent! > 0 ? "+" : ""}
                          {item.weightDeltaPercent}%)
                        </span>
                      )}

                      <span>
                        Adesão: <strong className="text-[var(--text-primary)]">{item.adherenceLabel}</strong>
                      </span>

                      {item.recommendedReturnFormatted && (
                        <span>
                          Retorno sugerido:{" "}
                          <strong className="text-[var(--accent-primary)]">
                            {item.recommendedReturnFormatted}
                          </strong>
                        </span>
                      )}
                    </div>

                    {/* Conduct preview if present */}
                    {item.conduct && (
                      <p className="text-xs text-[var(--text-primary)]/90 line-clamp-2 pt-0.5 font-medium">
                        Conduta: {item.conduct}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isDraft ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenDraft(item.publicId)}
                        disabled={isPending}
                        className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                      >
                        Continuar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(item.publicId)}
                        disabled={isPending}
                        className="text-xs"
                      >
                        Ver detalhes
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova / Editar Rascunho */}
      {isFormModalOpen && (
        <ClinicalConsultationModal
          slug={slug}
          studentPublicId={studentPublicId}
          studentName={studentName}
          existingConsultationDetail={editingDetail}
          suggestedType={summary?.suggestedNextType || "INITIAL"}
          availableAnthropometrics={availableAnthropometrics}
          initialAppointmentPublicId={initialAppointmentPublicId}
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Modal Detalhe Concluída (Imutável) */}
      {isDetailModalOpen && viewingDetail && (
        <ClinicalConsultationDetailModal
          slug={slug}
          detail={viewingDetail}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setViewingDetail(null);
          }}
        />
      )}
    </div>
  );
}
