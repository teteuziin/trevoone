"use client";

import React, { useState, useTransition, useEffect } from "react";
import type {
  CheckinDetailDto,
  CheckinAdherenceLevel,
  PatientCheckinsHubSummaryDto,
} from "@/lib/nutrition-v2/checkin-types";
import {
  CHECKIN_ADHERENCE_LABELS,
  CHECKIN_RATING_LABELS,
  CHECKIN_ENERGY_LABELS,
  CHECKIN_SLEEP_LABELS,
  CHECKIN_TRAINING_LABELS,
} from "@/lib/nutrition-v2/checkin-types";
import type {
  FollowupTimelineFilter,
  PatientFollowupHubSummaryDto,
} from "@/lib/nutrition-v2/followup-types";
import {
  createCheckinRequestAction,
  cancelCheckinRequestAction,
  getCheckinDetailAction,
} from "@/app/consultoria/[slug]/planos-v2/checkin-actions";
import { getPatientFollowupTimelineAction } from "@/app/consultoria/[slug]/nutricao/acompanhamento-actions";

interface PatientCheckinsTabProps {
  slug: string;
  studentPublicId: string;
  canAuthor?: boolean;
  initialSummary?: PatientCheckinsHubSummaryDto | null;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return isoStr;
  }
}

export function PatientCheckinsTab({
  slug,
  studentPublicId,
  canAuthor = true,
}: PatientCheckinsTabProps) {
  const [timelineSummary, setTimelineSummary] = useState<PatientFollowupHubSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter state
  const [filter, setFilter] = useState<FollowupTimelineFilter>("all");

  // Request modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Check-in response detail modal states
  const [selectedResponsePublicId, setSelectedResponsePublicId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CheckinDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Photo viewer modal
  const [selectedPhotoPublicId, setSelectedPhotoPublicId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getPatientFollowupTimelineAction(slug, studentPublicId).then((res) => {
      if (isMounted) {
        setIsLoading(false);
        if (res.success && res.data) {
          setTimelineSummary(res.data);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [slug, studentPublicId]);

  function refreshTimeline() {
    startTransition(async () => {
      const res = await getPatientFollowupTimelineAction(slug, studentPublicId);
      if (res.success && res.data) {
        setTimelineSummary(res.data);
      }
    });
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingRequest(true);
    setMessage(null);

    const dueAt = dueDateInput ? new Date(dueDateInput).toISOString() : null;
    const res = await createCheckinRequestAction(slug, studentPublicId, dueAt);
    setIsSubmittingRequest(false);

    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Erro ao solicitar check-in." });
    } else {
      setMessage({ type: "success", text: "Solicitação de check-in enviada ao aluno com sucesso!" });
      setIsRequestModalOpen(false);
      setDueDateInput("");
      refreshTimeline();
    }
  }

  async function handleCancelRequest(requestPublicId: string) {
    if (!confirm("Tem certeza que deseja cancelar esta solicitação de check-in?")) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await cancelCheckinRequestAction(slug, studentPublicId, requestPublicId);
      if (!res.success) {
        setMessage({ type: "error", text: res.error || "Erro ao cancelar solicitação." });
      } else {
        setMessage({ type: "success", text: "Solicitação cancelada." });
        refreshTimeline();
      }
    });
  }

  async function handleOpenDetail(publicId: string) {
    setSelectedResponsePublicId(publicId);
    setIsLoadingDetail(true);
    const res = await getCheckinDetailAction(slug, publicId);
    setIsLoadingDetail(false);
    if (res.success) {
      setDetailData(res.data);
    } else {
      setMessage({ type: "error", text: res.error || "Erro ao carregar detalhes." });
    }
  }

  function renderAdherenceBadge(level: CheckinAdherenceLevel | string) {
    switch (level) {
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span>●</span>
            <span>Adesão Alta</span>
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span>●</span>
            <span>Adesão Moderada</span>
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span>●</span>
            <span>Adesão Baixa</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {CHECKIN_ADHERENCE_LABELS[level as CheckinAdherenceLevel] || level}
          </span>
        );
    }
  }

  // Filter timeline items
  const allItems = timelineSummary?.timeline || [];
  const filteredItems = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "meals") return item.type === "FOOD_PHOTO";
    if (filter === "checkins") return item.type === "CHECKIN_REQUEST" || item.type === "CHECKIN_RESPONSE";
    if (filter === "notes") return item.type === "PATIENT_NOTE";
    return true;
  });

  const pendingRequest = timelineSummary?.pendingCheckinRequest;

  return (
    <div className="space-y-6">
      {/* 1. Header do Acompanhamento */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                Acompanhamento
              </h3>
              {timelineSummary && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {timelineSummary.totalEventsCount} {timelineSummary.totalEventsCount === 1 ? "registro" : "registros"}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Registros do paciente entre consultas.
            </p>
          </div>

          {canAuthor && (
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              disabled={Boolean(pendingRequest && pendingRequest.derivedState === "PENDING")}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer shadow-xs ${
                pendingRequest && pendingRequest.derivedState === "PENDING"
                  ? "bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-default)] cursor-not-allowed"
                  : "bg-[var(--brand)] text-[var(--text-inverse)] hover:bg-[var(--brand-hover)] active:scale-98"
              }`}
            >
              <span>Solicitar check-in</span>
            </button>
          )}
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            }`}
          >
            <span>{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs font-bold hover:underline cursor-pointer ml-3"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* 2. Banner de Solicitação Pendente (se houver) */}
      {pendingRequest && (
        <div
          className={`border rounded-2xl p-4 sm:p-4.5 shadow-xs transition-all ${
            pendingRequest.derivedState === "EXPIRED"
              ? "bg-amber-500/5 border-amber-500/25"
              : "bg-blue-500/5 border-blue-500/25"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${
                  pendingRequest.derivedState === "EXPIRED"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                }`}
              >
                {pendingRequest.derivedState === "EXPIRED" ? "⏳" : "📬"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {pendingRequest.derivedState === "EXPIRED"
                      ? "Check-in Expirado"
                      : "Solicitação Aguardando Resposta"}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      pendingRequest.derivedState === "EXPIRED"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                    }`}
                  >
                    {pendingRequest.derivedState === "EXPIRED" ? "Expirado" : "Pendente"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {pendingRequest.dueAt ? (
                    <>
                      Prazo até <strong>{formatDate(pendingRequest.dueAt)}</strong>
                    </>
                  ) : (
                    "Sem prazo fixo"
                  )}
                  {pendingRequest.requestedByName && ` • Solicitado por ${pendingRequest.requestedByName}`}
                </p>
              </div>
            </div>

            {canAuthor && pendingRequest.status === "PENDING" && (
              <button
                type="button"
                onClick={() => handleCancelRequest(pendingRequest.requestPublicId)}
                disabled={isPending}
                className="self-stretch sm:self-auto text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-red-500 transition-all cursor-pointer min-h-[38px] flex items-center justify-center"
              >
                Cancelar solicitação
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Barra de Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer whitespace-nowrap ${
            filter === "all"
              ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
              : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Tudo ({allItems.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("meals")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === "meals"
              ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
              : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>📷</span>
          <span>Alimentação ({allItems.filter((i) => i.type === "FOOD_PHOTO").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("checkins")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === "checkins"
              ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
              : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>📋</span>
          <span>Check-ins ({allItems.filter((i) => i.type === "CHECKIN_REQUEST" || i.type === "CHECKIN_RESPONSE").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("notes")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            filter === "notes"
              ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
              : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <span>📝</span>
          <span>Observações ({allItems.filter((i) => i.type === "PATIENT_NOTE").length})</span>
        </button>
      </div>

      {/* 4. Linha do Tempo Clínica (Mais recente -> mais antigo) */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-10 text-center space-y-2">
            <p className="text-xs text-[var(--text-secondary)] animate-pulse">
              Carregando linha do tempo do paciente...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-8 sm:p-12 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-xl">
              🍃
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {allItems.length === 0
                ? "Nenhum acompanhamento registrado ainda."
                : "Nenhum registro para este filtro."}
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              {allItems.length === 0
                ? "Fotos da alimentação, observações e respostas de check-ins aparecerão aqui."
                : "Altere o filtro selecionado acima para visualizar outros registros da linha do tempo."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              if (item.type === "FOOD_PHOTO" && item.payload.kind === "FOOD_PHOTO") {
                const data = item.payload.data;
                const photoUrl = `/api/consultancies/${slug}/nutricao/acompanhamento/fotos/${data.photoEventPublicId}`;

                return (
                  <div
                    key={item.id}
                    className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-[var(--brand)]/40"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span>📷</span>
                          <span>{data.mealTypeLabel || "Alimentação"}</span>
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(item.occurredAt)}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                        Por {item.author.name}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-full sm:w-48 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt="Foto da refeição"
                          className="w-full h-44 object-cover rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setSelectedPhotoPublicId(data.photoEventPublicId)}
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoPublicId(data.photoEventPublicId)}
                          className="mt-1.5 text-[11px] font-bold text-[var(--brand)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>🔍</span>
                          <span>Ampliar foto</span>
                        </button>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        {data.caption ? (
                          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                            <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed italic">
                              &quot;{data.caption}&quot;
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--text-tertiary)] italic">
                            Sem anotações complementares do aluno.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === "PATIENT_NOTE" && item.payload.kind === "PATIENT_NOTE") {
                const data = item.payload.data;

                return (
                  <div
                    key={item.id}
                    className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5 transition-all hover:border-[var(--brand)]/40"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span>📝</span>
                          <span>Observação do Paciente</span>
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(item.occurredAt)}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                        Por {item.author.name}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                      <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-wrap">
                        {data.text}
                      </p>
                    </div>
                  </div>
                );
              }

              if (item.type === "CHECKIN_RESPONSE" && item.payload.kind === "CHECKIN_RESPONSE") {
                const data = item.payload.data;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(data.responsePublicId)}
                    className="bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <span>📋</span>
                          <span>Check-in Respondido</span>
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(item.occurredAt)}
                        </span>
                        {renderAdherenceBadge(data.adherence)}
                        {data.requestsHelp === true && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            <span>⚠️</span>
                            <span>Solicitou contato</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[var(--brand)] group-hover:underline">
                        Ver detalhes →
                      </span>
                    </div>

                    {/* Resumo de métricas preenchidas */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[var(--text-secondary)]">
                      {data.ratings.hunger !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Fome: <strong>{data.ratings.hunger}/5</strong>
                        </span>
                      )}
                      {data.ratings.energy !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Energia: <strong>{data.ratings.energy}/5</strong>
                        </span>
                      )}
                      {data.ratings.sleep !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Sono: <strong>{data.ratings.sleep}/5</strong>
                        </span>
                      )}
                      {data.ratings.training !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Treino: <strong>{data.ratings.training}/5</strong>
                        </span>
                      )}
                      {data.hydrationLiters !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Água: <strong>{data.hydrationLiters} L</strong>
                        </span>
                      )}
                      {data.selfReportedWeightKg !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-blue-600 dark:text-blue-400">
                          Peso informado: <strong>{data.selfReportedWeightKg} kg</strong> (autorrelatado)
                        </span>
                      )}
                    </div>

                    {data.difficultyText && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 italic">
                        &quot;{data.difficultyText}&quot;
                      </p>
                    )}
                  </div>
                );
              }

              if (item.type === "CHECKIN_REQUEST" && item.payload.kind === "CHECKIN_REQUEST") {
                const data = item.payload.data;
                // Only render if not already shown as the primary pending request above
                return (
                  <div
                    key={item.id}
                    className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <span>📬</span>
                          <span>Check-in Solicitado</span>
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDateTime(item.occurredAt)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-tertiary)]">
                        {data.derivedState === "EXPIRED" ? "Expirado" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Solicitado por {data.requestedByName}
                      {data.dueAt && ` • Prazo até ${formatDate(data.dueAt)}`}
                    </p>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* 5. Modal: Ampliar Foto em Alta Resolução */}
      {selectedPhotoPublicId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedPhotoPublicId(null)}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Foto de Refeição
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPhotoPublicId(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center bg-black/20 rounded-2xl overflow-hidden max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/consultancies/${slug}/nutricao/acompanhamento/fotos/${selectedPhotoPublicId}`}
                alt="Foto em alta resolução"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Solicitar Check-in (Fase 7 Preservada) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Solicitar Check-in
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  O aluno receberá uma notificação para responder pelo aplicativo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  Prazo para resposta (opcional):
                </label>
                <input
                  type="date"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
                />
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Se não definido, a solicitação permanecerá aberta até o aluno responder.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs min-h-[44px]"
                >
                  {isSubmittingRequest ? "Solicitando..." : "Solicitar check-in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Detalhes Completos da Resposta do Check-in (Fase 7 Preservada) */}
      {selectedResponsePublicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Respostas do Check-in
                </h3>
                {detailData?.response && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Enviado por {detailData.response.studentName || "Aluno"} em{" "}
                    {formatDateTime(detailData.response.submittedAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedResponsePublicId(null);
                  setDetailData(null);
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingDetail || !detailData || !detailData.response ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)] animate-pulse">
                Carregando detalhes do check-in...
              </div>
            ) : (
              <CheckinResponseModalBody response={detailData.response} renderBadge={renderAdherenceBadge} />
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedResponsePublicId(null);
                  setDetailData(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[44px]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckinResponseModalBody({
  response,
  renderBadge,
}: {
  response: NonNullable<CheckinDetailDto["response"]>;
  renderBadge: (level: CheckinAdherenceLevel | string) => React.ReactNode;
}) {
  return (
    <div className="space-y-5 text-xs">
      {/* 1. Nível de Adesão */}
      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
          Adesão ao Plano Alimentar
        </span>
        <div className="flex items-center gap-2">
          {renderBadge(response.adherence)}
        </div>
      </div>

      {/* 2. Percepções Autorrelatadas */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Percepções Autorrelatadas (1 a 5)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">Fome</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.hungerRating !== null
                ? `${response.hungerRating}/5 (${CHECKIN_RATING_LABELS[response.hungerRating as 1] || ""})`
                : "Não informado"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">Energia</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.energyRating !== null
                ? `${response.energyRating}/5 (${CHECKIN_ENERGY_LABELS[response.energyRating as 1] || ""})`
                : "Não informado"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">Sono</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.sleepRating !== null
                ? `${response.sleepRating}/5 (${CHECKIN_SLEEP_LABELS[response.sleepRating as 1] || ""})`
                : "Não informado"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">Treino</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.trainingRating !== null
                ? `${response.trainingRating}/5 (${CHECKIN_TRAINING_LABELS[response.trainingRating as 1] || ""})`
                : "Não informado"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Métricas Físicas Autorreferidas */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Métricas Físicas Autorreferidas
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">
              Consumo Médio de Água
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.hydrationLiters !== null
                ? `${response.hydrationLiters} L / dia`
                : "Não informado"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] text-[var(--text-secondary)] block">
              Peso Informado pelo Paciente
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {response.selfReportedWeightKg !== null
                ? `${response.selfReportedWeightKg} kg`
                : "Não informado"}
            </span>
            {response.selfReportedWeightKg !== null && (
              <span className="text-[10px] text-[var(--text-tertiary)] block">
                Dado autorreferido — não altera a antropometria clínica oficial.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Relato Textual */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Relato do Aluno
        </h4>
        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
          {response.difficultyText && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Dificuldades enfrentadas:
              </span>
              <p className="text-xs text-[var(--text-primary)] mt-1 whitespace-pre-wrap leading-relaxed">
                {response.difficultyText}
              </p>
            </div>
          )}

          {response.studentNotes && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                Observações gerais:
              </span>
              <p className="text-xs text-[var(--text-primary)] mt-1 whitespace-pre-wrap leading-relaxed">
                {response.studentNotes}
              </p>
            </div>
          )}

          {!response.difficultyText && !response.studentNotes && (
            <p className="text-xs text-[var(--text-secondary)] italic">
              Nenhum relato textual foi adicionado pelo aluno.
            </p>
          )}
        </div>
      </div>

      {/* 5. Solicitação de Contato */}
      {response.requestsHelp !== null && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
            response.requestsHelp
              ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold"
              : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <span>{response.requestsHelp ? "⚠️" : "✓"}</span>
          <span>
            {response.requestsHelp
              ? "O aluno solicitou contato/ajuda do profissional neste check-in."
              : "O aluno não solicitou contato especial nesta resposta."}
          </span>
        </div>
      )}
    </div>
  );
}
