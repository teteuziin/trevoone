"use client";

import React, { useState, useTransition, useEffect } from "react";
import type {
  CheckinDetailDto,
  PatientCheckinsHubSummaryDto,
  CheckinAdherenceLevel,
} from "@/lib/nutrition-v2/checkin-types";
import {
  CHECKIN_ADHERENCE_LABELS,
  CHECKIN_RATING_LABELS,
  CHECKIN_ENERGY_LABELS,
  CHECKIN_SLEEP_LABELS,
  CHECKIN_TRAINING_LABELS,
} from "@/lib/nutrition-v2/checkin-types";
import {
  createCheckinRequestAction,
  cancelCheckinRequestAction,
  getPatientCheckinsHubAction,
  getCheckinDetailAction,
} from "@/app/consultoria/[slug]/planos-v2/checkin-actions";

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
  initialSummary = null,
}: PatientCheckinsTabProps) {
  const [summary, setSummary] = useState<PatientCheckinsHubSummaryDto | null>(initialSummary);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [selectedResponsePublicId, setSelectedResponsePublicId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CheckinDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!initialSummary) {
      let isMounted = true;
      getPatientCheckinsHubAction(slug, studentPublicId).then((res) => {
        if (isMounted && res.success) {
          setSummary(res.data);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [slug, studentPublicId, initialSummary]);

  function loadSummary() {
    startTransition(async () => {
      const res = await getPatientCheckinsHubAction(slug, studentPublicId);
      if (res.success) {
        setSummary(res.data);
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
      loadSummary();
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
        loadSummary();
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

  function renderAdherenceBadge(level: CheckinAdherenceLevel) {
    switch (level) {
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Adesão Alta
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Adesão Moderada
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Adesão Baixa
          </span>
        );
      default:
        return null;
    }
  }

  const pending = summary?.pendingRequest;
  const recentResponses = summary?.recentResponses || [];

  return (
    <div className="space-y-6">
      {/* Header com resumo compacto e CTA */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                Acompanhamento de Check-ins
              </h3>
              {summary && summary.totalCompletedCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {summary.totalCompletedCount} {summary.totalCompletedCount === 1 ? "resposta" : "respostas"}
                </span>
              )}
              {summary && summary.requestsHelpCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <span>⚠️</span>
                  <span>Solicitou contato</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Registro temporal de adesão e percepções autorrelatadas pelo aluno entre consultas.
            </p>
          </div>

          {canAuthor && (
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              disabled={Boolean(pending && pending.derivedState === "PENDING")}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer shadow-xs ${
                pending && pending.derivedState === "PENDING"
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

      {/* Card de Solicitação Pendente (se houver) */}
      {pending && (
        <div
          className={`border rounded-2xl p-4 sm:p-4.5 shadow-xs transition-all ${
            pending.derivedState === "EXPIRED"
              ? "bg-amber-500/5 border-amber-500/25"
              : "bg-blue-500/5 border-blue-500/25"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${
                  pending.derivedState === "EXPIRED"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                }`}
              >
                {pending.derivedState === "EXPIRED" ? "⏳" : "📬"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {pending.derivedState === "EXPIRED"
                      ? "Check-in Expirado"
                      : "Solicitação Aguardando Resposta"}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      pending.derivedState === "EXPIRED"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                    }`}
                  >
                    {pending.derivedState === "EXPIRED" ? "Expirado" : "Pendente"}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Solicitado em <strong>{formatDate(pending.requestedAt)}</strong>
                  {pending.dueAt && (
                    <>
                      {" "}
                      • Prazo até <strong>{formatDate(pending.dueAt)}</strong>
                    </>
                  )}
                  {pending.requestedByName && ` por ${pending.requestedByName}`}
                </p>
              </div>
            </div>

            {canAuthor && pending.status === "PENDING" && (
              <button
                type="button"
                onClick={() => handleCancelRequest(pending.publicId)}
                disabled={isPending}
                className="self-stretch sm:self-auto text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-red-500 transition-all cursor-pointer min-h-[38px] flex items-center justify-center"
              >
                Cancelar solicitação
              </button>
            )}
          </div>
        </div>
      )}

      {/* Histórico Cronológico de Respostas */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
          Histórico de Respostas ({recentResponses.length})
        </h4>

        {recentResponses.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Nenhum check-in respondido ainda
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Quando a nutricionista solicitar e o aluno responder pelo aplicativo, as respostas
              ficarão registradas cronologicamente aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentResponses.map((item) => (
              <div
                key={item.publicId}
                onClick={() => handleOpenDetail(item.publicId)}
                className="bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] rounded-2xl p-4 shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {formatDate(item.submittedAt)}
                      </span>
                      {renderAdherenceBadge(item.adherence)}
                      {item.requestsHelp === true && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <span>⚠️</span>
                          <span>Solicitou contato</span>
                        </span>
                      )}
                    </div>

                    {/* Resumo de métricas preenchidas */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[var(--text-secondary)]">
                      {item.hungerRating !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Fome: <strong>{item.hungerRating}/5</strong>
                        </span>
                      )}
                      {item.energyRating !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Energia: <strong>{item.energyRating}/5</strong>
                        </span>
                      )}
                      {item.sleepRating !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Sono: <strong>{item.sleepRating}/5</strong>
                        </span>
                      )}
                      {item.hydrationLiters !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Água: <strong>{item.hydrationLiters} L</strong>
                        </span>
                      )}
                      {item.selfReportedWeightKg !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px]">
                          Peso informado: <strong>{item.selfReportedWeightKg} kg</strong>
                        </span>
                      )}
                    </div>

                    {/* Dificuldade ou notas curtas se houver */}
                    {item.difficultyText && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 italic pt-0.5">
                        &quot;{item.difficultyText}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-xs font-semibold text-[var(--brand)] group-hover:underline">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Solicitar Check-in */}
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

      {/* Modal: Detalhe do Check-in */}
      {selectedResponsePublicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Detalhes do Check-in
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {detailData
                    ? `Enviado em ${formatDateTime(detailData.response?.submittedAt)}`
                    : "Carregando detalhes..."}
                </p>
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

            {isLoadingDetail || !detailData?.response ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                Carregando informações...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alerta de solicitação de ajuda */}
                {detailData.response.requestsHelp === true && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span className="text-base">⚠️</span>
                    <span>O aluno solicitou contato da nutricionista antes do próximo retorno.</span>
                  </div>
                )}

                {/* Grade de Percepções & Métricas */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Adesão ao plano
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {CHECKIN_ADHERENCE_LABELS[detailData.response.adherence]}
                      </span>
                      {detailData.previousResponseSummary && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          (ant: {CHECKIN_ADHERENCE_LABELS[detailData.previousResponseSummary.adherence]})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Fome percebida
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {detailData.response.hungerRating !== null
                          ? `${detailData.response.hungerRating}/5 (${CHECKIN_RATING_LABELS[detailData.response.hungerRating]})`
                          : "Não informado"}
                      </span>
                      {detailData.previousResponseSummary &&
                        detailData.previousResponseSummary.hungerRating !== null &&
                        detailData.response.hungerRating !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            (ant: {detailData.previousResponseSummary.hungerRating}/5)
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Disposição / Energia
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {detailData.response.energyRating !== null
                          ? `${detailData.response.energyRating}/5 (${CHECKIN_ENERGY_LABELS[detailData.response.energyRating]})`
                          : "Não informado"}
                      </span>
                      {detailData.previousResponseSummary &&
                        detailData.previousResponseSummary.energyRating !== null &&
                        detailData.response.energyRating !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            (ant: {detailData.previousResponseSummary.energyRating}/5)
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Qualidade do sono
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {detailData.response.sleepRating !== null
                          ? `${detailData.response.sleepRating}/5 (${CHECKIN_SLEEP_LABELS[detailData.response.sleepRating]})`
                          : "Não informado"}
                      </span>
                      {detailData.previousResponseSummary &&
                        detailData.previousResponseSummary.sleepRating !== null &&
                        detailData.response.sleepRating !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            (ant: {detailData.previousResponseSummary.sleepRating}/5)
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Rotina de treinos
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {detailData.response.trainingRating !== null
                          ? `${detailData.response.trainingRating}/5 (${CHECKIN_TRAINING_LABELS[detailData.response.trainingRating]})`
                          : "Não informado"}
                      </span>
                      {detailData.previousResponseSummary &&
                        detailData.previousResponseSummary.trainingRating !== null &&
                        detailData.response.trainingRating !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            (ant: {detailData.previousResponseSummary.trainingRating}/5)
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Hidratação
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {detailData.response.hydrationLiters !== null
                          ? `${detailData.response.hydrationLiters} L / dia`
                          : "Não informado"}
                      </span>
                      {detailData.previousResponseSummary &&
                        detailData.previousResponseSummary.hydrationLiters !== null &&
                        detailData.response.hydrationLiters !== null && (
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            (ant: {detailData.previousResponseSummary.hydrationLiters} L)
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* Peso Autorreferido (preservação estrita da origem) */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                    Peso informado pelo aluno (autorrelato):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">
                      {detailData.response.selfReportedWeightKg !== null
                        ? `${detailData.response.selfReportedWeightKg} kg`
                        : "Não informado"}
                    </span>
                    {detailData.previousResponseSummary &&
                      detailData.previousResponseSummary.selfReportedWeightKg !== null &&
                      detailData.response.selfReportedWeightKg !== null && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          (ant: {detailData.previousResponseSummary.selfReportedWeightKg} kg)
                        </span>
                      )}
                  </div>
                  <p className="text-[10px] text-[var(--text-tertiary)] pt-0.5">
                    * Registro autorreferido pelo aluno. Não substitui a medição antropométrica clínica oficial.
                  </p>
                </div>

                {/* Dificuldade */}
                {detailData.response.difficultyText && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Principal dificuldade relatada:
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                      {detailData.response.difficultyText}
                    </p>
                  </div>
                )}

                {/* Observações do aluno */}
                {detailData.response.studentNotes && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium block">
                      Observações adicionais do aluno:
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                      {detailData.response.studentNotes}
                    </p>
                  </div>
                )}

                {/* Footer do modal */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResponsePublicId(null);
                      setDetailData(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
