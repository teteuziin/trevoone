"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type {
  ConsultancyFormAssignmentDto,
  FormQuestionDefinition,
} from "@/lib/consultancies/forms";
import { reviewFormAssignmentAction } from "@/app/consultoria/[slug]/formularios/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface FormReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  assignment: ConsultancyFormAssignmentDto;
  onSuccess: () => void;
}

export function FormReviewModal({
  isOpen,
  onClose,
  consultancySlug,
  assignment,
  onSuccess,
}: FormReviewModalProps) {
  const isMounted = useIsMounted();
  const [reviewerNotes, setReviewerNotes] = useState(assignment.reviewerNotes || "");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  if (!isMounted || !isOpen) return null;

  const responses = assignment.responses || {};
  const isReviewed = assignment.status === "REVIEWED";

  function handleDecision(decision: "APPROVE" | "REQUEST_CHANGES") {
    setGlobalError(null);
    startTransition(async () => {
      try {
        const res = await reviewFormAssignmentAction(consultancySlug, assignment.publicId, {
          decision,
          reviewerNotes: reviewerNotes.trim() || null,
        });

        if (!res.success) {
          setGlobalError(res.error || "Erro ao processar revisão.");
          return;
        }

        onSuccess();
        onClose();
      } catch (err: unknown) {
        setGlobalError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    });
  }

  function renderAnswer(q: FormQuestionDefinition) {
    const val = responses[q.id];
    if (val === undefined || val === null || val === "") {
      return (
        <span className="text-xs italic text-slate-400 dark:text-zinc-500">
          Não respondido
        </span>
      );
    }

    if (q.type === "SCALE") {
      const numVal = Number(val);
      const isHigh = numVal >= 7;
      const isMedium = numVal >= 4 && numVal < 7;
      return (
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              isHigh
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : isMedium
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            Nota {numVal} / 10
          </span>
          {q.scaleMinLabel && q.scaleMaxLabel && (
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              ({q.scaleMinLabel} → {q.scaleMaxLabel})
            </span>
          )}
        </div>
      );
    }

    if (q.type === "MULTIPLE_CHOICE" && Array.isArray(val)) {
      if (val.length === 0) {
        return <span className="text-xs italic text-slate-400">Nenhuma opção marcada</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.map((item, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    if (q.type === "SINGLE_CHOICE") {
      return (
        <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10">
          {String(val)}
        </span>
      );
    }

    if (q.type === "FILE_UPLOAD") {
      const fileData = typeof val === "object" ? (val as { url?: string; name?: string }) : null;
      const fileUrl = fileData?.url || String(val);
      const fileName = fileData?.name || "Ver anexo enviado";
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span className="underline truncate max-w-xs">{fileName}</span>
        </a>
      );
    }

    return (
      <p className="text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-medium">
        {String(val)}
      </p>
    );
  }

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
        aria-labelledby="review-modal-title"
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
                Revisão de Resposta
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  assignment.status === "REVIEWED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : assignment.status === "SUBMITTED"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {assignment.status === "REVIEWED"
                  ? "Revisado"
                  : assignment.status === "SUBMITTED"
                  ? "Respondido"
                  : "Pendente"}
              </span>
            </div>
            <h2
              id="review-modal-title"
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
          {globalError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {globalError}
            </div>
          )}

          {/* STUDENT INFO HEADER CARD */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Aluno</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block">
                {assignment.studentName}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">
                {assignment.studentEmail} {assignment.studentPhone ? `• ${assignment.studentPhone}` : ""}
              </span>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 dark:text-zinc-400">
              {assignment.submittedAt && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enviado em</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300">
                    {new Date(assignment.submittedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QUESTIONS & ANSWERS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Respostas do Aluno ({assignment.questions?.length || 0})
            </h3>

            {(!assignment.questions || assignment.questions.length === 0) ? (
              <p className="text-xs text-slate-500">Nenhuma pergunta encontrada neste formulário.</p>
            ) : (
              <div className="space-y-3">
                {assignment.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1a1c20] border border-slate-200 dark:border-white/10 shadow-xs space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block leading-snug">
                          {q.title}
                        </span>
                        {q.description && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {q.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pl-7 pt-1 border-t border-slate-100 dark:border-white/5">
                      {renderAnswer(q)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REVIEWER NOTES */}
          <div className="space-y-1.5 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block mb-1">
              Observações do Profissional / Feedback
            </label>
            <textarea
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              rows={3}
              placeholder="Adicione um parecer, recomendações ou motivos caso solicite ajustes..."
              className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[96px]"
            />
          </div>
        </div>

        {/* STICKY FOOTER (EMPILHADO EM MOBILE COM AÇÃO PRIMÁRIA NO TOPO) */}
        <div className="sticky bottom-0 shrink-0 bg-white/95 dark:bg-[#151619]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 z-10">
          <button
            type="button"
            onClick={() => handleDecision("APPROVE")}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-3 px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{isSubmitting ? "Salvando..." : isReviewed ? "Atualizar Avaliação" : "Aprovar Formulário"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleDecision("REQUEST_CHANGES")}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-2 px-4 py-3 sm:py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-sm sm:text-xs font-bold transition-all cursor-pointer min-h-[48px] disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
          >
            {isSubmitting ? "Processando..." : "Solicitar Ajustes"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-1 px-4 py-3 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-sm sm:text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer min-h-[48px] flex items-center justify-center whitespace-nowrap"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
