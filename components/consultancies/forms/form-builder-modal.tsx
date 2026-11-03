"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type {
  ConsultancyFormDto,
  FormQuestionDefinition,
  FormQuestionType,
} from "@/lib/consultancies/forms";
import {
  createFormAction,
  updateFormAction,
  publishFormAction,
  assignFormAction,
} from "@/app/consultoria/[slug]/formularios/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  initialForm?: ConsultancyFormDto | null;
  autoAssignStudent?: {
    membershipPublicId: string;
    name: string;
  } | null;
  onSuccess: () => void;
}

const QUESTION_TYPES: { id: FormQuestionType; label: string; desc: string }[] = [
  { id: "SHORT_TEXT", label: "Texto curto", desc: "Linha única para respostas breves" },
  { id: "LONG_TEXT", label: "Texto longo", desc: "Parágrafo detalhado ou observações" },
  { id: "SINGLE_CHOICE", label: "Escolha única", desc: "Aluno seleciona apenas uma opção" },
  { id: "MULTIPLE_CHOICE", label: "Múltipla escolha", desc: "Aluno pode marcar várias opções" },
  { id: "SCALE", label: "Escala (0 a 10)", desc: "Nota de avaliação ou percepção" },
  { id: "DATE", label: "Data", desc: "Seleção de data no calendário" },
  { id: "FILE_UPLOAD", label: "Envio de arquivo", desc: "Foto, exame, PDF ou documento" },
];

export function FormBuilderModal({
  isOpen,
  onClose,
  consultancySlug,
  initialForm,
  autoAssignStudent,
  onSuccess,
}: FormBuilderModalProps) {
  const isMounted = useIsMounted();
  const isEditing = Boolean(initialForm);

  const [title, setTitle] = useState(initialForm?.title || "");
  const [description, setDescription] = useState(initialForm?.description || "");
  const [questions, setQuestions] = useState<FormQuestionDefinition[]>(() => {
    if (initialForm?.questions && initialForm.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialForm.questions));
    }
    return [
      {
        id: "q_1",
        title: "Como você avalia sua rotina de treinos esta semana?",
        type: "SCALE",
        required: true,
        scaleMin: 0,
        scaleMax: 10,
        scaleMinLabel: "Péssimo",
        scaleMaxLabel: "Excelente",
      },
    ];
  });

  const [fieldErrors, setFieldErrors] = useState<{ title?: string; questions?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  if (!isMounted || !isOpen) return null;

  function handleAddQuestion() {
    const newId = `q_${Date.now()}`;
    const newQ: FormQuestionDefinition = {
      id: newId,
      title: "",
      type: "SHORT_TEXT",
      required: false,
    };
    setQuestions((prev) => [...prev, newQ]);
    if (fieldErrors.questions) {
      setFieldErrors((prev) => ({ ...prev, questions: undefined }));
    }
  }

  function handleRemoveQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleMoveQuestion(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  function handleUpdateQuestion(index: number, updates: Partial<FormQuestionDefinition>) {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  }

  function handleAddChoiceOption(qIndex: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const currentOpts = q.options || [];
      const newOpt = {
        id: `opt_${Date.now()}`,
        label: `Opção ${currentOpts.length + 1}`,
      };
      copy[qIndex] = { ...q, options: [...currentOpts, newOpt] };
      return copy;
    });
  }

  function handleUpdateChoiceOption(qIndex: number, optIndex: number, label: string) {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const currentOpts = [...(q.options || [])];
      currentOpts[optIndex] = { ...currentOpts[optIndex], label };
      copy[qIndex] = { ...q, options: currentOpts };
      return copy;
    });
  }

  function handleRemoveChoiceOption(qIndex: number, optIndex: number) {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const currentOpts = (q.options || []).filter((_, i) => i !== optIndex);
      copy[qIndex] = { ...q, options: currentOpts };
      return copy;
    });
  }

  function validate(): boolean {
    const errors: { title?: string; questions?: string } = {};
    if (!title.trim()) {
      errors.title = "Informe o título do formulário.";
    }
    if (questions.length === 0) {
      errors.questions = "Adicione ao menos uma pergunta ao formulário.";
    } else {
      const emptyQuestion = questions.some((q) => !q.title.trim());
      if (emptyQuestion) {
        errors.questions = "Todas as perguntas devem ter um enunciado preenchido.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSave(publishImmediately: boolean) {
    if (!validate()) return;
    setGlobalError(null);

    startTransition(async () => {
      try {
        if (isEditing && initialForm) {
          const updateRes = await updateFormAction(consultancySlug, initialForm.publicId, {
            title: title.trim(),
            description: description.trim() || null,
            questions,
            status: publishImmediately ? "PUBLISHED" : undefined,
          });

          if (!updateRes.success) {
            setGlobalError(updateRes.error || "Erro ao salvar alterações.");
            return;
          }
        } else {
          const createRes = await createFormAction(consultancySlug, {
            title: title.trim(),
            description: description.trim() || null,
            questions,
          });

          if (!createRes.success || !createRes.form) {
            setGlobalError(createRes.error || "Erro ao criar formulário.");
            return;
          }

          if (publishImmediately) {
            await publishFormAction(consultancySlug, createRes.form.publicId);
          }

          if (autoAssignStudent) {
            await assignFormAction(consultancySlug, {
              formPublicId: createRes.form.publicId,
              studentMembershipPublicIds: [autoAssignStudent.membershipPublicId],
            });
          }
        }

        onSuccess();
        onClose();
      } catch (err: unknown) {
        setGlobalError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    });
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
        aria-labelledby="form-builder-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white dark:bg-[#151619]">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* HEADER */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              {isEditing ? "Edição de Formulário" : "Novo Formulário Personalizado"}
            </span>
            <h2
              id="form-builder-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5"
            >
              {isEditing ? `Editar: ${initialForm?.title}` : "Criar Modelo de Formulário"}
            </h2>
            {autoAssignStudent && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                ● Atribuindo automaticamente para: <span className="font-bold underline">{autoAssignStudent.name}</span>
              </p>
            )}
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

          {/* BASIC INFORMATION */}
          <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <div>
              <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block mb-1.5">
                Título do Formulário <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="Ex: Check-in Semanal de Evolução, Anamnese Inicial..."
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl bg-white dark:bg-white/5 border text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden transition-colors min-h-[48px] ${
                  fieldErrors.title
                    ? "border-rose-500 ring-1 ring-rose-500/20"
                    : "border-slate-200 dark:border-white/10 focus:border-emerald-500"
                }`}
              />
              {fieldErrors.title && (
                <p className="text-xs text-rose-500 mt-1 font-semibold">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <label className="text-sm sm:text-xs font-bold text-slate-800 dark:text-zinc-200 block mb-1.5">
                Instruções / Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Explique o objetivo deste formulário ou dê orientações para o preenchimento..."
                className="w-full px-4 py-3 sm:py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[80px]"
              />
            </div>
          </div>

          {/* QUESTIONS LIST */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Perguntas ({questions.length})
                </h3>
                <p className="text-xs sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure as perguntas e o tipo de resposta esperado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-sm sm:text-xs font-bold transition-all cursor-pointer min-h-[48px] sm:min-h-[38px] shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Adicionar Pergunta</span>
              </button>
            </div>

            {fieldErrors.questions && (
              <p className="text-xs text-rose-500 font-semibold">{fieldErrors.questions}</p>
            )}

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1a1c20] border border-slate-200 dark:border-white/10 shadow-xs space-y-4 transition-all"
                >
                  {/* QUESTION TOP BAR */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs sm:text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        Pergunta #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "up")}
                        disabled={idx === 0}
                        title="Mover para cima"
                        className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, "down")}
                        disabled={idx === questions.length - 1}
                        title="Mover para baixo"
                        className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        title="Remover pergunta"
                        className="p-2 sm:p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* QUESTION TITLE & TYPE (GRID EMPILHADO NO MOBILE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-2.5">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
                        Enunciado da pergunta
                      </label>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => handleUpdateQuestion(idx, { title: e.target.value })}
                        placeholder="Digite o texto da pergunta..."
                        className="w-full px-4 py-3 sm:py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium focus:outline-hidden focus:border-emerald-500 min-h-[48px] sm:min-h-[40px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
                        Tipo de resposta
                      </label>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value as FormQuestionType;
                          const updates: Partial<FormQuestionDefinition> = { type: newType };
                          if (newType === "SINGLE_CHOICE" || newType === "MULTIPLE_CHOICE") {
                            if (!q.options || q.options.length === 0) {
                              updates.options = [
                                { id: "opt_1", label: "Opção 1" },
                                { id: "opt_2", label: "Opção 2" },
                              ];
                            }
                          } else if (newType === "SCALE") {
                            updates.scaleMin = 0;
                            updates.scaleMax = 10;
                            updates.scaleMinLabel = "Péssimo";
                            updates.scaleMaxLabel = "Excelente";
                          }
                          handleUpdateQuestion(idx, updates);
                        }}
                        className="w-full px-4 py-3 sm:py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 cursor-pointer min-h-[48px] sm:min-h-[40px]"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* REQUIRED TOGGLE */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[32px]">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => handleUpdateQuestion(idx, { required: e.target.checked })}
                        className="w-5 h-5 rounded-md text-emerald-500 focus:ring-emerald-500 border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 cursor-pointer"
                      />
                      <span className="text-sm sm:text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Resposta obrigatória
                      </span>
                    </label>

                    <span className="text-xs sm:text-[10px] text-slate-500 dark:text-zinc-400">
                      {QUESTION_TYPES.find((t) => t.id === q.type)?.desc}
                    </span>
                  </div>

                  {/* EXTRA CONFIG: CHOICES */}
                  {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                    <div className="p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3 mt-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                        Opções de seleção:
                      </span>
                      <div className="space-y-2">
                        {(q.options || []).map((opt, optIdx) => (
                          <div key={opt.id || optIdx} className="flex items-center gap-2">
                            <span className="w-5 text-center text-xs sm:text-[10px] text-slate-400 dark:text-zinc-500 font-semibold shrink-0">
                              {optIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => handleUpdateChoiceOption(idx, optIdx, e.target.value)}
                              placeholder={`Opção ${optIdx + 1}`}
                              className="flex-1 px-3.5 py-3 sm:py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 min-h-[48px] sm:min-h-[38px]"
                            />
                            {(q.options?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveChoiceOption(idx, optIdx)}
                                className="p-2.5 text-slate-400 hover:text-rose-500 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddChoiceOption(idx)}
                        className="text-sm sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5 mt-1 cursor-pointer min-h-[40px]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Adicionar opção</span>
                      </button>
                    </div>
                  )}

                  {/* EXTRA CONFIG: SCALE (EMPILHADO NO MOBILE) */}
                  {q.type === "SCALE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl sm:rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 mt-3">
                      <div className="space-y-1">
                        <label className="text-xs sm:text-[10px] font-semibold text-slate-700 dark:text-zinc-300 block">
                          Rótulo nota mínima (0)
                        </label>
                        <input
                          type="text"
                          value={q.scaleMinLabel || ""}
                          onChange={(e) => handleUpdateQuestion(idx, { scaleMinLabel: e.target.value })}
                          placeholder="Ex: Péssimo / Fraco"
                          className="w-full px-3.5 py-3 sm:py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden min-h-[48px] sm:min-h-[38px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs sm:text-[10px] font-semibold text-slate-700 dark:text-zinc-300 block">
                          Rótulo nota máxima (10)
                        </label>
                        <input
                          type="text"
                          value={q.scaleMaxLabel || ""}
                          onChange={(e) => handleUpdateQuestion(idx, { scaleMaxLabel: e.target.value })}
                          placeholder="Ex: Excelente / Forte"
                          className="w-full px-3.5 py-3 sm:py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-base sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden min-h-[48px] sm:min-h-[38px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STICKY FOOTER (EMPILHADO EM MOBILE COM AÇÃO PRIMÁRIA NO TOPO) */}
        <div className="sticky bottom-0 shrink-0 bg-white/95 dark:bg-[#151619]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 z-10">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-3 px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{isSubmitting ? "Publicando..." : isEditing ? "Salvar e Publicar" : "Publicar Modelo"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-2 px-4 py-3 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-sm sm:text-xs font-bold text-slate-900 dark:text-white transition-all cursor-pointer min-h-[48px] disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
          >
            {isSubmitting ? "Salvando..." : "Salvar Rascunho"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-1 px-4 py-3 sm:py-2.5 rounded-xl bg-transparent sm:bg-slate-100 sm:dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-sm sm:text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[48px] flex items-center justify-center whitespace-nowrap"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
