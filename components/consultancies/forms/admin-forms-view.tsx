"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  ConsultancyFormDto,
  ConsultancyFormAssignmentDto,
  ActiveStudentOption,
} from "@/lib/consultancies/forms";
import {
  publishFormAction,
  archiveFormAction,
} from "@/app/consultoria/[slug]/formularios/actions";
import { buildWhatsAppUrl } from "@/lib/referrals/url-utils";
import { FormBuilderModal } from "./form-builder-modal";
import { AssignFormModal } from "./assign-form-modal";
import { FormReviewModal } from "./form-review-modal";

interface AdminFormsViewProps {
  consultancySlug: string;
  initialForms: ConsultancyFormDto[];
  initialAssignments: ConsultancyFormAssignmentDto[];
  students: ActiveStudentOption[];
}

export function AdminFormsView({
  consultancySlug,
  initialForms,
  initialAssignments,
  students,
}: AdminFormsViewProps) {
  const router = useRouter();

  // Tabs: "models" | "assignments"
  const [activeTab, setActiveTab] = useState<"models" | "assignments">("models");

  // Filters
  const [modelSearch, setModelSearch] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "SUBMITTED" | "REVIEWED">("ALL");

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<ConsultancyFormDto | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [preselectedFormPublicId, setPreselectedFormPublicId] = useState<string | undefined>(undefined);

  const [reviewingAssignment, setReviewingAssignment] = useState<ConsultancyFormAssignmentDto | null>(null);

  // Filtered models
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return initialForms;
    const term = modelSearch.toLowerCase();
    return initialForms.filter(
      (f) =>
        f.title.toLowerCase().includes(term) ||
        (f.description && f.description.toLowerCase().includes(term))
    );
  }, [initialForms, modelSearch]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return initialAssignments.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (assignmentSearch.trim()) {
        const term = assignmentSearch.toLowerCase();
        const matchName = a.studentName.toLowerCase().includes(term);
        const matchForm = a.formTitle.toLowerCase().includes(term);
        const matchEmail = a.studentEmail.toLowerCase().includes(term);
        if (!matchName && !matchForm && !matchEmail) return false;
      }
      return true;
    });
  }, [initialAssignments, statusFilter, assignmentSearch]);

  // Count summaries
  const pendingCount = useMemo(
    () => initialAssignments.filter((a) => a.status === "PENDING").length,
    [initialAssignments]
  );
  const submittedCount = useMemo(
    () => initialAssignments.filter((a) => a.status === "SUBMITTED").length,
    [initialAssignments]
  );

  function handleOpenCreate() {
    setEditingForm(null);
    setIsBuilderOpen(true);
  }

  function handleOpenEdit(form: ConsultancyFormDto) {
    setEditingForm(form);
    setIsBuilderOpen(true);
  }

  function handleOpenAssign(formPublicId?: string) {
    setPreselectedFormPublicId(formPublicId);
    setIsAssignOpen(true);
  }

  async function handleTogglePublish(form: ConsultancyFormDto) {
    if (form.status === "PUBLISHED") {
      await archiveFormAction(consultancySlug, form.publicId);
    } else {
      await publishFormAction(consultancySlug, form.publicId);
    }
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Formulários & Questionários
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Crie anamneses, check-ins e avaliações personalizadas e envie para seus alunos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAssign()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer min-h-[44px]"
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Atribuir Formulário</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Novo Modelo</span>
          </button>
        </div>
      </div>

      {/* PILL TABS */}
      <div className="border-b border-slate-200 dark:border-white/10 flex items-center gap-4 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "models"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Modelos</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
            {initialForms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeTab === "assignments"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Enviados / Respostas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300">
            {initialAssignments.length}
          </span>
          {submittedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500 text-white font-bold animate-pulse">
              {submittedCount} novos
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MODELOS
         ========================================================================= */}
      {activeTab === "models" && (
        <div className="space-y-4">
          {/* SEARCH BAR */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Buscar modelo por título ou descrição..."
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {filteredModels.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nenhum modelo de formulário encontrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                Crie seu primeiro modelo de perguntas para enviar para seus alunos.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold cursor-pointer hover:bg-emerald-600"
              >
                + Criar Primeiro Modelo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((form) => (
                <div
                  key={form.publicId}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          form.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : form.status === "DRAFT"
                            ? "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-white/10"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {form.status === "PUBLISHED" ? "Publicado" : form.status === "DRAFT" ? "Rascunho" : "Arquivado"}
                      </span>

                      <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                        {form.questions?.length || 0} pergunta{form.questions?.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {form.title}
                    </h3>

                    {form.description && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span>{form.assignmentsCount || 0} enviados</span>
                      <span>{form.responsesCount || 0} respondidos</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAssign(form.publicId)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        Atribuir
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(form)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(form)}
                        title={form.status === "PUBLISHED" ? "Arquivar modelo" : "Publicar modelo"}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {form.status === "PUBLISHED" ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ENVIADOS / RESPOSTAS
         ========================================================================= */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {/* FILTERS BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                placeholder="Buscar por aluno, email ou formulário..."
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "ALL", label: "Todos" },
                  { id: "PENDING", label: `Pendentes (${pendingCount})` },
                  { id: "SUBMITTED", label: `Respondidos (${submittedCount})` },
                  { id: "REVIEWED", label: "Revisados" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                    statusFilter === tab.id
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-white/10 hover:border-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 space-y-3">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Nenhum formulário enviado encontrado com os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAssignments.map((assignment) => {
                const whatsappUrl =
                  assignment.studentPhone
                    ? buildWhatsAppUrl(
                        assignment.studentPhone,
                        `Olá, ${assignment.studentName}! Seu formulário "${assignment.formTitle}" está pronto para preenchimento no Trevo One: https://trevoone.com/consultoria/${consultancySlug}/formularios/${assignment.publicId}`
                      )
                    : null;

                return (
                  <div
                    key={assignment.publicId}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {assignment.studentName}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          ({assignment.studentEmail})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">
                          {assignment.formTitle}
                        </span>
                        {assignment.dueDate && (
                          <span>Prazo: {new Date(assignment.dueDate).toLocaleDateString("pt-BR")}</span>
                        )}
                        {assignment.submittedAt && (
                          <span>
                            Respondido em:{" "}
                            {new Date(assignment.submittedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {assignment.status === "PENDING" && whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px]"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Avisar no WhatsApp</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setReviewingAssignment(assignment)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                          assignment.status === "SUBMITTED"
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10"
                        }`}
                      >
                        <span>
                          {assignment.status === "SUBMITTED"
                            ? "Revisar Respostas"
                            : assignment.status === "REVIEWED"
                            ? "Ver Avaliação"
                            : "Detalhes"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {isBuilderOpen && (
        <FormBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          consultancySlug={consultancySlug}
          initialForm={editingForm}
          onSuccess={() => router.refresh()}
        />
      )}

      {isAssignOpen && (
        <AssignFormModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          consultancySlug={consultancySlug}
          forms={initialForms}
          students={students}
          preselectedFormPublicId={preselectedFormPublicId}
          onSuccess={() => router.refresh()}
        />
      )}

      {reviewingAssignment && (
        <FormReviewModal
          isOpen={Boolean(reviewingAssignment)}
          onClose={() => setReviewingAssignment(null)}
          consultancySlug={consultancySlug}
          assignment={reviewingAssignment}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
