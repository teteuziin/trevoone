"use client";

import React, { useState, useMemo, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DuotoneFormsIcon } from "@/components/ui/icons/duotone-icons";
import type {
  StudentFormAnswer,
  FormTemplateSummary,
  StudentFormFieldItem,
} from "@/lib/consultancies/personal-student-hub";
import type {
  ConsultancyFormDto,
  ConsultancyFormAssignmentDto,
} from "@/lib/consultancies/forms";
import {
  submitResponsesForExistingRequestAction,
  deleteFormRequestAction,
} from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
import { AssignFormModal } from "@/components/consultancies/forms/assign-form-modal";
import { FormBuilderModal } from "@/components/consultancies/forms/form-builder-modal";
import { FormReviewModal } from "@/components/consultancies/forms/form-review-modal";
import { FormRunner } from "@/components/consultancies/forms/form-runner";
import { IntakeFormEditorDialog } from "./intake-form-editor-dialog";

export interface StudentFormsHubProps {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  studentEmail?: string;
  forms: StudentFormAnswer[];
  availableTemplates?: FormTemplateSummary[];
  publishedForms?: ConsultancyFormDto[];
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

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function StudentFormsHub({
  consultancySlug,
  studentPublicId,
  studentName,
  studentEmail = "",
  forms,
  availableTemplates = [],
  publishedForms = [],
}: StudentFormsHubProps) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais de Criação / Atribuição Simplificada
  const [isChooserModalOpen, setIsChooserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);

  // Modais de Revisão e Preenchimento Modernos (consultancy_form_assignments)
  const [reviewAssignment, setReviewAssignment] = useState<ConsultancyFormAssignmentDto | null>(null);
  const [runnerAssignment, setRunnerAssignment] = useState<ConsultancyFormAssignmentDto | null>(null);

  // Modais Legados (preservados para compatibilidade e testes)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedForView, setSelectedForView] = useState<StudentFormAnswer | null>(null);
  const [selectedForFill, setSelectedForFill] = useState<StudentFormAnswer | null>(null);

  // Answers State para preenchimento de solicitação pendente existente (legado)
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Filter forms
  const filteredForms = useMemo(() => {
    return forms.filter((item) => {
      // Filter tab
      if (activeFilter === "PENDING" && item.rawStatus !== "PENDING") return false;
      if (activeFilter === "SUBMITTED" && (item.rawStatus === "PENDING" || item.authorOrigin === "PROFESSIONAL")) return false;
      if (activeFilter === "PROFESSIONAL" && (item.authorOrigin !== "PROFESSIONAL" && item.rawStatus !== "REVIEWED")) return false;

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
      submitted: forms.filter((f) => f.rawStatus === "SUBMITTED" || (f.rawStatus !== "PENDING" && f.authorOrigin !== "PROFESSIONAL")).length,
      professional: forms.filter((f) => f.authorOrigin === "PROFESSIONAL" || f.rawStatus === "REVIEWED").length,
    };
  }, [forms]);

  // Submit Filling for existing pending request (legado)
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
        router.refresh();
      } else {
        setFormError(res.error || "Erro ao salvar respostas.");
      }
    });
  };

  // Delete Request
  const handleDeleteRequest = (requestPublicId: string) => {
    if (!confirm("Deseja realmente excluir esta atribuição de formulário?")) return;
    startTransition(async () => {
      await deleteFormRequestAction(consultancySlug, studentPublicId, requestPublicId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6" data-testid="student-forms-hub">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DuotoneFormsIcon className="w-5 h-5 text-emerald-500" />
            <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              Formulários &amp; Questionários
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Questionários de acompanhamento, check-ins e avaliações periódicas de {studentName}.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsChooserModalOpen(true)}
          className="font-bold text-sm sm:text-xs min-h-[48px] sm:min-h-[40px] px-4 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white self-stretch sm:self-auto flex items-center justify-center shadow-sm"
        >
          <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Novo formulário</span>
        </Button>
      </div>

      {/* 2. ABAS DE FILTRO & BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* ABA TODOS COM CONTRASTE ALTO GARANTIDO EM MODO CLARO E ESCURO */}
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[40px] sm:min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "ALL"
                  ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                  : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-zinc-300"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[40px] sm:min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === "PENDING"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <span>Aguardando resposta</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "PENDING"
                  ? "bg-black/20 text-white"
                  : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-zinc-300"
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("SUBMITTED")}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[40px] sm:min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === "SUBMITTED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <span>Respondidos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "SUBMITTED"
                  ? "bg-black/20 text-white"
                  : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-zinc-300"
              }`}
            >
              {counts.submitted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("PROFESSIONAL")}
            className={`px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer min-h-[40px] sm:min-h-[32px] flex items-center gap-1.5 ${
              activeFilter === "PROFESSIONAL"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <span>Pelo profissional</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === "PROFESSIONAL"
                  ? "bg-black/20 text-white"
                  : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-zinc-300"
              }`}
            >
              {counts.professional}
            </span>
          </button>
        </div>

        {forms.length > 2 && (
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Buscar formulário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 min-h-[44px] sm:min-h-[36px] focus:outline-hidden focus:border-emerald-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-3 sm:top-2.5"
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
        <div className="p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151619] text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <DuotoneFormsIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              {forms.length === 0
                ? "Nenhum formulário cadastrado para este aluno"
                : "Nenhum formulário encontrado neste filtro"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              {forms.length === 0
                ? "Escolha um modelo pronto da consultoria ou crie um novo formulário personalizado para atribuir a este aluno."
                : "Tente selecionar outra aba de filtro acima para ver outros status."}
            </p>
          </div>
          {forms.length === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsChooserModalOpen(true)}
              className="font-bold min-h-[48px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
            >
              Criar primeiro formulário
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => {
            const isPending = form.rawStatus === "PENDING";
            const isReviewed = form.rawStatus === "REVIEWED";
            const isSubmitted = form.rawStatus === "SUBMITTED";
            const isAuthorProf = form.authorOrigin === "PROFESSIONAL" || isReviewed;

            return (
              <div
                key={form.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {form.title}
                    </h3>
                    <Badge
                      variant={isPending ? "warning" : isReviewed ? "success" : "info"}
                      size="sm"
                    >
                      {form.status}
                    </Badge>

                    {/* Tag de Origem de Autoria */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isAuthorProf
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isAuthorProf ? "Profissional" : "Aluno"}
                    </span>
                  </div>

                  {form.description && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {form.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-zinc-500 flex-wrap">
                    {form.submittedAt ? (
                      <span>Respondido em: {formatDisplayDate(form.submittedAt)}</span>
                    ) : form.requestedAt ? (
                      <span>Solicitado em: {formatDisplayDate(form.requestedAt)}</span>
                    ) : null}
                    {form.dueDate && (
                      <span>• Prazo: {formatDisplayDate(form.dueDate)}</span>
                    )}
                    {form.questions.length > 0 && (
                      <span>• {form.questions.length} pergunta{form.questions.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-end">
                  {/* AÇÃO PRINCIPAL CONECTADA: REVISÃO/RUNNER MODERNO SE DISPONÍVEL */}
                  {isPending ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (form.assignmentDto) {
                          setRunnerAssignment(form.assignmentDto);
                        } else {
                          setSelectedForFill(form);
                          setCurrentAnswers({});
                        }
                      }}
                      className="flex-1 sm:flex-initial font-bold text-sm sm:text-xs min-h-[44px] sm:min-h-[38px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Preencher agora
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (form.assignmentDto) {
                          setReviewAssignment(form.assignmentDto);
                        } else {
                          setSelectedForView(form);
                        }
                      }}
                      className="flex-1 sm:flex-initial font-semibold text-sm sm:text-xs min-h-[44px] sm:min-h-[38px] px-4 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                    >
                      <span>{isSubmitted ? "Revisar respostas" : "Ver respostas"}</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteRequest(form.publicId)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 border border-slate-200/80 dark:border-white/10"
                    title="Excluir atribuição de formulário"
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
          MODAL: CHOOSER SIMPLIFICADO (ESCOLHER MODELO VS CRIAR NOVO MODELO)
          Montado via createPortal no document.body com z-[70] para cobrir
          completamente a barra de navegação inferior mobile (z-30) e drawers (z-50).
          ========================================================================= */}
      {isChooserModalOpen && isMounted && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsChooserModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white dark:bg-[#151619] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden m-0"
          >
            {/* MOBILE DRAG HANDLE */}
            <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white dark:bg-[#151619]">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 px-5 sm:px-6 py-4 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  ● Atribuição de Formulário
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Adicionar para {studentName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Como você deseja disponibilizar este questionário para o aluno?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChooserModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* BODY WITH VERTICAL SCROLL IF NEEDED */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
              {/* OPÇÃO 1: ESCOLHER MODELO EXISTENTE (RECOMENDADO / RÁPIDO) */}
              <button
                type="button"
                onClick={() => {
                  setIsChooserModalOpen(false);
                  setIsAssignModalOpen(true);
                }}
                className="w-full p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50/70 dark:bg-white/[0.03] hover:bg-emerald-500/[0.04] text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Escolher modelo existente
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {publishedForms.length} disponível{publishedForms.length !== 1 ? "is" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Selecione um questionário já pronto da biblioteca (check-in, avaliação, rotina) e envie com 1 clique.
                  </p>
                </div>
              </button>

              {/* OPÇÃO 2: CRIAR NOVO MODELO (SALVA NA BIBLIOTECA E ATRIBUI AUTOMATICAMENTE) */}
              <button
                type="button"
                onClick={() => {
                  setIsChooserModalOpen(false);
                  setIsBuilderModalOpen(true);
                }}
                className="w-full p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50/70 dark:bg-white/[0.03] hover:bg-emerald-500/[0.04] text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Criar novo modelo do zero
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Construa um modelo com perguntas sob medida (escalas, escolhas, textos). Ficará salvo na biblioteca e já atribuído ao aluno.
                  </p>
                </div>
              </button>
            </div>

            {/* FOOTER ACTION (48px TOUCH TARGET & SAFE AREA PADDING) */}
            <div className="p-4 sm:p-6 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <button
                type="button"
                onClick={() => setIsChooserModalOpen(false)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer active:scale-[0.99]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL A: ASSIGN FORM MODAL COM ALUNO PRÉ-SELECIONADO
          ========================================================================= */}
      {isAssignModalOpen && (
        <AssignFormModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          consultancySlug={consultancySlug}
          forms={publishedForms}
          students={[
            {
              membershipId: 0,
              membershipPublicId: studentPublicId,
              userId: 0,
              name: studentName,
              email: studentEmail,
              phone: null,
            },
          ]}
          preselectedStudentMembershipPublicId={studentPublicId}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* =========================================================================
          MODAL B: FORM BUILDER MODAL COM AUTO-ATRIBUIÇÃO AO ALUNO
          ========================================================================= */}
      {isBuilderModalOpen && (
        <FormBuilderModal
          isOpen={isBuilderModalOpen}
          onClose={() => setIsBuilderModalOpen(false)}
          consultancySlug={consultancySlug}
          autoAssignStudent={{
            membershipPublicId: studentPublicId,
            name: studentName,
          }}
          onSuccess={() => {
            setIsBuilderModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* =========================================================================
          MODAL C: REVISÃO DE RESPOSTAS (FormReviewModal)
          ========================================================================= */}
      {reviewAssignment && (
        <FormReviewModal
          isOpen={Boolean(reviewAssignment)}
          onClose={() => setReviewAssignment(null)}
          consultancySlug={consultancySlug}
          assignment={reviewAssignment}
          onSuccess={() => {
            setReviewAssignment(null);
            router.refresh();
          }}
        />
      )}

      {/* =========================================================================
          MODAL D: RUNNER DE PREENCHIMENTO (FormRunner)
          ========================================================================= */}
      {runnerAssignment && (
        <FormRunner
          isOpen={Boolean(runnerAssignment)}
          onClose={() => setRunnerAssignment(null)}
          consultancySlug={consultancySlug}
          assignment={runnerAssignment}
          onSuccess={() => {
            setRunnerAssignment(null);
            router.refresh();
          }}
        />
      )}

      {/* =========================================================================
          MODAL: INTAKE FORM EDITOR DIALOG (PRESERVADO PARA TESTES DE REGRESSÃO)
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
          MODAL: PREENCHER SOLICITAÇÃO PENDENTE (LEGADO)
          ========================================================================= */}
      {selectedForFill && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  Preencher {selectedForFill.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Aluno: <strong className="text-slate-900 dark:text-white">{studentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForFill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                    <label className="block text-xs font-medium text-slate-900 dark:text-white">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === "LONG_TEXT" ? (
                      <textarea
                        value={currentAnswers[f.id] || ""}
                        onChange={(e) =>
                          setCurrentAnswers((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white"
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
          MODAL: VISUALIZAR RESPOSTAS (LEGADO)
          ========================================================================= */}
      {selectedForView && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  {selectedForView.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Aluno: <strong className="text-slate-900 dark:text-white">{studentName}</strong> •{" "}
                  {selectedForView.submittedAt
                    ? `Respondido em ${formatDisplayDate(selectedForView.submittedAt)}`
                    : "Pendente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForView(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {selectedForView.questions.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic">Nenhuma resposta registrada.</p>
              ) : (
                selectedForView.questions.map((q, idx) => (
                  <div
                    key={`${q.question}-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1 text-xs"
                  >
                    <span className="font-semibold text-slate-600 dark:text-zinc-400 block">
                      {q.question}
                    </span>
                    <p className="font-medium text-slate-900 dark:text-white leading-relaxed">
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
