"use client";

import React, { useState, useRef, useTransition, useSyncExternalStore, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type {
  FormTemplateSummary,
  StudentFormFieldItem,
} from "@/lib/consultancies/personal-student-hub";
import { saveAndSendOrFillFormAction } from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
import type { CustomFormFieldType } from "@/lib/consultancies/custom-forms";

export interface IntakeFormEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  isAnamnesis?: boolean;
  availableTemplates?: FormTemplateSummary[];
  defaultFields?: StudentFormFieldItem[];
  defaultTitle?: string;
  defaultDescription?: string;
  onSuccess?: (requestPublicId?: string) => void;
}

const DEFAULT_ANAMNESIS_FIELDS: StudentFormFieldItem[] = [
  { id: "q1", label: "Histórico médico e cirurgias prévias", type: "LONG_TEXT", required: true },
  { id: "q2", label: "Possui dores ou limitações articulares?", type: "YES_NO", required: true },
  { id: "q3", label: "Uso contínuo de medicamentos", type: "SHORT_TEXT", required: false },
  { id: "q4", label: "Frequência atual de atividade física", type: "SELECT", options: ["Sedentário", "1 a 2x/semana", "3 a 4x/semana", "5x ou mais"], required: true },
  { id: "q5", label: "Objetivo principal com os treinos", type: "SHORT_TEXT", required: true },
  { id: "q6", label: "Restrições alimentares ou alergias", type: "SHORT_TEXT", required: false },
];

const DEFAULT_FORM_FIELDS: StudentFormFieldItem[] = [
  { id: "f1", label: "Como você avalia sua consistência nos treinos esta semana?", type: "SELECT", options: ["Excelente (100%)", "Boa (70-90%)", "Regular (50-70%)", "Abaixo do esperado (<50%)"], required: true },
  { id: "f2", label: "Nível médio de energia e disposição no dia a dia", type: "SELECT", options: ["Muito alto", "Bom", "Médio", "Cansado / Baixo"], required: true },
  { id: "f3", label: "Observações, dificuldades ou ajustes necessários", type: "LONG_TEXT", required: false },
];

export function IntakeFormEditorDialog({
  isOpen,
  onClose,
  consultancySlug,
  studentPublicId,
  studentName,
  isAnamnesis = true,
  availableTemplates = [],
  defaultFields,
  defaultTitle,
  defaultDescription,
  onSuccess,
}: IntakeFormEditorDialogProps) {
  const initialFields = defaultFields || (isAnamnesis ? DEFAULT_ANAMNESIS_FIELDS : DEFAULT_FORM_FIELDS);
  const initialTitle = defaultTitle || (isAnamnesis ? "Anamnese & Histórico Clínico" : "Check-in & Acompanhamento");

  // Step state: 'CHOOSE_SOURCE' | 'EDIT' | 'PREVIEW' | 'DESTINATION' | 'FILL_NOW'
  const [step, setStep] = useState<"CHOOSE_SOURCE" | "EDIT" | "PREVIEW" | "DESTINATION" | "FILL_NOW">(() =>
    availableTemplates.length > 0 ? "CHOOSE_SOURCE" : "EDIT"
  );

  // Template / Source
  const [selectedSourceType, setSelectedSourceType] = useState<"TEMPLATE" | "SCRATCH">(
    availableTemplates.length > 0 ? "TEMPLATE" : "SCRATCH"
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (availableTemplates.length === 0) return "";
    const matchingTpl = availableTemplates.find((t) => (isAnamnesis ? t.isAnamnesis : !t.isAnamnesis));
    return matchingTpl ? matchingTpl.publicId : (availableTemplates[0]?.publicId || "");
  });
  const [originLabel, setOriginLabel] = useState<string>("Criado do zero");

  // Document Fields
  const [formTitle, setFormTitle] = useState(initialTitle);
  const [formDesc, setFormDesc] = useState(defaultDescription || "");
  const [builderFields, setBuilderFields] = useState<StudentFormFieldItem[]>(initialFields);

  // Dirty tracking for safety
  const isDirtyRef = useRef(false);

  // Answers State for "FILL_NOW"
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});

  // Submission state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  // Reference for newly added question focus
  const lastAddedQuestionRef = useRef<HTMLTextAreaElement | null>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  const handleSafeClose = useCallback(() => {
    if (isSubmitting) return;
    if (isDirtyRef.current) {
      const confirmDiscard = window.confirm("Deseja fechar o editor? As alterações não salvas serão perdidas.");
      if (!confirmDiscard) return;
    }
    isDirtyRef.current = false;
    onClose();
  }, [isSubmitting, onClose]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSafeClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleSafeClose]);

  if (!isOpen || !mounted) return null;

  // Step 1: Proceed from Source Selection to Editor
  const handleProceedToEdit = () => {
    setErrorMessage(null);
    if (selectedSourceType === "TEMPLATE") {
      const tpl = availableTemplates.find((t) => t.publicId === selectedTemplateId);
      if (tpl) {
        setFormTitle(tpl.title);
        setFormDesc(tpl.description || "");
        setBuilderFields(
          tpl.fields && tpl.fields.length > 0
            ? JSON.parse(JSON.stringify(tpl.fields))
            : initialFields
        );
        setOriginLabel(`Modelo "${tpl.title}"`);
      } else {
        setOriginLabel("Criado do zero");
      }
    } else {
      setOriginLabel("Criado do zero");
    }
    setStep("EDIT");
  };

  // Switch Model Button with Unsaved Guard
  const handleSwitchModel = () => {
    if (isDirtyRef.current) {
      const confirmSwitch = window.confirm("Trocar de modelo descartará as perguntas editadas atualmente. Deseja continuar?");
      if (!confirmSwitch) return;
    }
    isDirtyRef.current = false;
    setStep("CHOOSE_SOURCE");
  };

  // Add Question
  const handleAddQuestion = () => {
    isDirtyRef.current = true;
    const newId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newQuestion: StudentFormFieldItem = {
      id: newId,
      label: "",
      type: "SHORT_TEXT",
      required: false,
    };
    setBuilderFields((prev) => [...prev, newQuestion]);

    // Request auto focus on the new question
    setTimeout(() => {
      if (lastAddedQuestionRef.current) {
        lastAddedQuestionRef.current.focus();
        lastAddedQuestionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (idx: number) => {
    isDirtyRef.current = true;
    const source = builderFields[idx];
    const duplicated: StudentFormFieldItem = {
      ...JSON.parse(JSON.stringify(source)),
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: source.label ? `${source.label} (Cópia)` : "",
    };
    const clone = [...builderFields];
    clone.splice(idx + 1, 0, duplicated);
    setBuilderFields(clone);
  };

  // Remove Question
  const handleRemoveQuestion = (id: string) => {
    if (builderFields.length <= 1) {
      setErrorMessage("O documento precisa ter pelo menos uma pergunta.");
      return;
    }
    isDirtyRef.current = true;
    setBuilderFields((prev) => prev.filter((q) => q.id !== id));
  };

  // Move Question Up / Down
  const handleMoveQuestion = (idx: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= builderFields.length) return;
    isDirtyRef.current = true;
    const clone = [...builderFields];
    const temp = clone[idx];
    clone[idx] = clone[targetIdx];
    clone[targetIdx] = temp;
    setBuilderFields(clone);
  };

  // Update Question Field
  const handleUpdateQuestion = (id: string, updates: Partial<StudentFormFieldItem>) => {
    isDirtyRef.current = true;
    setBuilderFields((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updates };
        // If type changed to SELECT and has no options, give defaults
        if (updates.type === "SELECT" && (!updated.options || updated.options.length === 0)) {
          updated.options = ["Opção 1", "Opção 2"];
        }
        return updated;
      })
    );
  };

  // Option Operations for SELECT
  const handleAddOption = (questionId: string) => {
    isDirtyRef.current = true;
    setBuilderFields((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const opts = q.options ? [...q.options] : [];
        opts.push(`Opção ${opts.length + 1}`);
        return { ...q, options: opts };
      })
    );
  };

  const handleUpdateOption = (questionId: string, optIdx: number, val: string) => {
    isDirtyRef.current = true;
    setBuilderFields((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        const opts = [...q.options];
        opts[optIdx] = val;
        return { ...q, options: opts };
      })
    );
  };

  const handleRemoveOption = (questionId: string, optIdx: number) => {
    isDirtyRef.current = true;
    setBuilderFields((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || !q.options) return q;
        const opts = q.options.filter((_, i) => i !== optIdx);
        return { ...q, options: opts.length > 0 ? opts : ["Opção 1"] };
      })
    );
  };

  // Validate Questions before proceeding to Destination
  const handleValidateAndProceedToDestination = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formTitle.trim()) {
      setErrorMessage("Informe o título do documento.");
      return;
    }

    if (builderFields.length === 0) {
      setErrorMessage("Adicione pelo menos uma pergunta ao documento.");
      return;
    }

    const emptyQuestionIdx = builderFields.findIndex((q) => !q.label.trim());
    if (emptyQuestionIdx !== -1) {
      setErrorMessage(`A pergunta #${emptyQuestionIdx + 1} está com o enunciado em branco.`);
      return;
    }

    setStep("DESTINATION");
  };

  // Final Action Execution: "SEND_TO_STUDENT" or "FILL_WITH_STUDENT"
  const handleExecuteDestinationAction = (targetMode: "SEND_TO_STUDENT" | "FILL_WITH_STUDENT") => {
    setErrorMessage(null);

    if (targetMode === "FILL_WITH_STUDENT" && step !== "FILL_NOW") {
      // Initialize fill answers state and navigate to FILL_NOW screen
      const initialMap: Record<string, string> = {};
      builderFields.forEach((f) => {
        initialMap[f.id] = fillAnswers[f.id] || "";
      });
      setFillAnswers(initialMap);
      setStep("FILL_NOW");
      return;
    }

    startTransition(async () => {
      const payloadFields = builderFields.map((f) => ({
        id: f.id,
        label: f.label.trim(),
        type: (f.type === "YES_NO" ? "BOOLEAN" : f.type) as CustomFormFieldType,
        options: f.options,
        required: Boolean(f.required),
      }));

      const res = await saveAndSendOrFillFormAction(consultancySlug, studentPublicId, {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        fields: payloadFields,
        mode: targetMode,
        responses: targetMode === "FILL_WITH_STUDENT" ? fillAnswers : undefined,
        isAnamnesis,
      });

      if (res.success) {
        isDirtyRef.current = false;
        onClose();
        if (onSuccess) {
          onSuccess(res.requestPublicId);
        }
      } else {
        setErrorMessage(res.error || "Ocorreu um erro ao processar o formulário.");
      }
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-form-editor-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleSafeClose}
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:w-[90vw] sm:max-w-[1200px] bg-white dark:bg-[#151619] sm:border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================================
            HEADER COMPACTO (Título, Aluno, Ações Rápidas, Fechar)
            ===================================================================== */}
        <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div className="min-w-0 pr-4">
            <h2 id="intake-form-editor-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight truncate">
              {isAnamnesis ? "Nova Anamnese" : "Novo Formulário"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Aluno: <strong className="text-zinc-900 dark:text-white">{studentName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {step === "EDIT" && (
              <button
                type="button"
                onClick={() => setStep("PREVIEW")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer min-h-[44px]"
                title="Conferir prévia de visualização do aluno"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden sm:inline">Prévia</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSafeClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Fechar editor"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* =====================================================================
            CORPO DO EDITOR (Rolagem Principal Unificada, Largura Máxima ~900px)
            ===================================================================== */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {/* Coluna Centralizada de Leitura Confortável */}
          <div className="max-w-[900px] w-full mx-auto space-y-6">

            {/* Banner de Erro */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
                <span className="font-semibold">{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-xs underline hover:no-underline font-bold cursor-pointer"
                >
                  Dispensar
                </button>
              </div>
            )}

            {/* -------------------------------------------------------------
                ETAPA 1: ESCOLHA DA FONTE (Usar Modelo vs Criar do Zero)
                ------------------------------------------------------------- */}
            {step === "CHOOSE_SOURCE" && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    Como deseja iniciar {isAnamnesis ? "a anamnese" : "o formulário"}?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Selecione um modelo pronto da sua consultoria ou comece uma estrutura personalizada.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSourceType("TEMPLATE")}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer min-h-[100px] flex flex-col justify-between ${
                      selectedSourceType === "TEMPLATE"
                        ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Usar modelo</span>
                        {selectedSourceType === "TEMPLATE" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        Aproveite modelos estruturados de anamnese e check-in da consultoria para editar e personalizar.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSourceType("SCRATCH")}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer min-h-[100px] flex flex-col justify-between ${
                      selectedSourceType === "SCRATCH"
                        ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Criar do zero</span>
                        {selectedSourceType === "SCRATCH" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        Defina perguntas personalizadas em branco com total liberdade de formato.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Se escolheu modelo, exibe o seletor */}
                {selectedSourceType === "TEMPLATE" && (
                  <div className="space-y-2 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                    <label htmlFor="intake-template-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Modelo Disponível
                    </label>
                    <select
                      id="intake-template-select"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-900 dark:text-white min-h-[44px]"
                    >
                      {availableTemplates.map((t) => (
                        <option key={t.publicId} value={t.publicId}>
                          {t.title} ({t.fieldsCount} perguntas)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToEdit}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs min-h-[48px] flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continuar para o editor</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                ETAPA 2: EDITOR AMPLO DE PERGUNTAS (Sem botões de destino ocupando tela)
                ------------------------------------------------------------- */}
            {step === "EDIT" && (
              <form onSubmit={handleValidateAndProceedToDestination} className="space-y-6">
                {/* Indicação Compacta da Origem */}
                <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-zinc-500 dark:text-zinc-400">Origem:</span>
                    <strong className="text-zinc-900 dark:text-white truncate">{originLabel}</strong>
                  </div>
                  {availableTemplates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSwitchModel}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 min-h-[36px] flex items-center cursor-pointer"
                    >
                      Trocar modelo
                    </button>
                  )}
                </div>

                {/* Título e Instruções do Documento */}
                <div className="space-y-4 p-5 sm:p-6 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <label htmlFor="intake-form-title" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Título do Documento *
                    </label>
                    <input
                      id="intake-form-title"
                      type="text"
                      value={formTitle}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setFormTitle(e.target.value);
                      }}
                      required
                      placeholder="Ex: Anamnese Esportiva & Histórico Clínico"
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[48px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="intake-form-desc" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Instruções para o aluno (Opcional)
                    </label>
                    <textarea
                      id="intake-form-desc"
                      rows={3}
                      value={formDesc}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setFormDesc(e.target.value);
                      }}
                      placeholder="Ex: Responda com sinceridade a cada item para que possamos planejar suas prescrições com total segurança e precisão."
                      className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 leading-relaxed resize-y min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Lista de Perguntas (Sem caixa de rolagem interna!) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Perguntas ({builderFields.length})
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Organize o questionário, ajuste enunciados e defina os tipos de resposta.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition shadow-2xs min-h-[44px] cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Adicionar pergunta</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {builderFields.map((field, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === builderFields.length - 1;

                      return (
                        <div
                          key={field.id}
                          className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3.5 transition"
                        >
                          {/* Linha Superior: Identificação e Ações */}
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                              Pergunta {idx + 1}
                            </span>

                            {/* Controles de Ordenação e Ação com min 44x44px touch targets */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => handleMoveQuestion(idx, "UP")}
                                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                                title="Mover para cima"
                                aria-label={`Mover pergunta ${idx + 1} para cima`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => handleMoveQuestion(idx, "DOWN")}
                                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                                title="Mover para baixo"
                                aria-label={`Mover pergunta ${idx + 1} para baixo`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(idx)}
                                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center cursor-pointer"
                                title="Duplicar pergunta"
                                aria-label={`Duplicar pergunta ${idx + 1}`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                disabled={builderFields.length <= 1}
                                onClick={() => handleRemoveQuestion(field.id)}
                                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
                                title="Excluir pergunta"
                                aria-label={`Excluir pergunta ${idx + 1}`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Enunciado da Pergunta: Campo Amplo em Textarea */}
                          <div className="space-y-1">
                            <label htmlFor={`question-label-${field.id}`} className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                              Enunciado da pergunta *
                            </label>
                            <textarea
                              id={`question-label-${field.id}`}
                              ref={idx === builderFields.length - 1 ? lastAddedQuestionRef : null}
                              rows={2}
                              value={field.label}
                              onChange={(e) => handleUpdateQuestion(field.id, { label: e.target.value })}
                              placeholder="Digite o enunciado completo da pergunta..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 leading-relaxed resize-y min-h-[64px]"
                              required
                            />
                          </div>

                          {/* Linha Inferior: Tipo de Resposta e Obrigatória (Separados, sem competir em linha estreita) */}
                          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <label htmlFor={`question-type-${field.id}`} className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                                Tipo de resposta:
                              </label>
                              <select
                                id={`question-type-${field.id}`}
                                value={field.type}
                                onChange={(e) => handleUpdateQuestion(field.id, { type: e.target.value })}
                                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 min-h-[44px]"
                              >
                                <option value="LONG_TEXT">Texto Longo (parágrafo)</option>
                                <option value="SHORT_TEXT">Texto Curto (uma linha)</option>
                                <option value="YES_NO">Sim / Não (booleano)</option>
                                <option value="SELECT">Seleção Única (alternativas)</option>
                                <option value="NUMBER">Número</option>
                                <option value="DATE">Data</option>
                              </select>
                            </div>

                            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300 min-h-[44px] select-none">
                              <input
                                type="checkbox"
                                checked={Boolean(field.required)}
                                onChange={(e) => handleUpdateQuestion(field.id, { required: e.target.checked })}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                              />
                              <span>Resposta obrigatória</span>
                            </label>
                          </div>

                          {/* Seção de Alternativas quando o tipo for SELECT */}
                          {field.type === "SELECT" && (
                            <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2.5 bg-white/60 dark:bg-zinc-900/40 p-3.5 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                  Alternativas de Escolha
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(field.id)}
                                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[36px] flex items-center cursor-pointer"
                                >
                                  + Adicionar alternativa
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(field.options || ["Opção 1", "Opção 2"]).map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 font-mono w-5 shrink-0">
                                      {oIdx + 1}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdateOption(field.id, oIdx, e.target.value)}
                                      placeholder={`Texto da alternativa ${oIdx + 1}...`}
                                      className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs text-zinc-900 dark:text-white min-h-[44px]"
                                    />
                                    <button
                                      type="button"
                                      disabled={(field.options || []).length <= 1}
                                      onClick={() => handleRemoveOption(field.id, oIdx)}
                                      className="min-h-[44px] min-w-[44px] p-2 text-zinc-400 hover:text-rose-500 rounded-xl transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                                      title="Remover alternativa"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Botão de Adicionar ao Final */}
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-3.5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 rounded-2xl font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Adicionar outra pergunta</span>
                  </button>
                </div>

                {/* Footer do Editor */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] cursor-pointer order-2 sm:order-1"
                  >
                    Cancelar
                  </button>

                  <div className="flex items-center gap-3 justify-end order-1 sm:order-2">
                    <button
                      type="button"
                      onClick={() => setStep("PREVIEW")}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 min-h-[48px] cursor-pointer"
                    >
                      Prévia do aluno
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs min-h-[48px] flex items-center gap-2 cursor-pointer"
                    >
                      <span>Revisar e avançar</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* -------------------------------------------------------------
                ETAPA 3: DESTINO E REVISÃO (Enviar para Aluno vs Preencher Agora)
                ------------------------------------------------------------- */}
            {step === "DESTINATION" && (
              <div className="space-y-6 py-2">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    Revisão e Destino do Documento
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Confira os dados principais antes de confirmar o envio ou o preenchimento.
                  </p>
                </div>

                {/* Card de Resumo do Documento */}
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Título da {isAnamnesis ? "Anamnese" : "Avaliação"}
                      </span>
                      <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
                        {formTitle}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {builderFields.length} perguntas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Aluno Destinatário:</span>
                      <strong className="text-zinc-900 dark:text-white">{studentName}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Origem da Montagem:</span>
                      <strong className="text-zinc-900 dark:text-white">{originLabel}</strong>
                    </div>
                  </div>

                  {formDesc.trim() && (
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-400 italic">
                      &ldquo;{formDesc.trim()}&rdquo;
                    </div>
                  )}
                </div>

                {/* Seleção do Destino */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Como deseja prosseguir com este documento?
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Opção A: Enviar para o Aluno */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-4 shadow-2xs">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          Enviar para o aluno
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          O formulário ficará aguardando preenchimento pelo aplicativo do aluno com notificação automática.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleExecuteDestinationAction("SEND_TO_STUDENT")}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <span>Enviando documento...</span>
                        ) : (
                          <>
                            <span>Confirmar envio ao aluno</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Opção B: Preencher Agora */}
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-4 shadow-2xs">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          Preencher agora
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Registre as respostas pelo profissional imediatamente durante uma consulta ou atendimento presencial.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleExecuteDestinationAction("FILL_WITH_STUDENT")}
                        className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Preencher respostas agora</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-start border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep("EDIT")}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] cursor-pointer"
                  >
                    ← Voltar para edição
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                ETAPA 4: PREENCHER AGORA (Área Ampla com Identificação do Profissional)
                ------------------------------------------------------------- */}
            {step === "FILL_NOW" && (
              <div className="space-y-6 py-2">
                {/* Banner de Identificação de Autoria */}
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-700 dark:text-blue-300">
                  <div>
                    <span className="font-bold block text-sm">
                      Registrado pelo profissional
                    </span>
                    <span className="text-[11px] opacity-90">
                      Preenchendo anamnese em nome de <strong>{studentName}</strong> durante atendimento.
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 self-start sm:self-auto">
                    Preenchimento Imediato
                  </span>
                </div>

                <div className="space-y-4">
                  {builderFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5"
                    >
                      <label htmlFor={`fill-ans-${field.id}`} className="block text-xs font-bold text-zinc-900 dark:text-white">
                        {idx + 1}. {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>

                      {/* Render input by type */}
                      {field.type === "LONG_TEXT" ? (
                        <textarea
                          id={`fill-ans-${field.id}`}
                          rows={3}
                          value={fillAnswers[field.id] || ""}
                          onChange={(e) =>
                            setFillAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          placeholder="Digite a resposta do aluno detalhadamente..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y min-h-[72px]"
                        />
                      ) : field.type === "YES_NO" ? (
                        <div className="flex items-center gap-4 pt-1">
                          {["Sim", "Não"].map((val) => (
                            <label key={val} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer min-h-[44px]">
                              <input
                                type="radio"
                                name={`fill-ans-${field.id}`}
                                value={val}
                                checked={fillAnswers[field.id] === val}
                                onChange={(e) =>
                                  setFillAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                              />
                              <span>{val}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === "SELECT" ? (
                        <select
                          id={`fill-ans-${field.id}`}
                          value={fillAnswers[field.id] || ""}
                          onChange={(e) =>
                            setFillAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 min-h-[44px]"
                        >
                          <option value="">Selecione uma opção...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`fill-ans-${field.id}`}
                          type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
                          value={fillAnswers[field.id] || ""}
                          onChange={(e) =>
                            setFillAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          placeholder="Digite a resposta..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[44px]"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep("DESTINATION")}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] cursor-pointer"
                  >
                    ← Voltar
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleExecuteDestinationAction("FILL_WITH_STUDENT")}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs min-h-[48px] flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Salvando respostas...</span>
                    ) : (
                      <>
                        <span>Salvar e registrar respostas</span>
                        <span>✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                ETAPA 5: PRÉVIA (Visão Fiel de como o Aluno Verá o Questionário)
                ------------------------------------------------------------- */}
            {step === "PREVIEW" && (
              <div className="space-y-6 py-2">
                {/* Banner de Modo de Prévia */}
                <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Modo de Prévia • Nenhuma resposta será criada ou enviada nesta tela.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep("EDIT")}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    ← Voltar à edição
                  </button>
                </div>

                {/* Questionário Fiel */}
                <div className="p-6 sm:p-8 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800 space-y-5">
                  <div className="border-b border-zinc-200 dark:border-zinc-700/60 pb-4 space-y-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {formTitle}
                    </h3>
                    {formDesc.trim() && (
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                        {formDesc.trim()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {builderFields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs"
                      >
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">
                          {idx + 1}. {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </p>

                        <div className="text-zinc-400 italic">
                          {field.type === "LONG_TEXT" && "Campo de resposta longa (parágrafo)"}
                          {field.type === "SHORT_TEXT" && "Campo de resposta curta"}
                          {field.type === "YES_NO" && "Opções: Sim / Não"}
                          {field.type === "NUMBER" && "Valor numérico"}
                          {field.type === "DATE" && "Seleção de data"}
                          {field.type === "SELECT" && (
                            <div className="pt-1 space-y-1">
                              {(field.options || []).map((opt, i) => (
                                <div key={i} className="flex items-center gap-2 not-italic text-zinc-600 dark:text-zinc-300">
                                  <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 inline-block" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep("EDIT")}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs min-h-[44px] cursor-pointer"
                  >
                    ← Voltar e continuar editando
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
