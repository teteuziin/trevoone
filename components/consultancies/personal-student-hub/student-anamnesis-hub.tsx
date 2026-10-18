"use client";

import React, { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DuotoneAnamnesisIcon } from "@/components/ui/icons/duotone-icons";
import type {
  StudentFormAnswer,
  AnamnesisSection,
  FormTemplateSummary,
  StudentFormFieldItem,
} from "@/lib/consultancies/personal-student-hub";
import {
  submitResponsesForExistingRequestAction,
  deleteFormRequestAction,
} from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
import { IntakeFormEditorDialog } from "./intake-form-editor-dialog";

export interface StudentAnamnesisHubProps {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  anamnesisHistory: StudentFormAnswer[];
  structuredAnamnesis: AnamnesisSection[];
  availableTemplates?: FormTemplateSummary[];
  onRequestAnamnesisClick?: () => void;
}

function formatDisplayDate(dateVal: unknown): string {
  if (!dateVal) return "—";
  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

const DEFAULT_ANAMNESIS_FIELDS: StudentFormFieldItem[] = [
  { id: "q1", label: "Histórico médico e cirurgias prévias", type: "LONG_TEXT", required: true },
  { id: "q2", label: "Possui dores ou limitações articulares?", type: "YES_NO", required: true },
  { id: "q3", label: "Uso contínuo de medicamentos", type: "SHORT_TEXT", required: false },
  { id: "q4", label: "Frequência atual de atividade física", type: "SELECT", options: ["Sedentário", "1 a 2x/semana", "3 a 4x/semana", "5x ou mais"], required: true },
  { id: "q5", label: "Objetivo principal com os treinos", type: "SHORT_TEXT", required: true },
  { id: "q6", label: "Restrições alimentares ou alergias", type: "SHORT_TEXT", required: false },
];

export function StudentAnamnesisHub({
  consultancySlug,
  studentPublicId,
  studentName,
  anamnesisHistory,
  structuredAnamnesis,
  availableTemplates = [],
}: StudentAnamnesisHubProps) {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedForView, setSelectedForView] = useState<StudentFormAnswer | null>(null);
  const [selectedForFill, setSelectedForFill] = useState<StudentFormAnswer | null>(null);

  // Modos suportados na criação e envio: "SEND_TO_STUDENT" | "FILL_WITH_STUDENT"
  // Respostas e estado para preenchimento de solicitação pendente existente com o aluno
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Submit Filling for existing pending request
  const handleFillPendingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForFill) return;
    setFormError(null);

    startTransition(async () => {
      const res = await submitResponsesForExistingRequestAction(
        consultancySlug,
        studentPublicId,
        selectedForFill.publicId,
        currentAnswers
      );
      if (res.success) {
        setSelectedForFill(null);
        setCurrentAnswers({});
      } else {
        setFormError(res.error || "Erro ao salvar respostas.");
      }
    });
  };

  // Delete Anamnesis Request
  const handleDeleteRequest = (requestPublicId: string) => {
    if (!confirm("Deseja realmente excluir esta solicitação de anamnese?")) return;
    startTransition(async () => {
      await deleteFormRequestAction(consultancySlug, studentPublicId, requestPublicId);
    });
  };

  return (
    <div className="space-y-6" data-testid="student-anamnesis-hub">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DuotoneAnamnesisIcon className="w-5 h-5 text-violet-500" />
            <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">
              Anamneses
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Histórico clínico, rotinas e questionários de saúde registrados.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setIsCreateModalOpen(true);
            setCurrentAnswers({});
            setFormError(null);
          }}
          className="font-bold text-xs min-h-[40px] px-4 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white self-start sm:self-auto"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Nova anamnese</span>
        </Button>
      </div>

      {/* 2. HISTÓRICO DE ANAMNESES */}
      {anamnesisHistory.length === 0 && structuredAnamnesis.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[#151619] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center mx-auto">
            <DuotoneAnamnesisIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Nenhuma anamnese registrada para este aluno
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Crie uma nova anamnese usando os modelos da consultoria ou preencha diretamente com o aluno durante a consulta.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="font-bold min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
          >
            Criar primeira anamnese
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {anamnesisHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Histórico de Registros ({anamnesisHistory.length})
              </h3>
              <div className="divide-y divide-[var(--border-subtle)] rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs overflow-hidden">
                {anamnesisHistory.map((item) => {
                  const isPending = item.rawStatus === "PENDING";
                  const isAuthorProf = item.authorOrigin === "PROFESSIONAL";

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading text-sm font-bold text-[var(--text-primary)] truncate">
                            {item.title}
                          </h4>
                          <Badge
                            variant={isPending ? "warning" : "success"}
                            size="sm"
                          >
                            {item.status}
                          </Badge>

                          {/* Tag de Diferenciação de Autoria */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isAuthorProf
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isAuthorProf ? (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                </svg>
                                <span>Registrado pelo profissional</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Preenchido pelo aluno</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                          {item.submittedAt ? (
                            <span>Respondido em: {formatDisplayDate(item.submittedAt)}</span>
                          ) : item.requestedAt ? (
                            <span>Solicitado em: {formatDisplayDate(item.requestedAt)}</span>
                          ) : null}
                          {item.questions.length > 0 && (
                            <span>• {item.questions.length} perguntas</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {isPending ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedForFill(item);
                              setCurrentAnswers({});
                            }}
                            className="font-bold text-xs min-h-[36px] px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          >
                            Preencher com o aluno
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedForView(item)}
                            className="font-semibold text-xs min-h-[36px] px-3.5 cursor-pointer"
                          >
                            <span>Ver respostas</span>
                            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(item.publicId)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Excluir solicitação"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. RESUMO CLÍNICO ESTRUTURADO (POR TEMAS) */}
          {structuredAnamnesis.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Quadro Clínico Integrado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {structuredAnamnesis.map((section) => (
                  <div
                    key={section.title}
                    className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3"
                  >
                    <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--brand)] border-b border-[var(--border-subtle)] pb-2">
                      {section.title}
                    </h4>
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div key={item.label} className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] block">
                            {item.label}
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR NOVA ANAMNESE (EDITOR AMPLO MULTI-ETAPAS)
          ========================================================================= */}
      <IntakeFormEditorDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        consultancySlug={consultancySlug}
        studentPublicId={studentPublicId}
        studentName={studentName}
        isAnamnesis={true}
        availableTemplates={availableTemplates}
        defaultFields={DEFAULT_ANAMNESIS_FIELDS}
      />


      {/* =========================================================================
          MODAL: PREENCHER SOLICITAÇÃO PENDENTE COM O ALUNO
          ========================================================================= */}
      {selectedForFill && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  Preencher {selectedForFill.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Registrando respostas para o aluno <strong className="text-[var(--text-primary)]">{studentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForFill(null)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleFillPendingSubmit} className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(selectedForFill.fields || []).map((f) => (
                  <div key={f.id} className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-primary)]">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === "LONG_TEXT" ? (
                      <textarea
                        value={currentAnswers[f.id] || ""}
                        onChange={(e) =>
                          setCurrentAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                      />
                    ) : f.type === "YES_NO" ? (
                      <div className="flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={f.id}
                            value="Sim"
                            checked={currentAnswers[f.id] === "Sim"}
                            onChange={(e) =>
                              setCurrentAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                            }
                          />
                          <span>Sim</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={f.id}
                            value="Não"
                            checked={currentAnswers[f.id] === "Não"}
                            onChange={(e) =>
                              setCurrentAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                            }
                          />
                          <span>Não</span>
                        </label>
                      </div>
                    ) : (
                      <input
                        type={f.type === "NUMBER" ? "number" : f.type === "DATE" ? "date" : "text"}
                        value={currentAnswers[f.id] || ""}
                        onChange={(e) =>
                          setCurrentAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedForFill(null)}
                  disabled={isSubmitting}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="font-bold min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  {isSubmitting ? "Salvando..." : "Salvar respostas"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VISUALIZAR RESPOSTAS
          ========================================================================= */}
      {selectedForView && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                  {selectedForView.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aluno: <strong className="text-[var(--text-primary)]">{studentName}</strong> •{" "}
                  {selectedForView.submittedAt
                    ? `Respondido em ${formatDisplayDate(selectedForView.submittedAt)}`
                    : "Pendente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForView(null)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {selectedForView.questions.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] italic">Nenhuma resposta registrada.</p>
              ) : (
                selectedForView.questions.map((q, idx) => (
                  <div
                    key={`${q.question}-${idx}`}
                    className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 text-xs"
                  >
                    <span className="font-semibold text-[var(--text-secondary)] block">
                      {q.question}
                    </span>
                    <p className="font-medium text-[var(--text-primary)] leading-relaxed">
                      {q.answer}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedForView(null)}
                className="min-h-[44px] px-6 font-bold"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
