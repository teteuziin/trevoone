"use client";

import React, { useState, useTransition } from "react";
import type { ExtractedAnamnesisProposal } from "@/lib/ai/chat-anamnesis-extractor";
import {
  refreshAiAnamnesisAction,
  confirmAiAnamnesisAction,
} from "@/app/consultoria/[slug]/consultas/chat-actions";

interface AIAnamnesisPanelProps {
  proposal: ExtractedAnamnesisProposal | null;
  consultationPublicId: string;
  consultancySlug: string;
  aiStatus: "PENDING" | "EXTRACTED" | "CONFIRMED";
  isProfessional: boolean;
  onClose?: () => void;
}

export function AIAnamnesisPanel({
  proposal,
  consultationPublicId,
  consultancySlug,
  aiStatus,
  isProfessional,
  onClose,
}: AIAnamnesisPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Field edit state
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedbackMsg(null);
    try {
      const res = await refreshAiAnamnesisAction(consultancySlug, consultationPublicId);
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: "Proposta de anamnese atualizada pela IA com sucesso!" });
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Erro ao extrair anamnese." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Falha na comunicação com o servidor." });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFieldValueChange = (key: string, val: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleConfirm = () => {
    if (!isProfessional) return;
    setFeedbackMsg(null);

    // Merge proposal values with edits
    const payload: Record<string, unknown> = {};
    if (proposal && proposal.sections) {
      for (const sec of proposal.sections) {
        for (const f of sec.fields) {
          payload[f.key] = editedValues[f.key] !== undefined ? editedValues[f.key] : f.value;
        }
      }
    }

    startTransition(async () => {
      const res = await confirmAiAnamnesisAction(
        consultancySlug,
        consultationPublicId,
        payload,
        "Anamnese revisada e confirmada via Trevo Chat."
      );
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: "Anamnese confirmada e salva na ficha oficial do aluno!" });
        setIsEditing(false);
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Erro ao salvar anamnese." });
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] border-l border-[var(--border-subtle)] w-full max-w-full overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
              Anamnese Automática IA
            </h3>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                aiStatus === "CONFIRMED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : aiStatus === "EXTRACTED"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {aiStatus === "CONFIRMED"
                ? "✓ Confirmada Oficial"
                : aiStatus === "EXTRACTED"
                ? "Proposta Extraída"
                : "Aguardando Extração"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isProfessional && (
            <button
              type="button"
              disabled={isRefreshing || isPending}
              onClick={handleRefresh}
              title="Reanalisar conversa com IA"
              className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-purple-600 text-xs border border-[var(--border-subtle)] flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isRefreshing ? (
                <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className="hidden sm:inline text-[11px] font-semibold">Atualizar</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/10 text-[var(--text-secondary)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Banner Feedbacks */}
      {feedbackMsg && (
        <div
          className={`px-4 py-2 text-xs font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-b border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-b border-rose-500/20"
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Proposal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!proposal || !proposal.sections || proposal.sections.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-tertiary)] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] flex items-center justify-center mx-auto text-purple-500">
              🤖
            </div>
            <p className="text-xs max-w-xs mx-auto">
              Ainda não há dados clínicos organizados nesta conversa. Toque em &quot;Atualizar&quot; para que a IA analise as mensagens trocadas.
            </p>
            {isProfessional && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Organizar Anamnese com IA
              </button>
            )}
          </div>
        ) : (
          <>
            {proposal.summary && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                <span className="font-bold">Resumo da IA: </span>
                {proposal.summary}
              </div>
            )}

            {isProfessional && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  Extraído em: {new Date(proposal.extractedAt).toLocaleDateString("pt-BR")}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                >
                  {isEditing ? "Visualizar citações" : "Ajustar valores manualmente"}
                </button>
              </div>
            )}

            {proposal.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 p-3.5 space-y-3"
              >
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {section.label}
                </h4>

                <div className="space-y-2.5">
                  {section.fields.map((field) => {
                    const currentVal =
                      editedValues[field.key] !== undefined
                        ? editedValues[field.key]
                        : field.value;

                    return (
                      <div
                        key={field.key}
                        className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {field.label}
                          </span>
                          {field.isNotReported ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-500">
                              Não informado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              ✓ Informado
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleFieldValueChange(field.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                          />
                        ) : (
                          <p className={`text-xs ${field.isNotReported ? "italic opacity-60" : "font-medium text-[var(--text-primary)]"}`}>
                            {currentVal}
                          </p>
                        )}

                        {/* Traceability: Quote from chat message */}
                        {!field.isNotReported && field.sourceQuote && !isEditing && (
                          <div className="pt-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/5 p-1.5 rounded-lg border border-purple-500/10 flex items-start gap-1.5">
                            <span className="shrink-0">💬</span>
                            <span className="italic truncate">&quot;{field.sourceQuote}&quot;</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Action Footer */}
      {isProfessional && proposal && (
        <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-2">
          <button
            type="button"
            disabled={isPending || isRefreshing}
            onClick={handleConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-sm transition-transform active:scale-98 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>✓ Revisar e confirmar anamnese</span>
            )}
          </button>
          <p className="text-[10px] text-center text-[var(--text-tertiary)]">
            Ao confirmar, os dados são consolidados na ficha clínica oficial do aluno.
          </p>
        </div>
      )}
    </div>
  );
}
