"use client";

import React, { useState, useTransition } from "react";
import type { ExtractedAnamnesisProposal } from "@/lib/ai/chat-anamnesis-extractor";
import {
  refreshAiAnamnesisAction,
  confirmAiAnamnesisAction,
  savePrivateNotesAction,
  generateAiSummaryAction,
  generateAiSoapAction,
  generateAiQuestionsAction,
} from "@/app/consultoria/[slug]/consultas/chat-actions";

interface AIAnamnesisPanelProps {
  proposal: ExtractedAnamnesisProposal | null;
  consultationPublicId: string;
  consultancySlug: string;
  aiStatus: "PENDING" | "EXTRACTED" | "CONFIRMED";
  isProfessional: boolean;
  initialPrivateNotes?: string | null;
  onClose?: () => void;
}

export function AIAnamnesisPanel({
  proposal,
  consultationPublicId,
  consultancySlug,
  aiStatus,
  isProfessional,
  initialPrivateNotes = "",
  onClose,
}: AIAnamnesisPanelProps) {
  const [activeTab, setActiveTab] = useState<"PRONTUARIO" | "NOTAS" | "IA">("PRONTUARIO");
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Anamnesis state
  const [isRefreshingAnamnesis, setIsRefreshingAnamnesis] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);

  // Private notes state
  const [privateNotes, setPrivateNotes] = useState(initialPrivateNotes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // AI on-demand tools state
  const [aiSummary, setAiSummary] = useState<{ summary: string; topics: string[]; nextSteps: string[] } | null>(null);
  const [aiSoap, setAiSoap] = useState<{ subjective: string; objective: string; assessment: string; plan: string } | null>(null);
  const [aiQuestions, setAiQuestions] = useState<Array<{ question: string; askedBy: string; messagePublicId: string }> | null>(null);
  const [isLoadingAiTool, setIsLoadingAiTool] = useState<string | null>(null);

  // Handlers
  const handleRefreshAnamnesis = async () => {
    setIsRefreshingAnamnesis(true);
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
      setIsRefreshingAnamnesis(false);
    }
  };

  const handleConfirmAnamnesis = () => {
    if (!isProfessional) return;
    setFeedbackMsg(null);

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
        setIsEditingAnamnesis(false);
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Erro ao salvar anamnese." });
      }
    });
  };

  const handleSavePrivateNotes = async () => {
    setIsSavingNotes(true);
    setFeedbackMsg(null);
    try {
      const res = await savePrivateNotesAction(consultancySlug, consultationPublicId, privateNotes);
      if (res.ok) {
        setFeedbackMsg({ type: "success", text: "Notas privadas salvas com sucesso!" });
      } else {
        setFeedbackMsg({ type: "error", text: res.error || "Erro ao salvar notas privadas." });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Falha ao salvar notas." });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRunAiSummary = async () => {
    setIsLoadingAiTool("summary");
    try {
      const res = await generateAiSummaryAction(consultancySlug, consultationPublicId);
      if (res.ok && res.data) {
        setAiSummary(res.data as { summary: string; topics: string[]; nextSteps: string[] });
      } else {
        alert(res.error || "Erro ao gerar resumo.");
      }
    } catch {
      alert("Falha na conexão.");
    } finally {
      setIsLoadingAiTool(null);
    }
  };

  const handleRunAiSoap = async () => {
    setIsLoadingAiTool("soap");
    try {
      const res = await generateAiSoapAction(consultancySlug, consultationPublicId);
      if (res.ok && res.data) {
        setAiSoap(res.data as { subjective: string; objective: string; assessment: string; plan: string });
      } else {
        alert(res.error || "Erro ao estruturar SOAP.");
      }
    } catch {
      alert("Falha na conexão.");
    } finally {
      setIsLoadingAiTool(null);
    }
  };

  const handleRunAiQuestions = async () => {
    setIsLoadingAiTool("questions");
    try {
      const res = await generateAiQuestionsAction(consultancySlug, consultationPublicId);
      if (res.ok && res.data) {
        setAiQuestions(res.data as Array<{ question: string; askedBy: string; messagePublicId: string }>);
      } else {
        alert(res.error || "Erro ao verificar perguntas pendentes.");
      }
    } catch {
      alert("Falha na conexão.");
    } finally {
      setIsLoadingAiTool(null);
    }
  };

  const copySoapToNotes = () => {
    if (!aiSoap) return;
    const formatted = `[SOAP Clínico]\nS (Subjetivo): ${aiSoap.subjective}\nO (Objetivo): ${aiSoap.objective}\nA (Avaliação): ${aiSoap.assessment}\nP (Plano): ${aiSoap.plan}\n\n${privateNotes}`;
    setPrivateNotes(formatted);
    setActiveTab("NOTAS");
    setFeedbackMsg({ type: "success", text: "SOAP copiado para o campo de notas privadas! Clique em 'Salvar Notas' para persistir." });
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] border-l border-[var(--border-subtle)] w-full max-w-full overflow-hidden select-none">
      {/* Panel Header */}
      <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 bg-[var(--surface-subtle)]">
        <h3 className="text-sm font-bold text-[var(--text-primary)] truncate flex items-center gap-2">
          <span>📋 Prontuário & Apoio Clínico</span>
        </h3>

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

      {/* Tabs Switcher */}
      {isProfessional && (
        <div className="flex items-center border-b border-[var(--border-subtle)] text-xs font-bold bg-[var(--surface)] px-2">
          <button
            type="button"
            onClick={() => setActiveTab("PRONTUARIO")}
            className={`flex-1 py-2.5 text-center cursor-pointer border-b-2 transition-colors ${
              activeTab === "PRONTUARIO"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Anamnese
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("NOTAS")}
            className={`flex-1 py-2.5 text-center cursor-pointer border-b-2 transition-colors ${
              activeTab === "NOTAS"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Notas Privadas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("IA")}
            className={`flex-1 py-2.5 text-center cursor-pointer border-b-2 transition-colors ${
              activeTab === "IA"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Assistente IA
          </button>
        </div>
      )}

      {/* Feedback Messages */}
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

      {/* TAB 1: PRONTUÁRIO / ANAMNESE */}
      {activeTab === "PRONTUARIO" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                aiStatus === "CONFIRMED"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : aiStatus === "EXTRACTED"
                  ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              }`}
            >
              {aiStatus === "CONFIRMED"
                ? "✓ Anamnese Confirmada"
                : aiStatus === "EXTRACTED"
                ? "Proposta Extraída"
                : "Aguardando Extração"}
            </span>

            {isProfessional && (
              <button
                type="button"
                onClick={handleRefreshAnamnesis}
                disabled={isRefreshingAnamnesis || isPending}
                className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                {isRefreshingAnamnesis ? "Analisando..." : "Organizar Anamnese"}
              </button>
            )}
          </div>

          {!proposal || !proposal.sections || proposal.sections.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-tertiary)] space-y-2">
              <p className="text-xs">Nenhum dado clínico estruturado nesta conversa ainda.</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Clique em &quot;Organizar Anamnese&quot; para extrair objetivos, lesões e rotina informados pelo aluno.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {proposal.summary && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200">
                  <span className="font-bold">Resumo Clínico: </span>
                  {proposal.summary}
                </div>
              )}

              {proposal.sections.map((section, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 p-3 space-y-2"
                >
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
                    {section.label}
                  </h4>
                  <div className="space-y-1.5">
                    {section.fields.map((field) => (
                      <div
                        key={field.key}
                        className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs space-y-1"
                      >
                        <span className="font-semibold text-[var(--text-secondary)] block">
                          {field.label}
                        </span>
                        {isEditingAnamnesis ? (
                          <input
                            type="text"
                            value={editedValues[field.key] !== undefined ? editedValues[field.key] : field.value}
                            onChange={(e) => setEditedValues({ ...editedValues, [field.key]: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                          />
                        ) : (
                          <p className="text-xs text-[var(--text-primary)]">
                            {editedValues[field.key] !== undefined ? editedValues[field.key] : field.value || "Não informado"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {isProfessional && (
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAnamnesis((prev) => !prev)}
                    className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer"
                  >
                    {isEditingAnamnesis ? "Cancelar Edição" : "Editar Valores"}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAnamnesis}
                    disabled={isPending}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    Salvar na Ficha Oficial
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTAS PRIVADAS DO PROFISSIONAL */}
      {activeTab === "NOTAS" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            🔒 <strong>Notas Privadas:</strong> Visíveis exclusivamente para você e profissionais da consultoria. O aluno nunca visualiza estas anotações.
          </div>

          <div className="space-y-2">
            <textarea
              rows={12}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Digite suas anotações clínicas confidenciais sobre este aluno/atendimento..."
              className="w-full p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSavePrivateNotes}
              disabled={isSavingNotes}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSavingNotes ? "Salvando..." : "Salvar Notas Privadas"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ASSISTENTE IA SOB DEMANDA */}
      {activeTab === "IA" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">Ferramentas de IA Sob Demanda</h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Recursos acionados exclusivamente ao seu comando. Nenhuma mensagem é processada automaticamente.
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRunAiSummary}
              disabled={isLoadingAiTool !== null}
              className="p-3 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border border-[var(--border-subtle)] text-left space-y-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                📄 Resumir Atendimento
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Síntese rápida dos pontos discutidos no chat.
              </p>
            </button>

            <button
              type="button"
              onClick={handleRunAiSoap}
              disabled={isLoadingAiTool !== null}
              className="p-3 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border border-[var(--border-subtle)] text-left space-y-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                🩺 Estruturar SOAP
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Converte a conversa em registro clínico oficial.
              </p>
            </button>

            <button
              type="button"
              onClick={handleRunAiQuestions}
              disabled={isLoadingAiTool !== null}
              className="p-3 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-active)] border border-[var(--border-subtle)] text-left space-y-1 cursor-pointer transition-colors disabled:opacity-50 sm:col-span-2"
            >
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                ❓ Perguntas Pendentes
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Localiza dúvidas do aluno que ainda não foram respondidas.
              </p>
            </button>
          </div>

          {/* AI Tool Loading Indicator */}
          {isLoadingAiTool && (
            <div className="p-4 text-center text-xs text-purple-600 font-semibold space-y-2">
              <span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin inline-block" />
              <p>Processando sob demanda com IA...</p>
            </div>
          )}

          {/* Render Summary Output */}
          {aiSummary && (
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs animate-in fade-in">
              <h5 className="font-bold text-purple-900 dark:text-purple-200">Resumo do Atendimento:</h5>
              <p className="leading-relaxed text-[11px]">{aiSummary.summary}</p>
              {aiSummary.nextSteps.length > 0 && (
                <div className="pt-1">
                  <span className="font-bold text-[10px] uppercase block">Próximos Passos:</span>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {aiSummary.nextSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Render SOAP Output */}
          {aiSoap && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-emerald-900 dark:text-emerald-200">Estrutura SOAP Gerada:</h5>
                <button
                  type="button"
                  onClick={copySoapToNotes}
                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer hover:bg-emerald-500"
                >
                  Copiar para Notas Privadas
                </button>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p><strong>S (Subjetivo):</strong> {aiSoap.subjective}</p>
                <p><strong>O (Objetivo):</strong> {aiSoap.objective}</p>
                <p><strong>A (Avaliação):</strong> {aiSoap.assessment}</p>
                <p><strong>P (Plano):</strong> {aiSoap.plan}</p>
              </div>
            </div>
          )}

          {/* Render Questions Output */}
          {aiQuestions && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs animate-in fade-in">
              <h5 className="font-bold text-amber-900 dark:text-amber-200">Dúvidas Pendentes Detectadas:</h5>
              {aiQuestions.length === 0 ? (
                <p className="text-[11px] text-[var(--text-secondary)]">Nenhuma pergunta pendente sem resposta.</p>
              ) : (
                <ul className="space-y-1.5 text-[11px]">
                  {aiQuestions.map((q, i) => (
                    <li key={i} className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                      <span className="font-bold text-amber-600 block text-[10px]">{q.askedBy} perguntou:</span>
                      <span>&quot;{q.question}&quot;</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
