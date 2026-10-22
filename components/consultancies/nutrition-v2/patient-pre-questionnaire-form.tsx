"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import Link from "next/link";
import type {
  PreQuestionnaireDto,
  PreQuestionnaireQuestionConfig,
} from "@/lib/nutrition-v2/pre-questionnaire-types";
import { PRE_QUESTIONNAIRE_CATEGORY_LABELS } from "@/lib/nutrition-v2/pre-questionnaire-types";
import {
  savePreQuestionnaireDraftAction,
  submitPreQuestionnaireResponsesAction,
} from "@/app/consultoria/[slug]/planos-v2/pre-questionnaire-actions";

interface PatientPreQuestionnaireFormProps {
  slug: string;
  initialQuestionnaire: PreQuestionnaireDto;
  isStudentViewer: boolean;
}

export function PatientPreQuestionnaireForm({
  slug,
  initialQuestionnaire,
  isStudentViewer,
}: PatientPreQuestionnaireFormProps) {
  const [questionnaire, setQuestionnaire] = useState<PreQuestionnaireDto>(initialQuestionnaire);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Active responses state initialized from draftResponses or responses
  const [responses, setResponses] = useState<Record<string, unknown>>(() => {
    return questionnaire.responses || questionnaire.draftResponses || {};
  });

  // Autosave state
  const [autosaveState, setAutosaveState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = useState<boolean>(
    questionnaire.status === "ANSWERED" || questionnaire.status === "REVIEWED"
  );
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestResponsesRef = useRef(responses);
  useEffect(() => {
    latestResponsesRef.current = responses;
  }, [responses]);

  const isReadOnly =
    questionnaire.status === "ANSWERED" ||
    questionnaire.status === "REVIEWED" ||
    questionnaire.status === "CANCELLED" ||
    !isStudentViewer;

  // Debounced Autosave function
  const triggerAutosave = useCallback(
    (newResponses: Record<string, unknown>) => {
      if (isReadOnly) return;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      setAutosaveState("SAVING");

      debounceTimerRef.current = setTimeout(async () => {
        const res = await savePreQuestionnaireDraftAction(slug, {
          publicId: questionnaire.publicId,
          responses: newResponses,
        });

        if (res.success) {
          setAutosaveState("SAVED");
        } else {
          setAutosaveState("ERROR");
        }
      }, 1000);
    },
    [isReadOnly, questionnaire.publicId, slug]
  );

  const updateResponse = (questionId: string, value: unknown) => {
    if (isReadOnly) return;
    setResponses((prev) => {
      const next = { ...prev, [questionId]: value };
      triggerAutosave(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Group questions by category
  const categories = React.useMemo(() => {
    const cats = new Set(questionnaire.questions.map((q) => q.category));
    return Array.from(cats);
  }, [questionnaire.questions]);

  // Check if a conditional question should be displayed
  const isQuestionVisible = (q: PreQuestionnaireQuestionConfig): boolean => {
    if (!q.conditionalOn) return true;
    const parentVal = String(responses[q.conditionalOn.parentQuestionId] || "").trim();
    return q.conditionalOn.expectedValues.includes(parentVal);
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    // Validate required questions
    for (const q of questionnaire.questions) {
      if (!q.required) continue;
      if (!isQuestionVisible(q)) continue;

      const val = responses[q.id];
      const isBlank = val === null || val === undefined || String(val).trim() === "";
      if (isBlank) {
        setErrorMessage(`Por favor, responda à pergunta obrigatória: "${q.title}"`);
        setIsReviewMode(false);
        return;
      }
    }

    startSubmitTransition(async () => {
      const res = await submitPreQuestionnaireResponsesAction(slug, {
        publicId: questionnaire.publicId,
        responses,
      });

      if (res.success && res.data) {
        setQuestionnaire(res.data);
        setSuccessSubmitted(true);
        setIsReviewMode(false);
      } else {
        setErrorMessage(res.error || "Erro ao enviar respostas.");
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
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Top Breadcrumb & Autosave Indicator */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/consultoria/${slug}/nutricao`}
          className="text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 min-h-[36px]"
        >
          <span>← Voltar para nutrição</span>
        </Link>

        {!isReadOnly && (
          <div className="flex items-center gap-2 text-xs font-semibold">
            {autosaveState === "SAVING" && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Salvando rascunho...</span>
              </span>
            )}
            {autosaveState === "SAVED" && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Rascunho salvo</span>
              </span>
            )}
            {autosaveState === "ERROR" && (
              <span className="text-destructive flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <span>Erro ao salvar rascunho</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            Pré-Consulta Nutricional
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
            questionnaire.status === "ANSWERED" || questionnaire.status === "REVIEWED"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}>
            {questionnaire.statusLabel}
          </span>
        </div>

        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          {questionnaire.title}
        </h1>

        <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-1 border-t border-[var(--border-subtle)]">
          <p>
            Solicitado por <strong className="text-[var(--text-primary)]">{questionnaire.requestedByName}</strong>
            {questionnaire.sentAt && ` em ${formatDate(questionnaire.sentAt)}`}
          </p>
          {questionnaire.consultationDate && (
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              📅 Vinculado à sua consulta agendada para: {formatDate(questionnaire.consultationDate)}
            </p>
          )}
        </div>

        {questionnaire.instructions && (
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
            {questionnaire.instructions}
          </div>
        )}
      </div>

      {/* Success Banner if already submitted */}
      {successSubmitted && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-2 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
            Pré-Questionário Enviado com Sucesso!
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
            Suas respostas foram persistidas de forma segura e enviadas à nutricionista para preparar sua consulta e plano alimentar.
          </p>
          <div className="pt-2">
            <Link
              href={`/consultoria/${slug}/nutricao`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px]"
            >
              <span>Ir para meus planos</span>
            </Link>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Main Answering / Review Form */}
      {!successSubmitted && (
        <div className="space-y-6">
          {isReviewMode ? (
            /* REVIEW MODE: Confirmation Screen prior to final submit */
            <div className="p-6 sm:p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Etapa de Revisão
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                  Confira suas respostas antes de enviar
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Verifique se todas as informações estão corretas. Você ainda pode editar antes de enviar.
                </p>
              </div>

              <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                {questionnaire.questions.map((q) => {
                  if (!isQuestionVisible(q)) return null;
                  const val = responses[q.id];

                  return (
                    <div key={q.id} className="py-3.5 space-y-1">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                        {q.title}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] whitespace-pre-wrap">
                        {val ? String(val) : <em className="text-[var(--text-tertiary)]">Não informado</em>}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewMode(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] min-h-[44px]"
                >
                  ← Voltar e Editar
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirmando envio...</span>
                    </>
                  ) : (
                    <span>Confirmar e Enviar à Nutricionista</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* QUESTIONS SECTION BY CATEGORY */
            <div className="space-y-6">
              {categories.map((cat) => {
                const questionsInCat = questionnaire.questions.filter((q) => q.category === cat);
                if (questionsInCat.length === 0) return null;

                return (
                  <div
                    key={cat}
                    className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-5"
                  >
                    <h2 className="font-heading text-sm sm:text-base font-extrabold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2.5">
                      {PRE_QUESTIONNAIRE_CATEGORY_LABELS[cat]}
                    </h2>

                    <div className="space-y-5">
                      {questionsInCat.map((q) => {
                        if (!isQuestionVisible(q)) return null;
                        const currentVal = responses[q.id];

                        return (
                          <div key={q.id} className="space-y-2">
                            <label className="block space-y-0.5">
                              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] block leading-snug">
                                {q.title}
                                {q.required && <span className="text-rose-500 ml-1">*</span>}
                              </span>
                              {q.description && (
                                <span className="text-[11px] text-[var(--text-secondary)] block">
                                  {q.description}
                                </span>
                              )}
                            </label>

                            {/* Render according to fieldType */}
                            {q.fieldType === "TEXT" && (
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ""}
                                onChange={(e) => updateResponse(q.id, e.target.value)}
                                placeholder={q.placeholder || "Digite sua resposta..."}
                                className="w-full text-base sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 min-h-[44px]"
                              />
                            )}

                            {q.fieldType === "TEXTAREA" && (
                              <textarea
                                rows={3}
                                disabled={isReadOnly}
                                value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ""}
                                onChange={(e) => updateResponse(q.id, e.target.value)}
                                placeholder={q.placeholder || "Escreva aqui detalhadamente..."}
                                className="w-full text-base sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 leading-relaxed"
                              />
                            )}

                            {q.fieldType === "NUMBER" && (
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ""}
                                onChange={(e) => updateResponse(q.id, e.target.value ? Number(e.target.value) : null)}
                                placeholder={q.placeholder || "0"}
                                className="w-full sm:w-48 text-base sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 min-h-[44px]"
                              />
                            )}

                            {q.fieldType === "RADIO" && q.options && (
                              <div className="space-y-2 pt-1">
                                {q.options.map((opt) => {
                                  const isChecked = currentVal === opt.value;
                                  return (
                                    <label
                                      key={opt.value}
                                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors min-h-[44px] ${
                                        isChecked
                                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-bold"
                                          : "bg-[var(--surface-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={q.id}
                                        disabled={isReadOnly}
                                        value={opt.value}
                                        checked={isChecked}
                                        onChange={() => updateResponse(q.id, opt.value)}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <span className="text-xs sm:text-sm">{opt.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* Neutral / Opt-out option helper */}
                            {!q.required && !q.options && !isReadOnly && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => updateResponse(q.id, "Não sei informar")}
                                  className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline"
                                >
                                  Não sei informar
                                </button>
                                <span className="text-zinc-400 text-[10px]">•</span>
                                <button
                                  type="button"
                                  onClick={() => updateResponse(q.id, "Prefiro não responder")}
                                  className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline"
                                >
                                  Prefiro não responder
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Action Bar */}
              {!isReadOnly && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex items-center justify-between gap-4">
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    Progresso salvo automaticamente
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setIsReviewMode(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Revisar e Enviar Respostas →</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
