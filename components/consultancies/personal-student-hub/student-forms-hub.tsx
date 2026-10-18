"use client";

import React, { useState, useMemo, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DuotoneFormsIcon } from "@/components/ui/icons/duotone-icons";
import type {
  StudentFormAnswer,
  FormTemplateSummary,
  StudentFormFieldItem,
} from "@/lib/consultancies/personal-student-hub";
import {
  submitResponsesForExistingRequestAction,
  deleteFormRequestAction,
} from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
import { IntakeFormEditorDialog } from "./intake-form-editor-dialog";

export interface StudentFormsHubProps {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  forms: StudentFormAnswer[];
  availableTemplates?: FormTemplateSummary[];
  onRequestFormClick?: () => void;
}

type FilterKey = "ALL" | "PENDING" | "SUBMITTED" | "PROFESSIONAL";

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

const DEFAULT_FORM_FIELDS: StudentFormFieldItem[] = [
  { id: "q1", label: "Como avalia sua rotina nesta semana?", type: "SELECT", options: ["Excelente", "Boa", "Regular", "Difícil"], required: true },
  { id: "q2", label: "Teve alguma dificuldade com as refeições ou horários?", type: "LONG_TEXT", required: false },
  { id: "q3", label: "Sentiu algum desconforto muscular incomum?", type: "YES_NO", required: true },
  { id: "q4", label: "Comentários e dúvidas para o treinador", type: "LONG_TEXT", required: false },
];

export function StudentFormsHub({
  consultancySlug,
  studentPublicId,
  studentName,
  forms,
  availableTemplates = [],
}: StudentFormsHubProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedForView, setSelectedForView] = useState<StudentFormAnswer | null>(null);
  const [selectedForFill, setSelectedForFill] = useState<StudentFormAnswer | null>(null);

  // Answers State para preenchimento de solicitação pendente existente
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Filter forms
  const filteredForms = useMemo(() => {
    return forms.filter((item) => {
      // Filter tab
      if (activeFilter === "PENDING" && item.rawStatus !== "PENDING") return false;
      if (activeFilter === "SUBMITTED" && (item.rawStatus === "PENDING" || item.authorOrigin === "PROFESSIONAL")) return false;
      if (activeFilter === "PROFESSIONAL" && item.authorOrigin !== "PROFESSIONAL") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [forms, activeFilter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: forms.length,
      pending: forms.filter((f) => f.rawStatus === "PENDING").length,
      submitted: forms.filter((f) => f.rawStatus !== "PENDING" && f.authorOrigin !== "PROFESSIONAL").length,
      professional: forms.filter((f) => f.authorOrigin === "PROFESSIONAL").length,
    };
  }, [forms]);



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

  // Delete Request
  const handleDeleteRequest = (requestPublicId: string) => {
    if (!confirm("Deseja realmente excluir esta solicitação de formulário?")) return;
    startTransition(async () => {
      await deleteFormRequestAction(consultancySlug, studentPublicId, requestPublicId);
    });
  };

  return (
    <div className="space-y-6" data-testid="student-forms-hub">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DuotoneFormsIcon className="w-5 h-5 text-teal-500" />
            <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">
              Formulários &amp; Questionários
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Questionários de acompanhamento, termos e avaliações periódicas do aluno.
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
          <span>Novo formulário</span>
        </Button>
      </div>

      {/* 2. ABAS DE FILTRO & BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === "ALL"
                ? "bg-[var(--text-primary)] text-[var(--surface-canvas)] font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Todos ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === "PENDING"
                ? "bg-amber-500 text-white font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Aguardando resposta ({counts.pending})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("SUBMITTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === "SUBMITTED"
                ? "bg-emerald-600 text-white font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Respondidos ({counts.submitted})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PROFESSIONAL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === "PROFESSIONAL"
                ? "bg-violet-600 text-white font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            Pelo profissional ({counts.professional})
          </button>
        </div>

        {forms.length > 2 && (
          <div className="relative min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar formulário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <svg
              className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        )}
      </div>

      {/* 3. LISTA DE FORMULÁRIOS */}
      {filteredForms.length === 0 ? (
        <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[#151619] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20 flex items-center justify-center mx-auto">
            <DuotoneFormsIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              {forms.length === 0
                ? "Nenhum formulário cadastrado para este aluno"
                : "Nenhum formulário encontrado neste filtro"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {forms.length === 0
                ? "Crie questionários de acompanhamento, questionários de rotina ou termos para o aluno."
                : "Tente selecionar outra aba de filtro acima."}
            </p>
          </div>
          {forms.length === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="font-bold min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              Criar primeiro formulário
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => {
            const isPending = form.rawStatus === "PENDING";
            const isAuthorProf = form.authorOrigin === "PROFESSIONAL";

            return (
              <div
                key={form.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] truncate">
                      {form.title}
                    </h3>
                    <Badge
                      variant={isPending ? "warning" : "success"}
                      size="sm"
                    >
                      {form.status}
                    </Badge>

                    {/* Tag de Origem de Autoria */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAuthorProf
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      {isAuthorProf ? "Profissional" : "Aluno"}
                    </span>
                  </div>

                  {form.description && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {form.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    {form.submittedAt ? (
                      <span>Respondido em: {formatDisplayDate(form.submittedAt)}</span>
                    ) : form.requestedAt ? (
                      <span>Solicitado em: {formatDisplayDate(form.requestedAt)}</span>
                    ) : null}
                    {form.questions.length > 0 && (
                      <span>• {form.questions.length} perguntas</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {isPending ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedForFill(form);
                        setCurrentAnswers({});
                      }}
                      className="font-bold text-xs min-h-[36px] px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      Preencher agora
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedForView(form)}
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
                    onClick={() => handleDeleteRequest(form.publicId)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Excluir formulário"
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
      )}

      {/* =========================================================================
          MODAL: CRIAR NOVO FORMULÁRIO (EDITOR AMPLO MULTI-ETAPAS)
          ========================================================================= */}
      <IntakeFormEditorDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        consultancySlug={consultancySlug}
        studentPublicId={studentPublicId}
        studentName={studentName}
        isAnamnesis={false}
        availableTemplates={availableTemplates}
        defaultFields={DEFAULT_FORM_FIELDS}
      />


      {/* =========================================================================
          MODAL: PREENCHER SOLICITAÇÃO PENDENTE
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
                  Aluno: <strong className="text-[var(--text-primary)]">{studentName}</strong>
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
