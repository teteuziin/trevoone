"use client";

import React, { useState, useEffect, useTransition } from "react";
import type {
  PreQuestionnaireDto,
  PreQuestionnaireDiffComparisonItem,
  ReviewPreQuestionnaireDiffItemDecision,
} from "@/lib/nutrition-v2/pre-questionnaire-types";
import {
  computePreQuestionnaireDiffAction,
  reviewPreQuestionnaireDiffAction,
} from "@/app/consultoria/[slug]/planos-v2/pre-questionnaire-actions";

interface ReviewPreQuestionnaireDiffModalProps {
  slug: string;
  questionnairePublicId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewPreQuestionnaireDiffModal({
  slug,
  questionnairePublicId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewPreQuestionnaireDiffModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [questionnaire, setQuestionnaire] = useState<PreQuestionnaireDto | null>(null);
  const [diffItems, setDiffItems] = useState<PreQuestionnaireDiffComparisonItem[]>([]);
  const [acceptedQuestionIds, setAcceptedQuestionIds] = useState<Set<string>>(new Set());
  const [reviewerNotes, setReviewerNotes] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !questionnairePublicId) return;

    let isMounted = true;

    computePreQuestionnaireDiffAction(slug, questionnairePublicId).then((res) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (res.success && res.data) {
        setQuestionnaire(res.data.questionnaire);
        setDiffItems(res.data.diffItems);

        // Pre-select items that are different and can be accepted
        const preSelected = new Set(
          res.data.diffItems
            .filter((item) => item.isDifferent && item.canAccept)
            .map((item) => item.questionId)
        );
        setAcceptedQuestionIds(preSelected);
      } else {
        setError(res.error || "Erro ao carregar comparação de respostas.");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, questionnairePublicId, slug]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsLoading(true);
    setQuestionnaire(null);
    setDiffItems([]);
    setError(null);
    onClose();
  };

  const toggleAccept = (questionId: string) => {
    setAcceptedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const selectAllDifferences = () => {
    setAcceptedQuestionIds(
      new Set(diffItems.filter((i) => i.isDifferent && i.canAccept).map((i) => i.questionId))
    );
  };

  const deselectAll = () => {
    setAcceptedQuestionIds(new Set());
  };

  const handleApply = (acceptAny: boolean) => {
    if (!questionnaire) return;
    setError(null);

    const decisions: ReviewPreQuestionnaireDiffItemDecision[] = diffItems
      .filter((item) => item.targetField !== null)
      .map((item) => ({
        questionId: item.questionId,
        targetField: item.targetField!,
        accept: acceptAny && acceptedQuestionIds.has(item.questionId),
        valueToApply: item.newValue,
      }));

    startTransition(async () => {
      const res = await reviewPreQuestionnaireDiffAction(slug, {
        publicId: questionnairePublicId,
        decisions,
        reviewerNotes,
      });

      if (res.success) {
        onSuccess();
        handleClose();
      } else {
        setError(res.error || "Erro ao aplicar revisão.");
      }
    });
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-diff-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--surface-subtle)]">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Revisão Clínica &amp; Comparação Diff
            </span>
            <h2 id="review-diff-title" className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] truncate">
              {questionnaire?.title || "Respostas do Pré-Questionário"}
            </h2>
            {questionnaire && (
              <p className="text-xs text-[var(--text-secondary)]">
                Paciente: <strong className="text-[var(--text-primary)]">{questionnaire.studentName}</strong> • Submetido em: {formatDate(questionnaire.submittedAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[40px] min-w-[40px]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Clinical Safety Disclaimer */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 space-y-1 text-xs">
            <div className="font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Controle de Integridade &amp; Não Sobrescrita Automática</span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Você pode aceitar as respostas individualmente ou em conjunto. As respostas aceitas serão integradas ao <strong>Registro Geral</strong> com proveniência <em>Relatado pelo paciente</em> e registradas na trilha de auditoria. Diagnósticos médicos e observações clínicas confidenciais nunca são alterados.
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Comparando respostas com os dados atuais do prontuário...
              </p>
            </div>
          ) : (
            <>
              {/* Batch Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="font-bold text-[var(--text-primary)]">
                    {acceptedQuestionIds.size} campo(s) selecionado(s) para atualização
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllDifferences}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Aceitar todas as alterações
                  </button>
                  <span className="text-zinc-400">•</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs font-bold text-[var(--text-tertiary)] hover:underline cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Diff Comparison Table */}
              <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">Aceitar</th>
                        <th className="p-3 w-1/3">Pergunta / Informação</th>
                        <th className="p-3 w-1/3">Dado Atual no Prontuário</th>
                        <th className="p-3 w-1/3">Nova Resposta do Paciente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {diffItems.map((item) => {
                        const isAccepted = acceptedQuestionIds.has(item.questionId);

                        return (
                          <tr
                            key={item.questionId}
                            className={`transition-colors ${
                              isAccepted
                                ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                : item.isDifferent
                                ? "bg-amber-500/5 hover:bg-amber-500/10"
                                : "hover:bg-[var(--surface-subtle)]/50"
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center align-top">
                              {item.canAccept ? (
                                <input
                                  type="checkbox"
                                  checked={isAccepted}
                                  onChange={() => toggleAccept(item.questionId)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer mt-0.5"
                                  aria-label={`Aceitar resposta de ${item.questionTitle}`}
                                />
                              ) : (
                                <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                              )}
                            </td>

                            {/* Question Title & Notice */}
                            <td className="p-3 align-top space-y-1">
                              <span className="font-bold text-[var(--text-primary)] block">
                                {item.questionTitle}
                              </span>
                              {item.clinicalNotice && (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 block bg-amber-500/10 p-1 rounded-md">
                                  ⚠️ {item.clinicalNotice}
                                </span>
                              )}
                            </td>

                            {/* Current Record Value */}
                            <td className="p-3 align-top space-y-1">
                              {item.currentValue ? (
                                <div className="space-y-0.5">
                                  <span className="text-[var(--text-primary)] block leading-relaxed whitespace-pre-wrap">
                                    {item.currentValue}
                                  </span>
                                  {item.currentProvenanceLabel && (
                                    <span className="inline-block text-[10px] font-semibold text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded">
                                      {item.currentProvenanceLabel}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--text-tertiary)] italic">
                                  Não informado
                                </span>
                              )}
                            </td>

                            {/* New Value Reported */}
                            <td className="p-3 align-top space-y-1">
                              {item.newValue ? (
                                <div className="space-y-1">
                                  <span className={`block leading-relaxed whitespace-pre-wrap font-medium ${
                                    item.isDifferent ? "text-emerald-700 dark:text-emerald-300 font-bold" : "text-[var(--text-primary)]"
                                  }`}>
                                    {item.newValue}
                                  </span>
                                  {item.isDifferent && (
                                    <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                      Alteração detectada
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--text-tertiary)] italic">
                                  Em branco
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Optional Reviewer Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  Anotações da revisão do profissional (opcional):
                </label>
                <textarea
                  rows={2}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Ex: Respostas conferidas antes da consulta. Ajustado histórico de hidratação..."
                  className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-3 bg-[var(--surface-subtle)] shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[44px]"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={isPending || isLoading}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-colors min-h-[44px] cursor-pointer"
            >
              Manter Apenas no Histórico
            </button>

            <button
              type="button"
              onClick={() => handleApply(true)}
              disabled={isPending || isLoading || acceptedQuestionIds.size === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer inline-flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <span>Aceitar Selecionadas e Atualizar Prontuário</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
