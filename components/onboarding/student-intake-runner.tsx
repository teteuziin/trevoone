"use client";

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { IntakeFormDefinition, IntakeFieldDefinition } from "@/lib/consultancies/intake-schemas";
import type { IntakeUIFormConfig, IntakeUIStep } from "@/lib/consultancies/intake-ui-config";
import { saveIntakeDraftAction, submitIntakeAction } from "@/app/consultoria/[slug]/onboarding/[formKey]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface StudentIntakeRunnerProps {
  consultancySlug: string;
  consultancyName: string;
  formDef: IntakeFormDefinition;
  uiConfig: IntakeUIFormConfig;
  initialResponses?: Record<string, string>;
  initialSubmissionStatus?: "DRAFT" | "SUBMITTED" | "NOT_STARTED";
  requirementStatus?: "PENDING" | "SUBMITTED" | "CONFIRMED";
  isLegacyWithoutNativeContent?: boolean;
  submissionPublicId?: string | null;
  startedAt?: Date | string | null;
  submittedAt?: Date | string | null;
  confirmedAt?: Date | string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function StudentIntakeRunner({
  consultancySlug,
  formDef,
  uiConfig,
  initialResponses = {},
  initialSubmissionStatus = "NOT_STARTED",
  requirementStatus = "PENDING",
  isLegacyWithoutNativeContent = false,
  submittedAt,
}: StudentIntakeRunnerProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>(() => ({
    ...initialResponses,
  }));
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [submissionCompleted, setSubmissionCompleted] = useState(
    initialSubmissionStatus === "SUBMITTED"
  );
  const topRef = useRef<HTMLDivElement>(null);

  // Field definitions mapped by key for quick lookup
  const fieldMap = new Map<string, IntakeFieldDefinition>(
    formDef.fields.map((f) => [f.key, f])
  );

  const steps = uiConfig.steps;
  const totalSteps = steps.length;
  const currentStep: IntakeUIStep = steps[currentStepIndex] || steps[0];

  const isReadOnly =
    submissionCompleted ||
    initialSubmissionStatus === "SUBMITTED" ||
    requirementStatus === "CONFIRMED";

  const handleFieldChange = (key: string, value: string) => {
    if (isReadOnly) return;
    setResponses((prev) => ({ ...prev, [key]: value }));
    // Clear validation error on edit
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (saveStatus === "saved" || saveStatus === "error") {
      setSaveStatus("idle");
      setSaveErrorMessage(null);
    }
  };

  const persistDraft = async (dataToSave: Record<string, string>): Promise<boolean> => {
    setSaveStatus("saving");
    setSaveErrorMessage(null);

    try {
      const res = await saveIntakeDraftAction(
        consultancySlug,
        formDef.formKey,
        dataToSave
      );

      if (!res.success) {
        setSaveStatus("error");
        setSaveErrorMessage(res.error || "Não foi possível salvar o rascunho.");
        return false;
      }

      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      setSaveErrorMessage("Falha na conexão ao salvar rascunho. Tente novamente.");
      return false;
    }
  };

  const handleExplicitSaveDraft = () => {
    startTransition(async () => {
      await persistDraft(responses);
    });
  };

  const validateCurrentStepFields = (): { valid: boolean; firstErrorKey?: string } => {
    const errors: Record<string, string> = {};
    let firstErrorKey: string | undefined;

    for (const key of currentStep.fieldKeys) {
      const field = fieldMap.get(key);
      if (!field) continue;

      const val = responses[key];
      if (field.required && (val === undefined || val === null || val.trim() === "")) {
        errors[key] = `Este campo é obrigatório.`;
        if (!firstErrorKey) firstErrorKey = key;
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      return { valid: false, firstErrorKey };
    }

    return { valid: true };
  };

  const handleNextStep = () => {
    if (currentStepIndex >= totalSteps - 1) return;

    startTransition(async () => {
      // Auto-save draft before moving to next step
      const saved = await persistDraft(responses);
      if (saved) {
        setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  };

  const handlePrevStep = () => {
    if (currentStepIndex <= 0) return;

    startTransition(async () => {
      // Auto-save draft before moving to previous step
      await persistDraft(responses);
      setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || isPending) return;

    // Validate all required fields across all steps
    const allErrors: Record<string, string> = {};
    let firstErrorStepIndex = -1;
    let firstErrorKey: string | undefined;

    steps.forEach((step, sIdx) => {
      for (const key of step.fieldKeys) {
        const field = fieldMap.get(key);
        if (!field) continue;
        const val = responses[key];
        if (field.required && (val === undefined || val === null || val.trim() === "")) {
          allErrors[key] = `O campo '${field.label}' é obrigatório.`;
          if (firstErrorStepIndex === -1) {
            firstErrorStepIndex = sIdx;
            firstErrorKey = key;
          }
        }
      }
    });

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors);
      if (firstErrorStepIndex !== -1 && firstErrorStepIndex !== currentStepIndex) {
        setCurrentStepIndex(firstErrorStepIndex);
      }
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        if (el) {
          el.focus();
        }
      }
      setSaveStatus("error");
      setSaveErrorMessage("Por favor, preencha todos os campos obrigatórios antes de enviar.");
      return;
    }

    startTransition(async () => {
      setSaveStatus("saving");
      setSaveErrorMessage(null);

      try {
        const res = await submitIntakeAction(
          consultancySlug,
          formDef.formKey,
          responses
        );

        if (!res.success) {
          setSaveStatus("error");
          if (res.validationErrors && Object.keys(res.validationErrors).length > 0) {
            setValidationErrors(res.validationErrors);
            setSaveErrorMessage("Existem campos pendentes ou inválidos. Revise o formulário.");
          } else {
            setSaveErrorMessage(res.error || "Não foi possível enviar o formulário.");
          }
          return;
        }

        setSubmissionCompleted(true);
        setSaveStatus("saved");
        router.refresh();
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch {
        setSaveStatus("error");
        setSaveErrorMessage("Falha de comunicação com o servidor ao enviar. Tente novamente.");
      }
    });
  };

  /* =========================================================================
     1. LEGACY SUBMITTED / CONFIRMED HANDLERS (Without Native Content)
     ========================================================================= */
  if (isLegacyWithoutNativeContent) {
    const isLegacyConfirmed = requirementStatus === "CONFIRMED";
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${consultancySlug}/onboarding`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
          >
            ← Voltar para Onboarding
          </Link>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] flex items-center justify-center text-2xl font-bold">
            {isLegacyConfirmed ? "✓" : "⏳"}
          </div>

          <div className="space-y-2">
            <Badge variant={isLegacyConfirmed ? "success" : "warning"} size="md" className="mx-auto">
              {isLegacyConfirmed ? "Requisito Concluído" : "Aguardando Confirmação"}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {uiConfig.displayTitle}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto font-medium">
              {isLegacyConfirmed
                ? "Este requisito já foi concluído com sucesso e faz parte do seu histórico de acompanhamento."
                : "Este formulário já foi enviado pelo fluxo anterior e aguarda a confirmação do seu profissional."}
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/consultoria/${consultancySlug}/onboarding`}>
              <Button variant="outline" size="md" className="w-full sm:w-auto min-h-[44px]">
                Voltar aos Requisitos
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}`}>
              <Button variant="primary" size="md" className="w-full sm:w-auto min-h-[44px]">
                Ir para o Painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     2. READ-ONLY SUBMITTED / CONFIRMED VIEW (With Native Content)
     ========================================================================= */
  if (isReadOnly) {
    const isConfirmed = requirementStatus === "CONFIRMED";
    return (
      <div ref={topRef} className="w-full max-w-3xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/consultoria/${consultancySlug}/onboarding`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
          >
            ← Voltar para Onboarding
          </Link>
          <Badge variant={isConfirmed ? "success" : "warning"} size="sm">
            {isConfirmed ? "Concluído" : "Formulário enviado • Aguardando confirmação"}
          </Badge>
        </div>

        {/* Read-Only Status Banner */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                {uiConfig.badgeLabel}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {uiConfig.displayTitle}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                {isConfirmed
                  ? "Suas respostas foram avaliadas e confirmadas pela consultoria."
                  : "Suas respostas foram enviadas e estão disponíveis para avaliação da equipe técnica."}
              </p>
            </div>

            <div className="text-xs text-[var(--text-tertiary)] self-start sm:self-auto shrink-0 space-y-0.5">
              {submittedAt && (
                <p>
                  Enviado em:{" "}
                  <strong className="text-[var(--text-secondary)]">
                    {new Date(submittedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </strong>
                </p>
              )}
            </div>
          </div>

          <Alert
            variant={isConfirmed ? "success" : "info"}
            title={isConfirmed ? "Avaliação Concluída" : "Modo de Leitura"}
          >
            <p className="text-xs">
              {isConfirmed
                ? "Este formulário foi finalizado. Suas respostas permanecem arquivadas abaixo para sua consulta."
                : "Formulário enviado com sucesso. Por motivos de auditoria e segurança, as respostas não podem ser alteradas."}
            </p>
          </Alert>
        </div>

        {/* Summary Sections */}
        <div className="space-y-5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Etapa {idx + 1} de {totalSteps}
                </span>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{step.title}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {step.fieldKeys.map((key) => {
                  const field = fieldMap.get(key);
                  if (!field) return null;
                  const val = responses[key];

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 ${
                        field.type === "LONG_TEXT" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                        {field.label}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] break-words whitespace-pre-wrap">
                        {val && val.trim() !== "" ? val : <span className="text-[var(--text-tertiary)] italic">Não informado</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="pt-2 flex justify-center">
          <Link href={`/consultoria/${consultancySlug}/onboarding`}>
            <Button variant="outline" size="md" className="min-h-[44px]">
              ← Voltar para a lista de requisitos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================================================
     3. INTERACTIVE STEPPER / RUNNER VIEW
     ========================================================================= */
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <div ref={topRef} className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header & Back Link */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/consultoria/${consultancySlug}/onboarding`}
          className="inline-flex items-center text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px]"
        >
          ← Voltar para Onboarding
        </Link>

        {/* Save Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === "saving" && (
            <span className="text-[var(--text-tertiary)] flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Salvando rascunho...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Salvo no servidor
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Erro ao salvar
            </span>
          )}
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        {/* Form Title & Stepper Header */}
        <div className="space-y-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="brand" size="sm">
              {uiConfig.badgeLabel}
            </Badge>
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Etapa {currentStepIndex + 1} de {totalSteps}
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {uiConfig.displayTitle}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed font-medium">
              {uiConfig.introDescription}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
              <div
                className="h-full bg-[var(--brand)] transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso do formulário: ${progressPercent}%`}
              />
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {saveErrorMessage && (
          <Alert variant="danger" title="Atenção">
            <p className="text-xs">{saveErrorMessage}</p>
          </Alert>
        )}

        {/* Current Step Section Title */}
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            {currentStep.title}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Fields Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-4">
            {currentStep.fieldKeys.map((key) => {
              const field = fieldMap.get(key);
              if (!field) return null;

              const val = responses[key] || "";
              const err = validationErrors[key];
              const hint = uiConfig.fieldHints?.[key];
              const fieldId = `field-${key}`;
              const errorId = `error-${key}`;

              return (
                <div key={key} className="space-y-1.5">
                  {/* Field Label */}
                  <label
                    htmlFor={field.type === "SINGLE_CHOICE" ? undefined : fieldId}
                    className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)]"
                  >
                    <span>{field.label}</span>
                    {field.required ? (
                      <span className="text-[11px] font-normal text-[var(--brand)] ml-1.5">
                        (obrigatório)
                      </span>
                    ) : (
                      <span className="text-[11px] font-normal text-[var(--text-tertiary)] ml-1.5">
                        (opcional)
                      </span>
                    )}
                  </label>

                  {/* Help text if any */}
                  {hint?.helpText && (
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
                      {hint.helpText}
                    </p>
                  )}

                  {/* Render based on field type */}
                  {field.type === "SHORT_TEXT" && (
                    <div className="relative">
                      <input
                        id={fieldId}
                        name={key}
                        type="text"
                        value={val}
                        maxLength={field.maxLength || 255}
                        inputMode={hint?.inputMode || (key === "age" ? "numeric" : "text")}
                        placeholder={hint?.placeholder || "Digite sua resposta..."}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={isPending}
                        aria-required={field.required}
                        aria-invalid={err ? "true" : undefined}
                        aria-describedby={err ? errorId : undefined}
                        className={`w-full h-11 px-3.5 rounded-xl border bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] ${
                          err
                            ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                            : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                        }`}
                      />
                      {hint?.unit && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-tertiary)] pointer-events-none">
                          {hint.unit}
                        </span>
                      )}
                    </div>
                  )}

                  {field.type === "LONG_TEXT" && (
                    <textarea
                      id={fieldId}
                      name={key}
                      rows={3}
                      value={val}
                      maxLength={field.maxLength || 2000}
                      placeholder={hint?.placeholder || "Descreva detalhadamente..."}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      disabled={isPending}
                      aria-required={field.required}
                      aria-invalid={err ? "true" : undefined}
                      aria-describedby={err ? errorId : undefined}
                      className={`w-full p-3.5 rounded-xl border bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] resize-y min-h-[88px] ${
                        err
                          ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                    />
                  )}

                  {field.type === "DATE" && (
                    <input
                      id={fieldId}
                      name={key}
                      type="date"
                      value={val}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      disabled={isPending}
                      aria-required={field.required}
                      aria-invalid={err ? "true" : undefined}
                      aria-describedby={err ? errorId : undefined}
                      className={`w-full h-11 px-3.5 rounded-xl border bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] ${
                        err
                          ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                    />
                  )}

                  {field.type === "TIME" && (
                    <input
                      id={fieldId}
                      name={key}
                      type="time"
                      value={val}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      disabled={isPending}
                      aria-required={field.required}
                      aria-invalid={err ? "true" : undefined}
                      aria-describedby={err ? errorId : undefined}
                      className={`w-full h-11 px-3.5 rounded-xl border bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] ${
                        err
                          ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                    />
                  )}

                  {field.type === "SINGLE_CHOICE" && field.options && (
                    <div
                      role="radiogroup"
                      aria-labelledby={fieldId}
                      aria-required={field.required}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5"
                    >
                      {field.options.map((option) => {
                        const isSelected = val === option;
                        const optId = `${fieldId}-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

                        return (
                          <label
                            key={option}
                            htmlFor={optId}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all min-h-[48px] ${
                              isSelected
                                ? "bg-[var(--brand-soft)] border-[var(--brand-soft-border)] text-[var(--brand-foreground)] font-semibold shadow-2xs"
                                : "bg-[var(--surface-subtle)] border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)]"
                            }`}
                          >
                            <input
                              type="radio"
                              id={optId}
                              name={key}
                              value={option}
                              checked={isSelected}
                              onChange={() => handleFieldChange(key, option)}
                              disabled={isPending}
                              className="w-4 h-4 text-[var(--brand)] focus:ring-[var(--brand)] accent-[var(--brand)] cursor-pointer shrink-0"
                            />
                            <span className="text-xs sm:text-sm leading-tight">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline field validation error */}
                  {err && (
                    <p id={errorId} className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                      {err}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Area (Integrated inside document flow to avoid hotbar collision) */}
          <div className="pt-5 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            {/* Left Actions: Prev step & Save Draft */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handlePrevStep}
                  disabled={isPending}
                  className="flex-1 sm:flex-initial min-h-[44px]"
                >
                  ← Anterior
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleExplicitSaveDraft}
                disabled={isPending}
                className="flex-1 sm:flex-initial text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[44px]"
                title="Salvar rascunho e continuar depois"
              >
                Salvar rascunho
              </Button>
            </div>

            {/* Right Action: Next Step or Submit */}
            <div className="w-full sm:w-auto">
              {!isLastStep ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    const { valid } = validateCurrentStepFields();
                    if (valid) {
                      handleNextStep();
                    }
                  }}
                  disabled={isPending}
                  className="w-full sm:w-auto min-h-[44px] px-6"
                >
                  Próxima etapa →
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isPending}
                  className="w-full sm:w-auto min-h-[44px] px-6 bg-[#00A859] hover:bg-[#008f4c] font-bold"
                >
                  {isPending ? "Enviando formulário..." : "Enviar formulário ✓"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
