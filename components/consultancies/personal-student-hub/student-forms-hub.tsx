"use client";

import React, { useState, useMemo, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
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
  onRequestFormClick,
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
      {/* =========================================================================
          SE ESTIVER VAZIO — SOMENTE O NECESSÁRIO
          Sem abas desnecessárias, sem filtros para zero registros
          ========================================================================= */}
      {forms.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl border border-[#E5E8E2] bg-white text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center mx-auto">
            <DuotoneFormsIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-heading text-base font-bold text-[#102E23]">
              Nenhum formulário enviado.
            </h3>
            <p className="text-xs text-[#5A6660]">
              Envie um questionário de acompanhamento ou check-in periódico para o aluno responder.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => (onRequestFormClick ? onRequestFormClick() : setIsChooserModalOpen(true))}
              className="font-bold min-h-[42px] px-5 bg-[#176B49] hover:bg-[#125438] text-white cursor-pointer shadow-xs"
            >
              Enviar formulário
            </Button>
          </div>
        </div>
      ) : (
        /* TEM FORMULÁRIOS */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <DuotoneFormsIcon className="w-5 h-5 text-[#176B49]" />
                <h2 className="font-heading text-base font-bold text-[#102E23]">
                  Formulários de {studentName}
                </h2>
              </div>
              <p className="text-xs text-[#5A6660] mt-0.5">
                {forms.length} {forms.length === 1 ? "formulário enviado" : "formulários enviados"}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => (onRequestFormClick ? onRequestFormClick() : setIsChooserModalOpen(true))}
              className="font-bold text-xs min-h-[38px] px-4 cursor-pointer bg-[#176B49] hover:bg-[#125438] text-white shadow-xs"
            >
              <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Enviar formulário</span>
            </Button>
          </div>

          {/* Abas e busca apenas quando houver mais de 2 formulários */}
          {forms.length > 2 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E5E8E2]">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                    activeFilter === "ALL"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "text-[#5A6660] hover:text-[#102E23] bg-white border border-[#E5E8E2]"
                  }`}
                >
                  <span>Todos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === "ALL" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {counts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter("PENDING")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                    activeFilter === "PENDING"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-[#5A6660] hover:text-[#102E23] bg-white border border-[#E5E8E2]"
                  }`}
                >
                  <span>Aguardando resposta</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === "PENDING" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {counts.pending}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter("SUBMITTED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] flex items-center gap-1.5 ${
                    activeFilter === "SUBMITTED"
                      ? "bg-[#176B49] text-white shadow-xs"
                      : "text-[#5A6660] hover:text-[#102E23] bg-white border border-[#E5E8E2]"
                  }`}
                >
                  <span>Respondidos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeFilter === "SUBMITTED" ? "bg-white/20 text-white" : "bg-black/5 text-[#5A6660]"}`}>
                    {counts.submitted}
                  </span>
                </button>
              </div>

              {forms.length > 4 && (
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Buscar formulário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E5E8E2] bg-white text-xs text-[#102E23] placeholder-[#8E9992] min-h-[34px] focus:outline-none focus:border-[#176B49]"
                  />
                  <svg className="w-3.5 h-3.5 text-[#5A6660] absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* LISTA COMPACTA DE FORMULÁRIOS */}
          <div className="space-y-2.5">
            {filteredForms.map((form) => {
              const isPending = form.rawStatus === "PENDING";
              const isReviewed = form.rawStatus === "REVIEWED";

              return (
                <div
                  key={form.id}
                  className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#CDEED5] transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-sm font-bold text-[#102E23] truncate">
                        {form.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPending
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]"
                      }`}>
                        {isPending ? "Aguardando resposta" : isReviewed ? "Revisado" : "Respondido"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#5A6660] flex-wrap">
                      {form.submittedAt ? (
                        <span>Respondido em {formatDisplayDate(form.submittedAt)}</span>
                      ) : form.requestedAt ? (
                        <span>Enviado em {formatDisplayDate(form.requestedAt)}</span>
                      ) : null}
                      {form.questions.length > 0 && (
                        <span>• {form.questions.length} pergunta(s)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
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
                        className="font-bold text-xs min-h-[36px] px-3.5 bg-[#176B49] hover:bg-[#125438] text-white cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Ver situação
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
                        className="font-semibold text-xs min-h-[36px] px-3.5 bg-[#F5F5F0] hover:bg-[#EBEBE5] text-[#102E23] border border-[#E5E8E2] cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                      >
                        <span>Ver resposta</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-[#5A6660]" />
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(form.publicId)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#5A6660] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 border border-[#E5E8E2]"
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
            className="w-full sm:max-w-lg bg-white border-t sm:border border-[#E5E8E2] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden m-0"
          >
            {/* MOBILE DRAG HANDLE */}
            <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white">
              <div className="w-12 h-1.5 bg-[#E5E8E2] rounded-full" />
            </div>

            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-[#E5E8E2] px-5 sm:px-6 py-4 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#176B49] block">
                  ● Atribuição de Formulário
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#102E23] mt-0.5">
                  Adicionar para {studentName}
                </h3>
                <p className="text-xs text-[#5A6660] mt-0.5">
                  Como você deseja disponibilizar este questionário para o aluno?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChooserModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] cursor-pointer shrink-0"
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
                className="w-full p-4 sm:p-5 rounded-2xl border border-[#E5E8E2] hover:border-[#176B49] bg-[#FAF9F6] hover:bg-[#E8F0EA]/30 text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center shrink-0 border border-[#CDEED5] group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors">
                      Escolher modelo existente
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] shrink-0">
                      {publishedForms.length} disponível{publishedForms.length !== 1 ? "is" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6660] mt-1 leading-relaxed">
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
                className="w-full p-4 sm:p-5 rounded-2xl border border-[#E5E8E2] hover:border-[#176B49] bg-[#FAF9F6] hover:bg-[#E8F0EA]/30 text-left transition-all cursor-pointer group flex items-start gap-4 min-h-[96px]"
              >
                <div className="w-12 h-12 rounded-xl bg-white text-[#5A6660] flex items-center justify-center shrink-0 border border-[#E5E8E2] group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors">
                      Criar novo modelo do zero
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6660] mt-1 leading-relaxed">
                    Construa um modelo com perguntas sob medida (escalas, escolhas, textos). Ficará salvo na biblioteca e já atribuído ao aluno.
                  </p>
                </div>
              </button>
            </div>

            {/* FOOTER ACTION (48px TOUCH TARGET & SAFE AREA PADDING) */}
            <div className="p-4 sm:p-6 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 border-t border-[#E5E8E2] bg-[#FAF9F6] shrink-0">
              <button
                type="button"
                onClick={() => setIsChooserModalOpen(false)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E5E8E2] bg-white hover:bg-[#F5F5F0] text-[#5A6660] font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer active:scale-[0.99]"
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
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#E5E8E2] shadow-2xl p-6 sm:p-7 space-y-5"
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
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#E5E8E2] shadow-2xl p-6 sm:p-7 space-y-5"
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
