"use client";

import React, { useState } from "react";
import {
  type CustomFormTemplateDto,
  type CustomFormRequestDto,
  type CustomFormFieldDefinition,
  type CustomFormFieldType,
} from "@/lib/consultancies/custom-forms";
import {
  createFormTemplateAction,
  requestFormForStudentAction,
  submitFormResponsesAction,
  reviewFormRequestAction,
  updateFormTemplateAction,
} from "@/app/consultoria/[slug]/formularios/actions";

interface StudentMemberOption {
  publicId: string;
  name: string;
  email: string;
}

interface CustomFormsHubProps {
  consultancySlug: string;
  isConsultancyAdmin: boolean;
  isProfessional: boolean;
  isStudent: boolean;
  initialTemplates: CustomFormTemplateDto[];
  initialRequests: CustomFormRequestDto[];
  studentOptions: StudentMemberOption[];
}

export function CustomFormsHub({
  consultancySlug,
  isConsultancyAdmin,
  isProfessional,
  isStudent,
  initialTemplates,
  initialRequests,
  studentOptions,
}: CustomFormsHubProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "templates">(
    isStudent ? "requests" : "requests"
  );
  const [requests, setRequests] = useState<CustomFormRequestDto[]>(initialRequests);
  const [templates, setTemplates] = useState<CustomFormTemplateDto[]>(initialTemplates);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequestToAnswer, setSelectedRequestToAnswer] = useState<CustomFormRequestDto | null>(null);
  const [selectedRequestToReview, setSelectedRequestToReview] = useState<CustomFormRequestDto | null>(null);

  // Template creation form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isOnboardingReq, setIsOnboardingReq] = useState(false);
  const [fields, setFields] = useState<CustomFormFieldDefinition[]>([
    { id: "f_1", type: "SHORT_TEXT", label: "Pergunta 1", required: true },
  ]);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Request assignment form state
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.publicId || "");
  const [selectedStudentId, setSelectedStudentId] = useState(studentOptions[0]?.publicId || "");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Student answer state
  const [formResponses, setFormResponses] = useState<Record<string, unknown>>({});
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // Review state
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const canManageTemplates = isConsultancyAdmin;
  const canRequestForms = isConsultancyAdmin || isProfessional;

  // Handlers for template builder
  const addField = (type: CustomFormFieldType) => {
    const id = `f_${Date.now()}_${fields.length + 1}`;
    const newField: CustomFormFieldDefinition = {
      id,
      type,
      label: type === "ACKNOWLEDGEMENT" ? "Concordância" : `Pergunta ${fields.length + 1}`,
      required: true,
      options: type === "SELECT" ? ["Opção 1", "Opção 2"] : undefined,
      acknowledgementText:
        type === "ACKNOWLEDGEMENT"
          ? "Declaro que li e concordo com os termos e orientações apresentados."
          : undefined,
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, patch: Partial<CustomFormFieldDefinition>) => {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setTemplateError("Informe o título do formulário.");
      return;
    }
    setIsSubmittingTemplate(true);
    setTemplateError(null);

    const res = await createFormTemplateAction(consultancySlug, {
      title: newTitle,
      description: newDescription || null,
      fields,
      isOnboardingRequired: isOnboardingReq,
    });

    setIsSubmittingTemplate(false);
    if (!res.success || !res.template) {
      setTemplateError(res.error || "Erro ao criar formulário.");
      return;
    }

    setTemplates([res.template, ...templates]);
    setShowCreateModal(false);
    setNewTitle("");
    setNewDescription("");
    setFields([{ id: "f_1", type: "SHORT_TEXT", label: "Pergunta 1", required: true }]);
  };

  const handleRequestForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedStudentId) {
      setRequestError("Selecione o modelo e o aluno.");
      return;
    }
    setIsSubmittingRequest(true);
    setRequestError(null);

    const res = await requestFormForStudentAction(
      consultancySlug,
      selectedTemplateId,
      selectedStudentId
    );

    setIsSubmittingRequest(false);
    if (!res.success || !res.request) {
      setRequestError(res.error || "Erro ao solicitar formulário.");
      return;
    }

    setRequests([res.request, ...requests]);
    setShowRequestModal(false);
  };

  const [draftLoadedNotice, setDraftLoadedNotice] = useState(false);

  const handleOpenAnswerModal = async (req: CustomFormRequestDto) => {
    setSelectedRequestToAnswer(req);
    setAnswerError(null);
    setDraftLoadedNotice(false);

    let base = req.responses || {};
    try {
      const { getFormDraft } = await import("@/lib/offline/offline-forms");
      const draft = await getFormDraft("student", consultancySlug, req.publicId);
      if (draft && draft.responses && Object.keys(draft.responses).length > 0) {
        base = { ...base, ...draft.responses };
        setDraftLoadedNotice(true);
      }
    } catch {
      // Ignore
    }
    setFormResponses(base);
  };

  const handleUpdateResponse = (fieldId: string, val: unknown) => {
    setFormResponses((prev) => {
      const updated = { ...prev, [fieldId]: val };
      if (selectedRequestToAnswer) {
        import("@/lib/offline/offline-forms")
          .then(({ saveFormDraft }) => {
            saveFormDraft({
              userPublicId: "student",
              consultancyPublicId: consultancySlug,
              requestPublicId: selectedRequestToAnswer.publicId,
              templatePublicId: selectedRequestToAnswer.templatePublicId,
              responses: updated,
            });
          })
          .catch(() => {});
      }
      return updated;
    });
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestToAnswer) return;

    // Check required fields
    for (const f of selectedRequestToAnswer.fields) {
      if (f.required) {
        const val = formResponses[f.id];
        if (val === undefined || val === null || val === "" || val === false) {
          setAnswerError(`O campo "${f.label}" é obrigatório.`);
          return;
        }
      }
    }

    setIsSubmittingAnswers(true);
    setAnswerError(null);

    // If offline, queue in pending_operations and clear draft
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const { queuePendingOperation } = await import("@/lib/offline/offline-sync");
        const { clearFormDraft } = await import("@/lib/offline/offline-forms");

        await queuePendingOperation({
          userPublicId: "student",
          consultancyPublicId: consultancySlug,
          consultancySlug,
          entityType: "FORM_SUBMISSION",
          entityId: selectedRequestToAnswer.publicId,
          operationType: "SUBMIT_FORM",
          payload: {
            requestPublicId: selectedRequestToAnswer.publicId,
            responses: formResponses,
          },
        });

        await clearFormDraft("student", consultancySlug, selectedRequestToAnswer.publicId);

        setRequests(
          requests.map((r) =>
            r.publicId === selectedRequestToAnswer.publicId
              ? { ...r, status: "SUBMITTED", responses: formResponses, submittedAt: new Date().toISOString() }
              : r
          )
        );
        setSelectedRequestToAnswer(null);
        setIsSubmittingAnswers(false);
        return;
      } catch {
        // Fall through
      }
    }

    try {
      const res = await submitFormResponsesAction(
        consultancySlug,
        selectedRequestToAnswer.publicId,
        { responses: formResponses }
      );

      if (!res.success) {
        setAnswerError(res.error || "Erro ao enviar respostas.");
        return;
      }

      // Clear draft on successful submission
      try {
        const { clearFormDraft } = await import("@/lib/offline/offline-forms");
        await clearFormDraft("student", consultancySlug, selectedRequestToAnswer.publicId);
      } catch {
        // Ignore
      }

      setRequests(
        requests.map((r) =>
          r.publicId === selectedRequestToAnswer.publicId
            ? { ...r, status: "SUBMITTED", responses: formResponses, submittedAt: new Date().toISOString() }
            : r
        )
      );
      setSelectedRequestToAnswer(null);
    } catch {
      // Offline fallback on connection drop
      try {
        const { queuePendingOperation } = await import("@/lib/offline/offline-sync");
        const { clearFormDraft } = await import("@/lib/offline/offline-forms");

        await queuePendingOperation({
          userPublicId: "student",
          consultancyPublicId: consultancySlug,
          consultancySlug,
          entityType: "FORM_SUBMISSION",
          entityId: selectedRequestToAnswer.publicId,
          operationType: "SUBMIT_FORM",
          payload: {
            requestPublicId: selectedRequestToAnswer.publicId,
            responses: formResponses,
          },
        });

        await clearFormDraft("student", consultancySlug, selectedRequestToAnswer.publicId);

        setRequests(
          requests.map((r) =>
            r.publicId === selectedRequestToAnswer.publicId
              ? { ...r, status: "SUBMITTED", responses: formResponses, submittedAt: new Date().toISOString() }
              : r
          )
        );
        setSelectedRequestToAnswer(null);
        return;
      } catch {
        // Continue
      }
      setAnswerError("Erro de conexão ao enviar respostas.");
    } finally {
      setIsSubmittingAnswers(false);
    }
  };

  const handleReviewSubmission = async (decision: "APPROVE" | "REQUEST_CHANGES") => {
    if (!selectedRequestToReview) return;
    setIsSubmittingReview(true);
    setReviewError(null);

    const res = await reviewFormRequestAction(
      consultancySlug,
      selectedRequestToReview.publicId,
      { decision, notes: reviewNotes || null }
    );

    setIsSubmittingReview(false);
    if (!res.success) {
      setReviewError(res.error || "Erro ao registrar avaliação.");
      return;
    }

    const newStatus = decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
    setRequests(
      requests.map((r) =>
        r.publicId === selectedRequestToReview.publicId
          ? {
              ...r,
              status: newStatus,
              reviewerNotes: reviewNotes || null,
              reviewedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setSelectedRequestToReview(null);
    setReviewNotes("");
  };

  const handleToggleTemplateActive = async (tpl: CustomFormTemplateDto) => {
    const nextState = !tpl.isActive;
    const res = await updateFormTemplateAction(consultancySlug, tpl.publicId, {
      isActive: nextState,
    });
    if (res.success) {
      setTemplates(
        templates.map((t) => (t.publicId === tpl.publicId ? { ...t, isActive: nextState } : t))
      );
    }
  };

  const getStatusBadge = (status: CustomFormRequestDto["status"]) => {
    switch (status) {
      case "PENDING":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">Pendente</span>;
      case "SUBMITTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">Sob Análise</span>;
      case "CHANGES_REQUESTED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">Ajustes Solicitados</span>;
      case "APPROVED":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Aprovado</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Formulários da Consultoria
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {isStudent
              ? "Preencha e acompanhe seus formulários e questionários solicitados."
              : "Gerencie modelos personalizados, solicite respostas e valide informações dos alunos."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRequestForms && (
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="px-3.5 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0 sm:py-2"
            >
              <svg className="w-4 h-4 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Solicitar a Aluno</span>
            </button>
          )}

          {canManageTemplates && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px] sm:min-h-0 sm:py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Criar Modelo</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!isStudent && (
        <div className="flex border-b border-[var(--border-subtle)] gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 px-3 ${
              activeTab === "requests"
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Solicitações e Respostas ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer min-h-[44px] sm:min-h-0 px-3 ${
              activeTab === "templates"
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Modelos de Formulários ({templates.length})
          </button>
        </div>
      )}

      {/* Requests Section */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Nenhum formulário registrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isStudent
                  ? "Você não possui formulários pendentes ou preenchidos no momento."
                  : "Nenhuma solicitação de formulário enviada ainda."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {requests.map((req) => (
                <div
                  key={req.publicId}
                  className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--border-default)] transition-colors depth-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        {req.templateTitle}
                      </h3>
                      {getStatusBadge(req.status)}
                    </div>

                    {!isStudent && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Aluno: <strong className="text-[var(--text-primary)]">{req.studentName}</strong> • Solicitado por: {req.requestedByName}
                      </p>
                    )}

                    {req.reviewerNotes && (
                      <div className="mt-2 text-xs p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl">
                        <strong>Observação da consultoria:</strong> {req.reviewerNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Student actions */}
                    {isStudent && (req.status === "PENDING" || req.status === "CHANGES_REQUESTED") && (
                      <button
                        type="button"
                        onClick={() => handleOpenAnswerModal(req)}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-0 sm:py-2"
                      >
                        {req.status === "CHANGES_REQUESTED" ? "Corrigir e Reenviar" : "Preencher Formulário"}
                      </button>
                    )}

                    {/* Reviewer actions */}
                    {!isStudent && req.status === "SUBMITTED" && (
                      <button
                        type="button"
                        onClick={() => setSelectedRequestToReview(req)}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-0 sm:py-2"
                      >
                        Avaliar Respostas
                      </button>
                    )}

                    {/* View answers */}
                    {req.responses && req.status !== "PENDING" && (
                      <button
                        type="button"
                        onClick={() => setSelectedRequestToReview(req)}
                        className="w-full sm:w-auto px-3 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded-xl text-xs font-semibold border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[44px] sm:min-h-0 sm:py-2"
                      >
                        Visualizar Respostas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Section */}
      {!isStudent && activeTab === "templates" && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Nenhum modelo cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Crie modelos de questionários, anamneses ou termos para solicitar aos seus alunos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.publicId}
                  className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 depth-card"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        {tpl.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          tpl.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}
                      >
                        {tpl.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    {tpl.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                        {tpl.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-2 text-[11px] text-[var(--text-tertiary)]">
                      <span>{tpl.fields.length} perguntas</span>
                      {tpl.isOnboardingRequired && (
                        <span className="text-emerald-600 font-semibold">• Obrigatório no Onboarding</span>
                      )}
                    </div>
                  </div>

                  {canManageTemplates && (
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => handleToggleTemplateActive(tpl)}
                        className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] sm:min-h-0 py-1"
                      >
                        {tpl.isActive ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.publicId);
                          setShowRequestModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[44px] sm:min-h-0"
                      >
                        Solicitar a Aluno
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Criar Modelo de Formulário</h2>
                <p className="text-xs text-[var(--text-secondary)]">Defina as perguntas e tipos de resposta</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {templateError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs">
                  {templateError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Título do Formulário *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Anamnese Inicial, Avaliação de Hábitos..."
                  className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Instruções / Descrição</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Orientações ao aluno sobre o preenchimento..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="onboardingCheck"
                  checked={isOnboardingReq}
                  onChange={(e) => setIsOnboardingReq(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="onboardingCheck" className="text-xs font-medium text-[var(--text-secondary)]">
                  Exigir preenchimento durante o Onboarding do Aluno
                </label>
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Perguntas e Campos ({fields.length})
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addField("SHORT_TEXT")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => addField("LONG_TEXT")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Parágrafo
                    </button>
                    <button
                      type="button"
                      onClick={() => addField("NUMBER")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Número
                    </button>
                    <button
                      type="button"
                      onClick={() => addField("DATE")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Data
                    </button>
                    <button
                      type="button"
                      onClick={() => addField("BOOLEAN")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Sim/Não
                    </button>
                    <button
                      type="button"
                      onClick={() => addField("ACKNOWLEDGEMENT")}
                      className="px-2 py-1 bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold"
                    >
                      + Ciência
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[var(--text-primary)]">
                          #{idx + 1} ({field.type})
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeField(idx)}
                            className="text-rose-500 hover:text-rose-700 font-semibold p-1"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="Pergunta / Rótulo"
                        className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-primary)]"
                        required
                      />

                      {field.type === "ACKNOWLEDGEMENT" && (
                        <textarea
                          value={field.acknowledgementText || ""}
                          onChange={(e) => updateField(idx, { acknowledgementText: e.target.value })}
                          placeholder="Texto de concordância para o aluno marcar..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-primary)]"
                        />
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`req_${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                          className="w-3.5 h-3.5 rounded-sm text-emerald-600"
                        />
                        <label htmlFor={`req_${field.id}`} className="text-[11px] text-[var(--text-secondary)]">
                          Resposta obrigatória
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl min-h-[44px] sm:min-h-0 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTemplate}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
                >
                  {isSubmittingTemplate ? "Salvando..." : "Salvar Modelo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST FORM MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Solicitar Formulário</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-4">
              O aluno receberá uma notificação e o formulário aparecerá como pendente.
            </p>

            {requestError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs">
                {requestError}
              </div>
            )}

            <form onSubmit={handleRequestForm} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Modelo</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                  required
                >
                  {templates.filter((t) => t.isActive).map((t) => (
                    <option key={t.publicId} value={t.publicId}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">Aluno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                  required
                >
                  {studentOptions.map((s) => (
                    <option key={s.publicId} value={s.publicId}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl min-h-[44px] sm:min-h-0 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
                >
                  {isSubmittingRequest ? "Enviando..." : "Enviar Solicitação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT ANSWER MODAL */}
      {selectedRequestToAnswer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {selectedRequestToAnswer.templateTitle}
                </h2>
                {selectedRequestToAnswer.templateDescription && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {selectedRequestToAnswer.templateDescription}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequestToAnswer(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAnswers} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {draftLoadedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                  <span>✓ Rascunho salvo neste dispositivo recuperado.</span>
                </div>
              )}

              {answerError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs">
                  {answerError}
                </div>
              )}

              {selectedRequestToAnswer.fields.map((f) => (
                <div key={f.id} className="space-y-1.5 p-3.5 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-subtle)]">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    <span>{f.label}</span>
                    {f.required && <span className="text-rose-500">*</span>}
                  </label>

                  {f.description && (
                    <p className="text-[11px] text-[var(--text-secondary)]">{f.description}</p>
                  )}

                  {/* Field Input by Type */}
                  {f.type === "SHORT_TEXT" && (
                    <input
                      type="text"
                      value={String(formResponses[f.id] || "")}
                      onChange={(e) => handleUpdateResponse(f.id, e.target.value)}
                      placeholder={f.placeholder || "Sua resposta..."}
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                      required={f.required}
                    />
                  )}

                  {f.type === "LONG_TEXT" && (
                    <textarea
                      value={String(formResponses[f.id] || "")}
                      onChange={(e) => handleUpdateResponse(f.id, e.target.value)}
                      placeholder={f.placeholder || "Escreva sua resposta detalhada..."}
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                      required={f.required}
                    />
                  )}

                  {f.type === "NUMBER" && (
                    <input
                      type="number"
                      value={String(formResponses[f.id] || "")}
                      onChange={(e) => handleUpdateResponse(f.id, Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                      required={f.required}
                    />
                  )}

                  {f.type === "DATE" && (
                    <input
                      type="date"
                      value={String(formResponses[f.id] || "")}
                      onChange={(e) => handleUpdateResponse(f.id, e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                      required={f.required}
                    />
                  )}

                  {f.type === "BOOLEAN" && (
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
                        <input
                          type="radio"
                          name={f.id}
                          checked={formResponses[f.id] === true}
                          onChange={() => handleUpdateResponse(f.id, true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Sim</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
                        <input
                          type="radio"
                          name={f.id}
                          checked={formResponses[f.id] === false}
                          onChange={() => handleUpdateResponse(f.id, false)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Não</span>
                      </label>
                    </div>
                  )}

                  {f.type === "ACKNOWLEDGEMENT" && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id={`ack_${f.id}`}
                        checked={Boolean(formResponses[f.id])}
                        onChange={(e) => handleUpdateResponse(f.id, e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded-sm text-emerald-600 focus:ring-emerald-500"
                        required={f.required}
                      />
                      <label htmlFor={`ack_${f.id}`} className="text-xs text-[var(--text-secondary)] leading-relaxed cursor-pointer">
                        {f.acknowledgementText || "Estou ciente e concordo com as orientações."}
                      </label>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Salvo neste dispositivo
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestToAnswer(null)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl min-h-[44px] sm:min-h-0 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAnswers}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
                  >
                    {isSubmittingAnswers ? "Enviando..." : "Enviar Respostas"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW RESPONSES MODAL */}
      {selectedRequestToReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Respostas: {selectedRequestToReview.templateTitle}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aluno: {selectedRequestToReview.studentName} ({selectedRequestToReview.studentEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequestToReview(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {reviewError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs">
                  {reviewError}
                </div>
              )}

              {/* Read-only responses */}
              <div className="space-y-3">
                {selectedRequestToReview.fields.map((f) => {
                  const val = selectedRequestToReview.responses?.[f.id];
                  let displayVal = "—";
                  if (typeof val === "boolean") {
                    displayVal = val ? "Sim / Concordo" : "Não";
                  } else if (val !== undefined && val !== null && val !== "") {
                    displayVal = String(val);
                  }

                  return (
                    <div key={f.id} className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-subtle)] text-xs space-y-1">
                      <div className="font-semibold text-[var(--text-secondary)]">{f.label}</div>
                      <div className="text-sm font-medium text-[var(--text-primary)] whitespace-pre-line">
                        {displayVal}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Review notes & actions only if reviewer can review */}
              {!isStudent && selectedRequestToReview.status === "SUBMITTED" && (
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Observações / Feedback ao Aluno
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Indique orientações adicionais ou o motivo caso solicite alterações..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={() => handleReviewSubmission("REQUEST_CHANGES")}
                      className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 rounded-xl text-xs font-semibold border border-rose-500/20 transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
                    >
                      Solicitar Ajustes
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={() => handleReviewSubmission("APPROVE")}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
                    >
                      Aprovar Formulário
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
