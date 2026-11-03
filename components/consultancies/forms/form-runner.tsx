"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type {
  ConsultancyFormAssignmentDto,
  FormQuestionDefinition,
} from "@/lib/consultancies/forms";
import { submitFormResponsesAction } from "@/app/consultoria/[slug]/formularios/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface FormRunnerProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  assignment: ConsultancyFormAssignmentDto;
  onSuccess: () => void;
}

export function FormRunner({
  isOpen,
  onClose,
  consultancySlug,
  assignment,
  onSuccess,
}: FormRunnerProps) {
  const isMounted = useIsMounted();
  const draftKey = `trevo_form_draft_${assignment.publicId}`;
  const isReadOnly = assignment.status === "REVIEWED" || assignment.status === "SUBMITTED";

  const [responses, setResponses] = useState<Record<string, unknown>>(() => {
    if (assignment.responses) return assignment.responses;
    if (assignment.status === "PENDING" && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      } catch {
        // Local storage inaccessible
      }
    }
    return {};
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);
  const [isSubmitting, startTransition] = useTransition();

  // Autosave draft to localStorage
  function handleSaveDraftLocally(currentData: Record<string, unknown>) {
    if (isReadOnly || typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(currentData));
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2000);
    } catch {
      // Storage full
    }
  }

  function handleUpdateAnswer(qId: string, value: unknown) {
    if (isReadOnly) return;
    setResponses((prev) => {
      const next = { ...prev, [qId]: value };
      handleSaveDraftLocally(next);
      return next;
    });

    if (fieldErrors[qId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  }

  function handleToggleMultipleChoice(qId: string, optionLabel: string) {
    if (isReadOnly) return;
    setResponses((prev) => {
      const current = Array.isArray(prev[qId]) ? (prev[qId] as string[]) : [];
      const exists = current.includes(optionLabel);
      const updated = exists ? current.filter((x) => x !== optionLabel) : [...current, optionLabel];
      const next = { ...prev, [qId]: updated };
      handleSaveDraftLocally(next);
      return next;
    });

    if (fieldErrors[qId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const questions = assignment.questions || [];

    for (const q of questions) {
      if (q.required) {
        const val = responses[q.id];
        if (val === undefined || val === null || val === "") {
          errors[q.id] = "Esta pergunta é obrigatória.";
        } else if (q.type === "MULTIPLE_CHOICE" && Array.isArray(val) && val.length === 0) {
          errors[q.id] = "Selecione ao menos uma opção.";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (isReadOnly) return;
    if (!validate()) {
      setGlobalError("Por favor, preencha todas as perguntas obrigatórias marcadas com *.");
      return;
    }

    setGlobalError(null);

    startTransition(async () => {
      try {
        const res = await submitFormResponsesAction(consultancySlug, assignment.publicId, responses);
        if (!res.success) {
          setGlobalError(res.error || "Erro ao enviar respostas.");
          return;
        }

        // Clean local draft
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }

        setIsSubmittedSuccess(true);
        onSuccess();
      } catch (err: unknown) {
        setGlobalError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    });
  }

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-[#151619] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden m-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-runner-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white dark:bg-[#151619]">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                {isReadOnly ? "Visualização de Formulário" : "Preenchimento de Formulário"}
              </span>
              {draftSavedToast && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full animate-in fade-in">
                  Rascunho salvo
                </span>
              )}
            </div>
            <h2
              id="form-runner-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5"
            >
              {assignment.formTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isSubmittedSuccess ? (
            <div className="p-8 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Respostas Enviadas com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Seu treinador foi notificado e revisará as suas respostas em breve.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md hover:bg-emerald-600 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              {globalError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {globalError}
                </div>
              )}

              {/* REVIEWER NOTES BANNER IF CHANGES WERE REQUESTED */}
              {assignment.reviewerNotes && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 block">
                    Observações do Treinador:
                  </span>
                  <p className="text-amber-700 dark:text-amber-200">
                    {assignment.reviewerNotes}
                  </p>
                </div>
              )}

              {/* FORM DESCRIPTION */}
              {assignment.formDescription && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-300">
                  {assignment.formDescription}
                </div>
              )}

              {/* QUESTIONS LIST */}
              <div className="space-y-4">
                {(assignment.questions || []).map((q: FormQuestionDefinition, idx: number) => {
                  const val = responses[q.id];
                  const hasError = Boolean(fieldErrors[q.id]);

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1a1c20] border transition-all space-y-3.5 ${
                        hasError
                          ? "border-rose-500/60 ring-1 ring-rose-500/20"
                          : "border-slate-200 dark:border-white/10 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <label className="text-sm sm:text-xs font-bold text-slate-900 dark:text-white block leading-snug">
                            {q.title} {q.required && <span className="text-rose-500">*</span>}
                          </label>
                          {q.description && (
                            <span className="text-xs sm:text-[11px] text-slate-400 block mt-0.5">
                              {q.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* QUESTION COMPONENT */}
                      <div className="pl-0 sm:pl-7 pt-1">
                        {/* 1. SHORT_TEXT */}
                        {q.type === "SHORT_TEXT" && (
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={typeof val === "string" ? val : ""}
                            onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                            placeholder={q.placeholder || "Digite sua resposta..."}
                            className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 min-h-[48px]"
                          />
                        )}

                        {/* 2. LONG_TEXT */}
                        {q.type === "LONG_TEXT" && (
                          <textarea
                            disabled={isReadOnly}
                            rows={3}
                            value={typeof val === "string" ? val : ""}
                            onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                            placeholder={q.placeholder || "Descreva em detalhes..."}
                            className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 min-h-[96px]"
                          />
                        )}

                        {/* 3. SINGLE_CHOICE */}
                        {q.type === "SINGLE_CHOICE" && (
                          <div className="space-y-2">
                            {(q.options || []).map((opt) => {
                              const isChecked = val === opt.label;
                              return (
                                <button
                                  type="button"
                                  key={opt.id}
                                  disabled={isReadOnly}
                                  onClick={() => handleUpdateAnswer(q.id, opt.label)}
                                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all min-h-[48px] ${
                                    isReadOnly ? "cursor-default" : "cursor-pointer"
                                  } ${
                                    isChecked
                                      ? "bg-emerald-500/10 border-emerald-500/50 text-slate-900 dark:text-white font-semibold"
                                      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <span className="text-sm sm:text-xs">{opt.label}</span>
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-slate-300 dark:border-white/20"
                                    }`}
                                  >
                                    {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* 4. MULTIPLE_CHOICE */}
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="space-y-2">
                            {(q.options || []).map((opt) => {
                              const isChecked = Array.isArray(val) && val.includes(opt.label);
                              return (
                                <button
                                  type="button"
                                  key={opt.id}
                                  disabled={isReadOnly}
                                  onClick={() => handleToggleMultipleChoice(q.id, opt.label)}
                                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all min-h-[48px] ${
                                    isReadOnly ? "cursor-default" : "cursor-pointer"
                                  } ${
                                    isChecked
                                      ? "bg-emerald-500/10 border-emerald-500/50 text-slate-900 dark:text-white font-semibold"
                                      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <span className="text-sm sm:text-xs">{opt.label}</span>
                                  <div
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                      isChecked
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-slate-300 dark:border-white/20"
                                    }`}
                                  >
                                    {isChecked && (
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* 5. SCALE (0-10) */}
                        {q.type === "SCALE" && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 no-scrollbar">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                                const isSelected = val === score;
                                return (
                                  <button
                                    type="button"
                                    key={score}
                                    disabled={isReadOnly}
                                    onClick={() => handleUpdateAnswer(q.id, score)}
                                    className={`flex-1 min-w-[30px] h-11 sm:h-9 rounded-lg text-sm sm:text-xs font-bold transition-all ${
                                      isReadOnly ? "cursor-default" : "cursor-pointer"
                                    } ${
                                      isSelected
                                        ? "bg-emerald-500 text-white shadow-xs scale-105"
                                        : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/20"
                                    }`}
                                  >
                                    {score}
                                  </button>
                                );
                              })}
                            </div>

                            {(q.scaleMinLabel || q.scaleMaxLabel) && (
                              <div className="flex items-center justify-between text-xs sm:text-[11px] text-slate-400 font-medium px-1">
                                <span>{q.scaleMinLabel || "0"}</span>
                                <span>{q.scaleMaxLabel || "10"}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6. DATE */}
                        {q.type === "DATE" && (
                          <input
                            type="date"
                            disabled={isReadOnly}
                            value={typeof val === "string" ? val : ""}
                            onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                            className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 min-h-[48px]"
                          />
                        )}

                        {/* 7. FILE_UPLOAD */}
                        {q.type === "FILE_UPLOAD" && (
                          <div>
                            {isReadOnly ? (
                              val ? (
                                <span className="text-xs text-emerald-500 font-semibold underline">
                                  Anexo enviado
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Nenhum anexo</span>
                              )
                            ) : (
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUpdateAnswer(q.id, {
                                      name: file.name,
                                      size: file.size,
                                      type: file.type,
                                    });
                                  }
                                }}
                                className="w-full text-sm sm:text-xs text-slate-500 dark:text-zinc-400 file:mr-3 file:py-3 sm:file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm sm:file:text-xs file:font-bold file:bg-emerald-500/10 file:text-emerald-600 dark:file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer min-h-[48px]"
                              />
                            )}
                          </div>
                        )}

                        {hasError && (
                          <p className="text-xs text-rose-500 font-semibold mt-1.5">
                            {fieldErrors[q.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* STICKY FOOTER (EMPILHADO EM MOBILE COM AÇÃO PRIMÁRIA NO TOPO) */}
        {!isSubmittedSuccess && (
          <div className="sticky bottom-0 shrink-0 bg-white/95 dark:bg-[#151619]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 z-10">
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:order-2 px-6 py-3 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{isSubmitting ? "Enviando Respostas..." : "Enviar Respostas"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:order-1 px-4 py-3 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-sm sm:text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer min-h-[48px] flex items-center justify-center whitespace-nowrap"
            >
              {isReadOnly ? "Fechar" : "Cancelar"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
